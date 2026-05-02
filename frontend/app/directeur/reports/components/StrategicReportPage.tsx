"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import type {
  FocusItem,
  HistoryPoint,
  InsightItem,
  RecommendationItem,
  ReportFilters,
  RiskItem,
  SummaryMetric,
  TrainingReportRecord,
  TrendTone,
} from "./reportTypes";
import SummarySection from "./SummarySection";
import InsightsSection from "./InsightsSection";
import RecommendationsSection from "./RecommendationsSection";
import RiskSection from "./RiskSection";

// Données statiques de démonstration utilisées comme base d'analyse.
// Chaque formation contient plusieurs points historiques.
const strategicRecords: TrainingReportRecord[] = [
  {
    formation: "Data Science",
    formateur: "Amine",
    type: "En ligne",
    statut: "Actif",
    history: [
      { label: "Jan", enrollments: 40, revenue: 9800, successRate: 88, dropoutRate: 8, satisfaction: 90 },
      { label: "Fev", enrollments: 43, revenue: 10200, successRate: 89, dropoutRate: 7, satisfaction: 91 },
      { label: "Mar", enrollments: 45, revenue: 11000, successRate: 87, dropoutRate: 8, satisfaction: 90 },
      { label: "Avr", enrollments: 47, revenue: 11600, successRate: 86, dropoutRate: 10, satisfaction: 87 },
      { label: "Mai", enrollments: 49, revenue: 12100, successRate: 84, dropoutRate: 12, satisfaction: 83 },
      { label: "Jun", enrollments: 52, revenue: 12800, successRate: 82, dropoutRate: 14, satisfaction: 79 },
    ],
  },
  {
    formation: "Web Dev",
    formateur: "Sara",
    type: "Présentiel",
    statut: "Actif",
    history: [
      { label: "Jan", enrollments: 42, revenue: 10200, successRate: 87, dropoutRate: 9, satisfaction: 86 },
      { label: "Fev", enrollments: 40, revenue: 9800, successRate: 85, dropoutRate: 10, satisfaction: 84 },
      { label: "Mar", enrollments: 38, revenue: 9500, successRate: 83, dropoutRate: 12, satisfaction: 80 },
      { label: "Avr", enrollments: 37, revenue: 9450, successRate: 81, dropoutRate: 13, satisfaction: 77 },
      { label: "Mai", enrollments: 36, revenue: 9400, successRate: 79, dropoutRate: 15, satisfaction: 73 },
      { label: "Jun", enrollments: 33, revenue: 8800, successRate: 76, dropoutRate: 18, satisfaction: 69 },
    ],
  },
  {
    formation: "Java",
    formateur: "Amine",
    type: "Présentiel",
    statut: "Actif",
    history: [
      { label: "Jan", enrollments: 61, revenue: 13900, successRate: 91, dropoutRate: 6, satisfaction: 88 },
      { label: "Fev", enrollments: 63, revenue: 14300, successRate: 92, dropoutRate: 6, satisfaction: 89 },
      { label: "Mar", enrollments: 64, revenue: 14700, successRate: 91, dropoutRate: 6, satisfaction: 90 },
      { label: "Avr", enrollments: 65, revenue: 15000, successRate: 90, dropoutRate: 7, satisfaction: 89 },
      { label: "Mai", enrollments: 67, revenue: 15350, successRate: 90, dropoutRate: 7, satisfaction: 88 },
      { label: "Jun", enrollments: 68, revenue: 15400, successRate: 89, dropoutRate: 8, satisfaction: 88 },
    ],
  },
  {
    formation: "Data Engineering",
    formateur: "Sara",
    type: "En ligne",
    statut: "Actif",
    history: [
      { label: "Jan", enrollments: 28, revenue: 10400, successRate: 84, dropoutRate: 11, satisfaction: 84 },
      { label: "Fev", enrollments: 27, revenue: 10200, successRate: 83, dropoutRate: 12, satisfaction: 83 },
      { label: "Mar", enrollments: 26, revenue: 10000, successRate: 82, dropoutRate: 13, satisfaction: 82 },
      { label: "Avr", enrollments: 25, revenue: 9900, successRate: 81, dropoutRate: 14, satisfaction: 80 },
      { label: "Mai", enrollments: 24, revenue: 9700, successRate: 80, dropoutRate: 15, satisfaction: 79 },
      { label: "Jun", enrollments: 22, revenue: 9100, successRate: 78, dropoutRate: 17, satisfaction: 77 },
    ],
  },
  {
    formation: "UI/UX",
    formateur: "Mohamed",
    type: "En ligne",
    statut: "Terminé",
    history: [
      { label: "Jan", enrollments: 23, revenue: 5600, successRate: 79, dropoutRate: 16, satisfaction: 81 },
      { label: "Fev", enrollments: 22, revenue: 5500, successRate: 78, dropoutRate: 17, satisfaction: 80 },
      { label: "Mar", enrollments: 20, revenue: 5300, successRate: 77, dropoutRate: 18, satisfaction: 78 },
      { label: "Avr", enrollments: 19, revenue: 5200, successRate: 76, dropoutRate: 19, satisfaction: 76 },
      { label: "Mai", enrollments: 18, revenue: 5150, successRate: 76, dropoutRate: 19, satisfaction: 75 },
      { label: "Jun", enrollments: 17, revenue: 5100, successRate: 75, dropoutRate: 20, satisfaction: 74 },
    ],
  },
  {
    formation: "Marketing",
    formateur: "Mohamed",
    type: "Présentiel",
    statut: "Annulé",
    history: [
      { label: "Jan", enrollments: 18, revenue: 4600, successRate: 75, dropoutRate: 19, satisfaction: 78 },
      { label: "Fev", enrollments: 17, revenue: 4400, successRate: 74, dropoutRate: 20, satisfaction: 77 },
      { label: "Mar", enrollments: 16, revenue: 4200, successRate: 73, dropoutRate: 21, satisfaction: 75 },
      { label: "Avr", enrollments: 15, revenue: 4050, successRate: 72, dropoutRate: 22, satisfaction: 73 },
      { label: "Mai", enrollments: 14, revenue: 3950, successRate: 71, dropoutRate: 23, satisfaction: 72 },
      { label: "Jun", enrollments: 13, revenue: 3900, successRate: 70, dropoutRate: 24, satisfaction: 70 },
    ],
  },
];

