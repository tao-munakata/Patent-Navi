export const generatedSearchPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "keywords",
    "functionalTerms",
    "actionTerms",
    "searchAxes",
    "classificationHints",
    "searchQueries",
    "checklist",
    "warnings",
  ],
  properties: {
    summary: {
      type: "object",
      additionalProperties: false,
      required: ["title", "plainDescription", "assumptions", "nonLegalNotice"],
      properties: {
        title: { type: "string" },
        plainDescription: { type: "string" },
        assumptions: { type: "array", items: { type: "string" } },
        nonLegalNotice: { type: "string" },
      },
    },
    keywords: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "language", "category", "aliases", "english", "reason", "includeByDefault"],
        properties: {
          term: { type: "string" },
          language: { type: "string", enum: ["ja", "en", "mixed"] },
          category: {
            type: "string",
            enum: ["technical", "component", "problem", "effect", "usage", "assignee", "noise"],
          },
          aliases: { type: "array", items: { type: "string" } },
          english: { type: "array", items: { type: "string" } },
          reason: { type: "string" },
          includeByDefault: { type: "boolean" },
        },
      },
    },
    functionalTerms: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["plainTerm", "patentTerm", "reason"],
        properties: {
          plainTerm: { type: "string" },
          patentTerm: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
    actionTerms: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "examples", "reason"],
        properties: {
          term: { type: "string" },
          examples: { type: "array", items: { type: "string" } },
          reason: { type: "string" },
        },
      },
    },
    searchAxes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["axis", "queryIntent", "recommendedTerms", "notes"],
        properties: {
          axis: { type: "string" },
          queryIntent: { type: "string" },
          recommendedTerms: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
        },
      },
    },
    classificationHints: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "viewpoint", "instruction", "confidence"],
        properties: {
          type: { type: "string" },
          viewpoint: { type: "string" },
          instruction: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    searchQueries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "query", "targetSites"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          query: { type: "string" },
          targetSites: {
            type: "array",
            items: { type: "string", enum: ["google_patents", "j_platpat", "espacenet"] },
          },
        },
      },
    },
    checklist: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["item", "reason"],
        properties: {
          item: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
} as const;

export const patentAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "sourceSummary",
    "claimElements",
    "comparisonTable",
    "designAroundIdeas",
    "riskNotes",
    "expertQuestions",
  ],
  properties: {
    sourceSummary: {
      type: "object",
      additionalProperties: false,
      required: ["publicationNumber", "assignee", "documentType", "nonLegalNotice"],
      properties: {
        publicationNumber: { type: "string" },
        assignee: { type: "string" },
        documentType: { type: "string" },
        nonLegalNotice: { type: "string" },
      },
    },
    claimElements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "text", "plainMeaning", "elementType"],
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          plainMeaning: { type: "string" },
          elementType: {
            type: "string",
            enum: ["input", "processing", "output", "structure", "condition", "other"],
          },
        },
      },
    },
    comparisonTable: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["elementId", "userProductFeature", "status", "reason", "questionsForExpert"],
        properties: {
          elementId: { type: "string" },
          userProductFeature: { type: "string" },
          status: { type: "string", enum: ["要確認", "低そう", "不明", "対象外かも"] },
          reason: { type: "string" },
          questionsForExpert: { type: "array", items: { type: "string" } },
        },
      },
    },
    designAroundIdeas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "idea",
          "approach",
          "expectedEffect",
          "difficulty",
          "businessImpact",
          "needsFurtherSearch",
        ],
        properties: {
          idea: { type: "string" },
          approach: { type: "string" },
          expectedEffect: { type: "string" },
          difficulty: { type: "string", enum: ["low", "medium", "high"] },
          businessImpact: { type: "string" },
          needsFurtherSearch: { type: "boolean" },
        },
      },
    },
    riskNotes: { type: "array", items: { type: "string" } },
    expertQuestions: { type: "array", items: { type: "string" } },
  },
} as const;
