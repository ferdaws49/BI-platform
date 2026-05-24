import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  CostFilterDto,
  CostLevelFilter,
  CostSessionSortBy,
  RentabilityFilter,
  TauxRemplissageFilter,
} from '../dto/cost-filter.dto';
import { resolveCostPeriod } from 'src/utils/cost-period.util';
import { SortOrder } from '../dto/revenue-filter.dto';
import {
  CostKpiDto,
  CostRepartitionResponseDto,
  CostTrendResponseDto,
  SessionCostTableResponseDto,
  SessionCostTableRowDto,
  SessionEfficienceDto,
  TopFormateurCostDto,
} from '../dto/cost-response.dto';

type Rentabilite = 'rentable' | 'seuil' | 'deficitaire';

interface SessionCostMetrics {
  sessionId: string;
  sessionTitle: string;
  formationTitle: string;
  startDate: string;
  instructor: string;
  formateurId: number;
  coutFormateur: number;
  coutLogistique: number;
  coutTotal: number;
  capaciteMax: number;
  inscrits: number;
  ca: number;
  marge: number;
  tauxRemplissagePercent: number;
  coutParEtudiant: number;
  rentabilite: Rentabilite;
  costTier: CostLevelFilter;
}

@Injectable()
export class FinanceCostService {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async getKpi(filter: CostFilterDto): Promise<CostKpiDto> {
    const metrics = await this.loadSessionMetrics(filter);
    const rows = this.applyMetricFilters(filter, metrics);

    let coutTotal = 0;
    let coutFormateurs = 0;
    let totalInscrits = 0;
    let totalCa = 0;

    for (const r of rows) {
      coutTotal += r.coutTotal;
      coutFormateurs += r.coutFormateur;
      totalInscrits += r.inscrits;
      totalCa += r.ca;
    }

    const n = rows.length || 1;
    const avgPricePerStudent = totalInscrits > 0 ? totalCa / totalInscrits : 0;
    
    let studentsNeeded = 0;
    if (avgPricePerStudent > 0) {
      studentsNeeded = Math.ceil(coutTotal / avgPricePerStudent);
    }

    return {
      coutTotal: Number(coutTotal.toFixed(2)),
      coutFormateurs: Number(coutFormateurs.toFixed(2)),
      coutMoyenParSession: Number((coutTotal / n).toFixed(2)),
      breakEven: {
        studentsNeeded: studentsNeeded,
        avgPricePerStudent: Number(avgPricePerStudent.toFixed(2)),
        status: this.resolveBreakEvenStatus(totalInscrits, studentsNeeded, coutTotal, avgPricePerStudent),
        totalStudents: totalInscrits,
        totalCost: Number(coutTotal.toFixed(2)),
      }
    };
  }

