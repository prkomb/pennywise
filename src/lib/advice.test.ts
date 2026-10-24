import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAdvice } from "./advice";
import { summarizeBudget, type BudgetTransaction } from "./budget";

const d = new Date("2026-10-01");
const income = (amount: number): BudgetTransaction => ({ amount, type: "income", category: "income", necessity: "essential", date: d });
const spend = (
  amount: number,
  category: string,
  necessity: BudgetTransaction["necessity"],
): BudgetTransaction => ({ amount, type: "expense", category, necessity, date: d });

describe("buildAdvice", () => {
  it("returns nothing for an empty month", () => {
    assert.deepEqual(buildAdvice(summarizeBudget([])), []);
  });

  it("flags overspending as critical and sorts it first", () => {
    const advice = buildAdvice(
      summarizeBudget([income(1000), spend(1200, "shopping", "want")]),
    );
    assert.equal(advice[0].level, "critical");
    assert.match(advice[0].body, /£200\.00/);
  });

  it("names the biggest unnecessary category", () => {
    const advice = buildAdvice(
      summarizeBudget([
        income(3000),
        spend(10, "subscriptions", "unnecessary"),
        spend(60, "shopping", "unnecessary"),
      ]),
    );
    const card = advice.find((a) => a.title === "Cut unnecessary spending");
    assert.match(card!.body, /shopping \(£60\.00\)/);
  });

  it("praises savings at or above plan", () => {
    const advice = buildAdvice(summarizeBudget([income(1000), spend(500, "rent", "essential")]));
    assert.equal(advice.at(-1)?.level, "good");
  });

  it("explains missing income", () => {
    const advice = buildAdvice(summarizeBudget([spend(5, "groceries", "essential")]));
    assert.equal(advice[0].title, "No income this month");
  });
});
