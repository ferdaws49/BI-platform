import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ParticipateSessionDto } from "./dtos/participate-session.dto";
import { Session } from "src/sessions/entities/session.entity";
import { Apprenant } from "src/apprenants/entities/apprenant.entity";


@Injectable()
export class SessionApprenantService{
    constructor(
        @InjectRepository(Session) private readonly sessionsRepository: Repository<Session>,
        @InjectRepository(Apprenant) private readonly apprenantRepository: Repository<Apprenant>,
        
    
    ){}

    async getApprenantsForSelect() {
    const students = await this.apprenantRepository.find({
      relations: ['user'],
      select: {
        id: true,
        user: {
          nom: true,
          prenom: true,
        },
      },
    });

    return students.map((s) => ({
      id: s.id,
      nom: `${s.user?.nom || ''} ${s.user?.prenom || ''}`.trim(),
      initiales: (s.user?.nom?.[0] || '') + (s.user?.prenom?.[0] || ''),
    }));
  }

    /**hedi lezem nsallaha 
   *  Permettre à l'élève de s'inscrire à un nouveau programme
   * @param userID l'identifiant de l'apprenant
   * @param formationId l'identifiant de la formation 
   * @returns creation d'une inscription
   */

 async create(userId: number, dto: ParticipateSessionDto) {
  const { sessionId } = dto;

  // 1. Récupérer l'apprenant par son userId (FK)
  const apprenant = await this.apprenantRepository.findOne({
    where: { userId: Number(userId) },
  });

  if (!apprenant) {
    throw new NotFoundException("Apprenant introuvable");
  }

  // 🔍 DEBUG : confirme le type réel
  console.log('Apprenant trouvé :', apprenant);
  console.log('Type de apprenant.id :', typeof apprenant.id, apprenant.id);

  // 2. Vérifier la session
  const session = await this.sessionsRepository.findOne({
    where: { id: sessionId },
    relations: ['apprenants'],
  });

  if (!session) {
    throw new NotFoundException("Session introuvable");
  }

  // 3. Vérifier doublon
  const isAlreadyIn = (session.apprenants || []).find(
    (a) => Number(a.id) === Number(apprenant.id)
  );
  if (isAlreadyIn) {
    throw new BadRequestException("Déjà inscrit à cette session");
  }

  // 4. Vérifier capacité
  const count = session.apprenants?.length ?? 0;
  const capacite = session.capacite ?? 0;
  if (capacite > 0 && count >= capacite) {
    throw new BadRequestException('Session complète');
  }

  // ✅ FIX : Insertion manuelle contrôlée dans la table de jointure
  // session.id = UUID (string)  → colonne sessionId
  // apprenant.id = number       → colonne apprenantId
  await this.sessionsRepository.query(
    `INSERT INTO "sessions_apprenants"("sessionId", "apprenantId") VALUES ($1, $2)`,
    [session.id, apprenant.id]
  );


  return {
    message: "Inscription réussie",
    sessionId: session.id,
    sessionTitle: session.title,
  };
} 
  /**Khdmet
   * Objectif : Récupérer l'historique complet des inscriptions de l'apprenant connecté
   * @param userId l'identifiant de l'apprenant
   * @returns historique des inscriptions
   */
  public async getStudentHistory(userId: number) {
    const apprenant = await this.apprenantRepository.findOne({
      where: { userId: userId },
      relations: ['sessions', 'sessions.formation'], // On joint la formation pour voir le titre du cours
      //Sans cette ligne : Le serveur renverrait juste un numéro : formationId: 10. apprenant ne sait pas ce que c'est que le cours n°10.
      //Avec cette ligne : TypeORM va "chercher" automatiquement les détails dans la table formations
    });
    if (!apprenant) {
    throw new NotFoundException("Apprenant introuvable");
  }
  return  (apprenant.sessions || []).map(session => ({
    id: session.id,
    sessionTitle: session.title ||'session sans titre',
    //date: session.date,
    status: session.statut.toLowerCase(),
     registrationDate: session.createdAt,
    price: session.prix || session.formation?.prix,
    formation: {
      title: session.formation?.titre || 'Formation sans titre'
    },
  }));
  }

  //khedmet b nouveau structure
  // 3. ANNULER / SUPPRIMER (DELETE)
  public async cancel(sessionId: string, userId: number) {
  // 1. Trouver l'apprenant
  const apprenant = await this.apprenantRepository.findOne({ 
    where: { userId: userId } 
  });
  console.log("UserID extrait du JWT :", userId);

  if (!apprenant) {
    throw new NotFoundException("Profil apprenant non trouvé.");
  }

  // 2. On charge la session ET sa liste d'apprenants inscrits
  const session = await this.sessionsRepository.findOne({
    where: { id: sessionId },
    relations: ['apprenants'], // <--- OBLIGATOIRE pour pouvoir vérifier le contenu
  });

  if (!session) {
    throw new NotFoundException("Session introuvable.");
  }
  // --- LOGS DE DEBUGGING ---
  console.log("ID Apprenant recherché (depuis le profil):", apprenant.id);
  console.log("Nombre d'apprenants inscrits trouvés dans cette session:", session.apprenants.length);
  console.log("IDs des apprenants actuellement inscrits:", session.apprenants.map(a => a.id));
  // -------------------------


  // 3. On vérifie si l'ID de notre apprenant est présent dans la liste
  const inscriptionExiste = session.apprenants.some(
    (a) => Number(a.id) === Number(apprenant.id)
  );
   if (!inscriptionExiste) throw new NotFoundException("Vous n'êtes pas inscrit à cette session.");

   // 3. SUPPRESSION MANUELLE (Pour éviter l'erreur de type Integer)
  await this.sessionsRepository
    .createQueryBuilder()
    .delete()
    .from('sessions_apprenants') // <--- Utilisez le nom EXACT de la table SQL
    .where(' "sessionId" = :sessionId AND "apprenantId" = :apprenantId ', {
      sessionId: sessionId,
      apprenantId: apprenant.id,
    })
    .execute();

  return { message: "Désinscription réussie." };
}
}




    
