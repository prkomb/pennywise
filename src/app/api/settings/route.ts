import { NextResponse } from "next/server";
import { saveSettings, settingsInput } from "@/lib/settings";

export async function PUT(req: Request) {
  const parsed = settingsInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid settings" },
      { status: 400 },
    );
  }
  try {
    await saveSettings(parsed.data);
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Save settings failed:", error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
