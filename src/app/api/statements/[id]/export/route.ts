import { ObjectId } from "mongodb";
import { linkLegacyRows, transactions, uploads } from "@/lib/collections";

const cell = (value: string | number | undefined) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Download one statement's categorized transactions as CSV. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return new Response("Invalid id", { status: 400 });
  const _id = new ObjectId(id);

  await linkLegacyRows();
  const upload = await (await uploads()).findOne({ _id });
  if (!upload) return new Response("Statement not found", { status: 404 });

  const rows = await (await transactions()).find({ uploadId: _id }).sort({ date: 1 }).toArray();
  const lines = [
    "Date,Description,Category,Necessity,Type,Amount,Currency",
    ...rows.map((t) =>
      [
        t.date.toISOString().slice(0, 10),
        t.description,
        t.category,
        t.necessity,
        t.type,
        (t.type === "expense" ? -t.amount : t.amount).toFixed(2),
        t.currency,
      ]
        .map(cell)
        .join(","),
    ),
  ];
  const name = (upload.fileName ?? "statement").replace(/\.csv$/i, "").replace(/[^\w.-]+/g, "_");
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-categorized.csv"`,
    },
  });
}
