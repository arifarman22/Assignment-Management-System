"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { Dialog } from "@/components/ui/Dialog";
import { StatsCard } from "@/components/ui/StatsCard";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { SubmissionStatusBadge, Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { submissionSchema } from "@/lib/validations";
import { Assignment, Submission } from "@/types";
import { formatDateTime, getDeadlineStatus } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Send, Clock, CheckCircle, AlertCircle,
  Calendar, Award, MessageSquare, ChevronRight,
  TrendingUp, AlertTriangle, Star,
} from "lucide-react";

export default function StudentDashboard() {
  const { auth } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"assignments" | "submissions">("assignments");

  useEffect(() => {
    if (!auth) { router.push("/login"); return; }
    if (auth.role !== "student") { router.push(`/dashboard/${auth.role}`); return; }
    fetchData();
  }, [auth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([
        api.get("/student/assignments"),
        api.get("/student/submissions"),
      ]);
      setAssignments(a.data);
      setSubmissions(s.data);
    } finally {
      setLoading(false);
    }
  };

  const getSubmission = (id: number) => submissions.find((s) => s.assignment_id === id);
  const isOverdue = (d: string) => new Date() > new Date(d);

  const openAssignment = (a: Assignment) => {
    setSelectedAssignment(a);
    setAnswer(getSubmission(a.id)?.answer ?? "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    const result = submissionSchema.safeParse({ answer });
    if (!result.success) { toast.error(result.error.issues[0].message); return; }
    setSubmitting(true);
    const existing = getSubmission(selectedAssignment.id);
    try {
      if (existing) {
        await api.patch(`/student/submissions/${existing.id}`, { answer });
        toast.success("Submission updated!");
      } else {
        await api.post("/student/submissions", { answer, assignment_id: selectedAssignment.id });
        toast.success("Submitted successfully!");
      }
      setSelectedAssignment(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error submitting");
    } finally {
      setSubmitting(false);
    }
  };

  const pending = assignments.filter((a) => !getSubmission(a.id) && !isOverdue(a.deadline)).length;
  const submitted = submissions.length;
  const graded = submissions.filter((s) => s.status === "graded").length;
  const avgScore = graded > 0
    ? Math.round(
        submissions
          .filter((s) => s.status === "graded" && s.marks !== null)
          .reduce((acc, s) => {
            const max = assignments.find((a) => a.id === s.assignment_id)?.max_marks || 100;
            return acc + (s.marks! / max) * 100;
          }, 0) / graded
      )
    : 0;

  const deadlineTextColor = (d: string) => {
    const s = getDeadlineStatus(d);
    if (s === "overdue") return "text-rose-500";
    if (s === "urgent") return "text-amber-500";
    return "text-slate-400";
  };

  // Score colour helper
  const scoreColor = (pct: number) =>
    pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
  const scoreTextColor = (pct: number) =>
    pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600";
  const scoreBg = (pct: number) =>
    pct >= 70 ? "bg-emerald-50 border-emerald-200" : pct >= 50 ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200";

  return (
    <DashboardShell title="My Dashboard" subtitle={`Welcome back, ${auth?.name}`}>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard label="Pending" value={pending} icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-50" delay={0} />
        <StatsCard label="Submitted" value={submitted} icon={Send} iconColor="text-blue-600" iconBg="bg-blue-50" delay={0.05} />
        <StatsCard label="Graded" value={graded} icon={CheckCircle} iconColor="text-emerald-600" iconBg="bg-emerald-50" delay={0.1} />
        <StatsCard label="Avg. Score" value={graded > 0 ? `${avgScore}%` : "—"} icon={TrendingUp} iconColor="text-violet-600" iconBg="bg-violet-50" delay={0.15} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-5">
        {(["assignments", "submissions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === t && (
              <motion.div layoutId="studentTabBg" className="absolute inset-0 bg-white rounded-lg shadow-sm" transition={{ duration: 0.2 }} />
            )}
            <span className="relative">{t}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── ASSIGNMENTS TAB ── */}
        {tab === "assignments" && (
          <motion.div
            key="assignments"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
              </div>
            ) : assignments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200">
                <EmptyState icon={BookOpen} title="No assignments yet" description="Your teacher hasn't published any assignments yet. Check back soon!" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {assignments.map((a, i) => {
                  const sub = getSubmission(a.id);
                  const overdue = isOverdue(a.deadline);
                  const canOpen = !overdue || !!sub;
                  const scorePercent = sub?.marks != null
                    ? Math.round((sub.marks / a.max_marks) * 100)
                    : null;

                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => canOpen && openAssignment(a)}
                      className={`group bg-white rounded-2xl border p-5 transition-all ${
                        canOpen
                          ? "cursor-pointer hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5"
                          : "opacity-60 cursor-not-allowed border-slate-200"
                      } border-slate-200`}
                      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                          <BookOpen size={16} className="text-blue-600" />
                        </div>
                        {sub ? (
                          <SubmissionStatusBadge status={sub.status} />
                        ) : overdue ? (
                          <Badge variant="danger" dot>Missed</Badge>
                        ) : getDeadlineStatus(a.deadline) === "urgent" ? (
                          <Badge variant="warning" dot>Due Soon</Badge>
                        ) : (
                          <Badge variant="default" dot>Pending</Badge>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900 mb-1 line-clamp-1">{a.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{a.description}</p>

                      {/* Grade pill — shown prominently on card when graded */}
                      {sub?.status === "graded" && scorePercent !== null && (
                        <div className={`flex items-center justify-between px-3 py-2 rounded-xl border mb-3 ${scoreBg(scorePercent)}`}>
                          <div className="flex items-center gap-1.5">
                            <Star size={13} className={scoreTextColor(scorePercent)} />
                            <span className={`text-xs font-semibold ${scoreTextColor(scorePercent)}`}>Your Grade</span>
                          </div>
                          <span className={`text-sm font-bold ${scoreTextColor(scorePercent)}`}>
                            {sub.marks}/{a.max_marks} <span className="text-xs font-medium">({scorePercent}%)</span>
                          </span>
                        </div>
                      )}

                      {/* Resubmit requested banner */}
                      {sub?.status === "resubmit" && (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 mb-3">
                          <AlertTriangle size={13} className="text-amber-600" />
                          <span className="text-xs font-semibold text-amber-700">Teacher requested resubmission</span>
                        </div>
                      )}

                      <div className="space-y-1.5 mb-3">
                        <div className={`flex items-center gap-1.5 text-xs ${deadlineTextColor(a.deadline)}`}>
                          {overdue ? <AlertTriangle size={11} /> : <Calendar size={11} />}
                          <span>{overdue ? "Was due" : "Due"}: {formatDateTime(a.deadline)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Award size={11} />
                          <span>{a.max_marks} marks</span>
                        </div>
                      </div>

                      {canOpen && (
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <span className="text-xs text-slate-400">
                            {sub?.status === "graded" ? "View result" : sub ? "View / Update" : "Submit answer"}
                          </span>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── SUBMISSIONS TAB ── */}
        {tab === "submissions" && (
          <motion.div
            key="submissions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-4"><CardSkeleton /></div>
            ) : submissions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200">
                <EmptyState icon={Send} title="No submissions yet" description="Submit your first assignment to see it here" />
              </div>
            ) : (
              submissions.map((s, i) => {
                const assignment = assignments.find((a) => a.id === s.assignment_id);
                const maxMarks = assignment?.max_marks ?? 100;
                const scorePercent = s.marks !== null ? Math.round((s.marks / maxMarks) * 100) : null;

                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                    style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                  >
                    {/* Coloured top bar when graded */}
                    {s.status === "graded" && scorePercent !== null && (
                      <div className={`h-1 w-full ${scoreColor(scorePercent)}`} />
                    )}

                    <div className="p-5">
                      {/* Title row */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {assignment?.title ?? `Assignment #${s.assignment_id}`}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Submitted {formatDateTime(s.submitted_at)}
                          </p>
                        </div>
                        <SubmissionStatusBadge status={s.status} />
                      </div>

                      {/* ── GRADE RESULT CARD ── shown when graded */}
                      {s.status === "graded" && s.marks !== null && scorePercent !== null && (
                        <div className={`rounded-xl border p-4 mb-4 ${scoreBg(scorePercent)}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Star size={16} className={scoreTextColor(scorePercent)} />
                              <span className={`text-sm font-semibold ${scoreTextColor(scorePercent)}`}>
                                Your Result
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={`text-2xl font-bold ${scoreTextColor(scorePercent)}`}>
                                {s.marks}
                              </span>
                              <span className={`text-sm ${scoreTextColor(scorePercent)} opacity-70`}>
                                /{maxMarks}
                              </span>
                            </div>
                          </div>
                          {/* Score bar */}
                          <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${scorePercent}%` }}
                              transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
                              className={`h-full rounded-full ${scoreColor(scorePercent)}`}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className={`text-xs ${scoreTextColor(scorePercent)} opacity-70`}>Score</span>
                            <span className={`text-xs font-semibold ${scoreTextColor(scorePercent)}`}>
                              {scorePercent}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Resubmit requested */}
                      {s.status === "resubmit" && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 mb-4">
                          <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-amber-700">Resubmission Requested</p>
                            <p className="text-xs text-amber-600">Your teacher has asked you to resubmit this assignment.</p>
                          </div>
                        </div>
                      )}

                      {/* Answer */}
                      <div className="bg-slate-50 rounded-xl p-3 mb-3">
                        <p className="text-xs font-medium text-slate-500 mb-1">Your Answer</p>
                        <p className="text-sm text-slate-700 line-clamp-4">{s.answer}</p>
                      </div>

                      {/* Feedback */}
                      {s.feedback && (
                        <div className="flex items-start gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <MessageSquare size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-emerald-700 mb-0.5">Teacher Feedback</p>
                            <p className="text-sm text-emerald-600">{s.feedback}</p>
                          </div>
                        </div>
                      )}

                      {/* No feedback yet placeholder */}
                      {s.status !== "graded" && !s.feedback && (
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <Clock size={13} className="text-slate-400" />
                          <p className="text-xs text-slate-400">Awaiting teacher review…</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ASSIGNMENT MODAL ── */}
      {selectedAssignment && (() => {
        const sub = getSubmission(selectedAssignment.id);
        const overdue = isOverdue(selectedAssignment.deadline);
        const canEdit = !overdue && (!sub || (selectedAssignment.allow_resubmit && sub.status !== "graded"));
        const scorePercent = sub?.marks != null
          ? Math.round((sub.marks / selectedAssignment.max_marks) * 100)
          : null;

        return (
          <Dialog
            open={!!selectedAssignment}
            onClose={() => setSelectedAssignment(null)}
            title={selectedAssignment.title}
            description={`Max ${selectedAssignment.max_marks} marks · Due ${formatDateTime(selectedAssignment.deadline)}`}
            size="md"
          >
            <div className="space-y-4">
              {/* Assignment description */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-1.5">Assignment Details</p>
                <p className="text-sm text-slate-700">{selectedAssignment.description}</p>
              </div>

              {/* ── GRADE RESULT inside modal ── */}
              {sub?.status === "graded" && sub.marks !== null && scorePercent !== null && (
                <div className={`rounded-xl border p-4 ${scoreBg(scorePercent)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Star size={16} className={scoreTextColor(scorePercent)} />
                      <span className={`text-sm font-semibold ${scoreTextColor(scorePercent)}`}>Your Grade</span>
                    </div>
                    <span className={`text-2xl font-bold ${scoreTextColor(scorePercent)}`}>
                      {sub.marks}<span className="text-sm font-medium opacity-70">/{selectedAssignment.max_marks}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${scorePercent}%` }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      className={`h-full rounded-full ${scoreColor(scorePercent)}`}
                    />
                  </div>
                  <p className={`text-xs font-semibold mt-1.5 text-right ${scoreTextColor(scorePercent)}`}>
                    {scorePercent}%
                  </p>
                </div>
              )}

              {/* Feedback inside modal */}
              {sub?.feedback && (
                <div className="flex items-start gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <MessageSquare size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 mb-0.5">Teacher Feedback</p>
                    <p className="text-sm text-emerald-600">{sub.feedback}</p>
                  </div>
                </div>
              )}

              {/* Resubmit banner inside modal */}
              {sub?.status === "resubmit" && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                  <p className="text-xs font-semibold text-amber-700">Teacher requested resubmission — update your answer below</p>
                </div>
              )}

              {/* Submission form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  label="Your Answer"
                  placeholder="Write your answer here…"
                  rows={5}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={!canEdit}
                  required
                />
                {canEdit ? (
                  <Button type="submit" variant="primary" icon={Send} loading={submitting} className="w-full justify-center">
                    {sub ? "Update Submission" : "Submit Answer"}
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-50 border border-slate-200">
                    <AlertCircle size={14} className="text-slate-400" />
                    <p className="text-sm text-slate-500">
                      {overdue ? "Deadline has passed" : "Submission is locked"}
                    </p>
                  </div>
                )}
              </form>
            </div>
          </Dialog>
        );
      })()}
    </DashboardShell>
  );
}
