import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { User, UserStatus } from '../../users/users.entity';
import { Inscription, InscriptionStatut } from '../../inscriptions/entities/inscriptions.entity';
import { Session, SessionStatut } from '../../sessions/entities/session.entity';
import { Formateur } from '../../formateurs/entities/formateur.entity';
import { Apprenant } from '../../apprenants/entities/apprenant.entity';

export interface AlertItem {
  type: 'error' | 'warning';
  title: string;
  message: string;
}

@Injectable()
export class AdminDashboardService {

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Inscription)
    private readonly inscriptionRepo: Repository<Inscription>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Formateur)
    private readonly formateurRepo: Repository<Formateur>,
    @InjectRepository(Apprenant)
    private readonly apprenantRepo: Repository<Apprenant>,
  ) {}

  // ─── GET /admin/kpis ──────────────────────────────────────────────────────
  async getKpis() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const utilisateursActifs = await this.userRepo.count({
      where: { status: UserStatus.ACCEPTED },
    });

    const donneesImportees = await this.userRepo.count({
      where: { createdAt: Between(startOfMonth, now) },
    });

    const demandesEnAttente = await this.inscriptionRepo.count({
      where: { statut: InscriptionStatut.PENDING },
    });

    const sessionsActives = await this.sessionRepo.count({
      where: {
        date: Between(
          startOfMonth.toISOString().split('T')[0],
          now.toISOString().split('T')[0]
        ),
        statut: SessionStatut.ACTIF,
      },
    });

    return { utilisateursActifs, donneesImportees, demandesEnAttente, sessionsActives };
  }

  // ─── GET /admin/activity ─────────────────────────────────────────────────
  async getActivity() {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const result: { jour: string; utilisateursActifs: number; imports: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      // ✅ Corrigé : utilisateurs ACCEPTED créés ou mis à jour ce jour
      // (approximation honnête — pas de login_logs pour l'instant)
      const utilisateursActifs = await this.userRepo.count({
        where: {
          status: UserStatus.ACCEPTED,
          createdAt: Between(date, nextDate),
        },
      });

      // ✅ Imports : nouveaux utilisateurs créés ce jour
      const imports = await this.userRepo.count({
        where: { createdAt: Between(date, nextDate) },
      });

      result.push({ jour: days[date.getDay()], utilisateursActifs, imports });
    }

    return result;
  }

  // ─── GET /admin/alerts ───────────────────────────────────────────────────
  async getAlerts() {
    const alerts: AlertItem[] = [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const formateursSansSessions = await this.formateurRepo
      .createQueryBuilder('f')
      .leftJoin('f.sessions', 's')
      .where('s.id IS NULL')
      .getCount();

    if (formateursSansSessions > 0) {
      alerts.push({
        type: 'warning',
        title: 'Formateurs inactifs',
        message: `${formateursSansSessions} formateur(s) sans session assignée`,
      });
    }

    const importsEnErreur = await this.inscriptionRepo.count({
      where: {
        statut: InscriptionStatut.REJECTED,
        createdAt: Between(startOfMonth, now),
      },
    });
    if (importsEnErreur > 0) {
      alerts.push({
        type: 'warning',
        title: 'Imports en erreur',
        message: `${importsEnErreur} inscription(s) rejetée(s) ce mois`,
      });
    }

    const sessionsSansFormateur = await this.sessionRepo.count({
      where: { formateurId: IsNull() },
    });
    if (sessionsSansFormateur > 0) {
      alerts.push({
        type: 'error',
        title: 'Sessions sans formateur',
        message: `${sessionsSansFormateur} session(s) sans formateur assigné`,
      });
    }

    return alerts;
  }

  // ─── GET /admin/data-quality ─────────────────────────────────────────────
  async getDataQuality() {
    const formateursSansSessions = await this.formateurRepo
      .createQueryBuilder('f')
      .leftJoin('f.sessions', 's')
      .where('s.id IS NULL')
      .getCount();

    const apprenantsSansTelephone = await this.apprenantRepo
      .createQueryBuilder('a')
      .innerJoin('a.user', 'u')
      .where('u.phone IS NULL')
      .getCount();

    const sessionsSansFormateur = await this.sessionRepo.count({
      where: { formateurId: IsNull() },
    });

    return { formateursSansSessions, apprenantsSansTelephone, sessionsSansFormateur };
  }
}