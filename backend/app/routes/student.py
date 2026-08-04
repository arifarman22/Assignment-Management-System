from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import Assignment, AssignmentStatus, Submission, SubmissionStatus, User, Role
from app.models.schemas import AssignmentOut, SubmissionCreate, SubmissionOut, SubmissionUpdate
from app.auth import require_roles

router = APIRouter(prefix="/student", tags=["Student"])
student_only = require_roles(Role.student)


@router.get("/assignments", response_model=List[AssignmentOut])
def get_assignments(db: Session = Depends(get_db), current_user: User = Depends(student_only)):
    class_ids = [c.id for c in current_user.enrolled_classes]
    return db.query(Assignment).filter(
        Assignment.class_id.in_(class_ids),
        Assignment.status == AssignmentStatus.published
    ).all()


@router.get("/assignments/{assignment_id}", response_model=AssignmentOut)
def get_assignment(assignment_id: int, db: Session = Depends(get_db), current_user: User = Depends(student_only)):
    class_ids = [c.id for c in current_user.enrolled_classes]
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.class_id.in_(class_ids),
        Assignment.status == AssignmentStatus.published
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@router.post("/submissions", response_model=SubmissionOut)
def submit_assignment(body: SubmissionCreate, db: Session = Depends(get_db), current_user: User = Depends(student_only)):
    class_ids = [c.id for c in current_user.enrolled_classes]
    assignment = db.query(Assignment).filter(
        Assignment.id == body.assignment_id,
        Assignment.class_id.in_(class_ids),
        Assignment.status == AssignmentStatus.published
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if datetime.utcnow() > assignment.deadline:
        raise HTTPException(status_code=400, detail="Deadline has passed")
    existing = db.query(Submission).filter(
        Submission.assignment_id == body.assignment_id,
        Submission.student_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already submitted. Use PATCH to update.")
    submission = Submission(answer=body.answer, assignment_id=body.assignment_id, student_id=current_user.id)
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.patch("/submissions/{submission_id}", response_model=SubmissionOut)
def update_submission(submission_id: int, body: SubmissionUpdate, db: Session = Depends(get_db), current_user: User = Depends(student_only)):
    submission = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.student_id == current_user.id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if not submission.assignment.allow_resubmit:
        raise HTTPException(status_code=403, detail="Resubmission not allowed")
    if submission.status == SubmissionStatus.graded:
        raise HTTPException(status_code=403, detail="Cannot update a graded submission")
    if datetime.utcnow() > submission.assignment.deadline:
        raise HTTPException(status_code=400, detail="Deadline has passed")
    submission.answer = body.answer
    submission.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(submission)
    return submission


@router.get("/submissions", response_model=List[SubmissionOut])
def get_my_submissions(db: Session = Depends(get_db), current_user: User = Depends(student_only)):
    return db.query(Submission).filter(Submission.student_id == current_user.id).all()
