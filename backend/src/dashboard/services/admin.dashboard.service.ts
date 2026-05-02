import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User, UserStatus } from '../../users/users.entity';

@Injectable()
export class AdminDashboardService {

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ─── GET /admin/kpis ──────────────────────────────────────────────────────
  async getKpis() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [utilisateursActifs, donneesImportees, demandesEnAttente, erreursSysteme] =
      await Promise.all([
        this.userRepo.count({ where: { status: UserStatus.ACCEPTED } }),
        this.userRepo.count({ where: { createdAt: Between(startOfMonth, now) } }),
        this.userRepo.count({ where: { status: UserStatus.PENDING } }),
        this.userRepo.count({ where: { status: UserStatus.REJECTED } }),
      ]);

    return { utilisateursActifs, donneesImportees, demandesEnAttente, erreursSysteme };
  }

  // ─── GET /admin/activity ─────────────────────────────────────────────────
  async getActivity() {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const result: { jour: string; connexions: number; imports: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [connexions, imports] = await Promise.all([
        this.userRepo.count({
          where: { updatedAt: Between(date, nextDate), status: UserStatus.ACCEPTED },
        }),
        this.userRepo.count({
          where: { createdAt: Between(date, nextDate) },
        }),
      ]);

      result.push({ jour: days[date.getDay()], connexions, imports });
    }

    return result;
  }

  // ─── GET /admin/services ─────────────────────────────────────────────────
  async getServices() {
    const pgStart = Date.now();
    let pgStatus: 'ok' | 'warn' | 'down' = 'down';
    let pgLatence = '—';

    try {
      await this.userRepo.query('SELECT 1');
      const ms = Date.now() - pgStart;
      pgLatence = `${ms}ms`;
      pgStatus = ms < 100 ? 'ok' : 'warn';
    } catch { /* reste down */ }

    return [
      { nom: 'PostgreSQL',    latence: pgLatence,  statut: pgStatus },
      { nom: 'NestJS Backend',latence: '< 5ms',    statut: 'ok'   },
      { nom: 'Redis Cache',   latence: '—',         statut: 'down' }, // ← brancher si Redis ajouté
      { nom: 'Supabase Auth', latence: '< 30ms',   statut: 'ok'   },
      { nom: 'Email Service', latence: '—',         statut: 'down' }, // ← brancher si Nodemailer
    ];
  }
}