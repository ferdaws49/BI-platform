import { Injectable } from '@nestjs/common';
import {
  AlertType,
  AlertPriority,
  AlertItem,
  AlertResponseDto,
} from '../dtos/finance-alert.dto';
import { CostKpiDto, SessionCostTableResponseDto } from 'src/finances/dto/cost-response.dto';;
import {
  KpiCardsDto,
  PaymentManagementKpisDto,
  PaymentManagementPieDto,
} from 'src/finances/dto/revenue-response.dto';

export interface AlertInputData {
  revenueKpis?: KpiCardsDto;
  paymentKpis?: PaymentManagementKpisDto;
  paymentPie?: PaymentManagementPieDto;
  costKpis?: CostKpiDto;
  sessionCosts?: SessionCostTableResponseDto;
}

@Injectable()
export class FinanceAlertService {
  private readonly MAX_ALERTS = 15;

  generateAlerts(data: AlertInputData): AlertResponseDto {
    const alerts: AlertItem[] = [];
    const createdAt = new Date().toISOString();

    if (data.paymentKpis) {
      alerts.push(...this.buildPaymentAlerts(data.paymentKpis, data.paymentPie, createdAt));
    }

    if (data.revenueKpis) {
      alerts.push(...this.buildFinanceAlerts(data.revenueKpis, createdAt));
    }

    if (data.costKpis) {
      alerts.push(...this.buildSessionAlerts(data.costKpis, data.sessionCosts, createdAt));
    }

    const weight = {
      [AlertPriority.CRITICAL]: 0,
      [AlertPriority.WARNING]: 1,
      [AlertPriority.INFO]: 2,
    };
    alerts.sort((a, b) => weight[a.priority] - weight[b.priority]);

    let finalAlerts = alerts;
    if (finalAlerts.length > this.MAX_ALERTS) {
      finalAlerts = finalAlerts.filter((a) => a.priority !== AlertPriority.INFO);
    }
    if (finalAlerts.length > this.MAX_ALERTS) {
      finalAlerts = finalAlerts.slice(0, this.MAX_ALERTS);
    }

    return {
      total: finalAlerts.length,
      critique: finalAlerts.filter((a) => a.priority === AlertPriority.CRITICAL).length,
      warning: finalAlerts.filter((a) => a.priority === AlertPriority.WARNING).length,
      info: finalAlerts.filter((a) => a.priority === AlertPriority.INFO).length,
      alerts: finalAlerts,
    };
  }

  // ============================================================
  // ACTIONS DYNAMIQUES - Helpers
  // ============================================================

  private actionRecouvrement(rate: number): string {
    if (rate < 30) return `Taux critique (${rate}%). Bloquer les nouvelles inscriptions, contacter chaque client impayé personnellement, proposer des remises de 10-20% pour paiement immédiat.`;
    if (rate < 50) return `Relancer tous les impayés par téléphone dans les 48h. Proposer des échéanciers en 3 fois sans frais.`;
    if (rate < 75) return `Envoyer des rappels automatisés. Offrir un délai de 15 jours supplémentaires avec acompte de 30%.`;
    return `Maintenir la pression commerciale. Relance douce par email.`;
  }

  private actionChuteCA(percent: number): string {
    if (percent < -40) return `Chute sévère (${percent}%). Réunion d'urgence ce jour. Analyser les concurrents, baisser les prix de 15% temporairement, contacter tous les anciens clients.`;
    if (percent < -20) return `Lancer une campagne promotionnelle -20% sur les formations les plus demandées. Contacter les prospects en sommeil.`;
    if (percent < -10) return `Proposer des packs combinés (2 formations = -15%). Relancer les devis en cours.`;
    return `Surveiller la tendance. Renforcer le marketing digital.`;
  }

  private actionBreakEven(ratio: number, needed: number, actual: number): string {
    if (ratio < 0.5) return `Seuil très loin (${actual}/${needed}). Réduire les coûts de 30% (négocier formateurs, réduire logistique) ou augmenter les prix de 25%. Envisager l'annulation.`;
    if (ratio < 0.8) return `Optimiser les coûts logistiques. Augmenter le prix de 10-15%. Lancer une campagne de recrutement urgente.`;
    if (ratio < 1.0) return `Campagne de recrutement ciblée. Offrir des parrainages (-10% pour filleul).`;
    return `Maintenir la stratégie actuelle. Prévoir des sessions supplémentaires.`;
  }

