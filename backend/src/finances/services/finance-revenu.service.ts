import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RevenueFilterDto, SortOrder } from '../dto/revenue-filter.dto';
import { 
  BubbleMetric, 
  KpiCardsDto, 
  RevenueEvolutionMultiLineDto, 
  CategoryRevenueShareDto, 
  BubbleChartPointDto, 
  SessionRevenueTableResponseDto, 
  SessionRevenueTableRowDto, 
  PaymentManagementKpisDto, 
  PaymentManagementPieDto, 
  PaymentManagementBarDto, 
  PaymentManagementTableResponseDto, 
  PaymentManagementTableRowDto,
  FormationRevenueItemDto,
  TopFormationKpiDto,
} from '../dto/revenue-response.dto';
import { PerformanceSortBy, PaiementStatus } from 'src/utils/enums';
import { EtlService } from 'src/dw/etl.service';
import { Apprenant } from 'src/apprenants/entities/apprenant.entity';
import { Session } from 'src/sessions/entities/session.entity';
import { Finance, FinanceType } from '../entities/finance.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { AddPaymentDto } from '../dto/add-payement.dto';

@Injectable()
export class FinanceRevenueService {
  
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Finance) private readonly financeRepository: Repository<Finance>,
    @InjectRepository(Session) private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Apprenant) private readonly apprenantRepository: Repository<Apprenant>,
    private readonly etlService: EtlService,
  ) {}
  // ============================================================
  // PARTIE DW — LECTURE (dashboard, KPIs, graphiques)
  // ============================================================


  // ========== KPI CARDS ==========

  async getKpiCards(filter: RevenueFilterDto): Promise<KpiCardsDto> {
    const { currentStart, currentEnd, previousStart, previousEnd } = this.resolveDashboardPeriod(filter);

    const [curRev, prevRev, curFact, prevFact, curIns, prevIns, topFormation] = await Promise.all([
      this.sumFinanceInRange(currentStart, currentEnd, 'paiement', filter.formationId),
      this.sumFinanceInRange(previousStart, previousEnd, 'paiement', filter.formationId),
      this.sumFactureTotal(currentStart, currentEnd, filter.formationId),
      this.sumFactureTotal(previousStart, previousEnd, filter.formationId),
      this.countInscriptionsInRange(currentStart, currentEnd, filter.formationId),
      this.countInscriptionsInRange(previousStart, previousEnd, filter.formationId),
      this.getTopFormationByRevenue(currentStart, currentEnd)
    ]);

    const recoveryRatePercent = curFact > 0 ? (curRev / curFact) * 100 : 0;
    const averageBasket = curIns > 0 ? curRev / curIns : 0;
    const prevAvgBasket = prevIns > 0 ? prevRev / prevIns : 0;

    return {
      totalRevenue: curRev,
      totalRevenueGrowthPercent: this.calculateGrowth(curRev, prevRev),
      recoveryRatePercent: Number(recoveryRatePercent.toFixed(2)),
      topFormation: topFormation ? { formationId: topFormation.id, title: topFormation.titre, revenue: topFormation.total } : null,
      averageBasket: Number(averageBasket.toFixed(2)),
      averageBasketGrowthPercent: this.calculateGrowth(averageBasket, prevAvgBasket),
    };
  }

  private async sumFinanceInRange(start: string, end: string, type: string, formationId?: number): Promise<number> {
    const params: any[] = [start, end, type];
    let formationFilter = '';

    if (formationId) {
      params.push(formationId);
      formationFilter = `AND fo.formation_id = $${params.length}`;
    }

    const res = await this.dataSource.query(`
      SELECT COALESCE(SUM(ABS(f.montant)), 0) as total
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      LEFT JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
      WHERE t.date_key BETWEEN $1 AND $2
        AND tf.type = $3
        ${formationFilter}
    `, params);

    return parseFloat(res[0]?.total) || 0;
  }

  // Calcul du montant TOTAL ATTENDU (Le potentiel)
// Basé sur : Prix de la session * Nombre d'inscrits
private async getMontantAttendu(start: string, end: string, formationId?: number): Promise<number> {
  const params: any[] = [start, end];
  let formationFilter = '';
  if (formationId) {
    params.push(formationId);
    formationFilter = `AND ds.sk_formation = (SELECT sk_formation FROM dw.dim_formation WHERE formation_id = $3)`;
  }

  const res = await this.dataSource.query(`
    SELECT SUM(ds.prix_session * sub.nb_inscrits) as total
    FROM dw.dim_session ds
    JOIN (
      SELECT sk_session, COUNT(DISTINCT sk_apprenant) as nb_inscrits
      FROM dw.fact_finance
      WHERE sk_apprenant != -1
      GROUP BY sk_session
    ) sub ON ds.sk_session = sub.sk_session
    WHERE ds.date BETWEEN $1 AND $2
    ${formationFilter}
  `, params);

  return parseFloat(res[0]?.total) || 0;
}

