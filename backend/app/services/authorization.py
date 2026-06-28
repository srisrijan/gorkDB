from typing import Optional

import sqlglot
import sqlglot.expressions as exp
from sqlalchemy.orm import Session

from app.models.auth import AuditLog, Permission, User


# Tables that belong to the system — always off-limits for regular queries
_SYSTEM_TABLES = {
    "users", "roles", "permissions", "audit_log", "query_history"
}

# Internal operations as uppercase
_WRITE_OPS = {"INSERT", "UPDATE", "DELETE"}


def _parse_query(sql: str) -> Optional[exp.Expression]:
    try:
        return sqlglot.parse_one(sql, dialect="postgres")
    except Exception:
        return None


def _extract_operation(tree: exp.Expression) -> str:
    if isinstance(tree, exp.Select):
        return "SELECT"
    if isinstance(tree, exp.Insert):
        return "INSERT"
    if isinstance(tree, exp.Update):
        return "UPDATE"
    if isinstance(tree, exp.Delete):
        return "DELETE"
    return "UNKNOWN"


def _extract_tables(tree: exp.Expression) -> set[str]:
    return {t.name.lower() for t in tree.find_all(exp.Table) if t.name}


def _extract_columns(tree: exp.Expression) -> set[str]:
    cols = set()
    for col in tree.find_all(exp.Column):
        if col.table:
            cols.add(f"{col.table.lower()}.{col.name.lower()}")
        else:
            cols.add(col.name.lower())
    return cols


def check_authorization(
    sql: str,
    user: User,
    db: Session,
) -> dict:
    """
    Returns {"allowed": bool, "reason": str, "operation": str, "tables": list}
    and writes an audit log entry.
    """
    tree = _parse_query(sql)
    if tree is None:
        return _deny(user, sql, db, "SQL could not be parsed")

    operation = _extract_operation(tree)
    tables = _extract_tables(tree)
    columns = _extract_columns(tree)

    # Block access to system tables
    sys_hit = tables & _SYSTEM_TABLES
    if sys_hit:
        return _deny(
            user, sql, db,
            f"Access to system tables is not permitted: {', '.join(sys_hit)}",
            operation, list(tables),
        )

    if not user.role_id:
        return _deny(user, sql, db, "User has no assigned role", operation, list(tables))

    perms: list[Permission] = (
        db.query(Permission)
        .filter(Permission.role_id == user.role_id)
        .all()
    )
    perm_map: dict[str, Permission] = {p.table_name.lower(): p for p in perms}

    for table in tables:
        perm = perm_map.get(table)
        if perm is None:
            return _deny(
                user, sql, db,
                f"No permission defined for table '{table}' and your role",
                operation, list(tables),
            )

        if operation not in [op.upper() for op in perm.allowed_operations]:
            return _deny(
                user, sql, db,
                f"Operation {operation} is not permitted on table '{table}' for your role",
                operation, list(tables),
            )

        # Column-level check (only for explicitly restricted columns)
        if perm.allowed_columns:
            allowed_set = {c.lower() for c in perm.allowed_columns}
            for col_ref in columns:
                col_name = col_ref.split(".")[-1]
                if col_name not in allowed_set and col_name != "*":
                    return _deny(
                        user, sql, db,
                        f"Column '{col_name}' on table '{table}' is not accessible for your role",
                        operation, list(tables),
                    )

    _write_audit(user, sql, db, True, None, operation, list(tables))
    return {
        "allowed": True,
        "reason": "Authorized",
        "operation": operation,
        "tables": list(tables),
        "columns": list(columns),
    }


def _deny(
    user: User,
    sql: str,
    db: Session,
    reason: str,
    operation: str = "UNKNOWN",
    tables: Optional[list] = None,
) -> dict:
    _write_audit(user, sql, db, False, reason, operation, tables or [])
    return {
        "allowed": False,
        "reason": reason,
        "operation": operation,
        "tables": tables or [],
        "columns": [],
    }


def _write_audit(
    user: User,
    sql: str,
    db: Session,
    allowed: bool,
    reason: Optional[str],
    operation: str,
    tables: list,
) -> None:
    try:
        log = AuditLog(
            user_id=user.id,
            query_text=sql,
            operation_type=operation,
            tables_involved=tables,
            was_allowed=allowed,
            block_reason=reason,
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
