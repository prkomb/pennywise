import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = process.env.GEMINI_MODEL!;

export const CATEGORIES = [
  "groceries",
  "rent",
  "transport",
  "eating out",
  "subscriptions",
  "utilities",
  "health",
  "shopping",
  "entertainment",
  "travel",
  "transfers",
  "income",
  "other",
] as const;

export const NECESSITIES = ["essential", "want", "unnecessary"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Necessity = (typeof NECESSITIES)[number];

export interface RowToLabel {
  description: string;
  amount: number;
  currency: string;
}

export interface RowLabel {
  category: Category;
  necessity: Necessity;
}

const labelSchema = z.object({
  rows: z.array(
    z.object({
      index: z.number().int(),
      category: z.enum(CATEGORIES),
      necessity: z.enum(NECESSITIES),
    }),
  ),
});

const BATCH_SIZE = 50;

const PROMPT = `You are a bank statement analyser.

You receive transactions from a UK bank statement (Monzo or Revolut). Amounts are signed: negative is money out, positive is money in.

For each row, assign:
- "category": exactly one of: ${CATEGORIES.join(", ")}
- "necessity": exactly one of: ${NECESSITIES.join(", ")}

Necessity rules:
- essential: needed to live or work (rent, groceries, utilities, transport to work, health, debt payments)
- want: enjoyable but not needed (eating out, entertainment, hobbies, travel, non-basic shopping)
- unnecessary: wasteful or avoidable (unused subscriptions, fees and fines, impulse purchases, duplicate services)
- Income and transfers between the user's own accounts: use category "income" or "transfers" and necessity "essential".

Rules:
- Use only the allowed values. Never invent new categories or labels.
- Return exactly one result per input row, with the same "index" as the input.
- Judge only from the description and amount. If unsure, choose "other" and "want".

Transactions (JSON):
`;

async function labelBatchOnce(batch: RowToLabel[]): Promise<RowLabel[]> {
  const payload = batch.map((row, index) => ({ index, ...row }));

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: PROMPT + JSON.stringify(payload),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(labelSchema),
      temperature: 0,
    },
  });

  const parsed = labelSchema.parse(JSON.parse(response.text ?? ""));
  const byIndex = new Map(parsed.rows.map((r) => [r.index, r]));

  // Missing rows fall back to a safe default instead of failing the upload.
  return batch.map((_, index) => {
    const hit = byIndex.get(index);
    return hit
      ? { category: hit.category, necessity: hit.necessity }
      : { category: "other", necessity: "want" };
  });
}

/** Gemini occasionally returns malformed or schema-invalid JSON; try once more before giving up. */
async function labelBatch(batch: RowToLabel[]): Promise<RowLabel[]> {
  try {
    return await labelBatchOnce(batch);
  } catch (error) {
    console.warn("Gemini batch failed, retrying once:", error);
    return labelBatchOnce(batch);
  }
}

export async function labelTransactions(
  rows: RowToLabel[],
): Promise<RowLabel[]> {
  const batches: RowToLabel[][] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }
  const results = await Promise.all(batches.map(labelBatch));
  return results.flat();
}

const CHAT_PROMPT = `You are a friendly personal finance assistant inside a UK bank statement dashboard.
Answer only from the financial data below. Amounts are in GBP. If the data cannot answer the question, say so.
Be concise (a few sentences), use plain language, and give practical suggestions when asked. You are not a regulated financial adviser.
Reply in plain text only: no markdown, no asterisks, no bold, no headings, no bullet symbols. For lists, put each item on its own line starting with a dash and a space.

Data:
`;

export async function chatWithAdvisor(
  context: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
    config: { systemInstruction: CHAT_PROMPT + context, temperature: 0.4 },
  });
  const text = stripMarkdown(response.text ?? "");
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

/** The chat window renders plain text, so remove any markdown the model adds anyway. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, ""))
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^(\s*)[*+]\s+/gm, "$1- ")
    .replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?=[^*\w]|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}
