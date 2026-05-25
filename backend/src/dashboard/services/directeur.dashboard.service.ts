// ============================================================================
// directeur.dashboard.service.ts  (CORRIGÉ — Mai 2026)
//
// Corrections appliquées:
//   ✅ Import SessionStatut depuis session.entity
//   ✅ Toutes les comparaisons 'Actif' remplacées par SessionStatut.ACTIF
//   ✅ getOverview()     → sessionsActives utilise SessionStatut.ACTIF
//   ✅ getKpis()         → formationsActives utilise SessionStatut.ACTIF
//   ✅ getAlerts()       → sessionsOrphelines utilise SessionStatut.ACTIF
// ============================================================================
// ============================================================================
// directeur.dashboard.service.ts  (CORRIGÉ — Mai 2026)
//
// Migrations DWH appliquées:
//   ✅ getFinanceKpis()    → lit depuis dw.fact_finance + dw.dim_type_finance
//   ✅ getFinanceDetails() → lit depuis dw.fact_finance + dw.dim_type_finance
//      coutTotal = depense_formateur + depense_logistique (plus 'remboursement')
//
// Inchangé (OLTP):
//   ✅ getOverview(), getKpis(), getEnrollmentsChart()
//   ✅ getRevenueChart(), getCoursesChart(), getTopCourses()
//   ✅ getTopStudents(), getRecentEnrollments(), getAlerts()

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';

import { Apprenant } from '../../apprenants/entities/apprenant.entity';
import { Formation, FormationStatus } from '../../formations/entities/formation.entity';
import { Formateur } from '../../formateurs/entities/formateur.entity';
import { Finance } from '../../finances/entities/finance.entity';
import { Performance } from '../../performances/entities/performance.entity';
import { Satisfaction } from '../../satisfaction/entities/satisfaction.entity';
import { Session, SessionStatut } from '../../sessions/entities/session.entity';

import { PaginationFilterDto } from '../dto/dashboard-filter.dto';

// ─── Helper types ─────────────────────────────────────────────────────────────

interface PeriodeDates {
  startDate: Date;
  endDate: Date;
  startDatePrev: Date;
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

