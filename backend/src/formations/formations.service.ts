import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formation, FormationStatus } from './entities/formation.entity';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
import { Session, SessionStatut, SessionType } from '../sessions/entities/session.entity';
import { Apprenant } from 'src/apprenants/entities/apprenant.entity';
import { Satisfaction } from 'src/satisfaction/entities/satisfaction.entity';

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
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Apprenant)
    private readonly apprenantRepo: Repository<Apprenant>,
    @InjectRepository(Satisfaction)
    private readonly satisfactionRepo: Repository<Satisfaction>,
  ) {}

  private getPeriodInterval(periode?: string): { start: Date; end: Date } | null {
    if (!periode || periode === 'Tous') return null;
    const now   = new Date();
    const start = new Date();
    const end   = new Date();

    switch (periode) {
      case 'Ce mois':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'Trimestre':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'Semestre':
        start.setMonth(now.getMonth() - 6);
        break;
      case 'Année':
        start.setFullYear(now.getFullYear());
        start.setMonth(0, 1);
        break;
      default:
        return null;
    }
    return { start, end };
  }

  // ── GET /responsable/formations ───────────────────────────────────────────
  async findAll(filters?: any): Promise<FormationStats[]> {
    const { periode, formation: formationFilter, formateur: formateurFilter, type: typeFilter, statut: statutFilter } = filters || {};

    let formations = await this.formationRepo.find({
      relations: [
        'sessions',
        'sessions.apprenants',
        'sessions.formateur',
      ],
    });

    // 1. Filtrer les formations par titre ou statut
    if (formationFilter && formationFilter !== 'Tous') {
      formations = formations.filter(f => f.titre === formationFilter);
    }

    if (statutFilter && statutFilter !== 'Tous') {
      const dbStatut = statutFilter === 'Actif' ? 'active' : statutFilter === 'Terminé' ? 'completed' : statutFilter.toLowerCase();
      formations = formations.filter(f => f.statut === dbStatut);
    }

    // 2. Déterminer si des filtres sur les sessions sont actifs
    const interval = this.getPeriodInterval(periode);
    const hasActiveSessionFilter = (periode && periode !== 'Tous') || 
                                   (formateurFilter && formateurFilter !== 'Tous') || 
                                   (typeFilter && typeFilter !== 'Tous');

    const filteredFormations: Formation[] = [];
    const sessionsMap = new Map<number, any[]>();

    for (const f of formations) {
      let sessions = f.sessions ?? [];

      if (interval) {
        const startStr = interval.start.toISOString().split('T')[0];
        const endStr = interval.end.toISOString().split('T')[0];
        sessions = sessions.filter(s => s.date >= startStr && s.date <= endStr);
      }

      if (formateurFilter && formateurFilter !== 'Tous') {
        const nameToMatch = formateurFilter.toLowerCase().trim();
        sessions = sessions.filter(s => {
          const fullName = s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}`.toLowerCase().trim() : '';
          return fullName === nameToMatch;
        });
      }

      if (typeFilter && typeFilter !== 'Tous') {
        const mappedType = typeFilter === 'En ligne' ? 'en_ligne' : typeFilter === 'Présentiel' ? 'présentiel' : typeFilter.toLowerCase();
        sessions = sessions.filter(s => s.type === mappedType);
      }

      // Si un filtre de session est actif et qu'aucune session ne correspond, on exclut cette formation
      if (hasActiveSessionFilter && sessions.length === 0) {
        continue;
      }

      filteredFormations.push(f);
      sessionsMap.set(f.id, sessions);
    }

    const results = await Promise.all(
      filteredFormations.map(async (f) => {
        const satResult = await this.satisfactionRepo
          .createQueryBuilder('s')
          .select('AVG(s.note)', 'avg')
          .where('s.formationId = :fid', { fid: f.id })
          .getRawOne();
        const raw = parseFloat(satResult?.avg ?? '0');
        const satisfaction = isNaN(raw) ? 0 : Math.round(raw * 10) / 10;

        const fWithFilteredSessions = {
          ...f,
          sessions: sessionsMap.get(f.id) || [],
        };
        return this.computeStats(fWithFilteredSessions as any, satisfaction);
      })
    );
    
    return results;
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

//hedhi wallet tekhdem b structure jdida
  /**
    * Afficher la liste des formations de l'apprenant(espace apprenant)
    * @param userId id of user
    * @param pageNumber number of the current page
    * @param reviewPerPage data per page
    * @status filter formations
    * @returns collection of formations
    */
  async findStudentFormations(userId: number, pageNumber = 1, formationPerPage = 10, status?: FormationStatus) {
  const query = this.formationRepo.createQueryBuilder('formation')
    // On ne garne que les sessions non-annulées dès le join
    .innerJoin(
      'formation.sessions', 
      'session', 
      'session.statut != :annuleStatus'
    )
    .innerJoin('session.apprenants', 'apprenant')
    .leftJoinAndMapOne(
      'formation.mySatisfaction', 
      Satisfaction, 
      'satisfaction', 
      'satisfaction.formationId = formation.id AND satisfaction.apprenantId = apprenant.id'
    )
    .where('apprenant.userId = :userId', { userId })
    .setParameter('annuleStatus', SessionStatut.ANNULE) // 'Cancelled'
    .distinct(true);

  if (status) {
    query.andWhere('formation.statut = :status', { status });
  }

  const [items, total] = await query
    .leftJoinAndSelect('session.formateur', 'formateur')
    .skip((pageNumber - 1) * formationPerPage)
    .take(formationPerPage)
    .getManyAndCount();

  const formattedData = items.map(formation => {
    // Toutes les sessions ici sont non-annulées
    const firstSession = formation.sessions?.[0];
    const instructorName = firstSession?.formateur 
      ? `${firstSession.formateur.nom} ${firstSession.formateur.prenom}`
      : 'Centre de Formation';

    return {
      id: formation.id,
      title: formation.titre,
      userRating: (formation as any).mySatisfaction?.note || null,
      userComment: (formation as any).mySatisfaction?.commentaire || null,
      description: formation.description,
      instructor: instructorName,
      duration: `${formation.dureeHeures || 0}h`, 
      progress: formation.statut === 'completed' ? 100 : 35,
      createdAt: formation.createdAt,
    };
  });

  return {
    data: formattedData,
    meta: {
      totalItems: total,
      currentPage: Number(pageNumber),
      totalPages: Math.ceil(total / formationPerPage),
    },
  };
}

  /** hedhi wallet tekhdem
    * Récupérer les détails d'UNE formation précise(espace apprenant)
    * @param userId id of user
    * @param id  id of formation
    * @returns tout le contenu + dates
    */
 public async findFormation(id: number, userId: number) {
  const formation = await this.formationRepo.findOne({
    where: { id: Number(id) },
    relations: { sessions: { formateur: true, apprenants: true } },
  });

  if (!formation) throw new BadRequestException(`Formation introuvable`);

  // 1. Vérifier que l'apprenant est inscrit à au moins une session
  const isEnrolled = formation.sessions?.some(session =>
    session.apprenants?.some(a => Number(a.userId) === Number(userId))
  );

  if (!isEnrolled) {
    throw new BadRequestException(`Accès refusé: l'utilisateur ${userId} n'est inscrit à aucune session de cette formation`);
  }

  // 2. ✅ FILTRER : ne garder que les sessions où l'apprenant est inscrit
  const enrolledSessions = formation.sessions?.filter(session =>
    session.apprenants?.some(a => Number(a.userId) === Number(userId))
  ) || [];

  return {
    id: formation.id,
    title: formation.titre,
    description: formation.description,
    categorie: formation.categorie,
    statut: formation.statut,
    createdAt: formation.createdAt,
    sessions: enrolledSessions.map(session => ({
      id: session.id,
      title: session.title,
      date: session.date,
      formateur: session.formateur
        ? `${session.formateur.nom} ${session.formateur.prenom}`
        : null,
    })),
  };
}
//hedhi tekhdem zeda
public async findAllAvailableFormations(userId: number, page = 1, limit = 9) {
  const skip = (page - 1) * limit;
  const apprenant = await this.apprenantRepo.findOne({ where: { userId } });

  // ── Cas 1 : pas encore d'apprenant créé (nouveau compte) ──
  if (!apprenant) {
    const [formations, total] = await this.formationRepo.findAndCount({
      where: { statut: FormationStatus.ACTIVE },
      select: ['id', 'titre', 'description', 'dureeHeures', 'categorie'],
      skip,
      take: limit,
    });

    return {
      data: formations.map(f => ({
        id: f.id,
        title: f.titre,
        description: f.description,
        duration: `${f.dureeHeures}h`,
        categorie: f.categorie,
      })),
      meta: {
        totalItems: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Cas 2 : apprenant existe → formations avec sessions disponibles ──
  const query = this.formationRepo.createQueryBuilder('formation')
    .where('formation.statut = :statut', { statut: FormationStatus.ACTIVE })
    .andWhere(qb => {
      const subQuery = qb
        .subQuery()
        .select('1')
        .from(Session, 'session')
        .leftJoin(
          'sessions_apprenants',
          'sa',
          'sa."sessionId" = session.id AND sa."apprenantId" = :apprenantId',
        )
        .where('session.formationId = formation.id')
        .andWhere('session.statut = :sessionStatut')
        .andWhere('sa."apprenantId" IS NULL')
        .setParameter('apprenantId', apprenant.id)
        .setParameter('sessionStatut', SessionStatut.ACTIF)
        .getQuery();
      return `EXISTS ${subQuery}`;
    })
    .select([
      'formation.id',
      'formation.titre',
      'formation.description',
      'formation.dureeHeures',
      'formation.categorie',
    ])
    .skip(skip)
    .take(limit);

  const [formations, total] = await query.getManyAndCount();

  return {
    data: formations.map(f => ({
      id: f.id,
      title: f.titre,
      description: f.description,
      duration: `${f.dureeHeures}h`,
      categorie: f.categorie,
    })),
    meta: {
      totalItems: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    },
  };
}


//hedhi tekhdem zeda
   // pour afficher les sessions disponibles d'une formation (celles qui ne sont pas complètes et auxquelles l'apprenant n'est pas encore inscrit)
  public async findAllAvailableSessions(formationId: number, userId: number) {
  // 1. Charger l'apprenant
  const apprenant = await this.apprenantRepo.findOne({ where: { userId } });
  if (!apprenant) {
    console.log(' No apprenant found, returning all active sessions');
    const sessions = await this.sessionRepo.find({
      where: { 
        formationId,
        statut: SessionStatut.ACTIF 
      },
      select: ['id', 'title', 'date', 'capacite', 'prix'],
    });
    return sessions;
  }

  const query = this.sessionRepo.createQueryBuilder('session')
    .where('session.formationId = :formationId', { formationId })
    .andWhere('session.statut = :statut', { statut: SessionStatut.ACTIF })
    // Exclure les sessions où l'apprenant est déjà inscrit (via sa PK number)
    .andWhere(qb => {
      const subQuery = qb.subQuery()
        .select('1')
        .from('sessions_apprenants', 'sa')
        .where('sa."apprenantId" = :apprenantId')
        .andWhere('sa."sessionId" = session.id')
        .getQuery();
      return `NOT EXISTS ${subQuery}`;
    })
    .setParameter('apprenantId', apprenant.id)
    // Capacité non atteinte
    .andWhere((qb) => {
      const subQuery = qb
        .subQuery()
        .select('COUNT(sa2."apprenantId")')
        .from('sessions_apprenants', 'sa2')
        .where('sa2."sessionId" = session.id')
        .getQuery();
      return `(${subQuery}) < session.capacite`;
    });

  return query.getMany();
}

  // ─── Calcul des métriques depuis session_apprenants ──────────────────────
  // ─── Calcul des métriques ─────────────────────────────────────────────────
  private computeStats(f: Formation, satisfaction = 0): FormationStats {
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