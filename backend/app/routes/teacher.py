from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import Assignment, Class, Submission, User, Role
from app.models.schemas import AssignmentCreate, AssignmentOut, AssignmentUpdate, SubmissionOut, GradeSubmission, ClassOut
from app.auth import require_roles

router = APIRouter(prefix="/teacher", tags=["Teacher"])
teacher_only = require_roles(Role.teacher)


@router.post("/assignments", response_model=AssignmentOut)
def create_assignment(body: AssignmentCreate, db: Session = Depends(get_db), current_user: User = Depends(teacher_only)):
    cls = db.query(Class).filter(Class.id == body.class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    if current_user not in cls.teachers:
        raise HTTPException(status_code=403, detail="Not assigned to this class")
    assignment = Assignment(**body.model_dump(), teacher_id=current_user.id)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/classes", response_model=List[ClassOut])
def get_my_classes(db: Session = Depends(get_db), current_user: User = Depends(teacher_only)):
    return current_user.taught_classes


@router.get("/assignments", response_model=List[AssignmentOut])
def get_my_assignments(db: Session = Depends(get_db), current_user: User = Depends(teacher_only)):
    return db.query(Assignment).filter(Assignment.teacher_id == current_user.id).all()


@router.patch("/assignments/{assignment_id}", response_model=AssignmentOut)
def update_assignment(assignment_id: int, body: AssignmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(teacher_only)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.teacher_id == current_user.id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(assignment, k, v)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/assignments/{assignment_id}", status_code=204)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db), current_user: User = Depends(teacher_only)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.teacher_id == current_user.id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()


@router.get("/assignments/{assignment_id}/submissions", response_model=List[SubmissionOut])
def get_submissions(assignment_id: int, db: Session = Depends(get_db), current_user: User = Depends(teacher_only)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.teacher_id == current_user.id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment.submissions


@router.patch("/submissions/{submission_id}/grade", response_model=SubmissionOut)
def grade_submission(submission_id: int, body: GradeSubmission, db: Session = Depends(get_db), current_user: User = Depends(teacher_only)):
    submission = db.query(Submission).join(Assignment).filter(
        Submission.id == submission_id,
        Assignment.teacher_id == current_user.id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if body.marks > submission.assignment.max_marks:
        raise HTTPException(status_code=400, detail=f"Marks exceed maximum of {submission.assignment.max_marks}")
    submission.marks = body.marks
    submission.feedback = body.feedback
    submission.status = body.status
    db.commit()
    db.refresh(submission)
    return submission
