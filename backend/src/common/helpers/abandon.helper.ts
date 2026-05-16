// src/common/helpers/abandon.helper.ts

/**
 * Définition centrale du taux d'abandon — utilisée dans tous les modules.
 * Abandon = apprenant inscrit dans au moins une session mais sans aucune performance.
 *
 * @param totalInscrits  — nombre d'apprenants uniques inscrits dans les sessions
 * @param totalEvalues   — nombre d'apprenants ayant au moins une performance
 */
export function computeAbandonRate(
  totalInscrits: number,
  totalEvalues: number,
): number {
  if (totalInscrits === 0) return 0;
  return Math.max(0, Math.round(((totalInscrits - totalEvalues) / totalInscrits) * 100));
}