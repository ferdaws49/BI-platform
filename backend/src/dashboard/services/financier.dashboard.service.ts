import { Injectable } from '@nestjs/common';
import { DataSource} from 'typeorm';
import { FinancierDashboardFilterDto, SortOrder } from 'src/dashboard/dto/financier-dashboard-filter.dto';
import { PerformanceSortBy, PaiementStatus } from 'src/utils/enums';
import { CategoryRevenueCostItemDto, DashboardKpisDto, FormationRevenueItemDto, MonthlyRevenueItemDto, SessionPerformanceRowDto, SessionsPerformanceResponseDto } from 'src/dashboard/dto/financier-dashboard-response.dto';


@Injectable()
export class FinancierDashboardService {
  constructor(
    private readonly dataSource: DataSource,
    
  ) {}

  async getAllFormations() {
  return this.dataSource.query(`
    SELECT formation_id as id, titre 
    FROM dw.dim_formation 
    WHERE formation_id != -1 
    ORDER BY titre
  `);
}

  async getAllFormateurs() {
    return this.dataSource.query(`
      SELECT formateur_id as id, nom as name 
      FROM dw.dim_formateur 
      WHERE formateur_id != -1 
      ORDER BY name
    `);
  }
  
  async getKpisGlobaux(filter: FinancierDashboardFilterDto): Promise<DashboardKpisDto> {
  const { startDate, endDate } = this.getResolvedDates(filter);
  const formationId = filter.formationId ? Number(filter.formationId) : null;

  // ── CA COURANT (identique à Revenue.sumFinanceInRange) ──
  const resCur = await this.dataSource.query(`
    SELECT COALESCE(SUM(ABS(f.montant)), 0) as total
    FROM dw.fact_finance f
    JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
    JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
    LEFT JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
    WHERE t.date_key BETWEEN $1 AND $2
      AND tf.type = 'paiement'
      ${formationId ? `AND fo.formation_id = $3` : ''}
  `, formationId ? [startDate, endDate, formationId] : [startDate, endDate]);

  // ── CA PRÉCÉDENT (même requête, même durée) ──
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  const prevStart = this.fmt(new Date(start.getTime() - diff));
  const prevEnd = this.fmt(new Date(end.getTime() - diff));

  const resPrev = await this.dataSource.query(`
    SELECT COALESCE(SUM(ABS(f.montant)), 0) as total
    FROM dw.fact_finance f
    JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
    JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
    LEFT JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
    WHERE t.date_key BETWEEN $1 AND $2
      AND tf.type = 'paiement'
      ${formationId ? `AND fo.formation_id = $3` : ''}
  `, formationId ? [prevStart, prevEnd, formationId] : [prevStart, prevEnd]);

  const caRealise = parseFloat(resCur[0].total) || 0;
  const caRealisePrev = parseFloat(resPrev[0].total) || 0;

  // ── CROISSANCE (formule exacte de Revenue.calculateGrowth) ──
  let croissance = 0;
  if (caRealisePrev <= 0) {
    croissance = caRealise > 0 ? 100 : 0;
  } else {
    croissance = Number(((caRealise - caRealisePrev) / caRealisePrev * 100).toFixed(2));
  }


  // ── 5. COÛTS (votre requête existante) ──
  const resCouts = await this.dataSource.query(`
    SELECT COALESCE(SUM(ABS(f.montant)), 0) as total
    FROM dw.fact_finance f
    JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
    JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
    WHERE t.date_key BETWEEN $1 AND $2
      AND tf.type IN ('depense_formateur', 'depense_logistique')
      ${formationId ? `AND f.sk_formation = (SELECT sk_formation FROM dw.dim_formation WHERE formation_id = $3)` : ''}
  `, formationId ? [startDate, endDate, formationId] : [startDate, endDate]);

  // ── 6. CA FACTURÉ (votre requête existante) ──
  const resFacture = await this.dataSource.query(`
    SELECT COALESCE(SUM(calc.ca_session), 0) as total
    FROM (
      SELECT ds.prix_session * COUNT(DISTINCT f.sk_apprenant) as ca_session
      FROM dw.dim_session ds
      JOIN dw.fact_finance f ON ds.sk_session = f.sk_session
      JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
      WHERE ds.date BETWEEN $1 AND $2
        AND f.sk_apprenant <> -1
        ${formationId ? `AND fo.formation_id = $3` : ''}
      GROUP BY ds.sk_session, ds.prix_session
    ) calc
  `, formationId ? [startDate, endDate, formationId] : [startDate, endDate]);

  const couts = parseFloat(resCouts[0].total) || 0;
  const caFacture = parseFloat(resFacture[0].total) || 0;

  const margeBrute = caRealise - couts;
  const encoursClient = Math.max(0, caFacture - caRealise);
  const tauxMarge = caRealise > 0 ? (margeBrute / caRealise) * 100 : 0;

  return {
    caRealise: Number(caRealise.toFixed(2)),
    caFacture: Number(caFacture.toFixed(2)),
    encoursClient: Number(encoursClient.toFixed(2)),
    margeBrute: Number(margeBrute.toFixed(2)),
    tauxMarge: Number(tauxMarge.toFixed(2)),
    croissance: Number(croissance.toFixed(2)),
  };
}




// Formate une Date LOCALE en YYYY-MM-DD
private fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

private async computeCroissanceDwh(filter: FinancierDashboardFilterDto): Promise<number> {
  const { currentStart, currentEnd, previousStart, previousEnd } = this.resolvePeriods(filter);
  const formationId = filter.formationId ? Number(filter.formationId) : null;

  const getCa = async (start: string, end: string) => {
    const params: any[] = [start, end];
    let fQuery = '';
    if (formationId) {
      params.push(formationId);
      fQuery = `AND fo.formation_id = $3`;
    }

    // ✅ ABS() + COALESCE identique à FinanceRevenueService
    const res = await this.dataSource.query(`
      SELECT COALESCE(SUM(ABS(f.montant)), 0) as total
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      LEFT JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
      WHERE tf.type = 'paiement'
        AND t.date_key BETWEEN $1 AND $2
        ${fQuery}
    `, params);
    return parseFloat(res[0]?.total) || 0;
  };

  const fmt = (d: Date) => 
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const current = await getCa(fmt(currentStart), fmt(currentEnd));
  const previous = await getCa(fmt(previousStart), fmt(previousEnd));

  // ✅ Même formule que FinanceRevenueService.calculateGrowth
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

  private getResolvedDates(filter: FinancierDashboardFilterDto) {
  const now = new Date();

  if (filter.startDate && filter.endDate) {
    return {
      startDate: filter.startDate,
      endDate: filter.endDate,
    };
  }

  // ✅ Utilise fmt (local time) au lieu de toISOString() (UTC)
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
  return {
    startDate: this.fmt(firstDayOfYear),
    endDate: this.fmt(now),
  };
}



  async getRevenueByMonth(filter: FinancierDashboardFilterDto): Promise<MonthlyRevenueItemDto[]> {
    // 1. Récupération des dates (on utilise ta fonction dynamique)
    const { startDate, endDate } = await this.getResolvedDates(filter);

    // 2. Préparation des paramètres
    const params: any[] = [startDate, endDate];
    let formationFilter = '';

    if (filter.formationId) {
        params.push(filter.formationId);
        formationFilter = `AND fo.formation_id = $${params.length}`;
    }

    // 3. Requête sur la Data Warehouse
    // LPAD permet de transformer le mois "5" en "05" pour avoir le format YYYY-MM
    const rows = await this.dataSource.query(`
        SELECT 
            t.annee || '-' || LPAD(t.mois::text, 2, '0') as "month",
            SUM(f.montant) as "caRealise"
        FROM dw.fact_finance f
        INNER JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
        INNER JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
        LEFT JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
        WHERE tf.type = 'paiement'
          AND t.date_key BETWEEN $1 AND $2
          ${formationFilter}
        GROUP BY t.annee, t.mois
        ORDER BY t.annee ASC, t.mois ASC
    `, params);

    // 4. Mapping des résultats
    return rows.map((row) => ({
        month: row.month,
        caRealise: Number(parseFloat(row.caRealise || 0).toFixed(2)),
    }));
}


  async getRevenuCoutByCategory(filter: FinancierDashboardFilterDto): Promise<CategoryRevenueCostItemDto[]> {
    const { startDate, endDate } = await this.getResolvedDates(filter);
    const params: any[] = [startDate, endDate];
    let formationFilter = '';

    if (filter.formationId) {
        params.push(filter.formationId);
        formationFilter = `AND fo.formation_id = $3`;
    }

    const rows = await this.dataSource.query(`
        SELECT 
            COALESCE(fo.categorie, 'Non classée') as "categorie",
            SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) as "revenue",
            SUM(CASE WHEN tf.type IN ('depense_formateur', 'depense_logistique') THEN -f.montant ELSE 0 END) as "cout"
        FROM dw.fact_finance f
        INNER JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
        INNER JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
        LEFT JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
        WHERE t.date_key BETWEEN $1 AND $2
        ${formationFilter}
        GROUP BY fo.categorie
        ORDER BY "revenue" DESC
    `, params);

    // 3. Mapping direct des résultats
    return rows.map((r) => ({
        categorie: r.categorie,
        revenue: Number(parseFloat(r.revenue || 0).toFixed(2)),
        cout: Number(parseFloat(r.cout || 0).toFixed(2)),
    }));
}

  async getCaByFormation(filter: FinancierDashboardFilterDto): Promise<FormationRevenueItemDto[]> {
    // 1. Récupération des dates (Dynamique)
    const { startDate, endDate } = await this.getResolvedDates(filter);

    // 2. Préparation des paramètres
    const params: any[] = [startDate, endDate];
    let formationFilter = '';

    if (filter.formationId) {
        params.push(filter.formationId);
        formationFilter = `AND fo.formation_id = $${params.length}`;
    }

    // 3. Requête sur la Table de Fait et la Dimension Formation
    const rows = await this.dataSource.query(`
        SELECT 
            fo.formation_id as "formationId", 
            fo.titre as "formationTitle", 
            SUM(f.montant) as "caRealise"
        FROM dw.fact_finance f
        INNER JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
        INNER JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
        INNER JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
        WHERE tf.type = 'paiement'
          AND t.date_key BETWEEN $1 AND $2
          ${formationFilter}
        GROUP BY fo.formation_id, fo.titre
        ORDER BY "caRealise" DESC
        LIMIT 6
    `, params);

    // 4. Mapping final
    return rows.map((row) => ({
        formationId: Number(row.formationId),
        formationTitle: row.formationTitle,
        caRealise: Number(parseFloat(row.caRealise || 0).toFixed(2)),
    }));
}
  async getSessionsPerformance(filter: FinancierDashboardFilterDto): Promise<SessionsPerformanceResponseDto> {
  const { startDate, endDate } = await this.getResolvedDates(filter);
  const formationId = filter.formationId ? Number(filter.formationId) : null;
  
  // Paramètres de pagination
  const page = filter.page ?? 1;
  const limit = filter.limit ?? 10;
  const offset = (page - 1) * limit;

  const params: any[] = [startDate, endDate, limit, offset];
  let formationFilter = '';
  if (formationId) {
    params.push(formationId);
    formationFilter = `AND fo.formation_id = $5`;
  }

  const raws = await this.dataSource.query(`
    SELECT 
      ds.session_id as "sessionid",
      ds.titre as "sessiontitle",
      fo.titre as "formationtitle",
      ds.date as "date",
      ds.capacite as "capacite",
      ds.prix_session as "prix_unitaire",
      COUNT(DISTINCT CASE WHEN f.sk_apprenant <> -1 THEN f.sk_apprenant END) as "inscrits",
      COALESCE(SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END), 0) as "ca_encaisse",
      COALESCE(SUM(CASE WHEN tf.type IN ('depense_formateur', 'depense_logistique') THEN ABS(f.montant) ELSE 0 END), 0) as "cout_total",
      COUNT(*) OVER() as "total_count" -- Récupère le total global avant le LIMIT
    FROM dw.dim_session ds
    INNER JOIN dw.fact_finance f ON ds.sk_session = f.sk_session
    INNER JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
    INNER JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
    WHERE ds.date BETWEEN $1 AND $2
    ${formationFilter}
    GROUP BY ds.session_id, ds.titre, fo.titre, ds.date, ds.capacite, ds.prix_session
    ORDER BY ds.date DESC
    LIMIT $3 OFFSET $4
  `, params);

  const total = raws.length > 0 ? parseInt(raws[0].total_count) : 0;

  const items = raws.map(row => ({
      sessionId: row.sessionid,
      session: row.sessiontitle,
      formation: row.formationtitle,
      date: row.date,
      inscrits: parseInt(row.inscrits),
      capacite: parseInt(row.capacite),
      caEncaisse: parseFloat(row.ca_encaisse),
      cout: parseFloat(row.cout_total),
      margeNette: parseFloat(row.ca_encaisse) - parseFloat(row.cout_total),
      roi: parseFloat(row.cout_total) > 0 ? ((parseFloat(row.ca_encaisse) - parseFloat(row.cout_total)) / parseFloat(row.cout_total)) * 100 : 0,
      roiTrend: "stable", // ou votre logique
      status: this.resolveSessionStatus(parseFloat(row.ca_encaisse), (parseInt(row.inscrits) * parseFloat(row.prix_unitaire)))
  }));

  return { 
    items, 
    page, 
    limit, 
    total, 
    totalPages: Math.ceil(total / limit) || 1 
  };
}
  private resolvePeriods(filter: FinancierDashboardFilterDto) {
  // ✅ On réutilise EXACTEMENT les mêmes dates que getKpisGlobaux
  const { startDate, endDate } = this.getResolvedDates(filter);
  
  const currentStart = new Date(startDate);
  const currentEnd = new Date(endDate);
  const diff = currentEnd.getTime() - currentStart.getTime();

  return {
    currentStart,
    currentEnd,
    previousStart: new Date(currentStart.getTime() - diff),
    previousEnd: new Date(currentEnd.getTime() - diff),
  };
}


  private resolveSessionStatus(caEncaisse: number, caFacture: number): PaiementStatus {
    if (caFacture <= 0) return PaiementStatus.PAID; // Rien à payer
    if (caEncaisse <= 0) return PaiementStatus.UNPAID;
    if (caEncaisse >= caFacture) return PaiementStatus.PAID;
    return PaiementStatus.PARTIAL;
  }
  private sortPerformanceRows(// ta3mel tri haseb haja mou3ayna 
    rows: SessionPerformanceRowDto[],
    sortBy: PerformanceSortBy,
    sortOrder: SortOrder,
  ): SessionPerformanceRowDto[] {
    const direction = sortOrder === SortOrder.ASC ? 1 : -1;
    //amaltna copy , bech manbadlouch el assli
    //kol marra bech y9aren bin zouz 
    //a ligne w b ligne , kol wehed fihom fih les valeurs de cette ligne du table
    return rows.sort((a, b) => {
    //lenna nakhtarou appartir de quoi , tri bech ykoun(sort by)
      const left = a[sortBy];//left bech ywalli feha a.sortby exple 200
      const right = b[sortBy];// b.sortby exple 120
      // 1. Gestion des chaînes de caractères (ex: nom de la formation) 
      if (typeof left === 'string' && typeof right === 'string') {//comparaidon selon les alphabets
        return left.localeCompare(right as string) * direction;
      }

      // 2. Gestion des nombres (ex: revenus, taux de succès, marge)
      // On force la conversion en nombre au cas où, et on fournit 0 par défaut
      const numLeft = Number(left) || 0;
      const numRight = Number(right) || 0;
      
      return (numLeft - numRight) * direction; //si (numLeft - numRight) positif left akber sinon right akber
    });
  }
}