  private async loadSessionMetrics(filter: CostFilterDto): Promise<SessionCostMetrics[]> {
    const { rangeStart, rangeEnd } = resolveCostPeriod(filter);
    const sd = rangeStart.toISOString().split('T')[0];
    const ed = rangeEnd.toISOString().split('T')[0];

    const params: any[] = [sd, ed];
    let formationFilter = '';
    let formateurFilter = '';

    if (filter.formationId) {
      params.push(filter.formationId);
      formationFilter = `AND df.formation_id = $${params.length}`;
    }
    if (filter.formateurId) {
      params.push(filter.formateurId);
      formateurFilter = `AND dfo.formateur_id = $${params.length}`;
    }

    const raws = await this.dataSource.query(`
      WITH session_inscrits AS (
        SELECT 
          f.sk_session,
          COUNT(DISTINCT f.sk_apprenant) as inscrits
        FROM dw.fact_finance f
        JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
        WHERE t.date_key BETWEEN $1 AND $2
          AND f.sk_apprenant != -1
        GROUP BY f.sk_session
      ),
      session_ca AS (
        SELECT 
          f.sk_session,
          COALESCE(SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END), 0) as ca
        FROM dw.fact_finance f
        JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
        JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
        WHERE t.date_key BETWEEN $1 AND $2
        GROUP BY f.sk_session
      ),
      session_couts AS (
        SELECT 
          f.sk_session,
          COALESCE(SUM(CASE WHEN tf.type = 'depense_formateur' THEN -f.montant ELSE 0 END), 0) as cout_formateur,
          COALESCE(SUM(CASE WHEN tf.type = 'depense_logistique' THEN -f.montant ELSE 0 END), 0) as cout_logistique
        FROM dw.fact_finance f
        JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
        JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
        WHERE t.date_key BETWEEN $1 AND $2
        GROUP BY f.sk_session
      ),
      session_formation AS (
        -- Récupère UNE formation par session via fact_finance
        SELECT DISTINCT ON (f.sk_session)
          f.sk_session,
          df.titre as formation_title,
          df.formation_id
        FROM dw.fact_finance f
        JOIN dw.dim_formation df ON f.sk_formation = df.sk_formation
        ORDER BY f.sk_session, f.id_fact_finance
      ),
      session_formateur AS (
        -- Récupère UN formateur par session via fact_finance
        SELECT DISTINCT ON (f.sk_session)
          f.sk_session,
          dfo.nom as formateur_nom,
          dfo.formateur_id
        FROM dw.fact_finance f
        JOIN dw.dim_formateur dfo ON f.sk_formateur = dfo.sk_formateur
        ORDER BY f.sk_session, f.id_fact_finance
      )
      SELECT 
        ds.session_id as "sessionId",
        COALESCE(ds.titre, ds.type_session, 'Session sans nom') as "sessionTitle",
        COALESCE(sf.formation_title, 'Formation non liée') as "formationTitle",
        ds.date as "startDate",
        COALESCE(sfo.formateur_nom, 'Sans formateur') as "instructor",
        COALESCE(sfo.formateur_id, 0) as "formateurId",
        COALESCE(sc.cout_formateur, 0) as "coutFormateur",
        COALESCE(sc.cout_logistique, 0) as "coutLogistique",
        ds.capacite as "capaciteMax",
        COALESCE(si.inscrits, 0) as "inscrits",
        COALESCE(sca.ca, 0) as "ca"
      FROM dw.dim_session ds
      LEFT JOIN session_inscrits si ON si.sk_session = ds.sk_session
      LEFT JOIN session_ca sca ON sca.sk_session = ds.sk_session
      LEFT JOIN session_couts sc ON sc.sk_session = ds.sk_session
      LEFT JOIN session_formation sf ON sf.sk_session = ds.sk_session
      LEFT JOIN session_formateur sfo ON sfo.sk_session = ds.sk_session
      WHERE ds.session_id != '00000000-0000-0000-0000-000000000000'
        AND ds.date BETWEEN $1 AND $2
        ${formationFilter}
        ${formateurFilter}
    `, params);

    return raws.map(row => {
      const cFormateur = parseFloat(row.coutFormateur || 0);
      const cLogistique = parseFloat(row.coutLogistique || 0);
      const caTotal = parseFloat(row.ca || 0);
      const nbInscrits = parseInt(row.inscrits || 0);
      const capacite = parseInt(row.capaciteMax || 1);
      
      const coutTotal = cFormateur + cLogistique;
      const marge = caTotal - coutTotal;

      return {
        sessionId: String(row.sessionId),
        sessionTitle: row.sessionTitle || '—',
        formationTitle: row.formationTitle || '—',
        startDate: row.startDate,
        instructor: row.instructor || 'Sans formateur',
        formateurId: parseInt(row.formateurId) || 0,
        coutFormateur: cFormateur,
        coutLogistique: cLogistique,
        coutTotal: coutTotal,
        capaciteMax: capacite,
        inscrits: nbInscrits,
        ca: caTotal,
        marge: marge,
        tauxRemplissagePercent: (nbInscrits / Math.max(1, capacite)) * 100,
        coutParEtudiant: nbInscrits > 0 ? coutTotal / nbInscrits : 0,
        rentabilite: this.resolveRentabilite(marge),
        costTier: this.resolveCostTier(coutTotal),
      };
    });
  }

  private resolveRentabilite(marge: number): Rentabilite {
    if (marge > 0) return 'rentable';
    if (marge === 0) return 'seuil';
    return 'deficitaire';
  }

  private resolveCostTier(coutTotal: number): CostLevelFilter {
    if (coutTotal <= 500) return CostLevelFilter.PETIT;
    if (coutTotal <= 2000) return CostLevelFilter.MOYEN;
    return CostLevelFilter.ELEVE;
  }

