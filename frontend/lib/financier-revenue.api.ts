const API =  "http://localhost:5000";
 
function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("access_token") || "";
}
 
async function fetchRevenue(endpoint: string, filters: Record<string, any> = {}) {
  const params = new URLSearchParams();
  
  
  Object.entries(filters).forEach(([key, val]) => {
    if (val === undefined || val === null || val === "") return;
    if (typeof val === "number" && isNaN(val)) return; // 🔒 bloque NaN
    params.append(key, String(val));
  });
 
  const token = getToken();
  console.log("TOKEN DEBUG:", token);

  console.log("HEADERS:", {
  Authorization: `Bearer ${token}`,
}); 
  console.log("PARAMS SENT:", params.toString());
  console.log("TOKEN SENT:", token);
  const res = await fetch(`${API}/${endpoint}?${params.toString()}`, {
    
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  
  });
  console.log("AUTH HEADER:", `Bearer ${token}`);
 
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
  getRevenueEvolution: (f: any) =>
    fetchRevenue("revenue/charts/revenue-evolution-by-formation", f),
  getTopFormationsBar: (f: any) =>
    fetchRevenue("revenue/charts/top-formations-bar", f),
  getCategoryPie: (f: any) =>
    fetchRevenue("revenue/charts/revenue-by-category-pie", f),
  getBubble: (f: any) => fetchRevenue("revenue/charts/bubble", f),
  getSessionsTable: (f: any) =>
    fetchRevenue("revenue/table/sessions-revenue", f),
 
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
  getPaymentTable: (f: any) => fetchRevenue("finance/payments/table", f ),
 
  // ── CRUD Paiements ──
  addPayment: (dto: {
    userId: number;
    formationId: number;
    montant: number;
    paymentDate: string;
    sessionId?: number;
  }) => fetchJSON("finance/payments", { method: "POST", body: JSON.stringify(dto) }),
 
  updatePayment: (
    id: number,
    dto: {
      userId: number;
      formationId: number;
      montant: number;
      paymentDate: string;
    }
  ) =>
    fetchJSON(`finance/payments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),
 
  deletePayment: (id: number) =>
    fetchJSON(`finance/payments/${id}`, { method: "DELETE" }),
 
  // ── Référentiels (pour les selects du modal) ──
  getApprenants: (): Promise<{ id: number; nom: string; initiales: string }[]> =>
    fetchRevenue("users/apprenants-list"),
 
  getFormationsList: (): Promise<{ id: number; title: string }[]> =>
    fetchRevenue("formations/list"),

  async getSessionsByApprenant(id: number) {
    const token = getToken();

  const res = await fetch(`${API}/finance/payments/apprenants/${id}/sessions`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) throw new Error(`Erreur sessions: ${res.status}`);
  return res.json();
},
};