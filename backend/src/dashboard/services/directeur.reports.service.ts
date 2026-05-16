import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formation } from '../../formations/entities/formation.entity';
import { Performance as PerformanceEntity } from '../../performances/entities/performance.entity';
import { Finance } from '../../finances/entities/finance.entity';
import { Satisfaction } from '../../satisfaction/entities/satisfaction.entity';
import { Session } from '../../sessions/entities/session.entity';
import { ReportFiltersDto } from '../dto/report-filters.dto';
import { computeAbandonRate } from '../../common/helpers/abandon.helper';

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

    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
  ) {}

  async getReports(filters: ReportFiltersDto): Promise<TrainingReportRecord[]> {
    const { monthLabels, startDate } = this.getPeriodConfig(filters.periode);
    const normalizedType = this.normalizeSessionType(filters.type);

    const formations = await this.formationRepo.find({
      relations: ['sessions', 'sessions.formateur', 'sessions.apprenants'],
    });

    const results: TrainingReportRecord[] = [];

    for (const formation of formations) {
      if (filters.formation && filters.formation !== 'Tous') {
        if (formation.titre !== filters.formation) continue;
      }

      if (normalizedType) {
        const hasMatchingSessionType =
          formation.sessions?.some((s) => s.type === normalizedType) ?? false;
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

      const sessionIds = formation.sessions?.map((s) => s.id) ?? [];

      const performances = await this.performanceRepo
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.apprenant', 'apprenant')
        .leftJoin('p.formation', 'formation')
        .where('formation.id = :formationId', { formationId: formation.id })
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
        .leftJoin('s.formation', 'formation')
        .where('formation.id = :formationId', { formationId: formation.id })
        .andWhere('s.createdAt >= :startDate', { startDate })
        .getMany();

      const formateurNom = this.getFormateurNom(formation.sessions ?? []);

      if (filters.formateur && filters.formateur !== 'Tous') {
        if (formateurNom.toLowerCase().trim() !== filters.formateur.toLowerCase().trim()) continue;
      }

      const history: HistoryPoint[] = monthLabels.map((label, index) => {
        const monthStart = new Date(startDate);
        monthStart.setMonth(monthStart.getMonth() + index);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const monthPerfs = performances.filter((p) => {
          const date = new Date(p.date);
          return date >= monthStart && date < monthEnd;
        });

        const monthFinances = finances.filter((f) => {
          const date = new Date(f.date);
          return date >= monthStart && date < monthEnd;
        });
        const revenue = monthFinances.reduce((sum, f) => sum + Number(f.montant), 0);

        const total   = monthPerfs.length;
        const reussis = monthPerfs.filter((p) => p.estReussi).length;
        const successRate = total > 0 ? Math.round((reussis / total) * 100) : 0;

        // ✅ abandon = inscrits ce mois sans performance
        const monthSessionIds = (formation.sessions ?? [])
          .filter((s) => {
            const d = new Date(s.date);
            return d >= monthStart && d < monthEnd;
          })
          .map((s) => s.id);

        // apprenants uniques inscrits ce mois via sessions.apprenants (déjà chargés)
        const inscritsThisMonth = new Set<number>();
        for (const s of formation.sessions ?? []) {
          if (!monthSessionIds.includes(s.id)) continue;
          for (const a of s.apprenants ?? []) inscritsThisMonth.add(a.id);
        }

        const evaluesThisMonth = new Set(
          monthPerfs.map((p) => p.apprenant?.id).filter((id): id is number => id != null),
        );

        const dropoutRate = computeAbandonRate(inscritsThisMonth.size, evaluesThisMonth.size);

        const monthSats = satisfactions.filter((s) => {
          const date = new Date(s.createdAt);
          return date >= monthStart && date < monthEnd;
        });
        const satisfaction =
          monthSats.length > 0
            ? Math.round(
                (monthSats.reduce((sum, s) => sum + Number(s.note), 0) /
                  monthSats.length /
                  5) *
                  100,
              )
            : 0;

        return {
          label,
          enrollments: inscritsThisMonth.size, // ✅ vrais inscrits, pas juste performances
          revenue,
          successRate,
          dropoutRate,
          satisfaction,
        };
      });

      results.push({
        formation: formation.titre,
        formateur: formateurNom,
        type:   this.getFormationTypeLabel(formation.sessions ?? []),
        statut: this.getFormationStatusLabel(formation.statut),
        history,
      });
    }

    return results;
  }

  private getPeriodConfig(periode?: string): { monthLabels: string[]; startDate: Date } {
    const monthsByPeriod: Record<string, number> = {
      Trimestre: 3, Semestre: 6, Année: 12, Annee: 12,
    };
    const monthLabelsSource = ['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec'];
    const now    = new Date();
    const months = monthsByPeriod[periode ?? 'Trimestre'] ?? 3;
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);

    const monthLabels: string[] = [];
    for (let i = 0; i < months; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      monthLabels.push(monthLabelsSource[date.getMonth()]);
    }
    return { monthLabels, startDate };
  }

  private getFormateurNom(sessions: Session[]): string {
    const main = sessions.find((s) => s.formateur)?.formateur;
    if (!main) return 'Non assigné';
    return `${main.prenom} ${main.nom}`;
  }

  private normalizeSessionType(type?: string): string | null {
    if (!type || type === 'Tous') return null;
    const t = type.toLowerCase().trim();
    if (['présentiel', 'presentiel'].includes(t)) return 'présentiel';
    if (['en ligne', 'en_ligne'].includes(t))      return 'en_ligne';
    return type;
  }

  private getFormationTypeLabel(sessions: Session[]): string {
    const first = sessions.find((s) => !!s.type);
    if (!first?.type) return 'N/A';
    if (first.type === 'en_ligne')   return 'En ligne';
    if (first.type === 'présentiel') return 'Présentiel';
    return first.type;
  }

  private getFormationStatusLabel(status?: string): string {
    const map: Record<string, string> = { active: 'Actif', completed: 'Terminé', cancelled: 'Annulé' };
    return status ? (map[status] ?? status) : 'N/A';
  }
}