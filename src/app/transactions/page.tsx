import { ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import BankBadge from "@/components/BankBadge";
import AppShell from "@/components/dashboard/AppShell";
import { gbp, monthLabel } from "@/components/dashboard/format";
import { monthKey } from "@/lib/budget";
import { loadAllTransactions } from "@/lib/dashboard-data";

const PAGE_SIZE = 25;
const CONTROL =
  "h-10 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] outline-none transition-colors hover:border-[var(--accent)] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]";
const NECESSITIES = ["essential", "want", "unnecessary"];

type Params = { q?: string; month?: string; category?: string; necessity?: string; type?: string; page?: string };

export default function TransactionsPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <AppShell active="/transactions">
      <div className="flex flex-col gap-6">
        <header>
          <p className="text-xs text-[var(--text-secondary)]">Every row from every statement</p>
          <h1 className="text-3xl font-medium tracking-tight">Transactions</h1>
        </header>
        <Suspense fallback={<p className="text-sm text-[var(--text-secondary)]">Loading...</p>}>
          <Content searchParams={searchParams} />
        </Suspense>
      </div>
    </AppShell>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const all = await loadAllTransactions();

  if (all.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        No transactions yet. <Link href="/" className="underline">Upload a statement</Link>.
      </p>
    );
  }

  const months = [...new Set(all.map((t) => monthKey(t.date)))].sort().reverse();
  const categories = [...new Set(all.map((t) => t.category))].sort();
  const needle = (p.q ?? "").trim().toLowerCase();

  const rows = all.filter(
    (t) =>
      (!p.month || monthKey(t.date) === p.month) &&
      (!p.category || t.category === p.category) &&
      (!p.necessity || t.necessity === p.necessity) &&
      (!p.type || t.type === p.type) &&
      (!needle ||
        [t.description, t.category, t.necessity, t.bank, t.amount.toFixed(2)].some((f) =>
          (f ?? "").toLowerCase().includes(needle),
        )),
  );

  const total = (type: "expense" | "income") =>
    rows.filter((t) => t.type === type).reduce((s, t) => s + Math.round(t.amount * 100), 0) / 100;
  const spent = total("expense");
  const incoming = total("income");

  const pages = Math.max(Math.ceil(rows.length / PAGE_SIZE), 1);
  const page = Math.min(Math.max(Number(p.page) || 1, 1), pages);
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const href = (nextPage: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...p, page: String(nextPage) })) if (v) qs.set(k, v);
    return `/transactions?${qs}`;
  };
  const filtered = Boolean(needle || p.month || p.category || p.necessity || p.type);

  return (
    <>
      <form action="/transactions" className="flex flex-col gap-4 rounded-3xl bg-[var(--surface-1)] p-4 text-sm">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
          />
          <input
            name="q"
            defaultValue={p.q}
            placeholder="Search description, category, bank or amount..."
            aria-label="Search transactions"
            className={`${CONTROL} w-full pl-10 pr-4 placeholder:text-[var(--text-secondary)]`}
          />
        </div>
        <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <Select name="month" label="Month" value={p.month} options={months.map((m) => [m, monthLabel(m)])} />
          <Select name="category" label="Category" value={p.category} options={categories.map((c) => [c, c])} />
          <Select name="necessity" label="Necessity" value={p.necessity} options={NECESSITIES.map((n) => [n, n])} />
          <Select name="type" label="Type" value={p.type} options={[["expense", "Spending"], ["income", "Incoming"]]} />
          <div className="col-span-2 flex items-center gap-2 md:col-span-1">
            <button className="h-10 flex-1 rounded-full bg-[var(--accent)] px-6 font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] md:flex-none">
              Apply
            </button>
            {filtered && (
              <Link
                href="/transactions"
                className="flex h-10 items-center rounded-full border border-[var(--border)] px-4 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
              >
                Reset
              </Link>
            )}
          </div>
        </div>
      </form>

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <Metric label="Matching" value={String(rows.length)} />
        <Metric label="Total spent" value={gbp(spent)} />
        <Metric label="Total incoming" value={gbp(incoming)} color="var(--good)" />
      </dl>

      <section className="overflow-x-auto rounded-3xl bg-[var(--surface-1)] p-6">
        {visible.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No matching transactions.</p>
        ) : (
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-left text-xs text-[var(--text-secondary)]">
              <tr>
                <th className="pb-3 font-normal">Date</th>
                <th className="pb-3 font-normal">Description</th>
                <th className="pb-3 font-normal">Category</th>
                <th className="pb-3 font-normal">Necessity</th>
                <th className="pb-3 font-normal">Bank</th>
                <th className="pb-3 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => {
                const income = t.type === "income";
                return (
                  <tr key={t.id} className="border-t border-[var(--border)]">
                    <td className="whitespace-nowrap py-3 pr-3 text-[var(--text-secondary)]">
                      {t.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
                    </td>
                    <td className="max-w-64 truncate py-3 pr-3 font-medium">{t.description?.trim() || t.category}</td>
                    <td className="py-3 pr-3 capitalize">{t.category}</td>
                    <td className="py-3 pr-3 capitalize text-[var(--text-secondary)]">{t.necessity ?? "—"}</td>
                    <td className="py-3 pr-3 text-[var(--text-secondary)]">
                      <BankBadge bank={t.bank} showName />
                    </td>
                    <td
                      className="whitespace-nowrap py-3 text-right font-medium tabular-nums"
                      style={{ color: income ? "var(--good)" : "var(--text-primary)" }}
                    >
                      {income ? "+" : "-"}
                      {gbp(t.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href(page - 1)} className="underline">← Previous</Link> : <span />}
          <span className="text-[var(--text-secondary)]">Page {page} of {pages}</span>
          {page < pages ? <Link href={href(page + 1)} className="underline">Next →</Link> : <span />}
        </nav>
      )}
    </>
  );
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: string[][];
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="px-1 text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="relative">
        <select
          name={name}
          defaultValue={value ?? ""}
          className={`${CONTROL} w-full cursor-pointer appearance-none truncate pl-4 pr-9 capitalize`}
        >
          <option value="">All</option>
          {options.map(([v, text]) => (
            <option key={v} value={v}>
              {text}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
        />
      </span>
    </label>
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
