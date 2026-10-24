import { NextResponse } from "next/server";
import { buildChatContext, chatInput } from "@/lib/chat";
import { loadBudgetTransactions } from "@/lib/dashboard-data";
import { chatWithAdvisor } from "@/lib/gemini";
import { loadSettings } from "@/lib/settings";

export async function POST(req: Request) {
  const parsed = chatInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });
  }
  try {
    const [txs, { plan }] = await Promise.all([loadBudgetTransactions(), loadSettings()]);
    const reply = await chatWithAdvisor(buildChatContext(txs, plan, parsed.data.month), parsed.data.messages);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat failed:", error);
    return NextResponse.json({ error: "The assistant is unavailable right now. Try again later." }, { status: 502 });
  }
}
