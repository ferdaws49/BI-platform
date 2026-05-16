import { InjectRepository } from "@nestjs/typeorm";
import { Session } from "../../sessions/entities/session.entity";
import { Repository, SelectQueryBuilder } from "typeorm";
import { Finance, FinanceType } from "../entities/finance.entity";
import { User } from "../../users/users.entity";
import { BubbleMetric, RevenueFilterDto, SortOrder } from "../dto/revenue-filter.dto";
import { 
  BubbleChartPointDto, 
  CategoryRevenueShareDto, 
  KpiCardsDto, 
  PaymentManagementBarDto, 
  PaymentManagementKpisDto, 
  PaymentManagementPieDto, 
  PaymentManagementTableResponseDto, 
  PaymentManagementTableRowDto, 
  PaymentStatusSliceDto, 
  RevenueEvolutionMultiLineDto, 
  SessionRevenueTableResponseDto, 
  SessionRevenueTableRowDto, 
  TopFormationKpiDto, 
  VariationTrendDto 
} from "../dto/revenue-response.dto";
import { growthPercent, resolveDashboardPeriod } from "src/utils/period.utils";
import { PaiementStatus, PerformanceSortBy } from "src/utils/enums";
import { Formation } from "src/formations/entities/formation.entity";
import { FormationRevenueItemDto } from "src/dashboard/dto/financier-dashboard-response.dto";
import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { AddPaymentDto } from "../dto/add-payement.dto";
import { Apprenant } from "src/apprenants/entities/apprenant.entity";


@Injectable()
export class FinanceRevenueService {
  
  constructor(
    @InjectRepository(Session) private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Finance) private readonly financeRepository: Repository<Finance>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Formation) private readonly formationRepository: Repository<Formation>,
    @InjectRepository(Apprenant) private readonly apprenantRepository: Repository<Apprenant>,

    
    
  ) {}
  
//kpi shiha testitha w amalt comparaison dans sql
  async getKpiCards(filter: RevenueFilterDto): Promise<KpiCardsDto> {
    const {currentStart, currentEnd, previousStart, previousEnd } = this.resolveDashboardPeriod(filter);
    
   const [curRev, prevRev, curFact, prevFact, curIns, prevIns, topFormation] = await Promise.all([
      this.sumFinanceInRange(currentStart, currentEnd, FinanceType.PAIEMENT, filter.formationId),
      this.sumFinanceInRange(previousStart, previousEnd, FinanceType.PAIEMENT, filter.formationId),
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
      topFormation : topFormation ? topFormation.titre : 'N/A',
      averageBasket: Number(averageBasket.toFixed(2)),
      averageBasketGrowthPercent: this.calculateGrowth(averageBasket, prevAvgBasket),
    };
  }

  /** Somme des paiements encaissés */
  private async sumFinanceInRange(start: string, end: string, type: FinanceType, formationId?: number): Promise<number> {
    const qb = this.financeRepository.createQueryBuilder('finance')
      .select('SUM(finance.montant)', 'sum')
      .where('CAST(finance.date AS DATE) BETWEEN :start AND :end', { start, end })
      .andWhere('finance.type = :type', { type });

    if (formationId) {
      qb.innerJoin('finance.session', 'session')
        .andWhere('session.formationId = :formationId', { formationId });
    }

    const res = await qb.getRawOne();
    return parseFloat(res.sum) || 0;
  }

   /** Somme du facturé (Paiements + Impayés) pour le taux de recouvrement */
  /** 1. Somme du facturé (Paiements + Impayés) - Pour le taux de recouvrement */
  private async sumFactureTotal(start: string, end: string, formationId?: number): Promise<number> {
    const qb = this.financeRepository.createQueryBuilder('finance')
      .select('SUM(finance.montant)', 'sum')
      .where('CAST(finance.date AS DATE) BETWEEN :start AND :end', { start, end })
      // On compte les paiements ET les impayés pour savoir ce qu'on attendait au total
      .andWhere('finance.type IN (:...types)', { types: [FinanceType.PAIEMENT, FinanceType.IMPAYE] });/** */

    if (formationId) {
      qb.innerJoin('finance.session', 'session')
        .andWhere('session.formationId = :formationId', { formationId });
    }

    const res = await qb.getRawOne();
    return parseFloat(res.sum) || 0;
  } 

  /** 2. Nombre d'inscriptions liées aux finances de la période - Pour le Panier Moyen */
  private async countInscriptionsInRange(start: string, end: string, formationId?: number): Promise<number> {
    const qb = this.sessionRepository.createQueryBuilder('session')
    .innerJoin('session.apprenants', 'apprenant') // On compte les élèves uniques qui ont payé
      .where('CAST(session.date AS DATE) BETWEEN :start AND :end', { start, end })

    if (formationId) {
      qb.andWhere('session.formationId = :formationId', { formationId });
    }

    const res = await qb.select('COUNT(DISTINCT apprenant.id)', 'count').getRawOne();

    return parseInt(res.count) || 0;
  }

  /** 3. Top Formation par revenu */
  private async getTopFormationByRevenue(start: string, end: string) {
    const res = await this.financeRepository.createQueryBuilder('finance')
      .innerJoin('finance.session', 'session')
      .innerJoin('session.formation', 'formation')
      .select('formation.titre', 'titre')
      .addSelect('SUM(finance.montant)', 'total')
      .where('CAST(finance.date AS DATE) BETWEEN :start AND :end', { start, end })
      .andWhere('finance.type = :type', { type: FinanceType.PAIEMENT })
      .groupBy('formation.id')
      .addGroupBy('formation.titre')
      .orderBy('total', 'DESC')
      .limit(1)
      .getRawOne();
      
    return res;
  }

  /** Calcul simple de pourcentage de croissance */
  private calculateGrowth(current: number, previous: number): number {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Number(((current - previous) / previous * 100).toFixed(2));
  }

  /** Utilitaire pour gérer les dates */
  private resolveDashboardPeriod(filter: RevenueFilterDto) {
    const currentStart = filter.startDate  || `${new Date().getFullYear()}-01-01`;
    const currentEnd = filter.endDate || new Date().toISOString().split('T')[0];
     console.log("Période analysée par NestJS :", currentStart, "au", currentEnd);
    
     // On calcule les dates pour la période précédente (en restant sur du pur Date pour le calcul)
    const start = new Date(currentStart);
    const end = new Date(currentEnd);
    const diff = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - diff);
    const previousEnd = new Date(end.getTime() - diff);

    return {
    currentStart: currentStart,
    currentEnd: currentEnd,
    previousStart: previousStart.toISOString().split('T')[0],
    previousEnd: previousEnd.toISOString().split('T')[0]
  };
  }



