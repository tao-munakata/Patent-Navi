import OpenAI from "openai";
import { NextResponse } from "next/server";
import { buildSearchLinks } from "@/lib/search-links";
import { generatedSearchPlanJsonSchema } from "@/lib/schemas";
import { generateFallbackPlan } from "@/lib/mock-generators";
import { buildPlanPrompt } from "@/lib/prompts";
import type { GeneratedSearchPlan, IdeaInput } from "@/types/patent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = (await request.json()) as IdeaInput;

  if (!input.functionSummary?.trim()) {
    return NextResponse.json({ error: "機能概要を入力してください。" }, { status: 400 });
  }

  const { plan, source } = await generatePlan(input);
  const links = buildSearchLinks(plan);

  return NextResponse.json({
    plan,
    links,
    source,
  });
}

async function generatePlan(input: IdeaInput): Promise<{ plan: GeneratedSearchPlan; source: "openai" | "fallback" }> {
  if (!process.env.OPENAI_API_KEY) {
    return { plan: generateFallbackPlan(input), source: "fallback" };
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "あなたは特許一次調査のための検索計画を作るアシスタントです。法的判断は断定せず、必ず JSON schema に従って出力してください。",
        },
        { role: "user", content: buildPlanPrompt(input) },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "generated_search_plan",
          strict: true,
          schema: generatedSearchPlanJsonSchema,
        },
      },
    });

    const outputText = response.output_text;
    return { plan: JSON.parse(outputText) as GeneratedSearchPlan, source: "openai" };
  } catch (error) {
    console.error("OpenAI plan generation failed. Falling back.", error);
    return { plan: generateFallbackPlan(input), source: "fallback" };
  }
}
