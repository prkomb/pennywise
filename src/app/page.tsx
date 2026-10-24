import Link from "next/link";
import { Suspense } from "react";
import BankBadge from "@/components/BankBadge";
import AppShell from "@/components/dashboard/AppShell";
import UploadStatementButton from "@/components/UploadStatementButton";
import { loadRecentUploads } from "@/lib/dashboard-data";

const STEPS = [
  { title: "Upload", body: "Drop a CSV export from Monzo or Revolut. We detect the bank from its columns." },
  { title: "Categorize", body: "Every row gets a category and a label: essential, want or unnecessary." },
  { title: "Review", body: "See where your money goes, compare against a 50/30/20 plan and get advice." },
];

const BANKS = ["monzo", "revolut"];

export default function Home() {
  return (
    <AppShell active="/">
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Welcome</p>
            <h1 className="text-3xl font-medium tracking-tight">Bank Statements</h1>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white"
          >
            Open dashboard
          </Link>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.8fr_1fr]">
          <Card title="Upload a statement" badge="CSV">
            <UploadStatementButton />
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[var(--text-secondary)]">Supported banks:</span>
              <ul className="flex flex-wrap items-center gap-2">
                {BANKS.map((bank) => (
                  <li
                    key={bank}
                    className="flex h-8 items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] pl-1.5 pr-3.5 font-medium leading-none text-[var(--text-primary)]"
                  >
                    <BankBadge bank={bank} size={20} showName />
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card title="Uploaded statements">
            <Suspense fallback={<p className="text-sm text-[var(--text-secondary)]">Loading...</p>}>
              <UploadedList />
            </Suspense>
          </Card>
        </div>

        <Card title="How it works">
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-medium text-[var(--accent)]"
                >
                  {i + 1}
                </span>
                <span>
                  <span className="block text-sm font-medium">{step.title}</span>
                  <span className="block text-sm text-[var(--text-secondary)]">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </AppShell>
  );
}

async function UploadedList() {
  const items = await loadRecentUploads();
  if (items.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">Nothing uploaded yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-4">
      {items.map((u) => (
        <li key={String(u._id)} className="flex items-center gap-3">
          <BankBadge bank={u.bank} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{u.fileName ?? "Statement"}</span>
            <span className="block text-xs capitalize text-[var(--text-secondary)]">
              {u.bank} · {u.rowCount} rows
            </span>
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            {u.uploadedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-[var(--surface-1)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-medium">{title}</h2>
        {badge && (
          <span className="rounded-md bg-[var(--accent-soft)] px-2.5 py-1 text-xs text-[var(--accent)]">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
