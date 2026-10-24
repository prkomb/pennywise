"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Values {
  essential: number;
  wants: number;
  savings: number;
  emergencyMonths: number;
}

const FIELDS = [
  { key: "essential", label: "Essentials", hint: "Rent, bills, groceries, transport" },
  { key: "wants", label: "Wants", hint: "Eating out, fun, shopping" },
  { key: "savings", label: "Savings", hint: "What is left over" },
] as const;

export default function SettingsForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const total = values.essential + values.wants + values.savings;

  function set(key: keyof Values, raw: string) {
    setValues({ ...values, [key]: raw === "" ? 0 : Number(raw) });
    setMessage(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) setMessage({ text: data.error ?? response.statusText, error: true });
      else {
        setMessage({ text: "Saved", error: false });
        router.refresh();
      }
    } catch {
      setMessage({ text: "Network error", error: true });
    } finally {
      setBusy(false);
    }
  }

  const input = "w-20 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-right tabular-nums";

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      {FIELDS.map((f) => (
        <label key={f.key} className="flex items-center justify-between gap-4 text-sm">
          <span>
            <span className="block font-medium">{f.label} %</span>
            <span className="block text-xs text-[var(--text-secondary)]">{f.hint}</span>
          </span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={values[f.key]}
            onChange={(e) => set(f.key, e.target.value)}
            className={input}
          />
        </label>
      ))}
      <p className="text-xs" style={{ color: total === 100 ? "var(--good)" : "var(--critical)" }}>
        Total {total}% {total === 100 ? "✓" : "— must be 100%"}
      </p>
      <label className="flex items-center justify-between gap-4 text-sm">
        <span>
          <span className="block font-medium">Emergency fund target (months)</span>
          <span className="block text-xs text-[var(--text-secondary)]">Months of essential spend to keep saved</span>
        </span>
        <input
          type="number"
          min={1}
          max={12}
          step={1}
          value={values.emergencyMonths}
          onChange={(e) => set("emergencyMonths", e.target.value)}
          className={input}
        />
      </label>
      <div className="flex items-center gap-4">
        <button
          disabled={busy || total !== 100}
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save settings"}
        </button>
        <span role="status" className="text-sm" style={{ color: message?.error ? "var(--critical)" : "var(--good)" }}>
          {message?.text}
        </span>
      </div>
    </form>
  );
}
