# Patent-Navi

思いつき、ひらめきを特許になるのでは？という問いから、事業・製品アイデアを特許調査の入口へつなぐナビサイトです。

## 概要

事業・製品アイデアから関連特許を探すための一次調査支援サイトの設計資料とプロトタイプです。

## 成果物

- `docs/requirements.md`: 要件定義
- `docs/ui-design.md`: 画面設計
- `docs/ai-json-schema.md`: AI 出力 JSON スキーマ
- `docs/search-link-spec.md`: 検索リンク生成仕様
- `docs/implementation-plan.md`: 実装計画
- `docs/phase-1-scope.md`: Phase 1 の確定スコープ
- `prototype/index.html`: 静的 MVP プロトタイプ

## プロトタイプ

ブラウザで以下のファイルを開くと、入力、調査プラン表示、検索リンク生成、請求項分析メモ、Markdown 出力の流れを確認できます。

```txt
prototype/index.html
```

## Phase 2 アプリ

Next.js + TypeScript 版を追加しました。

```bash
npm install
npm run dev -- -p 3000
```

起動後、以下を開きます。

```txt
http://localhost:3000
```

調査プラン生成と特許分析メモは、`OPENAI_API_KEY` がある場合に OpenAI API を使い、未設定の場合はフォールバック生成で動きます。

```bash
cp .env.example .env.local
```

`.env.local` に `OPENAI_API_KEY` を設定してください。

## 検証

```bash
npm run typecheck
npm run build
npm audit --audit-level=moderate
```

## 次の実装候補

1. AI 出力の追加バリデーションを入れる
2. 調査履歴のブラウザ内保存を追加する
3. 利用規約、プライバシーポリシー、免責ページを追加する
4. API キー未設定時の画面表示をより明確にする
