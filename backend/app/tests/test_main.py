import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models.models import User, Class, Role
from app.auth import hash_password

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    db = TestingSessionLocal()
    yield db
    db.close()


def seed_users(db):
    admin = User(name="Admin", email="admin@test.com", hashed_password=hash_password("admin123"), role=Role.admin)
    teacher = User(name="Teacher", email="teacher@test.com", hashed_password=hash_password("teacher123"), role=Role.teacher)
    student = User(name="Student", email="student@test.com", hashed_password=hash_password("student123"), role=Role.student)
    db.add_all([admin, teacher, student])
    db.commit()
    db.refresh(admin); db.refresh(teacher); db.refresh(student)
    return admin, teacher, student


def login(client, email, password):
    r = client.post("/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


# ── Auth Tests ────────────────────────────────────────────────────────────────
def test_login_success(client, db):
    seed_users(db)
    r = client.post("/auth/login", json={"email": "admin@test.com", "password": "admin123"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password(client, db):
    seed_users(db)
    r = client.post("/auth/login", json={"email": "admin@test.com", "password": "wrong"})
    assert r.status_code == 401


def test_login_unknown_user(client):
    r = client.post("/auth/login", json={"email": "nobody@test.com", "password": "x"})
    assert r.status_code == 401


# ── Role Authorization Tests ──────────────────────────────────────────────────
def test_student_cannot_access_admin(client, db):
    seed_users(db)
    token = login(client, "student@test.com", "student123")
    r = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_teacher_cannot_access_admin(client, db):
    seed_users(db)
    token = login(client, "teacher@test.com", "teacher123")
    r = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_unauthenticated_access(client):
    r = client.get("/admin/users")
    assert r.status_code == 401


# ── Admin Tests ───────────────────────────────────────────────────────────────
def test_admin_create_user(client, db):
    seed_users(db)
    token = login(client, "admin@test.com", "admin123")
    r = client.post("/admin/users", json={"name": "New User", "email": "new@test.com", "password": "pass1234", "role": "student"},
                    headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "new@test.com"


def test_admin_create_class(client, db):
    seed_users(db)
    token = login(client, "admin@test.com", "admin123")
    r = client.post("/admin/classes", json={"name": "Class A", "subject": "Math"},
                    headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["name"] == "Class A"


# ── Assignment Workflow Tests ─────────────────────────────────────────────────
def setup_class_with_teacher_and_student(client, db):
    admin, teacher, student = seed_users(db)
    token_admin = login(client, "admin@test.com", "admin123")
    r = client.post("/admin/classes", json={"name": "CS101", "subject": "Python"},
                    headers={"Authorization": f"Bearer {token_admin}"})
    class_id = r.json()["id"]
    client.post(f"/admin/classes/{class_id}/teachers/{teacher.id}", headers={"Authorization": f"Bearer {token_admin}"})
    client.post(f"/admin/classes/{class_id}/students/{student.id}", headers={"Authorization": f"Bearer {token_admin}"})
    return class_id, teacher, student


def test_teacher_create_assignment(client, db):
    class_id, teacher, _ = setup_class_with_teacher_and_student(client, db)
    token = login(client, "teacher@test.com", "teacher123")
    r = client.post("/teacher/assignments", json={
        "title": "Homework 1", "description": "Complete this assignment carefully", "deadline": "2099-12-31T23:59:00",
        "max_marks": 100, "status": "published", "allow_resubmit": True, "class_id": class_id
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["title"] == "Homework 1"


def test_teacher_cannot_create_assignment_for_unassigned_class(client, db):
    seed_users(db)
    token_admin = login(client, "admin@test.com", "admin123")
    r = client.post("/admin/classes", json={"name": "Other Class", "subject": "Biology"},
                    headers={"Authorization": f"Bearer {token_admin}"})
    class_id = r.json()["id"]
    token = login(client, "teacher@test.com", "teacher123")
    r = client.post("/teacher/assignments", json={
        "title": "Homework 1", "description": "Complete this assignment carefully", "deadline": "2099-12-31T23:59:00",
        "max_marks": 50, "class_id": class_id
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_student_submit_and_view(client, db):
    class_id, _, student = setup_class_with_teacher_and_student(client, db)
    token_t = login(client, "teacher@test.com", "teacher123")
    r = client.post("/teacher/assignments", json={
        "title": "Homework 1", "description": "Complete this assignment carefully", "deadline": "2099-12-31T23:59:00",
        "max_marks": 100, "status": "published", "allow_resubmit": True, "class_id": class_id
    }, headers={"Authorization": f"Bearer {token_t}"})
    assignment_id = r.json()["id"]

    token_s = login(client, "student@test.com", "student123")
    r = client.post("/student/submissions", json={"answer": "My answer", "assignment_id": assignment_id},
                    headers={"Authorization": f"Bearer {token_s}"})
    assert r.status_code == 200
    assert r.json()["answer"] == "My answer"

    r = client.get("/student/submissions", headers={"Authorization": f"Bearer {token_s}"})
    assert len(r.json()) == 1


def test_student_cannot_submit_twice(client, db):
    class_id, _, _ = setup_class_with_teacher_and_student(client, db)
    token_t = login(client, "teacher@test.com", "teacher123")
    r = client.post("/teacher/assignments", json={
        "title": "Homework 1", "description": "Complete this assignment carefully", "deadline": "2099-12-31T23:59:00",
        "max_marks": 100, "status": "published", "allow_resubmit": True, "class_id": class_id
    }, headers={"Authorization": f"Bearer {token_t}"})
    assignment_id = r.json()["id"]

    token_s = login(client, "student@test.com", "student123")
    client.post("/student/submissions", json={"answer": "First answer", "assignment_id": assignment_id},
                headers={"Authorization": f"Bearer {token_s}"})
    r = client.post("/student/submissions", json={"answer": "Second answer", "assignment_id": assignment_id},
                    headers={"Authorization": f"Bearer {token_s}"})
    assert r.status_code == 400


def test_teacher_grade_submission(client, db):
    class_id, _, _ = setup_class_with_teacher_and_student(client, db)
    token_t = login(client, "teacher@test.com", "teacher123")
    r = client.post("/teacher/assignments", json={
        "title": "Homework 1", "description": "Complete this assignment carefully", "deadline": "2099-12-31T23:59:00",
        "max_marks": 100, "status": "published", "allow_resubmit": True, "class_id": class_id
    }, headers={"Authorization": f"Bearer {token_t}"})
    assignment_id = r.json()["id"]

    token_s = login(client, "student@test.com", "student123")
    r = client.post("/student/submissions", json={"answer": "My answer", "assignment_id": assignment_id},
                    headers={"Authorization": f"Bearer {token_s}"})
    submission_id = r.json()["id"]

    r = client.patch(f"/teacher/submissions/{submission_id}/grade",
                     json={"marks": 85, "feedback": "Good work", "status": "graded"},
                     headers={"Authorization": f"Bearer {token_t}"})
    assert r.status_code == 200
    assert r.json()["marks"] == 85
    assert r.json()["status"] == "graded"


def test_grade_exceeds_max_marks(client, db):
    class_id, _, _ = setup_class_with_teacher_and_student(client, db)
    token_t = login(client, "teacher@test.com", "teacher123")
    r = client.post("/teacher/assignments", json={
        "title": "Homework 1", "description": "Complete this assignment carefully", "deadline": "2099-12-31T23:59:00",
        "max_marks": 50, "status": "published", "allow_resubmit": True, "class_id": class_id
    }, headers={"Authorization": f"Bearer {token_t}"})
    assignment_id = r.json()["id"]

    token_s = login(client, "student@test.com", "student123")
    r = client.post("/student/submissions", json={"answer": "My answer here", "assignment_id": assignment_id},
                    headers={"Authorization": f"Bearer {token_s}"})
    submission_id = r.json()["id"]

    r = client.patch(f"/teacher/submissions/{submission_id}/grade",
                     json={"marks": 100, "feedback": "Too high", "status": "graded"},
                     headers={"Authorization": f"Bearer {token_t}"})
    assert r.status_code == 400


def test_student_cannot_see_draft_assignment(client, db):
    class_id, _, _ = setup_class_with_teacher_and_student(client, db)
    token_t = login(client, "teacher@test.com", "teacher123")
    client.post("/teacher/assignments", json={
        "title": "Draft Homework", "description": "Complete this assignment carefully", "deadline": "2099-12-31T23:59:00",
        "max_marks": 100, "status": "draft", "class_id": class_id
    }, headers={"Authorization": f"Bearer {token_t}"})

    token_s = login(client, "student@test.com", "student123")
    r = client.get("/student/assignments", headers={"Authorization": f"Bearer {token_s}"})
    assert len(r.json()) == 0
