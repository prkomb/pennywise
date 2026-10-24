import type { PlanLine } from "@/lib/budget";
import { gbp } from "./format";

export default function PlanVsActual({ lines }: { lines: PlanLine[] }) {
  const max = Math.max(...lines.flatMap((l) => [l.planned, Math.max(l.actual, 0)]), 1);
  const width = (n: number) => `${(Math.max(n, 0) / max) * 100}%`;

  return (
    <div className="flex flex-col gap-6">
      {lines.map((l) => (
        <div key={l.key}>
          <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">{l.label}</span>
            <span className={l.ok ? "text-[var(--good)]" : "text-[var(--critical)]"}>
              {l.ok ? "✓ " : "▲ "}
              {l.key === "savings"
                ? l.ok
                  ? `${gbp(l.diff)} above plan`
                  : `${gbp(-l.diff)} short`
                : l.ok
                  ? `${gbp(-l.diff)} under plan`
                  : `${gbp(l.diff)} over plan`}
            </span>
          </div>
          <Bar label="Plan" value={l.planned} width={width(l.planned)} color="var(--neutral)" />
          <Bar
            label="Actual"
            value={l.actual}
            width={width(l.actual)}
            color={l.ok ? "var(--series-1)" : "var(--serious)"}
          />
        </div>
      ))}
    </div>
  );
}

function Bar({ label, value, width, color }: { label: string; value: number; width: string; color: string }) {
  return (
    <div className="mt-1 flex items-center gap-3 text-xs">
      <span className="w-12 shrink-0 text-[var(--text-secondary)]">{label}</span>
      <div className="h-3 flex-1 rounded-r bg-[var(--surface-2)]">
        <div className="h-3 rounded-r" style={{ width, background: color }} />
      </div>
      <span className="w-20 shrink-0 text-right tabular-nums">{gbp(value)}</span>
    </div>
  );
}
