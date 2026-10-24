import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeBudget, summarizeByMonth, type BudgetTransaction } from "./budget";
import { labelTransactions } from "./gemini.mock";
import type { RowToLabel } from "./gemini";

// Fake statement rows, signed like the real Monzo/Revolut exports.
const FAKE_ROWS: (RowToLabel & { date: string; bank: "monzo" | "revolut" })[] = [
  { description: "ACME Ltd Salary", amount: 2500, currency: "GBP", date: "2026-09-28", bank: "monzo" },
  { description: "Landlord rent", amount: -1000, currency: "GBP", date: "2026-10-01", bank: "monzo" },
  { description: "Tesco Express", amount: -45.5, currency: "GBP", date: "2026-10-03", bank: "monzo" },
  { description: "TfL travel", amount: -22.2, currency: "GBP", date: "2026-10-04", bank: "revolut" },
  { description: "Netflix", amount: -10.99, currency: "GBP", date: "2026-10-05", bank: "revolut" },
  { description: "Nando's", amount: -30.1, currency: "GBP", date: "2026-10-06", bank: "revolut" },
  { description: "Mystery Shop 42", amount: -9.99, currency: "GBP", date: "2026-10-07", bank: "monzo" },
];

async function categorized(): Promise<BudgetTransaction[]> {
  const labels = await labelTransactions(FAKE_ROWS);
  return FAKE_ROWS.map((row, i) => ({
    amount: Math.abs(row.amount),
    type: row.amount < 0 ? "expense" : "income",
    category: labels[i].category,
    necessity: labels[i].necessity,
    bank: row.bank,
    date: new Date(row.date),
  }));
}

describe("mock categorizer", () => {
  it("returns one label per row, in order", async () => {
    const labels = await labelTransactions(FAKE_ROWS);
    assert.equal(labels.length, FAKE_ROWS.length);
    assert.deepEqual(labels[2], { category: "groceries", necessity: "essential" });
    assert.deepEqual(labels[4], { category: "subscriptions", necessity: "unnecessary" });
  });

  it("falls back to other/want for unknown merchants", async () => {
    const [label] = await labelTransactions([
      { description: "Mystery Shop 42", amount: -5, currency: "GBP" },
    ]);
    assert.deepEqual(label, { category: "other", necessity: "want" });
  });
});

describe("summarizeBudget", () => {
  it("totals income, expense and net without float drift", async () => {
    const s = summarizeBudget(await categorized());
    assert.equal(s.income, 2500);
    assert.equal(s.expense, 1118.78);
    assert.equal(s.net, 1381.22);
  });

  it("computes savings rate", async () => {
    const s = summarizeBudget(await categorized());
    assert.ok(Math.abs(s.savingsRate - 1381.22 / 2500) < 1e-9);
  });

  it("splits expense by necessity", async () => {
    const s = summarizeBudget(await categorized());
    assert.deepEqual(s.byNecessity, {
      essential: 1067.7,
      unnecessary: 10.99,
      want: 40.09,
    });
  });

  it("splits expense by category and bank, excluding income", async () => {
    const s = summarizeBudget(await categorized());
    assert.equal(s.byCategory.rent, 1000);
    assert.equal(s.byCategory.income, undefined);
    assert.equal(s.byBank.monzo, 1055.49);
    assert.equal(s.byBank.revolut, 63.29);
  });

  it("computes discretionary share (want + unnecessary)", async () => {
    const s = summarizeBudget(await categorized());
    assert.ok(Math.abs(s.discretionaryShare - 51.08 / 1118.78) < 1e-9);
  });

  it("puts unlabelled expenses in an uncategorized bucket", () => {
    const s = summarizeBudget([
      { amount: 5, type: "expense", category: "uncategorized", date: new Date("2026-10-01") },
    ]);
    assert.deepEqual(s.byNecessity, { uncategorized: 5 });
    assert.deepEqual(s.byBank, { unknown: 5 });
  });

  it("handles empty input and zero income", () => {
    const s = summarizeBudget([]);
    assert.equal(s.expense, 0);
    assert.equal(s.savingsRate, 0);
    assert.equal(s.discretionaryShare, 0);
  });
});

describe("summarizeByMonth", () => {
  it("groups by UTC month in chronological order", async () => {
    const months = summarizeByMonth(await categorized());
    assert.deepEqual(Object.keys(months), ["2026-09", "2026-10"]);
    assert.equal(months["2026-09"].income, 2500);
    assert.equal(months["2026-09"].expense, 0);
    assert.equal(months["2026-10"].expense, 1118.78);
  });
});

