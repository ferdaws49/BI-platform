
const API =  "http://localhost:5000";

export interface FormationSelect {
  id: number;
  title: string;
}

export interface PaymentTableResponse {
  items: any[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  startItem: number;
  endItem: number;
}



 
function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("access_token") || "";
}
 
async function fetchRevenue(endpoint: string, filters: Record<string, any> = {}) {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, val]) => {
  if (val === undefined || val === null || val === "" || String(val) === "undefined") {
    return;
  }

  if (key === "limit") {
    params.append(key, String(Math.min(Number(val), 100)));
    return;
  }

  params.append(key, String(val));
});
const safeLimit = Math.min(Number(filters.limit ?? 100), 100);
 
  const token = localStorage.getItem('access_token'); 
  const query = params.toString();
  const url = `${API}/${endpoint}${query ? `?${query}` : ""}`;

  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error(`Erreur API ${endpoint}: ${res.status}`);
  return res.json();
}
 
async function fetchJSON(endpoint: string, opts?: RequestInit) {
  const token = getToken();
  const res = await fetch(`${API}/${endpoint}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "Erreur serveur");
    throw new Error(`${res.status}: ${err}`);
  }
  if (res.status === 204) return undefined;
  return res.json();
}



 
export const revenueApi = {
  // ── Onglet CA ──
  getKpiCards: (f: any) => fetchRevenue("revenue/kpi-cards", f),
  getRevenueEvolution: (f: any) =>fetchRevenue("revenue/charts/revenue-evolution-by-formation", f),
  getTopFormationsBar: (f: any) =>fetchRevenue("revenue/charts/top-formations-bar", f),
  getCategoryPie: (f: any) =>fetchRevenue("revenue/charts/revenue-by-category-pie", f),
  getBubble: (f: any) => fetchRevenue("revenue/charts/bubble", f),
  getSessionsTable: (f: any) =>fetchRevenue("revenue/table/sessions-revenue", f),
 
  exportSessionsCsv: async (f: any): Promise<Blob> => {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
    });
    const token = getToken();
    const res = await fetch(
      `${API}/revenue/table/sessions-revenue/export?${params.toString()}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    if (!res.ok) throw new Error("Export CSV échoué");
    return res.blob();
  },
 
  // ── Onglet Paiements ──
  getPaymentKpis: (f: any) => fetchRevenue("finance/payments/kpis", f),
  getPaymentPie: (f: any) => fetchRevenue("finance/payments/charts/pie", f),
  getPaymentBar: (f: any) => fetchRevenue("finance/payments/charts/bar", f),
  
getPaymentTable: (f: any): Promise<PaymentTableResponse> => 
  fetchRevenue("finance/payments/table", f), 
  // ── CRUD Paiements ──
  addPayment: (dto: {
    apprenantId: number;
    formationId: number;
    montant: number;
    paymentDate: string;
    sessionId?: string | number;
  }) => fetchJSON("finance/payments", { method: "POST", body: JSON.stringify(dto) }),
 
  updatePayment: (
    id: number,
    dto: {
      apprenantId: number;
      formationId: number;
      montant: number;
      paymentDate: string;
      sessionId?: string | number;
      id?: number; // Il est peut-être présent ici
    }
  ) =>
    {
  // On déstructure pour extraire 'id' et ne garder que le reste dans 'data'
  const { id: _unusedId, ...data } = dto;

  return fetchJSON(`finance/payments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data), // On envoie 'data' qui ne contient plus 'id'
  });
},
 
  deletePayment: (id: number) =>
    fetchJSON(`finance/payments/${id}`, { method: "DELETE" }),
 
  // ── Référentiels (pour les selects du modal) ──
  getApprenants: (): Promise<{ id: number; nom: string; initiales: string }[]> =>
    fetchRevenue("inscriptions/apprenants-list"),
 
  getFormationsList: async (): Promise<FormationSelect[]> => {
    const res = await fetchRevenue("financier/dashboard/formations");

    const list =
      Array.isArray(res)
        ? res
        : res?.data
        ?? res?.formations
        ?? [];

    return list.map((f: any) => ({
      id: f.formation_id ?? f.id,
      title: f.titre ?? f.title,
    }));
  },

  getFormateursList: async (): Promise<{ id: number; name: string }[]> => {
    const res = await fetchRevenue("financier/dashboard/formateurs");

    const list =
      Array.isArray(res)
        ? res
        : res?.data
        ?? res?.formateurs
        ?? [];

    return list.map((f: any) => ({
      id: f.formateur_id ?? f.id,
      name: f.nom ?? f.name,
    }));
  },

  async getSessionsByApprenant(id: number): Promise<{ id: number | string; title: string; formationId: number }[]> {
    const token = getToken();
    const res = await fetch(`${API}/finance/payments/apprenants/${id}/sessions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Erreur sessions: ${res.status}`);
    return res.json();
  }
};