  private actionTauxRemplissage(percent: number): string {
    if (percent < 30) return `Taux critique. Fusionner avec une autre session ou reporter. Contacter la liste d'attente.`;
    if (percent < 50) return `Lancer une campagne urgente sur les réseaux sociaux. Offrir une place gratuite pour chaque 3 inscrits.`;
    if (percent < 70) return `Relancer les prospects intéressés. Proposer un tarif groupe (-15% pour 3+ inscrits).`;
    return `Taux satisfaisant. Maintenir les actions marketing actuelles.`;
  }

  // ============================================================
  // ALERTES PAIEMENTS
  // ============================================================

  private buildPaymentAlerts(
    kpis: PaymentManagementKpisDto,
    pie?: PaymentManagementPieDto,
    createdAt?: string,
  ): AlertItem[] {
    const alerts: AlertItem[] = [];
    const ts = createdAt || new Date().toISOString();

    if (kpis.paymentRatePercent < 50) {
      alerts.push({
        type: AlertType.PAYMENT,
        priority: AlertPriority.CRITICAL,
        title: 'Taux de recouvrement critique',
        message: `Le taux de recouvrement est de ${kpis.paymentRatePercent}%. La trésorerie est en danger.`,
        action: this.actionRecouvrement(kpis.paymentRatePercent),
        value: kpis.paymentRatePercent,
        createdAt: ts,
      });
    } else if (kpis.paymentRatePercent < 75) {
      alerts.push({
        type: AlertType.PAYMENT,
        priority: AlertPriority.WARNING,
        title: 'Taux de recouvrement faible',
        message: `Le taux de recouvrement est de ${kpis.paymentRatePercent}%, sous l'objectif de 75%.`,
        action: this.actionRecouvrement(kpis.paymentRatePercent),
        value: kpis.paymentRatePercent,
        createdAt: ts,
      });
    }

    if (kpis.totalNonEncaisse > kpis.totalEncaisse && kpis.totalEncaisse > 0) {
      const ratio = Math.round((kpis.totalNonEncaisse / kpis.totalEncaisse) * 100);
      alerts.push({
        type: AlertType.PAYMENT,
        priority: AlertPriority.CRITICAL,
        title: 'Impayés supérieurs aux encaissements',
        message: `Les impayés (${kpis.totalNonEncaisse.toFixed(2)} TND) dépassent les encaissements (${kpis.totalEncaisse.toFixed(2)} TND) de ${ratio}%.`,
        action: ratio > 150 
          ? `Situation extrême (${ratio}%). Bloquer toutes les nouvelles inscriptions, mandater un recouvrement judiciaire pour les +3 mois, proposer des remises de 25% pour règlement immédiat.`
          : `Renforcer les relances téléphoniques. Proposer des échéanciers courts (2 fois). Exiger un acompte de 50% pour les nouvelles inscriptions.`,
        value: kpis.totalNonEncaisse,
        createdAt: ts,
      });
    }

    if (pie?.slices) {
      const impaye = pie.slices.find((s) => s.status === 'impaye');
      if (impaye && impaye.percent > 30) {
        alerts.push({
          type: AlertType.PAYMENT,
          priority: AlertPriority.WARNING,
          title: 'Taux de sessions impayées élevé',
          message: `${impaye.percent}% des sessions sont totalement impayées.`,
          action: impaye.percent > 50
            ? `${impaye.percent}% des sessions sans aucun paiement ! Instaurer un acompte obligatoire de 100% à l'inscription immédiatement.`
            : `Mettre en place un acompte obligatoire de 50% à l'inscription. Relancer les ${impaye.count} sessions concernées.`,
          value: impaye.percent,
          createdAt: ts,
        });
      }

      const avance = pie.slices.find((s) => s.status === 'avance');
      if (avance && avance.percent > 40) {
        alerts.push({
          type: AlertType.PAYMENT,
          priority: AlertPriority.WARNING,
          title: 'Trop de paiements partiels',
          message: `${avance.percent}% des sessions sont en paiement partiel uniquement.`,
          action: avance.percent > 60
            ? `Majorité en avance (${avance.percent}%). Standardiser les échéances strictes : 50% à l'inscription, 50% à J-7. Pénalités de retard de 2%/semaine.`
            : `Standardiser les échéances (30/40/30). Envoyer des rappels 7 jours avant chaque échéance.`,
          value: avance.percent,
          createdAt: ts,
        });
      }
    }

    return alerts;
  }

