import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Users2, Plus, Trash2, Link2, Link2Off, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const Route = createFileRoute("/admin/parents")({
  component: AdminParents,
});

interface Child { id: string; name: string; studentCode: string; track: string; }
interface ParentRow {
  id: string; name: string; email: string; phone: string | null;
  isActive: boolean; createdAt: string; children: Child[];
}
interface StudentRow { id: string; name: string; studentCode: string; track: string; }

function AdminParents() {
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [createDialog, setCreateDialog] = useState(false);
  const [linkDialog, setLinkDialog] = useState<string | null>(null); // parentId
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [p, s] = await Promise.all([
      api.get<ParentRow[]>("/admin/parents"),
      api.get<StudentRow[]>("/admin/students"),
    ]);
    setParents(p ?? []);
    setStudents(s ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.firstName || !form.lastName || !form.email) { toast.error("First name, last name and email are required"); return; }
    setSaving(true);
    try {
      const res = await api.post<ParentRow & { tempPassword: string }>("/admin/parents", {
        firstName: form.firstName,
        lastName: form.lastName,
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email,
        phone: form.phone || undefined,
      });
      toast.success(`Parent account created! Temp password: ${res.tempPassword}`, { duration: 10000 });
      setCreateDialog(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "" });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create parent");
    } finally { setSaving(false); }
  };

  const handleLink = async () => {
    if (!linkDialog || !selectedStudentId) { toast.error("Select a student"); return; }
    setSaving(true);
    try {
      await api.post(`/admin/parents/${linkDialog}/link/${selectedStudentId}`, {});
      toast.success("Student linked!");
      setLinkDialog(null);
      setSelectedStudentId("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to link student");
    } finally { setSaving(false); }
  };

  const handleUnlink = async (parentId: string, studentId: string, studentName: string) => {
    if (!confirm(`Unlink ${studentName} from this parent?`)) return;
    try {
      await api.del(`/admin/parents/${parentId}/unlink/${studentId}`);
      toast.success("Student unlinked");
      load();
    } catch { toast.error("Failed to unlink"); }
  };

  const handleDelete = async (parentId: string, name: string) => {
    if (!confirm(`Delete parent account for ${name}? This cannot be undone.`)) return;
    try {
      await api.del(`/admin/parents/${parentId}`);
      toast.success("Parent account deleted");
      load();
    } catch { toast.error("Failed to delete"); }
  };

  // Students not yet linked to a given parent
  const availableStudents = (parentId: string) => {
    const linked = parents.find((p) => p.id === parentId)?.children.map((c) => c.id) ?? [];
    return students.filter((s) => !linked.includes(s.id));
  };

  return (
    <AppShell>
      <PageHeader
        title="Parent Portal"
        subtitle={`${parents.length} parent account${parents.length !== 1 ? "s" : ""}`}
        actions={
          <Button onClick={() => setCreateDialog(true)} className="bg-brand text-brand-foreground hover:bg-brand/90 gap-2">
            <Plus className="h-4 w-4" /> Add Parent
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : parents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No parent accounts yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Add Parent" to create the first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {parents.map((parent) => (
            <Card key={parent.id}>
              <CardContent className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpanded(expanded === parent.id ? null : parent.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{parent.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{parent.email}{parent.phone ? ` · ${parent.phone}` : ""}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {parent.children.length} linked child{parent.children.length !== 1 ? "ren" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <Button size="sm" variant="outline" className="gap-1 px-2 sm:px-3" onClick={(e) => {
                      e.stopPropagation();
                      setLinkDialog(parent.id);
                      setSelectedStudentId("");
                    }}>
                      <Link2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Link Student</span>
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(parent.id, parent.name);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {expanded === parent.id
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>
                </div>

                {/* Expanded children */}
                {expanded === parent.id && parent.children.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Linked Children</p>
                    {parent.children.map((child) => (
                      <div key={child.id} className="flex items-center justify-between text-sm bg-muted/40 rounded-md px-3 py-2">
                        <div>
                          <span className="font-medium">{child.name}</span>
                          <span className="text-muted-foreground ml-2">{child.studentCode} · {child.track}</span>
                        </div>
                        <button
                          onClick={() => handleUnlink(parent.id, child.id, child.name)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Unlink"
                        >
                          <Link2Off className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {expanded === parent.id && parent.children.length === 0 && (
                  <p className="mt-3 pt-3 border-t text-sm text-muted-foreground">No children linked yet.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Parent Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Parent Account</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">First Name</Label>
              <Input placeholder="enter first name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">Last Name</Label>
              <Input placeholder="enter last name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">Email</Label>
              <Input type="email" placeholder="Enter email address" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">Phone Number</Label>
              <Input placeholder="Enter phone number" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Student Dialog */}
      <Dialog open={!!linkDialog} onOpenChange={() => setLinkDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link a Student</DialogTitle></DialogHeader>
          <div className="py-2">
            <Label className="mb-1.5 block">Select Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a student…" />
              </SelectTrigger>
              <SelectContent>
                {linkDialog && availableStudents(linkDialog).length === 0 ? (
                  <SelectItem value="__none" disabled>All students already linked</SelectItem>
                ) : (
                  (linkDialog ? availableStudents(linkDialog) : []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.studentCode} · {s.track})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(null)}>Cancel</Button>
            <Button onClick={handleLink} disabled={saving || !selectedStudentId || selectedStudentId === "__none"} className="bg-brand text-brand-foreground hover:bg-brand/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
