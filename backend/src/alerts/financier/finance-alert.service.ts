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
//une IA basée sur des règles métiers (Rule-Based AI)(mahouch ia generative ama yaamel recomendation enti w el cas mte3ek)
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
        action: 'Relancer immédiatement tous les impayés et proposer des échéanciers.',
        value: kpis.paymentRatePercent,
        createdAt: ts,
      });
    } else if (kpis.paymentRatePercent < 75) {
      alerts.push({
        type: AlertType.PAYMENT,
        priority: AlertPriority.WARNING,
        title: 'Taux de recouvrement faible',
        message: `Le taux de recouvrement est de ${kpis.paymentRatePercent}%, sous l'objectif de 75%.`,
        action: 'Envoyer des rappels de paiement automatisés.',
        value: kpis.paymentRatePercent,
        createdAt: ts,
      });
    }

    if (kpis.totalNonEncaisse > kpis.totalEncaisse && kpis.totalEncaisse > 0) {
      alerts.push({
        type: AlertType.PAYMENT,
        priority: AlertPriority.CRITICAL,
        title: 'Impayés supérieurs aux encaissements',
        message: `Les impayés (${kpis.totalNonEncaisse.toFixed(2)}€) dépassent les encaissements (${kpis.totalEncaisse.toFixed(2)}€).`,
        action: "Suspendre les nouvelles inscriptions jusqu'à régularisation.",
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
          action: "Mettre en place un acompte obligatoire à l'inscription.",
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
          action: 'Standardiser les échéances (30/40/30).',
          value: avance.percent,
          createdAt: ts,
        });
      }
    }

    return alerts;
  }

  private buildFinanceAlerts(kpis: KpiCardsDto, createdAt?: string): AlertItem[] {
    const alerts: AlertItem[] = [];
    const ts = createdAt || new Date().toISOString();

    if (kpis.totalRevenueGrowthPercent < -20) {
      alerts.push({
        type: AlertType.FINANCE,
        priority: AlertPriority.CRITICAL,
        title: 'Chute sévère du chiffre d\'affaires',
        message: `Le CA a chuté de ${kpis.totalRevenueGrowthPercent}% par rapport à la période précédente.`,
        action: 'Réunion d\'urgence commerciale : analyser les causes et ajuster le pricing.',
        value: kpis.totalRevenueGrowthPercent,
        createdAt: ts,
      });
    } else if (kpis.totalRevenueGrowthPercent < -10) {
      alerts.push({
        type: AlertType.FINANCE,
        priority: AlertPriority.WARNING,
        title: 'Baisse du chiffre d\'affaires',
        message: `Le CA est en baisse de ${kpis.totalRevenueGrowthPercent}%.`,
        action: 'Lancer une campagne promotionnelle ou contacter les prospects en sommeil.',
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
        action: 'Renforcer le contrôle de gestion et les relances clients.',
        value: kpis.recoveryRatePercent,
        createdAt: ts,
      });
    } else if (kpis.recoveryRatePercent < 85) {
      alerts.push({
        type: AlertType.FINANCE,
        priority: AlertPriority.WARNING,
        title: 'Taux de recouvrement à surveiller',
        message: `${kpis.recoveryRatePercent}% du facturé est encaissé.`,
        action: 'Relancer les soldes impayés avant la clôture mensuelle.',
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
        action: 'Proposer des formations premium ou des packs combinés.',
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

  private buildSessionAlerts(
    kpis: CostKpiDto,
    sessions?: SessionCostTableResponseDto,
    createdAt?: string,
  ): AlertItem[] {
    const alerts: AlertItem[] = [];
    const ts = createdAt || new Date().toISOString();

    if (kpis.breakEven?.status === 'hard') {
      const ratio =
        kpis.breakEven.studentsNeeded > 0
          ? kpis.breakEven.totalStudents / kpis.breakEven.studentsNeeded
          : 0;
      alerts.push({
        type: AlertType.SESSION,
        priority: AlertPriority.CRITICAL,
        title: 'Rentabilité des sessions critique',
        message: `Le seuil de rentabilité est loin d'être atteint (${kpis.breakEven.totalStudents}/${kpis.breakEven.studentsNeeded} étudiants).`,
        action: 'Réduire les coûts logistiques ou augmenter les prix de vente.',
        value: Number(ratio.toFixed(2)),
        createdAt: ts,
      });
    } else if (kpis.breakEven?.status === 'medium') {
      alerts.push({
        type: AlertType.SESSION,
        priority: AlertPriority.WARNING,
        title: 'Rentabilité des sessions fragile',
        message: `Le seuil de rentabilité est juste atteint (${kpis.breakEven.totalStudents}/${kpis.breakEven.studentsNeeded} étudiants).`,
        action: 'Surveiller les dépenses et optimiser le taux de remplissage.',
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
        action: 'Négocier les TJM ou privilégier les formations internes.',
        value: Number(formateurRatio.toFixed(2)),
        createdAt: ts,
      });
    }

    if (sessions?.items?.length) {
      const deficitCount = sessions.items.filter(
        (s) => s.statutRentabilite === 'deficitaire',
      ).length;
      const lowFillCount = sessions.items.filter(
        (s) => s.tauxRemplissagePercent < 50,
      ).length;
      const midFillCount = sessions.items.filter(
        (s) => s.tauxRemplissagePercent >= 50 && s.tauxRemplissagePercent < 70,
      ).length;

      if (deficitCount > 0) {
        alerts.push({
          type: AlertType.SESSION,
          priority: AlertPriority.CRITICAL,
          title: `${deficitCount} session(s) en déficit`,
          message: `${deficitCount} session(s) génèrent une marge négative sur la période analysée.`,
          action: 'Réviser le pricing ou annuler les sessions non rentables.',
          value: deficitCount,
          createdAt: ts,
        });
      }

      if (lowFillCount > 0) {
        alerts.push({
          type: AlertType.SESSION,
          priority: AlertPriority.CRITICAL,
          title: `${lowFillCount} session(s) sous-remplies (< 50%)`,
          message: `${lowFillCount} session(s) ont un taux de remplissage critique.`,
          action: 'Activer les listes d\'attente ou fusionner les sessions.',
          value: lowFillCount,
          createdAt: ts,
        });
      } else if (midFillCount > 0) {
        alerts.push({
          type: AlertType.SESSION,
          priority: AlertPriority.WARNING,
          title: `${midFillCount} session(s) à remplissage moyen (50-70%)`,
          message: `${midFillCount} session(s) pourraient être optimisées.`,
          action: 'Lancer une campagne de recrutement ciblée.',
          value: midFillCount,
          createdAt: ts,
        });
      }
    }

    return alerts;
  }
}