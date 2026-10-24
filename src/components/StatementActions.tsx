"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const BUTTON =
  "rounded-full bg-[var(--surface-2)] px-4 py-2 text-xs font-medium disabled:cursor-wait disabled:opacity-50";

export default function StatementActions({ id, fileName }: { id: string; fileName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"recat" | "delete" | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function run(kind: "recat" | "delete") {
    if (kind === "delete" && !window.confirm(`Delete ${fileName} and all its transactions?`)) return;
    setBusy(kind);
    setMessage(null);
    try {
      const response = await fetch(
        kind === "delete" ? `/api/statements/${id}` : `/api/statements/${id}/recategorize`,
        { method: kind === "delete" ? "DELETE" : "POST" },
      );
      const data = await response.json();
      if (!response.ok) {
        setMessage({ text: data.error ?? response.statusText, error: true });
        return;
      }
      if (kind === "recat") {
        setMessage({ text: `Re-categorized ${data.categorized} rows (${data.source ?? "none"})`, error: false });
      }
      router.refresh();
    } catch {
      setMessage({ text: "Network error", error: true });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <a href={`/api/statements/${id}/export`} download className={BUTTON}>
          Download CSV
        </a>
        <button type="button" disabled={busy !== null} onClick={() => run("recat")} className={BUTTON}>
          {busy === "recat" ? "Working..." : "Re-categorize"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run("delete")}
          className={`${BUTTON} text-[var(--critical)]`}
        >
          {busy === "delete" ? "Deleting..." : "Delete"}
        </button>
      </div>
      <p
        role="status"
        className="text-xs"
        style={{ color: message?.error ? "var(--critical)" : "var(--good)" }}
      >
        {message?.text}
      </p>
    </div>
  );
}
