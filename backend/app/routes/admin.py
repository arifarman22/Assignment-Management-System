from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import User, Class, Role
from app.models.schemas import UserCreate, UserOut, UserUpdate, ClassCreate, ClassOut
from app.auth import hash_password, require_roles, get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])
admin_only = require_roles(Role.admin)


@router.post("/users", response_model=UserOut)
def create_user(body: UserCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(name=body.name, email=body.email, hashed_password=hash_password(body.password), role=body.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(admin_only)):
    return db.query(User).all()


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, body: UserUpdate, db: Session = Depends(get_db), _=Depends(admin_only)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), _=Depends(admin_only)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


@router.post("/classes", response_model=ClassOut)
def create_class(body: ClassCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    cls = Class(name=body.name, subject=body.subject)
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls


@router.get("/classes", response_model=List[ClassOut])
def list_classes(db: Session = Depends(get_db), _=Depends(admin_only)):
    return db.query(Class).all()


@router.delete("/classes/{class_id}", status_code=204)
def delete_class(class_id: int, db: Session = Depends(get_db), _=Depends(admin_only)):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    db.delete(cls)
    db.commit()


@router.post("/classes/{class_id}/teachers/{teacher_id}", status_code=204)
def assign_teacher(class_id: int, teacher_id: int, db: Session = Depends(get_db), _=Depends(admin_only)):
    cls = db.query(Class).filter(Class.id == class_id).first()
    teacher = db.query(User).filter(User.id == teacher_id, User.role == Role.teacher).first()
    if not cls or not teacher:
        raise HTTPException(status_code=404, detail="Class or teacher not found")
    if teacher not in cls.teachers:
        cls.teachers.append(teacher)
        db.commit()


@router.post("/classes/{class_id}/students/{student_id}", status_code=204)
def enroll_student(class_id: int, student_id: int, db: Session = Depends(get_db), _=Depends(admin_only)):
    cls = db.query(Class).filter(Class.id == class_id).first()
    student = db.query(User).filter(User.id == student_id, User.role == Role.student).first()
    if not cls or not student:
        raise HTTPException(status_code=404, detail="Class or student not found")
    if student not in cls.students:
        cls.students.append(student)
        db.commit()
