import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Performance } from '../../performances/entities/performance.entity';
import { Formation } from '../../formations/entities/formation.entity';
import { Formateur } from '../../formateurs/entities/formateur.entity';
import { Apprenant } from '../../apprenants/entities/apprenant.entity';
import { Satisfaction } from 'src/satisfaction/entities/satisfaction.entity';

// شكل الفلاتر اللي تجي من الـ query params
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
  ) {}

  // ── Helper: حساب تاريخ البداية حسب الـ periode ───────────────────────────
  private getDateFrom(periode?: string): Date | null {
    if (!periode) return null;
    const now = new Date();
    switch (periode) {
      case 'Trimestre': return new Date(now.setMonth(now.getMonth() - 3));
      case 'Semestre':  return new Date(now.setMonth(now.getMonth() - 6));
      case 'Année':     return new Date(now.setFullYear(now.getFullYear() - 1));
      default:          return new Date(now.setMonth(now.getMonth() - 1)); // Ce mois
    }
  }

  // ── Helper: بناء query مع الفلاتر ────────────────────────────────────────
  private buildPerformanceQuery(filters: FilterDto) {
    const qb = this.performanceRepo
      .createQueryBuilder('perf')
      .leftJoinAndSelect('perf.formation', 'formation')
      .leftJoinAndSelect('perf.apprenant', 'apprenant')
      .leftJoinAndSelect('apprenant.user', 'user');

    // فلتر الـ periode
    const dateFrom = this.getDateFrom(filters.periode);
    if (dateFrom) {
      qb.andWhere('perf.date >= :dateFrom', { dateFrom });
    }

    // فلتر الـ formation (حسب الـ titre)
    if (filters.formation) {
      qb.andWhere('formation.titre = :formation', { formation: filters.formation });
    }

    // فلتر الـ statut (حسب statut الـ formation)
    if (filters.statut) {
      qb.andWhere('formation.statut = :statut', { statut: filters.statut.toLowerCase() });
    }

    // فلتر الـ type (حسب type الـ formation — لازم تضيفو للـ entity لاحقاً)
    if (filters.type) {
      qb.andWhere('formation.type = :type', { type: filters.type });
    }

    return qb;
  }

  // ══ 1. KPIs الرئيسية ══════════════════════════════════════════════════════
  async getKpis(filters: FilterDto) {
    const qb = this.buildPerformanceQuery(filters);
    const performances = await qb.getMany();

    // حساب الشهر الماضي للمقارنة
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const qbLastMonth = this.buildPerformanceQuery({ ...filters, periode: 'Ce mois' });
    qbLastMonth.andWhere('perf.date < :lastMonth', { lastMonth });
    const lastMonthPerfs = await qbLastMonth.getMany();

    // ── تاريخ الريوسيت ──
    const total = performances.length;
    const reussis = performances.filter(p => p.estReussi).length;
    const tauxReussiteGlobal = total > 0 ? Math.round((reussis / total) * 100) : 0;

    const totalLast = lastMonthPerfs.length;
    const reussisLast = lastMonthPerfs.filter(p => p.estReussi).length;
    const tauxReussiteLast = totalLast > 0 ? Math.round((reussisLast / totalLast) * 100) : 0;
    const evolutionReussite = tauxReussiteGlobal - tauxReussiteLast;

    // ── تاريخ الـ abandon (عدم النجاح) ──
    const abandonnes = performances.filter(p => !p.estReussi).length;
    const tauxAbandon = total > 0 ? Math.round((abandonnes / total) * 100) : 0;

    const abandonnesLast = lastMonthPerfs.filter(p => !p.estReussi).length;
    const tauxAbandonLast = totalLast > 0 ? Math.round((abandonnesLast / totalLast) * 100) : 0;
    const evolutionAbandon = tauxAbandon - tauxAbandonLast;

    // ── Satisfaction (متوسط الـ note على 5) ──
    // APRÈS — depuis table satisfaction (correct)
const satisfactionResult = await this.satisfactionRepo.createQueryBuilder('s')
  .select('AVG(s.note)', 'avg')
  .where(filters.formation ? 'formation.titre = :f' : '1=1', 
         { f: filters.formation })
  .getRawOne();
const satisfactionMoyenne = parseFloat(satisfactionResult?.avg ?? '0');

    // ── Formations actives ──
    const formationsActives = await this.formationRepo.count({
      where: { statut: 'active' }
    });

    const formationsQuery = this.formationRepo.createQueryBuilder('f');
    if (filters.statut) formationsQuery.where('f.statut = :s', { s: filters.statut.toLowerCase() });
    const totalFormations = await formationsQuery.getCount();

    // ── Taux de complétion (apprenants ayant une note) ──
    const avecNote = performances.filter(p => p.note !== null).length;
    const tauxCompletion = total > 0 ? Math.round((avecNote / total) * 100) : 0;

    return {
      tauxReussiteGlobal,
      evolutionReussite,
      tauxAbandon,
      evolutionAbandon,
      satisfactionMoyenne,
      evolutionSatisfaction: 0.3, // TODO: calculer vs trimestre
      formationsActives,
      nouvellesFormations: 2,      // TODO: formations créées ce mois
      tauxCompletion,
    };
  }

  // ══ 2. Performances des formateurs ════════════════════════════════════════
  async getFormateursPerformances(filters: FilterDto) {
    const formateurs = await this.formateurRepo.find();
    const result: any[] = [];

    for (const formateur of formateurs) {
      // نجيب كل الـ formations المرتبطة بهذا الـ formateur
      // (لازم تضيف ManyToOne relation بين Formation و Formateur)
      const qb = this.buildPerformanceQuery(filters);

      if (filters.formateur && filters.formateur !== formateur.nom) continue;

      const performances = await qb.getMany();

      if (performances.length === 0) continue;

      const total = performances.length;
      const reussis = performances.filter(p => p.estReussi).length;
      const tauxReussite = total > 0 ? Math.round((reussis / total) * 100) : 0;
      const satisfaction = total > 0
        ? Math.round((performances.reduce((sum, p) => sum + Number(p.note), 0) / total / 4) * 10) / 10
        : 0;

      // Score d'efficacité = moyenne pondérée (réussite 60% + satisfaction 40%)
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

    // ترتيب تنازلي حسب الـ scoreEfficacite
    return result.sort((a, b) => b.scoreEfficacite - a.scoreEfficacite);
  }

  // ══ 3. Taux de réussite par formation ════════════════════════════════════
  async getFormationsTauxReussite(filters: FilterDto) {
    const formations = await this.formationRepo.find();
    const result: any[] = [];

    for (const formation of formations) {
      // فلتر حسب الـ formation
      if (filters.formation && formation.titre !== filters.formation) continue;
      if (filters.statut && formation.statut !== filters.statut.toLowerCase()) continue;

      // نجيب performances هذه الـ formation
      const qb = this.performanceRepo
        .createQueryBuilder('perf')
        .leftJoinAndSelect('perf.apprenant', 'apprenant')
        .where('perf.formation = :formationId', { formationId: formation.id });

      const dateFrom = this.getDateFrom(filters.periode);
      if (dateFrom) qb.andWhere('perf.date >= :dateFrom', { dateFrom });

      const performances = await qb.getMany();
      const total = performances.length;
      if (total === 0) continue;

      const reussis = performances.filter(p => p.estReussi).length;
      const abandonnes = performances.filter(p => !p.estReussi).length;
      const avecNote = performances.filter(p => p.note !== null).length;

      const tauxReussite = Math.round((reussis / total) * 100);
      const tauxAbandon = Math.round((abandonnes / total) * 100);
      const tauxCompletion = Math.round((avecNote / total) * 100);
      const satisfaction = total > 0
        ? Math.round((performances.reduce((sum, p) => sum + Number(p.note), 0) / total / 4) * 10) / 10
        : 0;

      result.push({
        formation: formation.titre,
        formateur: 'N/A', // TODO: بعد ما تضيف relation formateur → formation
        inscrits: total,
        tauxReussite,
        tauxAbandon,
        tauxCompletion,
        satisfaction,
        statut: formation.statut === 'active' ? 'Actif' : formation.statut === 'completed' ? 'Terminé' : 'Annulé',
        type: 'En ligne', // TODO: après ma تضيف type للـ entity
      });
    }

    return result;
  }

  // ══ 4. Apprenants à risque ════════════════════════════════════════════════
  async getApprenantsARisque(filters: FilterDto) {
    const qb = this.buildPerformanceQuery(filters);

    // نجيب فقط اللي ما نجحوش
    qb.andWhere('perf.estReussi = :failed', { failed: false });

    const performances = await qb.getMany();

    // نجمع حسب الـ apprenant
    const map = new Map<number, { apprenant: any; formations: string[]; notes: number[] }>();

    for (const perf of performances) {
      const id = perf.apprenant.id;
      let entry = map.get(id);
      if (!entry) {
        entry = {
          apprenant: perf.apprenant,
          formations: [],
          notes: [],
        };
        map.set(id, entry);
      }
      entry.formations.push(perf.formation.titre);
      entry.notes.push(Number(perf.note));
    }

    // نبني قائمة الـ apprenants à risque
    return Array.from(map.values()).map(({ apprenant, formations, notes }) => {
      const moyenneNote = notes.reduce((a, b) => a + b, 0) / notes.length;
      const progression = Math.round((moyenneNote / 20) * 100); // note /20 → %

      // تحديد سبب الخطر
      let raison = 'Notes insuffisantes';
      if (moyenneNote < 5) raison = 'Notes très basses';
      else if (formations.length > 1) raison = 'Échecs multiples';

      return {
        nom: `${apprenant.user?.prenom ?? ''} ${apprenant.user?.nom ?? ''}`.trim() || 'Inconnu',
        formation: formations[0], // الـ formation الأولى
        raison,
        progression,
      };
    });
  }

  // ══ 5. Options des filtres (dropdowns dynamiques) ════════════════════════
  async getFiltersOptions() {
    const formations = await this.formationRepo.find({ select: ['titre'] });
    const formateurs = await this.formateurRepo.find({ select: ['nom', 'prenom'] });

    return {
      formations: ['Tous', ...formations.map(f => f.titre)],
      formateurs: ['Tous', ...formateurs.map(f => `${f.prenom} ${f.nom}`)],
      types: ['Tous', 'En ligne', 'Présentiel'],
      statuts: ['Tous', 'Actif', 'Terminé', 'Annulé'],
    };
  }
}
