# Patent-Navi

思いつき、ひらめきを特許になるのでは？という問いから、事業・製品アイデアを特許調査の入口へつなぐナビサイトです。

## 概要

事業・製品アイデアから関連特許を探すための一次調査支援サイトです。

## 主な機能

### AIによる調査プラン生成
- ひらめきテキストから特許調査キーワードを自動分解
- J-PlatPat の絞り込み件数をリアルタイム表示

### 特許番号・書誌情報の自動取得
- **J-PlatPat 自動スクレイピング**: 登録番号（特許第XXXXXXX）から出願番号を自動取得
  - Playwright によるヘッドレスブラウザ操作
  - `/api/scrape-jplatpat` エンドポイント
- **特許庁API連携**: 出願番号から書誌情報（発明の名称・出願人・出願日・登録日）を取得
  - ip-data.jpo.go.jp の `app_progress` エンドポイントを使用
  - OAuth2 トークンキャッシュ（1時間TTL）
  - `/api/jpo-patent` エンドポイント

### 保存済み特許DB
- 取得した特許情報を SQLite に永続保存（`data/patents.db`）
- 保存済み特許一覧を画面に常時表示
- 公開・登録番号クリック → 番号をクリップボードにコピー＆J-PlatPat を開く
- `/api/patents` エンドポイント（GET: 一覧 / POST: 保存）

### 特許候補テーブル
- 候補特許の No / 公開・登録番号 / 発明の名称 / 出願人 / 状態 / 特許庁API を一覧表示
- 「自動取得」ボタン: スクレイプ → JPO API → DB保存 を一括実行
- 「手動入力」: 出願番号を手入力して JPO API 取得

## セットアップ

```bash
npm install
npx playwright install chromium
cp .env.example .env.local
```

`.env.local` に以下を設定:

```
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
JPO_API_ID=          # 特許庁API利用者ID
JPO_API_PASSWORD=    # 特許庁API パスワード
```

## 起動

```bash
npm run dev -- -p 3002
```

`http://localhost:3002` を開く。

## API エンドポイント

| パス | メソッド | 説明 |
|------|---------|------|
| `/api/scrape-jplatpat` | POST | J-PlatPat から出願番号を自動取得 |
| `/api/jpo-patent` | POST | 特許庁API で書誌情報を取得 |
| `/api/patents` | GET | 保存済み特許一覧を返す |
| `/api/patents` | POST | 特許情報を DB に保存（upsert） |
| `/api/analyze-patent` | POST | AI による特許分析 |
| `/api/generate-plan` | POST | AI による調査プラン生成 |
| `/api/jplatpat-count` | POST | J-PlatPat 件数取得 |

## ファイル構成（主要）

```
app/api/
  scrape-jplatpat/route.ts   # J-PlatPat スクレイパー
  jpo-patent/route.ts        # 特許庁API ラッパー
  patents/route.ts            # 保存済み特許 CRUD
components/
  PatentNaviApp.tsx           # メインアプリ
  PatentCandidateTable.tsx    # 候補テーブル（自動取得ボタン付き）
  SavedPatentsTable.tsx       # DB保存済み特許一覧
lib/
  jpo-api.ts                  # 特許庁API クライアント
  db.ts                       # SQLite 接続・スキーマ
data/
  patents.db                  # SQLite DB（gitignore）
scripts/
  scrape-jplatpat.js          # 調査用スクリプト
```

## 検証

```bash
npm run typecheck
npm run build
```

## J-PlatPat について

J-PlatPat は JavaScript SPA のため、直接ドキュメントURLが存在しません。
番号クリック時は登録番号をクリップボードにコピー＆番号照会ページ（`/p0000`）を開きます。
J-PlatPat 上で番号を貼り付けて照会してください。
