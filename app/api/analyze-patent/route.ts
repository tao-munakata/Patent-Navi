import { NextResponse } from "next/server";
import { generateFallbackAnalysis } from "@/lib/mock-generators";
import type { PatentAnalysisRequest } from "@/types/patent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = (await request.json()) as PatentAnalysisRequest;

  if (!input.claimText?.trim() && !input.abstractText?.trim()) {
    return NextResponse.json({ error: "請求項または要約を入力してください。" }, { status: 400 });
  }

  return NextResponse.json({
    analysis: generateFallbackAnalysis(input),
    source: "fallback",
  });
}
