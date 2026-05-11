"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, AlertTriangle, RefreshCw } from "lucide-react";
import type {
  FocusItem,
  HistoryPoint,
  InsightItem,
  RecommendationItem,
  ReportFilters,
  TrendCard,
  TrendTone,
  TrainingReportRecord,
} from "./reportTypes";
import SummarySection from "./SummarySection";
import InsightsSection from "./InsightsSection";
import RecommendationsSection from "./RecommendationsSection";

// ── Helpers ────────────────────────────────────────────────────────────────

function getPeriodLength(period: string) {
  switch (period) {
    case "Trimestre":
      return 3;
    case "Semestre":
    case "Année":
    case "Annee":
      return 6;
    default:
      return 3;
  }
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function aggregateHistory(
  records: TrainingReportRecord[],
  periodLength: number,
): HistoryPoint[] {
  if (records.length === 0) return [];
  const slicedHistories = records.map((r) => r.history.slice(-periodLength));
  const labels = slicedHistories[0].map((p) => p.label);
  return labels.map((label, index) => {
    const points = slicedHistories.map((h) => h[index]);
    const enrollments = points.reduce((s, p) => s + p.enrollments, 0);
    const revenue = points.reduce((s, p) => s + p.revenue, 0);
    const successRate =
      points.reduce((s, p) => s + p.successRate * p.enrollments, 0) /
      Math.max(enrollments, 1);
    const dropoutRate =
      points.reduce((s, p) => s + p.dropoutRate * p.enrollments, 0) /
      Math.max(enrollments, 1);
    const satisfaction =
      points.reduce((s, p) => s + p.satisfaction * p.enrollments, 0) /
      Math.max(enrollments, 1);
    return {
      label,
      enrollments,
      revenue,
      successRate: round(successRate),
      dropoutRate: round(dropoutRate),
      satisfaction: round(satisfaction),
    };
  });
}

function getCurrentAndPrevious(history: HistoryPoint[]) {
  const current = history[history.length - 1];
  const previous = history[Math.max(history.length - 2, 0)] ?? current;
  return { current, previous };
}

function buildSummary(
  current: HistoryPoint,
  previous: HistoryPoint,
  filteredRecords: TrainingReportRecord[],
) {
  const enrollmentDelta = percentDelta(
    current.enrollments,
    previous.enrollments,
  );
  const revenueDelta = percentDelta(current.revenue, previous.revenue);
  const successDelta = current.successRate - previous.successRate;

  const enrollmentText =
    enrollmentDelta >= 0
      ? `les inscriptions progressent de ${round(enrollmentDelta)}%`
      : `les inscriptions reculent de ${Math.abs(round(enrollmentDelta))}%`;
  const revenueText =
    revenueDelta >= 0
      ? `le revenu augmente de ${round(revenueDelta)}%`
      : `le revenu baisse de ${Math.abs(round(revenueDelta))}%`;
  const successText =
    successDelta >= 0
      ? `le taux de réussite gagne ${round(successDelta)} point`
      : `le taux de réussite perd ${Math.abs(round(successDelta))} point`;

  const vulnerableProgram = [...filteredRecords].sort((a, b) => {
    const aCurrent = a.history[a.history.length - 1];
    const bCurrent = b.history[b.history.length - 1];
    return bCurrent.dropoutRate - aCurrent.dropoutRate;
  })[0];

  return `Sur la période sélectionnée, ${enrollmentText}, ${revenueDelta >= 0 ? "en parallèle" : "malgré cela"} ${revenueText} et ${successText}. La principale zone de vigilance reste ${vulnerableProgram?.formation ?? "le portefeuille actuel"}, où le risque d'abandon est le plus élevé.`;
}

// ── Error State ────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-red-100 p-3">
          <AlertTriangle size={24} className="text-red-600" />
        </div>
      </div>
      <p className="text-base font-semibold text-red-900">
        Impossible de charger les données
      </p>
      <p className="mt-2 text-sm text-red-600 max-w-md mx-auto">
        Le serveur ne répond pas ou une erreur est survenue. Vérifiez votre
        connexion et réessayez.
      </p>
      <button
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 transition"
      >
        <RefreshCw size={14} />
        Réessayer
      </button>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function StrategicReportPage({
  filters,
}: {
  filters: ReportFilters;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [records, setRecords] = useState<TrainingReportRecord[]>([]);
  const [focusMode, setFocusMode] = useState<"formations" | "formateurs">(
    "formations",
  );

  const fetchReports = () => {
    setLoading(true);
    setError(false);

    const token = localStorage.getItem("access_token");
    // Correspondance des valeurs pour le backend
    let typeParam = filters.type;
    if (typeParam === "Présentiel") typeParam = "présentiel";
    else if (typeParam === "En ligne") typeParam = "en_ligne";
    // "Tous" reste "Tous"

    const params = new URLSearchParams({
      periode: filters.periode ?? "Trimestre",
      formation: filters.formation ?? "Tous",
      formateur: filters.formateur ?? "Tous",
      type: typeParam ?? "Tous",
      statut: filters.statut ?? "Tous",
    });

    fetch(`http://localhost:5000/dashboard/reports?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: TrainingReportRecord[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          setRecords([]);
        } else {
          setRecords(data);
        }
        setError(false);
      })
      .catch(() => {
        setError(true);
        setRecords([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, [filters]);

  // ── Computed ───────────────────────────────────────────────────────────

  const filteredRecords = useMemo(() => records, [records]);

  const periodLength = useMemo(
    () => getPeriodLength(filters.periode),
    [filters.periode],
  );

  const history = useMemo(
    () => aggregateHistory(filteredRecords, periodLength),
    [filteredRecords, periodLength],
  );

  const { current, previous } = useMemo(() => {
    if (history.length === 0) {
      const empty: HistoryPoint = {
        label: "N/A",
        enrollments: 0,
        revenue: 0,
        successRate: 0,
        dropoutRate: 0,
        satisfaction: 0,
      };
      return { current: empty, previous: empty };
    }
    return getCurrentAndPrevious(history);
  }, [history]);

  const trendCards = useMemo<TrendCard[]>(() => {
    const enrollDelta = percentDelta(current.enrollments, previous.enrollments);
    const revDelta = percentDelta(current.revenue, previous.revenue);
    const succDelta = current.successRate - previous.successRate;

    return [
      {
        label: "Inscriptions",
        headline:
          enrollDelta >= 5
            ? "Croissance soutenue ce trimestre"
            : enrollDelta >= 0
              ? "Légère progression des inscriptions"
              : "Recul des inscriptions à surveiller",
        sub: `${enrollDelta >= 0 ? "+" : ""}${round(enrollDelta)}% vs période précédente. ${
          enrollDelta >= 5
            ? "Portée par les formations techniques."
            : "Dynamique à renforcer."
        }`,
        pillText:
          enrollDelta >= 5
            ? "Tendance haussière"
            : enrollDelta >= 0
              ? "Stable"
              : "En recul",
        tone: (enrollDelta >= 5
          ? "positive"
          : enrollDelta >= -5
            ? "warning"
            : "critical") as TrendTone,
      },
      {
        label: "Revenu",
        headline:
          revDelta >= 4
            ? "Croissance revenue alignée avec les inscriptions"
            : revDelta >= 0
              ? "Ralentissement malgré la hausse des inscrits"
              : "Baisse du revenu — attractivité en question",
        sub: `${revDelta >= 0 ? "+" : ""}${round(revDelta)}% en valeur absolue sur la période.`,
        pillText:
          revDelta >= 4
            ? "Signal positif"
            : revDelta >= 0
              ? "Signal modéré"
              : "Signal critique",
        tone: (revDelta >= 4
          ? "positive"
          : revDelta >= 0
            ? "warning"
            : "critical") as TrendTone,
      },
      {
        label: "Réussite",
        headline:
          current.successRate >= 85
            ? "Performance académique solide"
            : current.successRate >= 75
              ? `Recul de ${Math.abs(round(succDelta))} pts — seuil de vigilance atteint`
              : "Réussite sous le seuil critique de 75%",
        sub: `${succDelta >= 0 ? "+" : ""}${round(succDelta)} pts vs période précédente. Taux actuel : ${round(current.successRate)}%.`,
        pillText:
          current.successRate >= 85
            ? "Solide"
            : current.successRate >= 75
              ? "Révision recommandée"
              : "Urgence pédagogique",
        tone: (current.successRate >= 85
          ? "positive"
          : current.successRate >= 75
            ? "warning"
            : "critical") as TrendTone,
      },
    ];
  }, [current, previous]);

  const executiveSummary = useMemo(
    () => buildSummary(current, previous, filteredRecords),
    [current, previous, filteredRecords],
  );

  const keyMessages = useMemo(() => {
    const items: string[] = [];
    if (current.successRate < 80) {
      items.push(
        "Le niveau global de réussite passe sous le seuil de confort de 80%, ce qui justifie une revue pédagogique rapide.",
      );
    } else {
      items.push(
        "La performance académique reste globalement solide, mais elle se concentre sur un nombre limité de formations leaders.",
      );
    }
    if (current.dropoutRate > 16) {
      items.push(
        "Le risque d'érosion augmente : les abandons progressent plus vite que la croissance des inscriptions.",
      );
    }
    if (percentDelta(current.revenue, previous.revenue) < 0) {
      items.push(
        "La baisse du revenu est principalement reliée à des formations en recul d'attractivité et non à un problème de prix global.",
      );
    } else {
      items.push(
        "La croissance du revenu vient surtout des formations techniques à forte demande, ce qui confirme un positionnement rentable.",
      );
    }
    return items.slice(0, 3);
  }, [current, previous]);

  const rootCauses = useMemo<InsightItem[]>(() => {
    const items = filteredRecords.map((record) => {
      const recent = record.history.slice(-2);
      const currentPoint = recent[recent.length - 1];
      const previousPoint = recent[0] ?? currentPoint;
      return {
        record,
        successDelta: currentPoint.successRate - previousPoint.successRate,
        revenueDelta: percentDelta(currentPoint.revenue, previousPoint.revenue),
        dropoutDelta: currentPoint.dropoutRate - previousPoint.dropoutRate,
        satisfactionDelta:
          currentPoint.satisfaction - previousPoint.satisfaction,
      };
    });

    const causes: InsightItem[] = [];

    const successCause = [...items].sort(
      (a, b) => a.successDelta - b.successDelta,
    )[0];
    if (successCause && successCause.successDelta < 0) {
      causes.push({
        title: `Chute de réussite sur ${successCause.record.formation}`,
        text: `La réussite baisse de ${Math.abs(round(successCause.successDelta))} points, en parallèle d'une satisfaction en recul de ${Math.abs(round(successCause.satisfactionDelta))} points. Cela suggère un besoin d'ajustement pédagogique ou de soutien du formateur ${successCause.record.formateur}.`,
        tone: "critical",
        metric: `${round(successCause.record.history.at(-1)?.successRate ?? 0)}%`,
      });
    }

    const dropoutCause = [...items].sort(
      (a, b) => b.dropoutDelta - a.dropoutDelta,
    )[0];
    if (dropoutCause && dropoutCause.dropoutDelta > 0) {
      causes.push({
        title: `Hausse d'abandon sur ${dropoutCause.record.formation}`,
        text: `Le taux d'abandon gagne ${round(dropoutCause.dropoutDelta)} points. La combinaison d'un engagement en baisse et d'une satisfaction plus faible explique probablement cette érosion.`,
        tone:
          (dropoutCause.record.history.at(-1)?.dropoutRate ?? 0) > 18
            ? "critical"
            : "warning",
        metric: `${round(dropoutCause.record.history.at(-1)?.dropoutRate ?? 0)}%`,
      });
    }

    const revenueCause = [...items].sort(
      (a, b) => a.revenueDelta - b.revenueDelta,
    )[0];
    if (revenueCause && revenueCause.revenueDelta < 0) {
      causes.push({
        title: `Sous-performance business de ${revenueCause.record.formation}`,
        text: `Le revenu baisse de ${Math.abs(round(revenueCause.revenueDelta))}%. Le signal est plus fort que la seule baisse d'inscriptions, ce qui laisse penser à une perte de désirabilité ou de valeur perçue.`,
        tone: revenueCause.revenueDelta < -10 ? "critical" : "warning",
        metric: `${round(revenueCause.revenueDelta)}%`,
      });
    }

    return causes.slice(0, 3);
  }, [filteredRecords]);

  const problems = useMemo<InsightItem[]>(() => {
    const detected = filteredRecords.flatMap((record) => {
      const currentPoint = record.history[record.history.length - 1];
      const items: InsightItem[] = [];
      if (currentPoint.dropoutRate >= 18) {
        items.push({
          title: `Abandon élevé — ${record.formation}`,
          text: `Le taux d'abandon atteint ${currentPoint.dropoutRate}%. Cette formation menace à la fois la marge et l'image de qualité du centre.`,
          tone: "critical",
          metric: `${currentPoint.dropoutRate}%`,
        });
      }
      if (currentPoint.satisfaction < 75) {
        items.push({
          title: `Satisfaction faible — ${record.formation}`,
          text: `La satisfaction tombe à ${currentPoint.satisfaction}%. Les retours apprenants risquent d'impacter les prochaines inscriptions.`,
          tone: "warning",
          metric: `${currentPoint.satisfaction}/100`,
        });
      }
      if (currentPoint.successRate < 78) {
        items.push({
          title: `Formation sous-performante — ${record.formation}`,
          text: `Le taux de réussite est de ${currentPoint.successRate}%, sous le seuil de sécurité pédagogique retenu.`,
          tone: "critical",
          metric: `${currentPoint.successRate}%`,
        });
      }
      return items;
    });

    if (detected.length > 0) return detected.slice(0, 4);
    return [
      {
        title: "Aucun signal critique majeur",
        text: "Aucune anomalie sévère n'est détectée sur le portefeuille filtré. La vigilance doit se concentrer sur la prévention plutôt que la correction.",
        tone: "positive",
      },
    ];
  }, [filteredRecords]);

  const recommendations = useMemo<RecommendationItem[]>(() => {
    const actionList: RecommendationItem[] = [];
    const atRisk = filteredRecords
      .map((record) => ({
        record,
        point: record.history[record.history.length - 1],
      }))
      .sort((a, b) => b.point.dropoutRate - a.point.dropoutRate);

    const highestRisk = atRisk[0];
    if (highestRisk && highestRisk.point.dropoutRate >= 18) {
      actionList.push({
        title: `Lancer un plan de rétention sur ${highestRisk.record.formation}`,
        description:
          "Mettre en place un diagnostic apprenant, renforcer les checkpoints hebdomadaires et adapter la charge des modules les plus difficiles.",
        owner: "Responsable pédagogique",
        impact: "Réduction attendue de 4 à 6 points d'abandon",
        priority: "Haute",
        tone: "critical",
      });
    }

    const lowSatisfaction = atRisk.find((item) => item.point.satisfaction < 75);
    if (lowSatisfaction) {
      actionList.push({
        title: `Revoir l'expérience de formation de ${lowSatisfaction.record.formation}`,
        description:
          "Collecter les irritants précis, ajuster le rythme et augmenter la part de pratique ou d'accompagnement formateur.",
        owner: `Formateur ${lowSatisfaction.record.formateur}`,
        impact:
          "Hausse attendue de la satisfaction et de la conversion bouche-à-oreille",
        priority: "Haute",
        tone: "warning",
      });
    }

    const growthPocket = [...filteredRecords]
      .map((record) => {
        const recent = record.history.slice(-2);
        const cp = recent[recent.length - 1];
        const pp = recent[0] ?? cp;
        return { record, revenueDelta: percentDelta(cp.revenue, pp.revenue) };
      })
      .sort((a, b) => b.revenueDelta - a.revenueDelta)[0];

    if (growthPocket) {
      actionList.push({
        title: `Capitaliser sur ${growthPocket.record.formation}`,
        description:
          "Renforcer la communication sur cette offre et réutiliser ses leviers de performance sur des parcours voisins.",
        owner: "Direction + Marketing",
        impact: "Accélération du revenu sur le portefeuille rentable",
        priority: "Moyenne",
        tone: "positive",
      });
    }

    return actionList.slice(0, 3);
  }, [filteredRecords]);

  const focusItems = useMemo<FocusItem[]>(() => {
    const grouped = new Map<string, FocusItem>();
    filteredRecords.forEach((record) => {
      const currentPoint = record.history[record.history.length - 1];
      const previousPoint =
        record.history[record.history.length - 2] ?? currentPoint;
      const key =
        focusMode === "formations" ? record.formation : record.formateur;
      const secondaryLabel =
        focusMode === "formations"
          ? `${record.formateur} · ${record.type}`
          : `${record.formation} · ${record.type}`;
      const alertCount =
        Number(currentPoint.successRate < 78) +
        Number(currentPoint.dropoutRate >= 18) +
        Number(currentPoint.satisfaction < 75);
      const existing = grouped.get(key);
      if (existing) {
        existing.revenue += currentPoint.revenue;
        existing.revenueDelta = round(
          (existing.revenueDelta +
            percentDelta(currentPoint.revenue, previousPoint.revenue)) /
            2,
        );
        existing.successRate = round(
          (existing.successRate + currentPoint.successRate) / 2,
        );
        existing.successDelta = round(
          (existing.successDelta +
            (currentPoint.successRate - previousPoint.successRate)) /
            2,
        );
        existing.dropoutRate = round(
          (existing.dropoutRate + currentPoint.dropoutRate) / 2,
        );
        existing.alertCount += alertCount;
      } else {
        grouped.set(key, {
          label: key,
          secondaryLabel,
          successRate: currentPoint.successRate,
          successDelta: currentPoint.successRate - previousPoint.successRate,
          revenue: currentPoint.revenue,
          revenueDelta: percentDelta(
            currentPoint.revenue,
            previousPoint.revenue,
          ),
          dropoutRate: currentPoint.dropoutRate,
          alertCount,
        });
      }
    });
    return [...grouped.values()]
      .sort(
        (a, b) => b.alertCount - a.alertCount || b.dropoutRate - a.dropoutRate,
      )
      .slice(0, 4);
  }, [filteredRecords, focusMode]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm animate-pulse">
        <div className="h-4 w-48 bg-slate-200 rounded mb-3" />
        <div className="h-3 w-72 bg-slate-100 rounded" />
      </div>
    );
  }

  if (error) {
    return <ErrorState onRetry={fetchReports} />;
  }

  if (filteredRecords.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">
          Aucune donnée disponible pour ce filtre
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Modifiez la période, la formation ou le formateur pour afficher une
          lecture stratégique exploitable.
        </p>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <FileSpreadsheet size={22} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
              Strategic Reports
            </p>
            <h1 className="text-2xl font-semibold">
              Analyse de décision pour la direction
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-200">
              Cette page explique les variations de performance, identifie les
              causes probables et suggère les décisions prioritaires à prendre.
            </p>
          </div>
        </div>
      </section>

      <SummarySection
        summary={executiveSummary}
        trendCards={trendCards}
        keyMessages={keyMessages}
      />

      <InsightsSection
        history={history}
        rootCauses={rootCauses}
        problems={problems}
        focusItems={focusItems}
        focusMode={focusMode}
        onFocusModeChange={setFocusMode}
      />

      <RecommendationsSection
        recommendations={recommendations}
        history={history}
        rootCauses={rootCauses}
        problems={problems}
      />
    </main>
  );
}
