import { labelTransactions as geminiLabel } from "./gemini";
import type { RowLabel, RowToLabel } from "./gemini";
import { labelTransactions as mockLabel } from "./gemini.mock";

export type LabelSource = "gemini" | "mock";

type Labeller = (rows: RowToLabel[]) => Promise<RowLabel[]>;

/** Use Gemini when it responds; fall back to the mock when it throws. */
export async function labelWithFallback(
  rows: RowToLabel[],
  primary: Labeller = geminiLabel,
  fallback: Labeller = mockLabel,
): Promise<{ labels: RowLabel[]; source: LabelSource }> {
  try {
    return { labels: await primary(rows), source: "gemini" };
  } catch (error) {
    console.warn("Gemini failed, using mock categorizer:", error);
    return { labels: await fallback(rows), source: "mock" };
  }
}
