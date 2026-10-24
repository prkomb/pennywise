import { NextResponse } from "next/server";
import { transactions, uploads } from "@/lib/collections";

/** Delete every statement and transaction. Settings are kept. */
export async function DELETE() {
  try {
    const [tx, up] = await Promise.all([
      (await transactions()).deleteMany({}),
      (await uploads()).deleteMany({}),
    ]);
    return NextResponse.json({ deletedTransactions: tx.deletedCount, deletedStatements: up.deletedCount });
  } catch (error) {
    console.error("Delete all data failed:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
