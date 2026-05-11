import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formateur } from './entities/formateur.entity';
import { Session } from '../sessions/entities/session.entity';
import { Performance } from '../performances/entities/performance.entity';
import { Satisfaction } from '../satisfaction/entities/satisfaction.entity';
import { CreateFormateurDto } from './dto/create-formateur.dto';
import { UpdateFormateurDto } from './dto/update-formateur.dto';

@Injectable()
export class FormateursService {
  constructor(
    @InjectRepository(Formateur)
    private readonly formateurRepository: Repository<Formateur>,

    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,

    @InjectRepository(Performance)
    private readonly performanceRepository: Repository<Performance>,

    @InjectRepository(Satisfaction)
    private readonly satisfactionRepository: Repository<Satisfaction>,
  ) {}

  // ── Existant — inchangé ───────────────────────────────────────────────────

  async findAll() {
    const formateurs = await this.formateurRepository.find({
      relations: ['sessions'],
    });

    return formateurs.map((f) => ({
      ...f,
      nbSessions: f.sessions?.length || 0,
    }));
  }

  create(dto: CreateFormateurDto) {
    const formateur = this.formateurRepository.create(dto);
    return this.formateurRepository.save(formateur);
  }

  async update(id: string | number, dto: UpdateFormateurDto) {
    const formateur = await this.formateurRepository.findOne({
      where: { id: Number(id) },
    });
    if (!formateur) throw new NotFoundException('Formateur non trouvé');
    Object.assign(formateur, dto);
    return this.formateurRepository.save(formateur);
  }

  async delete(id: string | number) {
    const result = await this.formateurRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('Formateur non trouvé');
    return { deleted: true };
  }

  // ── GET /responsable/formateurs/performances avec filtres ─────────────────

  async getPerformances(filters?: {
    periode?: string;
    formation?: string;
    formateur?: string;
    statut?: string;
  }) {
    // Commencer avec tous les formateurs
    let query = this.formateurRepository.createQueryBuilder('formateur');

    // Filtre par formateur (recherche par nom)
    if (filters?.formateur && filters.formateur !== 'Tous') {
      query = query.where(
        "(CONCAT(formateur.prenom, ' ', formateur.nom) LIKE :formateur)",
        { formateur: `%${filters.formateur}%` },
      );
    }

    const formateurs = await query.getMany();

    const results = await Promise.all(
      formateurs.map(async (f) => {
        // 1. Sessions de ce formateur avec filtres
        let sessionsQuery = this.sessionRepository
          .createQueryBuilder('session')
          .leftJoinAndSelect('session.apprenants', 'apprenant')
          .leftJoinAndSelect('session.formation', 'formation')
          .where('session.formateurId = :fid', { fid: f.id });

        // Filtrer par formation
        if (filters?.formation && filters.formation !== 'Tous') {
          sessionsQuery = sessionsQuery.andWhere(
            'formation.titre LIKE :formation',
            { formation: `%${filters.formation}%` },
          );
        }

        // Filtrer par période (date de session)
        if (filters?.periode && filters.periode !== 'Tous') {
          const now = new Date();
          let startDate: Date | null = null;
          let endDate: Date | null = null;

          if (filters.periode === 'Ce mois') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          } else {
            // Parsing "YYYY-MM" format
            const parts = filters.periode.split('-');
            if (parts.length >= 2) {
              const year = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10);
              if (!isNaN(year) && !isNaN(month)) {
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month, 0);
              }
            }
          }

          if (startDate && endDate && !isNaN(startDate.getTime())) {
            sessionsQuery = sessionsQuery.andWhere(
              'session.date BETWEEN :start AND :end',
              {
                start: startDate,
                end: endDate,
              },
            );
          }
        }

        const sessions = await sessionsQuery.getMany();
        const sessionsAnimees = sessions.length;

        // 2. Apprenants uniques
        const apprenantIds = new Set<number>();
        sessions.forEach((s) =>
          s.apprenants?.forEach((a) => apprenantIds.add(a.id)),
        );
        const totalApprenants = apprenantIds.size;

        // 3. Taux de réussite via Performance.estReussi
        let tauxReussite = 0;
        if (sessions.length > 0) {
          const sessionIds = sessions.map((s) => s.id);

          // Filtrer par statut si fourni
          let perfQuery = this.performanceRepository
            .createQueryBuilder('perf')
            .select('COUNT(*)', 'total')
            .addSelect(
              'SUM(CASE WHEN perf.estReussi = true THEN 1 ELSE 0 END)',
              'reussis',
            )
            .innerJoin('perf.session', 'session')
            .where('session.id IN (:...ids)', { ids: sessionIds });

          if (filters?.statut && filters.statut !== 'Tous') {
            if (filters.statut === 'Réussi') {
              perfQuery = perfQuery.andWhere('perf.estReussi = true');
            } else if (filters.statut === 'Échoué') {
              perfQuery = perfQuery.andWhere('perf.estReussi = false');
            }
          }

          const perfStats = await perfQuery.getRawOne<{
            total: string;
            reussis: string;
          }>();

          const total = parseInt(perfStats?.total ?? '0', 10);
          const reussis = parseInt(perfStats?.reussis ?? '0', 10);
          tauxReussite =
            total > 0 ? Math.round((reussis / total) * 100 * 10) / 10 : 0;
        }

        // 4. Satisfaction moyenne via Satisfaction.note (/5)
        let satisfaction = 0;
        const formationIds = [
          ...new Set(
            sessions
              .map((s) => s.formation?.id)
              .filter((id): id is number => id !== undefined),
          ),
        ];
        if (formationIds.length > 0) {
          const satStats = await this.satisfactionRepository
            .createQueryBuilder('sat')
            .select('AVG(sat.note)', 'moyenne')
            .innerJoin('sat.formation', 'formation')
            .where('formation.id IN (:...fids)', { fids: formationIds })
            .getRawOne<{ moyenne: string }>();

          const raw = parseFloat(satStats?.moyenne ?? '0');
          satisfaction = isNaN(raw) ? 0 : Math.round(raw * 10) / 10;
        }

        // 5. Score d'efficacité pondéré
        const activiteScore = Math.min((sessionsAnimees / 50) * 100, 100);
        const satisfactionScore = satisfaction * 20; // /5 → /100

        const scoreEfficacite =
          satisfaction > 0
            ? Math.round(
                tauxReussite * 0.5 +
                  satisfactionScore * 0.3 +
                  activiteScore * 0.2,
              )
            : Math.round(tauxReussite * 0.7 + activiteScore * 0.3);

        // 6. radarScores — normalisations métier centralisées ici
        const radarScores = {
          efficacite: scoreEfficacite,
          reussite: tauxReussite,
          satisfaction: satisfaction > 0 ? Math.round(satisfaction * 20) : null,
          activite: Math.round(Math.min((sessionsAnimees / 50) * 100, 100)),
          engagement: Math.round(Math.min((totalApprenants / 300) * 100, 100)),
        };

        return {
          id: f.id,
          nom: `${f.prenom} ${f.nom}`,
          specialite: f.specialite ?? 'Non renseignée',
          scoreEfficacite,
          tauxReussite,
          satisfaction,
          sessionsAnimees,
          totalApprenants,
          radarScores,
        };
      }),
    );

    results.sort((a, b) => b.scoreEfficacite - a.scoreEfficacite);
    return { formateurs: results };
  }
}
