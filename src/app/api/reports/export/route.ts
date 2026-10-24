import { summarizeByMonth } from "@/lib/budget";
import { loadBudgetTransactions } from "@/lib/dashboard-data";

/** Monthly summary as CSV. */
export async function GET() {
  const months = summarizeByMonth(await loadBudgetTransactions());
  const lines = [
    "Month,Income,Spent,Net,Savings rate %,Essential,Wants,Unnecessary",
    ...Object.entries(months).map(([month, s]) =>
      [
        month,
        s.income.toFixed(2),
        s.expense.toFixed(2),
        s.net.toFixed(2),
        (s.savingsRate * 100).toFixed(1),
        (s.byNecessity.essential ?? 0).toFixed(2),
        (s.byNecessity.want ?? 0).toFixed(2),
        (s.byNecessity.unnecessary ?? 0).toFixed(2),
      ].join(","),
    ),
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pennywise-report.csv"',
    },
  });
}
