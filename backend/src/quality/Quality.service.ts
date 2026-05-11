import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Performance } from '../performances/entities/performance.entity';
import { Formation } from '../formations/entities/formation.entity';
import { Session } from '../sessions/entities/session.entity';
import { Satisfaction } from '../satisfaction/entities/satisfaction.entity';

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

    @InjectRepository(Satisfaction)
    private satisfactionRepo: Repository<Satisfaction>,
  ) {}


  private getDateRange(periode = '30j'): { start: Date; end: Date } | null {
    const end = new Date();
    const start = new Date();
    const normalizedPeriode = this.normalizePeriode(periode);

    switch (normalizedPeriode) {
      case '7j':
        start.setDate(end.getDate() - 7);
        break;
      case '30j':
        start.setDate(end.getDate() - 30);
        break;
      case '90j':
        start.setDate(end.getDate() - 90);
        break;
      case '12m':
        start.setMonth(end.getMonth() - 12);
        break;
      default:
        return null;
    }

    return { start, end };
  }

  private normalizePeriode(periode?: string): string {
    switch (periode) {
      case 'Ce mois':
      case '30j':
        return '30j';
      case 'Trimestre':
      case '90j':
        return '90j';
      case 'Semestre':
      case 'Année':
      case 'Annee':
      case '12m':
        return '12m';
      case '7j':
        return '7j';
      default:
        return '30j';
    }
  }

  private normalizeSessionType(type?: string): string | null {
    if (!type || type === 'Tous') return null;

    const normalizedType = type.toLowerCase().trim();

    if (
      normalizedType === 'présentiel' ||
      normalizedType === 'presentiel' ||
      normalizedType === 'prã©sentiel'
    ) {
      return 'présentiel';
    }

    if (
      normalizedType === 'en ligne' ||
      normalizedType === 'en_ligne' ||
      normalizedType === 'online'
    ) {
      return 'en_ligne';
    }

    return normalizedType;
  }

  private getUniqueApprenantCount(sessions: Session[]): number {
    const apprenantIds = new Set<number>();

    for (const session of sessions) {
      for (const apprenant of session.apprenants ?? []) {
        apprenantIds.add(apprenant.id);
      }
    }

    return apprenantIds.size;
  }

  private getMainFormateurName(sessions: Session[]): string {
    const counts = new Map<string, number>();

    for (const session of sessions) {
      if (!session.formateur) continue;

      const fullName =
        `${session.formateur.prenom} ${session.formateur.nom}`.trim();
      counts.set(fullName, (counts.get(fullName) ?? 0) + 1);
    }

    if (counts.size === 0) return 'N/A';

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
      return 'Multiple';
    }

    return sorted[0][0];
  }

  private getFormationType(sessions: Session[]): string {
    const types = [
      ...new Set(
        sessions
          .map((session) => this.formatSessionType(session.type))
          .filter((type): type is string => !!type),
      ),
    ];

    if (types.length === 0) return 'N/A';
    if (types.length === 1) return types[0];
    return 'Multiple';
  }

  private formatSessionType(type?: Session['type']): string | null {
    if (!type) return null;
    if (type === 'en_ligne') return 'En ligne';
    if (type === 'présentiel') return 'Présentiel';
    return type;
  }

  private matchesFormateurFilter(
    sessions: Session[],
    formateur?: string,
  ): boolean {
    if (!formateur || formateur === 'Tous') return true;

    const normalizedFilter = formateur.toLowerCase();
    return sessions.some((session) => {
      if (!session.formateur) return false;

      const fullName =
        `${session.formateur.prenom} ${session.formateur.nom}`.toLowerCase();
      return fullName.includes(normalizedFilter);
    });
  }

  private matchesTypeFilter(sessions: Session[], type?: string): boolean {
    const normalizedType = this.normalizeSessionType(type);
    if (!normalizedType) return true;

    return sessions.some((session) => {
      if (!session.type) return false;
      return session.type === normalizedType;
    });
  }

  private async getFilteredFormations(
    filters: QualityFilterDto,
  ): Promise<Formation[]> {
    const formations = await this.formationRepo.find({
      relations: ['sessions', 'sessions.formateur', 'sessions.apprenants'],
    });

    return formations.filter((formation) => {
      if (
        filters.formation &&
        filters.formation !== 'Tous' &&
        formation.titre !== filters.formation
      ) {
        return false;
      }

      const sessions = formation.sessions ?? [];
      return (
        this.matchesFormateurFilter(sessions, filters.formateur) &&
        this.matchesTypeFilter(sessions, filters.type)
      );
    });
  }

  async getOverview(filters: QualityFilterDto): Promise<QualityOverviewResponse> {
    const range = this.getDateRange(filters.periode);
    const formations = await this.getFilteredFormations(filters);
    const formationIds = formations.map((formation) => formation.id);

    if (formationIds.length === 0) {
      return {
        avgSatisfaction: 0,
        avgReussite: 0,
        avgAbandon: 0,
        scoreQualite: 0,
        evolutionReussite: { labels: [], data: [] },
      };
    }

    const qb = this.performanceRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.formation', 'formation')
      .leftJoinAndSelect('p.apprenant', 'apprenant')
      .where('formation.id IN (:...formationIds)', { formationIds });

    if (range) {
      qb.andWhere('p.date BETWEEN :start AND :end', range);
    }

    const performances = await qb.getMany();

    // Satisfaction réelle via l'entité Satisfaction (échelle 1-5 → 0-100)
    const satisfactionQb = this.satisfactionRepo
      .createQueryBuilder('s')
      .select('AVG(s.note)', 'avg')
      .where('s.formationId IN (:...formationIds)', { formationIds });

    if (range) {
      satisfactionQb.andWhere('s.createdAt BETWEEN :start AND :end', range);
    }
    const satResult = await satisfactionQb.getRawOne();
    const avgSatisfaction = satResult?.avg ? parseFloat(satResult.avg) * 20 : 0;


    const avgReussite =
      performances.length > 0
        ? (performances.filter((perf) => perf.estReussi).length /
            performances.length) *
          100
        : 0;

    const totalApprenants = this.getUniqueApprenantCount(
      formations.flatMap((formation) => formation.sessions ?? []),
    );
    const apprenantIdsEvalues = new Set(
      performances
        .map((performance) => performance.apprenant?.id)
        .filter((id): id is number => typeof id === 'number'),
    );
    const avgAbandon =
      totalApprenants > 0
        ? Math.max(
            0,
            ((totalApprenants - apprenantIdsEvalues.size) / totalApprenants) * 100,
          )
        : 0;

    const scoreQualite = (avgSatisfaction + avgReussite) / 2;
    const evolutionReussite = await this.buildEvolutionReussite(
      filters.periode ?? 'Ce mois',
      formationIds,
    );

    return {
      avgSatisfaction: parseFloat(avgSatisfaction.toFixed(1)),
      avgReussite: parseFloat(avgReussite.toFixed(1)),
      avgAbandon: parseFloat(avgAbandon.toFixed(1)),
      scoreQualite: parseFloat(scoreQualite.toFixed(1)),
      evolutionReussite,
    };
  }

  async getQualityByFormation(
    filters: QualityFilterDto,
  ): Promise<QualityRowResponse[]> {
    const range = this.getDateRange(filters.periode);
    const formations = await this.getFilteredFormations(filters);
    const rows: QualityRowResponse[] = [];

    for (const formation of formations) {
      const qb = this.performanceRepo
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.apprenant', 'apprenant')
        .where('p.formationId = :fid', { fid: formation.id });

      if (range) {
        qb.andWhere('p.date BETWEEN :start AND :end', range);
      }

      const perfs = await qb.getMany();
      // Satisfaction réelle (1-5 → 0-100)
      const satResult = await this.satisfactionRepo
        .createQueryBuilder('s')
        .select('AVG(s.note)', 'avg')
        .where('s.formationId = :fid', { fid: formation.id })
        .andWhere(range ? 's.createdAt BETWEEN :start AND :end' : '1=1', range || {})
        .getRawOne();
      
      const satisfaction = satResult?.avg ? parseFloat(satResult.avg) * 20 : 0;
      let reussite = 0;

      if (perfs.length > 0) {

        reussite =
          (perfs.filter((perf) => perf.estReussi).length / perfs.length) * 100;
      }


      const evalues = new Set(
        perfs
          .map((performance) => performance.apprenant?.id)
          .filter((id): id is number => typeof id === 'number'),
      ).size;
      const totalInscrits = this.getUniqueApprenantCount(formation.sessions ?? []);
      const abandon =
        totalInscrits > 0
          ? Math.max(0, ((totalInscrits - evalues) / totalInscrits) * 100)
          : 0;

      rows.push({
        formationId: formation.id,
        formation: formation.titre,
        formateur: this.getMainFormateurName(formation.sessions ?? []),
        satisfaction: parseFloat(satisfaction.toFixed(1)),
        reussite: parseFloat(reussite.toFixed(1)),
        abandon: parseFloat(abandon.toFixed(1)),
        type: this.getFormationType(formation.sessions ?? []),
      });
    }

    return rows.sort((a, b) => b.satisfaction - a.satisfaction);
  }

  async getFormateursPerformance(): Promise<FormateurPerformanceResponse[]> {
    const result = await this.performanceRepo
      .createQueryBuilder('p')
      .leftJoin('p.formation', 'formation')
      .leftJoin('formation.sessions', 'session')
      .leftJoin('session.formateur', 'formateur')
      .select('formateur.prenom', 'prenom')
      .addSelect('formateur.nom', 'nom')
      .addSelect('AVG(p.note * 5)', 'avgScore')
      .groupBy('formateur.id')
      .addGroupBy('formateur.prenom')
      .addGroupBy('formateur.nom')
      .getRawMany();

    return result
      .filter((row) => row.prenom && row.nom)
      .map((row) => ({
        formateur: `${row.prenom} ${row.nom}`,
        score: parseFloat(parseFloat(row.avgScore).toFixed(1)),
      }))
      .sort((a, b) => b.score - a.score);
  }

  private async buildEvolutionReussite(
    periode: string,
    formationIds?: number[],
  ): Promise<{ labels: string[]; data: number[] }> {
    const labels: string[] = [];
    const data: number[] = [];
    const normalizedPeriode = this.normalizePeriode(periode);

    if (formationIds && formationIds.length === 0) {
      return { labels, data };
    }

    for (let i = 5; i >= 0; i--) {
      const end = new Date();
      const start = new Date();

      if (normalizedPeriode === '12m') {
        end.setMonth(end.getMonth() - i);
        end.setDate(0);
        start.setMonth(start.getMonth() - i - 1);
        start.setDate(1);
        labels.push(start.toLocaleString('fr-FR', { month: 'short' }));
      } else {
        const totalDays =
          normalizedPeriode === '7j'
            ? 7
            : normalizedPeriode === '90j'
              ? 90
              : 30;
        const bucket = Math.floor(totalDays / 6);
        end.setDate(end.getDate() - i * bucket);
        start.setDate(start.getDate() - (i + 1) * bucket);
        labels.push(`S${6 - i}`);
      }

      const qb = this.performanceRepo
        .createQueryBuilder('p')
        .where('p.date BETWEEN :start AND :end', { start, end });

      if (formationIds?.length) {
        qb.andWhere('p.formationId IN (:...formationIds)', { formationIds });
      }

      const perfs = await qb.getMany();
      const rate =
        perfs.length > 0
          ? (perfs.filter((perf) => perf.estReussi).length / perfs.length) * 100
          : 0;

      data.push(parseFloat(rate.toFixed(1)));
    }

    return { labels, data };
  }
}
