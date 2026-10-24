"use client";

import { parse } from "csv-parse/browser/esm/sync";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Tone = "info" | "success" | "error";

export default function UploadStatementButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone: Tone } | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  function showDialog(title: string, message: string) {
    setStatus(null);
    setDialog({ title, message });
    dialogRef.current?.showModal();
  }

  async function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showDialog(
        "Unsupported file type",
        `${file.name} can't be uploaded. Only CSV files exported from Monzo or Revolut are supported.`,
      );
      return;
    }
    setBusy(true);
    setStatus({ text: `Reading ${file.name}...`, tone: "info" });
    try {
      let records;
      try {
        records = parse(await file.text(), {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true,
        });
      } catch {
        showDialog("Could not read file", "That file could not be read. Upload a CSV export from Monzo or Revolut.");
        return;
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: records, fileName: file.name }),
      });
      const data = await response.json();

      if (response.status === 409 && data.duplicate) {
        const when = data.uploadedAt
          ? ` on ${new Date(data.uploadedAt).toLocaleString("en-GB")}`
          : "";
        showDialog(
          "Already uploaded",
          `You have already uploaded this statement${data.fileName ? ` (${data.fileName})` : ""}${when}. Nothing was added.`,
        );
        return;
      }
      if (data.code === "unrecognised_format") {
        showDialog(
          "Unsupported statement",
          `${file.name} is not a Monzo or Revolut statement. Only CSV exports from Monzo and Revolut are supported.`,
        );
        return;
      }
      if (!response.ok) {
        setStatus({ text: `Error: ${data.error ?? response.statusText}`, tone: "error" });
        return;
      }

      setStatus({ text: `Saved ${data.inserted} ${data.bank} rows. Categorizing...`, tone: "info" });
      const catResponse = await fetch("/api/categorize", { method: "POST" });
      const catData = await catResponse.json();
      if (!catResponse.ok) {
        setStatus({ text: `Error: ${catData.error ?? catResponse.statusText}`, tone: "error" });
        return;
      }
      setStatus({
        text: `Saved ${data.inserted} ${data.bank} rows, categorized ${catData.categorized} (${catData.source ?? "none"})`,
        tone: "success",
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires onChange.
    event.target.value = "";
    if (file) void processFile(file);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !busy) void processFile(file);
  }

  const toneColor = { info: "var(--text-secondary)", success: "var(--good)", error: "var(--critical)" };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center cursor-pointer transition-colors disabled:cursor-wait ${
          dragging
            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
            : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]"
        }`}
      >
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl text-white"
          style={{ background: "var(--accent-grad)" }}
        >
          {busy ? "…" : "↑"}
        </span>
        <span className="text-base font-medium">
          {busy ? "Working..." : "Drop your bank statement here"}
        </span>
        <span className="text-sm text-[var(--text-secondary)]">
          or click to choose a CSV file from Monzo or Revolut
        </span>
      </button>

      <p role="status" className="mt-3 min-h-5 text-sm" style={{ color: status ? toneColor[status.tone] : undefined }}>
        {status?.text}
      </p>

      <dialog
        ref={dialogRef}
        className="m-auto max-w-sm rounded-2xl bg-[var(--surface-1)] p-6 text-[var(--text-primary)] shadow-xl backdrop:bg-black/50"
      >
        <h2 className="mb-2 text-lg font-semibold">{dialog?.title}</h2>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">{dialog?.message}</p>
        <form method="dialog">
          <button className="h-10 rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-white">
            OK
          </button>
        </form>
      </dialog>
    </div>
  );
}
