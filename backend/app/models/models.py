import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey,
    Enum, Boolean, Float, Table
)
from sqlalchemy.orm import relationship
from app.database import Base


class Role(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"


class AssignmentStatus(str, enum.Enum):
    draft = "draft"
    published = "published"


class SubmissionStatus(str, enum.Enum):
    submitted = "submitted"
    graded = "graded"
    resubmit = "resubmit"


# Association: teacher <-> class
teacher_class = Table(
    "teacher_class",
    Base.metadata,
    Column("teacher_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("class_id", Integer, ForeignKey("classes.id"), primary_key=True),
)

# Association: student <-> class
student_class = Table(
    "student_class",
    Base.metadata,
    Column("student_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("class_id", Integer, ForeignKey("classes.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(Role), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    taught_classes = relationship("Class", secondary=teacher_class, back_populates="teachers")
    enrolled_classes = relationship("Class", secondary=student_class, back_populates="students")
    assignments = relationship("Assignment", back_populates="teacher")
    submissions = relationship("Submission", back_populates="student")


class Class(Base):
    __tablename__ = "classes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    subject = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    teachers = relationship("User", secondary=teacher_class, back_populates="taught_classes")
    students = relationship("User", secondary=student_class, back_populates="enrolled_classes")
    assignments = relationship("Assignment", back_populates="class_")


class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    deadline = Column(DateTime, nullable=False)
    max_marks = Column(Float, nullable=False)
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.draft)
    allow_resubmit = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)

    teacher = relationship("User", back_populates="assignments")
    class_ = relationship("Class", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment")


class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, index=True)
    answer = Column(Text, nullable=False)
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.submitted)
    marks = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)

    student = relationship("User", back_populates="submissions")
    assignment = relationship("Assignment", back_populates="submissions")
