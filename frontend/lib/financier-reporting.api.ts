const BASE_URL =  "http://localhost:5000";

export type ExportFormat = "pdf" | "excel" | "csv";
export type BackendPeriod = "custom"; // on force toujours custom + dates explicites

export interface ReportFilter {
  period: BackendPeriod;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface ReportKpis {
  revenue: number;
  cost: number;
  margin: number;
  recoveryRate: number;
  performanceVsPreviousPeriod: number;
}

export interface ReportSessionRow {
  sessionName: string;
  formationName: string;
  inscrits: number;
  capacite: number;
  revenue: number;
  cost: number;
  margin: number;
  recoveryRate: number;
  fillRate: number;
  status: string;
}

export interface ReportResponse {
  kpis: ReportKpis;
  sessions: ReportSessionRow[];
}

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("access_token") || "";
}

function buildQueryParams(filter: ReportFilter): URLSearchParams {
  const params = new URLSearchParams();
  params.set("period", filter.period);
  params.set("startDate", filter.startDate);
  params.set("endDate", filter.endDate);
  return params;
}

export async function fetchReportPreview(filter: ReportFilter): Promise<ReportResponse> {
  const params = buildQueryParams(filter);
  const url = `${BASE_URL}/finance/reports/preview?${params.toString()}`;
  
  console.log("[API] fetchReportPreview →", url); // debug

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Erreur ${res.status}`);
  }

  return res.json();
}

export async function exportReport(filter: ReportFilter, format: ExportFormat): Promise<void> {
  const params = buildQueryParams(filter);
  params.set("format", format);

  const url = `${BASE_URL}/finance/reports/export?${params.toString()}`;
  console.log("[API] exportReport →", url); // debug

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "*/*",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Erreur export ${res.status}`);
  }

  const blob = await res.blob();
  const urlBlob = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ext = format === "excel" ? "xlsx" : format;
  a.href = urlBlob;
  a.download = `rapport-finance-${new Date().toISOString().split("T")[0]}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(urlBlob);
}