// Convertit le filtre de période en nombre de points d'historique à utiliser.
function getPeriodLength(period: string) {
  switch (period) {
    case "Trimestre":
      return 3;
    case "Semestre":
      return 6;
    case "Annee":
    case "Année":
      return 6;
    case "Ce mois":
    default:
      return 2;
  }
}

// Petit helper pour limiter le nombre de décimales affichées.
function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

// Calcule l'évolution entre la valeur actuelle et la précédente.
function percentDelta(current: number, previous: number) {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Classifies a performance indicator into color-coded tones.
 * @param value - The actual metric value
 * @param positiveThreshold - Minimum value for 'positive' tone
 * @param warningThreshold - Minimum value for 'warning' tone (else 'critical')
 */
function classifyTone(value: number, positiveThreshold: number, warningThreshold: number): TrendTone {
  if (value >= positiveThreshold) return "positive";
  if (value >= warningThreshold) return "warning";
  return "critical";
}

// Agrège les historiques de plusieurs formations en une seule vue globale.
// Cela permet de produire une analyse consolidée pour le rapport.
/**
 * Consolidates history points from multiple training records into a single timeline.
 * Averages percentages (success, dropout, satisfaction) weighted by enrollment.
 */
function aggregateHistory(records: TrainingReportRecord[], periodLength: number): HistoryPoint[] {
  if (records.length === 0) return [];

  const slicedHistories = records.map((record) => record.history.slice(-periodLength));
  const labels = slicedHistories[0].map((point) => point.label);

  return labels.map((label, index) => {
    const points = slicedHistories.map((history) => history[index]);
    const enrollments = points.reduce((sum, point) => sum + point.enrollments, 0);
    const revenue = points.reduce((sum, point) => sum + point.revenue, 0);
    
    // Weighted averages ensure larger cohorts have more impact on the global metric
    const successRate =
      points.reduce((sum, point) => sum + point.successRate * point.enrollments, 0) /
      Math.max(enrollments, 1);
    const dropoutRate =
      points.reduce((sum, point) => sum + point.dropoutRate * point.enrollments, 0) /
      Math.max(enrollments, 1);
    const satisfaction =
      points.reduce((sum, point) => sum + point.satisfaction * point.enrollments, 0) /
      Math.max(enrollments, 1);

    return {
      label,
      enrollments,
      revenue,
      successRate: round(successRate, 1),
      dropoutRate: round(dropoutRate, 1),
      satisfaction: round(satisfaction, 1),
    };
  });
}

// Récupère le point actuel et le point précédent pour pouvoir comparer les périodes.
function getCurrentAndPrevious(history: HistoryPoint[]) {
  const current = history[history.length - 1];
  const previous = history[Math.max(history.length - 2, 0)] ?? current;
  return { current, previous };
}

// Génère le paragraphe principal de synthèse exécutive
// à partir des principales variations observées.
/**
 * Logic-based narrative generation. 
 * Converts numeric deltas into a human-readable summary of the business situation.
 */
function buildSummary(
  current: HistoryPoint,
  previous: HistoryPoint,
  filteredRecords: TrainingReportRecord[],
) {
  const enrollmentDelta = percentDelta(current.enrollments, previous.enrollments);
  const revenueDelta = percentDelta(current.revenue, previous.revenue);
  const successDelta = current.successRate - previous.successRate;

  // Verb selection based on trend direction
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
      ? `le taux de reussite gagne ${round(successDelta)} point`
      : `le taux de reussite perd ${Math.abs(round(successDelta))} point`;

  // Identifies the most problematic program (highest dropout rate) for focus
  const vulnerableProgram = [...filteredRecords]
    .sort((a, b) => {
      const aCurrent = a.history[a.history.length - 1];
      const bCurrent = b.history[b.history.length - 1];
      return bCurrent.dropoutRate - aCurrent.dropoutRate;
    })[0];

  return `Sur la periode selectionnee, ${enrollmentText}, ${revenueDelta >= 0 ? "en parallele" : "malgre cela"} ${revenueText} et ${successText}. La principale zone de vigilance reste ${vulnerableProgram?.formation ?? "le portefeuille actuel"}, ou le risque d'abandon est le plus eleve.`;
}

export default function StrategicReportPage({
  filters,
}: {
  filters: ReportFilters;
}) {
  // loading simule le temps de préparation du rapport.
  const [loading, setLoading] = useState(true);
  // records contient le périmètre de données analysé.
  const [records, setRecords] = useState<TrainingReportRecord[]>([]);
  // focusMode permet de changer l'angle du drill-down.
  const [focusMode, setFocusMode] = useState<"formations" | "formateurs">(
    "formations",
  );

  useEffect(() => {
    // Dans une version branchée au backend, c'est ici qu'on ferait le fetch.
    setLoading(true);

    try {
      setRecords(strategicRecords);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const filteredRecords = useMemo(() => {
    // On applique les filtres globaux du header
    // pour produire un rapport cohérent avec le contexte choisi.
    return records.filter((record) => {
      if (filters.formation !== "Tous" && record.formation !== filters.formation)
        return false;
      if (filters.formateur !== "Tous" && record.formateur !== filters.formateur)
        return false;
      if (filters.type !== "Tous" && record.type !== filters.type) return false;
      if (filters.statut !== "Tous" && record.statut !== filters.statut)
        return false;
      return true;
    });
  }, [filters, records]);

  const periodLength = useMemo(
    () => getPeriodLength(filters.periode),
    [filters.periode],
  );

  // Vue consolidée dans le temps pour les cartes et le graphique global.
  const history = useMemo(
    () => aggregateHistory(filteredRecords, periodLength),
    [filteredRecords, periodLength],
  );

  // Ces deux points servent de base à toutes les comparaisons stratégiques.
  const { current, previous } = useMemo(() => {
    if (history.length === 0) {
      const emptyPoint: HistoryPoint = {
        label: "N/A",
        enrollments: 0,
        revenue: 0,
        successRate: 0,
        dropoutRate: 0,
        satisfaction: 0,
      };
      return { current: emptyPoint, previous: emptyPoint };
    }

    return getCurrentAndPrevious(history);
  }, [history]);

  const summaryMetrics = useMemo<SummaryMetric[]>(() => {
    // Génération des cartes KPI de la synthèse exécutive.
    const enrollmentDelta = percentDelta(current.enrollments, previous.enrollments);
    const revenueDelta = percentDelta(current.revenue, previous.revenue);
    const successDelta = current.successRate - previous.successRate;

    return [
      {
        label: "Inscriptions",
        value: current.enrollments.toString(),
        delta: `${enrollmentDelta >= 0 ? "+" : ""}${round(enrollmentDelta)}% vs periode precedente`,
        tone:
          enrollmentDelta >= 5
            ? "positive"
            : enrollmentDelta >= -5
              ? "warning"
              : "critical",
      },
      {
        label: "Revenu",
        value: `${current.revenue.toLocaleString()} DT`,
        delta: `${revenueDelta >= 0 ? "+" : ""}${round(revenueDelta)}% vs periode precedente`,
        tone:
          revenueDelta >= 4
            ? "positive"
            : revenueDelta >= -4
              ? "warning"
              : "critical",
      },
      {
        label: "Reussite",
        value: `${round(current.successRate)}%`,
        delta: `${successDelta >= 0 ? "+" : ""}${round(successDelta)} pt vs periode precedente`,
        tone: classifyTone(current.successRate, 85, 75),
      },
    ];
  }, [current, previous]);

  const executiveSummary = useMemo(
    () => buildSummary(current, previous, filteredRecords),
    [current, previous, filteredRecords],
  );

  const keyMessages = useMemo(() => {
    // Messages courts destinés à mettre en avant
    // les éléments les plus importants pour la direction.
    const items: string[] = [];

    if (current.successRate < 80) {
      items.push(
        "Le niveau global de reussite passe sous le seuil de confort de 80%, ce qui justifie une revue pedagogique rapide.",
      );
    } else {
      items.push(
        "La performance academique reste globalement solide, mais elle se concentre sur un nombre limite de formations leaders.",
      );
    }

    if (current.dropoutRate > 16) {
      items.push(
        "Le risque d'erosion augmente: les abandons progressent plus vite que la croissance des inscriptions.",
      );
    }

    if (percentDelta(current.revenue, previous.revenue) < 0) {
      items.push(
        "La baisse du revenu est principalement reliee a des formations en recul d'attractivite et non a un probleme de prix global.",
      );
    } else {
      items.push(
        "La croissance du revenu vient surtout des formations techniques a forte demande, ce qui confirme un positionnement rentable.",
      );
    }

    return items.slice(0, 3);
  }, [current, previous]);

  const trendInsights = useMemo<InsightItem[]>(() => {
    // Interprétation des tendances observées.
    const enrollmentDelta = percentDelta(current.enrollments, previous.enrollments);
    const revenueDelta = percentDelta(current.revenue, previous.revenue);
    const successDelta = current.successRate - previous.successRate;

    return [
      {
        title: "Dynamique des inscriptions",
        text:
          enrollmentDelta >= 0
            ? `Le volume d'inscriptions progresse de ${round(enrollmentDelta)}%, signe que l'offre reste attractive sur la periode observee.`
            : `Le volume d'inscriptions baisse de ${Math.abs(round(enrollmentDelta))}%, ce qui signale une perte d'attractivite commerciale sur certaines offres.`,
        tone:
          enrollmentDelta >= 5
            ? "positive"
            : enrollmentDelta >= -5
              ? "warning"
              : "critical",
        metric: `${round(enrollmentDelta)}%`,
      },
      {
        title: "Evolution du revenu",
        text:
          revenueDelta >= 0
            ? "Le revenu suit une trajectoire positive, mais il depend encore fortement de quelques formations premium."
            : "Le revenu se contracte plus vite que les inscriptions, ce qui suggere une degradation de la valeur ou du mix de formations.",
        tone:
          revenueDelta >= 4
            ? "positive"
            : revenueDelta >= -4
              ? "warning"
              : "critical",
        metric: `${round(revenueDelta)}%`,
      },
      {
        title: "Qualite pedagogique",
        text:
          successDelta >= 0
            ? "La reussite se stabilise ou progresse, ce qui montre que la croissance actuelle reste absorbable pedagogiquement."
            : "La baisse de reussite indique que la croissance n'est pas entierement convertie en performance d'apprentissage.",
        tone:
          current.successRate >= 85
            ? "positive"
            : current.successRate >= 75
              ? "warning"
              : "critical",
        metric: `${round(current.successRate)}%`,
      },
    ];
  }, [current, previous]);

  const rootCauses = useMemo<InsightItem[]>(() => {
    // On cherche ici des causes probables :
    // chute de réussite, hausse d'abandon, baisse de satisfaction ou de revenu.
    // This logic performs a differential analysis between the two most recent periods for each course.
    const items = filteredRecords
      .map((record) => {
        const recent = record.history.slice(-2);
        const currentPoint = recent[recent.length - 1];
        const previousPoint = recent[0] ?? currentPoint;

        return {
          record,
          successDelta: currentPoint.successRate - previousPoint.successRate,
          revenueDelta: percentDelta(currentPoint.revenue, previousPoint.revenue),
          dropoutDelta: currentPoint.dropoutRate - previousPoint.dropoutRate,
          satisfactionDelta: currentPoint.satisfaction - previousPoint.satisfaction,
        };
      })
      .sort(
        (a, b) =>
          b.dropoutDelta +
          Math.abs(b.successDelta) -
          (a.dropoutDelta + Math.abs(a.successDelta)),
      );

    const causes: InsightItem[] = [];

    // Analyzes success rate drop
    const successCause = [...items].sort((a, b) => a.successDelta - b.successDelta)[0];
    if (successCause && successCause.successDelta < 0) {
      causes.push({
        title: `Chute de reussite sur ${successCause.record.formation}`,
        text: `La reussite baisse de ${Math.abs(round(successCause.successDelta))} points, en parallele d'une satisfaction en recul de ${Math.abs(round(successCause.satisfactionDelta))} points. Cela suggere un besoin d'ajustement pedagogique ou de soutien du formateur ${successCause.record.formateur}.`,
        tone: "critical",
        metric: `${round(successCause.record.history.at(-1)?.successRate ?? 0)}%`,
      });
    }

    // Analyzes dropout rate increase
    const dropoutCause = [...items].sort((a, b) => b.dropoutDelta - a.dropoutDelta)[0];
    if (dropoutCause && dropoutCause.dropoutDelta > 0) {
      causes.push({
        title: `Hausse d'abandon sur ${dropoutCause.record.formation}`,
        text: `Le taux d'abandon gagne ${round(dropoutCause.dropoutDelta)} points. La combinaison d'un engagement en baisse et d'une satisfaction plus faible explique probablement cette erosion.`,
        tone:
          dropoutCause.record.history.at(-1)?.dropoutRate ?? 0 > 18
            ? "critical"
            : "warning",
        metric: `${round(dropoutCause.record.history.at(-1)?.dropoutRate ?? 0)}%`,
      });
    }

    // Analyzes revenue underperformance
    const revenueCause = [...items].sort((a, b) => a.revenueDelta - b.revenueDelta)[0];
    if (revenueCause && revenueCause.revenueDelta < 0) {
      causes.push({
        title: `Sous-performance business de ${revenueCause.record.formation}`,
        text: `Le revenu baisse de ${Math.abs(round(revenueCause.revenueDelta))}%. Le signal est plus fort que la seule baisse d'inscriptions, ce qui laisse penser a une perte de desirabilite ou de valeur percue.`,
        tone: revenueCause.revenueDelta < -10 ? "critical" : "warning",
        metric: `${round(revenueCause.revenueDelta)}%`,
      });
    }

    return causes.slice(0, 3);
  }, [filteredRecords]);

  const problems = useMemo<InsightItem[]>(() => {
    // Détection simple d'anomalies métier à partir de seuils.
    // C'est une logique de règles, utile pour une première version BI.
    const detected = filteredRecords.flatMap((record) => {
      const currentPoint = record.history[record.history.length - 1];
      const items: InsightItem[] = [];

      if (currentPoint.dropoutRate >= 18) {
        items.push({
          title: `Abandon eleve - ${record.formation}`,
          text: `Le taux d'abandon atteint ${currentPoint.dropoutRate}%. Cette formation menace a la fois la marge et l'image de qualite du centre.`,
          tone: "critical",
          metric: `${currentPoint.dropoutRate}%`,
        });
      }

      if (currentPoint.satisfaction < 75) {
        items.push({
          title: `Satisfaction faible - ${record.formation}`,
          text: `La satisfaction tombe a ${currentPoint.satisfaction}%. Les retours apprenants risquent d'impacter les prochaines inscriptions.`,
          tone: "warning",
          metric: `${currentPoint.satisfaction}/100`,
        });
      }

      if (currentPoint.successRate < 78) {
        items.push({
          title: `Formation sous-performante - ${record.formation}`,
          text: `Le taux de reussite est de ${currentPoint.successRate}%, sous le seuil de securite pedagogique retenu.`,
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
        text: "Aucune anomalie severe n'est detectee sur le portefeuille filtre. La vigilance doit se concentrer sur la prevention plutot que la correction.",
        tone: "positive",
      },
    ];
  }, [filteredRecords]);

  const recommendations = useMemo<RecommendationItem[]>(() => {
    // Les recommandations sont construites à partir
    // des formations les plus risquées ou les plus prometteuses.
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
        title: `Lancer un plan de retention sur ${highestRisk.record.formation}`,
        description: "Mettre en place un diagnostic apprenant, renforcer les checkpoints hebdomadaires et adapter la charge des modules les plus difficiles.",
        owner: "Responsable pedagogique",
        impact: "Reduction attendue de 4 a 6 points d'abandon",
        priority: "Haute",
        tone: "critical",
      });
    }

    const lowSatisfaction = atRisk.find((item) => item.point.satisfaction < 75);
    if (lowSatisfaction) {
      actionList.push({
        title: `Revoir l'experience de formation de ${lowSatisfaction.record.formation}`,
        description: "Collecter les irritants precis, ajuster le rythme et augmenter la part de pratique ou d'accompagnement formateur.",
        owner: `Formateur ${lowSatisfaction.record.formateur}`,
        impact: "Hausse attendue de la satisfaction et de la conversion bouche-a-oreille",
        priority: "Haute",
        tone: "warning",
      });
    }

    const growthPocket = [...filteredRecords]
      .map((record) => {
        const recent = record.history.slice(-2);
        const currentPoint = recent[recent.length - 1];
        const previousPoint = recent[0] ?? currentPoint;
        return {
          record,
          revenueDelta: percentDelta(currentPoint.revenue, previousPoint.revenue),
        };
      })
      .sort((a, b) => b.revenueDelta - a.revenueDelta)[0];

    if (growthPocket) {
      actionList.push({
        title: `Capitaliser sur ${growthPocket.record.formation}`,
        description: "Renforcer la communication sur cette offre et reutiliser ses leviers de performance sur des parcours voisins.",
        owner: "Direction + Marketing",
        impact: "Acceleration du revenu sur le portefeuille rentable",
        priority: "Moyenne",
        tone: "positive",
      });
    }

    return actionList.slice(0, 3);
  }, [filteredRecords]);

  const risks = useMemo<RiskItem[]>(() => {
    // Projection de scénarios si la tendance se prolonge.
    const revenueDelta = percentDelta(current.revenue, previous.revenue);
    const enrollmentDelta = percentDelta(current.enrollments, previous.enrollments);
    const risksList: RiskItem[] = [];

    if (current.dropoutRate >= 16) {
      risksList.push({
        title: "Risque de baisse de marge",
        description: `Si l'abandon reste a ${round(current.dropoutRate)}%, une partie du revenu projete du mois suivant pourrait etre perdue avant la fin des parcours.`,
        horizon: "30 jours",
        probability: "Elevee",
        tone: "critical",
      });
    }

    if (revenueDelta < 0 || enrollmentDelta < 0) {
      risksList.push({
        title: "Risque commercial",
        description: "La poursuite du ralentissement actuel peut reduire le pipeline futur et fragiliser les formations a faible volume.",
        horizon: "1 a 2 mois",
        probability: "Moyenne a elevee",
        tone: "warning",
      });
    }

    risksList.push({
      title: "Risque de concentration",
      description: "Le revenu reste fortement porte par un petit nombre de formations techniques. Toute baisse sur ces offres aurait un effet direct sur la performance globale.",
      horizon: "Trimestre",
      probability: "Moyenne",
      tone: "neutral",
    });

    return risksList.slice(0, 3);
  }, [current, previous]);

  const focusItems = useMemo<FocusItem[]>(() => {
    // Cette logique prépare le drill-down.
    // Selon le mode choisi, on regroupe par formation ou par formateur.
    const grouped = new Map<string, FocusItem>();

    filteredRecords.forEach((record) => {
      const currentPoint = record.history[record.history.length - 1];
      const previousPoint = record.history[record.history.length - 2] ?? currentPoint;
      const key = focusMode === "formations" ? record.formation : record.formateur;
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
          (existing.revenueDelta + percentDelta(currentPoint.revenue, previousPoint.revenue)) / 2,
        );
        existing.successRate = round((existing.successRate + currentPoint.successRate) / 2);
        existing.successDelta = round(
          (existing.successDelta + (currentPoint.successRate - previousPoint.successRate)) / 2,
        );
        existing.dropoutRate = round((existing.dropoutRate + currentPoint.dropoutRate) / 2);
        existing.alertCount += alertCount;
      } else {
        grouped.set(key, {
          label: key,
          secondaryLabel,
          successRate: currentPoint.successRate,
          successDelta: currentPoint.successRate - previousPoint.successRate,
          revenue: currentPoint.revenue,
          revenueDelta: percentDelta(currentPoint.revenue, previousPoint.revenue),
          dropoutRate: currentPoint.dropoutRate,
          alertCount,
        });
      }
    });

    return [...grouped.values()]
      .sort((a, b) => b.alertCount - a.alertCount || b.dropoutRate - a.dropoutRate)
      .slice(0, 4);
  }, [filteredRecords, focusMode]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">
            Generation du rapport strategique en cours...
          </p>
        </div>
      </div>
    );
  }

  if (filteredRecords.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">
          Aucun rapport disponible pour ce filtre
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Modifiez la periode, la formation ou le formateur pour afficher une
          lecture strategique exploitable.
        </p>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      {/* Hero d'introduction :
          il positionne la page comme un outil d'analyse stratégique
          et non comme un dashboard de monitoring simple. */}
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
              Analyse de decision pour la direction
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-200">
              Cette page explique les variations de performance, identifie les
              causes probables et suggere les decisions prioritaires a prendre.
            </p>
          </div>
        </div>
      </section>

      <SummarySection
        summary={executiveSummary}
        metrics={summaryMetrics}
        keyMessages={keyMessages}
      />

      {/* Zone centrale d'analyse :
          tendances, causes, problèmes et focus détaillé. */}
      <InsightsSection
        history={history}
        trendInsights={trendInsights}
        rootCauses={rootCauses}
        problems={problems}
        focusItems={focusItems}
        focusMode={focusMode}
        onFocusModeChange={setFocusMode}
      />

      {/* Le rapport aboutit ensuite à des décisions proposées. */}
      <RecommendationsSection recommendations={recommendations} />

      {/* Enfin, la page se projette sur les risques futurs
          si aucune action n'est menée. */}
      <RiskSection risks={risks} />
    </main>
  );
}
