import { NextResponse } from "next/server";
import { fetchJpoPatent } from "@/lib/jpo-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { patentNumber } = (await request.json()) as { patentNumber?: string };

  if (!patentNumber?.trim()) {
    return NextResponse.json({ error: "特許番号を入力してください。" }, { status: 400 });
  }

  try {
    const detail = await fetchJpoPatent(patentNumber.trim());
    return NextResponse.json({ detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "JPO API エラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
