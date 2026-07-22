import { perfLevel, perfColor, PERF_THRESHOLDS } from "@/lib/tracking";
import { useStore } from "@/lib/store";

export function PerfBadge({ total }: { total: number }) {
  const { settings } = useStore();
  const thresholds = {
    excellent: settings.grade_excellent,
    good: settings.grade_good,
    needs: settings.grade_needs,
  };
  const level = perfLevel(total, thresholds);
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${perfColor(level)}`}>
      {level}
    </span>
  );
}

export function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{ background: color, width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}
