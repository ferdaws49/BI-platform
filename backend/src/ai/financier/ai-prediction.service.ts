import { Injectable } from '@nestjs/common';
import { FinanceRevenueService } from 'src/finances/services/finance-revenu.service';
import { FinanceCostService } from 'src/finances/services/finance-cost.service';
import { FinancierDashboardService } from 'src/dashboard/services/financier.dashboard.service';
import { AiFilterDto } from '././dtos/ai-filter.dto';
import {
  RevenueForecastDto,
  SessionRiskDto,
  RiskLevel,
  CashflowForecastDto,
  SeasonalityDto,
  MonthlyTrendDto,
  MonthStrength,
  AiDashboardDto,
} from '././dtos/ai-response.dto';
import { FinancierDashboardFilterDto } from 'src/dashboard/dto/financier-dashboard-filter.dto';
import { CostFilterDto } from 'src/finances/dto/cost-filter.dto';
import { RevenueFilterDto } from 'src/finances/dto/revenue-filter.dto';

@Injectable()
export class AiPredictionService {
  constructor(
    private readonly revenueService: FinanceRevenueService,
    private readonly costService: FinanceCostService,
    private readonly dashboardService: FinancierDashboardService,
  ) {}

  // ==========================================================================
  // 1. PRÉVISION DU CHIFFRE D'AFFAIRES
  // ==========================================================================
  async predictRevenue(filter: AiFilterDto): Promise<RevenueForecastDto> {
    const dashFilter = this.toDashboardFilter(filter);
    const history = await this.dashboardService.getRevenueByMonth(dashFilter);

    if (history.length === 0) {
      return { labels: [], actual: [], predicted: [] };
    }

    const predictMonths = Number(filter.predictMonths) || 3;
    const points = history.map((h, i) => ({ x: i, y: h.caRealise }));

    const { slope, intercept } =
      points.length >= 2
        ? this.linearRegression(points)
        : { slope: 0, intercept: points[points.length - 1]?.y || 0 };

    const labels: string[] = [];
    const actual: (number | null)[] = [];
    const predicted: (number | null)[] = [];

    for (let i = 0; i < history.length; i++) {
      labels.push(history[i].month);
      actual.push(history[i].caRealise);
      predicted.push(null);
    }

    const lastIndex = history.length - 1;
    predicted[lastIndex] = history[lastIndex].caRealise;

    const lastDate = this.parseMonth(history[history.length - 1].month);
    for (let i = 1; i <= predictMonths; i++) {
      const d = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      labels.push(label);
      actual.push(null);

      const val = slope * (lastIndex + i) + intercept;
      predicted.push(Number(Math.max(0, val).toFixed(2)));
    }

    return { labels, actual, predicted };
  }

