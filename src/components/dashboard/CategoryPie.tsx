"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { gbp } from "./format";

// Stable colour per category (slot = entity, never rank). Anything not listed folds into "Other".
const SLOTS = ["rent", "groceries", "eating out", "shopping", "transport", "subscriptions", "entertainment"];

interface Slice {
  name: string;
  amount: number;
  color: string;
  share: number;
}

function toSlices(byCategory: Record<string, number>): Slice[] {
  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  let other = 0;
  const slices: Slice[] = [];
  for (const [name, amount] of Object.entries(byCategory)) {
    const slot = SLOTS.indexOf(name);
    if (slot === -1) other += amount;
    else slices.push({ name, amount, color: `var(--series-${slot + 1})`, share: amount / total });
  }
  slices.sort((a, b) => b.amount - a.amount);
  if (other > 0) slices.push({ name: "Other", amount: other, color: "var(--neutral)", share: other / total });
  return slices;
}

const CX = 100;
const CY = 100;
const R = 90;
const r = 56;

function arc(start: number, end: number): string {
  const p = (radius: number, a: number) =>
    `${CX + radius * Math.cos(a)} ${CY + radius * Math.sin(a)}`;
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${p(R, start)} A ${R} ${R} 0 ${large} 1 ${p(R, end)} L ${p(r, end)} A ${r} ${r} 0 ${large} 0 ${p(r, start)} Z`;
}

export default function CategoryPie({
  byCategory,
  month,
}: {
  byCategory: Record<string, number>;
  /** "YYYY-MM" or "all"; used to open the matching transactions on click. */
  month: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const slices = toSlices(byCategory);
  const total = slices.reduce((a, s) => a + s.amount, 0);

  if (slices.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No spending this month.</p>;
  }

  const paths = slices.map((s, i) => {
    const before = slices.slice(0, i).reduce((sum, p) => sum + p.share, 0);
    const start = -Math.PI / 2 + before * 2 * Math.PI;
    return { ...s, start, end: start + s.share * 2 * Math.PI, index: i };
  });
  const focus = slices.find((s) => s.name === active);
  const topShare = slices[0].share;

  const href = (name: string) =>
    `/transactions?category=${encodeURIComponent(name)}${month === "all" ? "" : `&month=${month}`}`;
  const open = (name: string) => name !== "Other" && router.push(href(name));

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start" onMouseLeave={() => setActive(null)}>
      <svg
        viewBox="0 0 200 200"
        className="h-52 w-52 shrink-0 overflow-visible"
        role="img"
        aria-label={`Spending by category, total ${gbp(total)}`}
      >
        {paths.map((s) => {
          const dimmed = active !== null && active !== s.name;
          const style = {
            transformOrigin: `${CX}px ${CY}px`,
            transform: active === s.name ? "scale(1.06)" : "scale(1)",
            opacity: dimmed ? 0.35 : 1,
            transition: "transform 200ms ease-out, opacity 200ms ease-out",
            cursor: s.name === "Other" ? "default" : "pointer",
          } as const;
          const handlers = {
            onMouseEnter: () => setActive(s.name),
            onClick: () => open(s.name),
          };
          const label = `${s.name}: ${gbp(s.amount)} (${(s.share * 100).toFixed(1)}%)`;
          return (
            // Outer group runs the entrance animation; inner path handles hover.
            <g key={s.name} className="pie-in" style={{ animationDelay: `${s.index * 70}ms`, transformOrigin: `${CX}px ${CY}px` }}>
              {s.share >= 0.9999 ? (
                <path
                  fill={s.color}
                  fillRule="evenodd"
                  style={style}
                  {...handlers}
                  d={`M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX} ${CY + R} A ${R} ${R} 0 1 1 ${CX} ${CY - R} Z M ${CX} ${CY - r} A ${r} ${r} 0 1 0 ${CX} ${CY + r} A ${r} ${r} 0 1 0 ${CX} ${CY - r} Z`}
                >
                  <title>{label}</title>
                </path>
              ) : (
                <path d={arc(s.start, s.end)} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} style={style} {...handlers}>
                  <title>{label}</title>
                </path>
              )}
            </g>
          );
        })}
        <g className="pointer-events-none" textAnchor="middle">
          <text x={CX} y={CY - 8} fontSize="11" fill="var(--text-secondary)" className="capitalize">
            {focus ? focus.name : "Total spent"}
          </text>
          <text x={CX} y={CY + 12} fontSize="18" fontWeight="600" fill="var(--text-primary)">
            {gbp(focus ? focus.amount : total)}
          </text>
          <text x={CX} y={CY + 28} fontSize="10" fill="var(--text-secondary)">
            {focus ? `${(focus.share * 100).toFixed(1)}% of spend` : `${slices.length} categories`}
          </text>
        </g>
      </svg>

      <table className="w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th>Category</th>
            <th>Amount</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>
          {slices.map((s, i) => (
            <tr
              key={s.name}
              onMouseEnter={() => setActive(s.name)}
              onFocus={() => setActive(s.name)}
              onBlur={() => setActive(null)}
              className={`border-b border-[var(--border)] transition-colors duration-200 last:border-0 ${
                active === s.name ? "bg-[var(--accent-soft)]" : ""
              } ${active !== null && active !== s.name ? "opacity-50" : ""}`}
              style={{ transition: "background-color 200ms, opacity 200ms" }}
            >
              <td className="rounded-l-lg py-2 pl-2 pr-3">
                <span
                  className="mr-2 inline-block h-3 w-3 rounded-sm align-middle transition-transform duration-200"
                  style={{ background: s.color, transform: active === s.name ? "scale(1.35)" : "scale(1)" }}
                  aria-hidden
                />
                {s.name === "Other" ? (
                  <span>Other</span>
                ) : (
                  <Link href={href(s.name)} className="capitalize underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
                    {s.name}
                  </Link>
                )}
                <span className="mt-1.5 block h-1 rounded-full bg-[var(--surface-2)]" aria-hidden>
                  <span
                    className="bar-grow block h-1 rounded-full"
                    style={{ width: `${(s.share / topShare) * 100}%`, background: s.color, animationDelay: `${i * 70}ms` }}
                  />
                </span>
              </td>
              <td className="py-2 pr-3 text-right align-top tabular-nums">{gbp(s.amount)}</td>
              <td className="rounded-r-lg py-2 pr-2 text-right align-top tabular-nums text-[var(--text-secondary)]">
                {(s.share * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
