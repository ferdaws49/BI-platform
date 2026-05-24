import type {
  KPIData,
  ForecastPoint,
  RiskSession,
  Insight,
  Recommendation,
  Formation,
  Formateur,
} from "./types";

// ─── Formations ───────────────────────────────────────────────────────────────
export const FORMATIONS: Formation[] = [
  { id: "all", title: "Toutes les formations" },
  { id: "dev-web", title: "Développement Web" },
  { id: "data-science", title: "Data Science" },
  { id: "management", title: "Management" },
  { id: "cybersec", title: "Cybersécurité" },
  { id: "design", title: "UX/UI Design" },
];

// ─── Formateurs ───────────────────────────────────────────────────────────────
export const FORMATEURS: Formateur[] = [
  { id: "all", name: "Tous les formateurs" },
  { id: "f1", name: "Ahmed Mansouri" },
  { id: "f2", name: "Sonia Belhadj" },
  { id: "f3", name: "Karim Trabelsi" },
  { id: "f4", name: "Lina Chaari" },
  { id: "f5", name: "Youssef Hamdi" },
];

// ─── KPI Data ─────────────────────────────────────────────────────────────────
export const KPI_DATA: KPIData = {
  caRealise: 184_500,
  caPredicted: 217_300,
  riskSessionsCount: 4,
  profitMargin: 38.4,
  croissance: 12.7,
};

// ─── Forecast Data ────────────────────────────────────────────────────────────
const BASE_HISTORICAL: ForecastPoint[] = [
  { month: "Jan", historical: 28400, predicted: null },
  { month: "Fév", historical: 31200, predicted: null },
  { month: "Mar", historical: 29800, predicted: null },
  { month: "Avr", historical: 34500, predicted: null },
  { month: "Mai", historical: 38100, predicted: null },
  { month: "Jun", historical: 42500, predicted: null },
];

export const FORECAST_DATA: Record<1 | 3 | 6, ForecastPoint[]> = {
  1: [
    ...BASE_HISTORICAL,
    { month: "Jul", historical: null, predicted: 45200 },
  ],
  3: [
    ...BASE_HISTORICAL,
    { month: "Jul", historical: null, predicted: 45200 },
    { month: "Aoû", historical: null, predicted: 47800 },
    { month: "Sep", historical: null, predicted: 51300 },
  ],
  6: [
    ...BASE_HISTORICAL,
    { month: "Jul", historical: null, predicted: 45200 },
    { month: "Aoû", historical: null, predicted: 47800 },
    { month: "Sep", historical: null, predicted: 51300 },
    { month: "Oct", historical: null, predicted: 53700 },
    { month: "Nov", historical: null, predicted: 56100 },
    { month: "Déc", historical: null, predicted: 61500 },
  ],
};

// ─── Risk Sessions ────────────────────────────────────────────────────────────
export const RISK_SESSIONS: RiskSession[] = [
  {
    id: "s1",
    sessionName: "React Avancé — Juillet",
    formation: "Développement Web",
    riskScore: 0.82,
    financialImpact: 12400,
    status: "High",
    fillRate: 0.25,
    profitable: false,
  },
  {
    id: "s2",
    sessionName: "Data Analytics — Août",
    formation: "Data Science",
    riskScore: 0.64,
    financialImpact: 8700,
    status: "Medium",
    fillRate: 0.52,
    profitable: true,
  },
  {
    id: "s3",
    sessionName: "Leadership & Management",
    formation: "Management",
    riskScore: 0.71,
    financialImpact: 6300,
    status: "High",
    fillRate: 0.38,
    profitable: false,
  },
  {
    id: "s4",
    sessionName: "Figma Masterclass",
    formation: "UX/UI Design",
    riskScore: 0.45,
    financialImpact: 4200,
    status: "Medium",
    fillRate: 0.61,
    profitable: true,
  },
  {
    id: "s5",
    sessionName: "Python for Data — Sep",
    formation: "Data Science",
    riskScore: 0.18,
    financialImpact: 9100,
    status: "Safe",
    fillRate: 0.88,
    profitable: true,
  },
  {
    id: "s6",
    sessionName: "Ethical Hacking",
    formation: "Cybersécurité",
    riskScore: 0.22,
    financialImpact: 11200,
    status: "Safe",
    fillRate: 0.79,
    profitable: true,
  },
  {
    id: "s7",
    sessionName: "Node.js & APIs REST",
    formation: "Développement Web",
    riskScore: 0.35,
    financialImpact: 7800,
    status: "Medium",
    fillRate: 0.44,
    profitable: true,
  },
  {
    id: "s8",
    sessionName: "SIEM & Threat Detection",
    formation: "Cybersécurité",
    riskScore: 0.88,
    financialImpact: 14600,
    status: "High",
    fillRate: 0.18,
    profitable: false,
  },
];

