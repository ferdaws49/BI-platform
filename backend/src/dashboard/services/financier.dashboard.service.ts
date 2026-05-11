import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Session } from 'src/sessions/entities/session.entity';
import { Formation } from 'src/formations/entities/formation.entity';
import { Finance, FinanceType } from 'src/finances/entities/finance.entity';
import { FinancierDashboardFilterDto, SortOrder } from 'src/dashboard/dto/financier-dashboard-filter.dto';
import { PerformanceSortBy, PaiementStatus } from 'src/utils/enums';
import { CategoryRevenueCostItemDto, DashboardKpisDto, FormationRevenueItemDto, MonthlyRevenueItemDto, SessionPerformanceRowDto, SessionsPerformanceResponseDto } from 'src/dashboard/dto/financier-dashboard-response.dto';


@Injectable()
export class FinancierDashboardService {
  constructor(
    @InjectRepository(Session) private sessionRepository: Repository<Session>,
    @InjectRepository(Finance) private financeRepository: Repository<Finance>,
    @InjectRepository(Formation) private formationRepository: Repository<Formation>,
  ) {}

  async getAllFormations() {
  return this.formationRepository.find({
    select: ['id', 'titre'],
  });
}
  
  async getKpisGlobaux(filter: FinancierDashboardFilterDto): Promise<DashboardKpisDto> {

    const { startDate, endDate } = this.getResolvedDates(filter);
    //on calcule le totale du chiffre d'affaire realisé(montant reel elli daf3ouh les apprenants)
    const caRealiseQb = this.financeRepository//On cherche dans la table des finance
      .createQueryBuilder('f')//permet d'écrire requête SQL avec un code typescripte
    .select('COALESCE(SUM(f.montant), 0)', 'total')//on additionne tous les montants , 
      // Si aucun paiement n'existe, on renvoie 0 (au lieu de null) c'est le role du COALESCE pour que la base de données ne renvoie NULL
    .where('f.type = :type', { type: FinanceType.PAIEMENT });
    this.applyFinanceFilters(caRealiseQb, filter);

    // On applique les filtres de date proprement
  if (filter.startDate && filter.endDate) {
    caRealiseQb.andWhere('CAST(f.date AS DATE) BETWEEN :start AND :end', { 
      start: startDate, 
      end: endDate 
    });
  }

  if (filter.formationId) {
    // Si on filtre par formation, il faut joindre la session
    caRealiseQb.innerJoin('f.session', 's_f')
               .andWhere('s_f.formationId = :fid', { fid: filter.formationId });
  }

  const caRealiseRaw = await caRealiseQb.getRawOne();
  const caRealise =  parseFloat(caRealiseRaw?.total ?? 0);

    // 2. CA Facturé (Ce qui est attendu : Inscrits * Prix) et Coûts
  const sessionKpiQb = this.sessionRepository.createQueryBuilder('s')
    .leftJoin('s.formation', 'fo')
    .leftJoin('sessions_apprenants', 'sa', 'sa.sessionId = s.id')
    .select([
      'SUM(COALESCE(s.prix, fo.prix, 0)) AS "totalFacture"',
      'SUM(COALESCE(s.cout_formateur, 0) + COALESCE(s.cout_logistique, 0)) AS "totalCouts"'
    ])
      // On applique TOUJOURS le filtre ici aussi
    .where('CAST(s.date AS DATE) BETWEEN :start AND :end', { 
      start: startDate, 
      end: endDate 
    });
    if (filter.formationId) {
    sessionKpiQb.andWhere('s.formationId = :fid', { fid: filter.formationId });
  }

  const sessionKpis = await sessionKpiQb.getRawOne();
  const caFacture = parseFloat(sessionKpis?.totalFacture) || 0;
  const couts = parseFloat(sessionKpis?.totalCouts) || 0;
  const encoursClient = caFacture - caRealise;
  const margeBrute = caRealise - couts; // Marge basée sur le réel encaissé
  const tauxMarge = caRealise > 0 ? (margeBrute / caRealise) * 100 : 0;
  const croissance = await this.computeCroissance(filter);

  return {
    caRealise: Number(caRealise.toFixed(2)),
    caFacture: Number(caFacture.toFixed(2)),
    encoursClient: Number(encoursClient.toFixed(2)),
    margeBrute: Number(margeBrute.toFixed(2)),
    tauxMarge: Number(tauxMarge.toFixed(2)),
    croissance: Number(croissance.toFixed(2)),
  };
}

  private getResolvedDates(filter: FinancierDashboardFilterDto) {
  const now = new Date();
  // Par défaut : du 1er Janvier de l'année en cours jusqu'à aujourd'hui
  const defaultStart = `${now.getFullYear()}-01-01`;
  const defaultEnd = now.toISOString().split('T')[0];

  return {
    startDate: filter.startDate || defaultStart,
    endDate: filter.endDate || defaultEnd,
  };
}