  async getTopFormateurs(filter: CostFilterDto): Promise<TopFormateurCostDto[]> {
    const allMetrics = await this.loadSessionMetrics(filter);
    const rows = this.applyMetricFilters(filter, allMetrics);
    const limit = filter.topLimit ?? 10;

    const map = new Map<number, { nom: string; cout: number; sessions: Set<string> }>();

    for (const r of rows) {
      const fid = r.formateurId;
      if (!fid || fid === 0) continue;

      const cur = map.get(fid) ?? { 
        nom: r.instructor?.trim() || 'Formateur Inconnu', 
        cout: 0, 
        sessions: new Set<string>() 
      };

      cur.cout += r.coutTotal;
      cur.sessions.add(String(r.sessionId));
      map.set(fid, cur);
    }

    const list: TopFormateurCostDto[] = Array.from(map.entries()).map(([formateurId, v]) => {
      const nbSessions = v.sessions.size;
      return {
        formateurId,
        nomFormateur: v.nom,
        coutTotal: Number(v.cout.toFixed(2)),
        nombreSessions: nbSessions,
        coutMoyenParSession: nbSessions > 0 ? Number((v.cout / nbSessions).toFixed(2)) : 0,
      };
    });

    return list
      .sort((a, b) => b.coutTotal - a.coutTotal)
      .slice(0, limit);
  }

  async getRepartition(filter: CostFilterDto): Promise<CostRepartitionResponseDto> {
    const allMetrics = await this.loadSessionMetrics(filter);
    const rows = this.applyMetricFilters(filter, allMetrics);

    let cf = 0;
    let cl = 0;

    for (const r of rows) {
      cf += r.coutFormateur;
      cl += r.coutLogistique;
    }

    const total = cf + cl;

    if (total === 0) {
      return {
        repartition: { coutFormateursPercent: 0, coutLogistiquePercent: 0 }
      };
    }

    return {
      repartition: {
        coutFormateursPercent: Number(((cf / total) * 100).toFixed(2)),
        coutLogistiquePercent: Number(((cl / total) * 100).toFixed(2)),
      },
    };
  }

  async getTrend(filter: CostFilterDto): Promise<CostTrendResponseDto> {
    const { rangeStart, rangeEnd } = resolveCostPeriod(filter);
    const metrics = await this.loadSessionMetrics(filter);
    const rows = this.applyMetricFilters(filter, metrics);

    const months = this.enumerateMonths(
      rangeStart.toISOString().split('T')[0],
      rangeEnd.toISOString().split('T')[0]
    );

    const byMonth = new Map<string, number>();
    for (const r of rows) {
      if (!r.startDate) continue;
      
      const d = new Date(r.startDate);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const mois = `${yyyy}-${mm}`;
        byMonth.set(mois, (byMonth.get(mois) ?? 0) + r.coutTotal);
      }
    }

    const points = months.map((m) => ({
      mois: m,
      coutTotal: Number((byMonth.get(m) ?? 0).toFixed(2)),
    }));

