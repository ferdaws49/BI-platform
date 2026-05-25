// ============================================================================
// finance.directeur.service.ts  (CORRIGÉ — Mai 2026)
//
// Corrections appliquées:
//   ✅ 'depense' remplacé par IN ('depense_formateur', 'depense_logistique')
//   ✅ buildEvolutionCA() migré vers dw.fact_finance + dw.dim_temps
//   ✅ getFormationsProfitability() corrigé pour les nouveaux types
//   ✅ getOverview() corrigé pour les nouveaux types
// ============================================================================
// ============================================================================
// finance.directeur.service.ts  (CORRIGÉ — Mai 2026)
//
// Corrections appliquées:
//   ✅ 'depense' → IN ('depense_formateur', 'depense_logistique') partout
//   ✅ buildEvolutionCA() → migré vers dw.fact_finance + dw.dim_temps
//   ✅ getOverview()               → coûts corrigés
//   ✅ getFormationsProfitability() → coûts corrigés
// ============================================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Finance } from '../finances/entities/finance.entity';
import { Formation } from '../formations/entities/formation.entity';
import {
  FinanceFilterDto,
  FinanceOverviewResponse,
  FormationProfitabilityRow,
  ImpayeItem,
} from './dto/finances.dto';

@Injectable()
export class FinanceDirecteurService {
  constructor(
    @InjectRepository(Finance)
    private financeRepo: Repository<Finance>,

    @InjectRepository(Formation)
    private formationRepo: Repository<Formation>,

    // ✅ AJOUT: DataSource pour les requêtes raw DWH (buildEvolutionCA)
    private readonly dataSource: DataSource,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // HELPER — Plage de dates selon la période
  // ══════════════════════════════════════════════════════════════════════════

  private getDateRange(periode = 'Ce mois'): { start: Date; end: Date } | null {
    const end = new Date();
    const start = new Date();
    switch (periode) {
      case 'Ce mois':
        start.setDate(end.getDate() - 30);
        break;
      case 'Trimestre':
        start.setDate(end.getDate() - 90);
        break;
      case 'Semestre':
        start.setMonth(end.getMonth() - 6);
        break;
      case 'Annee':
        start.setMonth(end.getMonth() - 12);
        break;
      default:
        return null;
    }
    return { start, end };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPER DWH — Convertit une Date en date_key 'YYYY-MM-DD'
  // ══════════════════════════════════════════════════════════════════════════

  private toDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPER — QueryBuilder de base (OLTP)
  // finance → session → formation, avec filtres periode/formation/type/statut
  // ══════════════════════════════════════════════════════════════════════════

  private buildBaseQB(
    filters: FinanceFilterDto,
    range: { start: Date; end: Date } | null,
  ) {
    const qb = this.financeRepo
      .createQueryBuilder('f')
      .leftJoin('f.session', 's')
      .leftJoin('s.formation', 'formation');

    if (range) {
      qb.andWhere('f.date BETWEEN :start AND :end', range);
    }
    if (filters.formation && filters.formation !== 'Tous') {
      qb.andWhere('formation.titre = :titre', { titre: filters.formation });
    }
    if (filters.type && filters.type !== 'Tous') {
      qb.andWhere('s.type = :type', { type: filters.type });
    }
    if (filters.statut && filters.statut !== 'Tous') {
      qb.andWhere('formation.statut = :statut', { statut: filters.statut });
    }
    return qb;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // OVERVIEW
  // ══════════════════════════════════════════════════════════════════════════

  async getOverview(
    filters: FinanceFilterDto,
  ): Promise<FinanceOverviewResponse> {
    const range = this.getDateRange(filters.periode);

    // ── Paiements ──────────────────────────────────────────────────────────
    const paiements = await this.buildBaseQB(filters, range)
      .andWhere('f.type = :t', { t: 'paiement' })
      .getMany();

    // ── Coûts ✅ CORRIGÉ: depense_formateur + depense_logistique ───────────
    const depenses = await this.buildBaseQB(filters, range)
      .andWhere("f.type IN ('depense_formateur', 'depense_logistique')")
      .getMany();

    // ── Impayés ────────────────────────────────────────────────────────────
    const impayesList = await this.buildBaseQB(filters, range)
      .andWhere('f.type = :t', { t: 'impaye' })
      .getMany();

    const revenus = paiements.reduce((s, f) => s + Number(f.montant), 0);
    const couts = depenses.reduce((s, f) => s + Number(f.montant), 0);
    const profit = revenus - couts;
    const marge = revenus > 0 ? (profit / revenus) * 100 : 0;
    const impayesMontant = impayesList.reduce(
      (s, f) => s + Number(f.montant),
      0,
    );

    const profitRows = await this.getFormationsProfitability(filters);
    const top = profitRows[0] ?? { titre: 'N/A', profit: 0 };

    // ✅ buildEvolutionCA migré DWH
    const evolutionCA = await this.buildEvolutionCA(filters);

    return {
      revenus,
      couts,
      profit,
      marge: parseFloat(marge.toFixed(1)),
      topFormation: { nom: top.titre, profit: top.profit },
      impayes: { count: impayesList.length, montantTotal: impayesMontant },
      evolutionCA,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENTABILITÉ PAR FORMATION
  // ══════════════════════════════════════════════════════════════════════════

  async getFormationsProfitability(
    filters: FinanceFilterDto,
  ): Promise<FormationProfitabilityRow[]> {
    const range = this.getDateRange(filters.periode);

    const qb = this.financeRepo
      .createQueryBuilder('f')
      .leftJoin('f.session', 's')
      .leftJoin('s.formation', 'formation')
      .select('formation.id', 'formationId')
      .addSelect('formation.titre', 'titre')
      .addSelect('formation.statut', 'statut')
      .addSelect('s.type', 'type')
      // ── Revenus ───────────────────────────────────────────────────────────
      .addSelect(
        `SUM(CASE WHEN f.type = 'paiement' THEN f.montant ELSE 0 END)`,
        'revenus',
      )
      // ── Coûts ✅ CORRIGÉ: depense_formateur + depense_logistique ─────────
      .addSelect(
        `SUM(CASE WHEN f.type IN ('depense_formateur', 'depense_logistique') THEN f.montant ELSE 0 END)`,
        'couts',
      )
      .where('formation.id IS NOT NULL')
      .groupBy('formation.id')
      .addGroupBy('formation.titre')
      .addGroupBy('formation.statut')
      .addGroupBy('s.type');

    if (range) {
      qb.andWhere('f.date BETWEEN :start AND :end', range);
    }
    if (filters.formation && filters.formation !== 'Tous') {
      qb.andWhere('formation.titre = :titre', { titre: filters.formation });
    }
    if (filters.type && filters.type !== 'Tous') {
      qb.andWhere('s.type = :type', { type: filters.type });
    }
    if (filters.statut && filters.statut !== 'Tous') {
      qb.andWhere('formation.statut = :statut', { statut: filters.statut });
    }

    const rows = await qb.getRawMany();

    return rows
      .map((r) => {
        const revenus = Number(r.revenus) || 0;
        const couts = Number(r.couts) || 0;
        const profit = revenus - couts;
        const marge = revenus > 0 ? (profit / revenus) * 100 : 0;
        return {
          formationId: r.formationId,
          titre: r.titre ?? 'N/A',
          type: r.type ?? 'N/A',
          statut: r.statut ?? 'N/A',
          revenus,
          couts,
          profit,
          marge: parseFloat(marge.toFixed(1)),
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // IMPAYÉS  (OLTP — inchangé)
  // ══════════════════════════════════════════════════════════════════════════

  async getImpayes(): Promise<ImpayeItem[]> {
    const impayes = await this.financeRepo
      .createQueryBuilder('f')
      .leftJoin('f.session', 's')
      .leftJoin('s.formation', 'formation')
      .addSelect('formation.titre', 'formationTitre')
      .where('f.type = :type', { type: 'impaye' })
      .orderBy('f.date', 'ASC')
      .getMany();

    const today = new Date();
    return impayes.map((f) => ({
      id: f.id,
      formation: f.session?.formation?.titre ?? 'N/A',
      montant: Number(f.montant),
      date: f.date,
      joursRetard: Math.max(
        0,
        Math.floor((today.getTime() - new Date(f.date).getTime()) / 86_400_000),
      ),
    }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ÉVOLUTION CA  ✅ MIGRÉ DWH
  //
  // Avant: 6 appels OLTP en boucle (N+1 queries problème de performance)
  // Après: 1 seule requête sur dw.fact_finance JOIN dw.dim_temps
  //        groupée par (annee, mois, nom_mois) → 6 derniers mois
  // ══════════════════════════════════════════════════════════════════════════

  private async buildEvolutionCA(
    filters: FinanceFilterDto,
  ): Promise<{ labels: string[]; data: number[] }> {
    const periode = filters.periode ?? 'Ce mois';

    // ── Plage globale selon la période ────────────────────────────────────
    const now = new Date();
    let start = new Date();

    switch (periode) {
      case 'Annee':
        start = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
        break;
      case 'Semestre':
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case 'Trimestre':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'Ce mois':
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
    }

    const startKey = this.toDateKey(start);
    const endKey = this.toDateKey(now);

    // ── Construction dynamique des conditions ─────────────────────────────
    const params: any[] = [startKey, endKey];
    const conditions: string[] = [
      `dtf.type = 'paiement'`,
      `dt.date_key BETWEEN $1 AND $2`,
    ];
    const joins: string[] = [];

    if (filters.formation && filters.formation !== 'Tous') {
      joins.push(
        `JOIN dw.dim_formation dfo ON ff.sk_formation = dfo.sk_formation`,
      );
      params.push(filters.formation);
      conditions.push(`dfo.titre = $${params.length}`);
    }

    // filtre type session → dim_session.type_session
    if (filters.type && filters.type !== 'Tous') {
      joins.push(`JOIN dw.dim_session ds ON ff.sk_session = ds.sk_session`);
      params.push(filters.type);
      conditions.push(`ds.type_session = $${params.length}`);
    }

    // filtre statut formation → dim_formation (JOIN si pas déjà fait)
    if (filters.statut && filters.statut !== 'Tous') {
      if (!filters.formation || filters.formation === 'Tous') {
        joins.push(
          `JOIN dw.dim_formation dfo ON ff.sk_formation = dfo.sk_formation`,
        );
      }
      params.push(filters.statut);
      conditions.push(`dfo.statut = $${params.length}`);
    }

    const joinClause = joins.join('\n       ');
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // ── 1 seule requête DWH ───────────────────────────────────────────────
    const rows: any[] = await this.dataSource.query(
      `SELECT
         dt.nom_mois                  AS label,
         dt.mois                      AS mois,
         dt.annee                     AS annee,
         COALESCE(SUM(ff.montant), 0) AS total
       FROM dw.fact_finance ff
       JOIN dw.dim_type_finance dtf ON ff.sk_type_finance = dtf.sk_type_finance
       JOIN dw.dim_temps        dt  ON ff.sk_temps        = dt.sk_temps
       ${joinClause}
       ${whereClause}
       GROUP BY dt.nom_mois, dt.mois, dt.annee
       ORDER BY dt.annee ASC, dt.mois ASC
       LIMIT 6`,
      params,
    );

    if (!rows.length) {
      return { labels: [], data: [] };
    }

    return {
      labels: rows.map((r) => r.label),
      data: rows.map((r) => parseFloat(r.total)),
    };
  }
}
