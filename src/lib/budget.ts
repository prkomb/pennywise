import type { Transaction } from "./collections";

export type BudgetTransaction = Pick<
  Transaction,
  "amount" | "type" | "category" | "necessity" | "bank" | "date" | "description"
>;

/** "YYYY-MM" (UTC) for a date. */
export const monthKey = (date: Date) => date.toISOString().slice(0, 7);

export interface BudgetSummary {
  income: number;
  expense: number;
  net: number;
  /** (income - expense) / income, 0 when there is no income. */
  savingsRate: number;
  /** Expense totals per necessity label; rows without a label go to "uncategorized". */
  byNecessity: Record<string, number>;
  /** Like byNecessity/byCategory, transfers are left out of these breakdowns (not of income/expense). */
  byCategory: Record<string, number>;
  byBank: Record<string, number>;
  /** Share of total expense that is "unnecessary" or "want", 0 when no expense. */
  discretionaryShare: number;
  /** Expense totals per category, but only for rows labelled "unnecessary". */
  unnecessaryByCategory: Record<string, number>;
}

// Sum in pence so repeated additions don't drift (0.1 + 0.2 and friends).
const toPence = (amount: number) => Math.round(amount * 100);
const fromPence = (pence: number) => pence / 100;

function add(bucket: Record<string, number>, key: string, pence: number) {
  bucket[key] = (bucket[key] ?? 0) + pence;
}

function finish(bucket: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(bucket).map(([key, pence]) => [key, fromPence(pence)]),
  );
}

export function summarizeBudget(txs: BudgetTransaction[]): BudgetSummary {
  let income = 0;
  let expense = 0;
  let discretionary = 0;
  const byNecessity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byBank: Record<string, number> = {};
  const unnecessaryByCategory: Record<string, number> = {};

  for (const tx of txs) {
    const pence = toPence(tx.amount);
    if (tx.type === "income") {
      income += pence;
      continue;
    }
    expense += pence;
    add(byBank, tx.bank ?? "unknown", pence);
    // Money moved between accounts or people counts in the totals (so they match the
    // bank statement) but is not "spending" on anything, so keep it out of the breakdowns.
    if (tx.category === "transfers") continue;
    const necessity = tx.necessity ?? "uncategorized";
    add(byNecessity, necessity, pence);
    add(byCategory, tx.category, pence);
    if (necessity === "unnecessary") {
      add(unnecessaryByCategory, tx.category, pence);
    }
    if (necessity === "want" || necessity === "unnecessary") {
      discretionary += pence;
    }
  }

  return {
    income: fromPence(income),
    expense: fromPence(expense),
    net: fromPence(income - expense),
    savingsRate: income === 0 ? 0 : (income - expense) / income,
    byNecessity: finish(byNecessity),
    byCategory: finish(byCategory),
    byBank: finish(byBank),
    discretionaryShare: expense === 0 ? 0 : discretionary / expense,
    unnecessaryByCategory: finish(unnecessaryByCategory),
  };
}

/** Summaries keyed by "YYYY-MM" (UTC), in chronological order. */
export function summarizeByMonth(
  txs: BudgetTransaction[],
): Record<string, BudgetSummary> {
  const groups = new Map<string, BudgetTransaction[]>();
  for (const tx of txs) {
    const key = monthKey(tx.date);
    groups.set(key, [...(groups.get(key) ?? []), tx]);
  }
  return Object.fromEntries(
    [...groups.keys()].sort().map((key) => [key, summarizeBudget(groups.get(key)!)]),
  );
}

/** Share of income planned for each bucket. */
export interface BudgetPlan {
  essential: number;
  wants: number;
  savings: number;
}

/** The 50/30/20 rule. */
export const DEFAULT_PLAN: BudgetPlan = { essential: 0.5, wants: 0.3, savings: 0.2 };

export interface PlanLine {
  key: keyof BudgetPlan;
  label: string;
  planned: number;
  actual: number;
  /** actual - planned, in pounds. */
  diff: number;
  /** Spending lines are ok at or under plan; savings is ok at or over plan. */
  ok: boolean;
}

