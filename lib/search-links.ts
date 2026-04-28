import type { GeneratedSearchPlan, SearchLink, SearchSite } from "@/types/patent";

export function buildGooglePatentsUrl(query: string): string {
  return `https://patents.google.com/?q=${encodeURIComponent(query)}`;
}

export function buildEspacenetUrl(query: string): string {
  return `https://worldwide.espacenet.com/patent/search?q=${encodeURIComponent(query)}`;
}

export function buildJPlatPatUrl(): string {
  return "https://www.j-platpat.inpit.go.jp/";
}

export function buildSearchLinks(plan: GeneratedSearchPlan): SearchLink[] {
  return plan.searchQueries.flatMap((query) =>
    query.targetSites.map((site) => buildSearchLink(site, query.label, query.query)),
  );
}

function buildSearchLink(site: SearchSite, label: string, query: string): SearchLink {
  if (site === "google_patents") {
    return {
      site,
      label: `${label} - Google Patents`,
      url: buildGooglePatentsUrl(query),
      query,
      copyText: query,
      guidance: "技術語、英語、図面確認を含めて広く調べます。",
    };
  }

  if (site === "espacenet") {
    return {
      site,
      label: `${label} - Espacenet`,
      url: buildEspacenetUrl(query),
      query,
      copyText: query,
      guidance: "欧州、米国、中国を含む海外文献の入口として使います。",
    };
  }

  return {
    site,
    label: `${label} - J-PlatPat`,
    url: buildJPlatPatUrl(),
    query,
    copyText: query,
    guidance: "検索式をコピーし、特許・実用新案検索に貼り付けて使います。",
  };
}
