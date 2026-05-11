import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formation, FormationStatus } from './entities/formation.entity';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
import { Session, SessionStatut } from '../sessions/entities/session.entity';

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
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    
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
      .where('(apprenant.userId = :userId OR apprenant.id = :userId)', { userId })
      query.distinct(true); //Si un apprenant est inscrit à deux sessions différentes (ex: un rattrapage et une session normale) pour la même formation, getManyAndCount pourrait parfois compter la formation deux fois selon la configuration. 
      // TypeORM gère généralement cela, mais si ya des doubleons on utilise cet ft
      

    // FILTRAGE : Si l'utilisateur veut voir seulement les cours 'active' ou 'completed'
    if (status) {
      query.andWhere('formation.statut = :status', { status });
    }
    // PAGINATION : On saute les pages précédentes et on prend la limite
    const [items, total] = await query
      .skip((pageNumber - 1) * formationPerPage) //9aadech bech yamel mn skip. exp(skip:1 w take:5 maneha bech ywarri juste el 5 ethenyn ) 
      .take(formationPerPage) //9adeh mn formation bech todhor fl page 
      .getManyAndCount();
      

    const formattedData = items.map(formation => {
      return{
      id: formation.id,
      title: formation.titre,
      description: formation.description,
      statut: formation.statut,
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
  // 1. On charge la formation avec ses relations
  const formation = await this.formationRepo.findOne({
    where: { id: Number(id) },
    relations: { sessions: { formateur: true, apprenants: true } },
  });

  if (!formation) throw new BadRequestException(`Formation introuvable`);

  console.log("--- VÉRIFICATION INSCRIPTION ---");
  console.log("Recherche pour userId (JWT):", userId);

  // 2. On vérifie l'inscription avec une conversion forcée en Number
  let isEnrolled = false;

  if (formation.sessions) {
    for (const session of formation.sessions) {
      // LOG de debug pour voir si les apprenants sont bien chargés
      console.log(`Session ${session.id} : ${session.apprenants?.length || 0} apprenants chargés.`);
      
      if (session.apprenants) {
        const found = session.apprenants.find(a => Number(a.userId) === Number(userId));
        if (found) {
          console.log(`Utilisateur trouvé dans la session ${session.id} (Apprenant ID: ${found.id})`);
          isEnrolled = true;
          break;
        }
      }
    }
  }

  if (!isEnrolled) {
    // On affiche plus de détails dans l'erreur pour comprendre pendant le test
    throw new BadRequestException(`Accès refusé: l'utilisateur ${userId} n'est inscrit à aucune session de cette formation`);
  }

  // 3. Retour des données
  return {
    id: formation.id,
    title: formation.titre,
    description: formation.description,
    categorie: formation.categorie,
    statut: formation.statut,
    createdAt: formation.createdAt,
    sessions: formation.sessions.map(session => ({
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
public async findAllAvailableFormations() {
  const formations = await this.formationRepo.find({
    where: { statut: FormationStatus.ACTIVE },
    select: ['id', 'titre', 'description', 'dureeHeures'],
  });

  // ✅ On mappe pour que le frontend reçoive les bons noms
  return formations.map(f => ({
    id: f.id,
    title: f.titre, // titre -> title
    description: f.description,
    duration: `${f.dureeHeures}h`, // dureeHeures -> duration
    instructor: "Centre de formation" // Optionnel
  }));
}

//hedhi tekhdem zeda
   // pour afficher les sessions disponibles d'une formation (celles qui ne sont pas complètes et auxquelles l'apprenant n'est pas encore inscrit)
  public async findAllAvailableSessions(formationId: number, userId: number) {
  // On part de sessionRepo pour avoir une liste de sessions propre
  const query = this.sessionRepo.createQueryBuilder('session')
    .where('session.formationId = :formationId', { formationId })
    .andWhere('session.statut = :statut', { statut: SessionStatut.ACTIF })

    // FILTRE 1 : L'utilisateur ne doit pas être déjà inscrit
    // On utilise NOT EXISTS pour exclure les sessions où l'utilisateur apparaît
    .andWhere((qb) => {
      const subQuery = qb
        .subQuery()
        .select('1')
        .from('session_apprenants', 'sa') // Vérifiez si c'est sessions_apprenants ou session_apprenants
        .innerJoin('apprenants', 'app', 'app.id = sa.apprenantId')
        .where('sa.sessionId = session.id')
        .andWhere('app.userId = :userId')
        .getQuery();
      return 'NOT EXISTS ' + subQuery;
    })

    // FILTRE 2 : La capacité ne doit pas être atteinte
    .andWhere((qb) => {
      const subQuery = qb
        .subQuery()
        .select('COUNT(sa2.apprenantId)')
        .from('session_apprenants', 'sa2')
        .where('sa2.sessionId = session.id')
        .getQuery();
      // Attention : Correction de "capacity" en "capacite" (nom de votre entité)
      return `(${subQuery}) < session.capacite`;
    })
    
    // On injecte le paramètre userId pour la sous-requête
    .setParameter('userId', userId)

    .select([
      'session.id',
      'session.title',
      'session.date',
      'session.capacite',
      'session.prix',
    ]);

  return await query.getMany();
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
