import type { BudgetTransaction } from "@/lib/budget";
import BankBadge from "@/components/BankBadge";
import { gbp } from "./format";

const NECESSITY_COLOR = {
  essential: "var(--accent)",
  want: "var(--serious)",
  unnecessary: "var(--critical)",
} as const;

export default function RecentList({ txs, showDate = false }: { txs: BudgetTransaction[]; showDate?: boolean }) {
  if (txs.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No matching transactions.</p>;
  }
  return (
    <ul className="flex flex-col gap-4">
      {txs.map((t, i) => {
        const name = t.description?.trim() || t.category;
        const income = t.type === "income";
        const color = income ? "var(--good)" : NECESSITY_COLOR[t.necessity ?? "essential"];
        return (
          <li key={`${name}-${t.date.getTime()}-${i}`} className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold"
              style={{ color }}
            >
              {name[0]?.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{name}</span>
              <span className="block truncate text-xs capitalize text-[var(--text-secondary)]">
                {t.category}
                {t.necessity ? ` · ${t.necessity}` : ""}
                {showDate ? ` · ${t.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}` : ""}
              </span>
            </span>
            <BankBadge bank={t.bank} size={18} />
            <span
              className="text-sm font-medium tabular-nums"
              style={{ color: income ? "var(--good)" : "var(--text-primary)" }}
            >
              {income ? "+" : "-"}
              {gbp(t.amount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
