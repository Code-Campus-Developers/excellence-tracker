import { useStore } from "@/lib/store";

export function GradingScale({ compact = false }: { compact?: boolean }) {
  const { settings } = useStore();

  const LEVELS = [
    { label: "Excellent", range: `${settings.grade_excellent} – 100`, color: "bg-green-100 text-green-700 border-green-200" },
    { label: "Good", range: `${settings.grade_good} – ${settings.grade_excellent - 1}`, color: "bg-blue-100 text-blue-700 border-blue-200" },
    { label: "Needs Improvement", range: `${settings.grade_needs} – ${settings.grade_good - 1}`, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    { label: "Poor", range: `0 – ${settings.grade_needs - 1}`, color: "bg-red-100 text-red-700 border-red-200" },
  ];
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <span key={l.label} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${l.color}`}>
            {l.label}: {l.range} pts
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {LEVELS.map((l) => (
        <div key={l.label} className={`rounded-xl border p-4 text-center ${l.color}`}>
          <div className="font-bold text-base">{l.label}</div>
          <div className="text-sm mt-1 opacity-80">{l.range} pts</div>
        </div>
      ))}
    </div>
  );
}
