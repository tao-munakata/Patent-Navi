# AI 出力 JSON スキーマ

## 1. 方針

AI の出力は UI で安全に扱うため、自由文ではなく構造化 JSON として受け取る。

特に重要な制約は以下である。

- 法的結論を断定しない
- 「調査観点」「検索語」「確認項目」として出力する
- 推測や仮定は `assumptions` に分離する
- 不確実性は `confidence` と `notes` で表現する
- UI に出す文言と内部処理用の値を分ける

## 2. 調査プラン生成リクエスト

```json
{
  "functionSummary": "スマートフォンのカメラ映像から作業者の危険姿勢を検出して通知する",
  "problemToSolve": "作業現場で転倒や腰痛につながる姿勢を早期に警告したい",
  "usageScene": "建設現場、物流倉庫",
  "components": "カメラ、姿勢推定AI、スマートフォン通知、振動アラート",
  "competitors": "安全管理アプリ、ウェアラブルサービス",
  "language": "ja"
}
```

## 3. 調査プラン生成レスポンス

```json
{
  "summary": {
    "title": "カメラ映像による危険姿勢検出と通知",
    "plainDescription": "スマートフォン等の撮像手段で作業者の姿勢を推定し、危険姿勢を検出した場合に通知する仕組み",
    "assumptions": [
      "作業者の姿勢は画像解析または骨格推定により判定する",
      "通知はスマートフォン画面、音、振動のいずれかで行う"
    ],
    "nonLegalNotice": "以下は特許調査の観点整理であり、権利侵害や実施可否の判断ではありません。"
  },
  "keywords": [
    {
      "term": "姿勢推定",
      "language": "ja",
      "category": "technical",
      "aliases": ["骨格推定", "人体姿勢推定", "ポーズ推定"],
      "english": ["pose estimation", "human pose estimation"],
      "reason": "画像から人の姿勢を推定する中心技術に該当するため",
      "includeByDefault": true
    }
  ],
  "functionalTerms": [
    {
      "plainTerm": "カメラ",
      "patentTerm": "撮像手段",
      "reason": "特許文献では具体的な製品名より広い機能表現が使われることがあるため"
    }
  ],
  "actionTerms": [
    {
      "term": "検出",
      "examples": ["判定", "推定", "抽出", "識別"],
      "reason": "製品名ではなく処理動作から検索するため"
    }
  ],
  "searchAxes": [
    {
      "axis": "技術構成",
      "queryIntent": "画像から姿勢を推定し危険状態を通知する技術を探す",
      "recommendedTerms": ["姿勢推定", "撮像手段", "通知手段"],
      "notes": "構成要素が似た特許を探す"
    }
  ],
  "classificationHints": [
    {
      "type": "FI_OR_F_TERM_VIEWPOINT",
      "viewpoint": "作業安全、監視、画像認識、警報",
      "instruction": "J-PlatPat ではキーワード検索後に FI/F タームを確認し、目的・効果の観点で絞り込む",
      "confidence": "medium"
    }
  ],
  "searchQueries": [
    {
      "id": "broad_technical_ja",
      "label": "日本語で広く探す",
      "query": "(姿勢推定 OR 骨格推定) (警告 OR 通知) (作業者 OR 作業現場)",
      "targetSites": ["google_patents", "j_platpat"]
    },
    {
      "id": "global_technical_en",
      "label": "英語で海外も探す",
      "query": "(\"pose estimation\" OR \"human pose estimation\") (alert OR notification) worker safety",
      "targetSites": ["google_patents", "espacenet"]
    }
  ],
  "checklist": [
    {
      "item": "請求項に撮像、姿勢推定、危険判定、通知の全要素が含まれているか確認する",
      "reason": "構成要素ごとの対応関係を整理するため"
    }
  ],
  "warnings": [
    "検索結果の権利状態や有効期間は必ず原典で確認してください"
  ]
}
```

