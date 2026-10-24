import { connection } from "next/server";
import { linkLegacyRows, orphanFilter, transactions, uploads, type Upload } from "./collections";
import type { BudgetTransaction } from "./budget";

/**
 * All usable transactions, transfers included so totals match the bank statement
 * (summarizeBudget keeps transfers out of the category and necessity breakdowns).
 * Legacy raw CSV rows from before normalisation (no date/amount/type) are skipped.
 */
export async function loadBudgetTransactions(): Promise<BudgetTransaction[]> {
  // Opt in to request-time rendering before touching the DB (new Date() in the driver).
  await connection();
  const docs = await (await transactions()).find({}).toArray();
  return docs
    .filter(
      (t) =>
        t.date instanceof Date &&
        !Number.isNaN(t.date.getTime()) &&
        typeof t.amount === "number" &&
        (t.type === "income" || t.type === "expense"),
    )
    .map((t) => ({
      amount: t.amount,
      type: t.type,
      category: t.category,
      necessity: t.necessity,
      bank: t.bank,
      date: t.date,
      description: t.description,
    }));
}

export async function loadRecentUploads(limit = 6): Promise<Upload[]> {
  await connection();
  return (await uploads()).find({}).sort({ uploadedAt: -1 }).limit(limit).toArray();
}

export interface StatementInfo {
  id: string;
  fileName: string;
  bank: string;
  rows: number;
  uploadedAt: Date;
  /** False for uploads saved before transactions carried an uploadId. */
  linked: boolean;
  income: number;
  expense: number;
  labelled: number;
  from?: Date;
  to?: Date;
}

/** Every upload with totals computed from its linked transactions. */
export async function loadStatements(): Promise<StatementInfo[]> {
  await connection();
  await linkLegacyRows();
  const [items, stats] = await Promise.all([
    (await uploads()).find({}).sort({ uploadedAt: -1 }).toArray(),
    (await transactions())
      .aggregate<{
        _id: unknown;
        count: number;
        income: number;
        expense: number;
        labelled: number;
        from: Date;
        to: Date;
      }>([
        { $match: { uploadId: { $exists: true } } },
        {
          $group: {
            _id: "$uploadId",
            count: { $sum: 1 },
            income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
            expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } },
            labelled: { $sum: { $cond: [{ $ifNull: ["$necessity", false] }, 1, 0] } },
            from: { $min: "$date" },
            to: { $max: "$date" },
          },
        },
      ])
      .toArray(),
  ]);
  const byId = new Map(stats.map((s) => [String(s._id), s]));
  const pounds = (n: number) => Math.round(n * 100) / 100;
  return items.map((u) => {
    const s = byId.get(String(u._id));
    return {
      id: String(u._id),
      fileName: u.fileName ?? "Statement",
      bank: u.bank,
      rows: u.rowCount,
      uploadedAt: u.uploadedAt,
      linked: !!s,
      income: pounds(s?.income ?? 0),
      expense: pounds(s?.expense ?? 0),
      labelled: s?.labelled ?? 0,
      from: s?.from,
      to: s?.to,
    };
  });
}

/** How many transactions are still counted on the dashboard without a statement. */
export async function countOrphans(): Promise<number> {
  await connection();
  await linkLegacyRows();
  return (await transactions()).countDocuments(await orphanFilter());
}

export type TransactionRow = BudgetTransaction & { id: string };

/** Every valid transaction (own-account transfers included), newest first. */
export async function loadAllTransactions(): Promise<TransactionRow[]> {
  await connection();
  const docs = await (await transactions()).find({}).sort({ date: -1 }).toArray();
  return docs
    .filter(
      (t) =>
        t.date instanceof Date &&
        !Number.isNaN(t.date.getTime()) &&
        typeof t.amount === "number" &&
        (t.type === "income" || t.type === "expense"),
    )
    .map((t) => ({
      id: String(t._id),
      amount: t.amount,
      type: t.type,
      category: t.category,
      necessity: t.necessity,
      bank: t.bank,
      date: t.date,
      description: t.description,
    }));
}