// ─── Insights ─────────────────────────────────────────────────────────────────
export const INSIGHTS: Insight[] = [
  {
    id: "i1",
    type: "trend",
    title: "Croissance CA soutenue",
    description:
      "Le chiffre d'affaires progresse de +12.7% ce trimestre, porté par les formations Data Science et Développement Web. La trajectoire est cohérente avec un objectif annuel de 220 000 TND.",
    value: "+12.7%",
    direction: "up",
  },
  {
    id: "i2",
    type: "risk",
    title: "4 sessions à risque élevé identifiées",
    description:
      "SIEM & Threat Detection et React Avancé présentent les scores de risque les plus critiques (>0.8). Un impact financier combiné de 27 000 TND est exposé si aucune action n'est prise.",
    value: "27 000 TND",
    direction: "down",
  },
  {
    id: "i3",
    type: "observation",
    title: "Taux de marge stable",
    description:
      "La marge brute se maintient à 38.4%, légèrement au-dessus de la cible de 36%. Les formations présentielles restent plus rentables que les sessions en ligne.",
    value: "38.4%",
    direction: "neutral",
  },
  {
    id: "i4",
    type: "trend",
    title: "Prévision décembre optimiste",
    description:
      "Le modèle prédictif anticipe un CA de 61 500 TND en décembre, porté par les inscriptions en avance sur les formations certifiantes de fin d'année.",
    value: "61 500 TND",
    direction: "up",
  },
];

// ─── Recommendations ──────────────────────────────────────────────────────────
export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "r1",
    action: "cancel",
    title: "Annuler ou reporter SIEM & Threat Detection",
    description:
      "Score de risque 0.88 — taux d'inscription insuffisant 3 semaines avant le démarrage. Reporter au T4 pour consolider les inscriptions.",
    session: "SIEM & Threat Detection",
    impact: "Éviter une perte de 14 600 TND",
    priority: "high",
  },
  {
    id: "r2",
    action: "promote",
    title: "Booster les inscriptions React Avancé",
    description:
      "Lancer une campagne ciblée (email + LinkedIn) avec une réduction early-bird de 15% pour atteindre le seuil de rentabilité avant fin juillet.",
    session: "React Avancé — Juillet",
    impact: "Récupérer 12 400 TND",
    priority: "high",
  },
  {
    id: "r3",
    action: "reduce-costs",
    title: "Optimiser les coûts — Leadership & Management",
    description:
      "Négocier les frais de salle et passer à un format hybride pour réduire les coûts directs de 20% sans impacter la qualité pédagogique.",
    session: "Leadership & Management",
    impact: "Économie estimée : 1 800 TND",
    priority: "medium",
  },
  {
    id: "r4",
    action: "promote",
    title: "Capitaliser sur Python for Data",
    description:
      "Session bien remplie et rentable. Prévoir une 2ème session en septembre et prioriser la communication sur ce programme.",
    session: "Python for Data — Sep",
    impact: "Potentiel additionnel : 9 100 TND",
    priority: "medium",
  },
];