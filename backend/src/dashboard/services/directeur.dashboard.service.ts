// ============================================================================
// directeur.dashboard.service.ts  (RÉVISÉ — Avril 2026)
//
// Changements vs version précédente:
//   ✅ getOverview()     → + totalSessions, sessionsActives, tauxRemplissageMoyen
//   ✅ getKpis()         → formationsActives via sessions (statut='Actif'), pas formation.statut
//   ✅ getCoursesChart() → top formations par nbApprenants inscrits (via sessions)
//   ✅ getTopCourses()   → enrichi avec nbSessions + nbApprenants + revenus réels
//   ✅ Finance joins     → Finance → Session → Formation (sessionId est string/UUID)
// ============================================================================
// ============================================================================
// directeur.dashboard.service.ts  (RÉVISÉ v3 — Filtres complets)
//
// Changements vs v2:
//   ✅ Helper getPeriodeDates()  → calcule startDate/endDate selon periode
//   ✅ getOverview(filters)      → filtre par periode, formation, type
//   ✅ getKpis(filters)          → filtre par periode, formation, type
//   ✅ getEnrollmentsChart(f)    → filtre par formation, formateur, type
//   ✅ getRevenueChart(f)        → filtre par formation, formateur, type
//   ✅ getCoursesChart(f)        → filtre par statut, type
//   ✅ getTopCourses(f)          → filtre existant enrichi + type
//   ✅ getFinanceKpis(f)         → filtre par periode, formation
//   ✅ getFinanceDetails(f)      → filtre par periode, formation, statut
//   ✅ tables réelles            → formateur, performance, satisfaction (singulier)
//   ✅ sessions_apprenants       → avec 's' selon ta DB
// ============================================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { Apprenant } from '../../apprenants/entities/apprenant.entity';
import { Formation, FormationStatus } from '../../formations/entities/formation.entity';
import { Formateur } from '../../formateurs/entities/formateur.entity';
import { Finance } from '../../finances/entities/finance.entity';
import { Performance } from '../../performances/entities/performance.entity';
import { Satisfaction } from '../../satisfaction/entities/satisfaction.entity';
import { Session } from '../../sessions/entities/session.entity';
import { PaginationFilterDto } from '../dto/dashboard-filter.dto';

// ─── Helper types ─────────────────────────────────────────────────────────────

interface PeriodeDates {
  startDate: Date;
  endDate: Date;
  startDatePrev: Date;  // période précédente (pour comparaison)
  endDatePrev: Date;
}

