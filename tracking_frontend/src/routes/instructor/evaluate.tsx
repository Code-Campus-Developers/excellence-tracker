import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Save, AlertCircle, ChevronsUpDown, UserPlus } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { PerfBadge, Avatar } from "@/components/PerfBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CATEGORIES, TOTAL_WEEKS, MAX_TOTAL, TRACKS,
  emptyScores, sumScores, nextAvatarColor, type CategoryKey, type Scores,
} from "@/lib/tracking";
import { useStore, getCurrentWeek } from "@/lib/store";
import { useAuth } from "@/lib/authStore";

export const Route = createFileRoute("/instructor/evaluate")({
  head: () => ({
    meta: [{ title: "New Weekly Evaluation | CodeCampus" }],
  }),
  component: Evaluate,
});

function Evaluate() {
  const navigate = useNavigate();
  const { addEvaluation, evaluations, students, addStudent, settings } = useStore();
  const { user } = useAuth();
  const currentWeek = getCurrentWeek(settings);
  const [studentId, setStudentId] = useState<string>("");
  const [week, setWeek] = useState<number>(() => getCurrentWeek(settings));
  const [scores, setScores] = useState<Scores>(emptyScores());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [comboOpen, setComboOpen] = useState(false);
  const [comboSearch, setComboSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTrack, setNewTrack] = useState<string>("");

  const total = useMemo(() => sumScores(scores), [scores]);
  const student = students.find((s) => s.id === studentId);

  const alreadyEvaluated = studentId
    ? evaluations.some((e) => e.studentId === studentId && e.week === week)
    : false;

  const setScore = (key: CategoryKey, raw: string, max: number) => {
    const n = raw === "" ? 0 : Number(raw);
    if (Number.isNaN(n)) return;
    setScores((prev) => ({ ...prev, [key]: Math.max(0, Math.min(max, n)) }));
  };

  const openCreate = (prefill: string) => {
    setNewName(prefill);
    setNewEmail("");
    setNewTrack("");
    setComboOpen(false);
    setCreateOpen(true);
  };

  const handleCreateStudent = async () => {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    if (!newTrack) { toast.error("Please select a track"); return; }
    setSaving(true);
    try {
      const created = await addStudent({
        id: `s_${Date.now()}`,
        name: newName.trim(),
        email: newEmail.trim() || `${newName.trim().toLowerCase().replace(/\s+/g, ".")}@codecampus.ng`,
        track: newTrack,
        avatarColor: nextAvatarColor(),
        studentCode: "",
        userId: null,
      });
      setStudentId(created.id);
      setCreateOpen(false);
      toast.success(`${created.name} added as a new student`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create student");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!studentId) { toast.error("Please select a student"); return; }
    if (alreadyEvaluated) {
      toast.error(`${student?.name} already has an evaluation for Week ${week}`);
      return;
    }
    setSaving(true);
    try {
      await addEvaluation({
        id: `e_${Date.now()}`,
        studentId,
        week,
        evaluator: user?.name ?? "Instructor",
        scores,
        total,
        notes,
        createdAt: new Date().toISOString(),
      });
      toast.success(`Evaluation saved | ${student?.name} scored ${total}/${MAX_TOTAL} in Week ${week}`);
      setTimeout(() => navigate({ to: "/instructor/students/$id", params: { id: studentId } }), 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save evaluation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="New Weekly Evaluation"
        subtitle="Score each category, the total updates automatically."
      />

      {/* Create Student Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">Full Name</Label>
              <Input
                placeholder="e.g. Amara Obi"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Email <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="auto-generated if blank"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Track</Label>
              <Select value={newTrack} onValueChange={setNewTrack}>
                <SelectTrigger>
                  <SelectValue placeholder="Select track" />
                </SelectTrigger>
                <SelectContent>
                  {TRACKS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateStudent} disabled={saving}
              className="bg-brand text-brand-foreground hover:bg-brand/90">
              <UserPlus className="h-4 w-4" />
              {saving ? "Adding..." : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evaluation Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Student</Label>
                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboOpen}
                      className="w-full justify-between font-normal"
                    >
                      {student ? `${student.name} · ${student.track}` : "Select or create student…"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search by name or track…"
                        value={comboSearch}
                        onValueChange={setComboSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-brand hover:bg-muted"
                            onClick={() => openCreate(comboSearch)}
                          >
                            <UserPlus className="h-4 w-4" />
                            Create "{comboSearch}"
                          </button>
                        </CommandEmpty>
                        <CommandGroup heading="Students">
                          {students.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={`${s.name} ${s.track}`}
                              onSelect={() => {
                                setStudentId(s.id);
                                setComboOpen(false);
                                setComboSearch("");
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${studentId === s.id ? "opacity-100" : "opacity-0"}`}
                              />
                              {s.name} · {s.track}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {comboSearch.trim() && (
                          <CommandGroup heading="Add new">
                            <CommandItem
                              value={`__create__${comboSearch}`}
                              onSelect={() => openCreate(comboSearch)}
                            >
                              <UserPlus className="mr-2 h-4 w-4 text-brand" />
                              Add "{comboSearch}" as new student
                            </CommandItem>
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="mb-1.5 block">Bootcamp Week</Label>
                <Select value={String(week)} onValueChange={(v) => setWeek(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((w) => (
                      <SelectItem key={w} value={String(w)}>
                        Week {w}
                        {w === currentWeek ? " (current)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category Scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {CATEGORIES.map((c) => {
                const val = scores[c.key];
                const pct = (val / c.max) * 100;
                return (
                  <div key={c.key} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="font-semibold">{c.label}</div>
                        <ul className="mt-1.5 space-y-0.5">
                          {c.breakdown.map((b) => (
                            <li
                              key={b.label}
                              className="text-xs text-muted-foreground flex items-center gap-1.5"
                            >
                              <Check className="h-3 w-3 text-brand" />
                              {b.label}
                              <span className="ml-auto font-medium">{b.points} pts</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Input
                          type="number"
                          min={0}
                          max={c.max}
                          value={val}
                          onChange={(e) => setScore(c.key, e.target.value, c.max)}
                          className="w-20 text-center font-semibold"
                        />
                        <span className="text-sm text-muted-foreground font-medium">
                          / {c.max}
                        </span>
                      </div>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes & Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write feedback, observations, and next-week goals..."
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <div className="sticky top-24 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Live Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {student ? (
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={student.name} color={student.avatarColor} size={44} />
                    <div>
                      <div className="font-semibold">{student.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {student.track} · Week {week}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-3 rounded-lg bg-muted">
                    <AlertCircle className="h-4 w-4" />
                    Select a student to begin
                  </div>
                )}

                <div className="text-center py-6 border-y">
                  <div className="text-5xl font-bold text-brand">{total}</div>
                  <div className="text-sm text-muted-foreground mt-1">out of {MAX_TOTAL}</div>
                  <div className="mt-3">
                    <PerfBadge total={total} />
                  </div>
                </div>

                <div className="space-y-2 mt-4 text-sm">
                  {CATEGORIES.map((c) => (
                    <div key={c.key} className="flex justify-between">
                      <span className="text-muted-foreground truncate mr-2">{c.short}</span>
                      <span className="font-medium tabular-nums">
                        {scores[c.key]}/{c.max}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t font-bold">
                    <span>TOTAL</span>
                    <span className="tabular-nums">
                      {total}/{MAX_TOTAL}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={alreadyEvaluated || saving}
                  className="w-full mt-5 bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-60"
                  size="lg"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : alreadyEvaluated ? "Already Evaluated" : "Save Evaluation"}
                </Button>
                {alreadyEvaluated && (
                  <div className="flex items-center gap-2 text-xs text-destructive mt-2">
                    <AlertCircle className="h-3 w-3" />
                    This student already has a Week {week} evaluation.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
