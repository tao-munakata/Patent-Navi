# 実装計画

## 1. 技術構成案

MVP は単一の Web アプリとして構築する。

| 領域 | 推奨 |
| --- | --- |
| フレームワーク | Next.js |
| 言語 | TypeScript |
| UI | React |
| スタイリング | Tailwind CSS または CSS Modules |
| AI API | OpenAI API など、構造化出力に対応したモデル |
| 保存 | 初期はブラウザ内保存、販売版で DB 保存 |
| エクスポート | クライアント側で Markdown 生成 |

## 2. ディレクトリ案

```txt
app/
  page.tsx
  search-plan/page.tsx
  analysis/page.tsx
  api/generate-plan/route.ts
  api/analyze-patent/route.ts
components/
  IdeaInputForm.tsx
  KeywordPanel.tsx
  SearchLinkList.tsx
  ChecklistPanel.tsx
  PatentAnalysisForm.tsx
  DesignAroundPanel.tsx
lib/
  schemas.ts
  search-links.ts
  markdown-export.ts
  prompts.ts
types/
  patent.ts
```

## 3. 実装フェーズ

### Phase 1: 静的プロトタイプ

目的:

- 画面構成を確認する
- 入力から結果表示までの流れを体験できるようにする

実装:

- 調査開始画面
- サンプル JSON による調査プラン表示
- 検索リンク生成
- Markdown エクスポート

### Phase 2: AI 接続

目的:

- 実入力から AI が調査プランを生成する

実装:

- `/api/generate-plan`
- JSON Schema バリデーション
- エラーハンドリング
- 免責表示

### Phase 3: 特許分析

目的:

- 外部検索で見つけた特許の請求項を貼り付け、構成要素と回避案を整理する

実装:

- `/analysis`
- `/api/analyze-patent`
- 請求項の構成要素分解
- 対応表
- 回避設計案

### Phase 4: 販売準備

目的:

- 有料提供に必要な最低限の信頼性と運用性を整える

実装:

- 利用規約、プライバシーポリシー、免責ページ
- ユーザー認証
- 調査履歴保存
- 課金
- ログと障害監視

## 4. API 設計

### 4.1 POST /api/generate-plan

入力:

```json
{
  "functionSummary": "string",
  "problemToSolve": "string",
  "usageScene": "string",
  "components": "string",
  "competitors": "string"
}
```

出力:

```json
{
  "plan": "GeneratedSearchPlan",
  "links": ["SearchLink"]
}
```

### 4.2 POST /api/analyze-patent

入力:

```json
{
  "projectSummary": "string",
  "publicationNumber": "string",
  "assignee": "string",
  "abstractText": "string",
  "claimText": "string",
  "userConcern": "string"
}
```

出力:

```json
{
  "analysis": "PatentAnalysis"
}
```

## 5. 受け入れ基準

| 機能 | 基準 |
| --- | --- |
| 入力 | 機能概要だけで調査プランを生成できる |
| キーワード生成 | 日本語、英語、機能的表現、作用語が分かれて表示される |
| 検索リンク | Google Patents、Espacenet はクエリ付きで開ける |
| J-PlatPat | 検索式コピーと検索画面リンクがある |
| 分析 | 請求項を構成要素に分け、対応表を出せる |
| 回避案 | 削除、置換、順序変更など複数観点から出せる |
| 免責 | 法的判断ではない旨が入力前と出力画面に表示される |
| エクスポート | Markdown として調査メモを出力できる |

## 6. リスクと対策

| リスク | 対策 |
| --- | --- |
| AI が法的断定をする | 禁止表現、JSON Schema、出力後チェックを入れる |
| 検索リンクが外部仕様変更で壊れる | サイト別関数に分離し、J-PlatPat はコピー方式にする |
| 未公開アイデアの入力リスク | 送信前注意、プライバシーポリシー、保存範囲の明示 |
| 検索漏れ | 複数軸の検索式、英日両方、用途軸を出す |
| 販売時の責任誤認 | UI、規約、出力文言で調査支援の範囲を明示する |

## 7. 次に作るもの

次の実作業は、静的プロトタイプである。

優先順:

1. Next.js アプリの初期化
2. 調査開始画面
3. サンプル調査プラン表示
4. 検索リンク生成ユーティリティ
5. Markdown エクスポート

