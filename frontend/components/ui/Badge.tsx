import { cn } from "@/lib/utils";
import { AssignmentStatus, SubmissionStatus } from "@/types";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "draft"
  | "published"
  | "submitted"
  | "graded"
  | "resubmit"
  | "admin"
  | "teacher"
  | "student";

const variants: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-600 border-slate-200",
  primary: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  purple: "bg-violet-50 text-violet-700 border-violet-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  graded: "bg-emerald-50 text-emerald-700 border-emerald-200",
  resubmit: "bg-amber-50 text-amber-700 border-amber-200",
  admin: "bg-violet-50 text-violet-700 border-violet-200",
  teacher: "bg-blue-50 text-blue-700 border-blue-200",
  student: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = "default", children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variants[variant],
        className
      )}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      )}
      {children}
    </span>
  );
}

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  return (
    <Badge variant={status} dot>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const labels: Record<SubmissionStatus, string> = {
    submitted: "Submitted",
    graded: "Graded",
    resubmit: "Resubmit",
  };
  return (
    <Badge variant={status} dot>
      {labels[status]}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={role as BadgeVariant} className="capitalize">
      {role}
    </Badge>
  );
}
