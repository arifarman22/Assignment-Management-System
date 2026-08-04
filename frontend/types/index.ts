export type Role = "admin" | "teacher" | "student";

export interface AuthUser {
  access_token: string;
  role: Role;
  user_id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Class {
  id: number;
  name: string;
  subject: string;
  created_at: string;
  teachers: User[];
  students: User[];
}

export type AssignmentStatus = "draft" | "published";
export type SubmissionStatus = "submitted" | "graded" | "resubmit";

export interface Assignment {
  id: number;
  title: string;
  description: string;
  deadline: string;
  max_marks: number;
  status: AssignmentStatus;
  allow_resubmit: boolean;
  created_at: string;
  teacher_id: number;
  class_id: number;
}

export interface Submission {
  id: number;
  answer: string;
  status: SubmissionStatus;
  marks: number | null;
  feedback: string | null;
  submitted_at: string;
  updated_at: string;
  student_id: number;
  assignment_id: number;
}
