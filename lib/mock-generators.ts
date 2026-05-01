import type {
  GeneratedSearchPlan,
  IdeaInput,
  PatentAnalysis,
  PatentAnalysisRequest,
} from "@/types/patent";

const nonLegalNotice =
  "以下は特許調査の観点整理であり、権利侵害や実施可否の判断ではありません。";

export function generateFallbackPlan(input: IdeaInput): GeneratedSearchPlan {
  const text = `${input.functionSummary}\n${input.problemToSolve}\n${input.components}`;
  const hasCamera = /カメラ|画像|映像|撮像/.test(text);
  const hasAi = /AI|推定|検出|認識|解析/.test(text);
  const hasAlert = /通知|警告|アラート|報知/.test(text);
  const hasDrone = /ドローン|無人機|移動体|ロボット/.test(text);
  const hasInspection = /点検|検査|監視|診断/.test(text);
  const hasDamage = /ひび|亀裂|損傷|異常|劣化|欠陥/.test(text);
  const hasReadout = /読取|読み取り|数値化|針/.test(text);
  const industryTerms = input.usageScene
    .split(/[、,\n]/)
    .map((term) => term.trim())
    .filter(Boolean);
  const componentTerms = input.components
    .split(/[、,\n]/)
    .map((term) => term.trim())
    .filter(Boolean);
  const extractedTerms = unique([
    ...componentTerms,
    ...domainSpecificTerms(text),
    ...extractImportantTerms(input.functionSummary),
    ...industryTerms,
  ]).slice(0, 8);
  const mainTerm = extractedTerms[0] || "対象技術";
  const actionTerm = hasDamage ? "異常検出" : hasReadout ? "読取・数値化" : hasInspection ? "点検支援" : hasAi ? "判定処理" : "技術処理";
  const outputTerm = hasAlert ? "通知" : hasInspection ? "点検結果出力" : "出力";
  const shouldAddActionKeyword = hasDamage || hasReadout || hasInspection || hasAi || hasAlert;

  const keywords: GeneratedSearchPlan["keywords"] = [
    {
      term: mainTerm,
      language: "ja",
      category: "technical",
      aliases: unique([mainTerm, `${mainTerm}システム`, `${mainTerm}装置`]),
      english: englishHints(mainTerm),
      reason: "入力された機能概要・部品から見た中心語として検索に使えます。",
      includeByDefault: true,
    },
  ];

  if (shouldAddActionKeyword) {
    keywords.push({
      term: actionTerm,
      language: "ja",
      category: "effect",
      aliases: unique(["検出", "判定", "識別", "抽出", actionTerm]),
      english: englishHints(actionTerm),
      reason: "製品名ではなく、作用・動作から検索するための語です。",
      includeByDefault: true,
    });
  }

  if (industryTerms.length) {
    keywords.push({
      term: industryTerms[0] || "用途",
      language: "ja",
      category: "usage",
      aliases: industryTerms.length ? industryTerms : ["利用シーン", "用途", "適用分野"],
      english: englishHints(industryTerms[0] || "use case"),
      reason: "用途特許や業界限定の権利を拾う軸になります。",
      includeByDefault: true,
    });
  }

  for (const term of extractedTerms.slice(1, 5)) {
    keywords.push({
      term,
      language: "ja",
      category: "component",
      aliases: unique([term, `${term}手段`, `${term}部`]),
      english: englishHints(term),
      reason: "構成要素または関連技術として、請求項中の表現を探すために使えます。",
      includeByDefault: true,
    });
  }

  if (hasCamera) {
    keywords.push({
      term: "撮像手段",
      language: "ja",
      category: "component",
      aliases: ["画像取得手段", "カメラ", "撮影部"],
      english: ["imaging unit", "image acquisition unit"],
      reason: "特許ではカメラを広く表す言葉として使われることがあります。",
      includeByDefault: true,
    });
  }

  if (hasAi) {
    keywords.push({
      term: "判定手段",
      language: "ja",
      category: "component",
      aliases: ["推定手段", "検出手段", "識別手段"],
      english: ["determination unit", "estimation unit", "detection unit"],
      reason: "AI 処理を機能として広く表現した検索語です。",
      includeByDefault: true,
    });
  }

  if (hasAlert) {
    keywords.push({
      term: "報知手段",
      language: "ja",
      category: "component",
      aliases: ["通知手段", "警告手段", "アラート出力"],
      english: ["notification unit", "warning unit", "alert output"],
      reason: "通知・警告に関する特許表現として検索できます。",
      includeByDefault: true,
    });
  }

  if (hasDrone) {
    keywords.push({
      term: "移動体",
      language: "ja",
      category: "component",
      aliases: ["無人機", "ドローン", "ロボット", "走行体"],
      english: ["mobile body", "drone", "unmanned vehicle", "robot"],
      reason: "ドローン等を特許で広く表す機能的・上位概念の語です。",
      includeByDefault: true,
    });
  }

  if (hasInspection || hasDamage) {
    keywords.push({
      term: "損傷判定",
      language: "ja",
      category: "technical",
      aliases: ["欠陥検出", "異常検出", "劣化診断", "ひび割れ検出"],
      english: ["damage detection", "defect detection", "crack detection", "inspection"],
      reason: "点検・検査系の特許で、目的や処理内容から検索するために使えます。",
      includeByDefault: true,
    });
  }

  const usagePart = industryTerms.slice(0, 3).join(" OR ");
  const technicalTerms = unique([
    mainTerm,
    ...extractedTerms.slice(1, 4),
    hasCamera ? "撮像手段" : "",
    hasAi ? "判定手段" : "",
    hasDrone ? "移動体" : "",
  ].filter(Boolean));
  const actionTerms = shouldAddActionKeyword ? unique([
    actionTerm,
    hasDamage ? "損傷判定" : "",
    hasInspection ? "点検" : "",
    hasAlert ? "通知" : outputTerm,
  ].filter(Boolean)) : [];
  const broadQuery = actionTerms.length
    ? `(${technicalTerms.slice(0, 4).join(" OR ")}) (${actionTerms.slice(0, 4).join(" OR ")})`
    : technicalTerms.slice(0, 4).join(" OR ");
  const englishQuery = englishHints(mainTerm)
    .concat(shouldAddActionKeyword ? englishHints(actionTerm) : [])
    .slice(0, 5)
    .join(" ");
  const functionalQuery = actionTerms.length
    ? `(${functionalizeTerms(technicalTerms).slice(0, 5).join(" OR ")}) (${functionalizeTerms(actionTerms).slice(0, 4).join(" OR ")})`
    : functionalizeTerms(technicalTerms).slice(0, 5).join(" OR ");
  const usageSearchQueries: GeneratedSearchPlan["searchQueries"] = usagePart
    ? [
        {
          id: "usage_specific",
          label: "用途特許を探す",
          query: `(${technicalTerms.slice(0, 3).join(" OR ")}) (${usagePart})`,
          targetSites: ["google_patents", "j_platpat"],
        },
      ]
    : [];

  return {
    summary: {
      title: createTitle(input.functionSummary),
      plainDescription: input.functionSummary,
      assumptions: [
        "入力文から主要な構成要素と作用を簡易抽出しています。",
        "AI API 未接続時のフォールバック生成のため、専門語の網羅性は限定的です。",
      ],
      nonLegalNotice,
    },
    keywords,
    functionalTerms: [
      ...technicalTerms.slice(0, 5).map((term) => ({
        plainTerm: term,
        patentTerm: toFunctionalTerm(term),
        reason: "具体名だけでなく、特許で使われやすい広い機能表現でも検索するため。",
      })),
    ],
    actionTerms: shouldAddActionKeyword
      ? [
          {
            term: actionTerm,
            examples: ["判定", "推定", "抽出", "識別"],
            reason: "製品名ではなく処理動作から検索するため。",
          },
          {
            term: outputTerm,
            examples: ["警告", "報知", "出力", "提示"],
            reason: "処理結果の出し方を広く拾うため。",
          },
        ]
      : [],
    searchAxes: [
      {
        axis: "技術構成",
        queryIntent: `${technicalTerms.slice(0, 4).join("、")} の組み合わせで探す`,
        recommendedTerms: technicalTerms.slice(0, 5),
        notes: "構成要素が似た特許を探します。",
      },
      ...(shouldAddActionKeyword || input.problemToSolve
        ? [
            {
              axis: "課題・効果",
              queryIntent: input.problemToSolve || `${actionTerm} による課題解決の観点で探す`,
              recommendedTerms: actionTerms.slice(0, 5),
              notes: "目的や効果が近い特許を拾う軸です。",
            },
          ]
        : []),
      ...(industryTerms.length
        ? [
            {
              axis: "用途",
              queryIntent: `${industryTerms.join("、")} に限定された用途特許を確認する`,
              recommendedTerms: industryTerms,
              notes: "異業種の用途特許を見落とさないための軸です。",
            },
          ]
        : []),
    ],
    classificationHints: [
      {
        type: "FI_OR_F_TERM_VIEWPOINT",
        viewpoint: unique([
          mainTerm,
          shouldAddActionKeyword ? actionTerm : "",
          ...industryTerms,
          hasCamera ? "画像認識" : "",
          hasInspection ? "点検" : "",
        ].filter(Boolean)).join("、"),
        instruction:
          "J-PlatPat ではキーワード検索後に FI/F タームを確認し、目的・効果の観点で絞り込む。",
        confidence: "medium",
      },
    ],
    searchQueries: [
      {
        id: "broad_technical_ja",
        label: "日本語で広く探す",
        query: broadQuery,
        targetSites: ["google_patents", "j_platpat"],
      },
      {
        id: "global_technical_en",
        label: "英語で海外も探す",
        query: englishQuery || mainTerm,
        targetSites: ["google_patents", "espacenet"],
      },
      {
        id: "functional_claim",
        label: "機能的表現で探す",
        query: functionalQuery,
        targetSites: ["google_patents", "j_platpat"],
      },
      ...usageSearchQueries,
    ],
    checklist: [
      {
        item: `請求項に、${technicalTerms.slice(0, 4).join("、")} の各要素が含まれるか確認する。`,
        reason: "構成要素ごとの対応関係を整理するため。",
      },
      {
        item: `用途が ${industryTerms.join("、") || "特定業界"} に限定されていないか確認する。`,
        reason: "用途特許の範囲を確認するため。",
      },
      {
        item: "権利状態、存続期間、国を原典で確認する。",
        reason: "検索結果だけでは権利状態を判断できないため。",
      },
      {
        item: "構成要素の削除、置換、処理順序変更で差異を作れるか検討する。",
        reason: "回避設計の候補を作るため。",
      },
    ],
    warnings: ["検索結果の権利状態や有効期間は必ず原典で確認してください。"],
  };
}

