import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formation } from './entities/formation.entity';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
import { SessionStatut } from '../sessions/entities/session.entity';

// ─── Shape renvoyée au frontend ────────────────────────────────────────────────

export interface FormationStats {
  id: number;
  nom: string; // frontend attend "nom" → mappé depuis "titre"
  nbInscrits: number;
  tauxSucces: number;
  tauxAbandon: number;
  tauxCompletion: number;
  satisfaction: number;
}

// ──────────────────────────────────────────────────────────────────────────────

@Injectable()
export class FormationsService {
  constructor(
    @InjectRepository(Formation)
    private readonly formationRepo: Repository<Formation>,
  ) {}

  // ── GET /responsable/formations ─────────────────────────────────────────────
  async findAll(): Promise<FormationStats[]> {
    const formations = await this.formationRepo.find({
      relations: [
        'sessions',
        'sessions.apprenants', // via table pivot session_apprenants
      ],
    });

    return formations.map((f) => this.computeStats(f));
  }

  // ── POST ────────────────────────────────────────────────────────────────────
  async create(dto: CreateFormationDto): Promise<Formation> {
    const formation = this.formationRepo.create(dto);
    return this.formationRepo.save(formation);
  }

  // ── PATCH /:id ──────────────────────────────────────────────────────────────
  async update(id: number, dto: UpdateFormationDto): Promise<Formation> {
    const formation = await this.formationRepo.findOne({ where: { id } });
    if (!formation) throw new NotFoundException(`Formation #${id} introuvable`);
    Object.assign(formation, dto);
    return this.formationRepo.save(formation);
  }

  // ── DELETE /:id ─────────────────────────────────────────────────────────────
  async delete(id: number): Promise<{ message: string }> {
    const formation = await this.formationRepo.findOne({ where: { id } });
    if (!formation) throw new NotFoundException(`Formation #${id} introuvable`);
    await this.formationRepo.remove(formation);
    return { message: `Formation #${id} supprimée` };
  }

  // ─── Calcul des métriques depuis session_apprenants ──────────────────────
  private computeStats(f: Formation): FormationStats {
    const sessions = f.sessions ?? [];

    // Nombre total d'apprenants uniques inscrits (toutes sessions confondues)
    const apprenantIds = new Set<number>();
    for (const session of sessions) {
      for (const apprenant of session.apprenants ?? []) {
        apprenantIds.add(apprenant.id);
      }
    }
    const nbInscrits = apprenantIds.size;

    // ── Taux de complétion : ratio sessions terminées / total ───────────────
    const nbSessionsTotal = sessions.length;
    const nbSessionsCompleted = sessions.filter(
      (s) => s.statut === SessionStatut.TERMINE,
    ).length;

    const tauxCompletion =
      nbSessionsTotal > 0
        ? Math.round((nbSessionsCompleted / nbSessionsTotal) * 1000) / 10
        : 0;

    // ── Taux de succès : sessions non annulées ───────────────────────────────
    const nbSessionsSucces = sessions.filter(
      (s) => s.statut !== SessionStatut.ANNULE,
    ).length;

    const tauxSucces =
      nbSessionsTotal > 0
        ? Math.round((nbSessionsSucces / nbSessionsTotal) * 1000) / 10
        : 0;

    // ── Taux d'abandon : sessions annulées ──────────────────────────────────
    const nbSessionsAbandon = sessions.filter(
      (s) => s.statut === SessionStatut.ANNULE,
    ).length;

    const tauxAbandon =
      nbSessionsTotal > 0
        ? Math.round((nbSessionsAbandon / nbSessionsTotal) * 1000) / 10
        : 0;

    // ── Satisfaction : champ sur la session si disponible, sinon 0 ──────────
    // Si tu ajoutes un champ `satisfaction: number` sur Session → il sera pris
    const notes = sessions
      .map((s) => (s as any).satisfaction)
      .filter((n): n is number => typeof n === 'number' && !isNaN(n));

    const satisfaction =
      notes.length > 0
        ? Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 10) /
          10
        : 0;

    return {
      id: f.id,
      nom: f.titre, // mappe "titre" → "nom" attendu par le frontend
      nbInscrits,
      tauxSucces,
      tauxAbandon,
      tauxCompletion,
      satisfaction,
    };
  }
}
