"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { Dialog } from "@/components/ui/Dialog";
import { StatsCard } from "@/components/ui/StatsCard";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { AssignmentStatusBadge, SubmissionStatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { assignmentSchema, gradeSchema } from "@/lib/validations";
import { Assignment, Class, Submission } from "@/types";
import { formatDateTime, getDeadlineStatus } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, CheckCircle, Clock, Plus, Pencil, Trash2, Eye,
  Calendar, Award, Users, ChevronRight, AlertTriangle, Send
} from "lucide-react";

const emptyForm = { title: "", description: "", deadline: "", max_marks: "", status: "draft", allow_resubmit: true, class_id: "" };
type FormState = typeof emptyForm;

function AssignmentForm({ form, setForm, submitting, classes, onSubmit, label, onCancel }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  submitting: boolean;
  classes: Class[];
  onSubmit: (e: React.FormEvent) => void;
  label: string;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input label="Assignment Title" placeholder="e.g. Chapter 5 Review" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      <Textarea label="Description" placeholder="Describe the assignment requirements…" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Deadline" type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />
        <Input label="Max Marks" type="number" placeholder="100" value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </Select>
        <Select label="Class" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} required>
          <option value="">— Select class —</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name} – {c.subject}</option>)}
        </Select>
      </div>
      <label className="flex items-center gap-2.5 cursor-pointer group">
        <div className={`w-9 h-5 rounded-full transition-colors relative ${form.allow_resubmit ? "bg-blue-600" : "bg-slate-200"}`}
          onClick={() => setForm({ ...form, allow_resubmit: !form.allow_resubmit })}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.allow_resubmit ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
        <span className="text-sm text-slate-700">Allow resubmission</span>
      </label>
      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" loading={submitting} className="flex-1">{label}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function TeacherDashboard() {
  const { auth } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradeForm, setGradeForm] = useState({ marks: "", feedback: "", status: "graded" });
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auth) { router.push("/login"); return; }
    if (auth.role !== "teacher") { router.push(`/dashboard/${auth.role}`); return; }
    fetchAll();
  }, [auth]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        api.get("/teacher/assignments"),
        api.get("/teacher/classes"),
      ]);
      setAssignments(a.data);
      setClasses(c.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (id: number) => {
    const { data } = await api.get(`/teacher/assignments/${id}/submissions`);
    setSubmissions(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = assignmentSchema.safeParse(form);
    if (!result.success) { toast.error(result.error.issues[0].message); return; }
    setSubmitting(true);
    try {
      await api.post("/teacher/assignments", {
        ...form,
        max_marks: parseFloat(form.max_marks),
        class_id: parseInt(form.class_id),
      });
      toast.success("Assignment created");
      setShowCreate(false);
      setForm(emptyForm);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Error creating assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    const result = assignmentSchema.safeParse(form);
    if (!result.success) { toast.error(result.error.issues[0].message); return; }
    setSubmitting(true);
    try {
      await api.patch(`/teacher/assignments/${editingAssignment.id}`, {
        title: form.title, description: form.description, deadline: form.deadline,
        max_marks: parseFloat(form.max_marks), status: form.status, allow_resubmit: form.allow_resubmit,
      });
      toast.success("Assignment updated");
      setEditingAssignment(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this assignment?")) return;
    await api.delete(`/teacher/assignments/${id}`);
    toast.success("Assignment deleted");
    fetchAll();
  };

  const openEdit = (a: Assignment) => {
    setEditingAssignment(a);
    setForm({
      title: a.title, description: a.description,
      deadline: a.deadline.slice(0, 16), max_marks: String(a.max_marks),
      status: a.status, allow_resubmit: a.allow_resubmit, class_id: String(a.class_id),
    });
  };

  const openSubmissions = async (a: Assignment) => {
    setViewingAssignment(a);
    await fetchSubmissions(a.id);
  };

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;
    const result = gradeSchema.safeParse({ ...gradeForm, marks: parseFloat(gradeForm.marks) });
    if (!result.success) { toast.error(result.error.issues[0].message); return; }
    setSubmitting(true);
    try {
      await api.patch(`/teacher/submissions/${gradingSubmission.id}/grade`, {
        marks: parseFloat(gradeForm.marks),
        feedback: gradeForm.feedback,
        status: gradeForm.status,
      });
      toast.success("Submission graded!");
      setGradingSubmission(null);
      if (viewingAssignment) fetchSubmissions(viewingAssignment.id);
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const published = assignments.filter((a) => a.status === "published").length;
  const drafts = assignments.filter((a) => a.status === "draft").length;
  const totalSubs = assignments.reduce((acc) => acc, 0);

  const deadlineColor = (d: string) => {
    const s = getDeadlineStatus(d);
    if (s === "overdue") return "text-rose-500";
    if (s === "urgent") return "text-amber-500";
    if (s === "soon") return "text-amber-400";
    return "text-slate-400";
  };

  return (
    <DashboardShell title="Teacher Dashboard" subtitle={`Welcome back, ${auth?.name}`}>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard label="Total Assignments" value={assignments.length} icon={FileText} iconColor="text-blue-600" iconBg="bg-blue-50" delay={0} />
        <StatsCard label="Published" value={published} icon={CheckCircle} iconColor="text-emerald-600" iconBg="bg-emerald-50" delay={0.05} />
        <StatsCard label="Drafts" value={drafts} icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-50" delay={0.1} />
        <StatsCard label="Classes" value={classes.length} icon={Users} iconColor="text-violet-600" iconBg="bg-violet-50" delay={0.15} />
      </div>

      {/* Assignments */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">My Assignments</h2>
            <p className="text-xs text-slate-500 mt-0.5">{assignments.length} total</p>
          </div>
          <Button variant="primary" icon={Plus} onClick={() => { setForm(emptyForm); setShowCreate(true); }}>
            New Assignment
          </Button>
        </div>

        {loading ? (
          <div className="p-6 grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No assignments yet"
            description="Create your first assignment to get started with your class"
            action={{ label: "Create Assignment", onClick: () => { setForm(emptyForm); setShowCreate(true); }, icon: Plus }}
          />
        ) : (
          <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group relative p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all cursor-default"
                style={{ background: "linear-gradient(135deg, #FAFBFF 0%, #FFFFFF 100%)" }}
              >
                {/* Status indicator */}
                <div className="flex items-start justify-between mb-3">
                  <AssignmentStatusBadge status={a.status} />
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openSubmissions(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View submissions">
                      <Eye size={13} />
                    </button>
                    <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 mb-1 line-clamp-1">{a.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{a.description}</p>

                <div className="space-y-1.5">
                  <div className={`flex items-center gap-1.5 text-xs ${deadlineColor(a.deadline)}`}>
                    <Calendar size={11} />
                    <span>{formatDateTime(a.deadline)}</span>
                    {getDeadlineStatus(a.deadline) === "overdue" && <AlertTriangle size={11} />}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Award size={11} />
                    <span>{a.max_marks} marks</span>
                  </div>
                </div>

                <button
                  onClick={() => openSubmissions(a)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-xs font-medium text-slate-500 transition-colors border border-slate-100 hover:border-blue-200"
                >
                  <Users size={12} /> View Submissions <ChevronRight size={11} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Assignment Modal */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Create Assignment" description="Fill in the details for your new assignment">
        <AssignmentForm form={form} setForm={setForm} submitting={submitting} classes={classes} onSubmit={handleCreate} label="Create Assignment" onCancel={() => setShowCreate(false)} />
      </Dialog>

      {/* Edit Assignment Modal */}
      <Dialog open={!!editingAssignment} onClose={() => setEditingAssignment(null)} title="Edit Assignment" description="Update the assignment details">
        <AssignmentForm form={form} setForm={setForm} submitting={submitting} classes={classes} onSubmit={handleUpdate} label="Save Changes" onCancel={() => setEditingAssignment(null)} />
      </Dialog>

      {/* Submissions Modal */}
      <Dialog open={!!viewingAssignment} onClose={() => setViewingAssignment(null)} title={`Submissions`} description={viewingAssignment?.title} size="lg">
        <div className="space-y-3">
          {submissions.length === 0 ? (
            <EmptyState icon={Send} title="No submissions yet" description="Students haven't submitted their work yet" />
          ) : (
            submissions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={`Student ${s.student_id}`} size="sm" />
                    <span className="text-sm font-medium text-slate-700">Student #{s.student_id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SubmissionStatusBadge status={s.status} />
                    {s.marks !== null && (
                      <span className="text-sm font-bold text-blue-600">{s.marks}/{viewingAssignment?.max_marks}</span>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 mb-3">
                  <p className="text-sm text-slate-600 line-clamp-3">{s.answer}</p>
                </div>
                {s.feedback && (
                  <div className="flex items-start gap-2 p-2.5 bg-emerald-50 rounded-lg mb-2">
                    <CheckCircle size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-700">{s.feedback}</p>
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Award}
                  onClick={() => {
                    setGradingSubmission(s);
                    setGradeForm({ marks: String(s.marks ?? ""), feedback: s.feedback ?? "", status: "graded" });
                  }}
                >
                  {s.status === "graded" ? "Re-grade" : "Grade"}
                </Button>
              </motion.div>
            ))
          )}
        </div>
      </Dialog>

      {/* Grade Modal */}
      <Dialog open={!!gradingSubmission} onClose={() => setGradingSubmission(null)} title="Grade Submission" description="Assign marks and provide feedback">
        {gradingSubmission && (
          <>
            <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1.5">Student's Answer</p>
              <p className="text-sm text-slate-700">{gradingSubmission.answer}</p>
            </div>
            <form onSubmit={handleGrade} className="space-y-4">
              <Input
                label={`Marks (out of ${viewingAssignment?.max_marks})`}
                type="number"
                placeholder="0"
                value={gradeForm.marks}
                onChange={(e) => setGradeForm({ ...gradeForm, marks: e.target.value })}
                required
              />
              <Textarea
                label="Feedback (optional)"
                placeholder="Provide constructive feedback…"
                rows={3}
                value={gradeForm.feedback}
                onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
              />
              <Select label="Submission Status" value={gradeForm.status} onChange={(e) => setGradeForm({ ...gradeForm, status: e.target.value })}>
                <option value="graded">Graded</option>
                <option value="resubmit">Request Resubmission</option>
              </Select>
              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="primary" loading={submitting} className="flex-1">Submit Grade</Button>
                <Button type="button" variant="secondary" onClick={() => setGradingSubmission(null)}>Cancel</Button>
              </div>
            </form>
          </>
        )}
      </Dialog>
    </DashboardShell>
  );
}