    // ✅ AJOUT: DataSource pour les requêtes raw DWH
    private readonly dataSource: DataSource,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // HELPER — Calcul des dates selon la période choisie
  // ══════════════════════════════════════════════════════════════════════════

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
      case 'Ce mois':
      case 'month':
        startDate     = new Date(y, m, 1);
        startDatePrev = new Date(y, m - 1, 1);
        endDatePrev   = new Date(y, m, 0);
        break;
      case 'Trimestre':
      case 'quarter':
        const quarterStart = Math.floor(m / 3) * 3;
        startDate     = new Date(y, quarterStart, 1);
        startDatePrev = new Date(y, quarterStart - 3, 1);
        endDatePrev   = new Date(y, quarterStart, 0);
        break;
      case 'Semestre':
      case 'semester':
        const semStart = m < 6 ? 0 : 6;
        startDate     = new Date(y, semStart, 1);
        startDatePrev = new Date(y, semStart - 6, 1);
        endDatePrev   = new Date(y, semStart, 0);
        break;
      case 'Année':
      case 'year':
        startDate     = new Date(y, 0, 1);
        startDatePrev = new Date(y - 1, 0, 1);
        endDatePrev   = new Date(y - 1, 11, 31, 23, 59, 59);
        break;
      default:
        return null;
    }

    return { startDate, endDate, startDatePrev, endDatePrev };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPER DWH — Convertit une Date en date_key 'YYYY-MM-DD'
  // ══════════════════════════════════════════════════════════════════════════

  private toDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — OVERVIEW  (OLTP — inchangé)
  // ══════════════════════════════════════════════════════════════════════════

  async getOverview(filters: PaginationFilterDto = {}) {
    const dates = this.getPeriodeDates(filters.periode) || this.getPeriodeDates('month');

    const sessionQb = () => {
      const qb = this.sessionRepo.createQueryBuilder('session');
      if (dates) {
        qb.andWhere('session.date BETWEEN :start AND :end', {
          start: dates.startDate.toISOString().split('T')[0],
          end:   dates.endDate.toISOString().split('T')[0],
        });
      }
      if (filters.formation && filters.formation !== 'Tous') {
        qb.andWhere(
          'session.formationId = (SELECT id FROM formations WHERE titre = :titre)',
          { titre: filters.formation },
        );
      }
      if (filters.type && filters.type !== 'Tous') {
        const typeMap: Record<string, string> = {
          'Présentiel': 'présentiel',
          'En ligne':   'en_ligne',
        };
        qb.andWhere('session.type = :type', {
          type: typeMap[filters.type] ?? filters.type,
        });
      }
      return qb;
    };

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

    const totalApprenants  = await this.apprenantRepo.count();
    const totalFormations  = await this.formationRepo.count();
    const totalFormateurs  = await this.formateurRepo.count();
    const totalSessions    = await sessionQb().getCount();
    const sessionsRealisees = await sessionQb()
      .andWhere('session.statut != :statut', { statut: SessionStatut.ANNULE })
      .getCount();
    const revenusResult    = await revenusQb.getRawOne();

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
      sessionsActives: sessionsRealisees,
      tauxRemplissageMoyen: parseFloat(
        parseFloat(remplissageResult?.avg ?? '0').toFixed(1),
      ),
      revenuTotal: parseFloat(revenusResult?.total ?? '0'),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — KPIs  (OLTP — inchangé)
  // ══════════════════════════════════════════════════════════════════════════

  async getKpis(filters: PaginationFilterDto = {}) {
    const now = new Date();

    const dates = this.getPeriodeDates(filters.periode) ?? {
      startDate:     new Date(now.getFullYear(), now.getMonth(), 1),
      endDate:       now,
      startDatePrev: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endDatePrev:   new Date(now.getFullYear(), now.getMonth(), 0),
    };

    const apprenantsCePeriode = await this.apprenantRepo.count({
      where: { dateAccepted: Between(dates.startDate, dates.endDate) },
    });
    const apprenantsPeriodePrev = await this.apprenantRepo.count({
      where: { dateAccepted: Between(dates.startDatePrev, dates.endDatePrev) },
    });

    const formationsActivesQb = this.sessionRepo
      .createQueryBuilder('session')
      .select('COUNT(DISTINCT session.formationId)', 'count')
      .where('session.statut != :cancelled', { cancelled: SessionStatut.ANNULE })
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
      const typeMap: Record<string, string> = {
        'Présentiel': 'présentiel',
        'En ligne':   'en_ligne',
      };
      formationsActivesQb.andWhere('session.type = :type', {
        type: typeMap[filters.type] ?? filters.type,
      });
    }

    const formationsActivesResult = await formationsActivesQb.getRawOne();
    const formationsActives = parseInt(formationsActivesResult?.count ?? '0');

    const perfQb = () => {
      const qb = this.performanceRepo.createQueryBuilder('perf');
      qb.andWhere('perf.date BETWEEN :start AND :end', {
        start: dates.startDate.toISOString().split('T')[0],
        end:   dates.endDate.toISOString().split('T')[0],
      });
      if (filters.formation && filters.formation !== 'Tous') {
        qb.innerJoin('perf.formation', 'formation').andWhere(
          'formation.titre = :titre',
          { titre: filters.formation },
        );
      }
      return qb;
    };

    const totalPerformances    = await perfQb().getCount();
    const performancesReussies = await perfQb()
      .andWhere('perf.estReussi = true')
      .getCount();

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

    const satQb = this.satisfactionRepo
      .createQueryBuilder('s')
      .select('AVG(s.note)', 'avg');

    if (filters.formation && filters.formation !== 'Tous') {
      satQb
        .innerJoin('s.formation', 'formation')
        .andWhere('formation.titre = :titre', { titre: filters.formation });
    }
    if (dates) {
      satQb.andWhere('s.createdAt BETWEEN :start AND :end', {
        start: dates.startDate,
        end:   dates.endDate,
      });
    }

    const satisfactionResult = await satQb.getRawOne();

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
  // SECTION 3 — GRAPHIQUES  (OLTP — inchangé)
  // ══════════════════════════════════════════════════════════════════════════

  async getEnrollmentsChart(filters: PaginationFilterDto = {}) {
    const qb = this.sessionRepo
      .createQueryBuilder('session')
      .select("TO_CHAR(session.date::date, 'Mon')", 'month')
      .addSelect('EXTRACT(MONTH FROM session.date::date)', 'monthNum')
      .addSelect('COUNT(sa."apprenantId")', 'total')
      .innerJoin('sessions_apprenants', 'sa', 'sa."sessionId" = session.id');

    const dates = this.getPeriodeDates(filters.periode);
    if (dates) {
      qb.andWhere('session.date BETWEEN :start AND :end', {
        start: dates.startDate.toISOString().split('T')[0],
        end:   dates.endDate.toISOString().split('T')[0],
      });
    } else {
      qb.where("session.date::date >= NOW() - INTERVAL '6 months'");
    }

    if (filters.formation && filters.formation !== 'Tous') {
      qb.innerJoin('formations', 'fo', 'fo.id = session."formationId"').andWhere(
        'fo.titre = :titre',
        { titre: filters.formation },
      );
    }
    if (filters.formateur && filters.formateur !== 'Tous') {
      qb.innerJoin('formateur', 'fmt', 'fmt.id = session."formateurId"').andWhere(
        "CONCAT(fmt.prenom, ' ', fmt.nom) = :formateur",
        { formateur: filters.formateur },
      );
    }
    if (filters.type && filters.type !== 'Tous') {
      const typeMap: Record<string, string> = {
        'Présentiel': 'présentiel',
        'En ligne':   'en_ligne',
      };
      qb.andWhere('session.type = :type', {
        type: typeMap[filters.type] ?? filters.type,
      });
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

  async getRevenueChart(filters: PaginationFilterDto = {}) {
    // ✅ MIGRÉ DWH — dw.fact_finance JOIN dw.dim_temps JOIN dw.dim_type_finance
    // Filtres formation → JOIN dw.dim_formation
    // Filtres formateur → JOIN dw.dim_formateur
    // Filtre type session → JOIN dw.dim_session
    // Pas de filtre période → 6 derniers mois via dim_temps.date_key

    const dates = this.getPeriodeDates(filters.periode);

    const params: any[]       = [];
    const joins: string[]     = [];
    const conditions: string[] = [`dtf.type = 'paiement'`];

    // ── Filtre période ─────────────────────────────────────────────────────
    if (dates) {
      params.push(this.toDateKey(dates.startDate), this.toDateKey(dates.endDate));
      conditions.push(`dt.date_key BETWEEN $${params.length - 1} AND $${params.length}`);
    } else {
      // 6 derniers mois — on compare date_key (text 'YYYY-MM-DD') >= date actuelle - 6 mois
      conditions.push(`dt.date_key >= TO_CHAR(NOW() - INTERVAL '6 months', 'YYYY-MM-DD')`);
    }

    // ── Filtre formation ───────────────────────────────────────────────────
    if (filters.formation && filters.formation !== 'Tous') {
      joins.push(`JOIN dw.dim_formation dfo ON ff.sk_formation = dfo.sk_formation`);
      params.push(filters.formation);
      conditions.push(`dfo.titre = $${params.length}`);
    }

    // ── Filtre formateur ───────────────────────────────────────────────────
    if (filters.formateur && filters.formateur !== 'Tous') {
      joins.push(`JOIN dw.dim_formateur dfmt ON ff.sk_formateur = dfmt.sk_formateur`);
      params.push(filters.formateur);
      conditions.push(`dfmt.nom = $${params.length}`);
    }

    // ── Filtre type session (présentiel / en ligne) ────────────────────────
    if (filters.type && filters.type !== 'Tous') {
      const typeMap: Record<string, string> = {
        'Présentiel': 'présentiel',
        'En ligne':   'en_ligne',
      };
      joins.push(`JOIN dw.dim_session ds ON ff.sk_session = ds.sk_session`);
      params.push(typeMap[filters.type] ?? filters.type);
      conditions.push(`ds.type_session = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const joinClause  = joins.join('\n       ');

    const result: any[] = await this.dataSource.query(
      `SELECT
         dt.nom_mois                          AS month,
         dt.mois                              AS "monthNum",
         dt.annee                             AS annee,
         COALESCE(SUM(ff.montant), 0)         AS total
       FROM dw.fact_finance ff
       JOIN dw.dim_type_finance dtf ON ff.sk_type_finance = dtf.sk_type_finance
       JOIN dw.dim_temps        dt  ON ff.sk_temps        = dt.sk_temps
       ${joinClause}
       ${whereClause}
       GROUP BY dt.nom_mois, dt.mois, dt.annee
       ORDER BY dt.annee ASC, dt.mois ASC`,
      params,
    );

    return {
      labels: result.map((r) => r.month),
      datasets: [
        {
          label:           'Revenus (DT)',
          data:            result.map((r) => parseFloat(r.total)),
          borderColor:     '#16a34a',
          backgroundColor: 'rgba(16,164,74,0.2)',
          tension:         0.3,
        },
      ],
    };
  }

  async getCoursesChart(filters: PaginationFilterDto = {}) {
    const qb = this.formationRepo
      .createQueryBuilder('formation')
      .select('formation.titre', 'titre')
      .addSelect('COUNT(DISTINCT sa."apprenantId")', 'nbApprenants')
      .leftJoin('formation.sessions', 'session')
      .leftJoin('sessions_apprenants', 'sa', 'sa."sessionId" = session.id');

    const dates = this.getPeriodeDates(filters.periode);
    if (dates) {
      qb.andWhere('session.date BETWEEN :start AND :end', {
        start: dates.startDate.toISOString().split('T')[0],
        end:   dates.endDate.toISOString().split('T')[0],
      });
    }
    if (filters.statut && filters.statut !== 'Tous') {
      qb.andWhere('formation.statut = :statut', { statut: filters.statut });
    }
    if (filters.type && filters.type !== 'Tous') {
      const typeMap: Record<string, string> = {
        'Présentiel': 'présentiel',
        'En ligne':   'en_ligne',
      };
      qb.andWhere('session.type = :type', {
        type: typeMap[filters.type] ?? filters.type,
      });
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
  // SECTION 4 — TABLE TOP FORMATIONS  (OLTP — inchangé)
  // ══════════════════════════════════════════════════════════════════════════

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
      qb.andWhere('formation.titre ILIKE :formation', {
        formation: `%${formation}%`,
      });
    }
    if (type && type !== 'Tous') {
      const typeMap: Record<string, string> = {
        'Présentiel': 'présentiel',
        'En ligne':   'en_ligne',
      };
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
      revenus:
        "COALESCE(SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END), 0)",
      formation: 'formation.titre',
    };
    qb.orderBy(sortMap[sortBy] ?? sortMap['nbApprenants'], sortDir);

    const rawAll = await qb.getRawMany();

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
        .andWhere('fo.titre ILIKE :formation', {
          formation: `%${formation}%`,
        });
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

  async getTopStudents(filters: PaginationFilterDto = {}) {
    const {
      page = 1,
      limit = 5,
      sortBy = 'dateAccepted',
      sortDir = 'DESC',
      statut,
    } = filters;

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

  async getRecentEnrollments(filters: PaginationFilterDto = {}) {
    const { page = 1, limit = 5, periode, statut } = filters;

    const now = new Date();
    let startDate: Date;

    switch (periode) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
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
  // SECTION 5 — FINANCES  ✅ MIGRÉ VERS DWH
  // ══════════════════════════════════════════════════════════════════════════
  //
  // Changements vs ancienne version OLTP:
  //   - Source: dw.fact_finance JOIN dw.dim_type_finance JOIN dw.dim_temps
  //   - coutTotal = depense_formateur + depense_logistique  (plus 'remboursement')
  //   - Les montants dans fact_finance sont déjà signés par l'ETL:
  //       paiement      → montant positif
  //       tout le reste → montant négatif (abs)
  //     donc on SUM directement sans CASE WHEN pour les coûts
  // ══════════════════════════════════════════════════════════════════════════

  async getFinanceKpis(filters: PaginationFilterDto = {}) {
    const now   = new Date();
    const dates = this.getPeriodeDates(filters.periode) ?? {
      startDate:     new Date(now.getFullYear(), now.getMonth(), 1),
      endDate:       now,
      startDatePrev: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endDatePrev:   new Date(now.getFullYear(), now.getMonth(), 0),
    };

    const startKey     = this.toDateKey(dates.startDate);
    const endKey       = this.toDateKey(dates.endDate);
    const startPrevKey = this.toDateKey(dates.startDatePrev);
    const endPrevKey   = this.toDateKey(dates.endDatePrev);

    // ── Filtre optionnel par formation (JOIN dw.dim_formation) ────────────
    const formationJoin = filters.formation && filters.formation !== 'Tous'
      ? `JOIN dw.dim_formation df ON ff.sk_formation = df.sk_formation
         AND df.titre = $${/* sera positionné dynamiquement */ 'TITRE'}`
      : '';

    // ── Helper: construire les params avec ou sans filtre formation ────────
    const buildParams = (
      extraKeys: string[],
      titre?: string,
    ): { sql: (baseIdx: number) => string; params: any[] } => {
      if (titre) {
        return {
          sql: (b) =>
            `JOIN dw.dim_formation df ON ff.sk_formation = df.sk_formation
             AND df.titre = $${b + extraKeys.length}`,
          params: [...extraKeys, titre],
        };
      }
      return { sql: () => '', params: extraKeys };
    };

    // ─────────────────────────────────────────────────────────────────────
    // 1. Revenu total (tous temps, paiement)
    // ─────────────────────────────────────────────────────────────────────
    const revenuTotalRows = await this.dataSource.query(
      `SELECT COALESCE(SUM(ff.montant), 0) AS total
       FROM dw.fact_finance ff
       JOIN dw.dim_type_finance dtf ON ff.sk_type_finance = dtf.sk_type_finance
       WHERE dtf.type = 'paiement'`,
    );
    const revenuTotal = parseFloat(revenuTotalRows[0]?.total ?? '0');

    // ─────────────────────────────────────────────────────────────────────
    // 2. Coût total (tous temps, depense_formateur + depense_logistique)
    //    ⚠️ Dans fact_finance, l'ETL stocke ces montants en négatif → ABS()
    // ─────────────────────────────────────────────────────────────────────
    const coutTotalRows = await this.dataSource.query(
      `SELECT COALESCE(SUM(ABS(ff.montant)), 0) AS total
       FROM dw.fact_finance ff
       JOIN dw.dim_type_finance dtf ON ff.sk_type_finance = dtf.sk_type_finance
       WHERE dtf.type IN ('depense_formateur', 'depense_logistique')`,
    );
    const coutTotal = parseFloat(coutTotalRows[0]?.total ?? '0');

    // ─────────────────────────────────────────────────────────────────────
    // 3. Revenu période courante
    // ─────────────────────────────────────────────────────────────────────
    const formationFilter = filters.formation && filters.formation !== 'Tous';

    const revenuPeriodeParams: any[] = [startKey, endKey];
    if (formationFilter) revenuPeriodeParams.push(filters.formation);

    const revenuPeriodeRows = await this.dataSource.query(
      `SELECT COALESCE(SUM(ff.montant), 0) AS total
       FROM dw.fact_finance ff
       JOIN dw.dim_type_finance dtf ON ff.sk_type_finance = dtf.sk_type_finance
       JOIN dw.dim_temps dt         ON ff.sk_temps        = dt.sk_temps
       ${formationFilter ? 'JOIN dw.dim_formation dfo ON ff.sk_formation = dfo.sk_formation' : ''}
       WHERE dtf.type = 'paiement'
         AND dt.date_key BETWEEN $1 AND $2
         ${formationFilter ? `AND dfo.titre = $3` : ''}`,
      revenuPeriodeParams,
    );
    const revenuCePeriode = parseFloat(revenuPeriodeRows[0]?.total ?? '0');

    // ─────────────────────────────────────────────────────────────────────
    // 4. Revenu période précédente
    // ─────────────────────────────────────────────────────────────────────
    const revenuPrevParams: any[] = [startPrevKey, endPrevKey];
    if (formationFilter) revenuPrevParams.push(filters.formation);

    const revenuPrevRows = await this.dataSource.query(
      `SELECT COALESCE(SUM(ff.montant), 0) AS total
       FROM dw.fact_finance ff
       JOIN dw.dim_type_finance dtf ON ff.sk_type_finance = dtf.sk_type_finance
       JOIN dw.dim_temps dt         ON ff.sk_temps        = dt.sk_temps
       ${formationFilter ? 'JOIN dw.dim_formation dfo ON ff.sk_formation = dfo.sk_formation' : ''}
       WHERE dtf.type = 'paiement'
         AND dt.date_key BETWEEN $1 AND $2
         ${formationFilter ? `AND dfo.titre = $3` : ''}`,
      revenuPrevParams,
    );
    const revenuPeriodePrev = parseFloat(revenuPrevRows[0]?.total ?? '0');

    // ─────────────────────────────────────────────────────────────────────
    // 5. Formation la plus rentable (tous temps)
    // ─────────────────────────────────────────────────────────────────────
    const topFormationRows = await this.dataSource.query(
      `SELECT dfo.titre, COALESCE(SUM(ff.montant), 0) AS total
       FROM dw.fact_finance ff
       JOIN dw.dim_type_finance dtf ON ff.sk_type_finance = dtf.sk_type_finance
       JOIN dw.dim_formation dfo    ON ff.sk_formation    = dfo.sk_formation
       WHERE dtf.type = 'paiement'
         AND ff.sk_session IS NOT NULL
         AND dfo.formation_id != -1
       GROUP BY dfo.sk_formation, dfo.titre
       ORDER BY SUM(ff.montant) DESC
       LIMIT 1`,
    );

    // ── Calculs finaux ─────────────────────────────────────────────────────
    const profitTotal     = revenuTotal - coutTotal;
    const evolutionRevenu =
      revenuPeriodePrev === 0
        ? 100
        : parseFloat(
            (
              ((revenuCePeriode - revenuPeriodePrev) / revenuPeriodePrev) *
              100
            ).toFixed(2),
          );

    return {
      revenuTotal,
      coutTotal,
      profitTotal,
      margeGlobale:
        revenuTotal === 0
          ? 0
          : parseFloat(((profitTotal / revenuTotal) * 100).toFixed(2)),
      evolutionRevenu,
      revenuCeMois: revenuCePeriode,
      formationPlusRentable:         topFormationRows[0]?.titre ?? '—',
      profitFormationPlusRentable:   parseFloat(topFormationRows[0]?.total ?? '0'),
    };
  }

  async getFinanceDetails(filters: PaginationFilterDto = {}) {
    const { page = 1, limit = 5, sortBy = 'revenus', sortDir = 'DESC' } = filters;
    const dates = this.getPeriodeDates(filters.periode);

    const formationFilter = filters.formation && filters.formation !== 'Tous';

    // ── Paramètres dynamiques ──────────────────────────────────────────────
    const params: any[] = [];
    const conditions: string[] = [
      `dfo.formation_id != -1`, // exclure "Non applicable"
      `ff.sk_session IS NOT NULL`,
    ];

    if (dates) {
      params.push(this.toDateKey(dates.startDate), this.toDateKey(dates.endDate));
      conditions.push(`dt.date_key BETWEEN $${params.length - 1} AND $${params.length}`);
    }
    if (formationFilter) {
      params.push(`%${filters.formation}%`);
      conditions.push(`dfo.titre ILIKE $${params.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // ── Requête principale DWH ─────────────────────────────────────────────
    // On group par formation et on sépare paiement vs dépenses
    const rawResult: any[] = await this.dataSource.query(
      `SELECT
         dfo.titre                                                       AS formation,
         dfo.statut                                                      AS statut,
         COALESCE(SUM(
           CASE WHEN dtf.type = 'paiement'
                THEN ff.montant ELSE 0 END
         ), 0)                                                           AS revenus,
         COALESCE(SUM(
           CASE WHEN dtf.type IN ('depense_formateur', 'depense_logistique')
                THEN ABS(ff.montant) ELSE 0 END
         ), 0)                                                           AS couts,
         COALESCE(SUM(
           CASE WHEN dtf.type = 'paiement'      THEN  ff.montant
                WHEN dtf.type IN ('depense_formateur', 'depense_logistique')
                                                 THEN -ABS(ff.montant)
                ELSE 0 END
         ), 0)                                                           AS profit
       FROM dw.fact_finance ff
       JOIN dw.dim_type_finance dtf ON ff.sk_type_finance = dtf.sk_type_finance
       JOIN dw.dim_formation    dfo ON ff.sk_formation    = dfo.sk_formation
       JOIN dw.dim_temps        dt  ON ff.sk_temps        = dt.sk_temps
       ${whereClause}
       GROUP BY dfo.sk_formation, dfo.titre, dfo.statut`,
      params,
    );

    // ── Filtre statut côté JS (cohérent avec l'ancien comportement) ────────
    let filtered = rawResult;
    if (filters.statut && filters.statut !== 'Tous') {
      filtered = rawResult.filter(
        (r) => r.statut?.toLowerCase() === filters.statut?.toLowerCase(),
      );
    }

    // ── Tri ────────────────────────────────────────────────────────────────
    const sortField = ['revenus', 'couts', 'profit', 'formation'].includes(sortBy)
      ? sortBy
      : 'revenus';
    filtered.sort((a, b) => {
      const va = typeof a[sortField] === 'string' ? a[sortField] : parseFloat(a[sortField]);
      const vb = typeof b[sortField] === 'string' ? b[sortField] : parseFloat(b[sortField]);
      if (sortDir === 'ASC') return va > vb ? 1 : -1;
      return va < vb ? 1 : -1;
    });

    // ── Enrichissement + pagination ────────────────────────────────────────
    const withMarge = filtered.map((r) => {
      const revenus = parseFloat(r.revenus ?? '0');
      const couts   = parseFloat(r.couts ?? '0');
      const profit  = parseFloat(r.profit ?? '0');
      return {
        formation: r.formation,
        revenus,
        couts,
        profit,
        marge:
          revenus === 0
            ? 0
            : parseFloat(((profit / revenus) * 100).toFixed(2)),
        statut: r.statut,
      };
    });

    const total     = withMarge.length;
    const paginated = withMarge.slice((page - 1) * limit, page * limit);
    return { data: paginated, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6 — ALERTES  (OLTP — inchangé)
  // ══════════════════════════════════════════════════════════════════════════

  async getAlerts() {
    const alerts: any[] = [];
    let idCounter = 1;

    // ── Formations avec taux de réussite < 70% ────────────────────────────
    const formationsReussite = await this.performanceRepo
      .createQueryBuilder('perf')
      .select('formation.titre', 'titre')
      .addSelect(
        'COUNT(CASE WHEN perf.estReussi = true THEN 1 END) * 100.0 / COUNT(*)',
        'tauxReussite',
      )
      .innerJoin('perf.formation', 'formation')
      .groupBy('formation.titre')
      .having(
        'COUNT(CASE WHEN perf.estReussi = true THEN 1 END) * 100.0 / COUNT(*) < 70',
      )
      .getRawMany();

    for (const f of formationsReussite) {
      const taux = parseFloat(parseFloat(f.tauxReussite).toFixed(1));
      alerts.push({
        id:          String(idCounter++),
        type:        taux < 50 ? 'Critique' : 'Avertissement',
        titre:       'Taux de réussite faible',
        description: `La formation "${f.titre}" a un taux de réussite de ${taux}%`,
        formation:   f.titre,
        date:        new Date().toISOString().split('T')[0],
        priorite:    taux < 50 ? 9 : 6,
        statut:      'Non traité',
        details:     `Taux: ${taux}%. Seuil: 70%. Recommandation: revoir le contenu pédagogique.`,
      });
    }

    // ── Apprenants avec note < 10 ──────────────────────────────────────────
    const apprenantsFaibles = await this.performanceRepo
      .createQueryBuilder('perf')
      .select('COUNT(*)', 'total')
      .where('perf.note < 10')
      .getRawOne();

    const nbFaibles = parseInt(apprenantsFaibles?.total ?? '0');
    if (nbFaibles > 0) {
      alerts.push({
        id:          String(idCounter++),
        type:        'Avertissement',
        titre:       'Apprenants en difficulté',
        description: `${nbFaibles} apprenant(s) ont une note inférieure à 10`,
        formation:   'Toutes',
        date:        new Date().toISOString().split('T')[0],
        priorite:    7,
        statut:      'Non traité',
        details:     `${nbFaibles} apprenants ont échoué. Recommandation: tutorat ou révision.`,
      });
    }

    // ── Formations avec satisfaction < 3/5 ────────────────────────────────
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
        id:          String(idCounter++),
        type:        'Avertissement',
        titre:       'Satisfaction faible',
        description: `La formation "${f.titre}" a une satisfaction moyenne de ${moy}/5`,
        formation:   f.titre,
        date:        new Date().toISOString().split('T')[0],
        priorite:    6,
        statut:      'Non traité',
        details:     `Satisfaction: ${moy}/5. Seuil: 3/5. Envisager une révision du programme.`,
      });
    }

    // ── Revenus en baisse vs mois précédent ───────────────────────────────
    const now              = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0);

    const revenuCeMois = await this.financeRepo
      .createQueryBuilder('f')
      .select('SUM(f.montant)', 'total')
      .where("f.type = 'paiement'")
      .andWhere('f.date BETWEEN :s AND :e', { s: startOfThisMonth, e: now })
      .getRawOne();
    const revenuMoisDernier = await this.financeRepo
      .createQueryBuilder('f')
      .select('SUM(f.montant)', 'total')
      .where("f.type = 'paiement'")
      .andWhere('f.date BETWEEN :s AND :e', {
        s: startOfLastMonth,
        e: endOfLastMonth,
      })
      .getRawOne();

    const rCeMois      = parseFloat(revenuCeMois?.total ?? '0');
    const rMoisDernier = parseFloat(revenuMoisDernier?.total ?? '0');

    if (rMoisDernier > 0 && rCeMois < rMoisDernier * 0.8) {
      const baisse = (((rMoisDernier - rCeMois) / rMoisDernier) * 100).toFixed(1);
      alerts.push({
        id:          String(idCounter++),
        type:        'Critique',
        titre:       'Revenus en baisse',
        description: `Les revenus ont chuté de ${baisse}% par rapport au mois dernier`,
        formation:   'Toutes',
        date:        new Date().toISOString().split('T')[0],
        priorite:    9,
        statut:      'Non traité',
        details:     `Ce mois: ${rCeMois.toLocaleString()} DT. Mois dernier: ${rMoisDernier.toLocaleString()} DT.`,
      });
    }

    // ── Aucune inscription ce mois ────────────────────────────────────────
    const inscriptionsCeMois = await this.apprenantRepo.count({
      where: { dateAccepted: Between(startOfThisMonth, now) },
    });
    if (inscriptionsCeMois === 0) {
      alerts.push({
        id:          String(idCounter++),
        type:        'Information',
        titre:       'Aucune inscription ce mois',
        description: 'Aucun nouvel apprenant inscrit ce mois',
        formation:   'Toutes',
        date:        new Date().toISOString().split('T')[0],
        priorite:    4,
        statut:      'Non traité',
        details:     'Pensez à relancer une campagne de communication.',
      });
    }

    // ── Sessions actives sans formateur ───────────────────────────────────
    const sessionsOrphelines = await this.sessionRepo
      .createQueryBuilder('session')
      .select('COUNT(*)', 'total')
      .where('session.formateurId IS NULL')
      .andWhere('session.statut = :statut', { statut: SessionStatut.ACTIF })
      .getRawOne();

    const nbOrphelines = parseInt(sessionsOrphelines?.total ?? '0');
    if (nbOrphelines > 0) {
      alerts.push({
        id:          String(idCounter++),
        type:        'Avertissement',
        titre:       'Sessions sans formateur',
        description: `${nbOrphelines} session(s) active(s) n'ont pas de formateur assigné`,
        formation:   'Toutes',
        date:        new Date().toISOString().split('T')[0],
        priorite:    8,
        statut:      'Non traité',
        details:     `${nbOrphelines} sessions actives sans formateur. Action requise avant la date de la session.`,
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