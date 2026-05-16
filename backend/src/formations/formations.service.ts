import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formation, FormationStatus } from './entities/formation.entity';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
import { Session, SessionStatut } from '../sessions/entities/session.entity';
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
      // On joint la table inscriptions pour vérifier que l'utilisateur y est
      .innerJoin('formation.sessions', 'session')
      .innerJoin('session.apprenants', 'apprenant')
      .leftJoinAndMapOne(
        'formation.mySatisfaction', 
        Satisfaction, 
        'satisfaction', 
        'satisfaction.formationId = formation.id AND satisfaction.apprenantId = apprenant.id'
    )
      .where('apprenant.userId = :userId', { userId })
      .distinct(true); //Si un apprenant est inscrit à deux sessions différentes (ex: un rattrapage et une session normale) pour la même formation, getManyAndCount pourrait parfois compter la formation deux fois selon la configuration. 
      // TypeORM gère généralement cela, mais si ya des doubleons on utilise cet ft
      

    // FILTRAGE : Si l'utilisateur veut voir seulement les cours 'active' ou 'completed'
    if (status) {
      query.andWhere('formation.statut = :status', { status });
    }
    // PAGINATION : On saute les pages précédentes et on prend la limite
    const [items, total] = await query
    .leftJoinAndSelect('session.formateur', 'formateur')
      .skip((pageNumber - 1) * formationPerPage) //9aadech bech yamel mn skip. exp(skip:1 w take:5 maneha bech ywarri juste el 5 ethenyn ) 
      .take(formationPerPage) //9adeh mn formation bech todhor fl page 
      .getManyAndCount();
      

    const formattedData = items.map(formation => {
      const firstSession = formation.sessions?.[0];
  const instructorName = firstSession?.formateur 
    ? `${firstSession.formateur.nom} ${firstSession.formateur.prenom}`
    : 'Centre de Formation';
      return{
      id: formation.id,
      title: formation.titre,
      userRating: (formation as any).mySatisfaction?.note || null, // On ajoute la note ici
      userComment: (formation as any).mySatisfaction?.commentaire || null,
      description: formation.description,
      instructor: instructorName,
      duration: `${formation.dureeHeures || 0}h`, 
      progress: formation.statut === 'completed' ? 100 : 35, // Simulé ou calculé
      createdAt: formation.createdAt,
      }
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
public async findAllAvailableFormations(userId: number) {
  // 1. Charger l'apprenant une fois pour toutes
  const apprenant = await this.apprenantRepo.findOne({ where: { userId } });
   if (!apprenant) {
    // Retourner TOUTES les formations actives (nouveau compte = aucune inscription possible)
    const formations = await this.formationRepo.find({
      where: { statut: FormationStatus.ACTIVE },
      select: ['id', 'titre', 'description', 'dureeHeures'],
    });
    
    return formations.map(f => ({
      id: f.id,
      title: f.titre,
      description: f.description,
      duration: `${f.dureeHeures}h`,
      instructor: "Centre de formation"
    }));
  }

  const formations = await this.formationRepo
    .createQueryBuilder('formation')
    .where('formation.statut = :statut', { statut: FormationStatus.ACTIVE })
    .andWhere(qb => {
      const subQuery = qb
        .subQuery()
        .select('1')
        .from(Session, 'session')
        .leftJoin(
          'sessions_apprenants',
          'sa',
          'sa."sessionId" = session.id AND sa."apprenantId" = :apprenantId'
        )
        .where('session.formationId = formation.id')
        .andWhere('session.statut = :sessionStatut')
        .andWhere('sa."apprenantId" IS NULL')
        .setParameter('apprenantId', apprenant.id)
        .setParameter('sessionStatut', SessionStatut.ACTIF)
        .getQuery();
      return `EXISTS ${subQuery}`;
    })
    .select(['formation.id', 'formation.titre', 'formation.description', 'formation.dureeHeures'])
    .getMany();

  return formations.map(f => ({
    id: f.id,
    title: f.titre,
    description: f.description,
    duration: `${f.dureeHeures}h`,
    instructor: "Centre de formation"
  }));
}


//hedhi tekhdem zeda
   // pour afficher les sessions disponibles d'une formation (celles qui ne sont pas complètes et auxquelles l'apprenant n'est pas encore inscrit)
  public async findAllAvailableSessions(formationId: number, userId: number) {
  // 1. Charger l'apprenant
  const apprenant = await this.apprenantRepo.findOne({ where: { userId } });
  if (!apprenant) {
    console.log('ℹ️ No apprenant found, returning all active sessions');
    const sessions = await this.sessionRepo.find({
      where: { 
        formationId,
        statut: SessionStatut.ACTIF 
      },
      select: ['id', 'title', 'date', 'capacite'],
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