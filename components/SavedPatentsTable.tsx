"use client";

import { useEffect, useState } from "react";

const JPLATPAT_URL = "https://www.j-platpat.inpit.go.jp/?uri=/p0000";

function copyAndOpen(registrationNumber: string) {
  // 数字のみ抽出してクリップボードにコピー
  const num = registrationNumber.replace(/\D/g, "");
  void navigator.clipboard?.writeText(num).catch(() => undefined);
  window.open(JPLATPAT_URL, "_blank", "noopener,noreferrer");
}

type PatentRow = {
  id: number;
  registration_number: string;
  publication_number: string;
  application_number: string;
  title: string;
  assignee: string;
  filing_date: string;
  registration_date: string;
  jplatpat_url: string;
  updated_at: string;
};

export function SavedPatentsTable({ apiPath = "" }: { apiPath?: string }) {
  const [rows, setRows] = useState<PatentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${apiPath}/api/patents`);
        if (res.ok) setRows(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [apiPath]);

  if (loading) return <p className="hint">読み込み中...</p>;
  if (!rows.length) return <p className="hint">保存済み特許はありません</p>;

  return (
    <div style={{ marginTop: 8, overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5f5f0", textAlign: "left" }}>
            <th style={thStyle}>公開・登録番号</th>
            <th style={thStyle}>発明の名称</th>
            <th style={thStyle}>出願人</th>
            <th style={thStyle}>出願日</th>
            <th style={thStyle}>登録日</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={{ borderBottom: "1px solid #e8e8e0" }}>
              <td style={tdStyle}>
                <a
                  href={JPLATPAT_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontWeight: 600, color: "#c45a00", textDecoration: "none" }}
                  onClick={(e) => {
                    e.preventDefault();
                    copyAndOpen(row.registration_number || row.publication_number);
                  }}
                  title="クリックで番号をコピー＆J-PlatPatを開く"
                >
                  {row.publication_number || row.registration_number}
                </a>
                {row.application_number && (
                  <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>
                    {row.application_number}
                  </div>
                )}
              </td>
              <td style={tdStyle}>{row.title}</td>
              <td style={tdStyle}>{row.assignee}</td>
              <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{row.filing_date}</td>
              <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{row.registration_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "6px 8px",
  fontWeight: 600,
  borderBottom: "2px solid #ddd",
  whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = { padding: "6px 8px", verticalAlign: "top" };