  // ============================================================
  // ALERTES FINANCES (REVENUS)
  // ============================================================

  private buildFinanceAlerts(kpis: KpiCardsDto, createdAt?: string): AlertItem[] {
    const alerts: AlertItem[] = [];
    const ts = createdAt || new Date().toISOString();

    if (kpis.totalRevenueGrowthPercent < -20) {
      alerts.push({
        type: AlertType.FINANCE,
        priority: AlertPriority.CRITICAL,
        title: 'Chute sévère du chiffre d\'affaires',
        message: `Le CA a chuté de ${kpis.totalRevenueGrowthPercent}% par rapport à la période précédente.`,
        action: this.actionChuteCA(kpis.totalRevenueGrowthPercent),
        value: kpis.totalRevenueGrowthPercent,
        createdAt: ts,
      });
    } else if (kpis.totalRevenueGrowthPercent < -10) {
      alerts.push({
        type: AlertType.FINANCE,
        priority: AlertPriority.WARNING,
        title: 'Baisse du chiffre d\'affaires',
        message: `Le CA est en baisse de ${kpis.totalRevenueGrowthPercent}%.`,
        action: this.actionChuteCA(kpis.totalRevenueGrowthPercent),
        value: kpis.totalRevenueGrowthPercent,
        createdAt: ts,
      });
    }

    if (kpis.recoveryRatePercent < 70) {
      alerts.push({
        type: AlertType.FINANCE,
        priority: AlertPriority.CRITICAL,
        title: 'Taux de recouvrement financier critique',
        message: `Seulement ${kpis.recoveryRatePercent}% du facturé a été encaissé.`,
        action: this.actionRecouvrement(kpis.recoveryRatePercent),
        value: kpis.recoveryRatePercent,
        createdAt: ts,
      });
    } else if (kpis.recoveryRatePercent < 85) {
      alerts.push({
        type: AlertType.FINANCE,
        priority: AlertPriority.WARNING,
        title: 'Taux de recouvrement à surveiller',
        message: `${kpis.recoveryRatePercent}% du facturé est encaissé.`,
        action: this.actionRecouvrement(kpis.recoveryRatePercent),
        value: kpis.recoveryRatePercent,
        createdAt: ts,
      });
    }

    if (kpis.averageBasketGrowthPercent < -15) {
      alerts.push({
        type: AlertType.FINANCE,
        priority: AlertPriority.WARNING,
        title: 'Panier moyen en chute libre',
        message: `Le panier moyen a diminué de ${kpis.averageBasketGrowthPercent}%.`,
        action: kpis.averageBasketGrowthPercent < -30
          ? `Chute sévère du panier (${kpis.averageBasketGrowthPercent}%). Arrêter les remises. Créer des packs premium à +30%. Cibler les entreprises (budgets plus élevés).`
          : `Proposer des formations premium ou des packs combinés (3 formations = -10%).`,
        value: kpis.averageBasketGrowthPercent,
        createdAt: ts,
      });
    }

    if (kpis.totalRevenue === 0) {
      alerts.push({
        type: AlertType.FINANCE,
        priority: AlertPriority.INFO,
        title: 'Aucun revenu détecté',
        message: 'Aucun paiement n\'a été enregistré sur la période sélectionnée.',
        action: "Vérifier les données ou élargir la période d'analyse.",
        value: 0,
        createdAt: ts,
      });
    }

    return alerts;
  }

  // ============================================================
  // ALERTES SESSIONS (COÛTS)
  // ============================================================

