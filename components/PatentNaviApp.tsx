"use client";

import { useMemo, useState } from "react";
import { buildResearchMarkdown } from "@/lib/markdown-export";
import type {
  GeneratedSearchPlan,
  IdeaInput,
  PatentAnalysis,
  PatentAnalysisRequest,
  SearchLink,
} from "@/types/patent";

const initialInput: IdeaInput = {
  functionSummary: "スマートフォンのカメラ映像から作業者の危険姿勢を検出して通知する",
  problemToSolve: "作業現場で転倒や腰痛につながる姿勢を早期に警告したい",
  usageScene: "建設現場、物流倉庫、介護施設",
  components: "カメラ、姿勢推定AI、スマートフォン通知、振動アラート",
  competitors: "安全管理アプリ、ウェアラブル安全管理サービス",
};

const initialAnalysisRequest: PatentAnalysisRequest = {
  projectSummary: initialInput.functionSummary,
  publicationNumber: "",
  assignee: "",
  abstractText: "",
  claimText:
    "作業者を撮像する撮像手段と、撮像画像から作業者の姿勢を推定する姿勢推定手段と、推定された姿勢が所定の危険条件を満たす場合に警告を出力する通知手段とを備える安全管理システム。",
  userConcern: "",
};

type TabId = "overview" | "keywords" | "links" | "checklist";