@Injectable()
export class DirecteurDashboardService {
  constructor(
    @InjectRepository(Apprenant)
    private apprenantRepo: Repository<Apprenant>,

    @InjectRepository(Formation)
    private formationRepo: Repository<Formation>,

    @InjectRepository(Formateur)
    private formateurRepo: Repository<Formateur>,

    @InjectRepository(Finance)
    private financeRepo: Repository<Finance>,

    @InjectRepository(Performance)
    private performanceRepo: Repository<Performance>,

    @InjectRepository(Satisfaction)
    private satisfactionRepo: Repository<Satisfaction>,

    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // HELPER — Calcul des dates selon la période choisie
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Transforme le filtre `periode` en dates SQL concrètes.
   * Utilisé dans TOUTES les méthodes pour uniformiser le filtrage temporel.
   *
   * periode = 'month'    → ce mois / mois précédent
   * periode = 'quarter'  → ce trimestre / trimestre précédent
   * periode = 'semester' → ce semestre / semestre précédent
   * periode = 'year'     → cette année / année précédente
   * periode = undefined  → tout le temps (pas de filtre date)
   */
  private getPeriodeDates(periode?: string): PeriodeDates | null {
    if (!periode) return null;

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed

    let startDate: Date;
    let endDate: Date = now;
    let startDatePrev: Date;
    let endDatePrev: Date;

    switch (periode) {
      case 'month':
        startDate     = new Date(y, m, 1);
        startDatePrev = new Date(y, m - 1, 1);
        endDatePrev   = new Date(y, m, 0);
        break;

      case 'quarter':
        // trimestre courant: mois 0-2, 3-5, 6-8, 9-11
        const quarterStart = Math.floor(m / 3) * 3;
        startDate     = new Date(y, quarterStart, 1);
        startDatePrev = new Date(y, quarterStart - 3, 1);
        endDatePrev   = new Date(y, quarterStart, 0);
        break;

      case 'semester':
        // semestre courant: Jan-Jun ou Jul-Dec
        const semStart = m < 6 ? 0 : 6;
        startDate     = new Date(y, semStart, 1);
        startDatePrev = new Date(y, semStart - 6, 1);
        endDatePrev   = new Date(y, semStart, 0);
        break;

      case 'year':
        startDate     = new Date(y, 0, 1);
        startDatePrev = new Date(y - 1, 0, 1);
        endDatePrev   = new Date(y - 1, 11, 31, 23, 59, 59);
        break;

      default:
        return null; // pas de filtre date
    }

    return { startDate, endDate, startDatePrev, endDatePrev };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — OVERVIEW
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Totaux globaux filtrés.
   * - periode  → filtre les sessions et finances dans la période
   * - formation → filtre sur une formation spécifique
   * - type     → filtre sessions par type (présentiel / en_ligne)
   */
  async getOverview(filters: PaginationFilterDto = {}) {
    const dates = this.getPeriodeDates(filters.periode);

    // ── Base session QueryBuilder (réutilisé pour totalSessions + sessionsActives) ──
    const sessionQb = () => {
      const qb = this.sessionRepo.createQueryBuilder('session');
      if (dates) {
        qb.andWhere('session.date BETWEEN :start AND :end', {
          start: dates.startDate.toISOString().split('T')[0],
          end:   dates.endDate.toISOString().split('T')[0],
        });
      }
      if (filters.formation && filters.formation !== 'Tous') {
        qb.andWhere('session.formationId = (SELECT id FROM formations WHERE titre = :titre)', {
          titre: filters.formation,
        });
      }
      if (filters.type && filters.type !== 'Tous') {
        const typeMap: Record<string, string> = {
          'Présentiel': 'présentiel',
          'En ligne': 'en_ligne',
        };
        qb.andWhere('session.type = :type', { type: typeMap[filters.type] ?? filters.type });
      }
      return qb;
    };

    // ── Revenus filtrés ──────────────────────────────────────────────────────
    const revenusQb = this.financeRepo
      .createQueryBuilder('finance')
      .select('SUM(finance.montant)', 'total')
      .where("finance.type = 'paiement'");

    if (dates) {
      revenusQb.andWhere('finance.date BETWEEN :start AND :end', {
        start: dates.startDate,
        end:   dates.endDate,
      });
    }
    if (filters.formation && filters.formation !== 'Tous') {
      revenusQb
        .innerJoin('sessions', 'session', 'session.id = finance."sessionId"')
        .innerJoin('formations', 'formation', 'formation.id = session."formationId"')
        .andWhere('formation.titre = :titre', { titre: filters.formation });
    }

    const [
      totalApprenants,
      totalFormations,
      totalFormateurs,
      totalSessions,
      sessionsActives,
      revenusResult,
    ] = await Promise.all([
      this.apprenantRepo.count(),
      this.formationRepo.count(),
      this.formateurRepo.count(),
      sessionQb().getCount(),
      sessionQb().andWhere("session.statut = 'Actif'").getCount(),
      revenusQb.getRawOne(),
    ]);

    // Taux de remplissage (non filtré par période — stat globale)
    const remplissageResult = await this.sessionRepo
      .createQueryBuilder('session')
      .select(
        'AVG(CAST(sub.nb AS float) / NULLIF(session.capacite, 0) * 100)',
        'avg',
      )
      .innerJoin(
        (qb) =>
          qb
            .select('sa."sessionId"', 'sessionId')
            .addSelect('COUNT(*)', 'nb')
            .from('sessions_apprenants', 'sa')
            .groupBy('sa."sessionId"'),
        'sub',
        'sub."sessionId" = session.id',
      )
      .where('session.capacite IS NOT NULL')
      .andWhere('session.capacite > 0')
      .getRawOne();

    return {
      totalApprenants,
      totalFormations,
      totalFormateurs,
      totalSessions,
      sessionsActives,
      tauxRemplissageMoyen: parseFloat(
        parseFloat(remplissageResult?.avg ?? '0').toFixed(1),
      ),
      revenuTotal: parseFloat(revenusResult?.total ?? '0'),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — KPIs
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * KPIs avec filtres complets.
   * - periode  → toutes les métriques temporelles respectent la période
   * - formation → taux réussite et formations actives filtrés
   * - type     → filtre sur le type de session
   */
  async getKpis(filters: PaginationFilterDto = {}) {
    const now = new Date();

    // Dates courantes selon filtre
    const dates = this.getPeriodeDates(filters.periode) ?? {
      startDate:     new Date(now.getFullYear(), now.getMonth(), 1),
      endDate:       now,
      startDatePrev: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endDatePrev:   new Date(now.getFullYear(), now.getMonth(), 0),
    };

    // ── Apprenants dans la période ───────────────────────────────────────────
    const apprenantsCePeriode = await this.apprenantRepo.count({
      where: { dateAccepted: Between(dates.startDate, dates.endDate) },
    });

    const apprenantsPeriodePrev = await this.apprenantRepo.count({
      where: { dateAccepted: Between(dates.startDatePrev, dates.endDatePrev) },
    });

    // ── Formations actives dans la période ───────────────────────────────────
    const formationsActivesQb = this.sessionRepo
      .createQueryBuilder('session')
      .select('COUNT(DISTINCT session.formationId)', 'count')
      .where("session.statut = 'Actif'")
      .andWhere('session.date BETWEEN :start AND :end', {
        start: dates.startDate.toISOString().split('T')[0],
        end:   dates.endDate.toISOString().split('T')[0],
      });

    if (filters.formation && filters.formation !== 'Tous') {
      formationsActivesQb.andWhere(
        'session.formationId = (SELECT id FROM formations WHERE titre = :titre)',
        { titre: filters.formation },
      );
    }
    if (filters.type && filters.type !== 'Tous') {
      const typeMap: Record<string, string> = { 'Présentiel': 'présentiel', 'En ligne': 'en_ligne' };
      formationsActivesQb.andWhere('session.type = :type', {
        type: typeMap[filters.type] ?? filters.type,
      });
    }

    const formationsActivesResult = await formationsActivesQb.getRawOne();
    const formationsActives = parseInt(formationsActivesResult?.count ?? '0');

    // ── Performances filtrées ────────────────────────────────────────────────
    const perfQb = () => {
      const qb = this.performanceRepo.createQueryBuilder('perf');
      if (filters.formation && filters.formation !== 'Tous') {
        qb.innerJoin('perf.formation', 'formation')
          .andWhere('formation.titre = :titre', { titre: filters.formation });
      }
      return qb;
    };

    const [totalPerformances, performancesReussies] = await Promise.all([
      perfQb().getCount(),
      perfQb().andWhere('perf.estReussi = true').getCount(),
    ]);

    // ── Revenu mensuel filtré ────────────────────────────────────────────────
    const revenuQb = this.financeRepo
      .createQueryBuilder('finance')
      .select('SUM(finance.montant)', 'total')
      .where("finance.type = 'paiement'")
      .andWhere('finance.date BETWEEN :start AND :end', {
        start: dates.startDate,
        end:   dates.endDate,
      });

    if (filters.formation && filters.formation !== 'Tous') {
      revenuQb
        .innerJoin('sessions', 'session', 'session.id = finance."sessionId"')
        .innerJoin('formations', 'formation', 'formation.id = session."formationId"')
        .andWhere('formation.titre = :titre', { titre: filters.formation });
    }

    const revenuResult = await revenuQb.getRawOne();

    // ── Satisfaction filtrée ─────────────────────────────────────────────────
    const satQb = this.satisfactionRepo
      .createQueryBuilder('s')
      .select('AVG(s.note)', 'avg');

    if (filters.formation && filters.formation !== 'Tous') {
      satQb
        .innerJoin('s.formation', 'formation')
        .andWhere('formation.titre = :titre', { titre: filters.formation });
    }

    const satisfactionResult = await satQb.getRawOne();

    // ── Calculs ──────────────────────────────────────────────────────────────
    const tauxCroissance =
      apprenantsPeriodePrev === 0
        ? 100
        : parseFloat(
            (
              ((apprenantsCePeriode - apprenantsPeriodePrev) /
                apprenantsPeriodePrev) *
              100
            ).toFixed(2),
          );

    const tauxReussite =
      totalPerformances === 0
        ? 0
        : parseFloat(
            ((performancesReussies / totalPerformances) * 100).toFixed(2),
          );

    return {
      tauxCroissanceApprenants: tauxCroissance,
      formationsActives,
      tauxReussite,
      satisfactionMoyenne: parseFloat(
        parseFloat(satisfactionResult?.avg ?? '0').toFixed(1),
      ),
      revenuMensuel: parseFloat(revenuResult?.total ?? '0'),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — GRAPHIQUES
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Inscriptions par mois — filtrées par formation, formateur, type.
   */
  async getEnrollmentsChart(filters: PaginationFilterDto = {}) {
    const qb = this.sessionRepo
      .createQueryBuilder('session')
      .select("TO_CHAR(session.date::date, 'Mon')", 'month')
      .addSelect('EXTRACT(MONTH FROM session.date::date)', 'monthNum')
      .addSelect('COUNT(sa."apprenantId")', 'total')
      .innerJoin('sessions_apprenants', 'sa', 'sa."sessionId" = session.id')
      .where("session.date::date >= NOW() - INTERVAL '6 months'");

    if (filters.formation && filters.formation !== 'Tous') {
      qb.innerJoin('formations', 'fo', 'fo.id = session."formationId"')
        .andWhere('fo.titre = :titre', { titre: filters.formation });
    }
    if (filters.formateur && filters.formateur !== 'Tous') {
      qb.innerJoin('formateur', 'fmt', 'fmt.id = session."formateurId"')
        .andWhere("CONCAT(fmt.prenom, ' ', fmt.nom) = :formateur", {
          formateur: filters.formateur,
        });
    }
    if (filters.type && filters.type !== 'Tous') {
      const typeMap: Record<string, string> = { 'Présentiel': 'présentiel', 'En ligne': 'en_ligne' };
      qb.andWhere('session.type = :type', { type: typeMap[filters.type] ?? filters.type });
    }

    const result = await qb
      .groupBy("TO_CHAR(session.date::date, 'Mon')")
      .addGroupBy('EXTRACT(MONTH FROM session.date::date)')
      .orderBy('EXTRACT(MONTH FROM session.date::date)', 'ASC')
      .getRawMany();

    return {
      labels: result.map((r) => r.month),
      datasets: [
        {
          label: 'Inscriptions sessions',
          data: result.map((r) => parseInt(r.total)),
          backgroundColor: '#4ade80',
        },
      ],
    };
  }

  /**
   * Revenus par mois — filtrés par formation, formateur, type.
   */
  async getRevenueChart(filters: PaginationFilterDto = {}) {
    const qb = this.financeRepo
      .createQueryBuilder('finance')
      .select("TO_CHAR(finance.date, 'Mon')", 'month')
      .addSelect('EXTRACT(MONTH FROM finance.date)', 'monthNum')
      .addSelect('SUM(finance.montant)', 'total')
      .where("finance.date >= NOW() - INTERVAL '6 months'")
      .andWhere("finance.type = 'paiement'");

    // Si on filtre par formation ou formateur, on doit joindre sessions
    if (
      (filters.formation && filters.formation !== 'Tous') ||
      (filters.formateur && filters.formateur !== 'Tous') ||
      (filters.type && filters.type !== 'Tous')
    ) {
      qb.innerJoin('sessions', 'session', 'session.id = finance."sessionId"');

      if (filters.formation && filters.formation !== 'Tous') {
        qb.innerJoin('formations', 'fo', 'fo.id = session."formationId"')
          .andWhere('fo.titre = :titre', { titre: filters.formation });
      }
      if (filters.formateur && filters.formateur !== 'Tous') {
        qb.innerJoin('formateur', 'fmt', 'fmt.id = session."formateurId"')
          .andWhere("CONCAT(fmt.prenom, ' ', fmt.nom) = :formateur", {
            formateur: filters.formateur,
          });
      }
      if (filters.type && filters.type !== 'Tous') {
        const typeMap: Record<string, string> = { 'Présentiel': 'présentiel', 'En ligne': 'en_ligne' };
        qb.andWhere('session.type = :type', { type: typeMap[filters.type] ?? filters.type });
      }
    }

    const result = await qb
      .groupBy("TO_CHAR(finance.date, 'Mon')")
      .addGroupBy('EXTRACT(MONTH FROM finance.date)')
      .orderBy('EXTRACT(MONTH FROM finance.date)', 'ASC')
      .getRawMany();

    return {
      labels: result.map((r) => r.month),
      datasets: [
        {
          label: 'Revenus (DT)',
          data: result.map((r) => parseFloat(r.total)),
          borderColor: '#16a34a',
          backgroundColor: 'rgba(16,164,74,0.2)',
          tension: 0.3,
        },
      ],
    };
  }

  /**
   * Top formations par nbApprenants — filtré par statut et type.
   */
  async getCoursesChart(filters: PaginationFilterDto = {}) {
    const qb = this.formationRepo
      .createQueryBuilder('formation')
      .select('formation.titre', 'titre')
      .addSelect('COUNT(DISTINCT sa."apprenantId")', 'nbApprenants')
      .leftJoin('formation.sessions', 'session')
      .leftJoin('sessions_apprenants', 'sa', 'sa."sessionId" = session.id');

    if (filters.statut && filters.statut !== 'Tous') {
      qb.where('formation.statut = :statut', { statut: filters.statut });
    }
    if (filters.type && filters.type !== 'Tous') {
      const typeMap: Record<string, string> = { 'Présentiel': 'présentiel', 'En ligne': 'en_ligne' };
      qb.andWhere('session.type = :type', { type: typeMap[filters.type] ?? filters.type });
    }

    const result = await qb
      .groupBy('formation.id')
      .addGroupBy('formation.titre')
      .orderBy('COUNT(DISTINCT sa."apprenantId")', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      labels: result.map((r) => r.titre),
      datasets: [
        {
          label: 'Apprenants inscrits',
          data: result.map((r) => parseInt(r.nbApprenants ?? '0')),
          backgroundColor: ['#a7f3d0', '#86efac', '#22c55e', '#15803d', '#166534'],
        },
      ],
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — TABLE TOP FORMATIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Table formations enrichie — tous les filtres appliqués.
   */
  async getTopCourses(filters: PaginationFilterDto = {}) {
    const {
      page = 1,
      limit = 5,
      sortBy = 'nbApprenants',
      sortDir = 'DESC',
      statut,
      formation,
      type,
    } = filters;

    const dates = this.getPeriodeDates(filters.periode);

    const qb = this.formationRepo
      .createQueryBuilder('formation')
      .select('formation.id', 'id')
      .addSelect('formation.titre', 'formation')
      .addSelect('formation.statut', 'statut')
      .addSelect('COUNT(DISTINCT session.id)', 'nbSessions')
      .addSelect('COUNT(DISTINCT sa."apprenantId")', 'nbApprenants')
      .addSelect(
        "COALESCE(SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END), 0)",
        'revenus',
      )
      .leftJoin('formation.sessions', 'session')
      .leftJoin('sessions_apprenants', 'sa', 'sa."sessionId" = session.id')
      .leftJoin('finances', 'finance', 'finance."sessionId" = session.id');

    if (statut && statut !== 'Tous') {
      qb.where('formation.statut = :statut', { statut });
    }
    if (formation && formation !== 'Tous') {
      qb.andWhere('formation.titre ILIKE :formation', { formation: `%${formation}%` });
    }
    if (type && type !== 'Tous') {
      const typeMap: Record<string, string> = { 'Présentiel': 'présentiel', 'En ligne': 'en_ligne' };
      qb.andWhere('session.type = :type', { type: typeMap[type] ?? type });
    }
    if (dates) {
      qb.andWhere('session.date BETWEEN :start AND :end', {
        start: dates.startDate.toISOString().split('T')[0],
        end:   dates.endDate.toISOString().split('T')[0],
      });
    }

    qb.groupBy('formation.id')
      .addGroupBy('formation.titre')
      .addGroupBy('formation.statut');

    const sortMap: Record<string, string> = {
      nbApprenants: 'COUNT(DISTINCT sa."apprenantId")',
      nbSessions:   'COUNT(DISTINCT session.id)',
      revenus:      "COALESCE(SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END), 0)",
      formation:    'formation.titre',
    };
    qb.orderBy(sortMap[sortBy] ?? sortMap['nbApprenants'], sortDir);

    const rawAll = await qb.getRawMany();

    // Taux de réussite par formation
    const reussiteMap = new Map<number, number>();
    const perfQb = this.performanceRepo
      .createQueryBuilder('perf')
      .select('perf.formationId', 'formationId')
      .addSelect(
        'COUNT(CASE WHEN perf.estReussi = true THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)',
        'taux',
      )
      .groupBy('perf.formationId');

    if (formation && formation !== 'Tous') {
      perfQb
        .innerJoin('perf.formation', 'fo')
        .andWhere('fo.titre ILIKE :formation', { formation: `%${formation}%` });
    }

    const perfData = await perfQb.getRawMany();
    for (const p of perfData) {
      reussiteMap.set(
        parseInt(p.formationId),
        parseFloat(parseFloat(p.taux ?? '0').toFixed(1)),
      );
    }

    const enriched = rawAll.map((r) => ({
      formation:    r.formation,
      statut:       r.statut,
      nbSessions:   parseInt(r.nbSessions ?? '0'),
      nbApprenants: parseInt(r.nbApprenants ?? '0'),
      revenus:      parseFloat(parseFloat(r.revenus ?? '0').toFixed(2)),
      tauxReussite: reussiteMap.get(parseInt(r.id)) ?? null,
    }));

    const total = enriched.length;
    const data  = enriched.slice((page - 1) * limit, page * limit);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Top apprenants — inchangé.
   */
  async getTopStudents(filters: PaginationFilterDto = {}) {
    const { page = 1, limit = 5, sortBy = 'dateAccepted', sortDir = 'DESC', statut } = filters;

    const qb = this.apprenantRepo
      .createQueryBuilder('apprenant')
      .leftJoinAndSelect('apprenant.user', 'user')
      .orderBy(`apprenant.${sortBy}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    if (statut) qb.where('apprenant.statut = :statut', { statut });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Inscriptions récentes — inchangé.
   */
  async getRecentEnrollments(filters: PaginationFilterDto = {}) {
    const { page = 1, limit = 5, periode, statut } = filters;

    const now = new Date();
    let startDate: Date;

    switch (periode) {
      case 'week':    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7); break;
      case 'quarter': startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1); break;
      case 'year':    startDate = new Date(now.getFullYear(), 0, 1); break;
      case 'month':
      default:        startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
    }

    const qb = this.apprenantRepo
      .createQueryBuilder('apprenant')
      .leftJoinAndSelect('apprenant.user', 'user')
      .where('apprenant.dateAccepted >= :startDate', { startDate })
      .orderBy('apprenant.dateAccepted', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (statut) qb.andWhere('apprenant.statut = :statut', { statut });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — FINANCES
  // ══════════════════════════════════════════════════════════════════════════

  async getFinanceKpis(filters: PaginationFilterDto = {}) {
    const now   = new Date();
    const dates = this.getPeriodeDates(filters.periode) ?? {
      startDate:     new Date(now.getFullYear(), now.getMonth(), 1),
      endDate:       now,
      startDatePrev: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endDatePrev:   new Date(now.getFullYear(), now.getMonth(), 0),
    };

    const buildFinQb = (start: Date, end: Date, type: string) => {
      const qb = this.financeRepo
        .createQueryBuilder('finance')
        .select('SUM(finance.montant)', 'total')
        .where(`finance.type = '${type}'`)
        .andWhere('finance.date BETWEEN :start AND :end', { start, end });

      if (filters.formation && filters.formation !== 'Tous') {
        qb.innerJoin('sessions', 'session', 'session.id = finance."sessionId"')
          .innerJoin('formations', 'formation', 'formation.id = session."formationId"')
          .andWhere('formation.titre = :titre', { titre: filters.formation });
      }
      return qb;
    };

    const [
      revenuTotalResult,
      coutTotalResult,
      revenuCePeriodeResult,
      revenuPeriodePrevResult,
      formationPlusRentable,
    ] = await Promise.all([
      // Totaux sans filtre de période
      this.financeRepo.createQueryBuilder('f').select('SUM(f.montant)', 'total').where("f.type = 'paiement'").getRawOne(),
      this.financeRepo.createQueryBuilder('f').select('SUM(f.montant)', 'total').where("f.type = 'remboursement'").getRawOne(),

      buildFinQb(dates.startDate, dates.endDate, 'paiement').getRawOne(),
      buildFinQb(dates.startDatePrev, dates.endDatePrev, 'paiement').getRawOne(),

      // Formation la plus rentable
      this.financeRepo
        .createQueryBuilder('finance')
        .select('formation.titre', 'titre')
        .addSelect('SUM(finance.montant)', 'total')
        .innerJoin('sessions', 'session', 'session.id = finance."sessionId"')
        .innerJoin('formations', 'formation', 'formation.id = session."formationId"')
        .where("finance.type = 'paiement'")
        .andWhere('finance."sessionId" IS NOT NULL')
        .groupBy('formation.id')
        .addGroupBy('formation.titre')
        .orderBy('SUM(finance.montant)', 'DESC')
        .limit(1)
        .getRawOne(),
    ]);

    const revenuTotal     = parseFloat(revenuTotalResult?.total ?? '0');
    const coutTotal       = parseFloat(coutTotalResult?.total ?? '0');
    const profitTotal     = revenuTotal - coutTotal;
    const revenuCePeriode = parseFloat(revenuCePeriodeResult?.total ?? '0');
    const revenuPeriodePrev = parseFloat(revenuPeriodePrevResult?.total ?? '0');

    const evolutionRevenu =
      revenuPeriodePrev === 0
        ? 100
        : parseFloat(
            (((revenuCePeriode - revenuPeriodePrev) / revenuPeriodePrev) * 100).toFixed(2),
          );

    return {
      revenuTotal,
      coutTotal,
      profitTotal,
      margeGlobale: revenuTotal === 0 ? 0 : parseFloat(((profitTotal / revenuTotal) * 100).toFixed(2)),
      evolutionRevenu,
      revenuCeMois: revenuCePeriode,
      formationPlusRentable: formationPlusRentable?.titre ?? '—',
      profitFormationPlusRentable: parseFloat(formationPlusRentable?.total ?? '0'),
    };
  }

  async getFinanceDetails(filters: PaginationFilterDto = {}) {
    const { page = 1, limit = 5, sortBy = 'revenus', sortDir = 'DESC' } = filters;
    const dates = this.getPeriodeDates(filters.periode);

    const qb = this.financeRepo
      .createQueryBuilder('finance')
      .select('formation.titre', 'formation')
      .addSelect('formation.statut', 'statut')
      .addSelect(
        "SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END)", 'revenus',
      )
      .addSelect(
        "SUM(CASE WHEN finance.type = 'remboursement' THEN finance.montant ELSE 0 END)", 'couts',
      )
      .addSelect(
        "SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END) - " +
        "SUM(CASE WHEN finance.type = 'remboursement' THEN finance.montant ELSE 0 END)", 'profit',
      )
      .innerJoin('sessions', 'session', 'session.id = finance."sessionId"')
      .innerJoin('formations', 'formation', 'formation.id = session."formationId"')
      .where('finance."sessionId" IS NOT NULL');

    if (dates) {
      qb.andWhere('finance.date BETWEEN :start AND :end', {
        start: dates.startDate,
        end:   dates.endDate,
      });
    }
    if (filters.formation && filters.formation !== 'Tous') {
      qb.andWhere('formation.titre ILIKE :formation', { formation: `%${filters.formation}%` });
    }

    qb.groupBy('formation.id')
      .addGroupBy('formation.titre')
      .addGroupBy('formation.statut')
      .orderBy(
        sortBy === 'profit'
          ? "SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END) - SUM(CASE WHEN finance.type = 'remboursement' THEN finance.montant ELSE 0 END)"
          : sortBy === 'revenus'
            ? "SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END)"
            : 'formation.titre',
        sortDir,
      );

    let result = await qb.getRawMany();

    if (filters.statut && filters.statut !== 'Tous') {
      result = result.filter(
        (r) => r.statut?.toLowerCase() === filters.statut?.toLowerCase(),
      );
    }

    const withMarge = result.map((r) => {
      const revenus = parseFloat(r.revenus ?? '0');
      const couts   = parseFloat(r.couts ?? '0');
      const profit  = parseFloat(r.profit ?? '0');
      return {
        formation: r.formation,
        revenus,
        couts,
        profit,
        marge: revenus === 0 ? 0 : parseFloat(((profit / revenus) * 100).toFixed(2)),
        statut: r.statut,
      };
    });

    const total     = withMarge.length;
    const paginated = withMarge.slice((page - 1) * limit, page * limit);
    return { data: paginated, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6 — ALERTES (pas de filtre — toujours globales)
  // ══════════════════════════════════════════════════════════════════════════

  async getAlerts() {
    const alerts: any[] = [];
    let idCounter = 1;

    const formationsReussite = await this.performanceRepo
      .createQueryBuilder('perf')
      .select('formation.titre', 'titre')
      .addSelect(
        'COUNT(CASE WHEN perf.estReussi = true THEN 1 END) * 100.0 / COUNT(*)', 'tauxReussite',
      )
      .innerJoin('perf.formation', 'formation')
      .groupBy('formation.titre')
      .having('COUNT(CASE WHEN perf.estReussi = true THEN 1 END) * 100.0 / COUNT(*) < 70')
      .getRawMany();

    for (const f of formationsReussite) {
      const taux = parseFloat(parseFloat(f.tauxReussite).toFixed(1));
      alerts.push({
        id: String(idCounter++), type: taux < 50 ? 'Critique' : 'Avertissement',
        titre: 'Taux de réussite faible',
        description: `La formation "${f.titre}" a un taux de réussite de ${taux}%`,
        formation: f.titre, date: new Date().toISOString().split('T')[0],
        priorite: taux < 50 ? 9 : 6, statut: 'Non traité',
        details: `Taux: ${taux}%. Seuil: 70%. Recommandation: revoir le contenu pédagogique.`,
      });
    }

    const apprenantsFaibles = await this.performanceRepo
      .createQueryBuilder('perf').select('COUNT(*)', 'total').where('perf.note < 10').getRawOne();
    const nbFaibles = parseInt(apprenantsFaibles?.total ?? '0');
    if (nbFaibles > 0) {
      alerts.push({
        id: String(idCounter++), type: 'Avertissement', titre: 'Apprenants en difficulté',
        description: `${nbFaibles} apprenant(s) ont une note inférieure à 10`,
        formation: 'Toutes', date: new Date().toISOString().split('T')[0],
        priorite: 7, statut: 'Non traité',
        details: `${nbFaibles} apprenants ont échoué. Recommandation: tutorat ou révision.`,
      });
    }

    const formationsSatFaible = await this.satisfactionRepo
      .createQueryBuilder('s')
      .select('formation.titre', 'titre')
      .addSelect('AVG(s.note)', 'moyenneSatisfaction')
      .innerJoin('s.formation', 'formation')
      .groupBy('formation.titre')
      .having('AVG(s.note) < 3')
      .getRawMany();

    for (const f of formationsSatFaible) {
      const moy = parseFloat(parseFloat(f.moyenneSatisfaction).toFixed(1));
      alerts.push({
        id: String(idCounter++), type: 'Avertissement', titre: 'Satisfaction faible',
        description: `La formation "${f.titre}" a une satisfaction moyenne de ${moy}/5`,
        formation: f.titre, date: new Date().toISOString().split('T')[0],
        priorite: 6, statut: 'Non traité',
        details: `Satisfaction: ${moy}/5. Seuil: 3/5. Envisager une révision du programme.`,
      });
    }

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0);

    const [revenuCeMois, revenuMoisDernier] = await Promise.all([
      this.financeRepo.createQueryBuilder('f').select('SUM(f.montant)', 'total')
        .where("f.type = 'paiement'").andWhere('f.date BETWEEN :s AND :e', { s: startOfThisMonth, e: now }).getRawOne(),
      this.financeRepo.createQueryBuilder('f').select('SUM(f.montant)', 'total')
        .where("f.type = 'paiement'").andWhere('f.date BETWEEN :s AND :e', { s: startOfLastMonth, e: endOfLastMonth }).getRawOne(),
    ]);

    const rCeMois     = parseFloat(revenuCeMois?.total ?? '0');
    const rMoisDernier = parseFloat(revenuMoisDernier?.total ?? '0');

    if (rMoisDernier > 0 && rCeMois < rMoisDernier * 0.8) {
      const baisse = (((rMoisDernier - rCeMois) / rMoisDernier) * 100).toFixed(1);
      alerts.push({
        id: String(idCounter++), type: 'Critique', titre: 'Revenus en baisse',
        description: `Les revenus ont chuté de ${baisse}% par rapport au mois dernier`,
        formation: 'Toutes', date: new Date().toISOString().split('T')[0],
        priorite: 9, statut: 'Non traité',
        details: `Ce mois: ${rCeMois.toLocaleString()} DT. Mois dernier: ${rMoisDernier.toLocaleString()} DT.`,
      });
    }

    const inscriptionsCeMois = await this.apprenantRepo.count({
      where: { dateAccepted: Between(startOfThisMonth, now) },
    });
    if (inscriptionsCeMois === 0) {
      alerts.push({
        id: String(idCounter++), type: 'Information', titre: 'Aucune inscription ce mois',
        description: 'Aucun nouvel apprenant inscrit ce mois',
        formation: 'Toutes', date: new Date().toISOString().split('T')[0],
        priorite: 4, statut: 'Non traité',
        details: 'Pensez à relancer une campagne de communication.',
      });
    }

    const sessionsOrphelines = await this.sessionRepo
      .createQueryBuilder('session').select('COUNT(*)', 'total')
      .where('session.formateurId IS NULL').andWhere("session.statut = 'Actif'").getRawOne();
    const nbOrphelines = parseInt(sessionsOrphelines?.total ?? '0');
    if (nbOrphelines > 0) {
      alerts.push({
        id: String(idCounter++), type: 'Avertissement', titre: 'Sessions sans formateur',
        description: `${nbOrphelines} session(s) active(s) n'ont pas de formateur assigné`,
        formation: 'Toutes', date: new Date().toISOString().split('T')[0],
        priorite: 8, statut: 'Non traité',
        details: `${nbOrphelines} sessions actives sans formateur. Action requise avant la date de la session.`,
      });
    }

    alerts.sort((a, b) => b.priorite - a.priorite);

    return {
      alerts,
      counts: {
        critique:      alerts.filter((a) => a.type === 'Critique').length,
        avertissement: alerts.filter((a) => a.type === 'Avertissement').length,
        information:   alerts.filter((a) => a.type === 'Information').length,
        nonTraite:     alerts.filter((a) => a.statut === 'Non traité').length,
      },
    };
  }
}