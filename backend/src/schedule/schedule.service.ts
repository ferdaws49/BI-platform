import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Session, SessionType } from 'src/sessions/entities/session.entity';
import { FilterPeriod, FilterScheduleDto } from './dtos/schedule-filter.dto';
@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Session) private readonly sessionsRepo: Repository<Session>
  ) {}

  /** khdmet
   * 1. EMPLOI DU TEMPS COMPLET DE L'APPRENANT
   * Filtre par date (Semaine/Mois) si précisé
   */
  async getStudentSchedule(userId: number, filterDto: FilterScheduleDto) {
    const { period, date} = filterDto;
  const query = this.sessionsRepo.createQueryBuilder('session')
    .innerJoinAndSelect('session.formation', 'formation') 
    .innerJoin('session.apprenants', 'apprenant') // On joint pour filtrer
    .where('apprenant.userId = :userId', { userId }); // Filtre par l'utilisateur connecté

  // 2. Calcul des dates si un filtre est présent
  if (period && date) {
    const refDate = new Date(date);
    let start: Date| null = null;
    let end: Date| null = null;

    if (period === FilterPeriod.WEEK) {
      // Calcul du début de la semaine (Lundi)
      const day = refDate.getDay(); // 0 (Dim) à 6 (Sam)
      const diff = refDate.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(refDate.setDate(diff));
      
      // Fin de la semaine (Dimanche)
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } 
    else if (period === FilterPeriod.MONTH) {
      // 1er jour du mois
      start = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      // Dernier jour du mois
      end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
    }

   if (start && end) {
      const startDateStr = start.toISOString().split('T')[0];
      const endDateStr = end.toISOString().split('T')[0];

      query.andWhere('session.date BETWEEN :startDate AND :endDate', { 
        startDate: startDateStr, 
        endDate: endDateStr 
      });
    }
  }

  // 3. Exécution
  const sessions = await query
    .orderBy('session.date', 'ASC')
    .addOrderBy('session.heureDebut', 'ASC')
    .getMany();

  // 4. Mapping (Format attendu par le calendrier)
  return sessions.map(s => ({
    id: s.id,
    formationId: s.formationId,
    courseName: s.formation?.titre,
    sessionName: s.title || s.formation?.titre,
    date: s.date,
    start: s.heureDebut,
    end: s.heureFin,
    startISO: `${s.date}T${s.heureDebut}`,
    endISO: `${s.date}T${s.heureFin}`,
    room: s.lieu,
    type: s.type,
    status: s.statut,
    color: s.type === 'en_ligne' ? '#e5eadd' : '#f9f8f3'
  }));
}

  /**khdmet
   * 2. PLANNING SPÉCIFIQUE D'UNE FORMATION
   */
  async getScheduleByFormation(userId: number,formationId: number) {
    /** 
     * SÉCURITÉ : On vérifie d'abord si l'utilisateur est bien inscrit 
     * et VALIDÉ pour cette formation spécifique.
     */
    if (!formationId) {
      throw new BadRequestException('L’ID de la formation est requis.');
    }
    const query = this.sessionsRepo.createQueryBuilder('session')
      // On charge la formation DEPUIS la session
      .innerJoinAndSelect('session.formation', 'formation')
      .innerJoin('session.apprenants', 'apprenant')
      .innerJoin('apprenant.user', 'user')
      .where('formation.id = :formationId', { formationId })
      .andWhere('apprenant.userId = :userId', { userId })

    const sessions = await query.orderBy('session.date', 'ASC').getMany();


    // Si aucune session n'est trouvée (soit pas de séances, soit élève non inscrit)
    if (sessions.length === 0) {
      return [];
    }

    return sessions.map((s,index) => ({
      id: s.id,
      order: index + 1,
      formationTitle: s.formation?.titre || "Titre non trouvé en base",
      sessionName: s.title || `Séance ${index + 1}`, // Fallback si pas de titre de session
      date: s.date,   
      start: s.heureDebut,
      end: s.heureFin,
      // On crée un champ 'iso' pour les calendriers avancés(Gestion timezone)
      startISO: `${s.date}T${s.heureDebut}:00`,
    }));

    
  }
}