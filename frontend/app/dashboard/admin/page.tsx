"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { Dialog } from "@/components/ui/Dialog";
import { StatsCard } from "@/components/ui/StatsCard";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge, RoleBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { User, Class, Role } from "@/types";
import { formatDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, GraduationCap, BookOpen, Plus, Trash2, UserPlus,
  Search, Shield, MoreHorizontal, Building2, ChevronDown, ChevronUp
} from "lucide-react";

type Tab = "users" | "classes";

export default function AdminDashboard() {
  const { auth } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showUserModal, setShowUserModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<{ classId: number; type: "teacher" | "student" } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "student" as Role, class_id: "" });
  const [newClass, setNewClass] = useState({ name: "", subject: "" });

  useEffect(() => {
    if (!auth) { router.push("/login"); return; }
    if (auth.role !== "admin") { router.push(`/dashboard/${auth.role}`); return; }
    fetchAll();
  }, [auth]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([api.get("/admin/users"), api.get("/admin/classes")]);
      setUsers(u.data);
      setClasses(c.data);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { class_id, ...userData } = newUser;
      const { data: created } = await api.post("/admin/users", userData);
      if (class_id) {
        const endpoint = userData.role === "teacher"
          ? `/admin/classes/${class_id}/teachers/${created.id}`
          : `/admin/classes/${class_id}/students/${created.id}`;
        await api.post(endpoint);
      }
      toast.success(`User created${class_id ? " and enrolled in class" : ""}`);
      setShowUserModal(false);
      setNewUser({ name: "", email: "", password: "", role: "student", class_id: "" });
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Error creating user");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    await api.delete(`/admin/users/${id}`);
    toast.success("User deleted");
    fetchAll();
  };

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/admin/classes", newClass);
      toast.success("Class created successfully");
      setShowClassModal(false);
      setNewClass({ name: "", subject: "" });
      fetchAll();
    } catch {
      toast.error("Error creating class");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteClass = async (id: number) => {
    if (!confirm("Are you sure you want to delete this class?")) return;
    await api.delete(`/admin/classes/${id}`);
    toast.success("Class deleted");
    fetchAll();
  };

  const assignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssignModal || !selectedUserId) return;
    setSubmitting(true);
    const { classId, type } = showAssignModal;
    const endpoint = type === "teacher"
      ? `/admin/classes/${classId}/teachers/${selectedUserId}`
      : `/admin/classes/${classId}/students/${selectedUserId}`;
    try {
      await api.post(endpoint);
      toast.success(`${type === "teacher" ? "Teacher" : "Student"} assigned successfully`);
      setShowAssignModal(null);
      setSelectedUserId("");
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const [expandedClass, setExpandedClass] = useState<number | null>(null);

  const teachers = users.filter((u) => u.role === "teacher");
  const students = users.filter((u) => u.role === "student");
  const admins = users.filter((u) => u.role === "admin");

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: Tab[] = ["users", "classes"];

  return (
    <DashboardShell title="Admin Dashboard" subtitle="Manage users, classes, and system settings">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard label="Total Users" value={users.length} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" delay={0} />
        <StatsCard label="Teachers" value={teachers.length} icon={GraduationCap} iconColor="text-violet-600" iconBg="bg-violet-50" delay={0.05} />
        <StatsCard label="Students" value={students.length} icon={Users} iconColor="text-emerald-600" iconBg="bg-emerald-50" delay={0.1} />
        <StatsCard label="Classes" value={classes.length} icon={BookOpen} iconColor="text-amber-600" iconBg="bg-amber-50" delay={0.15} />
      </div>

      {/* Tab bar + actions */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch(""); }}
              className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                tab === t ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === t && (
                <motion.div
                  layoutId="tabBg"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ duration: 0.2 }}
                />
              )}
              <span className="relative">{t}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${tab}…`}
              className="h-9 pl-8 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-52 transition-all"
            />
          </div>
          {tab === "users" ? (
            <Button variant="primary" icon={Plus} onClick={() => setShowUserModal(true)}>
              Add User
            </Button>
          ) : (
            <Button variant="primary" icon={Plus} onClick={() => setShowClassModal(true)}>
              Add Class
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === "users" && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">All Users</h2>
                <p className="text-xs text-slate-500 mt-0.5">{filteredUsers.length} total</p>
              </div>
            </div>
            {loading ? (
              <div className="p-4"><TableSkeleton /></div>
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No users found"
                description={search ? "Try a different search term" : "Create your first user to get started"}
                action={!search ? { label: "Add User", onClick: () => setShowUserModal(true), icon: Plus } : undefined}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">User</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Role</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Joined</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((u, i) => (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">{u.name}</p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3.5">
                          <Badge variant={u.is_active ? "success" : "danger"} dot>
                            {u.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-500">{formatDate(u.created_at)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {tab === "classes" && (
          <motion.div
            key="classes"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-4"><TableSkeleton rows={3} /></div>
            ) : filteredClasses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200">
                <EmptyState
                  icon={BookOpen}
                  title="No classes found"
                  description={search ? "Try a different search term" : "Create your first class to get started"}
                  action={!search ? { label: "Add Class", onClick: () => setShowClassModal(true), icon: Plus } : undefined}
                />
              </div>
            ) : (
              filteredClasses.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-200 hover:shadow-md transition-all group"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between p-5">
                    <button
                      className="flex items-center gap-4 flex-1 text-left"
                      onClick={() => setExpandedClass(expandedClass === c.id ? null : c.id)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <Building2 size={18} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">{c.name}</h3>
                          <span className="text-xs text-slate-400">{expandedClass === c.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {c.subject} · {c.teachers.length} teacher{c.teachers.length !== 1 ? "s" : ""} · {c.students.length} student{c.students.length !== 1 ? "s" : ""} · Created {formatDate(c.created_at)}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" icon={UserPlus} onClick={() => setShowAssignModal({ classId: c.id, type: "teacher" })}>Teacher</Button>
                      <Button variant="secondary" size="sm" icon={UserPlus} onClick={() => setShowAssignModal({ classId: c.id, type: "student" })}>Student</Button>
                      <button
                        onClick={() => deleteClass(c.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {expandedClass === c.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-slate-100 px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {/* Teachers */}
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <GraduationCap size={12} /> Teachers
                            </p>
                            {c.teachers.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">No teachers assigned</p>
                            ) : (
                              <div className="space-y-2">
                                {c.teachers.map((t) => (
                                  <div key={t.id} className="flex items-center gap-2.5">
                                    <Avatar name={t.name} size="sm" />
                                    <div>
                                      <p className="text-sm font-medium text-slate-800 leading-none">{t.name}</p>
                                      <p className="text-xs text-slate-400 mt-0.5">{t.email}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Students */}
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <Users size={12} /> Students
                            </p>
                            {c.students.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">No students enrolled</p>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {c.students.map((s) => (
                                  <div key={s.id} className="flex items-center gap-2.5">
                                    <Avatar name={s.name} size="sm" />
                                    <div>
                                      <p className="text-sm font-medium text-slate-800 leading-none">{s.name}</p>
                                      <p className="text-xs text-slate-400 mt-0.5">{s.email}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create User Modal */}
      <Dialog open={showUserModal} onClose={() => setShowUserModal(false)} title="Create New User" description="Add a new user to the system">
        <form onSubmit={createUser} className="space-y-4">
          <Input label="Full Name" placeholder="Jane Smith" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
          <Input label="Email Address" type="email" placeholder="jane@school.edu" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
          <Input label="Password" type="password" placeholder="Min. 8 characters" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
          <Select label="Role" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role, class_id: "" })}>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </Select>
          {(newUser.role === "student" || newUser.role === "teacher") && (
            <div className="space-y-1.5">
              <Select
                label={newUser.role === "student" ? "Enroll in Class (required)" : "Assign to Class (optional)"}
                value={newUser.class_id}
                onChange={(e) => setNewUser({ ...newUser, class_id: e.target.value })}
                required={newUser.role === "student"}
              >
                <option value="">— Select a class —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.subject}</option>
                ))}
              </Select>
              {newUser.role === "student" && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  ⚠ Students must be enrolled in a class to see assignments.
                </p>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" loading={submitting} className="flex-1">Create User</Button>
            <Button type="button" variant="secondary" onClick={() => setShowUserModal(false)}>Cancel</Button>
          </div>
        </form>
      </Dialog>

      {/* Create Class Modal */}
      <Dialog open={showClassModal} onClose={() => setShowClassModal(false)} title="Create New Class" description="Set up a new class or course">
        <form onSubmit={createClass} className="space-y-4">
          <Input label="Class Name" placeholder="e.g. Year 10A" value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} required />
          <Input label="Subject" placeholder="e.g. Mathematics" value={newClass.subject} onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })} required />
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" loading={submitting} className="flex-1">Create Class</Button>
            <Button type="button" variant="secondary" onClick={() => setShowClassModal(false)}>Cancel</Button>
          </div>
        </form>
      </Dialog>

      {/* Assign User Modal */}
      <Dialog
        open={!!showAssignModal}
        onClose={() => setShowAssignModal(null)}
        title={`Assign ${showAssignModal?.type === "teacher" ? "Teacher" : "Student"}`}
        description="Select a user to assign to this class"
      >
        <form onSubmit={assignUser} className="space-y-4">
          <Select
            label={`Select ${showAssignModal?.type === "teacher" ? "Teacher" : "Student"}`}
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            required
          >
            <option value="">— Choose a user —</option>
            {(showAssignModal?.type === "teacher" ? teachers : students).map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </Select>
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" loading={submitting} className="flex-1">Assign</Button>
            <Button type="button" variant="secondary" onClick={() => setShowAssignModal(null)}>Cancel</Button>
          </div>
        </form>
      </Dialog>
    </DashboardShell>
  );
}
