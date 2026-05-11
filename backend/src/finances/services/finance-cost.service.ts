import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from 'src/sessions/entities/session.entity';
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
import { FinanceType } from '../entities/finance.entity';

type Rentabilite = 'rentable' | 'seuil' | 'deficitaire';

interface SessionCostMetrics {
  sessionId: number;
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
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async getKpi(filter: CostFilterDto): Promise<CostKpiDto> {
    const metrics = await this.loadSessionMetrics(filter);
    
    // Application des filtres de metrics (Rentabilité, Taux remplissage etc)
    const rows = this.applyMetricFilters(filter, metrics);
    

    // Initialisation des compteurs
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
    
    // Calcul du seuil de rentabilité (Break-even)
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
  // 1. Récupération et formatage des dates
  const { rangeStart, rangeEnd } = resolveCostPeriod(filter);
  const sd = rangeStart.toISOString().split('T')[0];
  const ed = rangeEnd.toISOString().split('T')[0];

  const qb = this.sessionRepository
    .createQueryBuilder('s')
    .leftJoin('s.formation', 'fo')
    .leftJoin('s.formateur', 'fm')
    .select([
      's.id AS "sessionId"',
      's.title AS "sessionTitle"',
      's.date AS "startDate"',
      'COALESCE(fo.titre, s.title) AS "formationTitle"',
      'COALESCE(fm.nom || \' \' || fm.prenom, \'Sans formateur\') AS "instructor"',
      'fm.id AS "formateurId"',
      'COALESCE(s.cout_formateur, 0) AS "coutFormateur"',
      'COALESCE(s.cout_logistique, 0) AS "coutLogistique"',
      's.capacite AS "capaciteMax"',
    ]);

  // Sous-requête pour les inscrits
  qb.addSelect(sub => {
    return sub
      .select('COUNT(*)', 'count')
      .from('sessions_apprenants', 'sa')
      .where('sa.sessionId = s.id');
  }, 'inscrits');

  // Sous-requête pour le CA
  qb.addSelect(sub => {
    return sub
      .select('SUM(f.montant)', 'sum')
      .from('finances', 'f')
      .where('f.sessionId = s.id')
      .andWhere('f.type = :type', { type: FinanceType.PAIEMENT })
      .andWhere('CAST(f.date AS DATE) BETWEEN :rs AND :re');
  }, 'ca');

  // Paramètres et Filtres
  qb.setParameters({ rs: sd, re: ed, type: FinanceType.PAIEMENT })
    .where('CAST(s.date AS DATE) BETWEEN :sd AND :ed', { sd, ed });

  if (filter.formationId) {
    qb.andWhere('s.formationId = :formationId', { formationId: filter.formationId });
  }
  if (filter.formateurId) {
    qb.andWhere('fm.id = :formateurId', { formateurId: filter.formateurId });
  }

  const raws = await qb.getRawMany();

  // 2. Mapping complet vers SessionCostMetrics
  return raws.map(row => {
    // Gestion de la casse PostgreSQL (fallback minuscule)
    const cFormateur = parseFloat(row.coutFormateur || row.coutformateur || 0);
    const cLogistique = parseFloat(row.coutLogistique || row.coutlogistique || 0);
    const caTotal = parseFloat(row.ca || row.sum || 0);
    const nbInscrits = parseInt(row.inscrits || row.count || 0);
    const capacite = parseInt(row.capaciteMax || row.capacitemax || 1);
    
    const coutTotal = cFormateur + cLogistique;
    const marge = caTotal - coutTotal;

    return {
      sessionId: row.sessionId, // UUID String
      sessionTitle: row.sessionTitle || row.sessiontitle || '—',
      formationTitle: row.formationTitle || row.formationtitle || '—',
      startDate: row.startDate || row.startdate,
      instructor: row.instructor || row.instructor || 'Sans formateur',
      formateurId: parseInt(row.formateurId || row.formateurid) || 0,
      coutFormateur: cFormateur,
      coutLogistique: cLogistique,
      coutTotal: coutTotal,
      capaciteMax: capacite,
      inscrits: nbInscrits,
      ca: caTotal,
      marge: marge,
      // Calculs dynamiques
      tauxRemplissagePercent: (nbInscrits / Math.max(1, capacite)) * 100,
      coutParEtudiant: nbInscrits > 0 ? coutTotal / nbInscrits : 0,
      rentabilite: this.resolveRentabilite(marge),
      costTier: this.resolveCostTier(coutTotal),
    };
  });
}

private resolveRentabilite(marge: number): RentabilityFilter {
  if (marge > 0) {
    return RentabilityFilter.RENTABLE;
  } else if (marge === 0) {
    return RentabilityFilter.SEUIL; // Équilibre (Seuil de rentabilité)
  } else {
    return RentabilityFilter.DEFICITAIRE;
  }
}

private resolveCostTier(coutTotal: number): CostLevelFilter {
  if (coutTotal <= 500) {
    return CostLevelFilter.PETIT;
  } else if (coutTotal <= 2000) {
    return CostLevelFilter.MOYEN;
  } else {
    return CostLevelFilter.ELEVE;
  }
}




