import { NextResponse } from "next/server";
import { linkLegacyRows, orphanFilter, transactions } from "@/lib/collections";

/** Delete transactions that belong to no statement. */
export async function DELETE() {
  try {
    await linkLegacyRows();
    const result = await (await transactions()).deleteMany(await orphanFilter());
    return NextResponse.json({ deletedTransactions: result.deletedCount });
  } catch (error) {
    console.error("Clear orphans failed:", error);
    return NextResponse.json({ error: "Clear failed" }, { status: 500 });
  }
}
