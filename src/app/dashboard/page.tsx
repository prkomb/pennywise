import { Wallet } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import AdviceCards from "@/components/dashboard/AdviceCards";
import ChatWidget from "@/components/dashboard/ChatWidget";
import CashFlow from "@/components/dashboard/CashFlow";
import CategoryPie from "@/components/dashboard/CategoryPie";
import EmergencyFund from "@/components/dashboard/EmergencyFund";
import WhatIf from "@/components/dashboard/WhatIf";
import PlanVsActual from "@/components/dashboard/PlanVsActual";
import RecentList from "@/components/dashboard/RecentList";
import BankBadge from "@/components/BankBadge";
import AppShell from "@/components/dashboard/AppShell";
import MonthSwitcher from "@/components/dashboard/MonthSwitcher";
import { gbp, monthLabel } from "@/components/dashboard/format";
import { buildAdvice } from "@/lib/advice";
import { emergencyFund, monthKey, planVsActual, summarizeBudget, summarizeByMonth, weeklyNet } from "@/lib/budget";
import { loadBudgetTransactions } from "@/lib/dashboard-data";
import { loadSettings, planLabel } from "@/lib/settings";

const DISCRETIONARY = ["eating out", "subscriptions", "entertainment", "shopping"];

type SearchParams = Promise<{ month?: string; q?: string }>;

export default function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AppShell active="/dashboard">
      <Suspense fallback={<p className="text-sm text-[var(--text-secondary)]">Loading...</p>}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </AppShell>
  );
}

async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const { month: requested, q = "" } = await searchParams;
  const [txs, { plan, emergencyMonths }] = await Promise.all([loadBudgetTransactions(), loadSettings()]);
  const months = summarizeByMonth(txs);
  const keys = Object.keys(months);

  if (keys.length === 0) {
    return (
      <>
        <Header month={null} q={q} />
        <p className="text-sm text-[var(--text-secondary)]">
          No transactions yet. <Link href="/" className="underline">Upload a statement</Link>.
        </p>
      </>
    );
  }

  const isAll = requested === "all";
  const month = isAll ? "all" : requested && months[requested] ? requested : keys[keys.length - 1];
  const total = summarizeBudget(txs);
  const summary = isAll ? total : months[month];
  const previous = isAll ? undefined : months[keys[keys.indexOf(month) - 1]];
  const balance = summary.net;
  const essentialAverage =
    keys.reduce((sum, k) => sum + (months[k].byNecessity.essential ?? 0), 0) / keys.length;
  const needle = q.trim().toLowerCase();
  const monthTxs = isAll ? [...txs] : txs.filter((t) => monthKey(t.date) === month);
  const matches = needle
    ? txs
        .filter((t) =>
          [t.description, t.category, t.necessity, t.bank, t.amount.toFixed(2)].some((field) =>
            (field ?? "").toLowerCase().includes(needle),
          ),
        )
        .sort((a, b) => b.date.getTime() - a.date.getTime())
    : [];
  const matchTotal = (type: "expense" | "income") =>
    matches.filter((t) => t.type === type).reduce((sum, t) => sum + Math.round(t.amount * 100), 0) / 100;
  const recent = monthTxs.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  const banks = [...new Set(monthTxs.map((t) => t.bank).filter(Boolean))];

  return (
    <div className="flex flex-col gap-6">
      <Header month={month} q={q} />

      {needle && (
        <Card title={`Results for "${q.trim()}"`} badge={`${matches.length} found · all months`}>
          <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-[var(--surface-2)] p-3">
              <dt className="text-xs text-[var(--text-secondary)]">Total spent</dt>
              <dd className="text-lg font-medium tabular-nums">{gbp(matchTotal("expense"))}</dd>
            </div>
            <div className="rounded-lg bg-[var(--surface-2)] p-3">
              <dt className="text-xs text-[var(--text-secondary)]">Total incoming</dt>
              <dd className="text-lg font-medium tabular-nums" style={{ color: "var(--good)" }}>
                {gbp(matchTotal("income"))}
              </dd>
            </div>
          </dl>
          <RecentList txs={matches.slice(0, 50)} showDate />
          {matches.length > 50 && (
            <p className="mt-3 text-xs text-[var(--text-secondary)]">Showing the latest 50.</p>
          )}
        </Card>
      )}

      <MonthSwitcher months={keys} current={month} q={q} />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr_1fr]">
        <section
          className="relative flex min-h-44 flex-col justify-between overflow-hidden rounded-3xl p-6 text-white shadow-lg"
          style={{ background: "var(--accent-grad)" }}
        >
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
          <span aria-hidden className="pointer-events-none absolute -bottom-16 right-16 h-36 w-36 rounded-full bg-white/10" />
          <div className="relative">
            <p className="mb-1 flex items-center gap-2 text-sm text-white/80">
              <Wallet size={16} aria-hidden />
              {isAll ? "Total Balance" : `Balance · ${monthLabel(month)}`}
            </p>
            <p className="text-4xl font-semibold tracking-tight tabular-nums">{gbp(balance)}</p>
          </div>
          <div className="relative flex items-end justify-between gap-3">
            <span className="text-sm text-white/75">
              {isAll ? "Income minus spend, all months" : "Income minus spend this month"}
            </span>
            <ul className="flex flex-wrap justify-end gap-2" aria-label="Banks">
              {banks.map((bank) => (
                <li
                  key={bank}
                  className="flex h-9 items-center rounded-full bg-white/95 pl-1.5 pr-3.5 text-sm font-semibold leading-none text-[#0b0b0b] shadow-md ring-1 ring-black/5"
                >
                  <BankBadge bank={bank} size={24} showName className="gap-2" />
                </li>
              ))}
            </ul>
          </div>
        </section>
        <Stat
          icon="+"
          label="Total Income"
          value={gbp(summary.income)}
          change={change(summary.income, previous?.income)}
          note={isAll ? `${keys.length} months combined` : undefined}
          upIsGood
        />
        <Stat
          icon="−"
          label="Total Spend"
          value={gbp(summary.expense)}
          change={change(summary.expense, previous?.expense)}
          note={isAll ? `${keys.length} months combined` : undefined}
          upIsGood={false}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.8fr_1fr]">
        <Card title="Cash Flow" badge={isAll ? "Monthly" : "Weekly"}>
          <CashFlow
            weeks={
              isAll
                ? keys.map((k) => ({ label: monthLabel(k).slice(0, 3), net: months[k].net }))
                : weeklyNet(txs, month)
            }
          />
        </Card>
        <Card title="Recent">
          <RecentList txs={recent} />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Spending by category">
          <CategoryPie key={month} byCategory={summary.byCategory} month={month} />
        </Card>
        <Card title="Plan vs actual" badge={planLabel(plan)}>
          <PlanVsActual lines={planVsActual(summary, plan)} />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Emergency fund" badge={`${emergencyMonths} months`}>
          <EmergencyFund fund={emergencyFund(total.net, essentialAverage, emergencyMonths)} />
        </Card>
        <Card title="What if" badge="Try a cut">
          <WhatIf
            key={month}
            income={summary.income}
            expense={summary.expense}
            net={summary.net}
            byCategory={summary.byCategory}
            discretionary={DISCRETIONARY}
          />
        </Card>
      </div>

      <Card title="Advice">
        <AdviceCards advice={buildAdvice(summary, plan)} />
      </Card>

      <ChatWidget month={month} />
    </div>
  );
}

