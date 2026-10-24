"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteAllDataButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function wipe() {
    if (!window.confirm("Delete ALL statements and transactions? This cannot be undone.")) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/data", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) setMessage({ text: data.error ?? response.statusText, error: true });
      else {
        setMessage({
          text: `Deleted ${data.deletedStatements} statements and ${data.deletedTransactions} transactions`,
          error: false,
        });
        router.refresh();
      }
    } catch {
      setMessage({ text: "Network error", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={wipe}
        className="w-fit rounded-full border border-[var(--critical)] px-5 py-2.5 text-sm font-medium text-[var(--critical)] disabled:opacity-50"
      >
        {busy ? "Deleting..." : "Delete all data"}
      </button>
      <p role="status" className="text-sm" style={{ color: message?.error ? "var(--critical)" : "var(--good)" }}>
        {message?.text}
      </p>
    </div>
  );
}
