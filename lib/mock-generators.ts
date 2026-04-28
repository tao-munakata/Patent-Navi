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
  const industryTerms = input.usageScene
    .split(/[、,\n]/)
    .map((term) => term.trim())
    .filter(Boolean);

  const keywords: GeneratedSearchPlan["keywords"] = [
    {
      term: "姿勢推定",
      language: "ja",
      category: "technical",
      aliases: ["骨格推定", "人体姿勢推定", "ポーズ推定"],
      english: ["pose estimation", "human pose estimation"],
      reason: "画像から人の姿勢を推定する中心技術として検索に使えます。",
      includeByDefault: true,
    },
    {
      term: "危険姿勢検出",
      language: "ja",
      category: "effect",
      aliases: ["異常姿勢判定", "危険動作検出", "作業姿勢判定"],
      english: ["unsafe posture detection", "ergonomic risk detection"],
      reason: "製品名ではなく、検出する状態や動作から探せます。",
      includeByDefault: true,
    },
    {
      term: "作業者安全",
      language: "ja",
      category: "usage",
      aliases: ["労働安全", "現場安全", "安全管理"],
      english: ["worker safety", "worksite safety"],
      reason: "用途特許や異業種の安全管理技術を拾う軸になります。",
      includeByDefault: true,
    },
  ];

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

  const usagePart = industryTerms.slice(0, 3).join(" OR ") || "作業現場";

  return {
    summary: {
      title: "カメラ映像による危険姿勢検出と通知",
      plainDescription: input.functionSummary,
      assumptions: [
        "姿勢は画像解析または骨格推定により判定する想定です。",
        "通知はスマートフォン画面、音、振動のいずれかで行う想定です。",
      ],
      nonLegalNotice,
    },
    keywords,
    functionalTerms: [
      {
        plainTerm: "カメラ",
        patentTerm: "撮像手段",
        reason: "具体的な製品名より広い機能表現で検索するため。",
      },
      {
        plainTerm: "通知",
        patentTerm: "報知手段",
        reason: "音、画面、振動などを含む表現として使えるため。",
      },
    ],
    actionTerms: [
      {
        term: "検出",
        examples: ["判定", "推定", "抽出", "識別"],
        reason: "製品名ではなく処理動作から検索するため。",
      },
      {
        term: "通知",
        examples: ["警告", "報知", "出力", "提示"],
        reason: "ユーザーへの伝達方法を広く拾うため。",
      },
    ],
    searchAxes: [
      {
        axis: "技術構成",
        queryIntent: "撮像、姿勢推定、危険判定、通知の組み合わせで探す",
        recommendedTerms: ["姿勢推定", "撮像手段", "通知手段"],
        notes: "構成要素が似た特許を探します。",
      },
      {
        axis: "課題・効果",
        queryIntent: "転倒防止、腰痛予防、作業安全、早期警告の観点で探す",
        recommendedTerms: ["作業者安全", "危険姿勢検出", "早期警告"],
        notes: "目的や効果が近い特許を拾う軸です。",
      },
      {
        axis: "用途",
        queryIntent: `${industryTerms.join("、") || "利用業界"} に限定された用途特許を確認する`,
        recommendedTerms: industryTerms.length ? industryTerms : ["作業現場"],
        notes: "異業種の用途特許を見落とさないための軸です。",
      },
    ],
    classificationHints: [
      {
        type: "FI_OR_F_TERM_VIEWPOINT",
        viewpoint: "作業安全、監視、画像認識、警報",
        instruction:
          "J-PlatPat ではキーワード検索後に FI/F タームを確認し、目的・効果の観点で絞り込む。",
        confidence: "medium",
      },
    ],
    searchQueries: [
      {
        id: "broad_technical_ja",
        label: "日本語で広く探す",
        query: "(姿勢推定 OR 骨格推定 OR 危険姿勢検出) (通知 OR 警告 OR 報知) (作業者 OR 作業現場)",
        targetSites: ["google_patents", "j_platpat"],
      },
      {
        id: "global_technical_en",
        label: "英語で海外も探す",
        query: '("pose estimation" OR "human pose estimation") (alert OR notification OR warning) "worker safety"',
        targetSites: ["google_patents", "espacenet"],
      },
      {
        id: "functional_claim",
        label: "機能的表現で探す",
        query: "(撮像手段 OR 画像取得手段) (判定手段 OR 推定手段) (通知手段 OR 報知手段)",
        targetSites: ["google_patents", "j_platpat"],
      },
      {
        id: "usage_specific",
        label: "用途特許を探す",
        query: `(姿勢推定 OR 危険姿勢検出) (${usagePart})`,
        targetSites: ["google_patents", "j_platpat"],
      },
    ],
    checklist: [
      {
        item: "請求項に、撮像、姿勢推定、危険判定、通知の全要素が含まれるか確認する。",
        reason: "構成要素ごとの対応関係を整理するため。",
      },
      {
        item: "用途が作業現場、介護、物流などに限定されていないか確認する。",
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
