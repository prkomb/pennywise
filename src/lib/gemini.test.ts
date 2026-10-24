import assert from "node:assert/strict";
import { test } from "node:test";

process.env.GEMINI_API_KEY ??= "test";
process.env.GEMINI_MODEL ??= "test";

test("stripMarkdown removes bold, bullets and headings", async () => {
  const { stripMarkdown } = await import("./gemini");
  const input = "Total **£1,176.06**.\n* **September 2026:** £536.26\n* October: £639.80\n## Tip\nUse `rent`.";
  assert.equal(
    stripMarkdown(input),
    "Total £1,176.06.\n- September 2026: £536.26\n- October: £639.80\nTip\nUse rent.",
  );
});
