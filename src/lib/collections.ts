import type { Collection, ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export interface Transaction {
  _id?: ObjectId;
  amount: number;
  type: "income" | "expense";
  category: string;
  description?: string;
  necessity?: "essential" | "want" | "unnecessary";
  labelSource?: "gemini" | "mock";
  bank?: "monzo" | "revolut";
  currency?: string;
  date: Date;
  goalId?: ObjectId;
  /** The statement upload this row came from; absent on rows saved before uploads were linked. */
  uploadId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  _id?: ObjectId;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  status: "active" | "completed" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

export interface Upload {
  _id?: ObjectId;
  /** SHA-256 of the parsed statement rows; unique, so re-uploads are rejected. */
  hash: string;
  fileName?: string;
  bank: "monzo" | "revolut";
  rowCount: number;
  uploadedAt: Date;
}

export interface Setting {
  _id?: ObjectId;
  key: string;
  value: unknown;
  updatedAt: Date;
}

export async function transactions(): Promise<Collection<Transaction>> {
  return (await getDb()).collection<Transaction>("transactions");
}

export async function goals(): Promise<Collection<Goal>> {
  return (await getDb()).collection<Goal>("goals");
}

export async function uploads(): Promise<Collection<Upload>> {
  const col = (await getDb()).collection<Upload>("uploads");
  await col.createIndex({ hash: 1 }, { unique: true });
  return col;
}

export async function settings(): Promise<Collection<Setting>> {
  return (await getDb()).collection<Setting>("settings");
}

/**
 * Rows saved before transactions carried an uploadId share the upload's exact
 * timestamp (createdAt === uploadedAt), so link them back to their statement.
 */
export async function linkLegacyRows(): Promise<void> {
  const [uploadsCol, txCol] = await Promise.all([uploads(), transactions()]);
  for (const u of await uploadsCol.find({}).toArray()) {
    await txCol.updateMany(
      { uploadId: { $exists: false }, bank: u.bank, createdAt: u.uploadedAt },
      { $set: { uploadId: u._id } },
    );
  }
}

/** Filter for transactions whose statement no longer exists (or never was recorded). */
export async function orphanFilter() {
  const ids = await (await uploads()).distinct("_id");
  return { $or: [{ uploadId: { $exists: false } }, { uploadId: { $nin: ids } }] };
}
