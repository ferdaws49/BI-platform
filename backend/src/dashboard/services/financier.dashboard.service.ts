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
  
  async getKpisGlobaux(filter: FinancierDashboardFilterDto): Promise<DashboardKpisDto> {
    const { startDate, endDate } = await this.getResolvedDates(filter);
    const params: any[] = [startDate, endDate];
    let formationFilter = '';

    if (filter.formationId) {
      params.push(filter.formationId);
      formationFilter = `AND f.sk_formation = (SELECT sk_formation FROM dw.dim_formation WHERE formation_id = $${params.length})`;
    }

    const results = await this.dataSource.query(`
      SELECT 
        -- CA Réalisé : Ce qui est vraiment encaissé (Paiements - Remboursements)
        SUM(CASE WHEN tf.type = 'paiement' THEN f.montant 
                  ELSE 0 END) as ca_realise,
        
        -- Coûts : Somme positive des dépenses
        SUM(CASE WHEN tf.type IN ('depense_formateur', 'depense_logistique') THEN ABS(f.montant) ELSE 0 END) as total_couts,

        -- CA Facturé (Basé sur le prix de la session x nombre d'inscrits uniques)
        -- Note: On utilise une sous-requête ou on calcule la somme des prix_session par inscription
        (
           SELECT COALESCE(SUM(ds.prix_session * inscrits.nb), 0)
        FROM dw.dim_session ds
        INNER JOIN (
            -- On compte les apprenants uniques par session
            SELECT f_sub.sk_session, f_sub.sk_formation, COUNT(DISTINCT f_sub.sk_apprenant) as nb
            FROM dw.fact_finance f_sub
            WHERE f_sub.sk_apprenant != -1
            GROUP BY f_sub.sk_session, f_sub.sk_formation
        ) inscrits ON ds.sk_session = inscrits.sk_session
        INNER JOIN dw.dim_formation df_sub ON inscrits.sk_formation = df_sub.sk_formation
        WHERE ds.date BETWEEN $1 AND $2 -- On utilise la date de la SESSION ici
        ${formationFilter}           -- On filtre par formation ici aussi
      ) as ca_facture

      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE t.date_key BETWEEN $1 AND $2
      ${formationFilter}
    `, params);

    

    const caRealise = parseFloat(results[0]?.ca_realise || 0);
    const couts = parseFloat(results[0]?.total_couts || 0);
    const caFacture = parseFloat(results[0]?.ca_facture || 0);

    const margeBrute = caRealise - couts;
    const encoursClient = Math.max(0, caFacture - caRealise);
    const tauxMarge = caRealise > 0 ? (margeBrute / caRealise) * 100 : 0;
    
    const croissance = await this.computeCroissanceDwh(filter);

    return {
      caRealise: Number(caRealise.toFixed(2)),
      caFacture: Number(caFacture.toFixed(2)),
      encoursClient: Number(encoursClient.toFixed(2)),
      margeBrute: Number(margeBrute.toFixed(2)),
      tauxMarge: Number(tauxMarge.toFixed(2)),
      croissance: Number(croissance.toFixed(2)),
    };
  }