## 4. 調査プラン JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "GeneratedSearchPlan",
  "type": "object",
  "required": ["summary", "keywords", "functionalTerms", "actionTerms", "searchAxes", "searchQueries", "checklist", "warnings"],
  "properties": {
    "summary": {
      "type": "object",
      "required": ["title", "plainDescription", "assumptions", "nonLegalNotice"],
      "properties": {
        "title": { "type": "string" },
        "plainDescription": { "type": "string" },
        "assumptions": { "type": "array", "items": { "type": "string" } },
        "nonLegalNotice": { "type": "string" }
      }
    },
    "keywords": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["term", "language", "category", "aliases", "english", "reason", "includeByDefault"],
        "properties": {
          "term": { "type": "string" },
          "language": { "type": "string", "enum": ["ja", "en", "mixed"] },
          "category": { "type": "string", "enum": ["technical", "component", "problem", "effect", "usage", "assignee", "noise"] },
          "aliases": { "type": "array", "items": { "type": "string" } },
          "english": { "type": "array", "items": { "type": "string" } },
          "reason": { "type": "string" },
          "includeByDefault": { "type": "boolean" }
        }
      }
    },
    "functionalTerms": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["plainTerm", "patentTerm", "reason"],
        "properties": {
          "plainTerm": { "type": "string" },
          "patentTerm": { "type": "string" },
          "reason": { "type": "string" }
        }
      }
    },
    "actionTerms": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["term", "examples", "reason"],
        "properties": {
          "term": { "type": "string" },
          "examples": { "type": "array", "items": { "type": "string" } },
          "reason": { "type": "string" }
        }
      }
    },
    "searchAxes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["axis", "queryIntent", "recommendedTerms", "notes"],
        "properties": {
          "axis": { "type": "string" },
          "queryIntent": { "type": "string" },
          "recommendedTerms": { "type": "array", "items": { "type": "string" } },
          "notes": { "type": "string" }
        }
      }
    },
    "classificationHints": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "viewpoint", "instruction", "confidence"],
        "properties": {
          "type": { "type": "string" },
          "viewpoint": { "type": "string" },
          "instruction": { "type": "string" },
          "confidence": { "type": "string", "enum": ["low", "medium", "high"] }
        }
      }
    },
    "searchQueries": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "label", "query", "targetSites"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "query": { "type": "string" },
          "targetSites": {
            "type": "array",
            "items": { "type": "string", "enum": ["google_patents", "j_platpat", "espacenet"] }
          }
        }
      }
    },
    "checklist": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["item", "reason"],
        "properties": {
          "item": { "type": "string" },
          "reason": { "type": "string" }
        }
      }
    },
    "warnings": { "type": "array", "items": { "type": "string" } }
  }
}
```

## 5. 特許分析レスポンス

```json
{
  "sourceSummary": {
    "publicationNumber": "未入力",
    "assignee": "未入力",
    "documentType": "claim_text",
    "nonLegalNotice": "以下は構成要素と確認観点の整理であり、侵害判断ではありません。"
  },
  "claimElements": [
    {
      "id": "E1",
      "text": "作業者を撮像する撮像手段",
      "plainMeaning": "カメラなどで作業者の画像を取得する要素",
      "elementType": "input"
    }
  ],
  "comparisonTable": [
    {
      "elementId": "E1",
      "userProductFeature": "スマートフォンのカメラで作業者を撮影する",
      "status": "要確認",
      "reason": "撮像手段に対応する可能性があるため",
      "questionsForExpert": ["スマートフォン内蔵カメラが当該請求項の撮像手段に含まれるか"]
    }
  ],
  "designAroundIdeas": [
    {
      "idea": "カメラではなくウェアラブルセンサーで姿勢を検出する",
      "approach": "構成要素の置換",
      "expectedEffect": "撮像手段を必須とする請求項との差異を検討できる",
      "difficulty": "medium",
      "businessImpact": "ユーザー装着負担が増える可能性がある",
      "needsFurtherSearch": true
    }
  ],
  "riskNotes": [
    "請求項の全構成要素との対応を確認する必要があります"
  ],
  "expertQuestions": [
    "撮像手段の範囲にスマートフォンカメラが含まれるか"
  ]
}
```

## 6. 特許分析 JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PatentAnalysis",
  "type": "object",
  "required": ["sourceSummary", "claimElements", "comparisonTable", "designAroundIdeas", "riskNotes", "expertQuestions"],
  "properties": {
    "sourceSummary": {
      "type": "object",
      "required": ["publicationNumber", "assignee", "documentType", "nonLegalNotice"],
      "properties": {
        "publicationNumber": { "type": "string" },
        "assignee": { "type": "string" },
        "documentType": { "type": "string" },
        "nonLegalNotice": { "type": "string" }
      }
    },
    "claimElements": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "text", "plainMeaning", "elementType"],
        "properties": {
          "id": { "type": "string" },
          "text": { "type": "string" },
          "plainMeaning": { "type": "string" },
          "elementType": { "type": "string", "enum": ["input", "processing", "output", "structure", "condition", "other"] }
        }
      }
    },
    "comparisonTable": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["elementId", "userProductFeature", "status", "reason", "questionsForExpert"],
        "properties": {
          "elementId": { "type": "string" },
          "userProductFeature": { "type": "string" },
          "status": { "type": "string", "enum": ["要確認", "低そう", "不明", "対象外かも"] },
          "reason": { "type": "string" },
          "questionsForExpert": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "designAroundIdeas": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["idea", "approach", "expectedEffect", "difficulty", "businessImpact", "needsFurtherSearch"],
        "properties": {
          "idea": { "type": "string" },
          "approach": { "type": "string" },
          "expectedEffect": { "type": "string" },
          "difficulty": { "type": "string", "enum": ["low", "medium", "high"] },
          "businessImpact": { "type": "string" },
          "needsFurtherSearch": { "type": "boolean" }
        }
      }
    },
    "riskNotes": { "type": "array", "items": { "type": "string" } },
    "expertQuestions": { "type": "array", "items": { "type": "string" } }
  }
}
```

## 7. 禁止出力

AI は以下の表現を出力しない。

- 侵害しています
- 侵害していません
- 実施できます
- 権利は無効です
- この特許は回避できます
- 法的に問題ありません

代わりに以下の表現を使う。

- 対応する可能性があるため要確認
- 入力情報だけでは不明
- 差異として検討できる可能性がある
- 専門家に確認すべき論点

