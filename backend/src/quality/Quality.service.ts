import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

const GRACE_PERIOD_DAYS = 14;

type ApprenantStatus = 'NEW' | 'ACTIVE' | 'EN_COURS' | 'ABANDON';
interface ApprenantLifecycle {
  apprenantId: number;
  status: ApprenantStatus;
}

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

  // ─── Période ──────────────────────────────────────────────────────────────

  private getDateRange(periode = '30j'): { start: Date; end: Date } | null {
    const end = new Date();
    const start = new Date();
    switch (this.normalizePeriode(periode)) {
      case '7j':  start.setDate(end.getDate() - 7);    break;
      case '30j': start.setDate(end.getDate() - 30);   break;
      case '90j': start.setDate(end.getDate() - 90);   break;
      case '12m': start.setMonth(end.getMonth() - 12); break;
      default:    return null;
    }
    return { start, end };
  }

  private normalizePeriode(periode?: string): string {
    switch (periode) {
      case 'Ce mois': case '30j':                                return '30j';
      case 'Trimestre': case '90j':                              return '90j';
      case 'Semestre': case 'Année': case 'Annee': case '12m':  return '12m';
      case '7j':                                                 return '7j';
      default:                                                   return '30j';
    }
  }

  // ─── Filtres ──────────────────────────────────────────────────────────────

  private normalizeSessionType(type?: string): string | null {
    if (!type || type === 'Tous') return null;
    const t = type.toLowerCase().trim();
    if (['présentiel', 'presentiel', 'prã©sentiel'].includes(t)) return 'présentiel';
    if (['en ligne', 'en_ligne', 'online'].includes(t))           return 'en_ligne';
    return t;
  }

  private matchesFormateurFilter(sessions: Session[], formateur?: string): boolean {
    if (!formateur || formateur === 'Tous') return true;
    const f = formateur.toLowerCase();
    return sessions.some((s) =>
      s.formateur
        ? `${s.formateur.prenom} ${s.formateur.nom}`.toLowerCase().includes(f)
        : false,
    );
  }

  private matchesTypeFilter(sessions: Session[], type?: string): boolean {
    const normalized = this.normalizeSessionType(type);
    if (!normalized) return true;
    return sessions.some((s) => s.type === normalized);
  }

  private async getFilteredFormations(filters: QualityFilterDto): Promise<Formation[]> {
    const formations = await this.formationRepo.find({
      relations: ['sessions', 'sessions.formateur', 'sessions.apprenants'],
    });
    return formations.filter((f) => {
      if (filters.formation && filters.formation !== 'Tous' && f.titre !== filters.formation)
        return false;
      const sessions = f.sessions ?? [];
      return (
        this.matchesFormateurFilter(sessions, filters.formateur) &&
        this.matchesTypeFilter(sessions, filters.type)
      );
    });
  }

  // ─── Lifecycle apprenant ──────────────────────────────────────────────────

  private classifyApprenant(
    apprenantId: number,
    sessions: Session[],
    evaluatedIds: Set<number>,
    today: Date,
  ): ApprenantLifecycle {
    const apprenantSessions = sessions.filter((s) =>
      (s.apprenants ?? []).some((a) => a.id === apprenantId),
    );

    if (apprenantSessions.length === 0)    return { apprenantId, status: 'NEW' };
    if (evaluatedIds.has(apprenantId))     return { apprenantId, status: 'ACTIVE' };

    // session.date est string 'YYYY-MM-DD' → new Date() le parse correctement
    const sessionDates = apprenantSessions
      .map((s) => new Date(s.date))
      .filter((d) => !isNaN(d.getTime()));

    if (sessionDates.length === 0)         return { apprenantId, status: 'EN_COURS' };

    const firstSession = new Date(Math.min(...sessionDates.map((d) => d.getTime())));
    const daysSince    = Math.floor((today.getTime() - firstSession.getTime()) / 86_400_000);

    return daysSince > GRACE_PERIOD_DAYS
      ? { apprenantId, status: 'ABANDON' }
      : { apprenantId, status: 'EN_COURS' };
  }

  private computeAbandonRate(
    sessions: Session[],
    evaluatedIds: Set<number>,
  ): { abandonCount: number; totalRelevant: number; rate: number } {
    const today = new Date();

    const allIds = new Set<number>();
    for (const s of sessions)
      for (const a of s.apprenants ?? []) allIds.add(a.id);

    if (allIds.size === 0) return { abandonCount: 0, totalRelevant: 0, rate: 0 };

    const lifecycles  = [...allIds].map((id) =>
      this.classifyApprenant(id, sessions, evaluatedIds, today),
    );
    const relevant    = lifecycles.filter((l) => l.status !== 'NEW');
    const abandonCount = relevant.filter((l) => l.status === 'ABANDON').length;
    const rate        = relevant.length > 0
      ? Math.max(0, (abandonCount / relevant.length) * 100)
      : 0;

    return { abandonCount, totalRelevant: relevant.length, rate };
  }

  // ─── Helpers internes ─────────────────────────────────────────────────────

  private getMainFormateurName(sessions: Session[]): string {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      if (!s.formateur) continue;
      const name = `${s.formateur.prenom} ${s.formateur.nom}`.trim();
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    if (counts.size === 0) return 'N/A';
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) return 'Multiple';
    return sorted[0][0];
  }

  private getFormationType(sessions: Session[]): string {
    const types = [...new Set(
      sessions.map((s) => this.formatSessionType(s.type)).filter(Boolean),
    )] as string[];
    if (types.length === 0) return 'N/A';
    if (types.length === 1) return types[0];
    return 'Multiple';
  }

  private formatSessionType(type?: Session['type']): string | null {
    if (!type) return null;
    if (type === 'en_ligne')   return 'En ligne';
    if (type === 'présentiel') return 'Présentiel';
    return type;
  }

  // ─── getOverview ──────────────────────────────────────────────────────────

  async getOverview(filters: QualityFilterDto): Promise<QualityOverviewResponse> {
    const range      = this.getDateRange(filters.periode);
    const formations = await this.getFilteredFormations(filters);
    const formationIds = formations.map((f) => f.id);

    if (formationIds.length === 0) {
      return {
        avgSatisfaction: 0, avgReussite: 0, avgAbandon: 0, scoreQualite: 0,
        evolutionReussite: { labels: [], data: [] },
      };
    }

    // ✅ join via p.formation (pas de FK column explicite dans l'entity)
    const perfQb = this.performanceRepo
      .createQueryBuilder('p')
      .leftJoin('p.formation', 'formation')
      .leftJoinAndSelect('p.apprenant', 'apprenant')
      .where('formation.id IN (:...formationIds)', { formationIds });
    if (range) perfQb.andWhere('p.date BETWEEN :start AND :end', range);
    const performances = await perfQb.getMany();

    // Satisfaction (1-5 → 0-100)
    const satQb = this.satisfactionRepo
      .createQueryBuilder('s')
      .select('AVG(s.note)', 'avg')
      .leftJoin('s.formation', 'formation')
      .where('formation.id IN (:...formationIds)', { formationIds });
    if (range) satQb.andWhere('s.createdAt BETWEEN :start AND :end', range);
    const satResult      = await satQb.getRawOne();
    const avgSatisfaction = satResult?.avg ? parseFloat(satResult.avg) * 20 : 0;

    // Réussite
    const avgReussite = performances.length > 0
      ? (performances.filter((p) => p.estReussi).length / performances.length) * 100
      : 0;

    // Abandon — lifecycle correct
    const allSessions  = formations.flatMap((f) => f.sessions ?? []);
    const evaluatedIds = new Set(
      performances.map((p) => p.apprenant?.id).filter((id): id is number => id != null),
    );
    const { rate: avgAbandon } = this.computeAbandonRate(allSessions, evaluatedIds);

    // Score qualité pondéré
    const scoreQualite = Math.max(
      0,
      avgSatisfaction * 0.4 + avgReussite * 0.4 + (100 - avgAbandon) * 0.2,
    );

    const evolutionReussite = await this.buildEvolutionReussite(
      filters.periode ?? 'Ce mois',
      formationIds,
    );

    return {
      avgSatisfaction:  parseFloat(avgSatisfaction.toFixed(1)),
      avgReussite:      parseFloat(avgReussite.toFixed(1)),
      avgAbandon:       parseFloat(avgAbandon.toFixed(1)),
      scoreQualite:     parseFloat(scoreQualite.toFixed(1)),
      evolutionReussite,
    };
  }

  // ─── getQualityByFormation ────────────────────────────────────────────────

  async getQualityByFormation(filters: QualityFilterDto): Promise<QualityRowResponse[]> {
    const range      = this.getDateRange(filters.periode);
    const formations = await this.getFilteredFormations(filters);
    const rows: QualityRowResponse[] = [];

    for (const formation of formations) {
      // ✅ join via p.formation
      const perfQb = this.performanceRepo
        .createQueryBuilder('p')
        .leftJoin('p.formation', 'formation')
        .leftJoinAndSelect('p.apprenant', 'apprenant')
        .where('formation.id = :fid', { fid: formation.id });
      if (range) perfQb.andWhere('p.date BETWEEN :start AND :end', range);
      const perfs = await perfQb.getMany();

      // Satisfaction
      const satQb = this.satisfactionRepo
        .createQueryBuilder('s')
        .select('AVG(s.note)', 'avg')
        .leftJoin('s.formation', 'formation')
        .where('formation.id = :fid', { fid: formation.id });
      if (range) satQb.andWhere('s.createdAt BETWEEN :start AND :end', range);
      const satResult   = await satQb.getRawOne();
      const satisfaction = satResult?.avg ? parseFloat(satResult.avg) * 20 : 0;

      // Réussite
      const reussite = perfs.length > 0
        ? (perfs.filter((p) => p.estReussi).length / perfs.length) * 100
        : 0;

      // Abandon lifecycle
      const evaluatedIds = new Set(
        perfs.map((p) => p.apprenant?.id).filter((id): id is number => id != null),
      );
      const { rate: abandon } = this.computeAbandonRate(
        formation.sessions ?? [],
        evaluatedIds,
      );

      rows.push({
        formationId:  formation.id,
        formation:    formation.titre,
        formateur:    this.getMainFormateurName(formation.sessions ?? []),
        satisfaction: parseFloat(satisfaction.toFixed(1)),
        reussite:     parseFloat(reussite.toFixed(1)),
        abandon:      parseFloat(abandon.toFixed(1)),
        type:         this.getFormationType(formation.sessions ?? []),
      });
    }

    return rows.sort((a, b) => b.satisfaction - a.satisfaction);
  }

  // ─── getFormateursPerformance ─────────────────────────────────────────────

  async getFormateursPerformance(
    filters: QualityFilterDto,
  ): Promise<FormateurPerformanceResponse[]> {
    const range      = this.getDateRange(filters.periode);
    const formations = await this.getFilteredFormations(filters);
    const formationIds = formations.map((f) => f.id);

    if (formationIds.length === 0) return [];

    // ✅ MAssar sah: p → p.session → session.formateur
    const qb = this.performanceRepo
      .createQueryBuilder('p')
      .leftJoin('p.session', 'session')
      .leftJoin('session.formateur', 'formateur')
      .leftJoin('p.formation', 'formation')
      .select('formateur.id', 'formateurId')
      .addSelect('formateur.prenom', 'prenom')
      .addSelect('formateur.nom', 'nom')
      .addSelect('AVG(p.note * 5)', 'avgScore')
      .where('formation.id IN (:...formationIds)', { formationIds })
      .andWhere('formateur.id IS NOT NULL')
      .groupBy('formateur.id')
      .addGroupBy('formateur.prenom')
      .addGroupBy('formateur.nom');

    if (range) qb.andWhere('p.date BETWEEN :start AND :end', range);

    const result = await qb.getRawMany();

    return result
      .filter((r) => r.prenom && r.nom)
      .map((r) => ({
        formateur: `${r.prenom} ${r.nom}`,
        score:     parseFloat(parseFloat(r.avgScore ?? '0').toFixed(1)),
      }))
      .sort((a, b) => b.score - a.score);
  }

  // ─── buildEvolutionReussite ───────────────────────────────────────────────

  private async buildEvolutionReussite(
    periode: string,
    formationIds?: number[],
  ): Promise<{ labels: string[]; data: number[] }> {
    const labels: string[] = [];
    const data:   number[] = [];
    const normalized = this.normalizePeriode(periode);

    if (formationIds && formationIds.length === 0) return { labels, data };

    for (let i = 5; i >= 0; i--) {
      const end   = new Date();
      const start = new Date();

      if (normalized === '12m') {
        end.setMonth(end.getMonth() - i);
        end.setDate(0);
        start.setMonth(start.getMonth() - i - 1);
        start.setDate(1);
        labels.push(start.toLocaleString('fr-FR', { month: 'short' }));
      } else {
        const totalDays = normalized === '7j' ? 7 : normalized === '90j' ? 90 : 30;
        const bucket    = Math.floor(totalDays / 6);
        end.setDate(end.getDate() - i * bucket);
        start.setDate(start.getDate() - (i + 1) * bucket);
        labels.push(`S${6 - i}`);
      }

      // ✅ join via p.formation
      const qb = this.performanceRepo
        .createQueryBuilder('p')
        .leftJoin('p.formation', 'formation')
        .where('p.date BETWEEN :start AND :end', { start, end });
      if (formationIds?.length)
        qb.andWhere('formation.id IN (:...formationIds)', { formationIds });

      const perfs = await qb.getMany();
      const rate  = perfs.length > 0
        ? (perfs.filter((p) => p.estReussi).length / perfs.length) * 100
        : 0;
      data.push(parseFloat(rate.toFixed(1)));
    }

    return { labels, data };
  }
}