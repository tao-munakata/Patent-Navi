import type { IdeaInput, PatentAnalysisRequest } from "@/types/patent";

export function buildPlanPrompt(input: IdeaInput): string {
  return [
    "次の事業・製品アイデアについて、特許一次調査のための検索計画を JSON で作成してください。",
    "法的判断、侵害有無、実施可否は断定しないでください。",
    "出力は検索語、調査軸、確認項目、外部検索サイトで使う検索式に限定してください。",
    "",
    `機能概要: ${input.functionSummary}`,
    `解決したい課題: ${input.problemToSolve}`,
    `利用シーン・業界: ${input.usageScene}`,
    `具体的な部品・技術: ${input.components}`,
    `競合製品・企業: ${input.competitors}`,
  ].join("\n");
}

export function buildAnalysisPrompt(input: PatentAnalysisRequest): string {
  return [
    "次の特許情報を、一次調査の観点整理として JSON で分析してください。",
    "侵害している、侵害していない、実施できる、法的に問題ない、とは断定しないでください。",
    "構成要素、自社アイデアとの対応確認、回避設計案、専門家への質問に分けてください。",
    "",
    `調査対象アイデア: ${input.projectSummary}`,
    `公開番号・特許番号: ${input.publicationNumber}`,
    `出願人: ${input.assignee}`,
    `要約: ${input.abstractText}`,
    `請求項: ${input.claimText}`,
    `気になる点: ${input.userConcern}`,
  ].join("\n");
}