//hedhi khedmet et tester et comparer entre la resultat de la base et le resultat du postman
  async getRevenueEvolutionByFormation(filter: RevenueFilterDto): Promise<RevenueEvolutionMultiLineDto> {
    const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);
    const topN = filter.topFormations ?? 5;
     // 1. Récupérer les IDs des Top N formations par revenu sur la période
    const topIds = await this.getTopFormationIdsByRevenue(currentStart, currentEnd, topN);
    if (topIds.length === 0) {
      return { months: [], series: [] };
    }
    // 2. Récupérer les revenus mensuels pour ces formations
    const rows = await this.financeRepository.createQueryBuilder('finance')
      .innerJoin('finance.session', 'session')
      .select("TO_CHAR(DATE_TRUNC('month', finance.date), 'YYYY-MM')", 'month')
      .addSelect('session.formationId', 'formationId')
      .addSelect('SUM(finance.montant)', 'total')
      .where('CAST(finance.date AS DATE) BETWEEN :currentStart AND :currentEnd', { currentStart, currentEnd })
      .andWhere('finance.type = :type', { type: FinanceType.PAIEMENT })
      .andWhere('session.formationId IN (:...topIds)', { topIds })
      .groupBy("DATE_TRUNC('month', finance.date)")
      .addGroupBy('session.formationId')
      .orderBy("DATE_TRUNC('month', finance.date)", 'ASC')
      .getRawMany<{ month: string; formationId: number; total: string }>();

    // 3. Générer la liste complète des mois entre start et end (pour ne pas avoir de trous dans le graph)
    const months = this.enumerateMonths(currentStart, currentEnd);
    // 4. Charger les titres des formations pour l'affichage
    const titles = await this.loadFormationTitles(topIds);

    // 5. Construire les séries de données pour le graphique (Multi-line)
    const series = topIds.map((id) => {
      const monthlyRevenue = months.map((m) => {
        const hit = rows.find(
          (r) => r.month === m && Number(r.formationId) === id,
        );
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

  /** Récupère les IDs des meilleures formations */
  private async getTopFormationIdsByRevenue(start: string, end: string, limit: number): Promise<number[]> {
    const rows = await this.financeRepository.createQueryBuilder('finance')
      .innerJoin('finance.session', 'session')
      .select('session.formationId', 'id')
      .addSelect('SUM(finance.montant)', 'total')
      .where('CAST(finance.date AS DATE) BETWEEN :start AND :end', { start, end })
      .andWhere('finance.type = :type', { type: FinanceType.PAIEMENT })
      .groupBy('session.formationId')
      .orderBy('total', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map(r => Number(r.id));
  }



  /** Charge les noms des formations pour les légendes du graph */
  private async loadFormationTitles(ids: number[]): Promise<Map<number, string>> {
    const formations = await this.sessionRepository.manager.createQueryBuilder('formations', 'f')
      .select(['f.id', 'f.titre'])
      .where('f.id IN (:...ids)', { ids })
      .getRawMany();

    const map = new Map<number, string>();
    formations.forEach(f => map.set(f.f_id, f.f_titre));
    return map;
  }



   //hehdi validé et teste avec postman et sql
  async getTopFormationsBar(
    filter: RevenueFilterDto,
  ): Promise<FormationRevenueItemDto[]> {
    const limit = filter.topFormations ?? 5;
    return this.getCaByFormationInternal(filter, limit);
  }

  private async getCaByFormationInternal(
    filter:RevenueFilterDto,
    limit: number,
  ): Promise<FormationRevenueItemDto[]> {
   const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);
    // 2. Construction de la requête avec les bonnes jointures
    const qb = this.financeRepository.createQueryBuilder('finance')
      .innerJoin('finance.session', 'session')
      .innerJoin('session.formation', 'formation')
      .select('formation.id', 'formationId')
      .addSelect('formation.titre', 'formationTitle')
      .addSelect('SUM(finance.montant)', 'caRealise')
      // Filtrage par dates (format string sécurisé)
      .where('CAST(finance.date AS DATE) BETWEEN :currentStart AND :currentEnd', { 
        currentStart, 
        currentEnd 
      })
      // On ne compte que les paiements encaissés
      .andWhere('finance.type = :type', { type: FinanceType.PAIEMENT });

    // 3. Filtre optionnel par formationId si présent dans le DTO
    if (filter.formationId) {
      qb.andWhere('formation.id = :formationId', { formationId: filter.formationId });
    }

    // 4. Groupement et Tri
    const rows = await qb
      .groupBy('formation.id')
      .addGroupBy('formation.titre')
      .orderBy('"caRealise"', 'DESC') // Utilisation de guillemets pour l'alias en SQL
      .limit(limit)
      .getRawMany();

    // 5. Mapping propre des résultats
    return rows.map((row) => ({
      formationId: Number(row.formationId),
      formationTitle: row.formationTitle,
      caRealise: Number(parseFloat(row.caRealise).toFixed(2)),
    }));
  }








//fonctionne et tester dans les deux
  async getCategoryPie(filter: RevenueFilterDto): Promise<CategoryRevenueShareDto[]> {
    // 1. Récupération des dates formatées
    const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);

    // 2. Construction de la requête avec les jointures vers Formation
    const qb = this.financeRepository.createQueryBuilder('finance')
      .innerJoin('finance.session', 'session')
      .innerJoin('session.formation', 'formation')
      .select("COALESCE(formation.categorie, 'Non classée')", 'category')
      .addSelect('SUM(finance.montant)', 'revenue')
      .where('CAST(finance.date AS DATE) BETWEEN :currentStart AND :currentEnd', { 
        currentStart, 
        currentEnd 
      })
      .andWhere('finance.type = :type', { type: FinanceType.PAIEMENT });

    // Filtre optionnel par formationId
    if (filter.formationId) {
      qb.andWhere('formation.id = :formationId', { formationId: filter.formationId });
    }

    const rows = await qb
      .groupBy('formation.categorie')
      .getRawMany<{ category: string; revenue: string }>();

    // 3. Premier mapping pour convertir les strings en nombres
    const mapped = rows.map((r) => ({
      category: r.category,
      revenue: Number(parseFloat(r.revenue).toFixed(2)),
    }));

    // 4. Calcul du total pour les pourcentages
    const total = mapped.reduce((a, b) => a + b.revenue, 0);

    // 5. Retour final avec calcul du pourcentage
    return mapped.map((r) => ({
      category: r.category,
      revenue: r.revenue,
      percent: total > 0 ? Number(((r.revenue / total) * 100).toFixed(2)) : 0,
    }));
  }


//correcte
  async getBubbleChart(filter: RevenueFilterDto): Promise<BubbleChartPointDto[]> {
  const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);
  const metric = filter.bubbleMetric ?? BubbleMetric.MARGIN;

  // Requête optimisée pour éviter les doublons de jointure
  const rows = await this.formationRepository.createQueryBuilder('formation')
    .leftJoin('formation.sessions', 'session')
    // Sous-requête pour le revenu (évite de multiplier par le nombre d'apprenants)
    .leftJoin(qb => qb
      .select('f.sessionId', 'sessionId')
      .addSelect('SUM(f.montant)', 'totalRevenue')
      .from('finances', 'f')
      .where('f.type = :type', { type: FinanceType.PAIEMENT })
      .andWhere('CAST(f.date AS DATE) BETWEEN :start AND :end', { start: currentStart, end: currentEnd })
      .groupBy('f.sessionId'), 
      'fin_agg', 'fin_agg."sessionId" = session.id')
    // Sous-requête pour les inscriptions (évite de multiplier par le nombre de paiements)
    .leftJoin(qb => qb
      .select('sa.sessionId', 'sessionId')
      .addSelect('COUNT(DISTINCT sa.apprenantId)', 'totalIns')
      .from('sessions_apprenants', 'sa')
      .groupBy('sa.sessionId'), 
      'ins_agg', 'ins_agg."sessionId" = session.id')
    .select('formation.id', 'formationId')
    .addSelect('formation.titre', 'formationTitle')
    .addSelect('COALESCE(SUM(fin_agg."totalRevenue"), 0)', 'revenue')
    .addSelect('COALESCE(SUM(ins_agg."totalIns"), 0)', 'inscriptions')
    .addSelect('SUM(COALESCE(session.cout_formateur, 0) + COALESCE(session.cout_logistique, 0))', 'totalCosts')
    .addSelect('AVG(COALESCE(session.prix, formation.prix))', 'avgPrice')
    .where('session.date BETWEEN :start AND :end', { start: currentStart, end: currentEnd })
    .groupBy('formation.id')
    .addGroupBy('formation.titre')
    .getRawMany();

  return rows.map((row): BubbleChartPointDto => {
    const revenue = Number(parseFloat(row.revenue).toFixed(2));
    const costs = Number(parseFloat(row.totalCosts).toFixed(2));
    const avgPrice = Number(parseFloat(row.avgPrice).toFixed(2));
    const inscriptions = parseInt(row.inscriptions);

    const margin = revenue - costs;
    const bubbleSize = metric === BubbleMetric.PRICE ? avgPrice : margin;

    return {
      formationId: Number(row.formationId),
      formationTitle: row.formationTitle,
      inscriptions,
      revenue,
      bubbleSize: Number(bubbleSize.toFixed(2)),
      bubbleMetric: metric === BubbleMetric.PRICE ? 'price' : 'margin',
    };
  }).sort((a, b) => b.revenue - a.revenue);
}


//correcte
  async getSessionsRevenueTable(filter: RevenueFilterDto): Promise<SessionRevenueTableResponseDto> {

       // 1. Récupération des périodes (format String YYYY-MM-DD)
    const { currentStart, currentEnd, previousStart, previousEnd } = this.resolveDashboardPeriod(filter);

     // 2. Construction des données (Appel à la base de données)
    const rows = await this.buildSessionRevenueRows(
      filter,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
    );
    // 3. Tri (en mémoire)
    const sortBy = filter.sortBy ?? PerformanceSortBy.DATE;
    const sortOrder = filter.sortOrder ?? SortOrder.DESC;
    const sorted = this.sortSessionRevenueRows(rows, sortBy, sortOrder);

    // 4. Pagination
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const total = sorted.length;
    const start = (page - 1) * limit;
    return {
      items: sorted.slice(start, start + limit),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Construit les lignes du tableau en agrégeant les finances par Session
   */

  
  private async buildSessionRevenueRows(
  filter: RevenueFilterDto,
  curStart: string,
  curEnd: string,
  prevStart: string,
  prevEnd: string,
): Promise<SessionRevenueTableRowDto[]> {
  
  // 1. Création de la requête principale sur les sessions
  const qb = this.sessionRepository.createQueryBuilder('session')
    .innerJoinAndSelect('session.formation', 'formation')
    // On sélectionne les colonnes de base
    .select([
      'session.id AS "sessionId"',
      'session.title AS "sessionTitle"',
      'session.date AS "sessionDate"',
      'session.prix AS "sessionPrix"',
      'formation.titre AS "formationTitle"',
      'formation.prix AS "formationPrix"',
    ]);

  // 2. Sous-requête pour le CA Actuel (évite la multiplication par les apprenants)
  qb.addSelect(subQuery => {
    return subQuery
      .select('SUM(f.montant)', 'ca')
      .from('finances', 'f')
      .where('f.sessionId = session.id')
      .andWhere('f.type = :type', { type: FinanceType.PAIEMENT })
      .andWhere('CAST(f.date AS DATE) BETWEEN :curStart AND :curEnd');
  }, 'caEncaisse');

  // 3. Sous-requête pour le CA Précédent
  qb.addSelect(subQuery => {
    return subQuery
      .select('SUM(f_prev.montant)', 'ca_prev')
      .from('finances', 'f_prev')
      .where('f_prev.sessionId = session.id')
      .andWhere('f_prev.type = :type')
      .andWhere('CAST(f_prev.date AS DATE) BETWEEN :prevStart AND :prevEnd');
  }, 'caEncaissePrev');

  // 4. Sous-requête pour le nombre d'inscrits (évite les doublons)
  qb.addSelect(subQuery => {
    return subQuery
      .select('COUNT(sa.apprenantId)', 'count')
      .from('sessions_apprenants', 'sa')
      .where('sa.sessionId = session.id');
  }, 'inscrits');

  // 5. Filtres
  if (filter.formationId) {
    qb.andWhere('formation.id = :formationId', { formationId: filter.formationId });
  }
  
  if (filter.sessionId) {
    qb.andWhere('session.id = :sessionId', { sessionId: filter.sessionId });
  }

  // Paramètres globaux
  qb.setParameters({ 
    curStart, 
    curEnd, 
    prevStart, 
    prevEnd, 
    type: FinanceType.PAIEMENT 
  });

  const raw = await qb.getRawMany();

  // 6. Mapping des données
  return raw.map((r): SessionRevenueTableRowDto => {
    const current = parseFloat(r.caEncaisse) || 0;
    const previous = parseFloat(r.caEncaissePrev) || 0;
    
    // Logique de prix : prix session sinon prix formation
    const prixFinal = r.sessionPrix !== null ? parseFloat(r.sessionPrix) : (parseFloat(r.formationPrix) || 0);
    const inscrits = parseInt(r.inscrits) || 0;

    // Calcul de la variation
    let percent = 0;
    if (previous > 0) {
      percent = ((current - previous) / previous) * 100;
    } else if (current > 0) {
      percent = 100;
    }

    let trendColor: 'green' | 'red' | 'neutral' = 'neutral';
    if (percent > 0) trendColor = 'green';
    else if (percent < 0) trendColor = 'red';

    return {
      sessionId: r.sessionId,
      session: r.sessionTitle || r.formationTitle,
      formation: r.formationTitle,
      date: r.sessionDate,
      inscrits: inscrits,
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

      // Mapping entre l'Enum et les clés de l'objet
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

//fonctionne corrrectement
 async exportSessionsRevenueCsv(filter: RevenueFilterDto): Promise<string> {
    const { currentStart, currentEnd, previousStart, previousEnd } = this.resolveDashboardPeriod(filter);

    const rows = await this.buildSessionRevenueRows(
      filter,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
    );

    const sorted = this.sortSessionRevenueRows(
      rows,
      filter.sortBy ?? PerformanceSortBy.DATE,
      filter.sortOrder ?? SortOrder.DESC,
    );

    const header = [
       'Session',
    'Formation',
    'Date',
    'Inscrits',
    'Prix (€)',
    'CA Encaisse (€)',
    'Variation (%)',
    'Statut Tendance',
    ];
    const lines = sorted.map((r) =>
      [
        this.csvEscape(r.session),
        this.csvEscape(r.formation),
        r.date,
        r.inscrits,
        r.prix.toFixed(2), 
        r.caEncaisse.toFixed(2),
        r.variation.variationPercent.toFixed(2)+ '%',
        r.variation.color.toUpperCase(),
      ].join(','),
    );
    // 6. Assemblage final avec BOM pour assurer l'encodage UTF-8 dans Excel
    const csvContent = [header.join(','), ...lines].join('\n');
    return '\ufeff' + csvContent;
  }

  private csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  let stringValue = String(value);
  
  // Si la valeur contient des virgules, des guillemets ou des retours à la ligne
  // On l'entoure de guillemets et on double les guillemets existants
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    stringValue = `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}
//correcte

  async getPaymentManagementKpis(filter: RevenueFilterDto): Promise<PaymentManagementKpisDto> {
    const baseFinanceQb = this.getBasePaymentQuery(filter);
    const totalEncaisseRaw = await baseFinanceQb
      .select('COALESCE(SUM(f.montant),0)', 'total')
      .getRawOne();
    const totalEncaisse = parseFloat(totalEncaisseRaw?.total) || 0;

    const totalFacture = await this.sumFactureInRange(filter);

    const totalNonEncaisse = Math.max(0, totalFacture - totalEncaisse);
    const paymentRatePercent = totalFacture > 0 ? (totalEncaisse / totalFacture) * 100 : 0;
    
    const paymentsCount = await baseFinanceQb.clone().getCount();

    return {
      totalEncaisse: Number(totalEncaisse.toFixed(2)),
      totalNonEncaisse: Number(totalNonEncaisse.toFixed(2)),
      paymentRatePercent: Number(paymentRatePercent.toFixed(2)),
      paymentsCount,
    };
  }

   /**
 * Calcule le montant total que l'entreprise DEVRAIT recevoir
 * Basé sur : Somme de (Prix de la session * Nombre d'apprenants)
 */
private async sumFactureInRange(filter: RevenueFilterDto): Promise<number> {
  const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);

  const qb = this.sessionRepository.createQueryBuilder('session')
    .leftJoin('session.formation', 'formation')
    .leftJoin('sessions_apprenants', 'sa', 'sa.sessionId = session.id')
    
    .select([
      // Calcul : SOMME(Prix appliqué à la session * Nombre d'inscrits)
      // COALESCE(session.prix, formation.prix) prend le prix session, sinon le prix formation
      'SUM(COALESCE(session.prix, formation.prix, 0)) as total'
    ])
    .where('CAST(session.date AS DATE) BETWEEN :cs AND :ce', { 
      cs: currentStart, 
      ce: currentEnd 
    });


  if (filter.formationId) {
    qb.andWhere('session.formationId = :fid', { fid: filter.formationId });
  }
  
  if (filter.sessionId) {
    qb.andWhere('session.id = :sid', { sid: filter.sessionId });
  }

  const result = await qb.getRawOne();
  
  // Le résultat de SUM en SQL est souvent une chaîne de caractères
  return parseFloat(result?.total) || 0;
}







  private getBasePaymentQuery(filter: RevenueFilterDto): SelectQueryBuilder<Finance> {
    const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);
    const qb = this.financeRepository
      .createQueryBuilder('f')
      .leftJoin('f.session', 's')
      .leftJoin('s.formation', 'fo')
      // Utilisation de CAST pour la précision Date et suppression de .toISOString() (déjà string)
      .where('CAST(f.date AS DATE) BETWEEN :cs AND :ce', { cs: currentStart, ce: currentEnd })
      .andWhere('f.type = :financeType', { financeType: FinanceType.PAIEMENT });

    if (filter.formationId) {
      qb.andWhere('s.formationId = :fid', { fid: Number(filter.formationId) });
    }
    if (filter.sessionId) {
    qb.andWhere('s.id = :sid', { sid: filter.sessionId });
  }


    return qb;
  }



  //correcte
  async getPaymentManagementPie(filter: RevenueFilterDto): Promise<PaymentManagementPieDto> {
    // 1. Récupération des dates de la période
    const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);
     // 2. Construction de la requête
  const qb = this.sessionRepository.createQueryBuilder('s')
    .innerJoin('s.formation', 'f')
    .select([
      's.id AS "sessionId"',
      'COALESCE(s.prix, f.prix, 0) AS "prixUnitaire"',
    ])
    // Sous-requête pour le nombre d'inscrits
    .addSelect(subQuery => {
      return subQuery
        .select('COUNT(*)', 'count')
        .from('sessions_apprenants', 'sa')
        .where('sa.sessionId = s.id');
    }, 'inscrits')
    // Sous-requête pour le CA encaissé par session
    .addSelect(subQuery => {
      return subQuery
        .select('SUM(fin.montant)', 'sum')
        .from('finances', 'fin')
        .where('fin.sessionId = s.id')
        .andWhere('fin.type = :type', { type: FinanceType.PAIEMENT });
    }, 'caEncaisse')
    .where('CAST(s.date AS DATE) BETWEEN :start AND :end', { 
      start: currentStart, 
      end: currentEnd 
    });

  // Application des filtres
  if (filter.formationId) {
    qb.andWhere('s.formationId = :fid', { fid: filter.formationId });
  }
  if (filter.sessionId) {
    qb.andWhere('s.id = :sid', { sid: filter.sessionId });
  }

  const rawSessions = await qb.getRawMany();

    let paye = 0;
    let avance = 0;
    let impaye = 0;

    // 3. Analyse de chaque session
    for (const s of rawSessions) {
      const prixUnitaire = parseFloat(s.prixUnitaire) || 0;
      const nbInscrits = parseInt(s.inscrits) || 0;
      const expectedTotal = prixUnitaire * nbInscrits;
      const actualEncaisse = parseFloat(s.caEncaisse) || 0;
      
      // On ignore les sessions qui n'ont ni prix ni inscrits (rien à payer)
    if (expectedTotal === 0) continue;

    if (actualEncaisse >= expectedTotal) {
      // Cas : Entièrement payé ou trop-perçu
      paye++;
    } else if (actualEncaisse > 0) {
      // Cas : Paiement partiel
      avance++;
    } else {
      // Cas : Aucun paiement reçu
      impaye++;
    }
  }

    const total = paye + avance + impaye;
    const slices: PaymentStatusSliceDto[] = [
      { status: 'paye', count: paye, percent: total > 0 ? Number(((paye / total) * 100).toFixed(2)) : 0  },
      { status: 'avance', count: avance,  percent: total > 0 ? Number(((avance / total) * 100).toFixed(2)) : 0  },
      { status: 'impaye', count: impaye, percent: total > 0 ? Number(((impaye / total) * 100).toFixed(2)) : 0 },
    ];
    return { slices };
  }


//correcte
  async getPaymentManagementBar(filter: RevenueFilterDto): Promise<PaymentManagementBarDto> {
    const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);
    const months = this.enumerateMonths(currentStart, currentEnd);
    
    // 1. CA ENCAISSÉ (Depuis la table Finances)
    const encRows = this.getBasePaymentQuery(filter);
    const enc = await encRows
      .select(`TO_CHAR(f.date, 'YYYY-MM')`, 'month')
      .addSelect('COALESCE(SUM(f.montant),0)', 'total')
      .groupBy("TO_CHAR(f.date, 'YYYY-MM')")
      .getRawMany();

    // 2. CA FACTURÉ (Prix Session/Formation * Nombre d'apprenants)
    const factRows = this.getBaseSessionQuery(filter);
    const fact = await factRows
      .innerJoin('sessions_apprenants', 'sa', 'sa."sessionId" = s.id')
      .select("TO_CHAR(s.date, 'YYYY-MM')", 'month')
      .addSelect('COALESCE(SUM(COALESCE(s.prix, f.prix)),0)', 'total')
      .groupBy("TO_CHAR(s.date, 'YYYY-MM')")
      .getRawMany();

    // 3. Mapping et fusion des données par mois
  const rows = months.map((m) => {
    const encData = enc.find((e) => e.month === m);
    const factData = fact.find((f) => f.month === m);

    return {
      month: m,
      caEncaisse: parseFloat(encData?.total) || 0,
      caFacture: parseFloat(factData?.total) || 0,
    };
  });

  return { rows };
  }

      /** Génère la liste des mois "YYYY-MM" entre deux dates */
  private enumerateMonths(start: string, end: string): string[] {
  const months: string[] = [];
  const current = new Date(start);
  current.setDate(1); // On force au 1er du mois pour éviter les débordements (ex: 31 Jan -> 3 Mars)

  const last = new Date(end);
  last.setDate(1);

  while (current <= last) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${yyyy}-${mm}`);
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}


private getBaseSessionQuery(filter: RevenueFilterDto): SelectQueryBuilder<Session> {
  // Ajout de 'this.'
  const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);
  
  const qb = this.sessionRepository
    .createQueryBuilder('s')
    .leftJoin('s.formation', 'f');

  // Utiliser CAST pour s'assurer que le dernier jour est inclus en entier
  qb.andWhere('CAST(s.date AS DATE) >= :cs', { cs: currentStart });
  qb.andWhere('CAST(s.date AS DATE) <= :ce', { ce: currentEnd });

  if (filter.formationId) {
    qb.andWhere('s.formationId = :fid_session', { fid_session: filter.formationId });
  }

  if (filter.sessionId) {
    qb.andWhere('s.id = :sid_session', { sid_session: filter.sessionId });
  }

  return qb;
}












  async getPaymentManagementTable(filter: RevenueFilterDto): Promise<PaymentManagementTableResponseDto> {
  const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);

  // ON CHANGE DE POINT DE DÉPART : on part des apprenants et de leurs sessions !
  const qb = this.apprenantRepository
    .createQueryBuilder('app')
    .innerJoin('app.user', 'u')
    .innerJoin('app.sessions', 's') // On récupère les sessions où l'apprenant est inscrit
    .innerJoin('s.formation', 'f');

  // FILTRES
  // On filtre sur les sessions qui ont lieu dans la période
  qb.where('CAST(s.date AS DATE) BETWEEN :start AND :end', { 
    start: currentStart, 
    end: currentEnd 
  });
  
  if (filter.formationId) {
    qb.andWhere('f.id = :fid', { fid: filter.formationId });
  }

  // SÉLECTION ET CALCULS
  qb.select([
    'app.id AS "inscriptionId"', // L'ID de l'apprenant peut servir d'ID d'inscription
    'u.nom AS "nom"',
    'u.prenom AS "prenom"',
    's.title AS "sessionTitle"',
    'f.titre AS "formationTitle"',
    // Montant total dû (prix session ou formation)
    'COALESCE(s.prix, f.prix, 0) AS "total"',
    // Montant déjà payé (on somme les finances liées à CET apprenant pour CETTE session)
    `(SELECT SUM(fin.montant) FROM finances fin WHERE fin."apprenantId" = app.id AND fin."sessionId" = s.id AND fin.type = 'paiement') AS "paid"`
  ]);

  // PAGINATION ET TRI (On ne peut pas paginer directement une requête avec aggrégation, donc on le fait après)
  const allRows = await qb.getRawMany();

  // CALCUL EN MAPPANT LES RÉSULTATS
  let items: PaymentManagementTableRowDto[] = allRows.map(row => {
    const total = parseFloat(row.total) || 0;
    const paid = parseFloat(row.paid) || 0;
    const remaining = Math.max(0, total - paid);

    let status = PaiementStatus.UNPAID;
    if (paid >= total && total > 0) {
      status = PaiementStatus.PAID;
    } else if (paid > 0) {
      status = PaiementStatus.PARTIAL;
    }

    return {
      inscriptionId: Number(row.inscriptionId),
      apprenant: `${row.nom || ''} ${row.prenom || ''}`.trim(),
      session: row.sessionTitle,
      formation: row.formationTitle,
      total: total,
      paid: paid,
      remaining: remaining,
      status: status,
    };
  });

  if (filter.paymentStatus) {
  // On ne garde que les lignes qui correspondent au statut demandé
  items = items.filter(item => item.status === filter.paymentStatus);
}


  // TRI MANUEL (à faire si besoin)
  // ... Logique de tri sur `items`

  // PAGINATION MANUELLE
  const page = filter.page ?? 1;
  const limit = filter.limit ?? 10;
  const total = items.length;
  const paginatedItems = items.slice((page - 1) * limit, page * limit);

  return {
    items: paginatedItems,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}





  async addPayment(dto: AddPaymentDto): Promise<{ finance: Finance }> {
    // 1. On cherche l'APPRENANT lié au userId (car c'est l'ID apprenant qu'on veut stocker)
    const apprenant = await this.apprenantRepository.findOne({ 
      where: { id: dto.apprenantId }, relations: ['user'],});

    if (!apprenant) {
      throw new NotFoundException(`Aucun profil apprenant trouvé pour l'utilisateur ID ${dto.apprenantId}`);
    }

    // 2. Vérification de la session (Attention : ton entité Session utilise des UUID 'string')
    if (dto.sessionId) {
      const session = await this.sessionRepository.findOne({ 
        where: { id: dto.sessionId } 
      });
      if (!session) {
        throw new NotFoundException('Session introuvable.');
      }
    }

    // 3. Création de la ligne de finance avec le LIEN apprenant
    const finance = this.financeRepository.create({
      apprenant,
      montant: Number(dto.montant),
      
      type: FinanceType.PAIEMENT,
      date: new Date(dto.paymentDate),
      
      // ✅ TRÈS IMPORTANT : On lie l'apprenant pour le tableau BI
      apprenantId: apprenant.id, 
      
      // ✅ Lien session
      sessionId: dto.sessionId ? dto.sessionId.toString() : null,
      
      // ✅ Description propre pour le mapping fallback
      description: `${apprenant.user.nom} ${apprenant.user.prenom} - Paiement ${dto.paymentDate}`
    });

    const saved = await this.financeRepository.save(finance);
    
     // On recharge avec les relations
    const result = await this.financeRepository.findOne({ 
      where: { id: saved.id }, 
      relations: ['apprenant', 'apprenant.user', 'session'] 
    });

    // ✅ On ajoute cette vérification pour TypeScript
    if (!result) {
      throw new InternalServerErrorException("Le paiement a été enregistré mais n'a pas pu être rechargé.");
    }

    return { finance: result };
}

 async updatePayment(id: number, dto: AddPaymentDto): Promise<{ finance: Finance }> {
    const existing = await this.financeRepository.findOne({
      where: { id },
      relations: ['apprenant', 'apprenant.user', 'session', 'session.formation'],
    });

    if (!existing) {
      throw new NotFoundException(`Paiement #${id} introuvable`);
    }

    // Vérifier le nouvel apprenant (si changé)
    if (dto.apprenantId && dto.apprenantId !== existing.apprenantId) {
      const apprenant = await this.apprenantRepository.findOne({
        where: { id: dto.apprenantId },
        relations: ['user'],
      });
      if (!apprenant) {
        throw new NotFoundException(`Apprenant #${dto.apprenantId} introuvable`);
      }
      existing.apprenant = apprenant;
      existing.apprenantId = apprenant.id;
    }

    // Vérifier la nouvelle session (si changée) → récupère aussi la formation
    if (dto.sessionId) {
      const session = await this.sessionRepository.findOne({
        where: { id: dto.sessionId },
        relations: ['formation'],
      });
      if (!session) {
        throw new NotFoundException(`Session #${dto.sessionId} introuvable`);
      }
      existing.sessionId = String(session.id);
      existing.session = session; // met à jour la relation
    }

    // Mettre à jour le montant et la date
    existing.montant = Number(dto.montant ?? existing.montant);
    existing.date = dto.paymentDate ? new Date(dto.paymentDate) : existing.date;
    
    // Recalculer la description
    const app = existing.apprenant;
    if (app?.user) {
      existing.description = `${app.user.nom || ''} ${app.user.prenom || ''} - Paiement ${existing.date.toISOString().split('T')[0]}`.trim();
    }

    const saved = await this.financeRepository.save(existing);

    // Recharger avec relations
    const result = await this.financeRepository.findOne({
      where: { id: saved.id },
      relations: ['apprenant', 'apprenant.user', 'session', 'session.formation'],
    });

    if (!result) {
      throw new NotFoundException('Paiement mis à jour mais non retrouvé');
    }

    return { finance: result };
  }

  // ── DELETE PAYMENT ──
  async deletePayment(id: number): Promise<{ message: string; deletedId: number }> {
    const existing = await this.financeRepository.findOne({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Paiement #${id} introuvable. Impossible de supprimer.`);
    }

    await this.financeRepository.remove(existing);

    return {
      message: 'Paiement supprimé avec succès',
      deletedId: id,
    };
  }

async getSessionsByApprenant(apprenantId: number) {
    const apprenant = await this.apprenantRepository.findOne({
      where: { id: apprenantId },
      relations: ['sessions'], // Charge la relation Many-to-Many
    });

    if (!apprenant) {
      return []; // ou throw new NotFoundException('Apprenant introuvable');
    }

    // Retourne exactement ce que le front attend
    return apprenant.sessions.map((session) => ({
      id: session.id,              // UUID (string)
      title: session.title || 'Session sans nom',
      formationId: session.formationId, // number
    }));
  }


  async getFormationsForPayments(filter: RevenueFilterDto): Promise<{ id: number; title: string }[]> {
  const { currentStart, currentEnd } = this.resolveDashboardPeriod(filter);

  const qb = this.sessionRepository.createQueryBuilder('session')
    .innerJoin('session.formation', 'formation')
    .leftJoin('finances', 'finance', 'finance.sessionId = session.id AND finance.type = :type', {
      type: FinanceType.PAIEMENT,
    })
    .select('DISTINCT formation.id', 'id')
    .addSelect('formation.titre', 'title')
    .where('CAST(session.date AS DATE) BETWEEN :start AND :end', {
      start: currentStart,
      end: currentEnd,
    })
    // Ne garder que les formations qui ont au moins une session avec des apprenants inscrits
    .andWhere(qb => {
      const sub = qb.subQuery()
        .select('1')
        .from('sessions_apprenants', 'sa')
        .where('sa.sessionId = session.id')
        .getQuery();
      return `EXISTS ${sub}`;
    });

  const rows = await qb.getRawMany();

  return rows.map(r => ({
    id: Number(r.id),
    title: r.title,
  }));
}






}
  




 

 

  

  
  


  

  



