import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Camera, Loader2, KeyRound, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth, type AuthUser } from "@/lib/authStore";
import { TRACKS } from "@/lib/tracking";

export const Route = createFileRoute("/edit-profile")({
  head: () => ({ meta: [{ title: "Edit Profile | CodeCampus" }] }),
  component: EditProfile,
});

function EditProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    track: user?.track ?? "",
  });
  const [profilePicture, setProfilePicture] = useState<string>(user?.profilePicture ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Change password state
  const [showPwSection, setShowPwSection] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", newPass: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("excellence_auth");
    if (!raw) { navigate({ to: "/login" }); return; }
  }, []);

  const backTo = user?.role === "ADMIN" ? "/admin" : user?.role === "MENTOR" ? "/instructor" : "/student";

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleImageClick = () => fileInputRef.current?.click();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      // Send to our backend | backend signs and uploads to Cloudinary
      const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
      const token = (() => { try { const r = localStorage.getItem("excellence_auth"); return r ? (JSON.parse(r) as { token: string }).token : null; } catch { return null; } })();
      const res = await fetch(`${BASE}/api/upload/profile-picture`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" })) as { error?: string };
        throw new Error(err.error ?? "Upload failed");
      }
      const { url } = await res.json() as { url: string };
      setProfilePicture(url);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    setSaving(true);
    try {
      const res = await api.put<{ user: AuthUser }>("/auth/profile", {
        name: form.name,
        email: form.email,
        track: form.track || null,
        profilePicture: profilePicture || null,
      });
      updateUser(res.user);
      toast.success("Profile updated successfully");
      setTimeout(() => navigate({ to: backTo }), 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const initials = form.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwForm.current) { toast.error("Enter your current password"); return; }
    if (!pwForm.newPass) { toast.error("Enter a new password"); return; }
    if (pwForm.newPass.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(pwForm.newPass);
    if (!strong) { toast.error("Must contain uppercase, lowercase, a number, and a symbol"); return; }
    if (pwForm.newPass !== pwForm.confirm) { toast.error("Passwords do not match"); return; }
    if (pwForm.current === pwForm.newPass) { toast.error("New password must be different from current"); return; }
    setSavingPw(true);
    try {
      await api.post("/auth/change-password", { currentPassword: pwForm.current, newPassword: pwForm.newPass });
      toast.success("Password changed successfully");
      setPwForm({ current: "", newPass: "", confirm: "" });
      setShowPwSection(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img src="/image-1785130765553.png" alt="Code Campus" className="h-16 w-auto" style={{ mixBlendMode: "multiply" }} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Profile Picture */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative cursor-pointer group" onClick={handleImageClick}>
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="h-20 w-20 rounded-full object-cover border-2 border-brand"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-2xl font-bold">
                    {initials}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Click to change photo</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label className="mb-1.5 block">Full Name</Label>
                <Input value={form.name} onChange={(e) => set("name")(e.target.value)} required />
              </div>
              <div>
                <Label className="mb-1.5 block">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} required />
              </div>
              {(user?.role === "MENTOR" || user?.role === "STUDENT") && (
                <div>
                  <Label className="mb-1.5 block">Track / Specialty</Label>
                  <Select value={form.track} onValueChange={set("track")}>
                    <SelectTrigger><SelectValue placeholder="Select track" /></SelectTrigger>
                    <SelectContent>
                      {TRACKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={saving || uploading}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>

            {/* Change Password */}
            <div className="mt-5 border-t pt-4">
              <button
                type="button"
                onClick={() => setShowPwSection((p) => !p)}
                className="w-full flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" /> Change Password
                </span>
                {showPwSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showPwSection && (
                <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                  <div>
                    <Label className="mb-1.5 block text-sm">Current Password</Label>
                    <div className="relative">
                      <Input
                        type={showCurrent ? "text" : "password"}
                        value={pwForm.current}
                        onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                        required
                      />
                      <button type="button" onClick={() => setShowCurrent((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-sm">New Password</Label>
                    <div className="relative">
                      <Input
                        type={showNew ? "text" : "password"}
                        value={pwForm.newPass}
                        onChange={(e) => setPwForm((p) => ({ ...p, newPass: e.target.value }))}
                        required
                      />
                      <button type="button" onClick={() => setShowNew((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Min 8 chars · uppercase · lowercase · number · symbol
                    </p>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-sm">Confirm New Password</Label>
                    <Input
                      type="password"
                      value={pwForm.confirm}
                      onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" variant="outline" className="w-full" disabled={savingPw}>
                    {savingPw ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Update Password"}
                  </Button>
                </form>
              )}
            </div>

            <div className="mt-4 text-center">
              <Link to={backTo} className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
