import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
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
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { Finance, FinanceType } from '../entities/finance.entity';
import { Formateur } from 'src/formateurs/entities/formateur.entity';
import { Session } from 'src/sessions/entities/session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { resolveDashboardPeriod } from 'src/utils/period.utils';

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
     @InjectRepository(Finance)
    private readonly financeRepo: Repository<Finance>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Formateur)
    private readonly formateurRepo: Repository<Formateur>,
  ) {}

  // 1. CORRECTION DES KPIS (Calculer AVANT le filtre)
private async loadSessionMetrics(filter: CostFilterDto): Promise<SessionCostMetrics[]> {
  const { rangeStart, rangeEnd } = resolveCostPeriod(filter);
  const sd = rangeStart.toISOString().split('T')[0];
  const ed = rangeEnd.toISOString().split('T')[0];
  
  const params: any[] = [sd, ed];
  let dynamicFilters = '';

  // --- CORRECTION : Préparation des filtres ---
  if (filter.formationId) {
    params.push(filter.formationId);
    dynamicFilters += ` AND df.formation_id = $${params.length}`;
  }

  if (filter.formateurId) {
    params.push(filter.formateurId);
    dynamicFilters += ` AND dform.formateur_id = $${params.length}`;
  }

  // --- CORRECTION : Requête avec jointures propres (plus de sous-requêtes lentes) ---
  const sql = `
    SELECT
      ds.session_id as "sessionId",
      COALESCE(ds.titre, ds.type_session, 'Session sans nom') as "sessionTitle",
      ds.date as "startDate",
      ds.capacite as "capaciteMax",
      df.titre as "formationTitle",
      dform.nom as "instructor",
      dform.formateur_id as "formateurId",
      
      -- Calcul des coûts par session
      SUM(CASE WHEN tf.type = 'depense_formateur' THEN ABS(f.montant) ELSE 0 END) as "coutFormateur",
      SUM(CASE WHEN tf.type = 'depense_logistique' THEN ABS(f.montant) ELSE 0 END) as "coutLogistique",
      
      -- Calcul du CA par session
      SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) as "ca",
      
      -- Nombre d'inscrits uniques
      COUNT(DISTINCT CASE WHEN f.sk_apprenant != -1 THEN f.sk_apprenant END) as "inscrits"

    FROM dw.dim_session ds
    LEFT JOIN dw.fact_finance f ON ds.sk_session = f.sk_session
    LEFT JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
    LEFT JOIN dw.dim_formation df ON f.sk_formation = df.sk_formation
    LEFT JOIN dw.dim_formateur dform ON f.sk_formateur = dform.sk_formateur
    WHERE ds.date BETWEEN $1 AND $2 
      AND ds.session_id != '00000000-0000-0000-0000-000000000000'
      ${dynamicFilters} -- Injection des filtres ici !
    GROUP BY ds.session_id, ds.sk_session, ds.titre, ds.type_session, ds.date, ds.capacite, df.titre, dform.nom, dform.formateur_id
    HAVING COUNT(f.id_fact_finance) > 0 -- On ne prend que les sessions ayant une activité
  `;

  const raws = await this.dataSource.query(sql, params);

  return raws.map(row => {
    const coutTotal = parseFloat(row.coutFormateur) + parseFloat(row.coutLogistique);
    const ca = parseFloat(row.ca);
    const inscrits = parseInt(row.inscrits);
    const capacite = Math.max(1, parseInt(row.capaciteMax));

    return {
      sessionId: row.sessionId,
      sessionTitle: row.sessionTitle,
      formationTitle: row.formationTitle || 'N/A',
      startDate: row.startDate,
      instructor: row.instructor || 'N/A',
      formateurId: parseInt(row.formateurId) || 0,
      coutFormateur: parseFloat(row.coutFormateur),
      coutLogistique: parseFloat(row.coutLogistique),
      coutTotal: coutTotal,
      capaciteMax: capacite,
      inscrits: inscrits,
      ca: ca,
      marge: ca - coutTotal,
      tauxRemplissagePercent: (inscrits / capacite) * 100,
      coutParEtudiant: inscrits > 0 ? coutTotal / inscrits : 0,
      rentabilite: this.resolveRentabilite(ca - coutTotal),
      costTier: CostLevelFilter.MOYEN,
    };
  });
}

