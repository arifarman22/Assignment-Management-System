"""Seed script — creates demo admin, teacher, student, a class, and a published assignment."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine
from app.models.models import Base, User, Class, Assignment, Role, AssignmentStatus
from app.auth import hash_password
from datetime import datetime, timedelta

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if db.query(User).filter(User.email == "admin@test.com").first():
    print("Already seeded.")
    db.close()
    sys.exit(0)

admin = User(name="Admin User", email="admin@test.com", hashed_password=hash_password("admin123"), role=Role.admin)
teacher = User(name="Jane Smith", email="teacher@test.com", hashed_password=hash_password("teacher123"), role=Role.teacher)
student = User(name="John Doe", email="student@test.com", hashed_password=hash_password("student123"), role=Role.student)
db.add_all([admin, teacher, student])
db.flush()

cls = Class(name="CS101", subject="Introduction to Python")
db.add(cls)
db.flush()

cls.teachers.append(teacher)
cls.students.append(student)

assignment = Assignment(
    title="Python Basics Assignment",
    description="Write a Python function that takes a list of numbers and returns the sum of all even numbers.",
    deadline=datetime.utcnow() + timedelta(days=7),
    max_marks=100,
    status=AssignmentStatus.published,
    allow_resubmit=True,
    teacher_id=teacher.id,
    class_id=cls.id,
)
db.add(assignment)
db.commit()
print("Seeded successfully!")
db.close()
