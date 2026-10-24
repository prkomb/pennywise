import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { labelWithFallback } from "./categorizer";
import type { RowLabel, RowToLabel } from "./gemini";

const rows: RowToLabel[] = [{ description: "Tesco", amount: -5, currency: "GBP" }];
const geminiLabels: RowLabel[] = [{ category: "shopping", necessity: "unnecessary" }];
const mockLabels: RowLabel[] = [{ category: "groceries", necessity: "essential" }];

describe("labelWithFallback", () => {
  it("uses Gemini data when Gemini responds", async () => {
    const result = await labelWithFallback(
      rows,
      async () => geminiLabels,
      async () => mockLabels,
    );
    assert.deepEqual(result, { labels: geminiLabels, source: "gemini" });
  });

  it("uses mock data when Gemini throws", async () => {
    const result = await labelWithFallback(
      rows,
      async () => {
        throw new Error("503");
      },
      async () => mockLabels,
    );
    assert.deepEqual(result, { labels: mockLabels, source: "mock" });
  });
});