/** Wants = "want" + "unnecessary" spend; savings = income - expense. */
export function planVsActual(
  summary: BudgetSummary,
  plan: BudgetPlan = DEFAULT_PLAN,
): PlanLine[] {
  const round = (n: number) => Math.round(n * 100) / 100;
  const line = (
    key: keyof BudgetPlan,
    label: string,
    actual: number,
    spending: boolean,
  ): PlanLine => {
    const planned = round(summary.income * plan[key]);
    const diff = round(actual - planned);
    return { key, label, planned, actual: round(actual), diff, ok: spending ? diff <= 0 : diff >= 0 };
  };
  return [
    line("essential", "Essentials", summary.byNecessity.essential ?? 0, true),
    line(
      "wants",
      "Wants",
      (summary.byNecessity.want ?? 0) + (summary.byNecessity.unnecessary ?? 0),
      true,
    ),
    line("savings", "Savings", summary.net, false),
  ];
}

export interface WeekNet {
  label: string;
  /** Income minus expense for days 1-7, 8-14, ... of the month. */
  net: number;
}

/** Net cash flow per week of one "YYYY-MM" month, including empty weeks. */
export function weeklyNet(txs: BudgetTransaction[], month: string): WeekNet[] {
  const [y, m] = month.split("-").map(Number);
  const weeks = Math.ceil(new Date(Date.UTC(y, m, 0)).getUTCDate() / 7);
  const pence = Array<number>(weeks).fill(0);
  for (const tx of txs) {
    if (monthKey(tx.date) !== month) continue;
    const week = Math.floor((tx.date.getUTCDate() - 1) / 7);
    pence[week] += (tx.type === "income" ? 1 : -1) * toPence(tx.amount);
  }
  return pence.map((p, i) => ({ label: `Wk ${i + 1}`, net: fromPence(p) }));
}

export interface EmergencyFund {
  /** Average monthly essential spend the fund has to cover. */
  monthlyEssential: number;
  targetMonths: number;
  target: number;
  current: number;
  monthsCovered: number;
  ok: boolean;
}

/** Emergency fund = cash saved so far vs `targetMonths` of essential spend. */
export function emergencyFund(
  saved: number,
  monthlyEssential: number,
  targetMonths = 3,
): EmergencyFund {
  const round = (n: number) => Math.round(n * 100) / 100;
  const current = Math.max(saved, 0);
  const target = round(monthlyEssential * targetMonths);
  return {
    monthlyEssential: round(monthlyEssential),
    targetMonths,
    target,
    current: round(current),
    monthsCovered: monthlyEssential > 0 ? Math.round((current / monthlyEssential) * 10) / 10 : 0,
    ok: current >= target,
  };
}

export interface WhatIf {
  /** Monthly amount freed up by the cut. */
  saved: number;
  expense: number;
  net: number;
  savingsRate: number;
}

/** Cut `percent` (0-100) of one category's spend and recompute the totals. */
export function whatIfCut(summary: BudgetSummary, category: string, percent: number): WhatIf {
  const pct = Math.min(Math.max(percent, 0), 100);
  const saved = Math.round(((summary.byCategory[category] ?? 0) * pct)) / 100;
  const expense = Math.round((summary.expense - saved) * 100) / 100;
  const net = Math.round((summary.net + saved) * 100) / 100;
  return {
    saved,
    expense,
    net,
    savingsRate: summary.income === 0 ? 0 : net / summary.income,
  };
}

export interface MerchantTotal {
  name: string;
  amount: number;
  count: number;
}

export type MerchantSort = "count" | "amount";

/** Payees per description (case-insensitive), expenses only. By count (default) or by total spend; the other breaks ties. */
export function topMerchants(txs: BudgetTransaction[], limit = 8, sortBy: MerchantSort = "count"): MerchantTotal[] {
  const groups = new Map<string, { name: string; pence: number; count: number }>();
  for (const tx of txs) {
    if (tx.type !== "expense") continue;
    const name = tx.description?.trim() || tx.category;
    const key = name.toLowerCase();
    const group = groups.get(key) ?? { name, pence: 0, count: 0 };
    group.pence += toPence(tx.amount);
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort((a, b) =>
      sortBy === "count" ? b.count - a.count || b.pence - a.pence : b.pence - a.pence || b.count - a.count,
    )
    .slice(0, limit)
    .map((g) => ({ name: g.name, amount: fromPence(g.pence), count: g.count }));
}
