import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formation } from './entities/formation.entity';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
import { SessionStatut } from '../sessions/entities/session.entity';

// ─── Shape renvoyée au frontend ───────────────────────────────────────────────
export interface FormationStats {
  id: number;
  nom: string;       // ← alias de titre pour le frontend
  titre: string;
  categorie: string | null;
  description: string | null;
  dureeHeures: number | null;
  prix: number;
  statut: 'active' | 'completed';
  nbSessions: number;
  nbInscrits: number;
  tauxSucces: number;
  tauxAbandon: number;
  tauxCompletion: number;
  satisfaction: number;
}

@Injectable()
export class FormationsService {
  constructor(
    @InjectRepository(Formation)
    private readonly formationRepo: Repository<Formation>,
  ) {}

  // ── GET /responsable/formations ───────────────────────────────────────────
  async findAll(filters?: any): Promise<FormationStats[]> {
    const formations = await this.formationRepo.find({
      relations: [
        'sessions',
        'sessions.apprenants',
      ],
    });
    
    // TODO: Appliquer les filtres ici si nécessaire
    
    return formations.map((f) => this.computeStats(f));
  }

  // ── POST ──────────────────────────────────────────────────────────────────
  async create(dto: CreateFormationDto): Promise<Formation> {
    const formation = this.formationRepo.create(dto);
    return this.formationRepo.save(formation);
  }

  // ── PATCH /:id ────────────────────────────────────────────────────────────
  async update(id: number, dto: UpdateFormationDto): Promise<Formation> {
    const formation = await this.formationRepo.findOne({ where: { id } });
    if (!formation) throw new NotFoundException(`Formation #${id} introuvable`);
    Object.assign(formation, dto);
    return this.formationRepo.save(formation);
  }

  // ── DELETE /:id ───────────────────────────────────────────────────────────
  async delete(id: number): Promise<{ message: string }> {
    const formation = await this.formationRepo.findOne({ where: { id } });
    if (!formation) throw new NotFoundException(`Formation #${id} introuvable`);
    await this.formationRepo.remove(formation);
    return { message: `Formation #${id} supprimée` };
  }

  // ─── Calcul des métriques ─────────────────────────────────────────────────
  private computeStats(f: Formation): FormationStats {
    const sessions = f.sessions ?? [];
    const nbSessionsTotal = sessions.length;

    // ── Apprenants uniques toutes sessions confondues ─────────────────────
    const apprenantIds = new Set<number>();
    for (const session of sessions) {
      for (const apprenant of session.apprenants ?? []) {
        apprenantIds.add(apprenant.id);
      }
    }

    // ── Durée totale calculée depuis heureDebut/heureFin des sessions ─────
    // Sessions annulées exclues du calcul
    const dureeHeures = sessions
      .filter((s) => s.statut !== SessionStatut.ANNULE)
      .reduce((total, s) => {
        if (!s.heureDebut || !s.heureFin) return total;
        const [hD, mD] = s.heureDebut.split(':').map(Number);
        const [hF, mF] = s.heureFin.split(':').map(Number);
        const diffMinutes = (hF * 60 + mF) - (hD * 60 + mD);
        return total + (diffMinutes > 0 ? diffMinutes / 60 : 0);
      }, 0);

    const nbSessionsCompleted = sessions.filter(
      (s) => s.statut === SessionStatut.TERMINE,
    ).length;

    const nbSessionsSucces = sessions.filter(
      (s) => s.statut !== SessionStatut.ANNULE,
    ).length;

    const nbSessionsAbandon = sessions.filter(
      (s) => s.statut === SessionStatut.ANNULE,
    ).length;

    const tauxCompletion =
      nbSessionsTotal > 0
        ? Math.round((nbSessionsCompleted / nbSessionsTotal) * 1000) / 10
        : 0;

    const tauxSucces =
      nbSessionsTotal > 0
        ? Math.round((nbSessionsSucces / nbSessionsTotal) * 1000) / 10
        : 0;

    const tauxAbandon =
      nbSessionsTotal > 0
        ? Math.round((nbSessionsAbandon / nbSessionsTotal) * 1000) / 10
        : 0;

    const notes = sessions
      .map((s) => (s as any).satisfaction)
      .filter((n): n is number => typeof n === 'number' && !isNaN(n));

    const satisfaction =
      notes.length > 0
        ? Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 10) / 10
        : 0;

    return {
      // ── Champs entity Formation ──────────────────────────────────────────
      id: f.id,
      nom: f.titre,
      titre:       f.titre,
      categorie:   f.categorie   ?? null,
      description: f.description ?? null,
      prix:        Number(f.prix),
      statut:      f.statut,
      // ── Champs calculés depuis les sessions ──────────────────────────────
      dureeHeures,          // ← calculé depuis heureDebut/heureFin (sessions non annulées)
      nbSessions:   nbSessionsTotal,
      nbInscrits:   apprenantIds.size,
      tauxSucces,
      tauxAbandon,
      tauxCompletion,
      satisfaction,
    };
  }
}