import type {
  GeneratedSearchPlan,
  IdeaInput,
  PatentAnalysis,
  PatentAnalysisRequest,
  SearchLink,
} from "@/types/patent";

export function buildResearchMarkdown(args: {
  input: IdeaInput;
  plan: GeneratedSearchPlan | null;
  links: SearchLink[];
  analysisRequest: PatentAnalysisRequest;
  analysis: PatentAnalysis | null;
}): string {
  const { input, plan, links, analysisRequest, analysis } = args;

  return [
    "# 特許一次調査メモ",
    "",
    `生成日時: ${new Date().toLocaleString("ja-JP")}`,
    "",
    "## 入力内容",
    "",
    `- 機能概要: ${input.functionSummary || "未入力"}`,
    `- 解決したい課題: ${input.problemToSolve || "未入力"}`,
    `- 利用シーン・業界: ${input.usageScene || "未入力"}`,
    `- 部品・技術: ${input.components || "未入力"}`,
    `- 競合製品・企業: ${input.competitors || "未入力"}`,
    "",
    "## 生成キーワード",
    "",
    ...(plan ? plan.keywords.map((keyword) => `- ${keyword.term}: ${keyword.reason}`) : ["- 未生成"]),
    "",
    "## 検索リンク",
    "",
    ...(links.length
      ? links.map((link) => `- ${link.label}: ${link.url}\n  - 検索式: ${link.query}`)
      : ["- 未生成"]),
    "",
    "## チェックリスト",
    "",
    ...(plan ? plan.checklist.map((item) => `- [ ] ${item.item}`) : ["- [ ] 未生成"]),
    "",
    "## 特許分析メモ",
    "",
    `- 公開番号・特許番号: ${analysisRequest.publicationNumber || "未入力"}`,
    `- 出願人: ${analysisRequest.assignee || "未入力"}`,
    "",
    "### 構成要素",
    "",
    ...(analysis
      ? analysis.claimElements.map((element) => `- ${element.id} ${element.text}: ${element.plainMeaning}`)
      : ["- 未分析"]),
    "",
    "### 回避設計案",
    "",
    ...(analysis
      ? analysis.designAroundIdeas.map((idea) => `- ${idea.idea}: ${idea.expectedEffect}`)
      : ["- 未分析"]),
    "",
    "## 注意",
    "",
    "このメモは特許調査の観点整理であり、法的判断や鑑定ではありません。",
  ].join("\n");
}
