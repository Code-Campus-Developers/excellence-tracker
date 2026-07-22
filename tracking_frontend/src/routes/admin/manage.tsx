import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Users, UserPlus, Trash2, LogOut, GraduationCap, RefreshCw, ShieldOff, ShieldCheck, FileText } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { TRACKS } from "@/lib/tracking";

export const Route = createFileRoute("/admin/manage")({
  component: AdminPanel,
});

interface UserRow { id: string; name: string; email: string; role: string; track?: string | null; isActive: boolean; createdAt: string; }
interface StudentRow { id: string; name: string; email: string; track: string; _count: { evaluations: number }; }
interface AuditRow { id: string; userName: string; userRole: string; action: string; details: Record<string, unknown>; ipAddress: string; createdAt: string; }

function AdminPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);

  const [mentorDialog, setMentorDialog] = useState(false);
  const [studentDialog, setStudentDialog] = useState(false);
  const [newMentor, setNewMentor] = useState({ name: "", email: "", track: "" });
  const [newStudent, setNewStudent] = useState({ name: "", email: "", track: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [u, s, a] = await Promise.all([
      api.get<UserRow[]>("/admin/users"),
      api.get<StudentRow[]>("/admin/students"),
      api.get<{ logs: AuditRow[] }>("/admin/audit-logs"),
    ]);
    setUsers(u);
    setStudents(s);
    setAuditLogs(a?.logs ?? []);
  };

  useEffect(() => { load(); }, []);

  const mentors = users.filter((u) => u.role === "MENTOR");
  const studentUsers = users.filter((u) => u.role === "STUDENT");

  const createMentor = async () => {
    if (!newMentor.name || !newMentor.email) { toast.error("Name and email required"); return; }
    setSaving(true);
    try {
      await api.post("/admin/mentors", newMentor);
      toast.success(`Mentor created — welcome email sent to ${newMentor.email}`);
      setMentorDialog(false);
      setNewMentor({ name: "", email: "", track: "" });
      load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const createStudent = async () => {
    if (!newStudent.name || !newStudent.email || !newStudent.track) { toast.error("All fields required"); return; }
    setSaving(true);
    try {
      await api.post("/admin/students", newStudent);
      toast.success(`Student created — welcome email sent to ${newStudent.email}`);
      setStudentDialog(false);
      setNewStudent({ name: "", email: "", track: "" });
      load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const deleteMentor = async (id: string, name: string) => {
    if (!confirm(`Remove mentor ${name}?`)) return;
    try { await api.del(`/admin/mentors/${id}`); load(); toast.success("Mentor removed"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const deleteStudent = async (id: string, name: string) => {
    if (!confirm(`Remove student ${name} and all their evaluations?`)) return;
    try { await api.del(`/admin/students/${id}`); load(); toast.success("Student removed"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const resetPassword = async (userId: string, name: string) => {
    if (!confirm(`Reset password for ${name}? A new password will be sent to their email.`)) return;
    try {
      await api.post(`/admin/users/${userId}/reset-password`, {});
      toast.success(`Password reset — new credentials emailed to ${name}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const toggleActive = async (userId: string, name: string, isActive: boolean) => {
    const action = isActive ? "restrict" : "unrestrict";
    if (!confirm(`${action === "restrict" ? "Restrict" : "Unrestrict"} ${name}?`)) return;
    try {
      await api.post(`/admin/users/${userId}/toggle-active`, {});
      toast.success(`${name} ${action}ed`);
      load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const findUserId = (email: string) => users.find((u) => u.email === email)?.id;

  return (
    <AppShell>
      <PageHeader
        title="User Management"
        subtitle="Manage mentors, students and account access."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="p-5">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Mentors</div>
          <div className="text-3xl font-bold mt-2">{mentors.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Students</div>
          <div className="text-3xl font-bold mt-2">{students.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Registered Accounts</div>
          <div className="text-3xl font-bold mt-2">{studentUsers.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Restricted</div>
          <div className="text-3xl font-bold mt-2 text-destructive">{users.filter((u) => !u.isActive).length}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="mentors">
        <TabsList className="mb-4">
          <TabsTrigger value="mentors">Mentors</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Mentors Tab */}
        <TabsContent value="mentors">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Mentors / Evaluators</h2>
            <Button onClick={() => setMentorDialog(true)} className="bg-brand text-brand-foreground hover:bg-brand/90">
              <UserPlus className="h-4 w-4" /> Add Mentor
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 divide-y">
              {mentors.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No mentors yet.</div>}
              {mentors.map((m) => (
                <div key={m.id} className="flex items-center gap-4 p-4">
                  <div className="h-9 w-9 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                    {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.email}{m.track ? ` · ${m.track}` : ""}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${m.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {m.isActive ? "Active" : "Restricted"}
                  </span>
                  <button onClick={() => resetPassword(m.id, m.name)}
                    className="text-muted-foreground hover:text-brand p-1" title="Reset password">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button onClick={() => toggleActive(m.id, m.name, m.isActive)}
                    className="text-muted-foreground hover:text-warning p-1"
                    title={m.isActive ? "Restrict" : "Unrestrict"}>
                    {m.isActive ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4 text-brand" />}
                  </button>
                  <button onClick={() => deleteMentor(m.id, m.name)}
                    className="text-destructive hover:opacity-70 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Students</h2>
            <Button onClick={() => setStudentDialog(true)} className="bg-brand text-brand-foreground hover:bg-brand/90">
              <GraduationCap className="h-4 w-4" /> Add Student
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 divide-y">
              {students.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No students yet.</div>}
              {students.map((s) => {
                const userRecord = users.find((u) => u.email === s.email);
                return (
                  <div key={s.id} className="flex items-center gap-4 p-4">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                      {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.email} · {s.track}</div>
                    </div>
                    <div className="text-xs text-muted-foreground hidden sm:block">{s._count.evaluations} evals</div>
                    {userRecord ? (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${userRecord.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {userRecord.isActive ? "Active" : "Restricted"}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">No account</span>
                    )}
                    {userRecord && (
                      <>
                        <button onClick={() => resetPassword(userRecord.id, s.name)}
                          className="text-muted-foreground hover:text-brand p-1" title="Reset password">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button onClick={() => toggleActive(userRecord.id, s.name, userRecord.isActive)}
                          className="text-muted-foreground hover:text-warning p-1"
                          title={userRecord.isActive ? "Restrict" : "Unrestrict"}>
                          {userRecord.isActive ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4 text-brand" />}
                        </button>
                      </>
                    )}
                    <button onClick={() => deleteStudent(s.id, s.name)}
                      className="text-destructive hover:opacity-70 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Audit Log</h2>
            <span className="text-xs text-muted-foreground">{auditLogs.length} recent entries</span>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No audit logs yet.</td></tr>
                    )}
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-medium">{log.userName}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            log.userRole === "ADMIN" ? "bg-red-100 text-red-700" :
                            log.userRole === "MENTOR" ? "bg-blue-100 text-blue-700" :
                            "bg-green-100 text-green-700"
                          }`}>{log.userRole || "—"}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Mentor Dialog */}
      <Dialog open={mentorDialog} onOpenChange={setMentorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add New Mentor</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">Full Name</Label>
              <Input placeholder="enter full name" value={newMentor.name}
                onChange={(e) => setNewMentor((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">Email</Label>
              <Input type="email" placeholder="enter email address" value={newMentor.email}
                onChange={(e) => setNewMentor((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">Track / Specialty</Label>
              <Select value={newMentor.track} onValueChange={(v) => setNewMentor((p) => ({ ...p, track: v }))}>
                <SelectTrigger><SelectValue placeholder="Select track" /></SelectTrigger>
                <SelectContent>
                  {TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">A welcome email with login credentials will be sent automatically.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMentorDialog(false)}>Cancel</Button>
            <Button onClick={createMentor} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90">
              <UserPlus className="h-4 w-4" />{saving ? "Creating..." : "Create Mentor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={studentDialog} onOpenChange={setStudentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">Full Name</Label>
              <Input placeholder="enter full name" value={newStudent.name}
                onChange={(e) => setNewStudent((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">Email</Label>
              <Input type="email" placeholder="enter email address" value={newStudent.email}
                onChange={(e) => setNewStudent((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">Track</Label>
              <Select value={newStudent.track} onValueChange={(v) => setNewStudent((p) => ({ ...p, track: v }))}>
                <SelectTrigger><SelectValue placeholder="Select track" /></SelectTrigger>
                <SelectContent>
                  {TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">A welcome email with login credentials will be sent automatically.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentDialog(false)}>Cancel</Button>
            <Button onClick={createStudent} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90">
              <GraduationCap className="h-4 w-4" />{saving ? "Creating..." : "Create Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
