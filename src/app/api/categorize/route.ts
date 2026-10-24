import { NextResponse } from "next/server";
import { transactions } from "@/lib/collections";
import { labelWithFallback } from "@/lib/categorizer";

export async function POST() {
  try {
    const col = await transactions();

    // Read unlabelled rows (and earlier mock-labelled ones) back from Mongo,
    // then label them with Gemini, falling back to the mock if it fails.
    const pending = await col
      .find({ $or: [{ necessity: { $exists: false } }, { labelSource: "mock" }] })
      .toArray();
    if (pending.length === 0) {
      return NextResponse.json({ categorized: 0 });
    }

    const { labels, source } = await labelWithFallback(
      pending.map((t) => ({
        description: t.description ?? "",
        amount: t.type === "expense" ? -t.amount : t.amount,
        currency: t.currency ?? "GBP",
      })),
    );

    const now = new Date();
    const result = await col.bulkWrite(
      pending.map((t, i) => ({
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

    return NextResponse.json({ categorized: result.modifiedCount, source });
  } catch (error) {
    console.error("Categorize failed:", error);
    return NextResponse.json({ error: "Categorize failed" }, { status: 500 });
  }
}