  private buildSessionAlerts(
    kpis: CostKpiDto,
    sessions?: SessionCostTableResponseDto,
    createdAt?: string,
  ): AlertItem[] {
    const alerts: AlertItem[] = [];
    const ts = createdAt || new Date().toISOString();

    if (kpis.breakEven?.status === 'hard') {
      const ratio = kpis.breakEven.studentsNeeded > 0
        ? kpis.breakEven.totalStudents / kpis.breakEven.studentsNeeded
        : 0;
      alerts.push({
        type: AlertType.SESSION,
        priority: AlertPriority.CRITICAL,
        title: 'Rentabilité des sessions critique',
        message: `Seuil de rentabilité loin d'être atteint (${kpis.breakEven.totalStudents}/${kpis.breakEven.studentsNeeded} étudiants, ratio ${(ratio * 100).toFixed(0)}%).`,
        action: this.actionBreakEven(ratio, kpis.breakEven.studentsNeeded, kpis.breakEven.totalStudents),
        value: Number(ratio.toFixed(2)),
        createdAt: ts,
      });
    } else if (kpis.breakEven?.status === 'medium') {
      const ratio = kpis.breakEven.studentsNeeded > 0
        ? kpis.breakEven.totalStudents / kpis.breakEven.studentsNeeded
        : 0;
      alerts.push({
        type: AlertType.SESSION,
        priority: AlertPriority.WARNING,
        title: 'Rentabilité des sessions fragile',
        message: `Le seuil de rentabilité est juste atteint (${kpis.breakEven.totalStudents}/${kpis.breakEven.studentsNeeded} étudiants).`,
        action: this.actionBreakEven(ratio, kpis.breakEven.studentsNeeded, kpis.breakEven.totalStudents),
        value: kpis.breakEven.totalStudents,
        createdAt: ts,
      });
    }

    const totalCost = kpis.coutTotal || 1;
    const formateurRatio = (kpis.coutFormateurs / totalCost) * 100;
    if (formateurRatio > 70) {
      alerts.push({
        type: AlertType.SESSION,
        priority: AlertPriority.WARNING,
        title: 'Coût formateurs dominant',
        message: `Les coûts formateurs représentent ${formateurRatio.toFixed(1)}% du coût total.`,
        action: formateurRatio > 85
          ? `Ratio extrême (${formateurRatio.toFixed(1)}%). Négocier les TJM à -20%. Privilégier les formateurs internes. Externaliser uniquement si expertise unique.`
          : `Négocier les TJM à -10%. Former des instructeurs internes sur les modules récurrents.`,
        value: Number(formateurRatio.toFixed(2)),
        createdAt: ts,
      });
    }

    if (sessions?.items?.length) {
      const deficitCount = sessions.items.filter((s) => s.statutRentabilite === 'deficitaire').length;
      const lowFillCount = sessions.items.filter((s) => s.tauxRemplissagePercent < 50).length;
      const midFillCount = sessions.items.filter((s) => s.tauxRemplissagePercent >= 50 && s.tauxRemplissagePercent < 70).length;

      if (deficitCount > 0) {
        const deficitPercent = Math.round((deficitCount / sessions.items.length) * 100);
        alerts.push({
          type: AlertType.SESSION,
          priority: AlertPriority.CRITICAL,
          title: `${deficitCount} session(s) en déficit (${deficitPercent}%)`,
          message: `${deficitCount} session(s) sur ${sessions.items.length} génèrent une marge négative.`,
          action: deficitPercent > 30
            ? `${deficitPercent}% des sessions en déficit ! Réviser le pricing global de +20%. Annuler les sessions avec <3 inscrits. Négocier tous les contrats formateurs.`
            : `Réviser le pricing des ${deficitCount} sessions concernées. Chercher des synergies logistiques.`,
          value: deficitCount,
          createdAt: ts,
        });
      }

      if (lowFillCount > 0) {
        const lowFillPercent = Math.round((lowFillCount / sessions.items.length) * 100);
        alerts.push({
          type: AlertType.SESSION,
          priority: AlertPriority.CRITICAL,
          title: `${lowFillCount} session(s) sous-remplies (${lowFillPercent}%)`,
          message: `${lowFillCount} session(s) ont un taux de remplissage < 50%.`,
          action: this.actionTauxRemplissage(lowFillPercent < 20 ? 40 : 25),
          value: lowFillCount,
          createdAt: ts,
        });
      } else if (midFillCount > 0) {
        alerts.push({
          type: AlertType.SESSION,
          priority: AlertPriority.WARNING,
          title: `${midFillCount} session(s) à remplissage moyen (50-70%)`,
          message: `${midFillCount} session(s) pourraient être optimisées.`,
          action: this.actionTauxRemplissage(60),
          value: midFillCount,
          createdAt: ts,
        });
      }
    }

    return alerts;
  }
}