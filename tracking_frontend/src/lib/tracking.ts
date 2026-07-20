export type CategoryKey =
  | "attendance"
  | "linkedin"
  | "project"
  | "coding"
  | "teamwork"
  | "learning"
  | "housekeeping";

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  short: string;
  max: number;
  breakdown: { label: string; points: number }[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    key: "attendance",
    label: "Attendance & Participation",
    short: "Attendance",
    max: 25,
    breakdown: [
      { label: "Attend classes", points: 10 },
      { label: "Be on time", points: 10 },
      { label: "Active participation", points: 5 },
    ],
  },
  {
    key: "linkedin",
    label: "LinkedIn & X Visibility",
    short: "LinkedIn & X",
    max: 10,
    breakdown: [
      { label: "Post ≥2×/week & tag @codecampusng", points: 5 },
      { label: "Engage with classmates", points: 5 },
    ],
  },
  {
    key: "project",
    label: "Project Milestone",
    short: "Project",
    max: 20,
    breakdown: [
      { label: "Complete weekly tasks", points: 10 },
      { label: "Submit project on time", points: 5 },
      { label: "Update README / write-up", points: 5 },
    ],
  },
  {
    key: "coding",
    label: "Coding Practice",
    short: "Coding",
    max: 20,
    breakdown: [
      { label: "Code ≥5 days/week", points: 10 },
      { label: "≥3 GitHub commits", points: 10 },
    ],
  },
  {
    key: "teamwork",
    label: "Collaboration & Teamwork",
    short: "Teamwork",
    max: 10,
    breakdown: [
      { label: "Attend monthly events", points: 5 },
      { label: "Support teammates", points: 5 },
    ],
  },
  {
    key: "learning",
    label: "Learning Logs",
    short: "Learning",
    max: 10,
    breakdown: [{ label: "Complete weekly reflection", points: 10 }],
  },
  {
    key: "housekeeping",
    label: "Bootcamp Housekeeping",
    short: "Housekeeping",
    max: 5,
    breakdown: [{ label: "Complete readings/videos", points: 5 }],
  },
];

export const MAX_TOTAL = CATEGORIES.reduce((s, c) => s + c.max, 0);

export type Scores = Record<CategoryKey, number>;

export const emptyScores = (): Scores =>
  CATEGORIES.reduce((acc, c) => ({ ...acc, [c.key]: 0 }), {} as Scores);

export const sumScores = (s: Scores) =>
  CATEGORIES.reduce((acc, c) => acc + (s[c.key] || 0), 0);

export interface Student {
  id: string;
  name: string;
  email: string;
  track: string;
  avatarColor: string;
}

export interface Evaluation {
  id: string;
  studentId: string;
  week: number;
  evaluator: string;
  scores: Scores;
  total: number;
  notes: string;
  createdAt: string;
}

export const PERF_THRESHOLDS = {
  excellent: 85,
  good: 70,
  needs: 50,
};

export type PerfLevel = "Excellent" | "Good" | "Needs Improvement" | "Poor";

export function perfLevel(total: number): PerfLevel {
  if (total >= PERF_THRESHOLDS.excellent) return "Excellent";
  if (total >= PERF_THRESHOLDS.good) return "Good";
  if (total >= PERF_THRESHOLDS.needs) return "Needs Improvement";
  return "Poor";
}

export function perfColor(level: PerfLevel): string {
  switch (level) {
    case "Excellent":
      return "text-[color:var(--success)] bg-[color:var(--brand-soft)]";
    case "Good":
      return "text-[color:var(--brand)] bg-[color:var(--brand-soft)]";
    case "Needs Improvement":
      return "text-[color:var(--warning)] bg-[oklch(0.97_0.05_85)]";
    case "Poor":
      return "text-[color:var(--danger)] bg-[oklch(0.97_0.05_25)]";
  }
}

// ---------- Mock data ----------

export const STUDENTS: Student[] = [
  { id: "s1", name: "John Doe", email: "john@codecampus.ng", track: "Frontend", avatarColor: "#16a34a" },
  { id: "s2", name: "Aisha Bello", email: "aisha@codecampus.ng", track: "Backend", avatarColor: "#059669" },
  { id: "s3", name: "Chinedu Okafor", email: "chinedu@codecampus.ng", track: "Fullstack", avatarColor: "#15803d" },
  { id: "s4", name: "Fatima Yusuf", email: "fatima@codecampus.ng", track: "Frontend", avatarColor: "#22c55e" },
  { id: "s5", name: "Emeka Nwosu", email: "emeka@codecampus.ng", track: "Data", avatarColor: "#10b981" },
  { id: "s6", name: "Zara Ibrahim", email: "zara@codecampus.ng", track: "Backend", avatarColor: "#166534" },
  { id: "s7", name: "Tunde Adeyemi", email: "tunde@codecampus.ng", track: "Fullstack", avatarColor: "#4ade80" },
  { id: "s8", name: "Ngozi Eze", email: "ngozi@codecampus.ng", track: "Frontend", avatarColor: "#65a30d" },
];

