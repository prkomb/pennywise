import Link from "next/link";
import { Suspense } from "react";
import BankBadge from "@/components/BankBadge";
import AppShell from "@/components/dashboard/AppShell";
import { gbp } from "@/components/dashboard/format";
import StatementActions from "@/components/StatementActions";
import ClearOrphansButton from "@/components/ClearOrphansButton";
import { countOrphans, loadStatements } from "@/lib/dashboard-data";

const day = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function StatementsPage() {
  return (
    <AppShell active="/statements">
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Manage</p>
            <h1 className="text-3xl font-medium tracking-tight">Statements</h1>
          </div>
          <Link href="/" className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white">
            Upload statement
          </Link>
        </header>
        <Suspense fallback={<p className="text-sm text-[var(--text-secondary)]">Loading...</p>}>
          <List />
        </Suspense>
      </div>
    </AppShell>
  );
}

async function List() {
  const [items, orphans] = await Promise.all([loadStatements(), countOrphans()]);
  return (
    <div className="flex flex-col gap-4">
      {orphans > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[var(--serious)] bg-[var(--surface-1)] p-6">
          <div>
            <p className="text-base font-medium">{orphans} transactions have no statement</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Left over from deleted or older uploads. They still count in the dashboard and reports.
            </p>
          </div>
          <ClearOrphansButton count={orphans} />
        </div>
      )}
      {items.length === 0 && (
        <p className="text-sm text-[var(--text-secondary)]">
          No statements yet. <Link href="/" className="underline">Upload one</Link>.
        </p>
      )}
      <ul className="flex flex-col gap-4">
      {items.map((s) => (
        <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[var(--surface-1)] p-6">
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-base font-medium">
              <BankBadge bank={s.bank} size={24} />
              {s.fileName}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              <span className="capitalize">{s.bank}</span> · {s.rows} rows · uploaded {day(s.uploadedAt)}
              {s.from && s.to ? ` · covers ${day(s.from)} – ${day(s.to)}` : ""}
            </p>
            {s.linked ? (
              <p className="mt-2 text-sm tabular-nums">
                <span className="text-[var(--critical)]">Spent {gbp(s.expense)}</span>
                {" · "}
                <span className="text-[var(--good)]">In {gbp(s.income)}</span>
                {" · "}
                <span className="text-[var(--text-secondary)]">
                  {s.labelled}/{s.rows} categorized
                </span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Uploaded before rows were linked to statements, so only deleting the record is available.
              </p>
            )}
          </div>
          <StatementActions id={s.id} fileName={s.fileName} />
        </li>
      ))}
      </ul>
    </div>
  );
}
