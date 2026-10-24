import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { linkLegacyRows, orphanFilter, transactions, uploads } from "@/lib/collections";

/** Delete a statement and every transaction that came from it. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const _id = new ObjectId(id);
  try {
    await linkLegacyRows();
    const removed = await (await uploads()).deleteOne({ _id });
    if (removed.deletedCount === 0) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }
    // Its rows go too, along with any leftovers from statements deleted earlier.
    const col = await transactions();
    const rows = await col.deleteMany({ uploadId: _id });
    const leftovers = await col.deleteMany(await orphanFilter());
    return NextResponse.json({ deletedTransactions: rows.deletedCount + leftovers.deletedCount });
  } catch (error) {
    console.error("Delete statement failed:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
