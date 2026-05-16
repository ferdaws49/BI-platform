import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Performance } from '../../performances/entities/performance.entity';
import { Formation } from '../../formations/entities/formation.entity';
import { Formateur } from '../../formateurs/entities/formateur.entity';
import { Apprenant } from '../../apprenants/entities/apprenant.entity';
import { Satisfaction } from 'src/satisfaction/entities/satisfaction.entity';
import { Session } from '../../sessions/entities/session.entity';
import { computeAbandonRate } from '../../common/helpers/abandon.helper';

interface FilterDto {
  periode?: string;
  formation?: string;
  formateur?: string;
  type?: string;
  statut?: string;
}

@Injectable()
export class PedagogiqueDashboardService {
  constructor(
    @InjectRepository(Performance)
    private performanceRepo: Repository<Performance>,

    @InjectRepository(Formation)
    private formationRepo: Repository<Formation>,

    @InjectRepository(Formateur)
    private formateurRepo: Repository<Formateur>,

    @InjectRepository(Apprenant)
    private apprenantRepo: Repository<Apprenant>,

    @InjectRepository(Satisfaction)
    private satisfactionRepo: Repository<Satisfaction>,

    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
  ) {}

  private getPeriodInterval(periode?: string): { start: Date; end: Date } | null {
    if (!periode || periode === 'Tous') return null;
    const now   = new Date();
    const start = new Date();
    const end   = new Date();

    switch (periode) {
      case 'Ce mois':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'Trimestre':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'Semestre':
        start.setMonth(now.getMonth() - 6);
        break;
      case 'Année':
        start.setFullYear(now.getFullYear());
        start.setMonth(0, 1);
        break;
      default:
        return null;
    }
    return { start, end };
  }

  private mapStatut(frontStatut?: string): string | null {
    if (!frontStatut || frontStatut === 'Tous') return null;
    const map: Record<string, string> = { Actif: 'active', Terminé: 'completed', Annulé: 'cancelled' };
    return map[frontStatut] ?? frontStatut.toLowerCase();
  }

  private buildPerformanceQuery(filters: FilterDto) {
    const qb = this.performanceRepo
      .createQueryBuilder('perf')
      .leftJoinAndSelect('perf.formation', 'formation')
      .leftJoinAndSelect('perf.session', 'session')
      .leftJoinAndSelect('session.formation', 'sessFormation')
      .leftJoinAndSelect('perf.apprenant', 'apprenant')
      .leftJoinAndSelect('apprenant.user', 'user');

    const interval = this.getPeriodInterval(filters.periode);
    if (interval) {
      qb.andWhere('perf.date BETWEEN :start AND :end', {
        start: interval.start.toISOString().split('T')[0],
        end:   interval.end.toISOString().split('T')[0],
      });
    }

    if (filters.formation && filters.formation !== 'Tous') {
      qb.andWhere('(formation.titre = :f OR sessFormation.titre = :f)', { f: filters.formation });
    }

    const dbStatut = this.mapStatut(filters.statut);
    if (dbStatut) {
      qb.andWhere('(formation.statut = :s OR sessFormation.statut = :s)', { s: dbStatut });
    }

    if (filters.type && filters.type !== 'Tous') {
      qb.andWhere('(formation.type = :t OR session.type = :t)', { t: filters.type });
    }

    return qb;
  }

