import type { RowLabel, RowToLabel } from "./gemini";


const RULES: { match: RegExp; label: RowLabel }[] = [
  { match: /tesco|sainsbury|lidl|aldi|waitrose/i, label: { category: "groceries", necessity: "essential" } },
  { match: /\brent\b|landlord/i, label: { category: "rent", necessity: "essential" } },
  { match: /\btfl\b|trainline|\buber\b|\bshell\b|\bbp\b/i, label: { category: "transport", necessity: "essential" } },
  { match: /octopus|thames water|council tax/i, label: { category: "utilities", necessity: "essential" } },
  { match: /pharmacy|boots|dentist/i, label: { category: "health", necessity: "essential" } },
  { match: /pret|nando|deliveroo|starbucks|mcdonald/i, label: { category: "eating out", necessity: "want" } },
  { match: /netflix|spotify|disney/i, label: { category: "subscriptions", necessity: "unnecessary" } },
  { match: /cinema|steam|playstation/i, label: { category: "entertainment", necessity: "want" } },
  { match: /ryanair|airbnb|booking\.com/i, label: { category: "travel", necessity: "want" } },
  { match: /amazon|asos|zara/i, label: { category: "shopping", necessity: "want" } },
  { match: /salary|payroll/i, label: { category: "income", necessity: "essential" } },
  { match: /transfer|top.?up|\bpot\b/i, label: { category: "transfers", necessity: "essential" } },
];

const FALLBACK: RowLabel = { category: "other", necessity: "want" };

export async function labelTransactions(rows: RowToLabel[]): Promise<RowLabel[]> {
  return rows.map(
    (row) => RULES.find((rule) => rule.match.test(row.description))?.label ?? FALLBACK,
  );
}
