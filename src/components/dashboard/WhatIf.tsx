"use client";

import { useState } from "react";
import { whatIfCut, type BudgetSummary } from "@/lib/budget";
import { gbp } from "./format";

type Props = Pick<BudgetSummary, "income" | "expense" | "net" | "byCategory"> & {
  discretionary: string[];
};

export default function WhatIf({ discretionary, ...totals }: Props) {
  const categories = Object.entries(totals.byCategory)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
  const [category, setCategory] = useState(
    categories.find((c) => discretionary.includes(c)) ?? categories[0] ?? "",
  );
  const [percent, setPercent] = useState(30);

  if (categories.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No spending to adjust.</p>;
  }

  const summary = { ...totals, savingsRate: 0, byNecessity: {}, byBank: {}, discretionaryShare: 0, unnecessaryByCategory: {} };
  const result = whatIfCut(summary, category, percent);
  const before = totals.income === 0 ? 0 : totals.net / totals.income;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label htmlFor="whatif-category">Cut</label>
        <select
          id="whatif-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md bg-[var(--surface-2)] px-3 py-1.5 capitalize"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c} ({gbp(totals.byCategory[c])})
            </option>
          ))}
        </select>
        <label htmlFor="whatif-percent" className="tabular-nums">
          by {percent}%
        </label>
        <input
          id="whatif-percent"
          type="range"
          min={0}
          max={100}
          step={5}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className="min-w-40 flex-1"
        />
      </div>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <Metric label="You save" value={gbp(result.saved)} />
        <Metric label="New spend" value={gbp(result.expense)} sub={`was ${gbp(totals.expense)}`} />
        <Metric
          label="Savings rate"
          value={`${(result.savingsRate * 100).toFixed(1)}%`}
          sub={`was ${(before * 100).toFixed(1)}%`}
        />
      </dl>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-2)] p-3">
      <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
      <dd className="text-lg font-medium tabular-nums">{value}</dd>
      {sub && <dd className="text-xs text-[var(--text-secondary)]">{sub}</dd>}
    </div>
  );
}
