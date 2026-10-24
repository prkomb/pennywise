import { z } from "zod";
import { connection } from "next/server";
import { DEFAULT_PLAN, type BudgetPlan } from "./budget";
import { settings } from "./collections";

export interface AppSettings {
  plan: BudgetPlan;
  emergencyMonths: number;
}

export const DEFAULT_SETTINGS: AppSettings = { plan: DEFAULT_PLAN, emergencyMonths: 3 };

/** Plan shares come in as whole percentages and must add up to 100. */
export const settingsInput = z
  .object({
    essential: z.number().int().min(0).max(100),
    wants: z.number().int().min(0).max(100),
    savings: z.number().int().min(0).max(100),
    emergencyMonths: z.number().int().min(1).max(12),
  })
  .refine((s) => s.essential + s.wants + s.savings === 100, {
    message: "Essentials, wants and savings must add up to 100%",
  });

export async function loadSettings(): Promise<AppSettings> {
  await connection();
  const doc = await (await settings()).findOne({ key: "app" });
  const parsed = settingsInput.safeParse(doc?.value);
  if (!parsed.success) return DEFAULT_SETTINGS;
  const { essential, wants, savings, emergencyMonths } = parsed.data;
  return {
    plan: { essential: essential / 100, wants: wants / 100, savings: savings / 100 },
    emergencyMonths,
  };
}

export async function saveSettings(input: z.infer<typeof settingsInput>) {
  await (await settings()).updateOne(
    { key: "app" },
    { $set: { value: input, updatedAt: new Date() } },
    { upsert: true },
  );
}

export const planLabel = (plan: BudgetPlan) =>
  [plan.essential, plan.wants, plan.savings].map((n) => Math.round(n * 100)).join("/");
