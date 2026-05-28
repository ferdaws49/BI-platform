import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertStatus } from './entities/alert-status.entity';
import { AlertFilterDto } from './dtos/alert-filter.dto';
import {
  AlertResponseDto,
  AlertItem,
  AlertPriority,
  AlertType,
} from './dtos/alert-response.dto';
import * as crypto from 'crypto';

// ─── helper: stable alertId ────────────────────────────────────────────────
function makeAlertId(type: string, subType: string, date: string): string {
  return crypto
    .createHash('md5')
    .update(`${type}-${subType}-${date}`)
    .digest('hex')
    .slice(0, 16);
}

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertStatus)
    private readonly alertStatusRepo: Repository<AlertStatus>,

    // inject tes autres repos ici selon ton projet:
    // @InjectRepository(Formation)
    // private readonly formationRepo: Repository<Formation>,
    // @InjectRepository(Paiement)
    // private readonly paiementRepo: Repository<Paiement>,
  ) {}

  // ─── calculate alerts dynamically (pas de table alerts) ──────────────────
  private calculateAlerts(filter: AlertFilterDto): AlertItem[] {
    // TODO: remplace par de vraies requêtes vers tes repos
    // exemple: const formations = await this.formationRepo.find();
    // puis tu calcules les seuils (taux abandon, revenus, etc.)

    const today = new Date().toISOString().split('T')[0];

    const raw: AlertItem[] = [
      {
        id: makeAlertId('session', 'data-science', today),
        type: AlertType.SESSION,
        priority: AlertPriority.CRITICAL,
        title: "Taux d'abandon élevé",
        message: "Le taux d'abandon pour Data Science a dépassé 35%",
        action: 'Revoir le contenu et contacter les apprenants',
        value: 34.6,
        createdAt: today,
        viewed: false,
        treated: false,
      },
      {
        id: makeAlertId('finance', 'data-engineering', today),
        type: AlertType.FINANCE,
        priority: AlertPriority.CRITICAL,
        title: 'Revenus en baisse',
        message: 'Les revenus Data Engineering baissent de 25%',
        action: 'Analyser les inscriptions et ajuster la stratégie',
        value: -25,
        createdAt: today,
        viewed: false,
        treated: false,
      },
      {
        id: makeAlertId('payment', 'web-dev', today),
        type: AlertType.PAYMENT,
        priority: AlertPriority.WARNING,
        title: 'Satisfaction faible',
        message: "L'évaluation moyenne Web Dev chute à 3.2/5",
        action: 'Ajouter des exercices pratiques',
        value: 3.2,
        createdAt: today,
        viewed: false,
        treated: false,
      },
    ];

    // filter par date si fourni
    if (filter.startDate || filter.endDate) {
      return raw.filter((a) => {
        const d = new Date(a.createdAt);
        if (filter.startDate && d < new Date(filter.startDate)) return false;
        if (filter.endDate && d > new Date(filter.endDate)) return false;
        return true;
      });
    }

    return raw;
  }

  // ─── GET /alerts ──────────────────────────────────────────────────────────
  async getAlerts(filter: AlertFilterDto): Promise<AlertResponseDto> {
    const alerts = this.calculateAlerts(filter);

    // fetch tous les statuts en une seule requête
    const ids = alerts.map((a) => a.id);
    const statuses = ids.length
      ? await this.alertStatusRepo
          .createQueryBuilder('s')
          .where('s.alert_id IN (:...ids)', { ids })
          .getMany()
      : [];

    const statusMap = new Map(statuses.map((s) => [s.alertId, s]));

    // merge statut dans chaque alerte
    const enriched = alerts.map((alert) => {
      const status = statusMap.get(alert.id);
      return {
        ...alert,
        viewed: status?.isViewed ?? false,
        treated: status?.isTreated ?? false,
      };
    });

    return {
      total: enriched.length,
      critique: enriched.filter((a) => a.priority === AlertPriority.CRITICAL)
        .length,
      warning: enriched.filter((a) => a.priority === AlertPriority.WARNING)
        .length,
      info: enriched.filter((a) => a.priority === AlertPriority.INFO).length,
      alerts: enriched,
    };
  }

  // ─── POST /alerts/:id/view ────────────────────────────────────────────────
  async markViewed(alertId: string, userId?: number): Promise<void> {
    const existing = await this.alertStatusRepo.findOne({
      where: { alertId, userId },
    });

    if (existing) {
      existing.isViewed = true;
      await this.alertStatusRepo.save(existing);
    } else {
      await this.alertStatusRepo.save(
        this.alertStatusRepo.create({ alertId, userId, isViewed: true }),
      );
    }
  }

  // ─── POST /alerts/:id/treat ───────────────────────────────────────────────
  async markTreated(alertId: string, userId?: number): Promise<void> {
    const existing = await this.alertStatusRepo.findOne({
      where: { alertId, userId },
    });

    if (existing) {
      existing.isTreated = !existing.isTreated; // toggle
      await this.alertStatusRepo.save(existing);
    } else {
      await this.alertStatusRepo.save(
        this.alertStatusRepo.create({
          alertId,
          userId,
          isViewed: true,
          isTreated: true,
        }),
      );
    }
  }
}
