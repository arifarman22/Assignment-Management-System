from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.models import Role, AssignmentStatus, SubmissionStatus


# ── Auth ──────────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    user_id: int
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── User ──────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Role


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: Role
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


# ── Class ─────────────────────────────────────────────────────────────────────
class ClassCreate(BaseModel):
    name: str
    subject: str


class ClassOut(BaseModel):
    id: int
    name: str
    subject: str
    created_at: datetime
    teachers: list[UserOut] = []
    students: list[UserOut] = []

    model_config = {"from_attributes": True}


# ── Assignment ────────────────────────────────────────────────────────────────
class AssignmentCreate(BaseModel):
    title: str
    description: str
    deadline: datetime
    max_marks: float
    status: AssignmentStatus = AssignmentStatus.draft
    allow_resubmit: bool = True
    class_id: int


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    max_marks: Optional[float] = None
    status: Optional[AssignmentStatus] = None
    allow_resubmit: Optional[bool] = None


class AssignmentOut(BaseModel):
    id: int
    title: str
    description: str
    deadline: datetime
    max_marks: float
    status: AssignmentStatus
    allow_resubmit: bool
    created_at: datetime
    teacher_id: int
    class_id: int

    model_config = {"from_attributes": True}


# ── Submission ────────────────────────────────────────────────────────────────
class SubmissionCreate(BaseModel):
    answer: str
    assignment_id: int


class SubmissionUpdate(BaseModel):
    answer: str


class GradeSubmission(BaseModel):
    marks: float
    feedback: Optional[str] = None
    status: SubmissionStatus = SubmissionStatus.graded


class SubmissionOut(BaseModel):
    id: int
    answer: str
    status: SubmissionStatus
    marks: Optional[float]
    feedback: Optional[str]
    submitted_at: datetime
    updated_at: datetime
    student_id: int
    assignment_id: int

    model_config = {"from_attributes": True}
