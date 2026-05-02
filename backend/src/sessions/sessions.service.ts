import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThan, In, Not } from 'typeorm';

import { Session, SessionStatut,SessionType } from './entities/session.entity';
import { Presence } from './entities/presence.entity';
import { Formation } from '../formations/entities/formation.entity';
import { Formateur } from '../formateurs/entities/formateur.entity';
import { Apprenant } from '../apprenants/entities/apprenant.entity';

import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { FilterSessionDto } from './dto/filter-session.dto';
import { ConflictCheckDto } from './dto/conflict-check.dto';
import { MarquerPresenceDto } from './dto/marquer-presence.dto';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(Presence) private presenceRepo: Repository<Presence>,
    @InjectRepository(Formation) private formationRepo: Repository<Formation>,
    @InjectRepository(Formateur) private formateurRepo: Repository<Formateur>,
    @InjectRepository(Apprenant) private apprenantRepo: Repository<Apprenant>,
    private dataSource: DataSource,
  ) {}

  async findAll(filters: FilterSessionDto): Promise<any[]> {
    const qb = this.sessionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.formation', 'f')
      .leftJoinAndSelect('s.formateur', 'fmt')
      .leftJoinAndSelect('s.apprenants', 'a')
      .leftJoinAndSelect('a.user', 'u') // ✅ زيد هذا
      .orderBy('s.date', 'ASC')
      .addOrderBy('s.heureDebut', 'ASC');

    if (filters.statut)
      qb.andWhere('s.statut = :statut', { statut: filters.statut });
    if (filters.formation)
      qb.andWhere('f.id = :formationId', { formationId: filters.formation });
    if (filters.formateur)
      qb.andWhere('fmt.id = :formateurId', { formateurId: filters.formateur });
    if (filters.periode) {
      const now = new Date();
      const start = new Date();
      if (filters.periode === 'week') start.setDate(now.getDate() - 7);
      else if (filters.periode === 'month') start.setMonth(now.getMonth() - 1);
      else if (filters.periode === 'year')
        start.setFullYear(now.getFullYear() - 1);
      qb.andWhere('s.date >= :start', {
        start: start.toISOString().split('T')[0],
      });
    }

    const sessions = await qb.getMany();
    return sessions.map((s) => this.serializeSession(s));
  }

  async checkConflicts(dto: ConflictCheckDto): Promise<{ conflicts: any[] }> {
    const conflicts: { type: string; message: string }[] = [];

    if (dto.formateurId) {
      const qb = this.sessionRepo
        .createQueryBuilder('s')
        .where('s.formateurId = :fid', { fid: dto.formateurId })
        .andWhere('s.date = :date', { date: dto.date })
        .andWhere('s.statut != :annule', { annule: SessionStatut.ANNULE })
        .andWhere('s.heureDebut < :heureFin', { heureFin: dto.heureFin })
        .andWhere('s.heureFin > :heureDebut', { heureDebut: dto.heureDebut });
      if (dto.excludeId)
        qb.andWhere('s.id != :excludeId', { excludeId: dto.excludeId });
      const c = await qb.getOne();
      if (c) {
        const fmt = await this.formateurRepo.findOne({
          where: { id: dto.formateurId },
        });
        const nom = fmt ? `${fmt.prenom} ${fmt.nom}` : 'Ce formateur';
        conflicts.push({
          type: 'formateur',
          message: `${nom} est déjà affecté sur ce créneau (${c.heureDebut} – ${c.heureFin}).`,
        });
      }
    }

    if (dto.formationId) {
      const qb = this.sessionRepo
        .createQueryBuilder('s')
        .where('s.formationId = :fid', { fid: dto.formationId })
        .andWhere('s.date = :date', { date: dto.date })
        .andWhere('s.statut != :annule', { annule: SessionStatut.ANNULE })
        .andWhere('s.heureDebut < :heureFin', { heureFin: dto.heureFin })
        .andWhere('s.heureFin > :heureDebut', { heureDebut: dto.heureDebut });
      if (dto.excludeId)
        qb.andWhere('s.id != :excludeId', { excludeId: dto.excludeId });
      const c = await qb.getOne();
      if (c) {
        const formation = await this.formationRepo.findOne({
          where: { id: dto.formationId },
        });
        conflicts.push({
          type: 'formation',
          message: `${formation?.titre ?? 'Cette formation'} est déjà planifiée sur ce créneau.`,
        });
      }
    }

    return { conflicts };
  }

  async create(dto: CreateSessionDto): Promise<any> {
    if (dto.heureDebut >= dto.heureFin)
      throw new BadRequestException(
        "L'heure de fin doit être après l'heure de début.",
      );

    const formation = await this.formationRepo.findOne({
      where: { id: dto.formationId },
    });
    if (!formation) throw new NotFoundException('Formation introuvable.');

    let formateur: Formateur | null = null;
    if (dto.formateurId) {
      formateur = await this.formateurRepo.findOne({
        where: { id: dto.formateurId },
      });
      if (!formateur) throw new NotFoundException('Formateur introuvable.');

      const conflict = await this.sessionRepo.findOne({
        where: {
          formateurId: dto.formateurId,
          date: dto.date,
          heureDebut: LessThan(dto.heureFin),
          heureFin: MoreThan(dto.heureDebut),
          statut: Not(SessionStatut.ANNULE),
        },
      });
      if (conflict)
        throw new BadRequestException(
          `Formateur déjà pris sur ce créneau (${conflict.heureDebut} – ${conflict.heureFin}).`,
        );
    }

    let apprenants: Apprenant[] = [];
    if (dto.apprenantIds?.length) {
      apprenants = await this.apprenantRepo.find({
        where: { id: In(dto.apprenantIds) },
        relations: ['user'], // ✅ زيد هذا
      });
    }

    const session = this.sessionRepo.create({
      date: dto.date,
      heureDebut: dto.heureDebut,
      heureFin: dto.heureFin,
      lieu: dto.lieu,
      statut: dto.statut ?? SessionStatut.ACTIF,
      type: dto.type ?? SessionType.PRESENTIEL, // ✅
      prix: dto.prix ?? null,
      capacite: dto.capacite ?? null, // ✅ زيد هذا
      formationId: dto.formationId,
      formateurId: dto.formateurId ?? null,
      formation,
      formateur,
      apprenants,
    });

    const saved = await this.sessionRepo.save(session);

    // ❌ حذف updateFormationRevenue
    await this.updateFormationStatus(dto.formationId);

    return this.serializeSession(saved);
  }

  async update(id: string, dto: UpdateSessionDto): Promise<any> {
    const session = await this.sessionRepo.findOne({
      where: { id },
      relations: ['formation', 'formateur', 'apprenants', 'apprenants.user'], // ✅
    });
    if (!session) throw new NotFoundException('Session introuvable.');

    const newHeureDebut = dto.heureDebut ?? session.heureDebut;
    const newHeureFin = dto.heureFin ?? session.heureFin;
    if (newHeureDebut >= newHeureFin)
      throw new BadRequestException(
        "L'heure de fin doit être après l'heure de début.",
      );

    const oldFormationId = session.formationId;

    if (dto.formationId && dto.formationId !== session.formationId) {
      const formation = await this.formationRepo.findOne({
        where: { id: dto.formationId },
      });
      if (!formation) throw new NotFoundException('Formation introuvable.');
      session.formation = formation;
      session.formationId = dto.formationId;
    }

    if (dto.formateurId !== undefined) {
      if (dto.formateurId) {
        const formateur = await this.formateurRepo.findOne({
          where: { id: dto.formateurId },
        });
        if (!formateur) throw new NotFoundException('Formateur introuvable.');
        const conflict = await this.sessionRepo.findOne({
          where: {
            formateurId: dto.formateurId,
            date: dto.date ?? session.date,
            heureDebut: LessThan(dto.heureFin ?? session.heureFin),
            heureFin: MoreThan(dto.heureDebut ?? session.heureDebut),
            statut: Not(SessionStatut.ANNULE),
          },
        });
        if (conflict && conflict.id !== id)
          throw new BadRequestException(
            `Formateur déjà pris sur ce créneau (${conflict.heureDebut} – ${conflict.heureFin}).`,
          );
        session.formateur = formateur;
        session.formateurId = dto.formateurId;
      } else {
        session.formateur = null;
        session.formateurId = null;
      }
    }

    if (dto.apprenantIds) {
      session.apprenants = await this.apprenantRepo.find({
        where: { id: In(dto.apprenantIds) },
        relations: ['user'], // ✅
      });
    }

    if (dto.date) session.date = dto.date;
    if (dto.heureDebut) session.heureDebut = dto.heureDebut;
    if (dto.heureFin) session.heureFin = dto.heureFin;
    if (dto.lieu !== undefined) session.lieu = dto.lieu;
    if (dto.statut) session.statut = dto.statut;
    if (dto.prix !== undefined) session.prix = dto.prix;
    if (dto.capacite !== undefined) session.capacite = dto.capacite; // ✅
    if (dto.type) session.type = dto.type; // ✅ زيد هذا
    const saved = await this.sessionRepo.save(session);

    await this.updateFormationStatus(session.formationId);
    if (oldFormationId !== session.formationId) {
      await this.updateFormationStatus(oldFormationId);
    }

    return this.serializeSession(saved);
  }

  async cancel(id: string): Promise<{ success: boolean }> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException('Session introuvable.');

    session.statut = SessionStatut.ANNULE;
    await this.sessionRepo.save(session);

    await this.updateFormationStatus(session.formationId);

    return { success: true };
  }

  async getPresences(
    sessionId: string,
  ): Promise<{ apprenantId: number; estPresent: boolean }[]> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session introuvable.');
    const presences = await this.presenceRepo.find({ where: { sessionId } });
    return presences.map((p) => ({
      apprenantId: p.apprenantId,
      estPresent: p.estPresent,
    }));
  }

  async upsertPresences(
    sessionId: string,
    dto: MarquerPresenceDto[],
  ): Promise<{ success: boolean; total: number }> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session introuvable.');

    await this.dataSource.transaction(async (manager) => {
      for (const item of dto) {
        const existing = await manager.findOne(Presence, {
          where: { sessionId, apprenantId: item.apprenantId },
        });
        if (existing) {
          existing.estPresent = item.estPresent;
          await manager.save(Presence, existing);
        } else {
          const presence = manager.create(Presence, {
            sessionId,
            apprenantId: item.apprenantId,
            estPresent: item.estPresent,
          });
          await manager.save(Presence, presence);
        }
      }
    });

    return { success: true, total: dto.length };
  }

  // ❌ updateFormationRevenue محذوفة كاملاً

  private async updateFormationStatus(formationId: number): Promise<void> {
    const formation = await this.formationRepo.findOne({
      where: { id: formationId },
      relations: ['sessions'],
    });
    if (!formation) return;

    const sessionsActives = (formation.sessions ?? []).filter(
      (s) => s.statut !== SessionStatut.ANNULE,
    );

    const newStatut =
      sessionsActives.length > 0 &&
      sessionsActives.every((s) => s.statut === SessionStatut.TERMINE)
        ? 'completed'
        : 'active';

    // ✅ update مباشرة — بدون save
    await this.formationRepo.update(formationId, { statut: newStatut as any });
  }

  private serializeSession(s: Session) {
    const nbApprenants = s.apprenants?.length ?? 0;
    const prixEffectif =
      s.prix !== null && s.prix !== undefined
        ? Number(s.prix)
        : s.formation?.prix
          ? Number(s.formation.prix)
          : 0;

    // ✅ revenue يتحسب هنا فقط — موش يتخزن
    const revenue = prixEffectif * nbApprenants;

    return {
      id: s.id,
      date: s.date,
      heureDebut: s.heureDebut,
      heureFin: s.heureFin,
      lieu: s.lieu ?? null,
      statut: s.statut,
      type: s.type, // ✅
      capacite: s.capacite ?? null, // ✅
      prix: s.prix !== null && s.prix !== undefined ? Number(s.prix) : null,
      prixEffectif,
      revenue,
      formationId: s.formationId,
      formation: s.formation?.titre ?? '',
      formateurId: s.formateurId ?? null,
      formateur: s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}` : '',
      // ✅ nom/prenom من user
      apprenants: (s.apprenants ?? []).map((a) => ({
        id: a.id,
        nom: a.user?.nom ?? '',
        prenom: a.user?.prenom ?? '',
        email: a.user?.email ?? '',
      })),
    };
  }
}
