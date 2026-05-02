"use client";

import { useEffect, useMemo, useState } from "react";
import { buildResearchMarkdown } from "@/lib/markdown-export";
import type {
  GeneratedSearchPlan,
  IdeaInput,
  PatentAnalysis,
  PatentAnalysisRequest,
  SearchLink,
} from "@/types/patent";

const emptyInput: IdeaInput = {
  functionSummary: "",
  problemToSolve: "",
  usageScene: "",
  components: "",
  competitors: "",
};

const exampleInput: IdeaInput = {
  functionSummary: "機械式アナログメーターをLEDを光源とし針の部分を読み取り数値化する",
  problemToSolve: "",
  usageScene: "海洋機器",
  components: "",
  competitors: "",
};

const initialAnalysisRequest: PatentAnalysisRequest = {
  projectSummary: "",
  publicationNumber: "",
  assignee: "",
  abstractText: "",
  claimText:
    "LEDを光源として機械式アナログメーターを照明し、CCDにより針の位置を撮像し、撮像結果から指示値を数値化するメーター読取装置。",
  userConcern: "",
};

const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

function apiPath(path: string) {
  return `${appBasePath}${path}`;
}

type TabId = "overview" | "keywords" | "links" | "checklist";
type PageMode = "quick" | "detail";
type JPlatPatCountResult = {
  status: "fetched" | "estimated";
  total: number;
  categories: { label: string; count: number }[];
  keywordBreakdown: { term: string; count: number }[];
  checkedAt: string;
  sourceUrl: string;
  note: string;
};
type PatentSummaryCandidate = {
  publicationNumber: string;
  patentNumber: string;
  title: string;
  assignee: string;
  abstract: string;
  jplatpatUrl: string;
};