export function PatentNaviApp() {
  const [input, setInput] = useState<IdeaInput>(initialInput);
  const [analysisRequest, setAnalysisRequest] = useState<PatentAnalysisRequest>(initialAnalysisRequest);
  const [plan, setPlan] = useState<GeneratedSearchPlan | null>(null);
  const [links, setLinks] = useState<SearchLink[]>([]);
  const [analysis, setAnalysis] = useState<PatentAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const metrics = useMemo(
    () => ({
      keywordCount: plan?.keywords.length ?? 0,
      axisCount: plan?.searchAxes.length ?? 0,
      linkCount: links.length,
    }),
    [links.length, plan],
  );

  async function createPlan() {
    setError("");
    setMessage("");
    if (!input.functionSummary.trim()) {
      setError("機能概要を入力してください。");
      return;
    }

    setLoadingPlan(true);
    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "調査プランの作成に失敗しました。");
      setPlan(data.plan);
      setLinks(data.links);
      setAnalysisRequest((current) => ({
        ...current,
        projectSummary: data.plan.summary.plainDescription || input.functionSummary,
      }));
      setActiveTab("overview");
      setMessage(data.source === "openai" ? "AI で調査プランを作成しました。" : "サンプル生成で調査プランを作成しました。");
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
      const response = await fetch("/api/analyze-patent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysisRequest),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "分析に失敗しました。");
      setAnalysis(data.analysis);
      setMessage("特許分析メモを作成しました。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "分析に失敗しました。");
    } finally {
      setLoadingAnalysis(false);
    }
  }

  function updateInput<K extends keyof IdeaInput>(key: K, value: IdeaInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function updateAnalysis<K extends keyof PatentAnalysisRequest>(
    key: K,
    value: PatentAnalysisRequest[K],
  ) {
    setAnalysisRequest((current) => ({ ...current, [key]: value }));
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setMessage("検索式をコピーしました。");
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
              <span>事業アイデアから特許調査の入口へ</span>
            </div>
          </div>
          <nav className="nav" aria-label="ページ内ナビゲーション">
            <a href="#input">入力</a>
            <a href="#plan">調査プラン</a>
            <a href="#analysis">分析</a>
            <a href="/docs/requirements.md">要件定義</a>
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="workbench">
          <section id="input" className="panel">
            <div className="panelHeader">
              <h1>調査テーマ</h1>
              <p>事業・製品アイデアを入力すると、検索語、調査軸、外部検索リンクを作成します。</p>
            </div>
            <div className="panelBody">
              <InputField
                id="functionSummary"
                label="機能概要"
                value={input.functionSummary}
                onChange={(value) => updateInput("functionSummary", value)}
                hint="何を入力し、何を処理し、何を出力するかを書きます。"
                required
              />
              <InputField
                id="problemToSolve"
                label="解決したい課題"
                value={input.problemToSolve}
                onChange={(value) => updateInput("problemToSolve", value)}
              />
              <TextField
                id="usageScene"
                label="利用シーン・業界"
                value={input.usageScene}
                onChange={(value) => updateInput("usageScene", value)}
              />
              <InputField
                id="components"
                label="具体的な部品・技術"
                value={input.components}
                onChange={(value) => updateInput("components", value)}
              />
              <InputField
                id="competitors"
                label="競合製品・企業"
                value={input.competitors}
                onChange={(value) => updateInput("competitors", value)}
              />

              <div className="actions">
                <button className="primary" type="button" onClick={createPlan} disabled={loadingPlan}>
                  {loadingPlan ? "作成中..." : "調査プランを作成"}
                </button>
                <button type="button" onClick={() => setInput(initialInput)}>
                  入力例に戻す
                </button>
              </div>

              <div className="notice">
                このツールは調査観点の整理用です。法的判断、鑑定、侵害有無の断定は提供しません。
              </div>
              {message ? <div className="notice">{message}</div> : null}
              {error ? <div className="notice error">{error}</div> : null}
            </div>
          </section>

          <section id="plan" className="results">
            {!plan ? (
              <div className="panel empty">
                <div className="emptyInner">
                  <strong>ここに調査プランが表示されます</strong>
                  <p>キーワード、調査軸、検索リンク、確認チェックリストをまとめて確認できます。</p>
                </div>
              </div>
            ) : (
              <div className="panel">
                <div className="tabs" role="tablist">
                  <TabButton id="overview" active={activeTab} onClick={setActiveTab} label="概要" />
                  <TabButton id="keywords" active={activeTab} onClick={setActiveTab} label="キーワード" />
                  <TabButton id="links" active={activeTab} onClick={setActiveTab} label="検索リンク" />
                  <TabButton id="checklist" active={activeTab} onClick={setActiveTab} label="チェック" />
                </div>
                <div className="panelBody">
                  {activeTab === "overview" ? (
                    <>
                      <div className="summaryGrid">
                        <Metric label="キーワード" value={metrics.keywordCount} />
                        <Metric label="調査軸" value={metrics.axisCount} />
                        <Metric label="検索リンク" value={metrics.linkCount} />
                      </div>
                      <h3 className="smallTitle" style={{ marginTop: 16 }}>
                        {plan.summary.title}
                      </h3>
                      <p>{plan.summary.plainDescription}</p>
                      <div className="list">
                        {plan.searchAxes.map((axis) => (
                          <InfoTag key={axis.axis} title={axis.axis} details={[axis.queryIntent, axis.notes]} badge="調査軸" />
                        ))}
                      </div>
                    </>
                  ) : null}

                  {activeTab === "keywords" ? (
                    <div className="list">
                      {plan.keywords.map((keyword) => (
                        <InfoTag
                          key={`${keyword.category}-${keyword.term}`}
                          title={keyword.term}
                          details={[
                            keyword.aliases.join(" / "),
                            keyword.english.join(" / "),
                            keyword.reason,
                          ]}
                          badge={keyword.category}
                        />
                      ))}
                    </div>
                  ) : null}

                  {activeTab === "links" ? (
                    <div className="list">
                      {links.map((link) => (
                        <div className="linkCard" key={`${link.site}-${link.label}-${link.query}`}>
                          <h3>{link.label}</h3>
                          <p className="hint">{link.guidance}</p>
                          <div className="query">{link.query}</div>
                          <div className="actions">
                            <a href={link.url} target="_blank" rel="noreferrer">
                              <button type="button">外部サイトで開く</button>
                            </a>
                            <button type="button" onClick={() => copyText(link.copyText)}>
                              検索式をコピー
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {activeTab === "checklist" ? (
                    <div className="list">
                      {plan.checklist.map((item) => (
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
                    value={analysisRequest.publicationNumber}
                    onChange={(value) => updateAnalysis("publicationNumber", value)}
                    placeholder="例: JP2024-000000"
                  />
                  <TextField
                    id="assignee"
                    label="出願人"
                    value={analysisRequest.assignee}
                    onChange={(value) => updateAnalysis("assignee", value)}
                    placeholder="例: Example株式会社"
                  />
                  <InputField
                    id="claimText"
                    label="請求項または要約"
                    value={analysisRequest.claimText}
                    onChange={(value) => updateAnalysis("claimText", value)}
                    minHeight={180}
                  />
                  <div className="actions">
                    <button className="primary" type="button" onClick={analyzePatent} disabled={loadingAnalysis}>
                      {loadingAnalysis ? "分析中..." : "この特許を分析する"}
                    </button>
                    <button type="button" onClick={exportMarkdown}>
                      Markdown で出力
                    </button>
                  </div>
                </div>
                <AnalysisPanel analysis={analysis} />
              </div>
            </section>
          </section>
        </div>
      </main>
    </>
  );
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
        {details.filter(Boolean).map((detail) => (
          <small key={detail}>{detail}</small>
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
