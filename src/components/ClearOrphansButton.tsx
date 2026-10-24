"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ClearOrphansButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function clear() {
    if (!window.confirm(`Delete ${count} transactions that belong to no statement?`)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/statements/orphans", { method: "DELETE" });
      if (!response.ok) setError((await response.json()).error ?? response.statusText);
      else router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={clear}
        className="rounded-full bg-[var(--surface-2)] px-4 py-2 text-xs font-medium text-[var(--critical)] disabled:opacity-50"
      >
        {busy ? "Clearing..." : "Clear leftover data"}
      </button>
      {error && <p className="text-xs text-[var(--critical)]">{error}</p>}
    </div>
  );
}
