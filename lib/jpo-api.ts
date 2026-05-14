const JPO_BASE = "https://ip-data.jpo.go.jp";

type TokenCache = { token: string; expiresAt: number } | null;
let tokenCache: TokenCache = null;

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }
  const id = process.env.JPO_API_ID;
  const pw = process.env.JPO_API_PASSWORD;
  if (!id || !pw) throw new Error("JPO_API_ID / JPO_API_PASSWORD が未設定です");

  const res = await fetch(`${JPO_BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "password", username: id, password: pw }),
  });
  if (!res.ok) throw new Error(`JPO認証失敗: ${res.status}`);
  const json = await res.json();
  tokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return tokenCache.token;
}

async function jpoGet(path: string): Promise<Record<string, unknown>> {
  const token = await getToken();
  const res = await fetch(`${JPO_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`JPO API エラー ${res.status}: ${path}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export type JpoPatentDetail = {
  applicationNumber: string;
  title: string;
  applicants: string[];
  attorneys: string[];
  filingDate: string;
  publicationNumber: string;
  registrationNumber: string;
  registrationDate: string;
  remainAccessCount: number;
  rawData: unknown;
};

type ApplicantAttorney = {
  name?: string;
  applicantAttorneyClass?: string;
};

function formatDate(d: string): string {
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return d;
}

function formatADPubNumber(n: string): string {
  if (n.length === 10) return `特開${n.slice(0, 4)}-${n.slice(4)}`;
  return n;
}

function parseDetail(json: unknown): JpoPatentDetail {
  const result = (json as Record<string, unknown>)["result"] as Record<string, unknown> | undefined;
  const data = (result?.["data"] as Record<string, unknown>) ?? {};
  const remain = Number(result?.["remainAccessCount"] ?? 0);

  const aa = (data["applicantAttorney"] as ApplicantAttorney[] | undefined) ?? [];
  const applicants = aa.filter((x) => x.applicantAttorneyClass === "1").map((x) => x.name ?? "").filter(Boolean);
  const attorneys = aa.filter((x) => x.applicantAttorneyClass === "2").map((x) => x.name ?? "").filter(Boolean);

  const adPub = String(data["ADPublicationNumber"] ?? "");
  const regNum = String(data["registrationNumber"] ?? "");
  const regDate = String(data["registrationDate"] ?? "");

  return {
    applicationNumber: String(data["applicationNumber"] ?? ""),
    title: String(data["inventionTitle"] ?? ""),
    applicants,
    attorneys,
    filingDate: formatDate(String(data["filingDate"] ?? "")),
    publicationNumber: adPub ? formatADPubNumber(adPub) : "",
    registrationNumber: regNum ? `特許第${regNum}` : "",
    registrationDate: regDate ? formatDate(regDate) : "",
    remainAccessCount: remain,
    rawData: data,
  };
}

// 入力から 10 桁の出願番号を取り出す（例: "2022-069388" → "2022069388"）
export function normalizeApplicationNumber(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 10) {
    throw new Error(
      `出願番号は YYYY-NNNNNN（10 桁）の形式で入力してください。例: 2022-069388\n入力値: "${input}"`,
    );
  }
  return digits;
}

export async function fetchJpoPatent(applicationNumberInput: string): Promise<JpoPatentDetail> {
  const appNum = normalizeApplicationNumber(applicationNumberInput);
  const json = await jpoGet(`/api/patent/v1/app_progress/${appNum}`);
  return parseDetail(json);
}
