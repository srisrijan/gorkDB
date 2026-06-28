import sys
import os

# Ensure the backend directory is in the python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.core.security import hash_password
from app.models.auth import Role, User, Permission
from app.models.business import Department, Employee, Student

def seed_data():
    db = SessionLocal()
    try:
        # 1. Create all tables defined in SQLAlchemy models if they do not exist
        print("Creating all tables in database...")
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully.")

        # 2. Seed Roles
        print("Seeding roles...")
        roles_data = [
            {"id": 1, "name": "viewer", "description": "Read-only access to specific tables/columns"},
            {"id": 2, "name": "analyst", "description": "Read and update access to business tables"},
            {"id": 3, "name": "admin", "description": "Full CRUD access to all business tables"}
        ]
        
        for r_data in roles_data:
            existing_role = db.query(Role).filter(Role.id == r_data["id"]).first()
            if not existing_role:
                role = Role(id=r_data["id"], name=r_data["name"], description=r_data["description"])
                db.add(role)
        db.commit()

        # 3. Seed Permissions
        print("Seeding permissions...")
        permissions_data = [
            # Viewer permissions (id=1)
            {"role_id": 1, "table_name": "employee", "allowed_operations": ["SELECT"], "allowed_columns": ["id", "name", "email", "position", "department_id"]},
            {"role_id": 1, "table_name": "department", "allowed_operations": ["SELECT"], "allowed_columns": None},
            {"role_id": 1, "table_name": "student", "allowed_operations": ["SELECT"], "allowed_columns": ["id", "name", "email", "course", "grade"]},
            
            # Analyst permissions (id=2)
            {"role_id": 2, "table_name": "employee", "allowed_operations": ["SELECT", "UPDATE"], "allowed_columns": None},
            {"role_id": 2, "table_name": "department", "allowed_operations": ["SELECT", "UPDATE"], "allowed_columns": None},
            {"role_id": 2, "table_name": "student", "allowed_operations": ["SELECT", "UPDATE"], "allowed_columns": None},
            
            # Admin permissions (id=3)
            {"role_id": 3, "table_name": "employee", "allowed_operations": ["SELECT", "INSERT", "UPDATE", "DELETE"], "allowed_columns": None},
            {"role_id": 3, "table_name": "department", "allowed_operations": ["SELECT", "INSERT", "UPDATE", "DELETE"], "allowed_columns": None},
            {"role_id": 3, "table_name": "student", "allowed_operations": ["SELECT", "INSERT", "UPDATE", "DELETE"], "allowed_columns": None},
        ]

        for p_data in permissions_data:
            existing_perm = db.query(Permission).filter(
                Permission.role_id == p_data["role_id"],
                Permission.table_name == p_data["table_name"]
            ).first()
            if not existing_perm:
                perm = Permission(
                    role_id=p_data["role_id"],
                    table_name=p_data["table_name"],
                    allowed_operations=p_data["allowed_operations"],
                    allowed_columns=p_data["allowed_columns"]
                )
                db.add(perm)
        db.commit()

        # 4. Seed Demo Users
        print("Seeding demo users...")
        users_data = [
            {"username": "viewer_user", "email": "viewer@example.com", "password": "viewer123", "role_id": 1},
            {"username": "analyst_user", "email": "analyst@example.com", "password": "analyst123", "role_id": 2},
            {"username": "admin_user", "email": "admin@example.com", "password": "admin123", "role_id": 3},
        ]

        for u_data in users_data:
            existing_user = db.query(User).filter(User.username == u_data["username"]).first()
            if not existing_user:
                user = User(
                    username=u_data["username"],
                    email=u_data["email"],
                    password_hash=hash_password(u_data["password"]),
                    role_id=u_data["role_id"],
                    is_active=True
                )
                db.add(user)
        db.commit()

        # 5. Seed Departments
        print("Seeding business departments...")
        depts_data = [
            {"id": 1, "name": "Engineering", "location": "Building A", "budget": 500000.00},
            {"id": 2, "name": "Sales", "location": "Building B", "budget": 300000.00},
            {"id": 3, "name": "HR", "location": "Building C", "budget": 150000.00},
        ]
        for d in depts_data:
            existing_dept = db.query(Department).filter(Department.id == d["id"]).first()
            if not existing_dept:
                dept = Department(id=d["id"], name=d["name"], location=d["location"], budget=d["budget"])
                db.add(dept)
        db.commit()

        # 6. Seed Employees
        print("Seeding business employees...")
        emp_data = [
            {"id": 1, "name": "Alice Smith", "email": "alice@example.com", "position": "Senior Engineer", "salary": 120000.00, "department_id": 1},
            {"id": 2, "name": "Bob Jones", "email": "bob@example.com", "position": "Sales Representative", "salary": 70000.00, "department_id": 2},
            {"id": 3, "name": "Charlie Brown", "email": "charlie@example.com", "position": "HR Specialist", "salary": 60000.00, "department_id": 3},
        ]
        for e in emp_data:
            existing_emp = db.query(Employee).filter(Employee.id == e["id"]).first()
            if not existing_emp:
                emp = Employee(
                    id=e["id"],
                    name=e["name"],
                    email=e["email"],
                    position=e["position"],
                    salary=e["salary"],
                    department_id=e["department_id"]
                )
                db.add(emp)
        db.commit()

        # 7. Seed Students
        print("Seeding business students...")
        stud_data = [
            {"id": 1, "name": "John Doe", "email": "john@student.com", "course": "Computer Science", "grade": "A", "gpa": 3.85, "notes": "Excellent academic record"},
            {"id": 2, "name": "Jane Miller", "email": "jane@student.com", "course": "Business Administration", "grade": "B", "gpa": 3.20, "notes": "Active participant in group projects"},
            {"id": 3, "name": "Sam Wilson", "email": "sam@student.com", "course": "Mechanical Engineering", "grade": "C", "gpa": 2.75, "notes": "Needs improvement in mathematics"},
        ]
        for s in stud_data:
            existing_stud = db.query(Student).filter(Student.id == s["id"]).first()
            if not existing_stud:
                stud = Student(
                    id=s["id"],
                    name=s["name"],
                    email=s["email"],
                    course=s["course"],
                    grade=s["grade"],
                    gpa=s["gpa"],
                    notes=s["notes"]
                )
                db.add(stud)
        db.commit()

        print("Database initialization and seeding completed successfully!")
    except Exception as exc:
        db.rollback()
        print(f"Error seeding database: {exc}")
        raise exc
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
