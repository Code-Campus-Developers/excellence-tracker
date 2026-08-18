import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth, type AuthUser } from "@/lib/authStore";
import { StudentShell } from "@/components/StudentShell";
import { KeyRound, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/student/edit-profile")({
  head: () => ({ meta: [{ title: "Edit Profile | CodeCampus" }] }),
  component: StudentEditProfile,
});

function StudentEditProfile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "", track: user?.track ?? "" });
  const [profilePicture, setProfilePicture] = useState<string>(user?.profilePicture ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showPwSection, setShowPwSection] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", newPass: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
      const token = (() => { try { const r = localStorage.getItem("excellence_auth"); return r ? (JSON.parse(r) as { token: string }).token : null; } catch { return null; } })();
      const res = await fetch(`${BASE}/api/upload/profile-picture`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Upload failed" })) as { error?: string }; throw new Error(err.error ?? "Upload failed"); }
      const { url } = await res.json() as { url: string };
      setProfilePicture(url);
      toast.success("Photo uploaded");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to upload"); }
    finally { setUploading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    setSaving(true);
    try {
      const res = await api.put<{ user: AuthUser }>("/auth/profile", { name: form.name, email: form.email, profilePicture: profilePicture || null });
      updateUser(res.user);
      toast.success("Profile updated successfully");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwForm.current) { toast.error("Enter your current password"); return; }
    if (!pwForm.newPass) { toast.error("Enter a new password"); return; }
    if (pwForm.newPass.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(pwForm.newPass);
    if (!strong) { toast.error("Must contain uppercase, lowercase, a number, and a symbol"); return; }
    if (pwForm.newPass !== pwForm.confirm) { toast.error("Passwords do not match"); return; }
    if (pwForm.current === pwForm.newPass) { toast.error("New password must be different"); return; }
    setSavingPw(true);
    try {
      await api.post("/auth/change-password", { currentPassword: pwForm.current, newPassword: pwForm.newPass });
      toast.success("Password changed successfully");
      setPwForm({ current: "", newPass: "", confirm: "" });
      setShowPwSection(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to change password"); }
    finally { setSavingPw(false); }
  };

  const initials = form.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <StudentShell title="Edit Profile">
      <div className="max-w-md space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Profile Information</CardTitle></CardHeader>
          <CardContent>
            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="h-20 w-20 rounded-full object-cover border-2 border-brand" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-2xl font-bold">{initials}</div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Click to change photo</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div><Label className="mb-1.5 block">Full Name</Label><Input value={form.name} onChange={(e) => set("name")(e.target.value)} required /></div>
              <div><Label className="mb-1.5 block">Email</Label><Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} required /></div>
              <div>
                <Label className="mb-1.5 block">Track</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">{form.track || "—"}</div>
                <p className="text-xs text-muted-foreground mt-1">Track can only be changed by an admin.</p>
              </div>
              <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90" disabled={saving || uploading}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>

            {/* Change Password */}
            <div className="mt-5 border-t pt-4">
              <button type="button" onClick={() => setShowPwSection((p) => !p)}
                className="w-full flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Change Password</span>
                {showPwSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showPwSection && (
                <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                  <div>
                    <Label className="mb-1.5 block text-sm">Current Password</Label>
                    <div className="relative">
                      <Input type={showCurrent ? "text" : "password"} value={pwForm.current} onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))} required />
                      <button type="button" onClick={() => setShowCurrent((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-sm">New Password</Label>
                    <div className="relative">
                      <Input type={showNew ? "text" : "password"} value={pwForm.newPass} onChange={(e) => setPwForm((p) => ({ ...p, newPass: e.target.value }))} required />
                      <button type="button" onClick={() => setShowNew((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Min 8 chars · uppercase · lowercase · number · symbol</p>
                  </div>
                  <div><Label className="mb-1.5 block text-sm">Confirm New Password</Label><Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} required /></div>
                  <Button type="submit" variant="outline" className="w-full" disabled={savingPw}>
                    {savingPw ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Update Password"}
                  </Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentShell>
  );
}