// Calcul du montant RÉELLEMENT PAYÉ (L'encaissé pour ces sessions)
// 1. Calculer TOUT ce qui aurait dû être payé (Le CA Théorique)
private async getCaAttenduTotal(start: string, end: string, formationId?: number): Promise<number> {
  const params: any[] = [start, end];
  let formationFilter = '';

  if (formationId) {
    params.push(formationId);
    formationFilter = `AND ds.sk_formation = (SELECT sk_formation FROM dw.dim_formation WHERE formation_id = $3)`;
  }

  const res = await this.dataSource.query(`
    SELECT COALESCE(SUM(ds.prix_session * sub.count_apprenants), 0) as total
    FROM dw.dim_session ds
    INNER JOIN (
      -- On compte combien d'élèves sont inscrits à CHAQUE session
      SELECT sk_session, COUNT(DISTINCT sk_apprenant) as count_apprenants
      FROM dw.fact_finance
      WHERE sk_apprenant != -1
      GROUP BY sk_session
    ) sub ON ds.sk_session = sub.sk_session
    -- IMPORTANT : On filtre sur la date de la SESSION
    WHERE ds.date BETWEEN $1 AND $2
    ${formationFilter}
  `, params);

  return parseFloat(res[0]?.total) || 0;
}

// 2. Calculer ce qui a été RÉELLEMENT encaissé pour ces sessions
private async sumFactureTotal(
  start: string, 
  end: string, 
  formationId?: number
): Promise<number> {
  const params: any[] = [start, end];
  let formationFilter = '';

  if (formationId) {
    params.push(formationId);
    formationFilter = `AND fo.formation_id = $${params.length}`;
  }

  // CA Facturé = paiements + impayés (ce qui était dû par les apprenants)
  // On exclut sk_apprenant = -1 (charges fixes sans apprenant)
  const res = await this.dataSource.query(`
    SELECT COALESCE(SUM(ABS(f.montant)), 0) as total
    FROM dw.fact_finance f
    JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
    JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
    LEFT JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
    LEFT JOIN dw.dim_apprenant da ON f.sk_apprenant = da.sk_apprenant
    WHERE t.date_key BETWEEN $1 AND $2
      AND tf.type IN ('paiement', 'impaye')
      AND da.apprenant_id != -1
    ${formationFilter}
  `, params);

  return parseFloat(res[0]?.total) || 0;
}
    // ========== FACTURATION (CA attendu) ==========

  private async sumFactureInRange(start: string, end: string, formationId?: number): Promise<number> {
  const params: any[] = [start, end];
  let formationFilter = '';

  if (formationId) {
    params.push(formationId);
    formationFilter = `AND ds.sk_formation = (SELECT sk_formation FROM dw.dim_formation WHERE formation_id = $3)`;
  }

  const res = await this.dataSource.query(`
    SELECT COALESCE(SUM(ds.prix_session * sub.count_apprenants), 0) as total
    FROM dw.dim_session ds
    INNER JOIN (
      -- On compte combien d'élèves sont inscrits à CHAQUE session
      SELECT sk_session, COUNT(DISTINCT sk_apprenant) as count_apprenants
      FROM dw.fact_finance
      WHERE sk_apprenant != -1
      GROUP BY sk_session
    ) sub ON ds.sk_session = sub.sk_session
    -- IMPORTANT : On filtre sur la date de la SESSION
    WHERE ds.date BETWEEN $1 AND $2
    ${formationFilter}
  `, params);

  return parseFloat(res[0]?.total) || 0;
}

  private async countInscriptionsInRange(start: string, end: string, formationId?: number): Promise<number> {
  const params: any[] = [start, end];
  let formationFilter = '';
  if (formationId) {
    params.push(formationId);
    formationFilter = `AND fo.formation_id = $3`;
  }

  const res = await this.dataSource.query(`
    SELECT COUNT(*) as count
    FROM (
      SELECT DISTINCT f.sk_apprenant, f.sk_session
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
      WHERE t.date_key BETWEEN $1 AND $2
        AND f.sk_apprenant <> -1
        ${formationFilter}
    ) sub
  `, params);
  return parseInt(res[0]?.count) || 0;
}

  private async getTopFormationByRevenue(start: string, end: string): Promise<{ id: number; titre: string; total: number } | null> {
    const res = await this.dataSource.query(`
      SELECT fo.formation_id as id, fo.titre, SUM(f.montant) as total
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
      WHERE t.date_key BETWEEN $1 AND $2
        AND tf.type = 'paiement'
      GROUP BY fo.formation_id, fo.titre
      ORDER BY total DESC
      LIMIT 1
    `, [start, end]);

    return res[0] || null;
  }

  // ========== REVENUE EVOLUTION ==========

  async getRevenueEvolutionByFormation(filter: RevenueFilterDto): Promise<RevenueEvolutionMultiLineDto> {
    const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);
    const topN = filter.topFormations ?? 5;

    const topIds = await this.getTopFormationIdsByRevenue(currentStart, currentEnd, topN);
    if (topIds.length === 0) {
      return { months: [], series: [] };
    }

    const rows = await this.dataSource.query(`
      SELECT 
        t.annee || '-' || LPAD(t.mois::text, 2, '0') as month,
        fo.formation_id as formationId,
        SUM(f.montant) as total
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
      WHERE t.date_key BETWEEN $1 AND $2
        AND tf.type = 'paiement'
        AND fo.formation_id = ANY($3)
      GROUP BY t.annee, t.mois, fo.formation_id
      ORDER BY t.annee ASC, t.mois ASC
    `, [currentStart, currentEnd, topIds]);

    const months = this.enumerateMonths(currentStart, currentEnd);
    const titles = await this.loadFormationTitles(topIds);

    const series = topIds.map((id) => {
      const monthlyRevenue = months.map((m) => {
        const hit = rows.find((r: any) => r.month === m && Number(r.formationid) === id);
        return hit ? parseFloat(hit.total) : 0;
      });
      return {
        formationId: id,
        formationTitle: titles.get(id) ?? `Formation #${id}`,
        monthlyRevenue,
      };
    });

    return { months, series };
  }

  private async getTopFormationIdsByRevenue(start: string, end: string, limit: number): Promise<number[]> {
    const rows = await this.dataSource.query(`
      SELECT fo.formation_id as id, SUM(f.montant) as total
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
      WHERE t.date_key BETWEEN $1 AND $2
        AND tf.type = 'paiement'
      GROUP BY fo.formation_id
      ORDER BY total DESC
      LIMIT $3
    `, [start, end, limit]);

    return rows.map((r: any) => Number(r.id));
  }

  private async loadFormationTitles(ids: number[]): Promise<Map<number, string>> {
    const rows = await this.dataSource.query(`
      SELECT formation_id as id, titre
      FROM dw.dim_formation
      WHERE formation_id = ANY($1)
    `, [ids]);

    const map = new Map<number, string>();
    rows.forEach((r: any) => map.set(Number(r.id), r.titre));
    return map;
  }

  // ========== TOP FORMATIONS BAR ==========

  async getTopFormationsBar(filter: RevenueFilterDto): Promise<FormationRevenueItemDto[]> {
    const limit = filter.topFormations ?? 5;
    return this.getCaByFormationInternal(filter, limit);
  }

  private async getCaByFormationInternal(filter: RevenueFilterDto, limit: number): Promise<FormationRevenueItemDto[]> {
    const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);
    const params: any[] = [currentStart, currentEnd];
    let formationFilter = '';

    if (filter.formationId) {
      params.push(filter.formationId);
      formationFilter = `AND fo.formation_id = $${params.length}`;
    }

    const rows = await this.dataSource.query(`
      SELECT 
        fo.formation_id as "formationId", 
        fo.titre as "formationTitle", 
        SUM(f.montant) as "caRealise"
      FROM dw.fact_finance f
      JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE tf.type = 'paiement'
        AND t.date_key BETWEEN $1 AND $2
        ${formationFilter}
      GROUP BY fo.formation_id, fo.titre
      ORDER BY "caRealise" DESC
      LIMIT $${params.length + 1}
    `, [...params, limit]);

    return rows.map((row: any) => ({
      formationId: Number(row.formationId),
      formationTitle: row.formationTitle,
      caRealise: Number(parseFloat(row.caRealise || 0).toFixed(2)),
    }));
  }

  // ========== CATEGORY PIE ==========

  async getCategoryPie(filter: RevenueFilterDto): Promise<CategoryRevenueShareDto[]> {
    const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);
    const params: any[] = [currentStart, currentEnd];
    let formationFilter = '';

    if (filter.formationId) {
      params.push(filter.formationId);
      formationFilter = `AND fo.formation_id = $${params.length}`;
    }

    const rows = await this.dataSource.query(`
      SELECT 
        COALESCE(fo.categorie, 'Non classée') as category,
        SUM(f.montant) as revenue
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
      WHERE tf.type = 'paiement'
        AND t.date_key BETWEEN $1 AND $2
        ${formationFilter}
      GROUP BY fo.categorie
    `, params);

    const mapped = rows.map((r: any) => ({
      category: r.category,
      revenue: Number(parseFloat(r.revenue || 0).toFixed(2)),
    }));

    const total = mapped.reduce((a: number, b: any) => a + b.revenue, 0);

    return mapped.map((r: any) => ({
      category: r.category,
      revenue: r.revenue,
      percent: total > 0 ? Number(((r.revenue / total) * 100).toFixed(2)) : 0,
    }));
  }

  // ========== BUBBLE CHART ==========

  async getBubbleChart(filter: RevenueFilterDto): Promise<BubbleChartPointDto[]> {
  const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);
  const metric = filter.bubbleMetric ?? BubbleMetric.MARGIN;

  const rows = await this.dataSource.query(`
    SELECT 
      fo.formation_id as formationId,
      fo.titre as formationTitle,
      COUNT(DISTINCT f.sk_apprenant) as inscriptions,
      SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) as revenue,
      SUM(CASE WHEN tf.type IN ('depense_formateur', 'depense_logistique') THEN f.montant ELSE 0 END) as costs,
      AVG(se.prix_session) as avgPrice
    FROM dw.dim_formation fo
    LEFT JOIN dw.fact_finance f ON f.sk_formation = fo.sk_formation
    LEFT JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps AND t.date_key BETWEEN $1 AND $2
    LEFT JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
    LEFT JOIN dw.dim_session se ON f.sk_session = se.sk_session   -- ← VIA fact_finance !
    WHERE fo.formation_id != -1
    GROUP BY fo.formation_id, fo.titre
  `, [currentStart, currentEnd]);

  return rows.map((row: any): BubbleChartPointDto => {
    const revenue = Number(parseFloat(row.revenue || 0).toFixed(2));
    const costs = Number(parseFloat(row.costs || 0).toFixed(2));
    const avgPrice = Number(parseFloat(row.avgprice || 0).toFixed(2));
    const inscriptions = parseInt(row.inscriptions) || 0;
    const margin = revenue - costs;
    const bubbleSize = metric === BubbleMetric.PRICE ? avgPrice : margin;

    return {
      formationId: Number(row.formationid),
      formationTitle: row.formationtitle,
      inscriptions,
      revenue,
      bubbleSize: Number(bubbleSize.toFixed(2)),
      bubbleMetric: metric === BubbleMetric.PRICE ? 'price' : 'margin',
    };
  }).sort((a: any, b: any) => b.revenue - a.revenue);
}

  // ========== SESSIONS REVENUE TABLE ==========

  async getSessionsRevenueTable(filter: RevenueFilterDto): Promise<SessionRevenueTableResponseDto> {
  const { currentStart, currentEnd, previousStart, previousEnd } = this.resolveDashboardPeriod(filter);

  const sortMap: Record<string, string> = {
    'date': 'ds.date',
    'session': 'ds.titre',
    'formation': 'si.formation_title',
    'inscrits': 'COALESCE(cr.inscrits, 0)',
    'prix': 'ds.prix_session',
    'ca': 'COALESCE(cr.ca, 0)',
  };
  const sortByKey = filter.sortBy ?? 'ca';
  const sortBy = sortMap[sortByKey] || 'COALESCE(cr.ca, 0)';
  const sortOrder = filter.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const raw = await this.dataSource.query(`
    WITH cur_rev AS (
      SELECT 
        f.sk_session,
        COUNT(DISTINCT f.sk_apprenant) as inscrits,
        SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) as ca
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE t.date_key BETWEEN $1 AND $2
      GROUP BY f.sk_session
    ),
    prev_rev AS (
      SELECT 
        f.sk_session,
        SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) as ca
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE t.date_key BETWEEN $3 AND $4
      GROUP BY f.sk_session
    ),
    session_info AS (
      SELECT DISTINCT ON (f.sk_session)
        f.sk_session,
        fo.titre as formation_title
      FROM dw.fact_finance f
      JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
      ORDER BY f.sk_session, f.id_fact_finance
    )
    SELECT 
      ds.session_id as "sessionId",
      ds.titre as "session",
      ds.date as "date",
      COALESCE(si.formation_title, 'Non définie') as "formation",
      ds.capacite,
      COALESCE(cr.inscrits, 0) as "inscrits",
      COALESCE(ds.prix_session, 0) as "prix",
      COALESCE(cr.ca, 0) as "caEncaisse",
      COALESCE(pr.ca, 0) as "caEncaissePrev"
    FROM dw.dim_session ds
    LEFT JOIN cur_rev cr ON cr.sk_session = ds.sk_session
    LEFT JOIN prev_rev pr ON pr.sk_session = ds.sk_session
    LEFT JOIN session_info si ON si.sk_session = ds.sk_session
    WHERE ds.session_id != '00000000-0000-0000-0000-000000000000'
    ORDER BY ${sortBy} ${sortOrder}
  `, [currentStart, currentEnd, previousStart, previousEnd]);

  const items: SessionRevenueTableRowDto[] = raw.map((r: any) => {
    const current = parseFloat(r.caEncaisse) || 0;
    const previous = parseFloat(r.caEncaissePrev) || 0;
    let percent = 0;
    if (previous > 0) percent = ((current - previous) / previous) * 100;
    else if (current > 0) percent = 100;

    let trendColor: 'green' | 'red' | 'neutral' = 'neutral';
    if (percent > 0) trendColor = 'green';
    else if (percent < 0) trendColor = 'red';

    return {
      sessionId: r.sessionId,
      session: r.session || '—',
      formation: r.formation || '—',
      date: r.date,
      inscrits: parseInt(r.inscrits) || 0,
      prix: parseFloat(r.prix) || 0,
      caEncaisse: Number(current.toFixed(2)),
      variation: {
        variationPercent: Number(percent.toFixed(2)),
        color: trendColor,
      },
      capacite: r.capacite ? parseInt(r.capacite) : null,
    };
  });

  return {
    items,
    total: items.length,
    page: 1,
    limit: items.length,
    totalPages: 1,
  };
}
  private async buildSessionRevenueRows(
  filter: RevenueFilterDto,
  curStart: string,
  curEnd: string,
  prevStart: string,
  prevEnd: string,
): Promise<SessionRevenueTableRowDto[]> {
  const params: any[] = [curStart, curEnd, prevStart, prevEnd];
  let sessionFilter = '';
  let formationFilter = '';

  if (filter.sessionId) {
    params.push(filter.sessionId);
    sessionFilter = `AND ds.session_id = $${params.length}`;
  }

  if (filter.formationId) {
    params.push(filter.formationId);
    formationFilter = `AND fo.formation_id = $${params.length}`;
  }

  const raw = await this.dataSource.query(`
    WITH cur_rev AS (
      SELECT 
        f.sk_session,
        COUNT(DISTINCT f.sk_apprenant) as inscrits,
        SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) as ca
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE t.date_key BETWEEN $1 AND $2
      GROUP BY f.sk_session
    ),
    prev_rev AS (
      SELECT 
        f.sk_session,
        SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) as ca
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE t.date_key BETWEEN $3 AND $4
      GROUP BY f.sk_session
    ),
    session_info AS (
      SELECT DISTINCT ON (f.sk_session)
        f.sk_session,
        fo.titre as formation_title,
        fo.formation_id
      FROM dw.fact_finance f
      JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
      ORDER BY f.sk_session, f.id_fact_finance
    )
    SELECT 
      ds.session_id as "sessionId",
      ds.type_session as "sessionTitle",
      MIN(dt.date_key) as "sessionDate",
      ds.capacite as "capacite",
      si.formation_title as "formationTitle",
      ds.prix_session as "sessionPrix",
      COALESCE(cr.inscrits, 0) as "inscrits",
      COALESCE(cr.ca, 0) as "caEncaisse",
      COALESCE(pr.ca, 0) as "caEncaissePrev"
    FROM dw.dim_session ds
    LEFT JOIN dw.fact_finance f ON f.sk_session = ds.sk_session
    LEFT JOIN dw.dim_temps dt ON f.sk_temps = dt.sk_temps
    LEFT JOIN cur_rev cr ON cr.sk_session = ds.sk_session
    LEFT JOIN prev_rev pr ON pr.sk_session = ds.sk_session
    LEFT JOIN session_info si ON si.sk_session = ds.sk_session
    WHERE ds.session_id != '00000000-0000-0000-0000-000000000000'
      ${sessionFilter}
      ${formationFilter}
    GROUP BY ds.session_id, ds.type_session, ds.capacite, si.formation_title, ds.prix_session, cr.inscrits, cr.ca, pr.ca
  `, params);

  return raw.map((r: any): SessionRevenueTableRowDto => {
    const current = parseFloat(r.caEncaisse) || 0;
    const previous = parseFloat(r.caEncaissePrev) || 0;
    const prixFinal = parseFloat(r.sessionPrix) || 0;
    const inscrits = parseInt(r.inscrits) || 0;

    let percent = 0;
    if (previous > 0) percent = ((current - previous) / previous) * 100;
    else if (current > 0) percent = 100;

    let trendColor: 'green' | 'red' | 'neutral' = 'neutral';
    if (percent > 0) trendColor = 'green';
    else if (percent < 0) trendColor = 'red';

    return {
      sessionId: r.sessionId,
      session: r.sessionTitle || r.formationTitle || "—",
      formation: r.formationTitle || "—",
      date: r.sessionDate,
      inscrits,
      prix: prixFinal,
      caEncaisse: Number(current.toFixed(2)),
      variation: {
        variationPercent: Number(percent.toFixed(2)),
        color: trendColor,
      }
    };
  });
}

  private sortSessionRevenueRows(rows: SessionRevenueTableRowDto[], sortBy: PerformanceSortBy, sortOrder: SortOrder): SessionRevenueTableRowDto[] {
    return rows.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortBy) {
        case PerformanceSortBy.DATE: valA = new Date(a.date).getTime(); valB = new Date(b.date).getTime(); break;
        case PerformanceSortBy.SESSION: valA = a.session; valB = b.session; break;
        case PerformanceSortBy.FORMATION: valA = a.formation; valB = b.formation; break;
        case PerformanceSortBy.INSCRITS: valA = a.inscrits; valB = b.inscrits; break;
        case PerformanceSortBy.PRIX: valA = a.prix; valB = b.prix; break;
        case PerformanceSortBy.CA_ENCAISSE: valA = a.caEncaisse; valB = b.caEncaisse; break;
        default: valA = a.caEncaisse; valB = b.caEncaisse;
      }

      if (typeof valA === 'string') {
        return sortOrder === SortOrder.ASC ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === SortOrder.ASC ? valA - valB : valB - valA;
    });
  }

  // ========== EXPORT CSV ==========

  async exportSessionsRevenueCsv(filter: RevenueFilterDto): Promise<string> {
  const { currentStart, currentEnd, previousStart, previousEnd } = this.resolveDashboardPeriod(filter);

  const rows = await this.dataSource.query(`
    WITH cur_rev AS (
      SELECT f.sk_session, COUNT(DISTINCT f.sk_apprenant) as inscrits, SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) as ca
      FROM dw.fact_finance f JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE t.date_key BETWEEN $1 AND $2 GROUP BY f.sk_session
    ),
    prev_rev AS (
      SELECT f.sk_session, SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) as ca
      FROM dw.fact_finance f JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE t.date_key BETWEEN $3 AND $4 GROUP BY f.sk_session
    ),
    session_info AS (
      SELECT DISTINCT ON (f.sk_session) f.sk_session, fo.titre as formation_title
      FROM dw.fact_finance f JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation ORDER BY f.sk_session, f.id_fact_finance
    )
    SELECT ds.session_id, ds.type_session as session, COALESCE(si.formation_title,'Non définie') as formation,
      MIN(dt.date_key) as date, ds.capacite, COALESCE(cr.inscrits,0) as inscrits, COALESCE(ds.prix_session,0) as prix,
      COALESCE(cr.ca,0) as caEncaisse, COALESCE(pr.ca,0) as caEncaissePrev
    FROM dw.dim_session ds
    LEFT JOIN dw.fact_finance f ON f.sk_session = ds.sk_session
    LEFT JOIN dw.dim_temps dt ON f.sk_temps = dt.sk_temps
    LEFT JOIN cur_rev cr ON cr.sk_session = ds.sk_session
    LEFT JOIN prev_rev pr ON pr.sk_session = ds.sk_session
    LEFT JOIN session_info si ON si.sk_session = ds.sk_session
    WHERE ds.session_id != '00000000-0000-0000-0000-000000000000'
    GROUP BY ds.session_id, ds.type_session, ds.capacite, ds.prix_session, si.formation_title, cr.inscrits, cr.ca, pr.ca
    ORDER BY COALESCE(cr.ca,0) DESC
  `, [currentStart, currentEnd, previousStart, previousEnd]);

  const header = ['Session', 'Formation', 'Date', 'Inscrits', 'Prix (DT)', 'CA Encaisse (DT)', 'Variation (%)', 'Statut Tendance'];
  const lines = rows.map((r: any) => {
    const current = parseFloat(r.caEncaisse) || 0;
    const previous = parseFloat(r.caEncaissePrev) || 0;
    let percent = 0;
    if (previous > 0) percent = ((current - previous) / previous) * 100;
    else if (current > 0) percent = 100;
    let color = 'NEUTRAL';
    if (percent > 0) color = 'GREEN';
    else if (percent < 0) color = 'RED';
    return [
      this.csvEscape(r.session),
      this.csvEscape(r.formation),
      r.date,
      r.inscrits,
      parseFloat(r.prix).toFixed(2),
      current.toFixed(2),
      percent.toFixed(2) + '%',
      color,
    ].join(',');
  });

  return '\ufeff' + [header.join(','), ...lines].join('\n');
}
  private csvEscape(value: any): string {
    if (value === null || value === undefined) return '';
    let stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      stringValue = `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  // ========== PAYMENT MANAGEMENT ==========

  async getPaymentManagementKpis(filter: RevenueFilterDto): Promise<PaymentManagementKpisDto> {
    const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);

    const encRes = await this.dataSource.query(`
      SELECT COALESCE(SUM(f.montant), 0) as total, COUNT(*) as count
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE t.date_key BETWEEN $1 AND $2
        AND tf.type = 'paiement'
    `, [currentStart, currentEnd]);

    const totalEncaisse = parseFloat(encRes[0]?.total) || 0;
    const paymentsCount = parseInt(encRes[0]?.count) || 0;

    const totalFacture = await this.sumFactureInRange(currentStart, currentEnd, filter.formationId);
    const totalNonEncaisse = Math.max(0, totalFacture - totalEncaisse);
    const paymentRatePercent = totalFacture > 0 ? (totalEncaisse / totalFacture) * 100 : 0;

    return {
      totalEncaisse: Number(totalEncaisse.toFixed(2)),
      totalNonEncaisse: Number(totalNonEncaisse.toFixed(2)),
      paymentRatePercent: Number(paymentRatePercent.toFixed(2)),
      paymentsCount,
    };
  }

  async getPaymentManagementPie(filter: RevenueFilterDto): Promise<PaymentManagementPieDto> {
  const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);

  const rows = await this.dataSource.query(`
    SELECT 
      ds.session_id,
      COALESCE(ds.prix_session, 0) as prix_unitaire,
      COUNT(DISTINCT f.sk_apprenant) as inscrits,
      SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) as ca_encaisse
    FROM dw.dim_session ds
    LEFT JOIN dw.fact_finance f ON f.sk_session = ds.sk_session
    LEFT JOIN dw.dim_temps dt ON f.sk_temps = dt.sk_temps AND dt.date_key BETWEEN $1 AND $2
    LEFT JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
    WHERE ds.session_id != '00000000-0000-0000-0000-000000000000'
    GROUP BY ds.session_id, ds.prix_session
  `, [currentStart, currentEnd]);

  let paye = 0, avance = 0, impaye = 0;

  for (const s of rows) {
    const prixUnitaire = parseFloat(s.prix_unitaire) || 0;
    const nbInscrits = parseInt(s.inscrits) || 0;
    const expectedTotal = prixUnitaire * nbInscrits;
    const actualEncaisse = parseFloat(s.ca_encaisse) || 0;

    if (expectedTotal === 0) continue;

    if (actualEncaisse >= expectedTotal) paye++;
    else if (actualEncaisse > 0) avance++;
    else impaye++;
  }

  const total = paye + avance + impaye;
  return {
    slices: [
      { status: 'paye', count: paye, percent: total > 0 ? Number(((paye / total) * 100).toFixed(2)) : 0 },
      { status: 'avance', count: avance, percent: total > 0 ? Number(((avance / total) * 100).toFixed(2)) : 0 },
      { status: 'impaye', count: impaye, percent: total > 0 ? Number(((impaye / total) * 100).toFixed(2)) : 0 },
    ]
  };
}

  async getPaymentManagementBar(filter: RevenueFilterDto): Promise<PaymentManagementBarDto> {
  // On récupère les dates (un an glissant si vide)
  const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);
  const formationId = filter.formationId ? Number(filter.formationId) : null;

  const rows = await this.dataSource.query(`
    SELECT 
      fo.titre as "formationLabel",
      
      -- BARRE A : CA FACTURÉ (Basé sur la date de SESSION)
      (
        SELECT COALESCE(SUM(ds.prix_session * sub.nb), 0)
        FROM dw.dim_session ds
        INNER JOIN (
          -- On compte les inscrits uniques pour cette formation
          SELECT f_sub.sk_session, COUNT(DISTINCT f_sub.sk_apprenant) as nb
          FROM dw.fact_finance f_sub
          WHERE f_sub.sk_formation = fo.sk_formation
            AND f_sub.sk_apprenant != -1
          GROUP BY f_sub.sk_session
        ) sub ON ds.sk_session = sub.sk_session
        WHERE ds.date BETWEEN $1 AND $2
      ) as "caFacture",

      -- BARRE B : CA ENCAISSÉ (Basé sur la date de PAIEMENT)
      (
        SELECT COALESCE(SUM(f_pay.montant), 0)
        FROM dw.fact_finance f_pay
        JOIN dw.dim_type_finance tf ON f_pay.sk_type_finance = tf.sk_type_finance
        JOIN dw.dim_temps t ON f_pay.sk_temps = t.sk_temps
        WHERE f_pay.sk_formation = fo.sk_formation
          AND tf.type = 'paiement'
          AND t.date_key BETWEEN $1 AND $2
      ) as "caEncaisse"

    FROM dw.dim_formation fo
    WHERE fo.formation_id != -1
    ${formationId ? `AND fo.formation_id = $3` : ''}
    ORDER BY "caFacture" DESC
    LIMIT 8
  `, formationId ? [currentStart, currentEnd, formationId] : [currentStart, currentEnd]);

  return {
    rows: rows.map(r => ({
      month: r.formationLabel, // On affiche le titre de la formation en bas
      caFacture: Number(parseFloat(r.caFacture).toFixed(2)),
      caEncaisse: Number(parseFloat(r.caEncaisse).toFixed(2)),
    }))
  };
}

  async getPaymentManagementTable(filter: RevenueFilterDto): Promise<PaymentManagementTableResponseDto> {
  const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);

  const rows = await this.dataSource.query(`
    SELECT 
      da.apprenant_id as "inscriptionId",
      da.nom as "nom",
      ds.session_id as "sessionId",
      ds.type_session as "sessionTitle",
      fo.titre as "formationTitle",
      COALESCE(ds.prix_session, 0) as "total",
      SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) as "paid"
    FROM dw.dim_apprenant da
    JOIN dw.fact_finance f ON f.sk_apprenant = da.sk_apprenant
    JOIN dw.dim_session ds ON f.sk_session = ds.sk_session
    LEFT JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation   -- ← VIA fact_finance
    JOIN dw.dim_temps dt ON f.sk_temps = dt.sk_temps AND dt.date_key BETWEEN $1 AND $2
    JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
    WHERE da.apprenant_id != -1
    GROUP BY da.apprenant_id, da.nom, ds.session_id, ds.type_session, fo.titre, ds.prix_session
  `, [currentStart, currentEnd]);

  let items: PaymentManagementTableRowDto[] = rows.map((row: any) => {
    const total = parseFloat(row.total) || 0;
    const paid = parseFloat(row.paid) || 0;
    const remaining = Math.max(0, total - paid);

    let status = PaiementStatus.UNPAID;
    if (paid >= total && total > 0) status = PaiementStatus.PAID;
    else if (paid > 0) status = PaiementStatus.PARTIAL;

    return {
      inscriptionId: Number(row.inscriptionId),
      apprenant: row.nom || 'Inconnu',
      session: row.sessionTitle,
      formation: row.formationTitle,
      total,
      paid,
      remaining,
      status,
    };
  });

  if (filter.paymentStatus) {
    items = items.filter(item => item.status === filter.paymentStatus);
  }

  const page = filter.page ?? 1;
  const limit = filter.limit ?? 10;
  const total = items.length;

  return {
    items: items.slice((page - 1) * limit, page * limit),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
  // ========== UTILITAIRES ==========

  private calculateGrowth(current: number, previous: number): number {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Number(((current - previous) / previous * 100).toFixed(2));
  }

  private resolveDashboardPeriod(filter: RevenueFilterDto) {
  const now = new Date();
  
  // Date de fin : aujourd'hui (ou celle du filtre)
  const currentEnd = filter.endDate || this.fmt(now);

  // Date de début : il y a un an (ou celle du filtre)
  let currentStart = filter.startDate;
  if (!currentStart) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    currentStart = this.fmt(oneYearAgo);
  }

  const start = new Date(currentStart);
  const end = new Date(currentEnd);
  const diff = end.getTime() - start.getTime();

  return {
    currentStart,
    currentEnd,
    previousStart: this.fmt(new Date(start.getTime() - diff)),
    previousEnd: this.fmt(new Date(end.getTime() - diff)),
  };
}

  private fmt(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private enumerateMonths(start: string, end: string): string[] {
    const months: string[] = [];
    const current = new Date(start);
    current.setDate(1);
    const last = new Date(end);
    last.setDate(1);

    while (current <= last) {
      months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  }


  // ============================================================
  // PARTIE OLTP — CRUD (add, update, delete payment)
  // ============================================================

  async addPayment(dto: AddPaymentDto): Promise<{ finance: Finance }> {
    const apprenant = await this.apprenantRepository.findOne({
      where: { id: dto.apprenantId },
      relations: ['user'],
    });

    if (!apprenant) {
      throw new NotFoundException(`Apprenant #${dto.apprenantId} introuvable`);
    }

    if (dto.sessionId) {
      const session = await this.sessionRepository.findOne({ where: { id: dto.sessionId } });
      if (!session) throw new NotFoundException('Session introuvable');
    }

    const finance = this.financeRepository.create({
      apprenant,
      montant: Number(dto.montant),
      type: FinanceType.PAIEMENT,
      date: new Date(dto.paymentDate),
      apprenantId: apprenant.id,
      sessionId: dto.sessionId ? dto.sessionId.toString() : null,
      description: `${apprenant.user.nom} ${apprenant.user.prenom} - Paiement ${dto.paymentDate}`,
    });

    const saved = await this.financeRepository.save(finance);

    // 🔄 Rafraîchir le DW automatiquement
    await this.etlService.runEtl().catch(err => {
      console.error('ETL failed after addPayment:', err.message);
    });

    const result = await this.financeRepository.findOne({
      where: { id: saved.id },
      relations: ['apprenant', 'apprenant.user', 'session'],
    });

    if (!result) throw new InternalServerErrorException('Paiement créé mais non retrouvé');

    return { finance: result };
  }

  async updatePayment(id: number, dto: AddPaymentDto): Promise<{ finance: Finance }> {
    const existing = await this.financeRepository.findOne({
      where: { id },
      relations: ['apprenant', 'apprenant.user', 'session', 'session.formation'],
    });

    if (!existing) throw new NotFoundException(`Paiement #${id} introuvable`);

    if (dto.apprenantId && dto.apprenantId !== existing.apprenantId) {
      const apprenant = await this.apprenantRepository.findOne({
        where: { id: dto.apprenantId },
        relations: ['user'],
      });
      if (!apprenant) throw new NotFoundException(`Apprenant #${dto.apprenantId} introuvable`);
      existing.apprenant = apprenant;
      existing.apprenantId = apprenant.id;
    }

    if (dto.sessionId) {
      const session = await this.sessionRepository.findOne({
        where: { id: dto.sessionId },
        relations: ['formation'],
      });
      if (!session) throw new NotFoundException(`Session #${dto.sessionId} introuvable`);
      existing.sessionId = String(session.id);
      existing.session = session;
    }

    existing.montant = Number(dto.montant ?? existing.montant);
    existing.date = dto.paymentDate ? new Date(dto.paymentDate) : existing.date;

    const app = existing.apprenant;
    if (app?.user) {
      existing.description = `${app.user.nom || ''} ${app.user.prenom || ''} - Paiement ${existing.date.toISOString().split('T')[0]}`.trim();
    }

    const saved = await this.financeRepository.save(existing);

    // 🔄 Rafraîchir le DW automatiquement
    await this.etlService.runEtl().catch(err => {
      console.error('ETL failed after updatePayment:', err.message);
    });

    const result = await this.financeRepository.findOne({
      where: { id: saved.id },
      relations: ['apprenant', 'apprenant.user', 'session', 'session.formation'],
    });

    if (!result) throw new NotFoundException('Paiement mis à jour mais non retrouvé');

    return { finance: result };
  }

  async deletePayment(id: number): Promise<{ message: string; deletedId: number }> {
    const existing = await this.financeRepository.findOne({ where: { id } });
    if (!existing) throw new NotFoundException(`Paiement #${id} introuvable`);

    await this.financeRepository.remove(existing);

    // 🔄 Rafraîchir le DW automatiquement
    await this.etlService.runEtl().catch(err => {
      console.error('ETL failed after deletePayment:', err.message);
    });

    return { message: 'Paiement supprimé avec succès', deletedId: id };
  }

  async getSessionsByApprenant(apprenantId: number) {
    const apprenant = await this.apprenantRepository.findOne({
      where: { id: apprenantId },
      relations: ['sessions'],
    });

    if (!apprenant) return [];

    return apprenant.sessions.map((session) => ({
      id: session.id,
      title: session.title || 'Session sans nom',
      formationId: session.formationId,
    }));
  }

  async getFormationsForPayments() {
    return this.financeRepository.createQueryBuilder('f')
      .select('DISTINCT session.formationId', 'formationId')
      .innerJoin('f.session', 'session')
      .getRawMany();
  }

}