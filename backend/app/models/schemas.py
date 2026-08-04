from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
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

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Password cannot be empty")
        return v


# ── User ──────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Role

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        if len(v) > 100:
            raise ValueError("Name must be at most 100 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_strong(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password too long")
        return v


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

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Name must be at least 2 characters")
        return v


# ── Class ─────────────────────────────────────────────────────────────────────
class ClassCreate(BaseModel):
    name: str
    subject: str

    @field_validator("name", "subject")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Must be at least 2 characters")
        if len(v) > 100:
            raise ValueError("Must be at most 100 characters")
        return v


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

    @field_validator("title")
    @classmethod
    def title_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Title must be at least 3 characters")
        if len(v) > 200:
            raise ValueError("Title must be at most 200 characters")
        return v

    @field_validator("description")
    @classmethod
    def description_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 10:
            raise ValueError("Description must be at least 10 characters")
        return v

    @field_validator("max_marks")
    @classmethod
    def marks_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Max marks must be greater than 0")
        if v > 10000:
            raise ValueError("Max marks cannot exceed 10000")
        return v

    @field_validator("deadline")
    @classmethod
    def deadline_future(cls, v: datetime) -> datetime:
        if v <= datetime.utcnow():
            raise ValueError("Deadline must be in the future")
        return v


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    max_marks: Optional[float] = None
    status: Optional[AssignmentStatus] = None
    allow_resubmit: Optional[bool] = None

    @field_validator("title")
    @classmethod
    def title_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) < 3:
                raise ValueError("Title must be at least 3 characters")
        return v

    @field_validator("max_marks")
    @classmethod
    def marks_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("Max marks must be greater than 0")
        return v


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

    @field_validator("answer")
    @classmethod
    def answer_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1:
            raise ValueError("Answer cannot be empty")
        if len(v) > 50000:
            raise ValueError("Answer is too long (max 50,000 characters)")
        return v


class SubmissionUpdate(BaseModel):
    answer: str

    @field_validator("answer")
    @classmethod
    def answer_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1:
            raise ValueError("Answer cannot be empty")
        if len(v) > 50000:
            raise ValueError("Answer is too long (max 50,000 characters)")
        return v


class GradeSubmission(BaseModel):
    marks: float
    feedback: Optional[str] = None
    status: SubmissionStatus = SubmissionStatus.graded

    @field_validator("marks")
    @classmethod
    def marks_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Marks cannot be negative")
        return v

    @field_validator("feedback")
    @classmethod
    def feedback_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 2000:
            raise ValueError("Feedback must be at most 2000 characters")
        return v


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
