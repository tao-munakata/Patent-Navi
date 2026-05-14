"use client";

import { useEffect, useRef, useState } from "react";

export type PatentCandidate = {
  publicationNumber: string;
  patentNumber: string;
  title: string;
  assignee: string;
  abstract: string;
  jplatpatUrl: string;
  similarity?: number;
  kind?: "number" | "search";
};

type JpoRow = {
  loading: boolean;
  error: string;
  title: string;
  applicants: string;
  filingDate: string;
  publicationNumber: string;
  registrationNumber: string;
  registrationDate: string;
};

const STORAGE_KEY = "patent-navi-app-numbers";

function loadStoredMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function saveStoredMap(map: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function extractRegistrationNumber(patentNumber: string): string {
  return patentNumber.replace(/^特許第?/, "").replace(/号$/, "").replace(/\D/g, "");
}

function statusLabel(candidate: PatentCandidate): string {
  if (candidate.patentNumber.includes("特許第")) return "登録";
  if (candidate.publicationNumber.startsWith("特開") || candidate.publicationNumber.startsWith("特表")) return "公開";
  return "出願";
}

export function PatentCandidateTable({
  candidates,
  apiPath = "",
}: {
  candidates: PatentCandidate[];
  apiPath?: string;
}) {
  const [appNumberMap, setAppNumberMap] = useState<Record<string, string>>({});
  const [inputMap, setInputMap] = useState<Record<string, string>>({});
  const [showInputFor, setShowInputFor] = useState<string | null>(null);
  const [jpoRows, setJpoRows] = useState<Record<string, JpoRow>>({});
  const fetchedRef = useRef(new Set<string>());

  useEffect(() => {
    const stored = loadStoredMap();
    setAppNumberMap(stored);
    setInputMap(Object.fromEntries(Object.entries(stored).map(([k, v]) => [k, v])));
  }, []);

  // 保存済み出願番号があれば自動フェッチ
  useEffect(() => {
    for (const [pubNum, appNum] of Object.entries(appNumberMap)) {
      if (appNum && !fetchedRef.current.has(pubNum)) {
        void fetchJpo(pubNum, appNum);
      }
    }
  }, [appNumberMap]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchJpo(pubNum: string, appNum: string) {
    if (fetchedRef.current.has(pubNum)) return;
    fetchedRef.current.add(pubNum);
    setJpoRows((prev) => ({ ...prev, [pubNum]: { loading: true, error: "", title: "", applicants: "", filingDate: "", publicationNumber: "", registrationNumber: "", registrationDate: "" } }));
    try {
      const res = await fetch(`${apiPath}/api/jpo-patent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patentNumber: appNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "エラー");
      const d = data.detail;
      setJpoRows((prev) => ({
        ...prev,
        [pubNum]: {
          loading: false,
          error: "",
          title: d.title ?? "",
          applicants: (d.applicants as string[]).join("、"),
          filingDate: d.filingDate ?? "",
          publicationNumber: d.publicationNumber ?? "",
          registrationNumber: d.registrationNumber ?? "",
          registrationDate: d.registrationDate ?? "",
        },
      }));
    } catch (e) {
      fetchedRef.current.delete(pubNum);
      setJpoRows((prev) => ({
        ...prev,
        [pubNum]: { loading: false, error: e instanceof Error ? e.message : "エラー", title: "", applicants: "", filingDate: "", publicationNumber: "", registrationNumber: "", registrationDate: "" },
      }));
    }
  }

  function handleSave(pubNum: string) {
    const appNum = (inputMap[pubNum] ?? "").trim();
    if (!appNum) return;
    const next = { ...appNumberMap, [pubNum]: appNum };
    setAppNumberMap(next);
    saveStoredMap(next);
    setShowInputFor(null);
    fetchedRef.current.delete(pubNum);
    void fetchJpo(pubNum, appNum);
  }

  if (!candidates.length) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span className="riskBadge riskLow">{candidates.length}件</span>
        <h3 style={{ margin: 0, fontSize: 14 }}>特許番号・出願人一覧</h3>
        <span className="hint">番号・出願人・状態を比較します</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f5f5f0", textAlign: "left" }}>
              <th style={thStyle}>No</th>
              <th style={thStyle}>公開・登録番号</th>
              <th style={thStyle}>発明の名称</th>
              <th style={thStyle}>出願人</th>
              <th style={thStyle}>状態</th>
              <th style={thStyle}>特許庁API</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, i) => {
              const pubNum = c.publicationNumber || c.patentNumber;
              const jpo = jpoRows[pubNum];
              const appNum = appNumberMap[pubNum] ?? "";
              const status = statusLabel(c);
              const regNum = extractRegistrationNumber(c.patentNumber);

              return (
                <tr key={pubNum} style={{ borderBottom: "1px solid #e8e8e0" }}>
                  <td style={tdStyle}>{i + 1}</td>

                  {/* 公開・登録番号 */}
                  <td style={tdStyle}>
                    <a
                      href={c.jplatpatUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontWeight: 600, color: "#c45a00", textDecoration: "none" }}
                      onClick={(e) => {
                        e.preventDefault();
                        const num = c.patentNumber ? regNum : pubNum;
                        void navigator.clipboard?.writeText(num).catch(() => undefined);
                        window.open(c.jplatpatUrl, "_blank", "noopener,noreferrer");
                      }}
                    >
                      {pubNum}
                    </a>
                    {appNum ? (
                      <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>出願番号: {appNum}</div>
                    ) : (
                      <div style={{ color: "#bbb", fontSize: 11, marginTop: 2 }}>出願番号未取得</div>
                    )}
                  </td>

                  {/* 発明の名称 */}
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 500 }}>{jpo?.title || c.title}</span>
                    {jpo?.filingDate && (
                      <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>出願日: {jpo.filingDate}</div>
                    )}
                    {jpo?.registrationDate && (
                      <div style={{ color: "#888", fontSize: 11 }}>登録日: {jpo.registrationDate}</div>
                    )}
                  </td>

                  {/* 出願人 */}
                  <td style={tdStyle}>
                    {jpo?.applicants || c.assignee}
                  </td>

                  {/* 状態 */}
                  <td style={tdStyle}>
                    <span className={`badge ${status === "登録" ? "badgeWarn" : "badgeNeutral"}`}>
                      {status}
                    </span>
                  </td>

                  {/* 特許庁API */}
                  <td style={{ ...tdStyle, minWidth: 120 }}>
                    {jpo?.loading ? (
                      <span className="hint">取得中...</span>
                    ) : jpo?.error ? (
                      <span style={{ color: "red", fontSize: 11 }}>{jpo.error}</span>
                    ) : jpo?.title ? (
                      <span style={{ color: "green", fontSize: 11 }}>✓ 取得済</span>
                    ) : showInputFor === pubNum ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <input
                          style={{ fontSize: 11, padding: "2px 4px", width: 120, border: "1px solid #ccc", borderRadius: 4 }}
                          placeholder="例: 2020-123456"
                          value={inputMap[pubNum] ?? ""}
                          onChange={(e) => setInputMap((prev) => ({ ...prev, [pubNum]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSave(pubNum); }}
                          autoFocus
                        />
                        <div style={{ display: "flex", gap: 4 }}>
                          <button type="button" className="primary" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => handleSave(pubNum)}>
                            取得
                          </button>
                          <button type="button" style={{ fontSize: 11, padding: "2px 6px" }} onClick={() => setShowInputFor(null)}>
                            ×
                          </button>
                        </div>
                        <span style={{ color: "#888", fontSize: 10 }}>J-PlatPatの書誌欄で確認</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        style={{ fontSize: 11, padding: "3px 8px" }}
                        onClick={() => setShowInputFor(pubNum)}
                      >
                        出願番号入力
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "6px 8px", fontWeight: 600, borderBottom: "2px solid #ddd", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "6px 8px", verticalAlign: "top" };
