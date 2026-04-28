# Phase 2 ステータス

## 完了したこと

- Next.js + TypeScript アプリを追加
- 静的プロトタイプの主要 UI を React コンポーネント化
- `/api/generate-plan` を追加
- OpenAI API キーがある場合は Structured Outputs で調査プラン生成
- OpenAI API キーがない場合のフォールバック生成
- `/api/analyze-patent` を追加
- 検索リンク生成ロジックを `lib/search-links.ts` に分離
- Markdown エクスポートを `lib/markdown-export.ts` に分離
- 型定義を `types/patent.ts` に分離
- `.env.example` を追加

## 検証済み

```bash
npm run typecheck
npm run build
npm audit --audit-level=moderate
```

結果:

- TypeScript 型チェック成功
- Next.js 本番ビルド成功
- npm audit は moderate 以上の脆弱性なし

## 現在のローカル URL

```txt
http://localhost:3000
```

## まだフォールバックのままの部分

- `/api/analyze-patent` は現時点ではサンプル分析ロジック
- AI 出力のランタイムバリデーションは未実装
- 調査履歴保存は未実装
- 認証、課金、利用規約ページは未実装

## 次の推奨作業

1. `/api/analyze-patent` を OpenAI API に接続
2. AI 出力 JSON のランタイム検証を追加
3. 入力内容と調査結果をブラウザ内に保存
4. 販売前提の免責、利用規約、プライバシーポリシーを追加

