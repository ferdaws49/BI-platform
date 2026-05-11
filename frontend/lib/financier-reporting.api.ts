// src/api/financeReporting.ts

const BASE_URL ="http://localhost:5000";

export type Period = "current_month" | "current_quarter" | "current_year" | "custom";
export type ExportFormat = "pdf" | "excel" | "csv";

export interface ReportFilter {
  period?: Period;
  startDate?: string;
  endDate?: string;
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
  status: "rentable" | "seuil" | "deficitaire";
}

export interface ReportResponse {
  kpis: ReportKpis;
  sessions: ReportSessionRow[];
}

function buildQuery(filter: ReportFilter & { format?: ExportFormat }): string {
  const params = new URLSearchParams();
  if (filter.period) params.set("period", filter.period);
  if (filter.startDate) params.set("startDate", filter.startDate);
  if (filter.endDate) params.set("endDate", filter.endDate);
  if (filter.format) params.set("format", filter.format);
  return params.toString();
}

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("access_token") || "";
}

export async function fetchReportPreview(filter: ReportFilter): Promise<ReportResponse> {
  const query = buildQuery(filter);
  const res = await fetch(`${BASE_URL}/finance/reports/preview?${query}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.json();
}

export async function exportReport(
  filter: ReportFilter,
  format: ExportFormat
): Promise<void> {
  const query = buildQuery({ ...filter, format });
  const res = await fetch(`${BASE_URL}/finance/reports/export?${query}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  if (!res.ok) throw new Error(`Erreur export ${res.status}`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ext = format === "excel" ? "xlsx" : format;
  a.href = url;
  a.download = `finance-report.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}