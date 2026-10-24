import Link from "next/link";
import { Suspense } from "react";
import AppShell from "@/components/dashboard/AppShell";
import { gbp, monthLabel } from "@/components/dashboard/format";
import { summarizeBudget, summarizeByMonth, topMerchants, type MerchantSort } from "@/lib/budget";
import { loadBudgetTransactions } from "@/lib/dashboard-data";

export default function ReportsPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  return (
    <AppShell active="/reports">
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--text-secondary)]">All uploaded statements</p>
            <h1 className="text-3xl font-medium tracking-tight">Reports</h1>
          </div>
          <a
            href="/api/reports/export"
            download
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white"
          >
            Download CSV
          </a>
        </header>
        <Suspense fallback={<p className="text-sm text-[var(--text-secondary)]">Loading...</p>}>
          <Report searchParams={searchParams} />
        </Suspense>
      </div>
    </AppShell>
  );
}

async function Report({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const sortBy: MerchantSort = (await searchParams).sort === "amount" ? "amount" : "count";
  const txs = await loadBudgetTransactions();
  if (txs.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        No transactions yet. <Link href="/" className="underline">Upload a statement</Link>.
      </p>
    );
  }

  const months = Object.entries(summarizeByMonth(txs));
  const all = summarizeBudget(txs);
  const categories = Object.entries(all.byCategory).sort((a, b) => b[1] - a[1]);
  const merchants = topMerchants(txs, 8, sortBy);
  const avgSpend = all.expense / months.length;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
        <Metric label="Total income" value={gbp(all.income)} color="var(--good)" />
        <Metric label="Total spent" value={gbp(all.expense)} />
        <Metric label="Savings rate" value={pct(all.savingsRate)} />
        <Metric label="Average spend / month" value={gbp(avgSpend)} />
      </dl>

      <Card title="Month by month">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm tabular-nums">
            <thead className="text-left text-xs text-[var(--text-secondary)]">
              <tr>
                <th className="pb-3 font-normal">Month</th>
                <th className="pb-3 text-right font-normal">Income</th>
                <th className="pb-3 text-right font-normal">Spent</th>
                <th className="pb-3 text-right font-normal">Net</th>
                <th className="pb-3 text-right font-normal">Saved</th>
                <th className="pb-3 text-right font-normal">Wants</th>
              </tr>
            </thead>
            <tbody>
              {months.map(([key, s]) => (
                <tr key={key} className="border-t border-[var(--border)]">
                  <td className="py-3 font-medium">
                    <Link href={`/dashboard?month=${key}`} className="underline-offset-2 hover:underline">
                      {monthLabel(key)}
                    </Link>
                  </td>
                  <td className="py-3 text-right">{gbp(s.income)}</td>
                  <td className="py-3 text-right">{gbp(s.expense)}</td>
                  <td className="py-3 text-right" style={{ color: s.net >= 0 ? "var(--good)" : "var(--critical)" }}>
                    {gbp(s.net)}
                  </td>
                  <td className="py-3 text-right">{pct(s.savingsRate)}</td>
                  <td className="py-3 text-right">{pct(s.discretionaryShare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          Saved = share of income left over. Wants = share of spending on wants and unnecessary items.
          Totals include every row, like the bank statement. Transfers are left out of the category and
          wants breakdowns.
        </p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Spending by category">
          <ul className="flex flex-col gap-3">
            {categories.map(([name, amount]) => {
              const share = all.expense === 0 ? 0 : amount / all.expense;
              return (
                <li key={name}>
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{name}</span>
                    <span className="tabular-nums">
                      {gbp(amount)} <span className="text-[var(--text-secondary)]">· {pct(share)}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-r bg-[var(--surface-2)]">
                    <div className="h-2 rounded-r" style={{ width: `${share * 100}%`, background: "var(--series-1)" }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Top merchants" action={<SortToggle current={sortBy} />}>
          <ol className="flex flex-col gap-3">
            {merchants.map((m, i) => (
              <li key={m.name} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{m.name}</span>
                  <span className="block text-xs text-[var(--text-secondary)]">
                    {m.count} {m.count === 1 ? "payment" : "payments"}
                  </span>
                </span>
                <span className="tabular-nums">{gbp(m.amount)}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-1)] p-4">
      <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
      <dd className="text-xl font-medium tabular-nums" style={{ color }}>
        {value}
      </dd>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-[var(--surface-1)] p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SortToggle({ current }: { current: MerchantSort }) {
  const options: [MerchantSort, string][] = [["count", "Payments"], ["amount", "Amount"]];
  return (
    <nav aria-label="Sort merchants" className="flex gap-1 rounded-full bg-[var(--surface-2)] p-1 text-xs">
      {options.map(([key, label]) => (
        <Link
          key={key}
          href={`/reports?sort=${key}`}
          scroll={false}
          aria-current={current === key ? "true" : undefined}
          className={`rounded-full px-3 py-1 transition-colors ${
            current === key ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
