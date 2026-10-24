import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { linkLegacyRows, transactions } from "@/lib/collections";
import { labelWithFallback } from "@/lib/categorizer";

/** Re-label every transaction of one statement (Gemini, falling back to the mock). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    await linkLegacyRows();
    const col = await transactions();
    const rows = await col.find({ uploadId: new ObjectId(id) }).toArray();
    if (rows.length === 0) return NextResponse.json({ categorized: 0 });

    const { labels, source } = await labelWithFallback(
      rows.map((t) => ({
        description: t.description ?? "",
        amount: t.type === "expense" ? -t.amount : t.amount,
        currency: t.currency ?? "GBP",
      })),
    );
    const now = new Date();
    await col.bulkWrite(
      rows.map((t, i) => ({
        updateOne: {
          filter: { _id: t._id },
          update: {
            $set: {
              category: labels[i].category,
              necessity: labels[i].necessity,
              labelSource: source,
              updatedAt: now,
            },
          },
        },
      })),
    );
    return NextResponse.json({ categorized: rows.length, source });
  } catch (error) {
    console.error("Recategorize failed:", error);
    return NextResponse.json({ error: "Recategorize failed" }, { status: 500 });
  }
}
