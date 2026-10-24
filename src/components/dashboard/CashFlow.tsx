import type { WeekNet } from "@/lib/budget";
import { gbp } from "./format";

const W = 520;
const H = 190;
const PAD_X = 24;
const PAD_TOP = 16;
const PAD_BOTTOM = 8;

/** Smooth path through points (Catmull-Rom converted to cubic Beziers). */
function smooth(pts: [number, number][]): string {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export default function CashFlow({ weeks }: { weeks: WeekNet[] }) {
  const nets = weeks.map((w) => w.net);
  const min = Math.min(0, ...nets);
  const max = Math.max(0, ...nets);
  const span = max - min || 1;
  const y = (v: number) => PAD_TOP + ((max - v) / span) * (H - PAD_TOP - PAD_BOTTOM);
  const x = (i: number) => PAD_X + (i / Math.max(weeks.length - 1, 1)) * (W - PAD_X * 2);

  const pts: [number, number][] = weeks.map((w, i) => [x(i), y(w.net)]);
  const line = smooth(pts);
  const zero = y(0);
  const area = `${line} L ${pts[pts.length - 1][0]} ${zero} L ${pts[0][0]} ${zero} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Net cash flow: ${weeks.map((w) => `${w.label} ${gbp(w.net)}`).join(", ")}`}
      >
        <defs>
          <linearGradient id="cashflow-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PAD_X} x2={W - PAD_X} y1={zero} y2={zero} stroke="var(--border)" strokeWidth={1} />
        <path d={area} fill="url(#cashflow-fill)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth={3} strokeLinecap="round" />
        {weeks.map((w, i) => (
          <circle key={w.label} cx={x(i)} cy={y(w.net)} r={5} fill="var(--accent)" stroke="var(--surface-1)" strokeWidth={2}>
            <title>{`${w.label}: ${gbp(w.net)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between px-1 text-xs text-[var(--text-secondary)]">
        {weeks.map((w) => (
          <span key={w.label}>{w.label}</span>
        ))}
      </div>
    </div>
  );
}