function change(current: number, previous?: number): number | null {
  if (previous === undefined || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function Header({ month, q }: { month: string | null; q: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs text-[var(--text-secondary)]">Overview{month ? ` · ${month === "all" ? "All months" : monthLabel(month)}` : ""}</p>
        <h1 className="text-3xl font-medium tracking-tight">Dashboard</h1>
      </div>
      <form action="/dashboard" className="flex w-full max-w-xs items-center gap-2 rounded-full bg-[var(--surface-1)] px-4 py-2.5 sm:w-auto">
        {month && <input type="hidden" name="month" value={month} />}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="7" cy="7" r="5" />
          <path d="m11 11 3.5 3.5" strokeLinecap="round" />
        </svg>
        <input
          name="q"
          defaultValue={q}
          placeholder="Search transactions..."
          aria-label="Search transactions"
          className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-secondary)]"
        />
      </form>
    </header>
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

function Stat({
  icon,
  label,
  value,
  change,
  upIsGood,
  note,
}: {
  icon: string;
  label: string;
  value: string;
  change: number | null;
  upIsGood: boolean;
  note?: string;
}) {
  const good = change !== null && (change >= 0) === upIsGood;
  return (
    <section className="rounded-3xl bg-[var(--surface-1)] p-6">
      <span
        aria-hidden
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)] text-lg text-[var(--accent)]"
      >
        {icon}
      </span>
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="text-xl font-medium tabular-nums">{value}</p>
      <p
        className="text-xs"
        style={{ color: change === null ? "var(--text-secondary)" : good ? "var(--good)" : "var(--critical)" }}
      >
        {change === null
          ? (note ?? "No previous month")
          : `${change >= 0 ? "▲ +" : "▼ "}${change.toFixed(1)}% vs last month`}
      </p>
    </section>
  );
}