    return { points };
  }

  private enumerateMonths(start: string, end: string): string[] {
    const months: string[] = [];
    const curr = new Date(start);
    curr.setDate(1);
    const last = new Date(end);
    last.setDate(1);

    while (curr <= last) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      months.push(`${yyyy}-${mm}`);
      curr.setMonth(curr.getMonth() + 1);
    }
    return months;
  }

  async getEfficience(filter: CostFilterDto): Promise<SessionEfficienceDto[]> {
    const rows = this.applyMetricFilters(filter, await this.loadSessionMetrics(filter));
    return rows.map((r) => ({
      sessionId: String(r.sessionId),
      formation: r.formationTitle,
      coutTotal: Number(r.coutTotal.toFixed(2)),
      coutParEtudiant: Number(r.coutParEtudiant.toFixed(2)),
      nombreInscrits: r.inscrits,
    }));
  }

  async getSessionsTable(filter: CostFilterDto): Promise<SessionCostTableResponseDto> {
    const rows = this.applyMetricFilters(filter, await this.loadSessionMetrics(filter));
    const sorted = this.sortSessionRows(
      rows,
      filter.sortBy ?? CostSessionSortBy.COUT,
      filter.sortOrder ?? SortOrder.DESC,
    );
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const total = sorted.length;
    const start = (page - 1) * limit;
    const slice = sorted.slice(start, start + limit);

    const items: SessionCostTableRowDto[] = slice.map((r) => ({
      formation: r.formationTitle,
      session: r.sessionTitle,
      formateur: r.instructor || '—',
      coutDirectFormateur: Number(r.coutFormateur.toFixed(2)),
      fraisLogistique: Number(r.coutLogistique.toFixed(2)),
      coutTotal: Number(r.coutTotal.toFixed(2)),
      marge: Number(r.marge.toFixed(2)),
      tauxRemplissagePercent: Number(r.tauxRemplissagePercent.toFixed(2)),
      statutRentabilite: r.rentabilite as 'rentable' | 'seuil' | 'deficitaire',
    }));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private sortSessionRows(
    rows: SessionCostMetrics[],
    sortBy: CostSessionSortBy,
    sortOrder: SortOrder
  ): SessionCostMetrics[] {
    return [...rows].sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortBy) {
        case CostSessionSortBy.COUT:
          valA = a.coutTotal;
          valB = b.coutTotal;
          break;
        case CostSessionSortBy.MARGE:
          valA = a.marge;
          valB = b.marge;
          break;
        case CostSessionSortBy.RENTABILITE:
          valA = a.marge;
          valB = b.marge;
          break;
        case CostSessionSortBy.TAUX_REMPLISSAGE:
          valA = a.tauxRemplissagePercent;
          valB = b.tauxRemplissagePercent;
          break;
        case CostSessionSortBy.DATE:
          valA = new Date(a.startDate).getTime();
          valB = new Date(b.startDate).getTime();
          break;
        default:
          valA = a.coutTotal;
          valB = b.coutTotal;
      }

      return sortOrder === SortOrder.ASC ? valA - valB : valB - valA;
    });
  }

  private resolveBreakEvenStatus(
    totalStudents: number,
    studentsNeeded: number,
    coutTotal: number,
    avgPricePerStudent: number,
  ): 'easy' | 'medium' | 'hard' {
    if (coutTotal <= 0) return 'easy';
    if (avgPricePerStudent <= 0 || studentsNeeded <= 0) return 'hard';
    const ratio = totalStudents / studentsNeeded;
    if (ratio >= 1.2) return 'easy';
    if (ratio >= 1) return 'medium';
    return 'hard';
  }

  private applyMetricFilters(
    filter: CostFilterDto,
    metrics: SessionCostMetrics[],
  ): SessionCostMetrics[] {
    const cohort = [...metrics];
    const sortedCosts = cohort.map((c) => c.coutTotal).sort((x, y) => x - y);
    const p33 = percentile(sortedCosts, 0.33);
    const p66 = percentile(sortedCosts, 0.66);
    
    for (const m of cohort) {
      m.costTier = this.assignCostTier(m.coutTotal, p33, p66);
    }
    
    return cohort.filter((m) => {
      if (filter.rentabilite && m.rentabilite !== filter.rentabilite) return false;
      if (filter.tauxRemplissage && !this.matchTauxBucket(m.tauxRemplissagePercent, filter.tauxRemplissage)) {
        return false;
      }
      if (filter.niveauCout && m.costTier !== filter.niveauCout) return false;
      return true;
    });
  }

  private matchTauxBucket(percent: number, bucket: TauxRemplissageFilter): boolean {
    if (bucket === TauxRemplissageFilter.LOW) return percent < 50;
    if (bucket === TauxRemplissageFilter.MID) return percent >= 50 && percent <= 70;
    return percent > 70;
  }

  private assignCostTier(total: number, p33: number, p66: number): CostLevelFilter {
    if (p66 <= p33) return CostLevelFilter.MOYEN;
    if (total <= p33) return CostLevelFilter.PETIT;
    if (total <= p66) return CostLevelFilter.MOYEN;
    return CostLevelFilter.ELEVE;
  }
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo] ?? 0;
  const w = idx - lo;
  return (sorted[lo] ?? 0) * (1 - w) + (sorted[hi] ?? 0) * w;
}