private async computeCroissanceDwh(filter: FinancierDashboardFilterDto): Promise<number> {
  const { currentStart, currentEnd, previousStart, previousEnd } = this.resolvePeriods(filter);

  const getCa = async (start: string, end: string) => {
    const res = await this.dataSource.query(`
      SELECT SUM(f.montant) as total
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE tf.type = 'paiement' 
      AND t.date_key BETWEEN $1 AND $2
    `, [start, end]);
    return parseFloat(res[0]?.total) || 0;
  };

    const fmt = (d: Date) => 
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const current = await getCa(fmt(currentStart), fmt(currentEnd));
  const previous = await getCa(fmt(previousStart), fmt(previousEnd));

  return previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
}

  private getResolvedDates(filter: FinancierDashboardFilterDto) {
  const now = new Date();
  const currentYear = now.getFullYear();

  const startDate = filter.startDate || `${currentYear - 1}-01-01`; // Janvier de l'année dernière
  const endDate = filter.endDate || `${currentYear + 5}-12-31`;     // Décembre dans 5 ans (inclut 2026)

  return { startDate, endDate };
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
    // 1. Récupération des dates (toujours avec ta fonction dynamique)
    const { startDate, endDate } = await this.getResolvedDates(filter);

    // 2. Requête unique sur la table de fait
    // On utilise l'agrégation conditionnelle (SUM CASE WHEN)
    const rows = await this.dataSource.query(`
        SELECT 
            COALESCE(fo.categorie, 'Non classée') as "categorie",
            -- Somme des revenus (lignes de paiements)
            SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) as "revenue",
            -- Somme des coûts (lignes d'initialisation de session)
            SUM(CASE WHEN tf.type IN ('depense_formateur', 'depense_logistique') THEN -f.montant ELSE 0 END) as "cout"
        FROM dw.fact_finance f
        INNER JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
        INNER JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
        LEFT JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
        WHERE t.date_key BETWEEN $1 AND $2
        GROUP BY fo.categorie
        ORDER BY "revenue" DESC
    `, [startDate, endDate]);

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

    const raws = await this.dataSource.query(`
      SELECT 
        ds.session_id as "sessionid",
        df.titre as "formationtitle",
        ds.titre as "sessiontitle",
        ds.date as "date",
        ds.capacite as "capacite",
        ds.prix_session as "prix_unitaire",
        COUNT(DISTINCT CASE WHEN f.sk_apprenant <> -1 THEN f.sk_apprenant END) as "inscrits",
        -- CA Encaissé (Paiements - Remboursements)
        SUM(CASE WHEN tf.type = 'paiement' THEN f.montant 
                 WHEN tf.type = 'remboursement' THEN -f.montant ELSE 0 END) as "ca_encaisse",
        -- Coûts (on les veut en positif ici pour le calcul)
        SUM(CASE WHEN tf.type IN ('depense_formateur', 'depense_logistique') THEN f.montant ELSE 0 END) as "cout_total"
      FROM dw.dim_session ds
      LEFT JOIN dw.fact_finance f ON ds.sk_session = f.sk_session
      LEFT JOIN dw.dim_formation df ON f.sk_formation = df.sk_formation
      LEFT JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE ds.date BETWEEN $1 AND $2
      GROUP BY ds.sk_session, ds.session_id, df.titre, ds.titre, ds.date, ds.capacite, ds.prix_session
    `, [startDate, endDate]);

    let rows: SessionPerformanceRowDto[] = raws.map((row) => {
      const caEncaisse = parseFloat(row.ca_encaisse || 0);
      const cout = parseFloat(row.cout_total || 0);
      const inscrits = parseInt(row.inscrits || 0);
      const caTheoriqueFacture = inscrits * parseFloat(row.prix_unitaire || 0);
      
      return {
        sessionId: row.sessionid,
        session: row.sessiontitle,
        formation: row.formationtitle,
        date: row.date,
        inscrits: inscrits,
        capacite: parseInt(row.capacite || 0),
        caEncaisse: caEncaisse,
        cout: cout,
        margeNette: caEncaisse - cout,
        roi: cout > 0 ? ((caEncaisse - cout) / cout) * 100 : 0,
        // Status basé sur : Est-ce que ce qui est encaissé >= ce qui est dû
        status: this.resolveSessionStatus(caEncaisse, caTheoriqueFacture),
      };
    });


  // 3. Filtrage Status, Tri et Pagination (Inchangé)
  if (filter.status && filter.status !== 'undefined') {
    rows = rows.filter((row) => row.status === filter.status);
  }

  const sortBy = filter.sortBy ?? PerformanceSortBy.DATE;
  const sortOrder = filter.sortOrder ?? SortOrder.DESC;
  rows = this.sortPerformanceRows(rows, sortBy, sortOrder);

  const page = filter.page ?? 1;
  const limit = filter.limit ?? 10;
  const total = rows.length;
  
  return {
    items: rows.slice((page - 1) * limit, page * limit),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
  

  private resolvePeriods(filter: FinancierDashboardFilterDto) {
    const currentEnd = filter.endDate ? new Date(filter.endDate) : new Date();
    const currentStart = filter.startDate ? new Date(filter.startDate) : new Date(currentEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    const diff = currentEnd.getTime() - currentStart.getTime();
    return {
      currentStart, currentEnd,
      previousStart: new Date(currentStart.getTime() - diff),
      previousEnd: new Date(currentEnd.getTime() - diff)
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

