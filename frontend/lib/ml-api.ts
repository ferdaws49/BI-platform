// lib/ml-api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[${res.status}] ${err}`);
  }
  return res.json();
}
// lib/ml-api.ts

function toQueryParams(filters: any) {
  const p = new URLSearchParams();
  // Correction : Utiliser CamelCase pour correspondre au DTO NestJS
  if (filters.dateFrom) p.append("dateFrom", filters.dateFrom); // CamelCase !
  if (filters.dateTo) p.append("dateTo", filters.dateTo);
  
  if (filters.formationId && filters.formationId !== "all")
    p.append("formationId", filters.formationId);
  
  if (filters.formateurId && filters.formateurId !== "all")
    p.append("formateurId", filters.formateurId);
  
  if (filters.sessionType && filters.sessionType !== "Tout") {
    let sType = filters.sessionType.toLowerCase();
    if (sType === "en ligne") sType = "en_ligne";
    p.append("sessionType", sType);
  }
    
  return p;
}

function toFilterBody(filters: any) {
  const clean: any = {};
  if (filters.dateFrom) clean.dateFrom = filters.dateFrom;
  if (filters.dateTo) clean.dateTo = filters.dateTo;
  if (filters.formationId && filters.formationId !== "all") clean.formationId = Number(filters.formationId);
  if (filters.formateurId && filters.formateurId !== "all") clean.formateurId = Number(filters.formateurId);
  if (filters.sessionType && filters.sessionType !== "Tout") {
    let sType = filters.sessionType.toLowerCase();
    if (sType === "en ligne") sType = "en_ligne";
    clean.sessionType = sType;
  }
  return clean;
}


export const mlApi = {
  getCAHistorique: (filters: import("@/app/financier/predictive/types").FilterState) =>
    fetcher<any>(`/ml/ca/historique?${toQueryParams(filters).toString()}`),

  predictCA: (
    filters: import("@/app/financier/predictive/types").FilterState,
    periode: number
  ) =>
    fetcher<any>(`/ml/ca/predict/${periode}`, {
      method: "POST",
      body: JSON.stringify(toFilterBody(filters)),
    }),

  predictDeficit: (filters: import("@/app/financier/predictive/types").FilterState) =>
    fetcher<any>(`/ml/predict`, {
      method: "POST",
      body: JSON.stringify(toFilterBody(filters)),
    }),
};