function extractImportantTerms(text: string): string[] {
  const stopwords = [
    "こと",
    "もの",
    "場所",
    "場合",
    "早期",
    "効率化",
    "もう一度",
    "しゃべる",
    "しゃべって",
    "話す",
    "話して",
    "録音",
    "文字起こし",
    "テキスト",
    "特許",
    "検索",
    "単語",
    "キーワード",
    "できる",
    "したい",
    "なるかも",
  ];

  return text
    .replace(/[。、．，,]/g, " ")
    .split(/\s|から|で|を|に|の|する|して|したい|できる|による|ため|とし|として|けど|だから|それで|これは|あれは/g)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .filter((term) => !stopwords.includes(term));
}

function domainSpecificTerms(text: string): string[] {
  const terms: string[] = [];
  if (/アナログメーター|メータ|メーター/.test(text)) terms.push("アナログメーター");
  if (/計器/.test(text)) terms.push("計器");
  if (/LED/.test(text)) terms.push("LED", "光源");
  if (/CCD/.test(text)) terms.push("CCD", "撮像素子");
  if (/針/.test(text)) terms.push("針位置");
  if (/読取|読み取り/.test(text)) terms.push("メーター読取");
  if (/数値化/.test(text)) terms.push("数値化");
  return terms;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function createTitle(summary: string): string {
  const trimmed = summary.trim();
  if (!trimmed) return "特許一次調査プラン";
  return trimmed.length > 32 ? `${trimmed.slice(0, 32)}...` : trimmed;
}

function englishHints(term: string): string[] {
  const dictionary: Record<string, string[]> = {
    カメラ: ["camera", "imaging"],
    画像認識: ["image recognition", "computer vision"],
    画像: ["image", "imaging"],
    映像: ["video", "image"],
    水中ドローン: ["underwater drone", "underwater vehicle"],
    ドローン: ["drone", "unmanned vehicle"],
    配管: ["pipe", "piping"],
    ひび割れ: ["crack", "crack detection"],
    損傷判定: ["damage detection", "defect detection"],
    異常検出: ["anomaly detection", "abnormality detection"],
    点検: ["inspection"],
    インフラ点検: ["infrastructure inspection"],
    LED: ["LED", "light source"],
    CCD: ["CCD", "image sensor"],
    光源: ["light source"],
    撮像素子: ["image sensor"],
    アナログメーター: ["analog meter", "analog gauge"],
    計器: ["instrument", "gauge"],
    針位置: ["needle position", "pointer position"],
    メーター読取: ["meter reading", "gauge reading"],
    数値化: ["digitization", "numeric conversion"],
    "読取・数値化": ["meter reading", "digitization", "numeric conversion"],
    姿勢推定: ["pose estimation", "human pose estimation"],
    通知: ["notification", "alert"],
    報知手段: ["notification unit", "alert unit"],
    撮像手段: ["imaging unit", "image acquisition unit"],
    判定手段: ["determination unit", "detection unit"],
  };
  return dictionary[term] || [term];
}

function toFunctionalTerm(term: string): string {
  if (/カメラ|画像|映像|撮像/.test(term)) return "撮像手段";
  if (/ドローン|ロボット|移動/.test(term)) return "移動手段";
  if (/検出|判定|認識|解析|診断/.test(term)) return "判定手段";
  if (/通知|警告|アラート|出力/.test(term)) return "報知手段";
  if (/配管|構造|装置/.test(term)) return "対象物";
  return `${term}手段`;
}

function functionalizeTerms(terms: string[]): string[] {
  return unique(terms.map(toFunctionalTerm));
}

export function generateFallbackAnalysis(request: PatentAnalysisRequest): PatentAnalysis {
  return {
    sourceSummary: {
      publicationNumber: request.publicationNumber || "未入力",
      assignee: request.assignee || "未入力",
      documentType: "claim_or_abstract_text",
      nonLegalNotice,
    },
    claimElements: [
      {
        id: "E1",
        text: "作業者を撮像する撮像手段",
        plainMeaning: "カメラ等で作業者の画像を取得する要素",
        elementType: "input",
      },
      {
        id: "E2",
        text: "撮像画像から作業者の姿勢を推定する姿勢推定手段",
        plainMeaning: "画像から姿勢や骨格を推定する処理",
        elementType: "processing",
      },
      {
        id: "E3",
        text: "所定の危険条件を満たす場合の判定",
        plainMeaning: "あらかじめ決めた条件に基づき危険状態を判定する処理",
        elementType: "condition",
      },
      {
        id: "E4",
        text: "警告を出力する通知手段",
        plainMeaning: "警告、通知、振動などを出力する要素",
        elementType: "output",
      },
    ],
    comparisonTable: [
      {
        elementId: "E1",
        userProductFeature: "スマートフォンのカメラで作業者を撮影する",
        status: "要確認",
        reason: "撮像手段に対応する可能性があるため。",
        questionsForExpert: ["スマートフォン内蔵カメラが当該請求項の撮像手段に含まれるか。"],
      },
      {
        elementId: "E2",
        userProductFeature: "姿勢推定 AI で危険姿勢を検出する",
        status: "要確認",
        reason: "姿勢推定手段に対応する可能性があるため。",
        questionsForExpert: ["AI による推定方式の違いが構成上の差異になるか。"],
      },
    ],
    designAroundIdeas: [
      {
        idea: "カメラではなく装着型センサーで姿勢を検出する",
        approach: "構成要素の置換",
        expectedEffect: "撮像手段を必須とする請求項との差異を検討できます。",
        difficulty: "medium",
        businessImpact: "ユーザー装着負担が増える可能性があります。",
        needsFurtherSearch: true,
      },
      {
        idea: "端末側ではなくサーバー側で判定し、通知条件を変える",
        approach: "処理主体・制御方式の変更",
        expectedEffect: "処理手段や通知条件の構成差を作れる可能性があります。",
        difficulty: "medium",
        businessImpact: "通信遅延やクラウド費用の検討が必要です。",
        needsFurtherSearch: true,
      },
      {
        idea: "危険姿勢のリアルタイム警告ではなく、作業後の改善レポートに限定する",
        approach: "用途・タイミングの限定",
        expectedEffect: "リアルタイム警告を前提とする特許との差異を検討できます。",
        difficulty: "low",
        businessImpact: "予防効果の訴求が弱くなる可能性があります。",
        needsFurtherSearch: true,
      },
    ],
    riskNotes: ["請求項の全構成要素との対応を確認する必要があります。"],
    expertQuestions: [
      "撮像手段の範囲にスマートフォンカメラが含まれるか。",
      "危険条件の定義や判定順序が構成上どの程度重要か。",
    ],
  };
}