  async getKpis(filters: FilterDto) {
    const performances = await this.buildPerformanceQuery(filters).getMany();

    const total   = performances.length;
    const reussis = performances.filter((p) => p.estReussi).length;
    const tauxReussiteGlobal = total > 0 ? Math.round((reussis / total) * 100) : 0;

    // ✅ abandon = inscrits sans performance
    const interval = this.getPeriodInterval(filters.periode);

    const sessionQb = this.sessionRepo
      .createQueryBuilder('s')
      .leftJoin('s.apprenants', 'a')
      .leftJoin('s.formation', 'formation');

    if (interval) {
      sessionQb.andWhere('s.date BETWEEN :start AND :end', {
        start: interval.start.toISOString().split('T')[0],
        end:   interval.end.toISOString().split('T')[0],
      });
    }
    if (filters.formation && filters.formation !== 'Tous') {
      sessionQb.andWhere('formation.titre = :f', { f: filters.formation });
    }
    if (filters.formateur && filters.formateur !== 'Tous') {
      sessionQb
        .leftJoin('s.formateur', 'fmt')
        .andWhere("LOWER(TRIM(CONCAT(fmt.prenom, ' ', fmt.nom))) = LOWER(TRIM(:fn))", {
          fn: filters.formateur,
        });
    }
    if (filters.type && filters.type !== 'Tous') {
      sessionQb.andWhere('s.type = :type', { type: filters.type });
    }

    const inscritsResult = await sessionQb
      .select('COUNT(DISTINCT a.id)', 'count')
      .getRawOne();
    const totalInscrits = parseInt(inscritsResult?.count ?? '0', 10);

    const evalues = new Set(
      performances.map((p) => p.apprenant?.id).filter((id): id is number => id != null),
    ).size;

    const tauxAbandon = computeAbandonRate(totalInscrits, evalues);

    // Satisfaction
    const satQb = this.satisfactionRepo
      .createQueryBuilder('s')
      .leftJoin('s.formation', 'formation')
      .select('AVG(s.note)', 'avg');
    if (filters.formation && filters.formation !== 'Tous') {
      satQb.where('formation.titre = :f', { f: filters.formation });
    }
    const satResult = await satQb.getRawOne();
    const satisfactionMoyenne = parseFloat(satResult?.avg ?? '0');

    const avecNote     = performances.filter((p) => p.note !== null).length;
    const tauxCompletion = total > 0 ? Math.round((avecNote / total) * 100) : 0;

    // Formations actives
    let formationsActives = 0;
    try {
      const activeQb = this.formationRepo
        .createQueryBuilder('f')
        .innerJoin('f.sessions', 's')
        .where('s.statut != :cancelled', { cancelled: 'Cancelled' });

      if (interval) {
        activeQb.andWhere('s.date BETWEEN :start AND :end', {
          start: interval.start.toISOString().split('T')[0],
          end:   interval.end.toISOString().split('T')[0],
        });
      }
      if (filters.formation && filters.formation !== 'Tous')
        activeQb.andWhere('f.titre = :titre', { titre: filters.formation });
      if (filters.formateur && filters.formateur !== 'Tous') {
        activeQb
          .leftJoin('s.formateur', 'fmt')
          .andWhere("LOWER(TRIM(CONCAT(fmt.prenom, ' ', fmt.nom))) = LOWER(TRIM(:fn))", {
            fn: filters.formateur,
          });
      }
      if (filters.type && filters.type !== 'Tous')
        activeQb.andWhere('s.type = :type', { type: filters.type });

      const activeResult = await activeQb
        .select('COUNT(DISTINCT f.id)', 'count')
        .getRawOne();
      formationsActives = parseInt(activeResult?.count ?? '0', 10);
    } catch (e) {
      console.error('[ERROR] Failed to count active formations:', e.message);
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const nouvellesFormations = await this.formationRepo
      .createQueryBuilder('f')
      .where('f.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getCount();

    return {
      tauxReussiteGlobal,
      evolutionReussite:    2,
      tauxAbandon,
      evolutionAbandon:     0,
      satisfactionMoyenne,
      evolutionSatisfaction: 0.1,
      formationsActives,
      nouvellesFormations,
      tauxCompletion,
    };
  }

  // باقي الـ methods ما تبدّلوش ↓

  async getFormateursPerformances(filters: FilterDto) {
    const formateurs = await this.formateurRepo.find();
    const result: any[] = [];

    for (const formateur of formateurs) {
      const fullName = `${formateur.prenom} ${formateur.nom}`;
      if (filters.formateur && filters.formateur !== 'Tous' && filters.formateur !== fullName) continue;

      const performances = await this.buildPerformanceQuery(filters).getMany();
      if (performances.length === 0) continue;

      const total   = performances.length;
      const reussis = performances.filter((p) => p.estReussi).length;
      const tauxReussite = total > 0 ? Math.round((reussis / total) * 100) : 0;
      const satisfaction = total > 0
        ? Math.round((performances.reduce((sum, p) => sum + Number(p.note), 0) / total / 4) * 10) / 10
        : 0;
      const scoreEfficacite = Math.round(tauxReussite * 0.6 + satisfaction * 20 * 0.4);

      result.push({
        nom: fullName,
        initiales: `${formateur.prenom[0]}${formateur.nom[0]}`.toUpperCase(),
        specialite: formateur.specialite ?? 'N/A',
        sessions: total,
        scoreEfficacite,
        tauxReussite,
        satisfaction,
      });
    }

    return result.sort((a, b) => b.scoreEfficacite - a.scoreEfficacite).slice(0, 5);
  }

  async getFormationsTauxReussite(filters: FilterDto) {
    const formations = await this.formationRepo.find();
    const result: any[] = [];

    for (const formation of formations) {
      if (filters.formation && filters.formation !== 'Tous' && formation.titre !== filters.formation) continue;

      const performances = await this.performanceRepo
        .createQueryBuilder('perf')
        .leftJoin('perf.session', 'session')
        .leftJoin('session.formation', 'sessFormation')
        .leftJoin('perf.formation', 'directFormation')
        .where('(directFormation.id = :id OR sessFormation.id = :id)', { id: formation.id })
        .getMany();

      if (performances.length === 0) continue;

      const total   = performances.length;
      const reussis = performances.filter((p) => p.estReussi).length;

      result.push({
        formation:     formation.titre,
        formateur:     'N/A',
        inscrits:      total,
        tauxReussite:  Math.round((reussis / total) * 100),
        tauxAbandon:   0,
        tauxCompletion: 100,
        satisfaction:  4.5,
        statut: formation.statut === 'active' ? 'Actif' : 'Terminé',
        type:   'En ligne',
      });
    }
    return result;
  }

  async getApprenantsARisque(filters: FilterDto) {
    const performances = await this.buildPerformanceQuery(filters).getMany();
    const map = new Map<number, { apprenant: any; formations: string[]; worstNote: number }>();

    for (const perf of performances) {
      if (!perf.apprenant) continue;
      const id    = perf.apprenant.id;
      let entry   = map.get(id);
      if (!entry) {
        entry = { apprenant: perf.apprenant, formations: [], worstNote: 20 };
        map.set(id, entry);
      }
      const note = Number(perf.note);
      if (note < entry.worstNote) entry.worstNote = note;
      const titre = perf.formation?.titre || perf.session?.title || 'Formation';
      if (!entry.formations.includes(titre)) entry.formations.push(titre);
    }

    return Array.from(map.values())
      .filter((s) => s.worstNote < 10)
      .map(({ apprenant, formations, worstNote }) => ({
        nom:        `${apprenant.user?.prenom ?? ''} ${apprenant.user?.nom ?? ''}`.trim(),
        formation:  formations[0] ?? 'N/A',
        raison:     worstNote < 7 ? 'Difficultés graves' : 'Note insuffisante',
        progression: Math.round((worstNote / 20) * 100),
        worstNote,
      }))
      .slice(0, 6);
  }

  async getFiltersOptions() {
    const formations = await this.formationRepo.find({ select: ['titre'] });
    const formateurs = await this.formateurRepo.find({ select: ['nom', 'prenom'] });
    return {
      formations: ['Tous', ...formations.map((f) => f.titre)],
      formateurs: ['Tous', ...formateurs.map((f) => `${f.prenom} ${f.nom}`)],
      types:      ['Tous', 'En ligne', 'Présentiel'],
      statuts:    ['Tous', 'Actif', 'Terminé', 'Annulé'],
    };
  }
}