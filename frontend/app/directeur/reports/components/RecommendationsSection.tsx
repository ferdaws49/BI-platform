"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleGauge, Sparkles, RefreshCw } from "lucide-react";
import type {
  RecommendationItem,
  TrendTone,
  HistoryPoint,
  InsightItem,
} from "./reportTypes";

// ── Types ──────────────────────────────────────────────────────────────────

type RecommendationsSectionProps = {
  recommendations: RecommendationItem[];
  history: HistoryPoint[];
  rootCauses: InsightItem[];
  problems: InsightItem[];
};

type AIRecommendation = {
  title: string;
  description: string;
  owner: string;
  impact: string;
  priority: "Haute" | "Moyenne";
  tone: TrendTone;
};

// ── Styles ─────────────────────────────────────────────────────────────────

const toneStyles: Record<TrendTone, string> = {
  positive: "border-emerald-200 bg-emerald-50",
  warning: "border-amber-200 bg-amber-50",
  critical: "border-red-200 bg-red-50",
  neutral: "border-slate-200 bg-slate-50",
};

// ── Prompt ─────────────────────────────────────────────────────────────────

function buildPrompt(
  history: HistoryPoint[],
  rootCauses: InsightItem[],
  problems: InsightItem[],
): string {
  const current = history[history.length - 1];
  const previous = history[Math.max(history.length - 2, 0)];

  const causesText =
    rootCauses.map((c) => `- ${c.title}: ${c.text}`).join("\n") ||
    "Aucune cause critique détectée.";

  const problemsText =
    problems.map((p) => `- ${p.title}: ${p.text}`).join("\n") ||
    "Aucun problème majeur détecté.";

  return `Tu es un conseiller stratégique expert en formation professionnelle.
Voici les données actuelles d'un centre de formation privé :

INDICATEURS ACTUELS:
- Inscriptions: ${current?.enrollments ?? "N/A"} (précédent: ${previous?.enrollments ?? "N/A"})
- Revenu: ${current?.revenue ?? "N/A"} DT (précédent: ${previous?.revenue ?? "N/A"} DT)
- Taux de réussite: ${current?.successRate ?? "N/A"}%
- Taux d'abandon: ${current?.dropoutRate ?? "N/A"}%
- Satisfaction: ${current?.satisfaction ?? "N/A"}/100

CAUSES IDENTIFIÉES:
${causesText}

PROBLÈMES DÉTECTÉS:
${problemsText}

Génère exactement 3 recommandations stratégiques ACTIONNABLES en français.
Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans explication.
Format strict:
[
  {
    "title": "Titre court et percutant",
    "description": "Description concrète (2-3 phrases max)",
    "owner": "Responsable suggéré",
    "impact": "Impact attendu mesurable",
    "priority": "Haute" ou "Moyenne",
    "tone": "positive" ou "warning" ou "critical"
  }
]`;
}

// ── API Call ───────────────────────────────────────────────────────────────

async function fetchAIRecommendations(
  history: HistoryPoint[],
  rootCauses: InsightItem[],
  problems: InsightItem[],
): Promise<AIRecommendation[] | null> {
  try {
    const token = localStorage.getItem("access_token");

    const response = await fetch("http://localhost:5000/ai/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ history, rootCauses, problems }),
    });

    if (!response.ok) return null;

    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ── Sub-component ──────────────────────────────────────────────────────────

function RecommendationCard({
  rec,
}: {
  rec: RecommendationItem | AIRecommendation;
}) {
  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm ${toneStyles[rec.tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-slate-900">
            {rec.title}
          </h4>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {rec.description}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            rec.priority === "Haute"
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {rec.priority}
        </span>
      </div>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <CircleGauge size={15} className="text-slate-500" />
          <span>Impact attendu : {rec.impact}</span>
        </div>
        <p>Responsable suggéré : {rec.owner}</p>
      </div>
    </article>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function RecommendationsSection({
  recommendations,
  history,
  rootCauses,
  problems,
}: RecommendationsSectionProps) {
  const [aiRecs, setAiRecs] = useState<AIRecommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAI, setIsAI] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError(false);

    const result = await fetchAIRecommendations(history, rootCauses, problems);

    if (result) {
      setAiRecs(result);
      setIsAI(true);
    } else {
      setAiRecs(null);
      setIsAI(false);
      setError(true);
    }

    setLoading(false);
  }

  const displayedRecs = isAI && aiRecs ? aiRecs : recommendations;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-slate-700" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Strategic Recommendations
            </h3>
            <p className="text-sm text-slate-500">
              Actions à lancer pour corriger ou amplifier les tendances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAI && !loading && (
            <span className="flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              <Sparkles size={12} />
              Généré par IA
            </span>
          )}
          {error && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
              Fallback statique
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {loading ? "Génération..." : "Régénérer"}
          </button>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {displayedRecs.map((rec, i) => (
            <RecommendationCard key={i} rec={rec} />
          ))}
        </div>
      )}
    </section>
  );
}
