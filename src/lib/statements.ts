export type Bank = "monzo" | "revolut";

export interface NormalizedRow {
  date: Date;
  amount: number;
  currency: string;
  description: string;
}

type Raw = Record<string, string>;

export function detectBank(row: Raw): Bank | null {
  const keys = new Set(Object.keys(row));
  if (keys.has("Transaction ID") && keys.has("Name")) return "monzo";
  if (keys.has("Started Date") && keys.has("State")) return "revolut";
  return null;
}

// Monzo dates are DD/MM/YYYY, Revolut dates are "YYYY-MM-DD HH:mm:ss".
function parseMonzoDate(date: string, time?: string): Date {
  const [d, m, y] = date.split("/").map(Number);
  const [hh = 0, mm = 0, ss = 0] = (time ?? "").split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
}

function parseRevolutDate(value: string): Date {
  return new Date(value.replace(" ", "T") + "Z");
}

function normalizeMonzo(row: Raw): NormalizedRow | null {
  const amount = Number(row["Amount"]);
  const date = parseMonzoDate(row["Date"], row["Time"]);
  if (Number.isNaN(amount) || Number.isNaN(date.getTime())) return null;
  return {
    date,
    amount,
    currency: row["Currency"] || "GBP",
    description: [row["Name"], row["Description"]].filter(Boolean).join(" - "),
  };
}

function normalizeRevolut(row: Raw): NormalizedRow | null {
  if (row["State"] && row["State"] !== "COMPLETED") return null;
  // Revolut reports the fee separately; it also leaves the account, so it counts as spend.
  const fee = Number(row["Fee"] || 0);
  const amount = Math.round((Number(row["Amount"]) - (Number.isNaN(fee) ? 0 : fee)) * 100) / 100;
  const date = parseRevolutDate(row["Started Date"]);
  if (Number.isNaN(amount) || Number.isNaN(date.getTime())) return null;
  return {
    date,
    amount,
    currency: row["Currency"] || "GBP",
    description: row["Description"] ?? "",
  };
}

export function normalizeRows(
  bank: Bank,
  rows: Raw[],
): NormalizedRow[] {
  const normalize = bank === "monzo" ? normalizeMonzo : normalizeRevolut;
  return rows.flatMap((row) => normalize(row) ?? []);
}
