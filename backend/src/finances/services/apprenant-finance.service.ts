import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Apprenant } from 'src/apprenants/entities/apprenant.entity';
import { Finance, FinanceType } from 'src/finances/entities/finance.entity';
import { Session } from 'src/sessions/entities/session.entity';
import { GetStudentPaymentsDto } from '../dto/get-student-payments.dto';

@Injectable()
export class StudentFinanceService {
  constructor(
    @InjectRepository(Finance)
    private readonly financeRepo: Repository<Finance>,
    @InjectRepository(Apprenant)
    private readonly apprenantRepo: Repository<Apprenant>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}



  /**
   * Récupère l'ID Apprenant lié au User connecté.
   * Sécurité : un user ne peut voir que ses propres paiements.
   */
  private async resolveApprenantId(userId: number): Promise<number> {
    const apprenant = await this.apprenantRepo.findOne({
      where: { userId },
      select: ['id'],
    });
    if (!apprenant) {
      throw new ForbiddenException('Aucun profil étudiant lié à ce compte');
    }
    return apprenant.id;
  }

  /**
   * Liste paginée des paiements de l'étudiant connecté.
   * Filtres : session, formation, plage de dates.
   * Tri : date décroissante.
   */
  async getPayments(userId: number, dto: GetStudentPaymentsDto) {
    const apprenantId = await this.resolveApprenantId(userId);
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const [entities, total] = await this.financeRepo
      .createQueryBuilder('finance')
      .leftJoinAndSelect('finance.session', 'session')
      .leftJoinAndSelect('session.formation', 'formation')
      .where('finance.apprenantId = :apprenantId', { apprenantId })
      .andWhere('finance.type = :type', { type: FinanceType.PAIEMENT })
      .orderBy('finance.date', 'DESC')
      .addOrderBy('finance.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data = entities.map((f) => ({
      id: f.id,
      amount: Number(f.montant),
      date: f.date,
      sessionId: f.sessionId,
      sessionTitle: f.session?.title ?? null,
      formationTitle:
        (f.session?.formation as any)?.titre ??
        (f.session?.formation as any)?.name ??
        null,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Résumé financier de l'étudiant.
   * - Total payé
   * - Reste à payer (coût sessions inscrites - total payé)
   * - Nombre de paiements
   * - Nombre de sessions inscrites
   */
  async getSummary(userId: number) {
    const apprenantId = await this.resolveApprenantId(userId);

    // 1. Agrégation des paiements
    const stats = await this.financeRepo
      .createQueryBuilder('finance')
      .select('COALESCE(SUM(finance.montant), 0)', 'totalPaid')
      .addSelect('COUNT(finance.id)', 'paymentsCount')
      .where('finance.apprenantId = :apprenantId', { apprenantId })
      .andWhere('finance.type = :type', { type: FinanceType.PAIEMENT })
      .getRawOne();

    // 2. Sessions où l'étudiant est inscrit (table pivot sessions_apprenants)
    const enrolledSessions = await this.sessionRepo
      .createQueryBuilder('session')
      .innerJoin(
        'session.apprenants',
        'apprenant',
        'apprenant.id = :apprenantId',
        { apprenantId },
      )
      .leftJoinAndSelect('session.formation', 'formation')
      .getMany();

    // 3. Calcul du coût total (prix session prioritaire sur prix formation)
    const totalCost = enrolledSessions.reduce((sum, session) => {
      const sessionPrice = session.prix ? Number(session.prix) : null;
      // ⚠️ ADAPTE selon ton entité Formation (prix, cout, tarif, etc.)
      const formationPrice = session.formation
        ? Number((session.formation as any)?.prix ?? 0)
        : 0;

      const price = sessionPrice ?? formationPrice ?? 0;
      return sum + price;
    }, 0);

    const totalPaid = Number(stats.totalPaid) || 0;
    const resteAPayer = Math.max(0, totalCost - totalPaid);

    return {
      totalPaid,
      resteAPayer,
      totalCost,
      paymentsCount: Number(stats.paymentsCount) || 0,
      sessionsCount: enrolledSessions.length,
    };
  }
}