// dashboard/services/directeur.reports.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formation } from '../../formations/entities/formation.entity';
import { Performance as PerformanceEntity } from '../../performances/entities/performance.entity';
import { Finance } from '../../finances/entities/finance.entity';
import { Satisfaction } from '../../satisfaction/entities/satisfaction.entity';
import { Session } from '../../sessions/entities/session.entity';
import { ReportFiltersDto } from '../dto/report-filters.dto';

export interface HistoryPoint {
  label: string;
  enrollments: number;
  revenue: number;
  successRate: number;
  dropoutRate: number;
  satisfaction: number;
}

export interface TrainingReportRecord {
  formation: string;
  formateur: string;
  type: string;
  statut: string;
  history: HistoryPoint[];
}

@Injectable()
export class DirecteurReportsService {
  constructor(
    @InjectRepository(Formation)
    private formationRepo: Repository<Formation>,

    @InjectRepository(PerformanceEntity)
    private performanceRepo: Repository<PerformanceEntity>,

    @InjectRepository(Finance)
    private financeRepo: Repository<Finance>,

    @InjectRepository(Satisfaction)
    private satisfactionRepo: Repository<Satisfaction>,
  ) {}

  async getReports(filters: ReportFiltersDto): Promise<TrainingReportRecord[]> {
    const { monthLabels, startDate } = this.getPeriodConfig(filters.periode);
    const normalizedType = this.normalizeSessionType(filters.type);

    const formations = await this.formationRepo.find({
      relations: ['sessions'],
    });

    const results: TrainingReportRecord[] = [];

    for (const formation of formations) {
      if (filters.formation && filters.formation !== 'Tous') {
        if (formation.titre !== filters.formation) continue;
      }

      if (normalizedType) {
        const hasMatchingSessionType =
          formation.sessions?.some((session) => session.type === normalizedType) ?? false;
        if (!hasMatchingSessionType) continue;
      }

      if (filters.statut && filters.statut !== 'Tous') {
        const statutMap: Record<string, string> = {
          Actif: 'active',
          Terminé: 'completed',
          Annulé: 'cancelled',
        };
        const mapped = statutMap[filters.statut] ?? filters.statut;
        if (formation.statut !== mapped) continue;
      }

      const sessionIds = formation.sessions?.map((session) => session.id) ?? [];

      const performances = await this.performanceRepo
        .createQueryBuilder('p')
        .where('p.formationId = :formationId', { formationId: formation.id })
        .andWhere('p.date >= :startDate', { startDate })
        .getMany();

      const finances =
        sessionIds.length > 0
          ? await this.financeRepo
              .createQueryBuilder('f')
              .where('f.sessionId IN (:...sessionIds)', { sessionIds })
              .andWhere("f.type = 'paiement'")
              .andWhere('f.date >= :startDate', { startDate })
              .getMany()
          : [];

      const satisfactions = await this.satisfactionRepo
        .createQueryBuilder('s')
        .where('s.formationId = :formationId', { formationId: formation.id })
        .andWhere('s.createdAt >= :startDate', { startDate })
        .getMany();

      const formateurNom = this.getFormateurNom(formation.sessions ?? []);

      if (filters.formateur && filters.formateur !== 'Tous') {
        if (formateurNom !== filters.formateur) continue;
      }

      const history: HistoryPoint[] = monthLabels.map((label, index) => {
        const monthStart = new Date(startDate);
        monthStart.setMonth(monthStart.getMonth() + index);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const monthPerfs = performances.filter((performance) => {
          const date = new Date(performance.date);
          return date >= monthStart && date < monthEnd;
        });

        const enrollments = monthPerfs.length;

        const monthFinances = finances.filter((finance) => {
          const date = new Date(finance.date);
          return date >= monthStart && date < monthEnd;
        });
        const revenue = monthFinances.reduce(
          (sum, finance) => sum + Number(finance.montant),
          0,
        );

        const total = monthPerfs.length;
        const reussis = monthPerfs.filter((performance) => performance.estReussi).length;
        const successRate = total > 0 ? Math.round((reussis / total) * 100) : 0;
        const dropoutRate =
          total > 0 ? Math.round(((total - reussis) / total) * 100) : 0;

        const monthSats = satisfactions.filter((satisfaction) => {
          const date = new Date(satisfaction.createdAt);
          return date >= monthStart && date < monthEnd;
        });
        const satisfaction =
          monthSats.length > 0
            ? Math.round(
                (monthSats.reduce((sum, item) => sum + Number(item.note), 0) /
                  monthSats.length /
                  5) *
                  100,
              )
            : 0;

        return {
          label,
          enrollments,
          revenue,
          successRate,
          dropoutRate,
          satisfaction,
        };
      });

      results.push({
        formation: formation.titre,
        formateur: formateurNom,
        type: this.getFormationTypeLabel(formation.sessions ?? []),
        statut: this.getFormationStatusLabel(formation.statut),
        history,
      });
    }

    return results;
  }

  private getPeriodConfig(periode?: string): {
    monthLabels: string[];
    startDate: Date;
  } {
    const monthsByPeriod: Record<string, number> = {
      Trimestre: 3,
      Semestre: 6,
      Année: 6,
      Annee: 6,
    };

    const monthLabelsSource = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const months = monthsByPeriod[periode ?? 'Trimestre'] ?? 3;

    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);

    const monthLabels: string[] = [];
    for (let index = 0; index < months; index += 1) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + index);
      monthLabels.push(monthLabelsSource[date.getMonth()]);
    }

    return { monthLabels, startDate };
  }

  private getFormateurNom(sessions: Session[]): string {
    const mainFormateur = sessions.find((session) => session.formateur)?.formateur;
    if (!mainFormateur) return 'Non assigné';
    return `${mainFormateur.prenom} ${mainFormateur.nom}`;
  }

  private normalizeSessionType(type?: string): string | null {
    if (!type || type === 'Tous') return null;

    const normalizedType = type.toLowerCase().trim();

    if (normalizedType === 'présentiel' || normalizedType === 'presentiel') {
      return 'présentiel';
    }

    if (normalizedType === 'en ligne' || normalizedType === 'en_ligne') {
      return 'en_ligne';
    }

    return type;
  }

  private getFormationTypeLabel(sessions: Session[]): string {
    const firstTypedSession = sessions.find((session) => !!session.type);
    if (!firstTypedSession?.type) return 'N/A';
    if (firstTypedSession.type === 'en_ligne') return 'En ligne';
    if (firstTypedSession.type === 'présentiel') return 'Présentiel';
    return firstTypedSession.type;
  }

  private getFormationStatusLabel(status?: string): string {
    const statusMap: Record<string, string> = {
      active: 'Actif',
      completed: 'Terminé',
      cancelled: 'Annulé',
    };

    return status ? (statusMap[status] ?? status) : 'N/A';
  }
}