  async getRevenueByMonth(filter: FinancierDashboardFilterDto,): Promise<MonthlyRevenueItemDto[]> {
      const { startDate, endDate } = this.getResolvedDates(filter);
    const qb = this.financeRepository.createQueryBuilder('f')
      .select(`TO_CHAR(f."date", 'YYYY-MM')`, 'month')// to char pour transformer la date en un texte simple, pour que le graphique peut lire facilement
      .addSelect('COALESCE(SUM(f.montant), 0)', 'caRealise')
      .where('f.type = :type', { type: FinanceType.PAIEMENT })
      .andWhere('CAST(f.date AS DATE) BETWEEN :start AND :end', { 
      start: startDate, 
      end: endDate 
    });
       this.applyFinanceFilters(qb, filter);
    
    const rows = await qb
      .groupBy("TO_CHAR(f.date, 'YYYY-MM')")
      .orderBy("month", 'ASC')
      .getRawMany();
    
    return rows.map((row) => ({
      month: row.month,
      caRealise: Number(row.caRealise),
    }));
  }


  async getRevenuCoutByCategory(filter: FinancierDashboardFilterDto): Promise<CategoryRevenueCostItemDto[]> {
    const { startDate, endDate } = this.getResolvedDates(filter);

    // 1. REVENU par catégorie (basé sur la date du paiement f.date)
    const revenueRows = await this.financeRepository.createQueryBuilder('f')
        .innerJoin('f.session', 's')
        .innerJoin('s.formation', 'form')
        .select("COALESCE(form.categorie, 'Non classée')", 'categorie')
        .addSelect('SUM(f.montant)', 'revenue')
        .where('f.type = :type', { type: FinanceType.PAIEMENT }) // Premier filtre
        // ✅ Utilise .andWhere pour ne pas effacer le type, et utilise f.date
        .andWhere('CAST(f.date AS DATE) BETWEEN :start AND :end', { start: startDate, end: endDate })
        .groupBy('form.categorie')
        .getRawMany();
        
    // 2. COÛT par catégorie (basé sur la date de la session s.date)
    const costRows = await this.sessionRepository.createQueryBuilder('s')
        .innerJoin('s.formation', 'form')
        .select("COALESCE(form.categorie, 'Non classée')", 'categorie')
        .addSelect('SUM(COALESCE(s.cout_formateur, 0) + COALESCE(s.cout_logistique, 0))', 'cout')
        .where('CAST(s.date AS DATE) BETWEEN :start AND :end', { start: startDate, end: endDate })
        .groupBy('form.categorie')
        .getRawMany();

    // 3. Fusion des données
    const map = new Map<string, CategoryRevenueCostItemDto>();

    for (const row of revenueRows) {
        map.set(row.categorie, {
            categorie: row.categorie,
            revenue: parseFloat(row.revenue) || 0,
            cout: 0,
        });
    }

    for (const row of costRows) {
        const entry = map.get(row.categorie) || { categorie: row.categorie, revenue: 0, cout: 0 };
        entry.cout = parseFloat(row.cout) || 0;
        map.set(row.categorie, entry);
    }

    // Retourne le tableau trié par revenu décroissant
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }

  async getCaByFormation(filter: FinancierDashboardFilterDto): Promise<FormationRevenueItemDto[]> {
    const { startDate, endDate } = this.getResolvedDates(filter);
    const qb = this.financeRepository.createQueryBuilder('f')
      .innerJoin('f.session', 's')
      .innerJoin('s.formation', 'form')
      .select(['form.id AS "formationId"', 'form.titre AS "formationTitle"'])
      .addSelect('SUM(f.montant)', 'caRealise')
      .where('f.type = :type', { type: FinanceType.PAIEMENT })
    .andWhere('CAST(f.date AS DATE) BETWEEN :start AND :end', { 
      start: startDate, 
      end: endDate 
    });

    if (filter.formationId) {
    qb.andWhere('form.id = :fid', { fid: filter.formationId });
  }

     const rows = await qb
      .groupBy('form.id, form.titre')
      .orderBy('"caRealise"', 'DESC')
      .limit(6)
      .getRawMany();

    return rows.map((row) => ({
      formationId: Number(row.formationId),
      formationTitle: row.formationTitle,
      caRealise: Number(row.caRealise),//necessaire à convertir pour que chart pouvait l'afficher correctement
    }));
    
  }

