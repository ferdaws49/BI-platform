// ============================================================================
// directeur-dashboard.service.ts
//
// Service du tableau de bord du Directeur.
// Il agrège les données de plusieurs entités pour donner une vue globale:
//   - Apprenants, Formations, Formateurs → chiffres clés
//   - Finances → revenus, coûts, profit
//   - Performance + Satisfaction → taux de réussite, qualité pédagogique
//   - Alertes → problèmes détectés automatiquement
// ============================================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { Apprenant } from '../../apprenants/entities/apprenant.entity';
import { Formation } from '../../formations/entities/formation.entity';
import { Formateur } from '../../formateurs/entities/formateur.entity';
import { Finance } from '../../finances/entities/finance.entity';
import { Performance } from '../../performances/entities/performance.entity';
import { Satisfaction } from '../../satisfaction/entities/satisfaction.entity'; // ← NOUVELLE table
import { PaginationFilterDto } from '../dto/dashboard-filter.dto';

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

    // ← NOUVEAU: repo pour les avis de satisfaction (note /5 donnée par l'apprenant à la fin de la formation)
    @InjectRepository(Satisfaction)
    private satisfactionRepo: Repository<Satisfaction>,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — OVERVIEW & KPIs GLOBAUX
  // Vue synthétique: totaux + évolution mensuelle
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Retourne les 4 grands totaux affichés en haut du dashboard:
   *   - Nombre total d'apprenants
   *   - Nombre total de formations
   *   - Nombre total de formateurs
   *   - Revenu total cumulé (toutes les transactions de type 'paiement')
   */
  async getOverview() {
    const [totalApprenants, totalFormations, totalFormateurs, revenusResult] =
      await Promise.all([
        this.apprenantRepo.count(),
        this.formationRepo.count(),
        this.formateurRepo.count(),

        // SUM de tous les paiements (type='paiement') sans filtre de date
        this.financeRepo
          .createQueryBuilder('finance')
          .select('SUM(finance.montant)', 'total')
          .where("finance.type = 'paiement'")
          .getRawOne(),
      ]);

    return {
      totalApprenants,
      totalFormations,
      totalFormateurs,
      revenuTotal: parseFloat(revenusResult?.total ?? '0'),
    };
  }

  /**
   * Retourne les KPIs avec comparaison mois courant vs mois précédent:
   *   - Taux de croissance des apprenants (%)
   *   - Nombre de formations actives
   *   - Taux de réussite global (basé sur la table performance)
   *   - Satisfaction moyenne (basée sur la table satisfaction) ← NOUVEAU
   *   - Revenu mensuel
   */
  async getKpis() {
    const now = new Date();

    // Dates pour le mois courant (du 1er à aujourd'hui)
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Dates pour le mois précédent (du 1er au dernier jour)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0); // jour 0 = dernier du mois précédent

    const [
      apprenantsCeMois, // nouveaux apprenants ce mois
      apprenantsMoisDernier, // nouveaux apprenants le mois dernier (pour calculer la croissance)
      formationsActives, // formations en cours (statut='active')
      totalPerformances, // total des évaluations enregistrées
      performancesReussies, // combien ont estReussi=true
      revenuMensuelResult, // SUM des paiements ce mois
      satisfactionMoyenneResult, // ← NOUVEAU: moyenne des notes de satisfaction /5
    ] = await Promise.all([
      this.apprenantRepo.count({
        where: { dateAccepted: Between(startOfThisMonth, now) },
      }),

      this.apprenantRepo.count({
        where: { dateAccepted: Between(startOfLastMonth, endOfLastMonth) },
      }),

      this.formationRepo.count({ where: { statut: 'active' } }),

      // Nombre total de performances enregistrées (= nombre d'évaluations)
      this.performanceRepo.count(),

      // Parmi ces évaluations, combien sont réussies
      this.performanceRepo.count({ where: { estReussi: true } }),

      // Revenu du mois courant uniquement
      this.financeRepo
        .createQueryBuilder('finance')
        .select('SUM(finance.montant)', 'total')
        .where('finance.date BETWEEN :start AND :end', {
          start: startOfThisMonth,
          end: now,
        })
        .andWhere("finance.type = 'paiement'")
        .getRawOne(),

      // ← NOUVEAU: moyenne des notes de satisfaction (sur 5) toutes formations confondues
      // La table satisfaction contient une ligne par apprenant par formation
      this.satisfactionRepo
        .createQueryBuilder('s')
        .select('AVG(s.note)', 'avg')
        .getRawOne(),
    ]);

    // ── Calcul taux de croissance des apprenants ──────────────────────────
    // Si aucun apprenant le mois dernier → croissance = 100% (on évite division par 0)
    const tauxCroissance =
      apprenantsMoisDernier === 0
        ? 100
        : parseFloat(
            (
              ((apprenantsCeMois - apprenantsMoisDernier) /
                apprenantsMoisDernier) *
              100
            ).toFixed(2),
          );

    // ── Calcul taux de réussite global ───────────────────────────────────
    const tauxReussite =
      totalPerformances === 0
        ? 0
        : parseFloat(
            ((performancesReussies / totalPerformances) * 100).toFixed(2),
          );

    // ── Satisfaction moyenne (arrondie à 1 décimale) ─────────────────────
    const satisfactionMoyenne = parseFloat(
      parseFloat(satisfactionMoyenneResult?.avg ?? '0').toFixed(1),
    );

    return {
      tauxCroissanceApprenants: tauxCroissance,
      formationsActives,
      tauxReussite,
      satisfactionMoyenne, // ← NOUVEAU (ex: 4.2 / 5)
      revenuMensuel: parseFloat(revenuMensuelResult?.total ?? '0'),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — GRAPHIQUES
  // Données formatées pour Chart.js (labels + datasets)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Graphique: nombre d'inscriptions par mois (6 derniers mois)
   * Utilisé pour voir l'évolution des inscriptions dans le temps
   */
  async getEnrollmentsChart() {
    const result = await this.apprenantRepo
      .createQueryBuilder('apprenant')
      .select("TO_CHAR(apprenant.dateAccepted, 'Mon')", 'month')
      .addSelect('EXTRACT(MONTH FROM apprenant.dateAccepted)', 'monthNum')
      .addSelect('COUNT(*)', 'total')
      .where("apprenant.dateAccepted >= NOW() - INTERVAL '6 months'")
      .groupBy("TO_CHAR(apprenant.dateAccepted, 'Mon')")
      .addGroupBy('EXTRACT(MONTH FROM apprenant.dateAccepted)')
      .orderBy('EXTRACT(MONTH FROM apprenant.dateAccepted)', 'ASC')
      .getRawMany();

    // Format Chart.js: { labels: [...], datasets: [{ data: [...] }] }
    return {
      labels: result.map((r) => r.month),
      datasets: [
        {
          label: 'Inscriptions',
          data: result.map((r) => parseInt(r.total)),
          backgroundColor: '#4ade80',
        },
      ],
    };
  }

  /**
   * Graphique: revenus mensuels (6 derniers mois)
   * Uniquement les transactions de type 'paiement'
   */
  async getRevenueChart() {
    const result = await this.financeRepo
      .createQueryBuilder('finance')
      .select("TO_CHAR(finance.date, 'Mon')", 'month')
      .addSelect('EXTRACT(MONTH FROM finance.date)', 'monthNum')
      .addSelect('SUM(finance.montant)', 'total')
      .where("finance.date >= NOW() - INTERVAL '6 months'")
      .andWhere("finance.type = 'paiement'")
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
   * Graphique: top 5 formations par prix
   * Donne une idée de la répartition des formations selon leur valeur
   */
  async getCoursesChart() {
    const result = await this.formationRepo
      .createQueryBuilder('formation')
      .select('formation.titre', 'titre')
      .addSelect('formation.prix', 'prix')
      .orderBy('formation.prix', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      labels: result.map((r) => r.titre),
      datasets: [
        {
          label: 'Prix formations',
          data: result.map((r) => parseFloat(r.prix)),
          backgroundColor: [
            '#a7f3d0',
            '#86efac',
            '#22c55e',
            '#15803d',
            '#166534',
          ],
        },
      ],
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — TABLEAUX PAGINÉS
  // Données avec filtres, tri et pagination pour les tables du dashboard
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Liste des formations avec pagination et tri
   * Utilisé pour le tableau "Top Formations" du dashboard
   */
  async getTopCourses(filters: PaginationFilterDto) {
    const {
      page = 1,
      limit = 5,
      sortBy = 'prix',
      sortDir = 'DESC',
      statut,
    } = filters;

    const qb = this.formationRepo
      .createQueryBuilder('formation')
      .orderBy(`formation.${sortBy}`, sortDir)
      .skip((page - 1) * limit) // offset SQL: sauter les pages précédentes
      .take(limit); // LIMIT SQL: prendre seulement N résultats

    // Filtre optionnel par statut (ex: 'active', 'completed')
    if (statut) qb.where('formation.statut = :statut', { statut });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Liste des apprenants avec pagination et tri
   * Utilisé pour le tableau "Top Apprenants" du dashboard
   */
  async getTopStudents(filters: PaginationFilterDto) {
    const {
      page = 1,
      limit = 5,
      sortBy = 'dateAccepted',
      sortDir = 'DESC',
      statut,
    } = filters;

    const qb = this.apprenantRepo
      .createQueryBuilder('apprenant')
      .leftJoinAndSelect('apprenant.user', 'user') // pour avoir nom/prénom depuis la table users
      .orderBy(`apprenant.${sortBy}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    if (statut) qb.where('apprenant.statut = :statut', { statut });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Liste des inscriptions récentes filtrées par période
   * Utilisé pour le tableau "Inscriptions Récentes"
   * Périodes possibles: 'week' | 'month' | 'quarter' | 'year'
   */
  async getRecentEnrollments(filters: PaginationFilterDto) {
    const { page = 1, limit = 5, periode, statut } = filters;

    const now = new Date();
    let startDate: Date;

    // Calculer la date de début selon la période choisie
    switch (periode) {
      case 'week':
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7,
        );
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

    // IMPORTANT: utiliser andWhere pour ne pas écraser le filtre date
    if (statut) qb.andWhere('apprenant.statut = :statut', { statut });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — FINANCES
  // KPIs financiers + détails par formation
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * KPIs financiers globaux:
   *   - Revenu total (toutes les entrées d'argent)
   *   - Coût total (remboursements = sorties d'argent)
   *   - Profit = Revenu - Coût
   *   - Marge globale en %
   *   - Évolution revenu vs mois précédent
   *   - Formation la plus rentable
   */
  async getFinanceKpis() {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      revenuTotalResult,
      coutTotalResult,
      revenuCeMoisResult,
      revenuMoisDernierResult,
      formationPlusRentable,
    ] = await Promise.all([
      // ── Total revenus: SUM de toutes les lignes de type 'paiement' ──────
      this.financeRepo
        .createQueryBuilder('finance')
        .select('SUM(finance.montant)', 'total')
        .where("finance.type = 'paiement'")
        .getRawOne(),

      // ── Total coûts: SUM des remboursements (sorties d'argent) ──────────
      this.financeRepo
        .createQueryBuilder('finance')
        .select('SUM(finance.montant)', 'total')
        .where("finance.type = 'remboursement'")
        .getRawOne(),

      // ── Revenu ce mois uniquement ────────────────────────────────────────
      this.financeRepo
        .createQueryBuilder('finance')
        .select('SUM(finance.montant)', 'total')
        .where("finance.type = 'paiement'")
        .andWhere('finance.date BETWEEN :start AND :end', {
          start: startOfThisMonth,
          end: now,
        })
        .getRawOne(),

      // ── Revenu mois dernier (pour calculer l'évolution) ─────────────────
      this.financeRepo
        .createQueryBuilder('finance')
        .select('SUM(finance.montant)', 'total')
        .where("finance.type = 'paiement'")
        .andWhere('finance.date BETWEEN :start AND :end', {
          start: startOfLastMonth,
          end: endOfLastMonth,
        })
        .getRawOne(),

      // ── Formation qui a généré le plus de revenus ────────────────────────
      // On joint Finance → Session → Formation pour remonter à la formation
      // Note: une session appartient à une formation via session.formationId
      this.financeRepo
        .createQueryBuilder('finance')
        .select('formation.titre', 'titre')
        .addSelect('SUM(finance.montant)', 'total')
        .innerJoin('finance.session', 'session') // Finance → Session
        .innerJoin('session.formation', 'formation') // Session → Formation
        .where("finance.type = 'paiement'")
        .groupBy('formation.titre')
        .orderBy('SUM(finance.montant)', 'DESC')
        .limit(1)
        .getRawOne(),
    ]);

    const revenuTotal = parseFloat(revenuTotalResult?.total ?? '0');
    const coutTotal = parseFloat(coutTotalResult?.total ?? '0');
    const profitTotal = revenuTotal - coutTotal;
    const revenuCeMois = parseFloat(revenuCeMoisResult?.total ?? '0');
    const revenuMoisDernier = parseFloat(revenuMoisDernierResult?.total ?? '0');

    // Évolution % du revenu vs mois dernier
    const evolutionRevenu =
      revenuMoisDernier === 0
        ? 100
        : parseFloat(
            (
              ((revenuCeMois - revenuMoisDernier) / revenuMoisDernier) *
              100
            ).toFixed(2),
          );

    return {
      revenuTotal,
      coutTotal,
      profitTotal,
      // Marge = (profit / revenu) * 100 → ex: 65.3%
      margeGlobale:
        revenuTotal === 0
          ? 0
          : parseFloat(((profitTotal / revenuTotal) * 100).toFixed(2)),
      evolutionRevenu,
      revenuCeMois,
      formationPlusRentable: formationPlusRentable?.titre ?? '—',
      profitFormationPlusRentable: parseFloat(
        formationPlusRentable?.total ?? '0',
      ),
    };
  }

  /**
   * Détails financiers par formation (tableau paginé)
   * Pour chaque formation: revenus, coûts, profit, marge
   * Jointure Finance → Session → Formation pour regrouper correctement
   */
  async getFinanceDetails(filters: PaginationFilterDto) {
    const {
      page = 1,
      limit = 5,
      sortBy = 'revenus',
      sortDir = 'DESC',
    } = filters;

    // On agrège les finances par formation via le chemin: Finance → Session → Formation
    const result = await this.financeRepo
      .createQueryBuilder('finance')
      .select('formation.titre', 'formation')
      .addSelect(
        // Revenus = SUM des paiements pour cette formation
        "SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END)",
        'revenus',
      )
      .addSelect(
        // Coûts = SUM des remboursements
        "SUM(CASE WHEN finance.type = 'remboursement' THEN finance.montant ELSE 0 END)",
        'couts',
      )
      .addSelect(
        // Profit = revenus - coûts (calculé directement en SQL)
        "SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END) - " +
          "SUM(CASE WHEN finance.type = 'remboursement' THEN finance.montant ELSE 0 END)",
        'profit',
      )
      .addSelect('formation.statut', 'statut')
      .innerJoin('finance.session', 'session') // Finance → Session
      .innerJoin('session.formation', 'formation') // Session → Formation
      .groupBy('formation.titre')
      .addGroupBy('formation.statut')
      .orderBy(
        // Tri dynamique selon le champ choisi
        sortBy === 'profit'
          ? "SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END) - SUM(CASE WHEN finance.type = 'remboursement' THEN finance.montant ELSE 0 END)"
          : sortBy === 'revenus'
            ? "SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END)"
            : 'formation.titre',
        sortDir,
      )
      .getRawMany();

    // ── Filtres supplémentaires appliqués côté JS ─────────────────────────
    // (plus simple à maintenir que d'imbriquer dans le QueryBuilder)
    let filtered = result;
    if (filters.statut && filters.statut !== 'Tous') {
      filtered = filtered.filter(
        (r) => r.statut?.toLowerCase() === filters.statut?.toLowerCase(),
      );
    }
    if (filters.formation && filters.formation !== 'Tous') {
      filtered = filtered.filter((r) => r.formation === filters.formation);
    }

    // ── Enrichissement: calcul de la marge en % ───────────────────────────
    const withMarge = filtered.map((r) => {
      const revenus = parseFloat(r.revenus ?? '0');
      const couts = parseFloat(r.couts ?? '0');
      const profit = parseFloat(r.profit ?? '0');
      return {
        formation: r.formation,
        revenus,
        couts,
        profit,
        marge:
          revenus === 0 ? 0 : parseFloat(((profit / revenus) * 100).toFixed(2)),
        statut: r.statut,
      };
    });

    // ── Pagination manuelle (après filtrage JS) ───────────────────────────
    const total = withMarge.length;
    const paginated = withMarge.slice((page - 1) * limit, page * limit);

    return {
      data: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — ALERTES AUTOMATIQUES
  // Détectées depuis les données réelles, sans configuration manuelle
  // Types: 'Critique' | 'Avertissement' | 'Information'
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Génère une liste d'alertes dynamiques basées sur:
   *   1. Formations avec taux de réussite < 70%
   *   2. Apprenants avec note < 10 (en difficulté)
   *   3. Satisfaction faible (< 3/5) ← NOUVEAU
   *   4. Revenus en baisse > 20% vs mois dernier
   *   5. Aucune inscription ce mois
   *
   * Les alertes sont triées par priorité décroissante (les plus critiques en premier)
   */
  async getAlerts() {
    const alerts: any[] = [];
    let idCounter = 1;

    // ── ALERTE 1: Formations avec taux réussite < 70% ────────────────────
    // On groupe les performances par formation et on filtre celles sous le seuil
    const formationsReussite = await this.performanceRepo
      .createQueryBuilder('perf')
      .select('formation.titre', 'titre')
      .addSelect(
        // Taux de réussite = (nombre de estReussi=true / total) * 100
        'COUNT(CASE WHEN perf.estReussi = true THEN 1 END) * 100.0 / COUNT(*)',
        'tauxReussite',
      )
      .innerJoin('perf.formation', 'formation')
      .groupBy('formation.titre')
      // HAVING = filtre sur les agrégats (ne peut pas utiliser WHERE ici)
      .having(
        'COUNT(CASE WHEN perf.estReussi = true THEN 1 END) * 100.0 / COUNT(*) < 70',
      )
      .getRawMany();

    for (const f of formationsReussite) {
      const taux = parseFloat(parseFloat(f.tauxReussite).toFixed(1));
      alerts.push({
        id: String(idCounter++),
        type: taux < 50 ? 'Critique' : 'Avertissement', // < 50% = critique, 50-70% = avertissement
        titre: 'Taux de réussite faible',
        description: `La formation "${f.titre}" a un taux de réussite de ${taux}%`,
        formation: f.titre,
        date: new Date().toISOString().split('T')[0],
        priorite: taux < 50 ? 9 : 6,
        statut: 'Non traité',
        details: `Taux: ${taux}%. Seuil: 70%. Recommandation: revoir le contenu pédagogique.`,
      });
    }

    // ── ALERTE 2: Apprenants avec note < 10 ──────────────────────────────
    const apprenantsFaibles = await this.performanceRepo
      .createQueryBuilder('perf')
      .select('COUNT(*)', 'total')
      .where('perf.note < 10')
      .getRawOne();

    const nbFaibles = parseInt(apprenantsFaibles?.total ?? '0');
    if (nbFaibles > 0) {
      alerts.push({
        id: String(idCounter++),
        type: 'Avertissement',
        titre: 'Apprenants en difficulté',
        description: `${nbFaibles} apprenant(s) ont une note inférieure à 10`,
        formation: 'Toutes',
        date: new Date().toISOString().split('T')[0],
        priorite: 7,
        statut: 'Non traité',
        details: `${nbFaibles} apprenants ont échoué. Recommandation: tutorat ou révision.`,
      });
    }

    // ── ALERTE 3: Satisfaction faible (< 3/5) ← NOUVEAU ─────────────────
    // Détecte les formations dont les apprenants sont globalement insatisfaits
    const formationsSatisfactionFaible = await this.satisfactionRepo
      .createQueryBuilder('s')
      .select('formation.titre', 'titre')
      .addSelect('AVG(s.note)', 'moyenneSatisfaction')
      .innerJoin('s.formation', 'formation')
      .groupBy('formation.titre')
      // Seuil: satisfaction moyenne < 3 sur 5
      .having('AVG(s.note) < 3')
      .getRawMany();

    for (const f of formationsSatisfactionFaible) {
      const moy = parseFloat(parseFloat(f.moyenneSatisfaction).toFixed(1));
      alerts.push({
        id: String(idCounter++),
        type: 'Avertissement',
        titre: 'Satisfaction faible',
        description: `La formation "${f.titre}" a une satisfaction moyenne de ${moy}/5`,
        formation: f.titre,
        date: new Date().toISOString().split('T')[0],
        priorite: 6,
        statut: 'Non traité',
        details: `Satisfaction: ${moy}/5. Seuil: 3/5. Envisager une révision du programme.`,
      });
    }

    // ── ALERTE 4: Revenus en baisse > 20% vs mois dernier ────────────────
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [revenuCeMois, revenuMoisDernier] = await Promise.all([
      this.financeRepo
        .createQueryBuilder('finance')
        .select('SUM(finance.montant)', 'total')
        .where("finance.type = 'paiement'")
        .andWhere('finance.date BETWEEN :start AND :end', {
          start: startOfThisMonth,
          end: now,
        })
        .getRawOne(),

      this.financeRepo
        .createQueryBuilder('finance')
        .select('SUM(finance.montant)', 'total')
        .where("finance.type = 'paiement'")
        .andWhere('finance.date BETWEEN :start AND :end', {
          start: startOfLastMonth,
          end: endOfLastMonth,
        })
        .getRawOne(),
    ]);

    const rCeMois = parseFloat(revenuCeMois?.total ?? '0');
    const rMoisDernier = parseFloat(revenuMoisDernier?.total ?? '0');

    // Seuil: baisse de plus de 20% (rCeMois < 80% de rMoisDernier)
    if (rMoisDernier > 0 && rCeMois < rMoisDernier * 0.8) {
      const baisse = (((rMoisDernier - rCeMois) / rMoisDernier) * 100).toFixed(
        1,
      );
      alerts.push({
        id: String(idCounter++),
        type: 'Critique',
        titre: 'Revenus en baisse',
        description: `Les revenus ont chuté de ${baisse}% par rapport au mois dernier`,
        formation: 'Toutes',
        date: new Date().toISOString().split('T')[0],
        priorite: 9,
        statut: 'Non traité',
        details: `Ce mois: ${rCeMois.toLocaleString()} DT. Mois dernier: ${rMoisDernier.toLocaleString()} DT.`,
      });
    }

    // ── ALERTE 5: Aucune inscription ce mois ─────────────────────────────
    const inscriptionsCeMois = await this.apprenantRepo.count({
      where: { dateAccepted: Between(startOfThisMonth, now) },
    });

    if (inscriptionsCeMois === 0) {
      alerts.push({
        id: String(idCounter++),
        type: 'Information',
        titre: 'Aucune inscription ce mois',
        description: 'Aucun nouvel apprenant inscrit ce mois',
        formation: 'Toutes',
        date: new Date().toISOString().split('T')[0],
        priorite: 4,
        statut: 'Non traité',
        details: 'Pensez à relancer une campagne de communication.',
      });
    }

    // ── Tri final par priorité décroissante ───────────────────────────────
    alerts.sort((a, b) => b.priorite - a.priorite);

    // ── Compteurs résumés pour les cards du dashboard ─────────────────────
    const counts = {
      critique: alerts.filter((a) => a.type === 'Critique').length,
      avertissement: alerts.filter((a) => a.type === 'Avertissement').length,
      information: alerts.filter((a) => a.type === 'Information').length,
      nonTraite: alerts.filter((a) => a.statut === 'Non traité').length,
    };

    return { alerts, counts };
  }
}