export const CURRENT_WEEK = 4;
export const TOTAL_WEEKS = 16;
export const TRACKS = ["Frontend", "Backend", "Fullstack", "Data"] as const;
export type Track = (typeof TRACKS)[number];

const AVATAR_COLORS = [
  "#16a34a", "#059669", "#15803d", "#22c55e", "#10b981",
  "#166534", "#4ade80", "#65a30d", "#0d9488", "#0891b2",
  "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#dc2626",
];
let colorIdx = 0;
export const nextAvatarColor = () => AVATAR_COLORS[colorIdx++ % AVATAR_COLORS.length];

function mkScores(vals: number[]): Scores {
  const s = emptyScores();
  CATEGORIES.forEach((c, i) => (s[c.key] = Math.min(vals[i] ?? 0, c.max)));
  return s;
}

let idc = 1;
const mkEval = (studentId: string, week: number, vals: number[], notes = ""): Evaluation => {
  const scores = mkScores(vals);
  return {
    id: `e${idc++}`,
    studentId,
    week,
    evaluator: "Mentor Sarah",
    scores,
    total: sumScores(scores),
    notes,
    createdAt: new Date(2026, 0, week * 7).toISOString(),
  };
};

export const EVALUATIONS: Evaluation[] = [
  mkEval("s1", 1, [22, 8, 18, 18, 9, 10, 5], "Strong start."),
  mkEval("s1", 2, [24, 9, 19, 20, 10, 10, 5], "Excellent commits."),
  mkEval("s1", 3, [20, 6, 16, 15, 8, 8, 4], "Missed one class."),
  mkEval("s1", 4, [25, 10, 20, 20, 10, 10, 5], "Perfect week!"),

  mkEval("s2", 1, [20, 7, 15, 16, 8, 8, 4]),
  mkEval("s2", 2, [22, 8, 17, 18, 9, 9, 5]),
  mkEval("s2", 3, [23, 9, 18, 19, 9, 10, 5]),
  mkEval("s2", 4, [24, 9, 19, 20, 10, 10, 5]),

  mkEval("s3", 1, [18, 5, 14, 14, 7, 7, 3]),
  mkEval("s3", 2, [17, 6, 15, 13, 7, 8, 4]),
  mkEval("s3", 3, [19, 7, 16, 15, 8, 8, 4]),
  mkEval("s3", 4, [20, 8, 17, 17, 9, 9, 5]),

  mkEval("s4", 1, [23, 9, 18, 18, 9, 9, 5]),
  mkEval("s4", 2, [24, 10, 19, 19, 10, 10, 5]),
  mkEval("s4", 3, [22, 8, 17, 18, 9, 9, 5]),
  mkEval("s4", 4, [23, 9, 18, 19, 9, 10, 5]),

  mkEval("s5", 1, [15, 4, 12, 12, 6, 6, 3]),
  mkEval("s5", 2, [14, 3, 11, 10, 5, 6, 2]),
  mkEval("s5", 3, [16, 5, 13, 13, 6, 7, 3]),
  mkEval("s5", 4, [18, 6, 14, 14, 7, 8, 4]),

  mkEval("s6", 3, [21, 8, 17, 17, 9, 9, 5]),
  mkEval("s6", 4, [22, 9, 18, 18, 9, 10, 5]),

  mkEval("s7", 2, [19, 6, 15, 15, 8, 8, 4]),
  mkEval("s7", 3, [20, 7, 16, 16, 8, 9, 4]),
  mkEval("s7", 4, [21, 8, 17, 17, 9, 9, 5]),

  mkEval("s8", 4, [12, 3, 10, 9, 5, 5, 2], "Needs support."),
];

export function studentEvals(studentId: string, evalsArr: Evaluation[] = EVALUATIONS) {
  return evalsArr.filter((e) => e.studentId === studentId).sort((a, b) => a.week - b.week);
}
export function weekEvals(week: number, evalsArr: Evaluation[] = EVALUATIONS) {
  return evalsArr.filter((e) => e.week === week);
}
export function studentStats(studentId: string, evalsArr: Evaluation[] = EVALUATIONS) {
  const evs = studentEvals(studentId, evalsArr);
  if (!evs.length) return { avg: 0, high: 0, low: 0, count: 0, trend: 0 };
  const totals = evs.map((e) => e.total);
  const avg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
  const high = Math.max(...totals);
  const low = Math.min(...totals);
  const trend = totals.length > 1 ? totals[totals.length - 1] - totals[totals.length - 2] : 0;
  return { avg, high, low, count: totals.length, trend };
}