  async getSessionsPerformance(filter: FinancierDashboardFilterDto,): Promise<SessionsPerformanceResponseDto> {
    const { startDate, endDate } = this.getResolvedDates(filter);
    const qb = this.sessionRepository.createQueryBuilder('s')//bech nekhdem ala table de session
      .leftJoin('s.formation' ,'f')// w hachti b essem el formation donc ayat le table du formation
      .select([
        's.id AS "sessionId"',
        's.title AS "sessionTitle"',
        's.date AS "date"',
        'f.titre AS "formationTitle"',
        'COALESCE(s.capacite, 0) AS "capacite"',
        'COALESCE(s.prix, f.prix, 0) AS "unitPrice"',
        'COALESCE(s.cout_formateur, 0) AS "coutFormateur"',
        'COALESCE(s.cout_logistique, 0) AS "coutLogistique"',
      ]);

    // Sous-requêtes
    qb.addSelect(sub => {
    return sub.select('COUNT(*)', 'count')
      .from('sessions_apprenants', 'sa')
      .where('sa."sessionId" = s.id'); // ✅ Guillemets pour PostgreSQL
  }, 'inscrits');
    qb.addSelect(sub => {
    return sub.select('SUM(fin.montant)', 'sum')
      .from('finances', 'fin')
      .where('fin."sessionId" = s.id') // ✅ Guillemets pour PostgreSQL
      .andWhere('fin.type = :type', { type: FinanceType.PAIEMENT });
  }, 'caEncaisse');

    qb.where('CAST(s.date AS DATE) BETWEEN :start AND :end', { start: startDate, end: endDate });


     if (filter.formationId) {
    qb.andWhere('f.id = :fid', { fid: filter.formationId });
  }
    
    const raws = await qb.getRawMany();

    let rows: SessionPerformanceRowDto[] = raws.map((row) => {//nbadlou string to number
      const caEncaisse = parseFloat(row.caEncaisse);
      const unitPrice = parseFloat(row.unitPrice) || 0;
      const inscrits = parseInt(row.inscrits) || 0;
       const caFacture = unitPrice * inscrits;
      const cout = (parseInt(row.coutFormateur)|| 0) + (parseInt(row.coutLogistique)|| 0);
      const margeNette = caEncaisse - cout;
      const roi = cout > 0 ? (margeNette / cout) * 100 : 0;
      const status = this.resolveSessionStatus(caEncaisse, caFacture);
    
    return {
        sessionId: row.sessionId,
        session: row.sessionTitle,
        formation: row.formationTitle,
        date: row.date,
        inscrits,
        capacite:  parseInt(row.capacite),
        caEncaisse,
        cout,
        margeNette,
        roi,
        status,
    };

    });
    
    if (filter.status && filter.status !== "undefined") {
      rows = rows.filter((row) => row.status === filter.status);
    }
    const sortBy = filter.sortBy ?? PerformanceSortBy.DATE;
    const sortOrder = filter.sortOrder ?? SortOrder.DESC;
    rows = this.sortPerformanceRows(rows, sortBy, sortOrder);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const total = rows.length;
    const start = (page - 1) * limit;
    const paginatedRows = rows.slice(start, start + limit);
    return {
         items: paginatedRows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

    //partie des filtres
  private applyFinanceFilters(qb: SelectQueryBuilder<Finance>,//hedha yekhdem ala el finance
    filter: FinancierDashboardFilterDto,) {
        if (filter.startDate) {//yekhdem ala date de paiement
            qb.andWhere('CAST(f.date AS DATE) >= :start', { start: filter.startDate });//tjib donné mn date mou3ayna
        }
        if (filter.endDate) {
            qb.andWhere('CAST(f.date AS DATE) <= :end', { end: filter.endDate });//tjib donnés hatta l data mou3ayna
        }
        if (filter.formationId) {
            qb.innerJoin('f.session', 'fs').andWhere('fs.formationId = :fid', { fid: filter.formationId });
        }
  }
  private async computeCroissance(filter: FinancierDashboardFilterDto): Promise<number> {
    const { currentStart, currentEnd, previousStart, previousEnd } = this.resolvePeriods(filter);

    const getCa = async (start: Date, end: Date) => {
      const res = await this.financeRepository.createQueryBuilder('f')
        .select('SUM(f.montant)', 'total')
        .where('f.type = :type AND f.date BETWEEN :s AND :e', { type: FinanceType.PAIEMENT, s: start, e: end })
        .getRawOne();
      return parseFloat(res?.total) || 0;
    };

    const current = await getCa(currentStart, currentEnd);
    const previous = await getCa(previousStart, previousEnd);

    return previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
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
  private resolveSessionStatus(
    //teba3 table
    caEncaisse: number,
    caFacture: number,
  ): PaiementStatus {
    if (caEncaisse <= 0) {
      return PaiementStatus.UNPAID;
    }
    if (caEncaisse >= caFacture && caFacture > 0) {// hattina caFacture > 0 khater lezem tkoun famma flous bech tetkhales sinon erreur
      return PaiementStatus.PAID;
    }
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