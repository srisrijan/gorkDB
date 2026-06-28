# GorkDB — AI SQL Query Generator

Natural-language SQL assistant with role-based access control (RBAC).  
Backend: **FastAPI + PostgreSQL** · LLM: **Google Gemini** · Frontend: **React (Vite)**

---

## Quick Start

### 1. Prerequisites

- Python 3.11+
- Node 18+
- PostgreSQL 14+
- A [Gemini API key](https://aistudio.google.com/app/apikey)

### 2. Create tables in Supabase

1. Open your Supabase project → **SQL Editor**
2. Paste the contents of `backend/seed.sql` and click **Run**

> The seed script creates all tables, demo roles/permissions, demo users, and sample business data.

### 3. Configure environment

```bash
cp .env.example backend/.env
```

Edit `backend/.env`:
- **DATABASE_URL** → Supabase → Project Settings → Database → **Connection string → URI** (direct connection, starts with `postgresql://postgres:...`)
- **GEMINI_API_KEY** → your Gemini API key
- **SECRET_KEY** → run `python -c "import secrets; print(secrets.token_hex(32))"`

### 4. Install & run backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs auto-generated at http://localhost:8000/docs

### 5. Install & run frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Demo Users

| Username       | Password    | Role     | Permissions                          |
|---------------|-------------|----------|--------------------------------------|
| `viewer_user`  | `viewer123`  | viewer   | SELECT on employee (no salary), department, student (no gpa/notes) |
| `analyst_user` | `analyst123` | analyst  | SELECT + UPDATE on all business tables |
| `admin_user`   | `admin123`   | admin    | Full CRUD on all business tables     |

---

## Project Structure

```
gorkDB/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI entry point, CORS, table creation
│   │   ├── database.py           # SQLAlchemy engine + session
│   │   ├── core/
│   │   │   ├── config.py         # Pydantic settings (reads .env)
│   │   │   └── security.py       # JWT creation/verification, bcrypt
│   │   ├── models/
│   │   │   ├── auth.py           # User, Role, Permission, AuditLog, QueryHistory
│   │   │   └── business.py       # Employee, Department, Student
│   │   ├── routers/
│   │   │   ├── auth.py           # POST /auth/login, /auth/register, GET /auth/me
│   │   │   ├── query.py          # POST /query/generate, /query/execute
│   │   │   └── history.py        # GET /history/queries, /history/audit
│   │   └── services/
│   │       ├── schema_service.py # Live DB introspection → schema text for LLM
│   │       ├── llm_service.py    # Gemini API calls (generate + intent detection)
│   │       ├── authorization.py  # RBAC enforcement + audit log writes
│   │       ├── impact_analyzer.py# EXPLAIN / SELECT COUNT(*) before execution
│   │       └── query_validator.py# sqlglot parse validation + suggestions
│   ├── seed.sql                  # DDL + demo data
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx               # Shell: sidebar, routing, auth state
│       ├── api/client.js         # Typed fetch wrappers
│       └── components/
│           ├── Login.jsx         # Sign-in / register form
│           ├── QueryInput.jsx    # NL prompt → generate + execute flow
│           ├── CandidateCard.jsx # Shows one SQL candidate with auth/impact badges
│           ├── ResultsTable.jsx  # Renders query results
│           └── QueryHistory.jsx  # Query history + audit log tabs
├── .env.example
└── README.md
```

---

## Security Model

### How RBAC works

Permissions are stored in the `permissions` table — one row per (role, table) pair:

| Column               | Purpose                                              |
|----------------------|------------------------------------------------------|
| `role_id`            | Which role this applies to                           |
| `table_name`         | Which table                                          |
| `allowed_operations` | Array: `['SELECT']`, `['SELECT','UPDATE']`, etc.     |
| `allowed_columns`    | Array of allowed columns, or `NULL` for all columns  |

The authorization service (`services/authorization.py`) uses **sqlglot** to parse every generated SQL statement before execution, extracts all referenced tables, columns, and the operation type, then checks each against the user's role permissions.

### What is blocked

- Any table/operation not in the user's permission set
- Access to system tables (`users`, `roles`, `permissions`, `audit_log`, `query_history`)
- Partially-allowed queries: if any part fails, the whole query is blocked

### Extending permissions

Add rows to `permissions` — no code changes needed:

```sql
-- Give the analyst role INSERT on employee
INSERT INTO permissions (role_id, table_name, allowed_operations, allowed_columns)
SELECT id, 'employee', ARRAY['SELECT','INSERT','UPDATE'], NULL
FROM roles WHERE name = 'analyst';
```

### Audit log

Every authorization decision — allowed or blocked — is written to `audit_log` with:
- the exact SQL
- operation type
- tables involved
- the block reason (if denied)
- timestamp and user

Admins can view all entries via `GET /history/audit`; other users see only their own.

---

## How the LLM Integration Works

1. **Schema introspection** — on every request, the live DB schema is read and formatted as compact DDL text
2. **Gemini call** — the schema + user prompt are sent to `gemini-2.0-flash`; the model returns a JSON array of candidates
3. **Each candidate** has: `sql`, `explanation`, `tables_involved`, `columns_involved`, `operation_type`, `is_risky`
4. **Validation** → **impact estimation** → **authorization check** run on each candidate before sending to the frontend
5. The frontend shows all candidates; the user picks one and clicks "Run Query"
6. Before execution the backend re-validates and re-authorizes (never trusts the client)
