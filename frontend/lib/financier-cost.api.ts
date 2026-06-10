const API = "http://localhost:5000";

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("access_token") || "";
}

/**
 * Builds query params from a mapped filter object and calls the given endpoint.
 *
 * Rules:
 * - undefined / null / "" / "all" → skipped (never sent to backend)
 * - If neither startDate nor endDate nor periodPreset is present after mapping,
 *   we default to periodPreset=year so the backend always has a valid time range.
 *   We do NOT inject hardcoded date strings — that was the root cause of
 *   periodPreset being overridden by explicit dates.
 */

async function fetchCost(
  endpoint: string,
  filters: Record<string, unknown> = {},
) {
  const params = new URLSearchParams();

  for (const [key, val] of Object.entries(filters)) {
  if (
    val === undefined ||
    val === null ||
    val === "" ||
    val === "all" ||
    val === "undefined"
  ) continue;

  if (key === "limit") {
    const safeLimit = Math.min(Number(val), 100);
    params.append(key, String(safeLimit));
    continue;
  }

  params.append(key, String(val));
}

  // Safety net: if the caller provided no time-range information at all,
  // tell the backend to use the current year. This covers the edge case
  // where mapFilters returns an object with no period key (e.g. the
  // "Personnalisé" mode with both date fields still empty).
  const hasTimeRange =
    params.has("startDate") ||
    params.has("endDate") ||
    params.has("periodPreset");

  if (!hasTimeRange) {
    params.set("periodPreset", "year");
  }

  const token = getToken();

  console.log("🔥 FINAL URL PARAMS:", Object.fromEntries(params.entries()));
  const res = await fetch(`${API}/${endpoint}?${params.toString()}`, {
    headers: {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
}
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
  throw new Error(
    `Erreur API ${endpoint}: ${res.status} - ${JSON.stringify(body)}`
  );
  }

  return res.json();
}

export const costApi = {
  getKpi:           (f: any) => fetchCost("finance/cout/kpi",            f),
  getTopFormateurs: (f: any) => fetchCost("finance/cout/top-formateurs", f),
  getEfficience:    (f: any) => fetchCost("finance/cout/efficience",     f),
  getRepartition:   (f: any) => fetchCost("finance/cout/repartition",    f),
  getTrend:         (f: any) => fetchCost("finance/cout/trend",          f),
  getSessions:      (f: any) => fetchCost("finance/cout/sessions",       f),

  async addExpense(payload: {
    type: "depense_formateur" | "depense_logistique";
    sessionId: string;
    montant: number;
    formateurId?: number;
    formateurNom?: string;
    description?: string;
  }) {
    const token = getToken();
    const res = await fetch(`${API}/finance/cout/expenses`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Erreur lors de l'ajout du coût");
    }
    return res.json();
  },

  async export(filters: Record<string, any> = {}): Promise<Blob> {
  // Retirer les params de pagination/tri ET les props non reconnues par le backend
  const { page, limit, sortBy, sortOrder, periode, ...exportFilters } = filters;

  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(exportFilters)) {
    if (
      val === undefined ||
      val === null ||
      val === "" ||
      val === "all" ||
      val === "undefined"
    )
      continue;
    params.append(key, String(val));
  }

  if (
    !params.has("startDate") &&
    !params.has("endDate") &&
    !params.has("periodPreset")
  ) {
    params.set("periodPreset", "year");
  }

  const token = getToken();
  const res = await fetch(
    `${API}/finance/cout/export?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Export échoué (${res.status})`);
  }

  return res.blob();
}
};



