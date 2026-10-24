import type { Advice, AdviceLevel } from "@/lib/advice";

const STYLE: Record<AdviceLevel, { color: string; icon: string; label: string }> = {
  critical: { color: "var(--critical)", icon: "✕", label: "Critical" },
  warning: { color: "var(--serious)", icon: "▲", label: "Warning" },
  info: { color: "var(--series-1)", icon: "i", label: "Tip" },
  good: { color: "var(--good)", icon: "✓", label: "Good" },
};

export default function AdviceCards({ advice }: { advice: Advice[] }) {
  if (advice.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No advice yet. Upload a statement.</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {advice.map((a) => {
        const s = STYLE[a.level];
        return (
          <li
            key={a.title}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4"
            style={{ borderLeft: `4px solid ${s.color}` }}
          >
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <span aria-hidden style={{ color: s.color }}>{s.icon}</span>
              <span className="sr-only">{s.label}: </span>
              {a.title}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">{a.body}</p>
          </li>
        );
      })}
    </ul>
  );
}
