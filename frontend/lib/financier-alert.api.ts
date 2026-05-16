import { AlertResponse } from "@/app/financier/alerts/types/alert.types";

const API_URL ='http://localhost:5000';

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("access_token") || "";
}


export async function fetchAlerts(params?: {
  startDate?: string;
  endDate?: string;
  formationId?: number;
}): Promise<AlertResponse> {

    const token = getToken();
  const query = new URLSearchParams();
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);
  if (params?.formationId) query.append('formationId', String(params.formationId));

  const res = await fetch(`${API_URL}/finance/alerts?${query.toString()}`, {
    headers: {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
}
  });

  if (!res.ok) throw new Error('Erreur lors du chargement des alertes');
  return res.json();
}