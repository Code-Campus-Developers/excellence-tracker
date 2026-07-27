import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Evaluation, type Student, PERF_THRESHOLDS, TOTAL_WEEKS, TRACKS } from "./tracking";
import { api } from "./api";

export interface AppSettings {
  grade_excellent: number;
  grade_good: number;
  grade_needs: number;
  total_weeks: number;
  track_weeks: Record<string, number>;
  cohort_name: string;
  cohort_start_date: string;
  current_week_override: number | null;
}

/** Returns the current bootcamp week.
 *  Uses manual override if set, otherwise auto-calculates from cohort_start_date.
 *  Safe for SSR | returns 1 on server, re-calculates on client.
 */
export function getCurrentWeek(settings: AppSettings): number {
  if (settings.current_week_override && settings.current_week_override > 0) {
    return Math.min(settings.current_week_override, settings.total_weeks);
  }
  if (settings.cohort_start_date && typeof window !== "undefined") {
    const start = new Date(settings.cohort_start_date);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    if (diffMs < 0) return 1;
    const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    return Math.max(1, Math.min(week, settings.total_weeks));
  }
  return 1;
}

const DEFAULT_SETTINGS: AppSettings = {
  grade_excellent: PERF_THRESHOLDS.excellent,
  grade_good: PERF_THRESHOLDS.good,
  grade_needs: PERF_THRESHOLDS.needs,
  total_weeks: TOTAL_WEEKS,
  track_weeks: Object.fromEntries(TRACKS.map((t) => [t, 4])),
  cohort_name: "Cohort 1",
  cohort_start_date: "",
  current_week_override: null,
};

interface Store {
  evaluations: Evaluation[];
  students: Student[];
  settings: AppSettings;
  isLoading: boolean;
  addEvaluation: (e: Evaluation) => Promise<void>;
  addStudent: (s: Omit<Student, "createdAt">) => Promise<Student>;
  updateSettings: (s: AppSettings) => void;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const [s, e, raw] = await Promise.all([
        api.get<Student[]>("/api/students"),
        api.get<Evaluation[]>("/api/evaluations"),
        api.get<Record<string, string>>("/api/settings"),
      ]);
      setStudents(s ?? []);
      setEvaluations(e ?? []);
      if (raw) {
        setSettings({
          grade_excellent: Number(raw.grade_excellent ?? DEFAULT_SETTINGS.grade_excellent),
          grade_good: Number(raw.grade_good ?? DEFAULT_SETTINGS.grade_good),
          grade_needs: Number(raw.grade_needs ?? DEFAULT_SETTINGS.grade_needs),
          total_weeks: Number(raw.total_weeks ?? DEFAULT_SETTINGS.total_weeks),
          track_weeks: raw.track_weeks ? JSON.parse(raw.track_weeks) : DEFAULT_SETTINGS.track_weeks,
          cohort_name: raw.cohort_name ?? DEFAULT_SETTINGS.cohort_name,
          cohort_start_date: raw.cohort_start_date ?? DEFAULT_SETTINGS.cohort_start_date,
          current_week_override: raw.current_week_override ? Number(raw.current_week_override) : null,
        });
      }
    } catch (err) {
      console.error("Failed to load data from API:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const addEvaluation = async (e: Evaluation) => {
    const created = await api.post<Evaluation>("/api/evaluations", {
      id: e.id, studentId: e.studentId, week: e.week,
      evaluator: e.evaluator, scores: e.scores, total: e.total, notes: e.notes,
    });
    setEvaluations((prev) => [...prev, created]);
  };

  const addStudent = async (s: Omit<Student, "createdAt">) => {
    const created = await api.post<Student>("/api/students", {
      id: s.id, name: s.name, email: s.email, track: s.track, avatarColor: s.avatarColor,
    });
    setStudents((prev) => [...prev, created]);
    return created;
  };

  const updateSettings = (s: AppSettings) => setSettings(s);

  return (
    <StoreContext.Provider value={{ evaluations, students, settings, isLoading, addEvaluation, addStudent, updateSettings, refresh }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
