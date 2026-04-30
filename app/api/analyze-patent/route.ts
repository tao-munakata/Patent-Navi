import OpenAI from "openai";
import { NextResponse } from "next/server";
import { generateFallbackAnalysis } from "@/lib/mock-generators";
import { buildAnalysisPrompt } from "@/lib/prompts";
import { patentAnalysisJsonSchema } from "@/lib/schemas";
import type { PatentAnalysis, PatentAnalysisRequest } from "@/types/patent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = (await request.json()) as PatentAnalysisRequest;

  if (!input.claimText?.trim() && !input.abstractText?.trim()) {
    return NextResponse.json({ error: "請求項または要約を入力してください。" }, { status: 400 });
  }

  const { analysis, source } = await analyzePatent(input);

  return NextResponse.json({
    analysis,
    source,
  });
}

async function analyzePatent(
  input: PatentAnalysisRequest,
): Promise<{ analysis: PatentAnalysis; source: "openai" | "fallback" }> {
  if (!process.env.OPENAI_API_KEY) {
    return { analysis: generateFallbackAnalysis(input), source: "fallback" };
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "あなたは特許一次調査のために請求項を整理するアシスタントです。法的判断、侵害有無、実施可否は断定せず、必ず JSON schema に従って出力してください。",
        },
        { role: "user", content: buildAnalysisPrompt(input) },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "patent_analysis",
          strict: true,
          schema: patentAnalysisJsonSchema,
        },
      },
    });

    return { analysis: JSON.parse(response.output_text) as PatentAnalysis, source: "openai" };
  } catch (error) {
    console.error("OpenAI patent analysis failed. Falling back.", error);
    return { analysis: generateFallbackAnalysis(input), source: "fallback" };
  }
}
