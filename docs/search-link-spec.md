# 検索リンク生成仕様

## 1. 目的

生成した検索語を、外部特許検索サイトで使いやすい形に変換し、ユーザーがすぐに検索を開始できるリンクを作る。

MVP では外部サイトの検索結果を自動取得しない。各サイトの利用条件やロボット制限を避けるため、ユーザー操作で外部サイトを開く導線に限定する。

## 2. 対象サイト

| サイト | MVP 方針 | 理由 |
| --- | --- | --- |
| Google Patents | 検索クエリ付き URL を生成する | フリーワード、英語、メタデータ検索に強い |
| Espacenet | 検索クエリ付き URL を生成する | 海外特許と分類検索の入口として使う |
| J-PlatPat | 検索画面へのリンクと検索式コピーを提供する | 日本国内の権利状態確認に重要だが、安定した深いリンクは慎重に扱う |

## 3. クエリ生成ルール

### 3.1 基本

AI が生成した `searchQueries` をもとに、サイトごとの検索式へ変換する。

```ts
type SearchSite = "google_patents" | "j_platpat" | "espacenet";

type SearchQuery = {
  id: string;
  label: string;
  query: string;
  targetSites: SearchSite[];
};
```

### 3.2 検索式の種類

| 種類 | 例 | 用途 |
| --- | --- | --- |
| broad_technical_ja | `(姿勢推定 OR 骨格推定) (警告 OR 通知)` | 日本語で広く探す |
| global_technical_en | `("pose estimation" OR "human pose estimation") alert worker` | 海外も含めて探す |
| functional_claim | `(撮像手段 OR 検出手段 OR 通知手段)` | 特許的な機能表現で探す |
| usage_specific | `(姿勢推定 OR 骨格推定) 建設現場 安全` | 用途特許を探す |
| competitor | `assignee:"Example Corp" 姿勢推定` | 競合・出願人軸で探す |

## 4. URL 生成

### 4.1 Google Patents

Google Patents はフリーワード検索と、`assignee:`、`inventor:`、`before:`、`after:`、`country:` などの検索演算子を利用できる。

URL:

```txt
https://patents.google.com/?q={encodedQuery}
```

例:

```txt
https://patents.google.com/?q=%28%22pose%20estimation%22%20OR%20%22human%20pose%20estimation%22%29%20alert%20worker
```

実装:

```ts
export function buildGooglePatentsUrl(query: string): string {
  return `https://patents.google.com/?q=${encodeURIComponent(query)}`;
}
```

### 4.2 Espacenet

Espacenet は海外特許調査、分類検索、機械翻訳、Global Dossier への導線として使う。

URL:

```txt
https://worldwide.espacenet.com/patent/search?q={encodedQuery}
```

例:

```txt
https://worldwide.espacenet.com/patent/search?q=%28%22pose%20estimation%22%20OR%20%22human%20pose%20estimation%22%29%20alert%20worker
```

実装:

```ts
export function buildEspacenetUrl(query: string): string {
  return `https://worldwide.espacenet.com/patent/search?q=${encodeURIComponent(query)}`;
}
```

### 4.3 J-PlatPat

J-PlatPat は日本国内の特許・実用新案検索、権利状態確認、FI/F ターム調査で使う。

MVP では、検索クエリを URL に深く埋め込むのではなく、検索画面へのリンクと検索式コピーを提供する。

URL:

```txt
https://www.j-platpat.inpit.go.jp/
```

実装:

```ts
export function buildJPlatPatUrl(): string {
  return "https://www.j-platpat.inpit.go.jp/";
}
```

UI では以下を表示する。

- J-PlatPat で開く
- 検索式をコピー
- 「特許・実用新案検索」で貼り付ける
- 必要に応じて FI/F タームや出願人で絞り込む

## 5. リンクモデル

```ts
type SearchLink = {
  site: "google_patents" | "j_platpat" | "espacenet";
  label: string;
  url: string;
  query: string;
  copyText: string;
  guidance: string;
};
```

例:

```json
{
  "site": "google_patents",
  "label": "Google Patents で技術語検索",
  "url": "https://patents.google.com/?q=%28%22pose%20estimation%22%20OR%20%22human%20pose%20estimation%22%29%20alert%20worker",
  "query": "(\"pose estimation\" OR \"human pose estimation\") alert worker",
  "copyText": "(\"pose estimation\" OR \"human pose estimation\") alert worker",
  "guidance": "英語キーワードで海外文献を広く確認します。"
}
```

## 6. サイト別の推奨用途

### 6.1 Google Patents

使う場面:

- 技術語で広く探す
- 英語キーワードを試す
- 図面や引用関係をざっと確認する
- 出願人名や国で絞り込む

推奨クエリ:

```txt
("pose estimation" OR "human pose estimation") (alert OR notification) worker safety
```

### 6.2 Espacenet

使う場面:

- 欧州、米国、中国を含めて海外展開リスクを見たい
- 分類検索へ進みたい
- Global Dossier で審査経過を確認したい

推奨クエリ:

```txt
("pose estimation" OR "human pose estimation") AND "worker safety"
```

### 6.3 J-PlatPat

使う場面:

- 日本国内の権利状態を確認したい
- FI/F タームを見たい
- 出願人名で国内文献を確認したい

推奨手順:

1. 本システムで検索式をコピーする
2. J-PlatPat を開く
3. 特許・実用新案検索に貼り付ける
4. FI/F ターム、出願人、公開日、権利状態で絞り込む

## 7. 実装時の注意

- URL には必ず `encodeURIComponent` を使う
- クエリは長くしすぎず、検索意図ごとに複数リンクを出す
- 日本語クエリと英語クエリは分ける
- 競合企業名は表記ゆれを別クエリにする
- 外部サイトを新規タブで開く場合は、元画面に戻れるよう検索式を表示しておく
- 外部サイトの仕様変更に備えて、リンク生成ロジックはサイトごとの関数に分ける

## 8. 参照情報

- Google Patents Help: https://support.google.com/faqs/answer/7049475
- Espacenet official overview: https://www.epo.org/en/searching-for-patents/technical/espacenet
- J-PlatPat overview: https://inspire.wipo.int/j-platpat
- J-PlatPat data update and coverage pages: https://www.j-platpat.inpit.go.jp/html/c0300/index_en.html

