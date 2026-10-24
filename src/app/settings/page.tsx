import { Suspense } from "react";
import AppShell from "@/components/dashboard/AppShell";
import DeleteAllDataButton from "@/components/DeleteAllDataButton";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import SettingsForm from "@/components/SettingsForm";
import { loadSettings } from "@/lib/settings";

export default function SettingsPage() {
  return (
    <AppShell active="/settings">
      <div className="flex max-w-2xl flex-col gap-6">
        <header>
          <p className="text-xs text-[var(--text-secondary)]">Preferences</p>
          <h1 className="text-3xl font-medium tracking-tight">Settings</h1>
        </header>
        <section className="rounded-3xl bg-[var(--surface-1)] p-6">
          <h2 className="mb-1 text-base font-medium">Appearance</h2>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            System follows your device. Light and dark are remembered in this browser.
          </p>
          <div className="max-w-xs">
            <ThemeSwitcher />
          </div>
        </section>
        <Suspense fallback={<p className="text-sm text-[var(--text-secondary)]">Loading...</p>}>
          <Form />
        </Suspense>
        <section className="rounded-3xl bg-[var(--surface-1)] p-6">
          <h2 className="mb-1 text-base font-medium text-[var(--critical)]">Danger zone</h2>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            Removes every uploaded statement and transaction. Your budget settings are kept.
          </p>
          <DeleteAllDataButton />
        </section>
      </div>
    </AppShell>
  );
}

async function Form() {
  const { plan, emergencyMonths } = await loadSettings();
  const pct = (n: number) => Math.round(n * 100);
  return (
    <section className="rounded-3xl bg-[var(--surface-1)] p-6">
      <h2 className="mb-1 text-base font-medium">Budget plan</h2>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        Used for plan vs actual, advice and the emergency fund on the dashboard.
      </p>
      <SettingsForm
        initial={{
          essential: pct(plan.essential),
          wants: pct(plan.wants),
          savings: pct(plan.savings),
          emergencyMonths,
        }}
      />
    </section>
  );
}
