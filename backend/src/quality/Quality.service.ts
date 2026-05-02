import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Performance } from '../performances/entities/performance.entity';
import { Formation } from '../formations/entities/formation.entity';
import { Apprenant } from '../apprenants/entities/apprenant.entity';
import {
  QualityFilterDto,
  QualityOverviewResponse,
  QualityRowResponse,
  FormateurPerformanceResponse,
} from './dto/Quality.dto';

@Injectable()
export class QualityService {
  constructor(
    @InjectRepository(Performance)
    private performanceRepo: Repository<Performance>,

    @InjectRepository(Formation)
    private formationRepo: Repository<Formation>,

    @InjectRepository(Apprenant)
    private apprenantRepo: Repository<Apprenant>,
  ) {}

  // ─── Helper: date range ────────────────────────────────────────────────
  private getDateRange(periode = '30j'): { start: Date; end: Date } | null {
    const end = new Date();
    const start = new Date();
    switch (periode) {
      case '7j':  start.setDate(end.getDate() - 7);    break;
      case '30j': start.setDate(end.getDate() - 30);   break;
      case '90j': start.setDate(end.getDate() - 90);   break;
      case '12m': start.setMonth(end.getMonth() - 12); break;
      default:    return null;
    }
    return { start, end };
  }

  // ─── GET /directeur/quality/overview ──────────────────────────────────
  async getOverview(filters: QualityFilterDto): Promise<QualityOverviewResponse> {
    const range = this.getDateRange(filters.periode);

    const qb = this.performanceRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.formation', 'formation')
      .leftJoinAndSelect('p.apprenant', 'apprenant');

    if (range) {
      qb.andWhere('p.date BETWEEN :start AND :end', range);
    }
    if (filters.formation && filters.formation !== 'Tous') {
      qb.andWhere('formation.titre = :titre', { titre: filters.formation });
    }

    const performances = await qb.getMany();

    if (performances.length === 0) {
      return {
        avgSatisfaction: 0,
        avgReussite: 0,
        avgAbandon: 0,
        scoreQualite: 0,
        evolutionReussite: { labels: [], data: [] },
      };
    }

    // Satisfaction = avg note converted to 0-100 scale (note is 0-20)
    const avgSatisfaction =
      (performances.reduce((s, p) => s + Number(p.note), 0) /
        performances.length) *
      5; // 0-20 → 0-100

    // Réussite = % with estReussi = true
    const reussis = performances.filter((p) => p.estReussi).length;
    const avgReussite = (reussis / performances.length) * 100;

    // Abandon: apprenants inscrits (all or scoped to one formation) sans performance
    const inscritsQb = this.apprenantRepo
      .createQueryBuilder('a')
      .innerJoin('a.formations', 'f');
    if (filters.formation && filters.formation !== 'Tous') {
      inscritsQb.andWhere('f.titre = :titre', { titre: filters.formation });
    }
    const totalApprenants = await inscritsQb.getCount();
    const apprenantIdsEvalues = new Set(
      performances.map((p) => (p.apprenant as any)?.id),
    );
    const abandon =
      totalApprenants > 0
        ? Math.max(
            0,
            ((totalApprenants - apprenantIdsEvalues.size) / totalApprenants) *
              100,
          )
        : 0;

    const scoreQualite = (avgSatisfaction + avgReussite) / 2;

    // Evolution réussite sur 6 périodes
    const evolutionReussite = await this.buildEvolutionReussite(
      filters.periode ?? '30j',
    );

    return {
      avgSatisfaction: parseFloat(avgSatisfaction.toFixed(1)),
      avgReussite: parseFloat(avgReussite.toFixed(1)),
      avgAbandon: parseFloat(abandon.toFixed(1)),
      scoreQualite: parseFloat(scoreQualite.toFixed(1)),
      evolutionReussite,
    };
  }

