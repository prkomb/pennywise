import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import type { ObjectId } from "mongodb";
import { transactions, uploads, type Transaction } from "@/lib/collections";
import { detectBank, normalizeRows } from "@/lib/statements";

export async function POST(req: Request) {
  try {
    const { rows, fileName } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows to insert" }, { status: 400 });
    }

    const bank = detectBank(rows[0]);
    if (!bank) {
      return NextResponse.json(
        {
          code: "unrecognised_format",
          error: "Unrecognised statement format (expected Monzo or Revolut CSV)",
        },
        { status: 400 },
      );
    }

    const normalized = normalizeRows(bank, rows);
    if (normalized.length === 0) {
      return NextResponse.json({ error: "No valid rows found" }, { status: 400 });
    }

    // Same statement (identical rows) uploaded before? Reject it.
    const hash = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
    const uploadsCol = await uploads();
    const previous = await uploadsCol.findOne({ hash });
    if (previous) return duplicate(previous.fileName, previous.uploadedAt);

    const now = new Date();
    let uploadId: ObjectId;
    try {
      // The unique index on hash also guards against two concurrent uploads.
      ({ insertedId: uploadId } = await uploadsCol.insertOne({
        hash,
        fileName: typeof fileName === "string" ? fileName : undefined,
        bank,
        rowCount: normalized.length,
        uploadedAt: now,
      }));
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const existing = await uploadsCol.findOne({ hash });
        return duplicate(existing?.fileName, existing?.uploadedAt ?? now);
      }
      throw error;
    }

    const docs: Transaction[] = normalized.map((row) => ({
      amount: Math.abs(row.amount),
      type: row.amount < 0 ? "expense" : "income",
      category: "uncategorized",
      uploadId,
      bank,
      currency: row.currency,
      description: row.description,
      date: row.date,
      createdAt: now,
      updatedAt: now,
    }));

    let result;
    try {
      result = await (await transactions()).insertMany(docs);
    } catch (error) {
      // Free the hash so the user can retry the same file.
      await uploadsCol.deleteOne({ hash });
      throw error;
    }

    return NextResponse.json({ inserted: result.insertedCount, bank });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

function duplicate(fileName: string | undefined, uploadedAt: Date) {
  return NextResponse.json(
    { duplicate: true, fileName, uploadedAt, error: "This statement was already uploaded" },
    { status: 409 },
  );
}
