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
    const qb = this.performanceRepo
      .createQueryBuilder('perf')
      .leftJoin('perf.formation', 'formation')
      .leftJoin('perf.session', 'session')
      .leftJoin('session.formation', 'sessFormation');

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

    if (filters.formateur && filters.formateur !== 'Tous') {
      qb.leftJoin('session.formateur', 'fmt')
        .andWhere("LOWER(TRIM(CONCAT(fmt.prenom, ' ', fmt.nom))) = LOWER(TRIM(:fn))", {
          fn: filters.formateur,
        });
    }

    const statsResult = await qb
      .select('COUNT(perf.id)', 'total')
      .addSelect('SUM(CASE WHEN perf.estReussi = true THEN 1 ELSE 0 END)', 'reussis')
      .addSelect('SUM(CASE WHEN perf.note IS NOT NULL THEN 1 ELSE 0 END)', 'avecNote')
      .addSelect('COUNT(DISTINCT perf.apprenantId)', 'evalues')
      .getRawOne<{ total: string; reussis: string; avecNote: string; evalues: string }>();

    const total = parseInt(statsResult?.total ?? '0', 10);
    const reussis = parseInt(statsResult?.reussis ?? '0', 10);
    const avecNote = parseInt(statsResult?.avecNote ?? '0', 10);
    const evalues = parseInt(statsResult?.evalues ?? '0', 10);

    const tauxReussiteGlobal = total > 0 ? Math.round((reussis / total) * 100) : 0;
    const tauxCompletion = total > 0 ? Math.round((avecNote / total) * 100) : 0;

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

    const tauxAbandon = computeAbandonRate(totalInscrits, evalues);

    const satQb = this.satisfactionRepo
      .createQueryBuilder('s')
      .leftJoin('s.formation', 'formation')
      .select('AVG(s.note)', 'avg');
    if (filters.formation && filters.formation !== 'Tous') {
      satQb.where('formation.titre = :f', { f: filters.formation });
    }
    const satResult = await satQb.getRawOne();
    const satisfactionMoyenne = parseFloat(satResult?.avg ?? '0');

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
      satisfactionMoyenne: Math.round(satisfactionMoyenne * 10) / 10,
      evolutionSatisfaction: 0.1,
      formationsActives,
      nouvellesFormations,
      tauxCompletion,
    };
  }

  async getFormateursPerformances(filters: FilterDto) {
    const qb = this.performanceRepo
      .createQueryBuilder('perf')
      .leftJoinAndSelect('perf.session', 'session')
      .leftJoinAndSelect('session.formateur', 'formateur')
      .leftJoinAndSelect('session.formation', 'sessFormation')
      .leftJoinAndSelect('perf.formation', 'formation');

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

    const performances = await qb.getMany();
    const formateursMap = new Map<number, { formateur: Formateur; perfs: Performance[] }>();

    for (const perf of performances) {
      const formateur = perf.session?.formateur;
      if (!formateur) continue;

      const fullName = `${formateur.prenom} ${formateur.nom}`;
      if (filters.formateur && filters.formateur !== 'Tous' && filters.formateur !== fullName) continue;

      let entry = formateursMap.get(formateur.id);
      if (!entry) {
        entry = { formateur, perfs: [] };
        formateursMap.set(formateur.id, entry);
      }
      entry.perfs.push(perf);
    }

    const result: any[] = [];
    for (const [_, entry] of formateursMap.entries()) {
      const formateur = entry.formateur;
      const perfs = entry.perfs;
      const total = perfs.length;
      if (total === 0) continue;

      const reussis = perfs.filter((p) => p.estReussi).length;
      const tauxReussite = Math.round((reussis / total) * 100);
      const satisfaction = Math.round((perfs.reduce((sum, p) => sum + Number(p.note), 0) / total / 4) * 10) / 10;
      const scoreEfficacite = Math.round(tauxReussite * 0.6 + satisfaction * 20 * 0.4);

      result.push({
        nom: `${formateur.prenom} ${formateur.nom}`,
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
    const qb = this.performanceRepo
      .createQueryBuilder('perf')
      .leftJoinAndSelect('perf.formation', 'directFormation')
      .leftJoinAndSelect('perf.session', 'session')
      .leftJoinAndSelect('session.formation', 'sessFormation')
      .leftJoinAndSelect('session.formateur', 'formateur');

    const interval = this.getPeriodInterval(filters.periode);
    if (interval) {
      qb.andWhere('perf.date BETWEEN :start AND :end', {
        start: interval.start.toISOString().split('T')[0],
        end:   interval.end.toISOString().split('T')[0],
      });
    }

    if (filters.formation && filters.formation !== 'Tous') {
      qb.andWhere('(directFormation.titre = :f OR sessFormation.titre = :f)', { f: filters.formation });
    }

    const dbStatut = this.mapStatut(filters.statut);
    if (dbStatut) {
      qb.andWhere('(directFormation.statut = :s OR sessFormation.statut = :s)', { s: dbStatut });
    }

    if (filters.type && filters.type !== 'Tous') {
      qb.andWhere('(directFormation.type = :t OR session.type = :t)', { t: filters.type });
    }

    if (filters.formateur && filters.formateur !== 'Tous') {
      qb.andWhere("LOWER(TRIM(CONCAT(formateur.prenom, ' ', formateur.nom))) = LOWER(TRIM(:fn))", {
        fn: filters.formateur,
      });
    }

    const performances = await qb.getMany();
    const formationsMap = new Map<number, { formation: Formation; perfs: Performance[]; formateurName: string }>();

    for (const perf of performances) {
      const formation = perf.formation || perf.session?.formation;
      if (!formation) continue;

      let entry = formationsMap.get(formation.id);
      if (!entry) {
        const formateur = perf.session?.formateur;
        const formateurName = formateur ? `${formateur.prenom} ${formateur.nom}` : 'N/A';
        entry = { formation, perfs: [], formateurName };
        formationsMap.set(formation.id, entry);
      }
      entry.perfs.push(perf);
    }

    const result: any[] = [];
    for (const [_, entry] of formationsMap.entries()) {
      const formation = entry.formation;
      const perfs = entry.perfs;
      const total = perfs.length;
      if (total === 0) continue;

      const reussis = perfs.filter((p) => p.estReussi).length;

      result.push({
        formation:     formation.titre,
        formateur:     entry.formateurName,
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
    const qb = this.performanceRepo
      .createQueryBuilder('perf')
      .leftJoinAndSelect('perf.formation', 'formation')
      .leftJoinAndSelect('perf.session', 'session')
      .leftJoinAndSelect('session.formation', 'sessFormation')
      .leftJoinAndSelect('perf.apprenant', 'apprenant')
      .leftJoinAndSelect('apprenant.user', 'user')
      .where('perf.note < 10');

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

    if (filters.formateur && filters.formateur !== 'Tous') {
      qb.leftJoin('session.formateur', 'fmt')
        .andWhere("LOWER(TRIM(CONCAT(fmt.prenom, ' ', fmt.nom))) = LOWER(TRIM(:fn))", {
          fn: filters.formateur,
        });
    }

    const performances = await qb.getMany();
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