// 2. CORRECTION DES KPIS (Calcul basé uniquement sur les sessions valides)
async getKpi(filter: CostFilterDto): Promise<CostKpiDto> {
  const metrics = await this.loadSessionMetrics(filter);

  // Coûts liés aux sessions (formateur + logistique variable)
  const totalCoutSessions = metrics.reduce((sum, m) => sum + m.coutTotal, 0);
  const totalCoutFormateur = metrics.reduce((sum, m) => sum + m.coutFormateur, 0);
  const totalInscrits = metrics.reduce((sum, m) => sum + m.inscrits, 0);
  const totalCa = metrics.reduce((sum, m) => sum + m.ca, 0);

  // ← AJOUTER : charges fixes sans session (loyer, admin...)
  const { currentStart, currentEnd } = resolveDashboardPeriod(filter);

const chargesFixes = await this.sumFinanceInRange(
   currentStart.toISOString().split('T')[0],
  currentEnd.toISOString().split('T')[0],
  'depense_logistique'
);
  // chargesFixes inclut logistique variable + charges fixes
  // On soustrait la logistique variable déjà dans metrics
  const logistiqueVariable = metrics.reduce((sum, m) => sum + (m.coutTotal - m.coutFormateur), 0);
  const chargesFixesSeulement = chargesFixes - logistiqueVariable;

  // Coût total réel = sessions + charges fixes
  const totalCout = totalCoutSessions + chargesFixesSeulement;

  const avgPricePerStudent = totalInscrits > 0 ? totalCa / totalInscrits : 0;
    const coutVariableTotal = totalCoutFormateur + logistiqueVariable;
  const coutVariableParEtudiant = totalInscrits > 0 
    ? coutVariableTotal / totalInscrits 
    : 0;

  // Contribution marginale = ce que rapporte 1 étudiant après coûts variables
  const contributionMarginale = avgPricePerStudent - coutVariableParEtudiant;

  // Break-even = charges fixes / contribution marginale par étudiant
  const studentsNeeded = contributionMarginale > 0
    ? Math.ceil(chargesFixesSeulement / contributionMarginale)
    : 0;

  return {
    coutTotal: Number(totalCout.toFixed(2)),
    coutFormateurs: Number(totalCoutFormateur.toFixed(2)),
    coutMoyenParSession: metrics.length > 0 
      ? Number((totalCout / metrics.length).toFixed(2)) 
      : 0,
    breakEven: {
      studentsNeeded,
      avgPricePerStudent: Number(avgPricePerStudent.toFixed(2)),
      status: this.resolveBreakEvenStatus(
        totalInscrits, studentsNeeded, totalCout, avgPricePerStudent
      ),
      totalStudents: totalInscrits,
      totalCost: Number(totalCout.toFixed(2)),
    }
  };
}

