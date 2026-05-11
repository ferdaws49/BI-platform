import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

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

  // ✅ finance → session → formation
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
    // ✅ type = session.type ('présentiel' | 'en_ligne')
    if (filters.type && filters.type !== 'Tous') {
      qb.andWhere('s.type = :type', { type: filters.type });
    }
    // ✅ statut = formation.statut ('active' | 'completed')
    if (filters.statut && filters.statut !== 'Tous') {
      qb.andWhere('formation.statut = :statut', { statut: filters.statut });
    }
    return qb;
  }

  async getOverview(
    filters: FinanceFilterDto,
  ): Promise<FinanceOverviewResponse> {
    const range = this.getDateRange(filters.periode);

    const [paiements, depenses, impayesList] = await Promise.all([
      this.buildBaseQB(filters, range)
        .andWhere('f.type = :t', { t: 'paiement' })
        .getMany(),
      this.buildBaseQB(filters, range)
        .andWhere('f.type = :t', { t: 'depense' })
        .getMany(),
      this.buildBaseQB(filters, range)
        .andWhere('f.type = :t', { t: 'impaye' })
        .getMany(),
    ]);

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

  async getFormationsProfitability(
    filters: FinanceFilterDto,
  ): Promise<FormationProfitabilityRow[]> {
    const range = this.getDateRange(filters.periode);

    // ✅ query avec GROUP BY — finance → session → formation
    const qb = this.financeRepo
      .createQueryBuilder('f')
      .leftJoin('f.session', 's')
      .leftJoin('s.formation', 'formation')
      .select('formation.id', 'formationId')
      .addSelect('formation.titre', 'titre')
      .addSelect('formation.statut', 'statut')
      .addSelect('s.type', 'type') // ✅ session.type
      .addSelect(
        `SUM(CASE WHEN f.type = 'paiement' THEN f.montant ELSE 0 END)`,
        'revenus',
      )
      .addSelect(
        `SUM(CASE WHEN f.type = 'depense' THEN f.montant ELSE 0 END)`,
        'couts',
      )
      .where('formation.id IS NOT NULL')
      .groupBy('formation.id')
      .addGroupBy('formation.titre')
      .addGroupBy('formation.statut')
      .addGroupBy('s.type'); // ✅

    if (range) {
      qb.andWhere('f.date BETWEEN :start AND :end', range);
    }
    if (filters.formation && filters.formation !== 'Tous') {
      qb.andWhere('formation.titre = :titre', { titre: filters.formation });
    }
    if (filters.type && filters.type !== 'Tous') {
      qb.andWhere('s.type = :type', { type: filters.type }); // ✅
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
          type: r.type ?? 'N/A', // ✅ 'présentiel' | 'en_ligne'
          statut: r.statut ?? 'N/A', // ✅ 'active' | 'completed'
          revenus,
          couts,
          profit,
          marge: parseFloat(marge.toFixed(1)),
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }

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
      // ✅ formation via session
      formation: f.session?.formation?.titre ?? 'N/A',
      montant: Number(f.montant),
      date: f.date,
      joursRetard: Math.max(
        0,
        Math.floor((today.getTime() - new Date(f.date).getTime()) / 86400000),
      ),
    }));
  }

  private async buildEvolutionCA(
    filters: FinanceFilterDto,
  ): Promise<{ labels: string[]; data: number[] }> {
    const periode = filters.periode ?? 'Ce mois';
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const end = new Date();
      const start = new Date();

      if (periode === 'Annee') {
        end.setMonth(end.getMonth() - i);
        end.setDate(0);
        start.setMonth(start.getMonth() - i - 1);
        start.setDate(1);
        labels.push(start.toLocaleString('fr-FR', { month: 'short' }));
      } else {
        const totalDays =
          periode === 'Trimestre' ? 90 : periode === 'Semestre' ? 180 : 30;
        const bucket = Math.floor(totalDays / 6);
        end.setDate(end.getDate() - i * bucket);
        start.setDate(start.getDate() - (i + 1) * bucket);
        labels.push(`S${6 - i}`);
      }

      // ✅ finance → session → formation
      const qb = this.financeRepo
        .createQueryBuilder('f')
        .leftJoin('f.session', 's')
        .leftJoin('s.formation', 'formation')
        .where('f.type = :type', { type: 'paiement' })
        .andWhere('f.date BETWEEN :start AND :end', { start, end });

      if (filters.formation && filters.formation !== 'Tous') {
        qb.andWhere('formation.titre = :titre', { titre: filters.formation });
      }
      if (filters.type && filters.type !== 'Tous') {
        qb.andWhere('s.type = :type', { type: filters.type }); // ✅
      }
      if (filters.statut && filters.statut !== 'Tous') {
        qb.andWhere('formation.statut = :statut', { statut: filters.statut });
      }

      const paiements = await qb.getMany();
      data.push(paiements.reduce((s, f) => s + Number(f.montant), 0));
    }

    return { labels, data };
  }
}