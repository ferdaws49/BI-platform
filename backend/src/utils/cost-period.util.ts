import { CostFilterDto, CostPeriodPreset } from 'src/finances/dto/cost-filter.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function endOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function startOfUtcQuarter(d: Date): Date {
  const q = Math.floor(d.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(d.getUTCFullYear(), q, 1));
}

function endOfUtcQuarter(d: Date): Date {
  const q = Math.floor(d.getUTCMonth() / 3);
  const lastMonth = q * 3 + 2;
  return new Date(Date.UTC(d.getUTCFullYear(), lastMonth + 1, 0, 23, 59, 59, 999));
}

function startOfUtcYear(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

function endOfUtcYear(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
}

/**
 * Période d’analyse des coûts : bornes sur les dates de début de session,
 * alignées avec les filtres explicites ou un préréglage Mois / Trimestre / Année.
 */
export function resolveCostPeriod(filter: CostFilterDto): {
  rangeStart: Date;
  rangeEnd: Date;
} {
  const now = new Date();
  if (filter.startDate && filter.endDate) {
    return {
      rangeStart: new Date(filter.startDate),
      rangeEnd: new Date(filter.endDate),
    };
  }
  if (filter.periodPreset === CostPeriodPreset.MONTH) {
    return { rangeStart: startOfUtcMonth(now), rangeEnd: endOfUtcMonth(now) };
  }
  if (filter.periodPreset === CostPeriodPreset.QUARTER) {
    return { rangeStart: startOfUtcQuarter(now), rangeEnd: endOfUtcQuarter(now) };
  }
  if (filter.periodPreset === CostPeriodPreset.YEAR) {
    return { rangeStart: startOfUtcYear(now), rangeEnd: endOfUtcYear(now) };
  }

  // 3. fallback SAFE (PAS 2025 !)
  return {
    rangeStart: startOfUtcYear(now),
    rangeEnd: now,
  };
}