private async sumFinanceInRange(start: string, end: string, type: string, formationId?: number): Promise<number> {
    const params: any[] = [start, end, type];
    let formationFilter = '';

    if (formationId) {
      params.push(formationId);
      formationFilter = `AND fo.formation_id = $${params.length}`;
    }

    const res = await this.dataSource.query(`
      SELECT COALESCE(SUM(ABS(f.montant)), 0) as total
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      LEFT JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
      WHERE t.date_key BETWEEN $1 AND $2
        AND tf.type = $3
        ${formationFilter}
    `, params);

    return parseFloat(res[0]?.total) || 0;
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
  // ON NE FILTRE PAS ICI pour avoir le vrai coût total du formateur
  
  const map = new Map<number, { nom: string; cout: number; sessions: Set<string> }>();

  for (const r of allMetrics) {
    const fid = r.formateurId;
    if (!fid || fid === 0) continue;

    const cur = map.get(fid) ?? { nom: r.instructor, cout: 0, sessions: new Set() };
    cur.cout += r.coutTotal;
    cur.sessions.add(String(r.sessionId));
    map.set(fid, cur);
  }

  return Array.from(map.entries())
    .map(([formateurId, v]) => ({
      formateurId,
      nomFormateur: v.nom,
      coutTotal: Number(v.cout.toFixed(2)),
      nombreSessions: v.sessions.size,
      coutMoyenParSession: v.sessions.size > 0 ? Number((v.cout / v.sessions.size).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.coutTotal - a.coutTotal)
    .slice(0, filter.topLimit ?? 10);
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
  // 1. On récupère les sessions filtrées
  const rows = this.applyMetricFilters(filter, await this.loadSessionMetrics(filter));
  
  // 2. On re-sécurise le calcul ligne par ligne pour le Front-End
  return rows.map((r) => {
    const nbInscrits = r.inscrits || 0;
    const coutTotal = r.coutTotal || 0;
    
    // Recalcul strict du coût par étudiant
    const coutParEtudiantExact = nbInscrits > 0 ? (coutTotal / nbInscrits) : 0;

    return {
      sessionId: String(r.sessionId),
      formation: r.formationTitle,
      coutTotal: Number(coutTotal.toFixed(2)),
      // On s'assure d'envoyer la bonne valeur brute arrondie au Front-End
      coutParEtudiant: Number(coutParEtudiantExact.toFixed(2)),
      nombreInscrits: nbInscrits,
    };
  });
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
      sessionId: r.sessionId, 
      formation: r.formationTitle,
      session: r.sessionTitle,
      date: r.startDate,     
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

  async createExpense(dto: CreateExpenseDto): Promise<Finance> {
    // 1️⃣ Vérifier que la session existe (avec sa formation et son formateur assigné)
    const session = await this.sessionRepo.findOne({
      where: { id: dto.sessionId },
      relations: ['formation', 'formateur'],
    });

    if (!session) {
      throw new NotFoundException(`Session "${dto.sessionId}" non trouvée.`);
    }

    // 2️⃣ Préparer l'entité Finance
    const finance = this.financeRepo.create({
      montant: dto.montant,
      type: dto.type,
      sessionId: dto.sessionId,
      session,
    });

    // 3️⃣ Logique selon le type
    if (dto.type === FinanceType.DEPENSE_FORMATEUR) {
      // --- Recherche du formateur ---
      let formateur: Formateur | null = null;

      if (dto.formateurId) {
        formateur = await this.formateurRepo.findOne({
          where: { id: dto.formateurId },
        });
      } else if (dto.formateurNom) {
        // Recherche insensible à la casse (exemple simple)
        formateur = await this.formateurRepo
  .createQueryBuilder('f')
  .where(
    "LOWER(CONCAT(f.prenom, ' ', f.nom)) = LOWER(:fullName)",
    { fullName: dto.formateurNom.trim() }
  )
  .orWhere(
    "LOWER(CONCAT(f.nom, ' ', f.prenom)) = LOWER(:fullName)",
    { fullName: dto.formateurNom.trim() }
  )
  .getOne();
      }

      if (!formateur) {
        throw new NotFoundException(
          `Formateur "${dto.formateurNom || dto.formateurId}" non trouvé.`,
        );
      }

      // --- Vérification métier : ce formateur enseigne-t-il cette formation ? ---
      // Méthode A : le formateur est celui officiellement assigné à la session
      if (session.formateurId !== formateur.id) {
        throw new BadRequestException(
          `Le formateur ${formateur.nom} n'est pas assigné à cette session / formation.`,
        );
      }

      // (Optionnel) Méthode B : si tu as une relation ManyToMany Formation <-> Formateur
      // const formation = await this.formationRepo.findOne({
      //   where: { id: session.formationId },
      //   relations: ['formateurs'],
      // });
      // const enseigne = formation.formateurs.some(f => f.id === formateur.id);
      // if (!enseigne) throw new BadRequestException('...');

      finance.formateur = formateur;
      finance.formateurId = formateur.id;
      finance.description = `Rémunération formateur : ${formateur.nom}`;
    }

    else if (dto.type === FinanceType.DEPENSE_LOGISTIQUE) {
      if (!dto.description || dto.description.trim().length === 0) {
        throw new BadRequestException(
          'La description est obligatoire pour un coût logistique.',
        );
      }
      finance.description = dto.description.trim();
    }

    // 4️⃣ Sauvegarde
    return this.financeRepo.save(finance);
  }


  async exportCostCsv(filter: CostFilterDto): Promise<string> {
  const metrics = await this.loadSessionMetrics(filter);
  const rows = this.applyMetricFilters(filter, metrics);

  // ← AJOUT : même calcul de charges fixes que dans getKpi()
  const { currentStart, currentEnd } = resolveDashboardPeriod(filter);
  const chargesFixes = await this.sumFinanceInRange(
    currentStart.toISOString().split('T')[0],
    currentEnd.toISOString().split('T')[0],
    'depense_logistique'
  );
  const logistiqueVariable = rows.reduce((sum, m) => sum + (m.coutTotal - m.coutFormateur), 0);
  const chargesFixesSeulement = Math.max(0, chargesFixes - logistiqueVariable);

  return this.generateCostCsv(rows, chargesFixesSeulement);
}

private generateCostCsv(rows: SessionCostMetrics[], chargesFixes: number): string {
  const SEP = ';';
  const lines: string[] = [];

  lines.push('\ufeff');

  lines.push(`RAPPORT COÛTS & RENTABILITÉ${SEP}`);
  lines.push(`Généré le${SEP}${new Date().toLocaleDateString('fr-FR')}`);
  lines.push('');

  const totalCoutSessions = rows.reduce((s, r) => s + r.coutTotal, 0);
  const totalCout = totalCoutSessions + chargesFixes;
  const totalCA   = rows.reduce((s, r) => s + r.ca, 0);
  const totalMarge = rows.reduce((s, r) => s + r.marge, 0);

  

  
  lines.push([
    'Session', 'Formation', 'Formateur', 'Date', 'Inscrits', 'Capacité',
    'Coût Formateur (DT)', 'Coût Logistique (DT)', 'Coût Total (DT)',
    'CA (DT)', 'Marge (DT)', 'Remplissage (%)', 'Statut',
  ].join(SEP));

  for (const r of rows) {
    lines.push([
      this.escapeCsv(r.sessionTitle),
      this.escapeCsv(r.formationTitle),
      this.escapeCsv(r.instructor),
      r.startDate ? new Date(r.startDate).toLocaleDateString('fr-FR') : '',
      r.inscrits,
      r.capaciteMax,
      this.formatCsvNumber(r.coutFormateur),
      this.formatCsvNumber(r.coutLogistique),
      this.formatCsvNumber(r.coutTotal),
      this.formatCsvNumber(r.ca),
      this.formatCsvNumber(r.marge),
      this.formatCsvNumber(r.tauxRemplissagePercent),
      r.rentabilite,
    ].join(SEP));
  }

  lines.push('');
  lines.push(`Document confidentiel${SEP}${rows.length} session(s)`);

  return lines.join('\n');
}

  private formatCsvNumber(value: number): string {
    return Number(value).toFixed(2).replace('.', ',');
  }

  private escapeCsv(value: string): string {
    if (value == null) return '""';
    const str = String(value);
    const needsQuotes = str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r');
    const escaped = str.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
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