export function PatentNaviApp() {
  const [mode, setMode] = useState<PageMode>("quick");
  const [input, setInput] = useState<IdeaInput>(emptyInput);
  const [analysisRequest, setAnalysisRequest] = useState<PatentAnalysisRequest>(initialAnalysisRequest);
  const [plan, setPlan] = useState<GeneratedSearchPlan | null>(null);
  const [links, setLinks] = useState<SearchLink[]>([]);
  const [analysis, setAnalysis] = useState<PatentAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [jplatpatResults, setJplatpatResults] = useState("");
  const [jplatpatCount, setJplatpatCount] = useState<JPlatPatCountResult | null>(null);
  const [loadingJplatpatCount, setLoadingJplatpatCount] = useState(false);
  const [industryFilter, setIndustryFilter] = useState("");
  const [businessFilter, setBusinessFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [droppedTerms, setDroppedTerms] = useState<string[]>([]);

  const metrics = useMemo(
    () => ({
      keywordCount: plan?.keywords.length ?? 0,
      axisCount: plan?.searchAxes.length ?? 0,
      linkCount: links.length,
    }),
    [links.length, plan],
  );

  const primaryQuery = useMemo(() => plan?.searchQueries[0]?.query ?? "", [plan]);
  const narrowedQuery = useMemo(() => {
    const filters = [businessFilter, industryFilter, productFilter]
      .flatMap((value) => value.split(/[、,\n]/))
      .map((value) => value.trim())
      .filter(Boolean);

    if (!primaryQuery) return "";
    const dragged = droppedTerms.length ? `(${droppedTerms.join(" AND ")})` : "";
    const typed = filters.length ? `(${filters.join(" OR ")})` : "";
    return [primaryQuery, dragged, typed].filter(Boolean).join(" ");
  }, [businessFilter, droppedTerms, industryFilter, primaryQuery, productFilter]);

  const resultLines = useMemo(
    () =>
      jplatpatResults
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [jplatpatResults],
  );
  const pastedCount = useMemo(() => extractCountFromText(jplatpatResults), [jplatpatResults]);
  const baseHitCount = jplatpatCount?.total ?? pastedCount ?? resultLines.length;
  const visibleHitCount = droppedTerms.length ? Math.max(1, Math.round((baseHitCount || 120) * 0.42 ** droppedTerms.length)) : baseHitCount;
  const keywordStats = useMemo(
    () => buildKeywordStats(plan, resultLines, jplatpatCount),
    [jplatpatCount, plan, resultLines],
  );

  useEffect(() => {
    if (!input.functionSummary.trim()) return;
    const timer = window.setTimeout(() => {
      void createPlan("quick", true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (!plan || !narrowedQuery) return;
    const timer = window.setTimeout(() => {
      void fetchJplatpatCount(true);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [narrowedQuery, plan]);

  async function createPlan(nextMode: PageMode = mode, quiet = false) {
    setError("");
    if (!quiet) setMessage("");
    if (!input.functionSummary.trim()) {
      setError("ひらめきテキストを入力してください。");
      return;
    }

    setLoadingPlan(true);
    try {
      const response = await fetch(apiPath("/api/generate-plan"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "調査プランの作成に失敗しました。");
      setPlan(data.plan);
      setLinks(data.links);
      setJplatpatCount(null);
      setAnalysisRequest((current) => ({
        ...current,
        projectSummary: data.plan.summary.plainDescription || input.functionSummary,
      }));
      setActiveTab("overview");
      setMode(nextMode);
      if (!quiet) {
        setMessage(data.source === "openai" ? "AI で判定材料を作成しました。" : "サンプル生成で判定材料を作成しました。");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "調査プランの作成に失敗しました。");
    } finally {
      setLoadingPlan(false);
    }
  }

  async function analyzePatent() {
    setError("");
    setMessage("");
    setLoadingAnalysis(true);
    try {
      const response = await fetch(apiPath("/api/analyze-patent"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysisRequest),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "分析に失敗しました。");
      setAnalysis(data.analysis);
      setMessage(data.source === "openai" ? "AI で特許分析メモを作成しました。" : "サンプル生成で特許分析メモを作成しました。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "分析に失敗しました。");
    } finally {
      setLoadingAnalysis(false);
    }
  }

  async function fetchJplatpatCount(quiet = false) {
    if (!plan || !narrowedQuery) return;
    setError("");
    if (!quiet) setMessage("");
    setLoadingJplatpatCount(true);
    try {
      const response = await fetch(apiPath("/api/jplatpat-count"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: narrowedQuery,
          keywords: plan.keywords.map((keyword) => ({
            term: keyword.term,
            aliases: keyword.aliases,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "J-PlatPat件数の取得に失敗しました。");
      setJplatpatCount(data);
      if (!quiet) {
        setMessage(data.status === "fetched" ? "J-PlatPat件数を取得しました。" : "J-PlatPat件数の推定を作成しました。");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "J-PlatPat件数の取得に失敗しました。");
    } finally {
      setLoadingJplatpatCount(false);
    }
  }

  function clearGeneratedState() {
    setPlan(null);
    setLinks([]);
    setJplatpatCount(null);
    setJplatpatResults("");
    setDroppedTerms([]);
    setMessage("");
    setError("");
  }

  function updateInput<K extends keyof IdeaInput>(key: K, value: IdeaInput[K]) {
    clearGeneratedState();
    setInput((current) => ({ ...current, [key]: value }));
  }

  function updateAnalysis<K extends keyof PatentAnalysisRequest>(
    key: K,
    value: PatentAnalysisRequest[K],
  ) {
    setAnalysisRequest((current) => ({ ...current, [key]: value }));
  }

  function addDroppedTerm(term: string) {
    setDroppedTerms((current) => (current.includes(term) ? current : [...current, term]));
    setJplatpatCount(null);
  }

  function removeDroppedTerm(term: string) {
    setDroppedTerms((current) => current.filter((currentTerm) => currentTerm !== term));
    setJplatpatCount(null);
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("検索式をコピーしました。");
    } catch {
      setError("ブラウザの権限でコピーできませんでした。検索式を選択して手動でコピーしてください。");
    }
  }

  function exportMarkdown() {
    const markdown = buildResearchMarkdown({
      input,
      plan,
      links,
      analysisRequest,
      analysis,
    });
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "patent-research-memo.md";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Markdown を出力しました。");
  }

  return (
    <>
      <header className="appHeader">
        <div className="topbar">
          <div className="brand" aria-label="Patent Navi">
            <div className="brandMark" aria-hidden="true" />
            <div>
              <strong>Patent Navi</strong>
              <span>会話からコア単語を抜き、特許検索へつなぐ</span>
            </div>
          </div>
          <nav className="nav" aria-label="ページ内ナビゲーション">
            <a href="#input">会話テキスト</a>
            <a href="#quick">検索判定</a>
            <a href="#detail">詳細調査</a>
            <a href="/docs/requirements.md">要件定義</a>
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="modeSwitch" role="tablist" aria-label="画面切り替え">
          <button className={mode === "quick" ? "tab tabActive" : "tab"} type="button" onClick={() => setMode("quick")}>
            ざっくり判定
          </button>
          <button className={mode === "detail" ? "tab tabActive" : "tab"} type="button" onClick={() => setMode("detail")}>
            詳細調査
          </button>
        </div>

        {mode === "quick" ? (
          <QuickSimplePanel
            input={input}
            plan={plan}
            keywordStats={keywordStats}
            droppedTerms={droppedTerms}
            hitCount={visibleHitCount}
            narrowedQuery={narrowedQuery}
            resultLines={resultLines}
            loadingPlan={loadingPlan}
            loadingJplatpatCount={loadingJplatpatCount}
            message={message}
            error={error}
            onInputChange={(value) => updateInput("functionSummary", value)}
            onGenerate={() => createPlan("quick")}
            onDropTerm={addDroppedTerm}
            onRemoveDroppedTerm={removeDroppedTerm}
          />
        ) : (
          <div className="workbench">
            <section id="input" className="panel">
              <div className="panelHeader">
                <h1>調査テーマ</h1>
              </div>
              <div className="panelBody">
                <InputField
                  id="functionSummary"
                  label="ひらめきテキスト"
                  value={input.functionSummary}
                  onChange={(value) => updateInput("functionSummary", value)}
                  hint="思いついた話、録音から起こした文章、雑なメモをそのまま貼ります。入力後に自動でコア単語へ分解します。"
                  required
                  minHeight={210}
                />
                <InputField
                  id="problemToSolve"
                  label="気になったポイント"
                  value={input.problemToSolve}
                  onChange={(value) => updateInput("problemToSolve", value)}
                  hint="任意。そこが特許になりそう、と思った理由を書きます。"
                />
                <TextField
                  id="usageScene"
                  label="最初に絞る業界"
                  value={input.usageScene}
                  onChange={(value) => {
                    updateInput("usageScene", value);
                    setIndustryFilter(value);
                  }}
                  placeholder="例: 飲食店、海洋機器、工場、医療"
                />
                <InputField
                  id="components"
                  label="絶対に外したくない単語"
                  value={input.components}
                  onChange={(value) => updateInput("components", value)}
                  hint="任意。会話内で特に重要だと思う部品・処理・材料を入れます。"
                />
                <InputField
                  id="competitors"
                  label="競合・近い商品"
                  value={input.competitors}
                  onChange={(value) => updateInput("competitors", value)}
                />

                <div className="actions">
                  <button className="primary" type="button" onClick={() => createPlan("detail")} disabled={loadingPlan}>
                    {loadingPlan ? "分解中..." : "詳細調査へ進む"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearGeneratedState();
                      setInput(exampleInput);
                      setIndustryFilter(exampleInput.usageScene);
                      setBusinessFilter("");
                      setProductFilter("");
                    }}
                  >
                    入力例を入れる
                  </button>
                </div>

                {message ? <div className="notice">{message}</div> : null}
                {error ? <div className="notice error">{error}</div> : null}
              </div>
            </section>

            <section className="results">
              <DetailResearchPanel
                plan={plan}
                links={links}
                metrics={metrics}
                activeTab={activeTab}
                analysis={analysis}
                analysisRequest={analysisRequest}
                loadingAnalysis={loadingAnalysis}
                onTab={setActiveTab}
                onCopy={copyText}
                onAnalysisChange={updateAnalysis}
                onAnalyze={analyzePatent}
                onExport={exportMarkdown}
              />
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function QuickSimplePanel(props: {
  input: IdeaInput;
  plan: GeneratedSearchPlan | null;
  keywordStats: { term: string; count: number }[];
  droppedTerms: string[];
  hitCount: number;
  narrowedQuery: string;
  resultLines: string[];
  loadingPlan: boolean;
  loadingJplatpatCount: boolean;
  message: string;
  error: string;
  onInputChange: (value: string) => void;
  onGenerate: () => void;
  onDropTerm: (term: string) => void;
  onRemoveDroppedTerm: (term: string) => void;
}) {
  const documentCandidates = props.plan
    ? buildPatentSummaryCandidates({
        plan: props.plan,
        narrowedQuery: props.narrowedQuery,
        droppedTerms: props.droppedTerms,
        resultLines: props.resultLines,
      })
    : [];

  return (
    <div className="quickStack">
      <section id="input" className="panel">
        <div className="panelHeader">
          <h1>調査テーマ</h1>
        </div>
        <div className="panelBody">
          <InputField
            id="functionSummary"
            label="ひらめきテキスト"
            value={props.input.functionSummary}
            onChange={props.onInputChange}
            hint="思いついた話をそのまま入れてください。自動でコア単語に分解します。"
            required
            minHeight={190}
          />
          <div className="actions">
            <button className="primary" type="button" onClick={props.onGenerate} disabled={props.loadingPlan}>
              {props.loadingPlan ? "分解中..." : "コア単語に分解する"}
            </button>
            {props.plan ? <span className="hint">入力後も自動で更新します。</span> : null}
          </div>
          {props.message ? <div className="notice">{props.message}</div> : null}
          {props.error ? <div className="notice error">{props.error}</div> : null}
        </div>
      </section>

      <section id="quick" className="panel">
        <div className="panelHeader">
          <h2>コア単語の強さ</h2>
        </div>
        <div className="panelBody">
          {props.plan ? (
            <KeywordCloud stats={props.keywordStats} onDropTerm={props.onDropTerm} />
          ) : (
            <div className="simpleEmpty">{props.loadingPlan ? "分解中..." : "ひらめきテキストを入れると、ここに単語が出ます。"}</div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <h2>絞り込み窓</h2>
        </div>
        <div className="panelBody">
          <div
            className="dropWindow dropWindowLarge"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const term = event.dataTransfer.getData("text/plain");
              if (term) props.onDropTerm(term);
            }}
          >
            <div className="dropWindowHeader">
              <div>
                <h3>単語をここに入れる</h3>
                <p>上の単語を押す、またはつかんで入れると件数が減っていきます。</p>
              </div>
              <div className="dropCount">
                <span>{props.loadingJplatpatCount ? "更新中" : "現在"}</span>
                <strong>{props.hitCount.toLocaleString()}</strong>
                <small>件</small>
              </div>
            </div>
            <div className="droppedTerms">
              {props.droppedTerms.length ? (
                props.droppedTerms.map((term) => (
                  <button type="button" key={term} onClick={() => props.onRemoveDroppedTerm(term)}>
                    {term} x
                  </button>
                ))
              ) : (
                <span className="hint">まだ単語が入っていません。</span>
              )}
            </div>
          </div>

          {props.narrowedQuery ? <div className="query">{props.narrowedQuery}</div> : null}

          {props.hitCount <= 10 && props.hitCount > 0 ? (
            <div className="overviewPanel">
              <span className="riskBadge riskLow">10件以下</span>
              <h3>文献・要約</h3>
              {documentCandidates.length ? (
                <div className="documentList">
                  {documentCandidates.map((candidate) => (
                    <a
                      className="documentCard"
                      href={candidate.jplatpatUrl}
                      key={candidate.publicationNumber}
                      title="J-PlatPatの番号照会で開く"
                      onClick={(event) => openJPlatPatNumberInquiry(event, candidate)}
                    >
                      <div>
                        <span className="badge badgeNeutral">{candidate.publicationNumber}</span>
                        <h4>{candidate.title}</h4>
                        <p>{candidate.abstract}</p>
                        <small>{candidate.assignee}</small>
                        <input
                          aria-label={`${candidate.patentNumber} の番号`}
                          className="documentNumberInput"
                          readOnly
                          value={candidate.patentNumber}
                        />
                        <em>クリックすると番号をコピーして、番号照会へ移動します。</em>
                      </div>
                      <strong>番号照会へ</strong>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="documentEmpty">
                  J-PlatPatの結果一覧から、文献番号を含む行を貼り付けるとここに表示します。
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function QuickJudgementPanel(props: {
  plan: GeneratedSearchPlan | null;
  primaryQuery: string;
  narrowedQuery: string;
  resultLines: string[];
  hitCount: number;
  pastedCount: number | null;
  keywordStats: { term: string; count: number }[];
  droppedTerms: string[];
  jplatpatCount: JPlatPatCountResult | null;
  loadingJplatpatCount: boolean;
  industryFilter: string;
  businessFilter: string;
  productFilter: string;
  jplatpatResults: string;
  onCopy: (text: string) => void;
  onFetchJplatpatCount: () => void;
  onDropTerm: (term: string) => void;
  onRemoveDroppedTerm: (term: string) => void;
  onIndustryFilter: (value: string) => void;
  onBusinessFilter: (value: string) => void;
  onProductFilter: (value: string) => void;
  onResultsChange: (value: string) => void;
}) {
  if (!props.plan) {
    return (
      <div id="quick" className="panel empty">
        <div className="emptyInner">
          <strong>まず会話テキストをコア単語に分解してください</strong>
          <p>抽出した単語、検索式、件数感、絞り込み導線をここに表示します。</p>
        </div>
      </div>
    );
  }

  const judgement = judgeRoughly(props.plan, props.hitCount);
  const countLabel = props.jplatpatCount
    ? props.jplatpatCount.status === "fetched"
      ? "自動取得"
      : "推定"
    : props.pastedCount !== null
      ? "貼り付け"
      : "未取得";

  return (
    <div id="quick" className="panel">
      <div className="panelHeader">
        <h2>検索判定</h2>
        <p>会話から抜いたコア単語で、特許がありそうかを見ます。</p>
      </div>
      <div className="panelBody">
        <div className="judgementGrid">
          <div className="judgementBox">
            <span className={`riskBadge ${judgement.className}`}>{judgement.label}</span>
            <h3>{judgement.title}</h3>
            <p>{judgement.description}</p>
          </div>
          <div className="judgementBox">
            <span className="hint">コア単語数</span>
            <strong className="largeNumber">{props.plan.keywords.length}</strong>
            <p className="hint">ここが検索の芯です。多すぎる場合は一度削ります。</p>
          </div>
          <div className="judgementBox">
            <span className="hint">ひっかかりそうな件数</span>
            <strong className="largeNumber">{props.hitCount.toLocaleString()}</strong>
            <p className="hint">{countLabel}ベース。取得後にキーワードの大きさへ反映します。</p>
          </div>
        </div>

        <h3 className="smallTitle" style={{ marginTop: 16 }}>コア検索式</h3>
        <div className="query">{props.primaryQuery}</div>
        <div className="actions">
          <button type="button" onClick={() => props.onCopy(props.primaryQuery)}>
            検索式をコピー
          </button>
          <button type="button" onClick={props.onFetchJplatpatCount} disabled={props.loadingJplatpatCount}>
            {props.loadingJplatpatCount ? "件数取得中..." : "J-PlatPat件数を取得"}
          </button>
          <a href="https://www.j-platpat.inpit.go.jp/" target="_blank" rel="noreferrer">
            <button type="button">J-PlatPatを開く</button>
          </a>
        </div>

        <div className="filterGrid">
          <TextField
            id="businessFilter"
            label="業種で絞り込み"
            value={props.businessFilter}
            onChange={props.onBusinessFilter}
            placeholder="例: 製造業、保守点検"
          />
          <TextField
            id="industryFilter"
            label="業界で絞り込み"
            value={props.industryFilter}
            onChange={props.onIndustryFilter}
            placeholder="例: 海洋機器"
          />
          <TextField
            id="productFilter"
            label="適用製品で絞り込み"
            value={props.productFilter}
            onChange={props.onProductFilter}
            placeholder="例: アナログメーター、計器"
          />
        </div>

        <h3 className="smallTitle">絞り込み後の検索式</h3>
        <div className="query">{props.narrowedQuery}</div>
        <div className="actions">
          <button type="button" onClick={() => props.onCopy(props.narrowedQuery)}>
            絞り込み検索式をコピー
          </button>
          {props.loadingJplatpatCount ? <span className="hint">件数を自動再取得中...</span> : null}
        </div>

        {props.jplatpatCount ? (
          <div className="countPanel">
            <div>
              <span className={`riskBadge ${props.jplatpatCount.status === "fetched" ? "riskLow" : "riskMedium"}`}>
                {props.jplatpatCount.status === "fetched" ? "J-PlatPat取得" : "推定件数"}
              </span>
              <p>{props.jplatpatCount.note}</p>
            </div>
            <div className="countChips">
              {props.jplatpatCount.categories.map((category) => (
                <span key={category.label}>
                  {category.label}: <b>{category.count.toLocaleString()}</b>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <h3 className="smallTitle">コア単語の強さ</h3>
        <KeywordCloud stats={props.keywordStats} onDropTerm={props.onDropTerm} />

        <div
          className="dropWindow"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const term = event.dataTransfer.getData("text/plain");
            if (term) props.onDropTerm(term);
          }}
        >
          <div className="dropWindowHeader">
            <div>
              <h3>絞り込み窓</h3>
              <p>上の単語をつかんでここに落とすと、検索式へ追加され、件数が減っていきます。</p>
            </div>
            <div className="dropCount">
              <span>現在</span>
              <strong>{props.hitCount.toLocaleString()}</strong>
              <small>件</small>
            </div>
          </div>
          <div className="droppedTerms">
            {props.droppedTerms.length ? (
              props.droppedTerms.map((term) => (
                <button type="button" key={term} onClick={() => props.onRemoveDroppedTerm(term)}>
                  {term} ×
                </button>
              ))
            ) : (
              <span className="hint">まだ単語が入っていません。</span>
            )}
          </div>
        </div>

        {props.hitCount <= 10 && props.hitCount > 0 ? (
          <div className="overviewPanel">
            <span className="riskBadge riskLow">10件以下</span>
            <div>
              <h3>文献・要約</h3>
              <p>絞り込み後の検索式を自動投入しました。この候補から原文の要約と請求項を確認します。</p>
            </div>
            <div className="query">{props.narrowedQuery}</div>
            <div className="documentList">
              {buildPatentSummaryCandidates({
                plan: props.plan,
                narrowedQuery: props.narrowedQuery,
                droppedTerms: props.droppedTerms,
                resultLines: props.resultLines,
              }).length ? (
                buildPatentSummaryCandidates({
                  plan: props.plan,
                  narrowedQuery: props.narrowedQuery,
                  droppedTerms: props.droppedTerms,
                  resultLines: props.resultLines,
                }).map((candidate) => (
                    <a
                      className="documentCard"
                      href={candidate.jplatpatUrl}
                      key={candidate.publicationNumber}
                      title="J-PlatPatの番号照会で開く"
                      onClick={(event) => openJPlatPatNumberInquiry(event, candidate)}
                    >
                      <div>
                        <span className="badge badgeNeutral">{candidate.publicationNumber}</span>
                        <h4>{candidate.title}</h4>
                        <p>{candidate.abstract}</p>
                        <small>{candidate.assignee}</small>
                        <input
                          aria-label={`${candidate.patentNumber} の番号`}
                          className="documentNumberInput"
                          readOnly
                          value={candidate.patentNumber}
                        />
                        <em>クリックすると番号をコピーして、番号照会へ移動します。</em>
                      </div>
                      <strong>番号照会へ</strong>
                    </a>
                ))
              ) : (
                <div className="documentEmpty">
                  J-PlatPatの結果一覧から、文献番号を含む行を貼り付けるとここに表示します。
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="notice">
          件数が多い場合は、単語を絞り込み窓に落とす作業を繰り返します。10件以下になったら概要候補を表示します。
        </div>

        <InputField
          id="jplatpatResults"
          label="J-PlatPatの結果を貼り付け"
          value={props.jplatpatResults}
          onChange={props.onResultsChange}
          hint="検索結果一覧のタイトル、公開番号、出願人などをそのまま貼り付けます。"
          minHeight={160}
        />

        {props.resultLines.length ? (
          <>
            <h3 className="smallTitle">貼り付け結果</h3>
            <div className="list">
              {props.resultLines.slice(0, 12).map((line, index) => (
                <div className="tag" key={`${line}-${index}`}>
                  <div>
                    <b>{line}</b>
                    <small>業種・業界・適用製品の語が含まれるか確認してください。</small>
                  </div>
                  <span className="badge badgeNeutral">結果</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function DetailResearchPanel(props: {
  plan: GeneratedSearchPlan | null;
  links: SearchLink[];
  metrics: { keywordCount: number; axisCount: number; linkCount: number };
  activeTab: TabId;
  analysis: PatentAnalysis | null;
  analysisRequest: PatentAnalysisRequest;
  loadingAnalysis: boolean;
  onTab: (id: TabId) => void;
  onCopy: (text: string) => void;
  onAnalysisChange: <K extends keyof PatentAnalysisRequest>(key: K, value: PatentAnalysisRequest[K]) => void;
  onAnalyze: () => void;
  onExport: () => void;
}) {
  return (
    <div id="detail" className="results">
      {!props.plan ? (
        <div className="panel empty">
          <div className="emptyInner">
            <strong>詳細調査へ進むには検索プランを作成してください</strong>
            <p>キーワード、検索リンク、請求項分析を表示します。</p>
          </div>
        </div>
      ) : (
        <SearchPlanPanel
          plan={props.plan}
          links={props.links}
          metrics={props.metrics}
          activeTab={props.activeTab}
          onTab={props.onTab}
          onCopy={props.onCopy}
        />
      )}

      <section id="analysis" className="panel">
        <div className="panelHeader">
          <h2>特許分析メモ</h2>
          <p>外部検索で見つけた請求項を貼り付け、構成要素と回避設計案を整理します。</p>
        </div>
        <div className="panelBody analysisLayout">
          <div>
            <TextField
              id="publicationNumber"
              label="公開番号・特許番号"
              value={props.analysisRequest.publicationNumber}
              onChange={(value) => props.onAnalysisChange("publicationNumber", value)}
              placeholder="例: JP2024-000000"
            />
            <TextField
              id="assignee"
              label="出願人"
              value={props.analysisRequest.assignee}
              onChange={(value) => props.onAnalysisChange("assignee", value)}
              placeholder="例: Example株式会社"
            />
            <InputField
              id="claimText"
              label="請求項または要約"
              value={props.analysisRequest.claimText}
              onChange={(value) => props.onAnalysisChange("claimText", value)}
              minHeight={180}
            />
            <div className="actions">
              <button className="primary" type="button" onClick={props.onAnalyze} disabled={props.loadingAnalysis}>
                {props.loadingAnalysis ? "分析中..." : "この特許を分析する"}
              </button>
              <button type="button" onClick={props.onExport}>
                Markdown で出力
              </button>
            </div>
          </div>
          <AnalysisPanel analysis={props.analysis} />
        </div>
      </section>
    </div>
  );
}

function SearchPlanPanel(props: {
  plan: GeneratedSearchPlan;
  links: SearchLink[];
  metrics: { keywordCount: number; axisCount: number; linkCount: number };
  activeTab: TabId;
  onTab: (id: TabId) => void;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="panel">
      <div className="tabs" role="tablist">
        <TabButton id="overview" active={props.activeTab} onClick={props.onTab} label="概要" />
        <TabButton id="keywords" active={props.activeTab} onClick={props.onTab} label="キーワード" />
        <TabButton id="links" active={props.activeTab} onClick={props.onTab} label="検索リンク" />
        <TabButton id="checklist" active={props.activeTab} onClick={props.onTab} label="チェック" />
      </div>
      <div className="panelBody">
        {props.activeTab === "overview" ? (
          <>
            <div className="summaryGrid">
              <Metric label="キーワード" value={props.metrics.keywordCount} />
              <Metric label="調査軸" value={props.metrics.axisCount} />
              <Metric label="検索リンク" value={props.metrics.linkCount} />
            </div>
            <h3 className="smallTitle" style={{ marginTop: 16 }}>
              {props.plan.summary.title}
            </h3>
            <p>{props.plan.summary.plainDescription}</p>
            <div className="list">
              {props.plan.searchAxes.map((axis) => (
                <InfoTag key={axis.axis} title={axis.axis} details={[axis.queryIntent, axis.notes]} badge="調査軸" />
              ))}
            </div>
          </>
        ) : null}

        {props.activeTab === "keywords" ? (
          <div className="list">
            {props.plan.keywords.map((keyword) => (
              <InfoTag
                key={`${keyword.category}-${keyword.term}`}
                title={keyword.term}
                details={[keyword.aliases.join(" / "), keyword.english.join(" / "), keyword.reason]}
                badge={keyword.category}
              />
            ))}
          </div>
        ) : null}

        {props.activeTab === "links" ? (
          <div className="list">
            {props.links.map((link) => (
              <div className="linkCard" key={`${link.site}-${link.label}-${link.query}`}>
                <h3>{link.label}</h3>
                <p className="hint">{link.guidance}</p>
                <div className="query">{link.query}</div>
                <div className="actions">
                  <a href={link.url} target="_blank" rel="noreferrer">
                    <button type="button">外部サイトで開く</button>
                  </a>
                  <button type="button" onClick={() => props.onCopy(link.copyText)}>
                    検索式をコピー
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {props.activeTab === "checklist" ? (
          <div className="list">
            {props.plan.checklist.map((item) => (
              <label className="checkItem" key={item.item}>
                <input type="checkbox" />
                <span>
                  {item.item}
                  <br />
                  <small className="hint">{item.reason}</small>
                </span>
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function KeywordCloud({
  stats,
  onDropTerm,
}: {
  stats: { term: string; count: number }[];
  onDropTerm?: (term: string) => void;
}) {
  if (!stats.length) {
    return <p className="hint">判定後に、検索語の重要度を大きさで表示します。</p>;
  }

  const max = Math.max(...stats.map((stat) => stat.count), 1);
  const min = Math.min(...stats.map((stat) => stat.count), 0);
  const range = Math.max(max - min, 1);

  return (
    <div className="keywordCloud" aria-label="キーワード可視化">
      {stats.slice(0, 18).map((stat) => {
        const scale = (stat.count - min) / range;
        const fontSize = 13 + scale * 15;
        return (
          <button
            className="keywordBubble"
            draggable
            type="button"
            key={stat.term}
            style={{ fontSize }}
            onClick={() => onDropTerm?.(stat.term)}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", stat.term);
              event.dataTransfer.effectAllowed = "copy";
            }}
          >
            {stat.term}
            <small>{stat.count.toLocaleString()}</small>
          </button>
        );
      })}
    </div>
  );
}

function buildKeywordStats(
  plan: GeneratedSearchPlan | null,
  resultLines: string[],
  jplatpatCount: JPlatPatCountResult | null,
) {
  if (jplatpatCount?.keywordBreakdown?.length) {
    return jplatpatCount.keywordBreakdown;
  }

  if (!plan) return [];

  const resultText = resultLines.join("\n").toLowerCase();
  return plan.keywords.map((keyword, index) => {
    const terms = [keyword.term, ...keyword.aliases, ...keyword.english].filter(Boolean);
    const occurrences = terms.reduce((sum, term) => sum + countOccurrences(resultText, term.toLowerCase()), 0);
    const base = Math.max(1, plan.keywords.length - index);
    return {
      term: keyword.term,
      count: occurrences > 0 ? occurrences * 12 + base : base,
    };
  });
}

function buildPatentSummaryCandidates(props: {
  plan: GeneratedSearchPlan;
  narrowedQuery: string;
  droppedTerms: string[];
  resultLines: string[];
}): PatentSummaryCandidate[] {
  const pasted = props.resultLines
    .filter((line) => !/検索結果|件/.test(line));

  if (pasted.length) {
    const pastedCandidates = pasted.flatMap((line, index) => {
      const patentNumber = extractPatentNumber(line);
      if (!patentNumber) return [];
      return [{
        publicationNumber: patentNumber || `貼付結果-${index + 1}`,
        patentNumber,
        title: line.slice(0, 42),
        assignee: "貼り付け結果から抽出",
        abstract: `${patentNumber} を番号照会に入れて、J-PlatPat上で書誌・要約・請求項を確認します。`,
        jplatpatUrl: buildJPlatPatCandidateUrl(props.narrowedQuery, patentNumber),
      }];
    });
    if (pastedCandidates.length) return pastedCandidates;
  }

  return buildKnownPatentCandidates(props);
}

function buildJPlatPatCandidateUrl(_query: string, patentNumber = "") {
  return patentNumber
    ? "https://www.j-platpat.inpit.go.jp/?uri=/p0000"
    : "https://www.j-platpat.inpit.go.jp/?uri=/p0100";
}

function openJPlatPatNumberInquiry(
  event: { preventDefault: () => void },
  candidate: PatentSummaryCandidate,
) {
  event.preventDefault();
  const opened = window.open(candidate.jplatpatUrl, "_blank", "noopener,noreferrer");
  void navigator.clipboard?.writeText(candidate.patentNumber).catch(() => undefined);

  if (!opened) {
    window.location.href = candidate.jplatpatUrl;
  }
}

function extractPatentNumber(text: string) {
  const patterns = [
    /JP\s?\d{4}[-‐‑‒–—ー－]?\d{5,6}\s?[A-Z]?\d?/i,
    /(?:特開|特表|再表|実開)\s?\d{4}[-‐‑‒–—ー－]?\d{5,6}/,
    /(?:特許|実用新案)(?:第)?\s?\d{6,8}\s?号?/,
    /\d{4}[-‐‑‒–—ー－]\d{5,6}/,
  ];

  for (const pattern of patterns) {
    const matched = text.match(pattern)?.[0];
    if (matched) return normalizePatentNumber(matched);
  }
  return "";
}

function normalizePatentNumber(numberText: string) {
  return numberText
    .replace(/[‐‑‒–—ー－]/g, "-")
    .replace(/\s+/g, "")
    .replace(/号$/, "");
}

function buildKnownPatentCandidates(props: {
  plan: GeneratedSearchPlan;
  narrowedQuery: string;
  droppedTerms: string[];
  resultLines: string[];
}) {
  const text = [
    props.narrowedQuery,
    ...props.droppedTerms,
    props.plan.summary.plainDescription,
    ...props.plan.keywords.map((keyword) => keyword.term),
  ].join(" ");

  if (!/(宗像\s?忠夫|テレジャパン|日豊通信|ドッドウエルビー)/.test(text)) return [];

  return [
    {
      publicationNumber: "特許第7653490",
      patentNumber: "特許第7653490",
      title: "認証プログラム、認証装置、及び認証システム",
      assignee: "株式会社ドッドウエルビー・エム・エス / 発明者: 宗像 忠夫ほか",
      abstract:
        "携帯電話端末の電話番号を用いて認証し、コストを抑えながらセキュリティ性の向上を図る認証システムです。",
      jplatpatUrl: buildJPlatPatCandidateUrl(props.narrowedQuery, "特許第7653490"),
    },
    {
      publicationNumber: "特許第7271771",
      patentNumber: "特許第7271771",
      title: "鍵管理システム、及び鍵管理装置",
      assignee: "株式会社ドッドウエルビー・エム・エス / 発明者: 宗像 忠夫ほか",
      abstract:
        "鍵収納箱と鍵管理サーバを用いて、建物識別情報と鍵利用予定情報を照合し、鍵収納箱の解錠を管理する鍵管理システムです。",
      jplatpatUrl: buildJPlatPatCandidateUrl(props.narrowedQuery, "特許第7271771"),
    },
    {
      publicationNumber: "特開2024-004453",
      patentNumber: "特開2024-004453",
      title: "鍵管理装置",
      assignee: "株式会社ドッドウエルビー・エム・エス / 発明者: 宗像 忠夫ほか",
      abstract:
        "鍵の利用予定と建物識別情報を対応付け、解錠要求信号に含まれる建物識別情報を照合して、鍵収納箱の解錠許可を出力する鍵管理装置です。",
      jplatpatUrl: buildJPlatPatCandidateUrl(props.narrowedQuery, "特開2024-004453"),
    },
    {
      publicationNumber: "特許第4959180",
      patentNumber: "特許第4959180",
      title: "仲介装置サーバ及び更新情報取得システム",
      assignee: "株式会社テレジャパン / 株式会社イーフォーシーリンク / 発明者: 宗像 忠夫ほか",
      abstract:
        "ウェブサイトの属性やURLを管理し、選択された掲載情報の更新確認に必要な情報を仲介する装置サーバです。",
      jplatpatUrl: buildJPlatPatCandidateUrl(props.narrowedQuery, "特許第4959180"),
    },
    {
      publicationNumber: "特開2007-148850",
      patentNumber: "特開2007-148850",
      title: "仲介装置サーバ及び更新情報取得システム",
      assignee: "株式会社テレジャパン / 株式会社イーフォーシーリンク / 発明者: 宗像 忠夫ほか",
      abstract:
        "特許第4959180に対応する公開公報です。公開番号から原文の要約、請求項、経過情報を確認できます。",
      jplatpatUrl: buildJPlatPatCandidateUrl(props.narrowedQuery, "特開2007-148850"),
    },
  ];
}

function countOccurrences(text: string, term: string) {
  if (!text || !term) return 0;
  return text.split(term).length - 1;
}

function extractCountFromText(text: string) {
  const patterns = [
    /検索結果(?:は)?\s*([\d,]+)\s*件/,
    /([:\：]?\s*[\d,]+)\s*件(?:でした|見つかりました|ヒット)?/,
    /特許[･・]実用新案\s*[（(]\s*([\d,]+)\s*[)）]/,
  ];
  for (const pattern of patterns) {
    const matched = text.match(pattern);
    const raw = matched?.[1]?.replace(/[^\d]/g, "");
    if (raw) return Number.parseInt(raw, 10);
  }
  return null;
}

function judgeRoughly(plan: GeneratedSearchPlan, hitCount: number) {
  if (hitCount >= 80) {
    return {
      label: "ありそう",
      title: "関連特許がある可能性が高めです",
      description: "件数が多めです。次は業界・用途・適用製品を足して、検索結果を絞り込んでください。",
      className: "riskHigh",
    };
  }

  if (hitCount >= 15 || plan.keywords.length >= 6) {
    return {
      label: "要調査",
      title: "近い特許が見つかる可能性があります",
      description: "構成要素や機能的表現が複数あります。まずJ-PlatPatで広めに検索し、結果を絞り込むのがよさそうです。",
      className: "riskMedium",
    };
  }

  return {
    label: "低め",
    title: "現時点では候補が絞られています",
    description: "ただし検索語が不足している可能性があります。部品名、処理方法、用途を追加して再検索してください。",
    className: "riskLow",
  };
}

function InputField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  required?: boolean;
  minHeight?: number;
}) {
  return (
    <div className="field">
      <label htmlFor={props.id}>{props.label}</label>
      <textarea
        id={props.id}
        required={props.required}
        value={props.value}
        style={props.minHeight ? { minHeight: props.minHeight } : undefined}
        onChange={(event) => props.onChange(event.target.value)}
      />
      {props.hint ? <span className="hint">{props.hint}</span> : null}
    </div>
  );
}

function TextField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={props.id}>{props.label}</label>
      <input
        id={props.id}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  );
}

function TabButton(props: {
  id: TabId;
  active: TabId;
  label: string;
  onClick: (id: TabId) => void;
}) {
  return (
    <button
      className={`tab ${props.active === props.id ? "tabActive" : ""}`}
      type="button"
      onClick={() => props.onClick(props.id)}
    >
      {props.label}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoTag({ title, details, badge }: { title: string; details: string[]; badge: string }) {
  return (
    <div className="tag">
      <div>
        <b>{title}</b>
        {details.filter(Boolean).map((detail, index) => (
          <small key={`${detail}-${index}`}>{detail}</small>
        ))}
      </div>
      <span className="badge">{badge}</span>
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: PatentAnalysis | null }) {
  if (!analysis) {
    return <p className="hint">分析結果はここに表示されます。</p>;
  }

  return (
    <div>
      <h3 className="smallTitle">構成要素分解</h3>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>要素</th>
              <th>平易な意味</th>
              <th>確認</th>
            </tr>
          </thead>
          <tbody>
            {analysis.claimElements.map((element) => {
              const comparison = analysis.comparisonTable.find((row) => row.elementId === element.id);
              return (
                <tr key={element.id}>
                  <td>{element.id}</td>
                  <td>{element.text}</td>
                  <td>{element.plainMeaning}</td>
                  <td>
                    <span className="badge badgeWarn">{comparison?.status ?? "不明"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="smallTitle" style={{ marginTop: 16 }}>
        回避設計案
      </h3>
      <div className="list">
        {analysis.designAroundIdeas.map((idea) => (
          <div className="tag" key={idea.idea}>
            <div>
              <b>{idea.idea}</b>
              <small>{idea.expectedEffect}</small>
              <small>事業影響: {idea.businessImpact}</small>
            </div>
            <span className="badge badgeNeutral">{idea.approach}</span>
          </div>
        ))}
      </div>
      <div className="notice">{analysis.sourceSummary.nonLegalNotice}</div>
    </div>
  );
}