  // ==========================================================================
  // 2. PRÉVISION DES SESSIONS DÉFICITAIRES (CORRIGÉ)
  // ==========================================================================
  async predictSessionRisk(filter: AiFilterDto): Promise<SessionRiskDto[]> {
    const costFilter = this.toCostFilter(filter);
    const [table, kpi] = await Promise.all([
      this.costService.getSessionsTable(costFilter),
      this.costService.getKpi(costFilter),
    ]);

    if (!table?.items?.length) return [];

    const avgPrice = kpi.breakEven?.avgPricePerStudent || 0;

    return table.items
      .map((session): SessionRiskDto => {
        const fillRate = session.tauxRemplissagePercent / 100;
        const totalCost = session.coutTotal;
        
        // ── Score composite 0 → 1 ──
        let score = 0;

        // 45% : taux de remplissage (utilise le % existant, pas 'inscrits')
        score += Math.min(0.45, (1 - fillRate) * 0.45);

        // 35% : marge négative
        const marginRatio = session.marge / Math.max(1, totalCost);
        score += Math.min(0.35, Math.max(0, -marginRatio) * 0.35);

        // 20% : écart au break-even (estimation via coutTotal / avgPrice)
        // On estime le nombre d'étudiants nécessaires sans avoir 'inscrits'
        const studentsNeeded =
          avgPrice > 0 ? Math.ceil(totalCost / avgPrice) : 0;
        // Estimation du nombre actuel d'inscrits via le taux de remplissage
        // On suppose capacite moyenne = 20 si on n'a pas l'info exacte
        // Mais mieux : on utilise directement le fillRate comme proxy
        const estimatedStudents = fillRate * Math.max(1, studentsNeeded);
        const gap = Math.max(0, studentsNeeded - estimatedStudents);
        score += Math.min(0.20, (gap / Math.max(1, studentsNeeded)) * 0.20);

        const riskScore = Number(Math.min(1, score).toFixed(2));

        let riskLevel = RiskLevel.SAFE;
        if (riskScore > 0.7) riskLevel = RiskLevel.HIGH_RISK;
        else if (riskScore > 0.4) riskLevel = RiskLevel.MEDIUM;

        let reason = 'Tendance stable';
        if (session.statutRentabilite === 'deficitaire') {
          reason = 'Session déjà déficitaire (marge négative)';
        } else if (fillRate < 0.5) {
          reason = `Taux de remplissage critique (${session.tauxRemplissagePercent.toFixed(0)}%)`;
        } else if (gap > 0) {
          reason = `Break-even non atteint (est. ${estimatedStudents.toFixed(0)}/${studentsNeeded} étudiants)`;
        }

        return {
          sessionId: (session as any).sessionId || session.session,
          sessionName: session.session,
          formationName: session.formation,
          riskScore,
          riskLevel,
          reason,
          currentFillRate: session.tauxRemplissagePercent,
          currentMargin: session.marge,
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  // ==========================================================================
  // 3. PRÉVISION DE TRÉSORERIE (CORRIGÉ)
  // ==========================================================================
  async predictCashflow(filter: AiFilterDto): Promise<CashflowForecastDto> {
    const revenueFilter = this.toRevenueFilter(filter);
    const costFilter = this.toCostFilter(filter);

    const [paymentBar, costTrend] = await Promise.all([
      this.revenueService.getPaymentManagementBar(revenueFilter),
      this.costService.getTrend(costFilter),
    ]);

    const monthMap = new Map<string, { inflow: number; outflow: number }>();
    if (paymentBar?.rows) {
      for (const r of paymentBar.rows) {
        monthMap.set(r.month, { inflow: r.caEncaisse, outflow: 0 });
      }
    }
    if (costTrend?.points) {
      for (const p of costTrend.points) {
        const cur = monthMap.get(p.mois) || { inflow: 0, outflow: 0 };
        cur.outflow = p.coutTotal;
        monthMap.set(p.mois, cur);
      }
    }

    const months = Array.from(monthMap.keys()).sort();
    const balances: number[] = months.map((m) => {
      const d = monthMap.get(m)!;
      return Number((d.inflow - d.outflow).toFixed(2));
    });

    if (months.length === 0) {
      return { labels: [], inflow: [], outflow: [], balance: [], warning: false, warningMonths: [] };
    }

    const predictMonths = Number(filter.predictMonths) || 3;
    const points = balances.map((b, i) => ({ x: i, y: b }));
    const { slope, intercept } =
      points.length >= 2
        ? this.linearRegression(points)
        : { slope: 0, intercept: balances[balances.length - 1] };

    const labels: string[] = [...months];
    const inflow: (number | null)[] = months.map((m) => monthMap.get(m)!.inflow);
    const outflow: (number | null)[] = months.map((m) => monthMap.get(m)!.outflow);
    
    // FIX : typage explicite pour éviter l'erreur null/number
    const balance: (number | null)[] = balances.map((b) => b as number | null);
    const warningMonths: string[] = [];

    const lastIdx = months.length - 1;
    // Raccordement : on force le type pour le dernier point
    balance[lastIdx] = balances[lastIdx] as number | null;

    for (let i = 1; i <= predictMonths; i++) {
      const futureMonth = this.incrementMonth(months[months.length - 1], i);
      labels.push(futureMonth);
      inflow.push(null);
      outflow.push(null);

      const pred = slope * (lastIdx + i) + intercept;
      const rounded = Number(pred.toFixed(2));
      balance.push(rounded);

      if (rounded < 0) warningMonths.push(futureMonth);
    }

    return {
      labels,
      inflow,
      outflow,
      balance,
      warning: warningMonths.length > 0,
      warningMonths,
    };
  }

  // ==========================================================================
  // 4. SAISONNALITÉ (inchangé)
  // ==========================================================================
  async predictSeasonality(filter: AiFilterDto): Promise<SeasonalityDto> {
    const dashFilter = this.toDashboardFilter(filter);
    const history = await this.dashboardService.getRevenueByMonth(dashFilter);

    if (!history.length) {
      return { bestMonth: 'N/A', worstMonth: 'N/A', monthlyTrend: [] };
    }

    const groups = new Map<number, number[]>();
    for (const h of history) {
      const d = this.parseMonth(h.month);
      const idx = d.getMonth();
      const arr = groups.get(idx) || [];
      arr.push(h.caRealise);
      groups.set(idx, arr);
    }

    const monthNames = [
      'Janvier','Février','Mars','Avril','Mai','Juin',
      'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
    ];

    const monthlyTrend: MonthlyTrendDto[] = [];
    let bestVal = -Infinity;
    let worstVal = Infinity;
    let bestIdx = 0;
    let worstIdx = 0;

    for (let i = 0; i < 12; i++) {
      const vals = groups.get(i) || [];
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

      if (avg > bestVal) { bestVal = avg; bestIdx = i; }
      if (avg < worstVal) { worstVal = avg; worstIdx = i; }

      let strength = MonthStrength.LOW;
      if (avg >= bestVal * 0.8) strength = MonthStrength.HIGH;
      else if (avg >= bestVal * 0.5) strength = MonthStrength.MEDIUM;

      monthlyTrend.push({
        month: monthNames[i],
        monthIndex: i,
        value: Number(avg.toFixed(2)),
        strength,
      });
    }

    return {
      bestMonth: monthNames[bestIdx],
      worstMonth: monthNames[worstIdx],
      monthlyTrend,
    };
  }

  // ==========================================================================
  // DASHBOARD COMBINÉ
  // ==========================================================================
  async getDashboard(filter: AiFilterDto): Promise<AiDashboardDto> {
    const [revenueForecast, sessionRisks, cashflow, seasonality] = await Promise.all([
      this.predictRevenue(filter),
      this.predictSessionRisk(filter),
      this.predictCashflow(filter),
      this.predictSeasonality(filter),
    ]);

    return { revenueForecast, sessionRisks, cashflow, seasonality };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ═════════════════════════════════════════════════════════════════════════

  private linearRegression(data: { x: number; y: number }[]) {
    const n = data.length;
    const sumX = data.reduce((a, b) => a + b.x, 0);
    const sumY = data.reduce((a, b) => a + b.y, 0);
    const sumXY = data.reduce((a, b) => a + b.x * b.y, 0);
    const sumXX = data.reduce((a, b) => a + b.x * b.x, 0);
    const denominator = n * sumXX - sumX * sumX || 1;
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  }

  private parseMonth(monthStr: string): Date {
    const [year, month] = monthStr.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }

  private incrementMonth(monthStr: string, add: number): string {
    const d = this.parseMonth(monthStr);
    d.setMonth(d.getMonth() + add);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private toDashboardFilter(filter: AiFilterDto): FinancierDashboardFilterDto {
    const f = new FinancierDashboardFilterDto();
    f.startDate = filter.startDate;
    f.endDate = filter.endDate;
    if (filter.formationId) f.formationId = Number(filter.formationId);
    return f;
  }

  private toCostFilter(filter: AiFilterDto): CostFilterDto {
    const f = new CostFilterDto();
    f.startDate = filter.startDate;
    f.endDate = filter.endDate;
    if (filter.formationId) f.formationId = Number(filter.formationId);
    return f;
  }

  private toRevenueFilter(filter: AiFilterDto): RevenueFilterDto {
    const f = new RevenueFilterDto();
    f.startDate = filter.startDate;
    f.endDate = filter.endDate;
    if (filter.formationId) f.formationId = Number(filter.formationId);
    return f;
  }
}