describe("planVsActual", () => {
  it("compares essentials, wants and savings with the 50/30/20 plan", async () => {
    const { planVsActual } = await import("./budget");
    const october = summarizeByMonth(await categorized())["2026-10"];
    const lines = planVsActual({ ...october, income: 2500, net: 2500 - october.expense });
    const [essential, wants, savings] = lines;
    assert.equal(essential.planned, 1250);
    assert.equal(essential.actual, 1067.7);
    assert.equal(essential.ok, true);
    assert.equal(wants.planned, 750);
    assert.equal(wants.actual, 51.08);
    assert.equal(savings.planned, 500);
    assert.equal(savings.actual, 1381.22);
    assert.equal(savings.ok, true);
  });
});

describe("weeklyNet", () => {
  it("buckets net cash flow into weeks of the month, including empty ones", async () => {
    const { weeklyNet } = await import("./budget");
    const weeks = weeklyNet(await categorized(), "2026-10");
    assert.equal(weeks.length, 5);
    assert.deepEqual(weeks.map((w) => w.label), ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5"]);
    // Oct 1-7: all the October expenses, no income.
    assert.equal(weeks[0].net, -1118.78);
    assert.equal(weeks[1].net, 0);
  });
});

describe("emergencyFund", () => {
  it("compares savings with three months of essentials", async () => {
    const { emergencyFund } = await import("./budget");
    const ef = emergencyFund(1500, 1000);
    assert.equal(ef.target, 3000);
    assert.equal(ef.monthsCovered, 1.5);
    assert.equal(ef.ok, false);
    assert.equal(emergencyFund(3000, 1000).ok, true);
  });

  it("never goes negative and handles zero essentials", async () => {
    const { emergencyFund } = await import("./budget");
    assert.equal(emergencyFund(-50, 1000).current, 0);
    assert.equal(emergencyFund(500, 0).monthsCovered, 0);
  });
});

describe("whatIfCut", () => {
  it("cutting a category frees that share into savings", async () => {
    const { whatIfCut } = await import("./budget");
    const october = summarizeByMonth(await categorized())["2026-10"];
    const summary = { ...october, income: 2500, net: 2500 - october.expense };
    const r = whatIfCut(summary, "eating out", 30);
    assert.equal(r.saved, 9.03);
    assert.equal(r.expense, 1109.75);
    assert.equal(r.net, 1390.25);
  });

  it("clamps percent and ignores unknown categories", async () => {
    const { whatIfCut } = await import("./budget");
    const s = summarizeBudget(await categorized());
    assert.equal(whatIfCut(s, "rent", 150).saved, 1000);
    assert.equal(whatIfCut(s, "nope", 50).saved, 0);
  });
});

describe("topMerchants", () => {
  it("groups expenses by description, most payments first (bigger spend breaks ties), ignoring income", async () => {
    const { topMerchants } = await import("./budget");
    const tx = (description: string, amount: number, type: "expense" | "income" = "expense") => ({
      description, amount, type, category: "other", date: new Date("2026-10-01"),
    });
    const top = topMerchants([tx("Uber", 10), tx("uber", 5.5), tx("Tesco", 20), tx("Salary", 999, "income")]);
    assert.deepEqual(top, [
      { name: "Uber", amount: 15.5, count: 2 },
      { name: "Tesco", amount: 20, count: 1 },
    ]);
  });
});

describe("topMerchants sorting", () => {
  it("can sort by total spend instead of payment count", async () => {
    const { topMerchants } = await import("./budget");
    const tx = (description: string, amount: number) => ({
      description, amount, type: "expense" as const, category: "other", date: new Date("2026-10-01"),
    });
    const txs = [tx("Uber", 10), tx("Uber", 5), tx("Tesco", 20)];
    assert.deepEqual(topMerchants(txs, 8, "amount").map((m) => m.name), ["Tesco", "Uber"]);
    assert.deepEqual(topMerchants(txs, 8, "count").map((m) => m.name), ["Uber", "Tesco"]);
  });
});

describe("transfers", () => {
  it("count in income and expense but not in category or necessity breakdowns", () => {
    const d = new Date("2026-10-01");
    const s = summarizeBudget([
      { amount: 100, type: "income", category: "transfers", necessity: "essential", date: d },
      { amount: 20, type: "expense", category: "transfers", necessity: "essential", date: d },
      { amount: 30, type: "expense", category: "groceries", necessity: "essential", date: d },
    ]);
    assert.equal(s.income, 100);
    assert.equal(s.expense, 50);
    assert.equal(s.net, 50);
    assert.deepEqual(s.byCategory, { groceries: 30 });
    assert.deepEqual(s.byNecessity, { essential: 30 });
  });
});