  // ─── GET /directeur/quality/formations ────────────────────────────────
  // Table: formation, formateur, satisfaction, reussite, abandon
  async getQualityByFormation(
    filters: QualityFilterDto,
  ): Promise<QualityRowResponse[]> {
    const range = this.getDateRange(filters.periode);
    const formations = await this.formationRepo.find({
      relations: ['formateur'],
    });

    const rows: QualityRowResponse[] = [];

    for (const formation of formations) {
      if (
        filters.formation &&
        filters.formation !== 'Tous' &&
        formation.titre !== filters.formation
      )
        continue;

      const qb = this.performanceRepo
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.apprenant', 'apprenant')
        .where('p.formationId = :fid', { fid: formation.id });

      if (range) {
        qb.andWhere('p.date BETWEEN :start AND :end', range);
      }

      const perfs = await qb.getMany();
      if (perfs.length === 0) continue;

      // satisfaction: avg note * 5 → 0-100
      const satisfaction =
        (perfs.reduce((s, p) => s + Number(p.note), 0) / perfs.length) * 5;

      // reussite: % estReussi
      const reussite =
        (perfs.filter((p) => p.estReussi).length / perfs.length) * 100;

      // abandon: apprenants inscrits dans la formation sans évaluation
      const evalues = new Set(
        perfs.map((p) => (p.apprenant as any)?.id).filter(Boolean),
      ).size;
      const totalInscrits = await this.apprenantRepo
        .createQueryBuilder('a')
        .innerJoin('a.formations', 'f', 'f.id = :fid', { fid: formation.id })
        .getCount();
      const abandon =
        totalInscrits > 0
          ? Math.max(0, ((totalInscrits - evalues) / totalInscrits) * 100)
          : 0;

      // Formateur principal (first one if multiple)
      const formateurNom = (formation as any).formateur
        ? `${(formation as any).formateur.prenom} ${(formation as any).formateur.nom}`
        : 'N/A';

      if (
        filters.formateur &&
        filters.formateur !== 'Tous' &&
        !formateurNom.includes(filters.formateur)
      )
        continue;

      rows.push({
        formationId: formation.id,
        formation: formation.titre,
        formateur: formateurNom,
        satisfaction: parseFloat(satisfaction.toFixed(1)),
        reussite: parseFloat(reussite.toFixed(1)),
        abandon: parseFloat(abandon.toFixed(1)),
        type: (formation as any).type ?? 'N/A',
      });
    }

    return rows.sort((a, b) => b.satisfaction - a.satisfaction);
  }

  // ─── GET /directeur/quality/formateurs-performance ────────────────────
  // Bar chart: formateur → avg performance score
  async getFormateursPerformance(): Promise<FormateurPerformanceResponse[]> {
    // Group performances by formateur via formation relation
    const result = await this.performanceRepo
      .createQueryBuilder('p')
      .leftJoin('p.formation', 'formation')
      .leftJoin('formation.formateur', 'formateur')
      .select('formateur.prenom', 'prenom')
      .addSelect('formateur.nom', 'nom')
      .addSelect('AVG(p.note * 5)', 'avgScore') // convert 0-20 → 0-100
      .groupBy('formateur.id')
      .addGroupBy('formateur.prenom')
      .addGroupBy('formateur.nom')
      .getRawMany();

    return result
      .filter((r) => r.prenom) // skip null formateurs
      .map((r) => ({
        formateur: `${r.prenom} ${r.nom}`,
        score: parseFloat(parseFloat(r.avgScore).toFixed(1)),
      }))
      .sort((a, b) => b.score - a.score);
  }

  // ─── Private: evolution réussite sur 6 périodes ───────────────────────
  private async buildEvolutionReussite(
    periode: string,
  ): Promise<{ labels: string[]; data: number[] }> {
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const end = new Date();
      const start = new Date();

      if (periode === '12m') {
        end.setMonth(end.getMonth() - i);
        end.setDate(0);
        start.setMonth(start.getMonth() - i - 1);
        start.setDate(1);
        labels.push(start.toLocaleString('fr-FR', { month: 'short' }));
      } else {
        const totalDays = periode === '7j' ? 7 : periode === '90j' ? 90 : 30;
        const bucket = Math.floor(totalDays / 6);
        end.setDate(end.getDate() - i * bucket);
        start.setDate(start.getDate() - (i + 1) * bucket);
        labels.push(`S${6 - i}`);
      }

      const perfs = await this.performanceRepo.find({
        where: { date: Between(start, end) },
      });

      const rate =
        perfs.length > 0
          ? (perfs.filter((p) => p.estReussi).length / perfs.length) * 100
          : 0;
      data.push(parseFloat(rate.toFixed(1)));
    }

    return { labels, data };
  }
}