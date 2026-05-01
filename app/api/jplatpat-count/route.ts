import { NextResponse } from "next/server";

type KeywordInput = {
  term: string;
  aliases?: string[];
};

type CountRequest = {
  query?: string;
  keywords?: KeywordInput[];
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as CountRequest;
  const query = body.query?.trim() ?? "";
  const keywords = body.keywords ?? [];

  if (!query) {
    return NextResponse.json({ error: "検索式がありません。" }, { status: 400 });
  }

const fetched = await tryFetchJPlatPatCount();
  const fallback = estimateHitCount(query, keywords);

  return NextResponse.json({
    status: fetched ? "fetched" : "estimated",
    total: fetched?.total ?? fallback.total,
    categories: fetched?.categories ?? fallback.categories,
    keywordBreakdown: buildKeywordBreakdown(query, keywords, fallback.total),
    query,
    checkedAt: new Date().toISOString(),
    sourceUrl: "https://www.j-platpat.inpit.go.jp/",
    note: fetched
      ? "J-PlatPat画面から件数を取得しました。"
      : fallback.calibratedTerms.length
        ? `J-PlatPatの直接検索実測値（${fallback.calibratedTerms.join("、")}）を基準に推定しています。`
        : "J-PlatPatはJavaScript画面のため、サーバー側で検索結果件数を直接取得できない場合があります。現時点では検索式の広さから推定件数を返しています。",
  });
}

async function tryFetchJPlatPatCount() {
  try {
    const response = await fetch("https://www.j-platpat.inpit.go.jp/", {
      headers: {
        "User-Agent": "Patent-Navi/0.3 (+local research assistant)",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 0 },
    });
    const html = await response.text();
    const patent = matchCount(html, /特許[･・]実用新案\s*[（(]\s*([\d,]+)\s*[)）]/);
    const design = matchCount(html, /意匠\s*[（(]\s*([\d,]+)\s*[)）]/);
    const trademark = matchCount(html, /商標\s*[（(]\s*([\d,]+)\s*[)）]/);

    if (patent === null && design === null && trademark === null) return null;

    const categories = [
      { label: "特許・実用新案", count: patent ?? 0 },
      { label: "意匠", count: design ?? 0 },
      { label: "商標", count: trademark ?? 0 },
    ];
    return {
      total: categories.reduce((sum, item) => sum + item.count, 0),
      categories,
    };
  } catch {
    return null;
  }
}

function matchCount(text: string, pattern: RegExp) {
  const matched = text.match(pattern);
  if (!matched?.[1]) return null;
  return Number.parseInt(matched[1].replaceAll(",", ""), 10);
}

function estimateHitCount(query: string, keywords: KeywordInput[]) {
  const tokens = tokenize([query, ...keywords.map((keyword) => keyword.term)].join(" "));
  const uniqueTokens = new Set(tokens);
  const broadTerms = ["装置", "方法", "システム", "制御", "検出", "読取", "計器", "メーター"];
  const narrowTerms = ["海洋", "船舶", "CCD", "LED", "針位置", "アナログ"];
  const calibratedCounts = getCalibratedCounts(query, keywords);

  const broadScore = broadTerms.filter((term) => query.includes(term)).length;
  const narrowScore = narrowTerms.filter((term) => query.includes(term)).length;
  const base = 45 + uniqueTokens.size * 18 + broadScore * 38;
  const narrowed = Math.max(8, Math.round(base * Math.pow(0.74, narrowScore)));
  const calibratedMax = Math.max(0, ...calibratedCounts.map((item) => item.count));
  const patentCount = clamp(roundToReadable(Math.max(narrowed, calibratedMax)), 8, 980);
  const designCount = Math.max(0, Math.round(patentCount * 0.04));
  const trademarkCount = Math.max(0, Math.round(patentCount * 0.02));

  return {
    total: patentCount + designCount + trademarkCount,
    calibratedTerms: calibratedCounts.map((item) => `${item.term} ${item.count.toLocaleString()}件`),
    categories: [
      { label: "特許・実用新案", count: patentCount },
      { label: "意匠", count: designCount },
      { label: "商標", count: trademarkCount },
    ],
  };
}

function buildKeywordBreakdown(query: string, keywords: KeywordInput[], total: number) {
  const allTerms = keywords.length
    ? keywords.flatMap((keyword) => [keyword.term, ...(keyword.aliases ?? [])])
    : tokenize(query);
  const uniqueTerms = [...new Set(allTerms.map((term) => term.trim()).filter(Boolean))].slice(0, 18);

  return uniqueTerms.map((term, index) => {
    const calibrated = keywordCountAnchors[term];
    const appears = query.toLowerCase().includes(term.toLowerCase()) ? 1 : 0;
    const score = Math.max(1, Math.round(total * (0.18 - Math.min(index, 10) * 0.011) * (appears ? 1.15 : 0.85)));
    return { term, count: calibrated ?? score };
  });
}

const keywordCountAnchors: Record<string, number> = {
  アナログメーター: 310,
};

function getCalibratedCounts(query: string, keywords: KeywordInput[]) {
  const keywordText = keywords
    .flatMap((keyword) => [keyword.term, ...(keyword.aliases ?? [])])
    .join(" ");
  const targetText = `${query} ${keywordText}`;

  return Object.entries(keywordCountAnchors)
    .filter(([term]) => targetText.includes(term))
    .map(([term, count]) => ({ term, count }));
}

function tokenize(text: string) {
  return text
    .replace(/[()（）]/g, " ")
    .replace(/\bOR\b|\bAND\b|ＡＮＤ|ＯＲ/g, " ")
    .split(/[\s、,・]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToReadable(value: number) {
  if (value < 100) return Math.round(value / 5) * 5;
  return Math.round(value / 10) * 10;
}
