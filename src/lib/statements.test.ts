import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectBank, normalizeRows } from "./statements";

describe("normalizeRows", () => {
  it("counts the Revolut fee as extra money out", () => {
    const row = {
      Type: "CARD_PAYMENT", "Started Date": "2026-10-03 12:00:00", Description: "Tesco",
      Amount: "-10.00", Fee: "0.50", Currency: "GBP", State: "COMPLETED",
    };
    assert.equal(detectBank(row), "revolut");
    assert.equal(normalizeRows("revolut", [row])[0].amount, -10.5);
  });

  it("skips Revolut rows that are not completed", () => {
    const row = { "Started Date": "2026-10-03 12:00:00", Description: "X", Amount: "-5", State: "PENDING" };
    assert.equal(normalizeRows("revolut", [row]).length, 0);
  });

  it("reads Monzo rows with signed amounts", () => {
    const row = { "Transaction ID": "tx_1", Name: "Tesco", Date: "03/10/2026", Time: "12:00:00", Amount: "-12.30", Currency: "GBP" };
    assert.equal(normalizeRows("monzo", [row])[0].amount, -12.3);
  });
});
