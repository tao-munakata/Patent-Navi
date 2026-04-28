export type SearchSite = "google_patents" | "j_platpat" | "espacenet";

export type IdeaInput = {
  functionSummary: string;
  problemToSolve: string;
  usageScene: string;
  components: string;
  competitors: string;
};

export type Keyword = {
  term: string;
  language: "ja" | "en" | "mixed";
  category: "technical" | "component" | "problem" | "effect" | "usage" | "assignee" | "noise";
  aliases: string[];
  english: string[];
  reason: string;
  includeByDefault: boolean;
};

export type FunctionalTerm = {
  plainTerm: string;
  patentTerm: string;
  reason: string;
};

export type ActionTerm = {
  term: string;
  examples: string[];
  reason: string;
};

export type SearchAxis = {
  axis: string;
  queryIntent: string;
  recommendedTerms: string[];
  notes: string;
};

export type ClassificationHint = {
  type: string;
  viewpoint: string;
  instruction: string;
  confidence: "low" | "medium" | "high";
};

export type SearchQuery = {
  id: string;
  label: string;
  query: string;
  targetSites: SearchSite[];
};

export type ChecklistItem = {
  item: string;
  reason: string;
};

export type GeneratedSearchPlan = {
  summary: {
    title: string;
    plainDescription: string;
    assumptions: string[];
    nonLegalNotice: string;
  };
  keywords: Keyword[];
  functionalTerms: FunctionalTerm[];
  actionTerms: ActionTerm[];
  searchAxes: SearchAxis[];
  classificationHints: ClassificationHint[];
  searchQueries: SearchQuery[];
  checklist: ChecklistItem[];
  warnings: string[];
};

export type SearchLink = {
  site: SearchSite;
  label: string;
  url: string;
  query: string;
  copyText: string;
  guidance: string;
};

export type PatentAnalysisRequest = {
  projectSummary: string;
  publicationNumber: string;
  assignee: string;
  abstractText: string;
  claimText: string;
  userConcern: string;
};

export type PatentAnalysis = {
  sourceSummary: {
    publicationNumber: string;
    assignee: string;
    documentType: string;
    nonLegalNotice: string;
  };
  claimElements: Array<{
    id: string;
    text: string;
    plainMeaning: string;
    elementType: "input" | "processing" | "output" | "structure" | "condition" | "other";
  }>;
  comparisonTable: Array<{
    elementId: string;
    userProductFeature: string;
    status: "要確認" | "低そう" | "不明" | "対象外かも";
    reason: string;
    questionsForExpert: string[];
  }>;
  designAroundIdeas: Array<{
    idea: string;
    approach: string;
    expectedEffect: string;
    difficulty: "low" | "medium" | "high";
    businessImpact: string;
    needsFurtherSearch: boolean;
  }>;
  riskNotes: string[];
  expertQuestions: string[];
};
