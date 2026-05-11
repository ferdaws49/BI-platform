import { DashboardFilterDto } from "src/dashboard/dto/dashboard-filter.dto";
const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * Bornes de la période courante (filtres ou défaut ~30 jours) et de la période
 * précédente de même durée, pour comparaisons (croissance, variation).
 */

export interface ResolvedPeriod {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
}
 
interface FilterWithDates {
  startDate?: string;
  endDate?: string;
}


export function resolveDashboardPeriod(filter: { startDate?: string; endDate?: string }):  ResolvedPeriod {
  const now = new Date();
    const year = now.getFullYear(); 
  const currentEnd = filter.endDate ? new Date(filter.endDate)
  : new Date(`${year}-12-31T23:59:59.999Z`);
  const currentStart = filter.startDate ? new Date(filter.startDate)
    : new Date(`${year}-01-01T00:00:00.000Z`);
  
  if (isNaN(currentStart.getTime()) || isNaN(currentEnd.getTime())) {
    console.error("❌ Invalid dates:", {
      startDate: filter.startDate,
      endDate: filter.endDate,
    });
    throw new Error("Invalid date format");
  }
  const durationMs = currentEnd.getTime() - currentStart.getTime();
  const previousEnd = new Date(currentStart.getTime() - 1); // 1 ms avant le début courant
  const previousStart = new Date(previousEnd.getTime() - durationMs);
  return { currentStart, currentEnd, previousStart, previousEnd };
}

/** Croissance en % entre deux valeurs (période précédente = dénominateur). */
export function growthPercent(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0 ;
  }
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}