  async getTopFormateurs(filter: CostFilterDto): Promise<TopFormateurCostDto[]> {
    // 1. Récupération des metrics (utilise la fonction corrigée précédemment)
    const allMetrics = await this.loadSessionMetrics(filter);
    const rows = this.applyMetricFilters(filter, allMetrics);

    const limit = filter.topLimit ?? 10;
    
    // 2. Map pour l'agrégation
    // On utilise string pour les sessions car ce sont des UUIDs
    const map = new Map<number, { nom: string; cout: number; sessions: Set<string> }>();

    for (const r of rows) {
      const fid = r.formateurId;
      
      // On ignore si pas de formateur (fid 0 ou null)
      if (!fid || fid === 0) continue; 

      const cur = map.get(fid) ?? { 
        nom: r.instructor?.trim() || 'Formateur Inconnu', 
        cout: 0, 
        sessions: new Set<string>() 
      };

      // Accumulation
      cur.cout += r.coutTotal;
      cur.sessions.add(String(r.sessionId)); // On s'assure que c'est une string (UUID)
      
      map.set(fid, cur);
    }

    // 3. Conversion de la Map en tableau de DTO
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

    // 4. Tri par coût total décroissant (Le plus cher en premier)
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
    // On vérifie plusieurs noms possibles (Postgres peut renvoyer du minuscule)
    const valFormateur = r.coutFormateur ?? r['coutformateur'] ?? 0;
    const valLogistique = r.coutLogistique ?? r['coutlogistique'] ?? 0;

    cf += parseFloat(valFormateur as any) || 0;
    cl += parseFloat(valLogistique as any) || 0;
  }

  const total = cf + cl;

  console.log("Somme Formateurs calculée :", cf);
  console.log("Somme Logistique calculée :", cl);

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
  // 1. Récupération de la période et des données
  const { rangeStart, rangeEnd } = resolveCostPeriod(filter);
  const metrics = await this.loadSessionMetrics(filter);
  const rows = this.applyMetricFilters(filter, metrics);

  // 2. Génération de la liste complète des mois (pour ne pas avoir de mois manquants)
  const months = this.enumerateMonths(
    rangeStart.toISOString().split('T')[0],
    rangeEnd.toISOString().split('T')[0]
  );

  // 3. Agrégation des coûts par mois
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    if (!r.startDate) continue;
    
    // On crée un objet Date à partir de r.startDate (marche pour String et Date)
    const d = new Date(r.startDate as any);
    // On vérifie que la date est valide
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const mois = `${yyyy}-${mm}`;
      
      byMonth.set(mois, (byMonth.get(mois) ?? 0) + r.coutTotal);
    }
  }

  // 4. Construction des points pour le graphique
  const points = months.map((m) => ({
    mois: m,
    coutTotal: Number((byMonth.get(m) ?? 0).toFixed(2)), // Fixe à 2 décimales
  }));

  return { points };
}

private enumerateMonths(start: string, end: string): string[] {
  const months: string[] = [];
  const curr = new Date(start);
  curr.setDate(1); // On force au 1er du mois pour éviter les bugs de calcul

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

    // Mapping final vers le DTO (avec arrondis de sécurité)
    const items: SessionCostTableRowDto[] = slice.map((r) => ({
      formation: r.formationTitle,
      session: r.sessionTitle,
      formateur: r.instructor || '—',
      coutDirectFormateur: Number(r.coutFormateur.toFixed(2)),
      fraisLogistique: Number(r.coutLogistique.toFixed(2)),
      coutTotal: Number(r.coutTotal.toFixed(2)),
      marge: Number(r.marge.toFixed(2)),
      tauxRemplissagePercent: Number(r.tauxRemplissagePercent.toFixed(2)),
      statutRentabilite:  r.rentabilite as 'rentable' | 'seuil' | 'deficitaire',
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
  return rows.sort((a, b) => {
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
        // Pour trier par rentabilité, on peut utiliser la marge
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
