import { z } from "zod";
import { monthKey, summarizeBudget, summarizeByMonth, type BudgetPlan, type BudgetTransaction } from "./budget";

export const chatInput = z.object({
  month: z.string().optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(30),
});

export type ChatMessage = z.infer<typeof chatInput>["messages"][number];

const gbp = (n: number) => `£${n.toFixed(2)}`;
const lines = (record: Record<string, number>) =>
  Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${gbp(v)}`)
    .join(", ") || "none";

const MAX_TXS = 60;

/** Plain-text snapshot of the user's finances, built server-side so the model only sees real data. */
export function buildChatContext(txs: BudgetTransaction[], plan: BudgetPlan, month?: string): string {
  if (txs.length === 0) return "The user has not uploaded any transactions yet.";

  const months = summarizeByMonth(txs);
  const keys = Object.keys(months);
  const focus = month && months[month] ? month : undefined;
  const parts = [
    `Plan: ${Math.round(plan.essential * 100)}% essentials, ${Math.round(plan.wants * 100)}% wants, ${Math.round(plan.savings * 100)}% savings.`,
    `Months with data: ${keys.join(", ")}.`,
  ];

  for (const key of keys) {
    const s = months[key];
    parts.push(
      `Month ${key}: income ${gbp(s.income)}, spend ${gbp(s.expense)}, net ${gbp(s.net)}. ` +
        `By necessity: ${lines(s.byNecessity)}. By category: ${lines(s.byCategory)}.`,
    );
  }

  const total = summarizeBudget(txs);
  parts.push(`All months: income ${gbp(total.income)}, spend ${gbp(total.expense)}, net ${gbp(total.net)}.`);

  const scope = focus ? txs.filter((t) => monthKey(t.date) === focus) : txs;
  const recent = [...scope].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, MAX_TXS);
  parts.push(
    `Latest ${recent.length} transactions${focus ? ` in ${focus}` : ""} (date | type | amount | category | necessity | description):`,
    ...recent.map(
      (t) =>
        `${t.date.toISOString().slice(0, 10)} | ${t.type} | ${gbp(t.amount)} | ${t.category} | ${t.necessity ?? "-"} | ${(t.description ?? "").trim()}`,
    ),
  );
  if (focus) parts.push(`The user is currently viewing ${focus} on the dashboard.`);
  return parts.join("\n");
}
