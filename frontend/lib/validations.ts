import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long"),
  role: z.enum(["admin", "teacher", "student"]),
  class_id: z.string().optional(),
}).refine((d) => d.role !== "student" || !!d.class_id, {
  message: "Students must be enrolled in a class",
  path: ["class_id"],
});

export const createClassSchema = z.object({
  name: z.string().trim().min(2, "Must be at least 2 characters").max(100, "Too long"),
  subject: z.string().trim().min(2, "Must be at least 2 characters").max(100, "Too long"),
});

export const assignmentSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200, "Title too long"),
  description: z.string().trim().min(10, "Description must be at least 10 characters"),
  deadline: z.string().refine((v) => !!v && new Date(v) > new Date(), {
    message: "Deadline must be in the future",
  }),
  max_marks: z.coerce.number().positive("Must be greater than 0").max(10000, "Cannot exceed 10000"),
  status: z.enum(["draft", "published"]),
  allow_resubmit: z.boolean(),
  class_id: z.string().min(1, "Please select a class"),
});

export const gradeSchema = z.object({
  marks: z.coerce.number().min(0, "Marks cannot be negative"),
  feedback: z.string().max(2000, "Feedback too long").optional(),
  status: z.enum(["graded", "resubmit"]),
});

export const submissionSchema = z.object({
  answer: z.string().trim().min(1, "Answer cannot be empty").max(50000, "Answer too long"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type GradeInput = z.infer<typeof gradeSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
