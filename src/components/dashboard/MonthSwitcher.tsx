"use client";

import { useRouter } from "next/navigation";
import { monthLabel } from "./format";

/** Dropdown of every month that has data, plus an "all" option that combines them. */
export default function MonthSwitcher({
  months,
  current,
  q,
}: {
  months: string[];
  current: string;
  q: string;
}) {
  const router = useRouter();
  const href = (month: string) =>
    `/dashboard?month=${month}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="relative inline-block self-start rounded-full bg-[var(--surface-1)] p-1">
      <select
        value={current}
        onChange={(e) => router.push(href(e.target.value))}
        aria-label="Month"
        className="h-8 min-w-44 cursor-pointer appearance-none rounded-full bg-transparent pl-4 pr-9 text-sm font-medium text-[var(--text-primary)] outline-none hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
      >
        <option value="all" className="bg-[var(--surface-1)] text-[var(--text-primary)]">
          All months (total)
        </option>
        {[...months].reverse().map((m) => (
          <option key={m} value={m} className="bg-[var(--surface-1)] text-[var(--text-primary)]">
            {monthLabel(m)}
          </option>
        ))}
      </select>
      <svg
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="none"
        stroke="var(--text-secondary)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
      >
        <path d="m1 1 4 4 4-4" />
      </svg>
    </div>
  );
}
