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
    // Skip every value that should not reach the backend
    if (
      val === undefined ||
      val === null ||
      val === "" ||
      val === "all" ||
      val === "undefined"
    ) {
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

  console.error("🚨 400 FULL ERROR BODY:", body);

  throw new Error(
    `Erreur API ${endpoint}: ${res.status} - ${JSON.stringify(body)}`
  );
  }

  return res.json();
}

export const costApi = {
  getKpi:           (f: Record<string, unknown>) => fetchCost("finance/cout/kpi",            f),
  getTopFormateurs: (f: Record<string, unknown>) => fetchCost("finance/cout/top-formateurs", f),
  getEfficience:    (f: Record<string, unknown>) => fetchCost("finance/cout/efficience",     f),
  getRepartition:   (f: Record<string, unknown>) => fetchCost("finance/cout/repartition",    f),
  getTrend:         (f: Record<string, unknown>) => fetchCost("finance/cout/trend",          f),
  getSessions:      (f: Record<string, unknown>) => fetchCost("finance/cout/sessions",       f),
};