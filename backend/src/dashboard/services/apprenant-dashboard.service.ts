import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { Performance } from 'src/performances/entities/performance.entity';
import { Apprenant } from 'src/apprenants/entities/apprenant.entity';
import { Session, SessionStatut } from 'src/sessions/entities/session.entity';

@Injectable()
export class ApprennatDashboardService {
  constructor(
    @InjectRepository(Performance) private resRepo: Repository<Performance>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(Apprenant) private apprenantRepo: Repository<Apprenant>,
  ) {}

  async getStudentStats(userId: number) {

    const today = new Date().toISOString().split('T')[0];

      // Récupérer les inscriptions pour filtrer le reste
    const apprenant = await this.apprenantRepo.findOne({
      where: { userId },
      relations: {sessions: {formation: true, formateur: true}},
    });
    if (!apprenant) return null;
    const sessionApprenant = apprenant?.sessions || [];
    const sessionIds = sessionApprenant.map(s => s.id) || [];

    // 1. Stats rapides (Comptage direct)
    const totalEnrolled = sessionApprenant.length;
    const completedCourses = sessionApprenant.filter(s => s.statut === SessionStatut.TERMINE).length;

    // 2. Résultats récents + Calcul moyenne simple
    const results = await this.resRepo.find({
      where: { apprenant: {  id: apprenant.id  }},
      relations: ['session','session.formation'],
      order: { date: 'DESC' },
      take: 5,
    });
    // 2. Formater les notes avec le statut Passed/Failed
    const formattedRecentGrades = results.map(r => ({

      course: r.session?.formation?.titre,
      exam: r.session?.title,
      note: Number(r.note),
      date: r.date,
      status: Number(r.note) >= 10 ? 'Passed' : 'Failed'
  
  }));
    
    const avg = results.length ? results.reduce((acc, r) => acc + (r.note) * 20, 0) / results.length : 0;

    // 3. Prochaines sessions
    let upcomingSessions: any[] = [];
    if (sessionIds.length > 0) {
      const sessions = await this.sessionRepo.find({
        where: { id: In(sessionIds), date: MoreThanOrEqual(today) },
        relations: ['formation'],
        order: { date: 'ASC' },
        take: 3,
      });

      upcomingSessions = sessions.map(s => ({
        title: s.title || 'Session',
        courseTitle: s.formation?.titre || 'N/A',
        date: s.date,
      }));
    }
    

    // 4. Retour formaté
    return {
      stats: { totalEnrolled, upcomingSessions, average: avg.toFixed(2), upcomingCount: upcomingSessions.length  },
      upcomingSessions,
      recentGrades: formattedRecentGrades,
      
      myTrainings: sessionApprenant.slice(0, 3).map(s => ({ // Ajouté
        title: s.formation?.titre,
        teacher: s.formateur ? `${s.formateur.nom} ${s.formateur.prenom}`: 'Non assigné',
        status: s.statut
      })),
      myRegistrations: sessionApprenant.slice(0, 3).map(s => ({ // Ajouté
        title: s.formation?.titre,
        date: s.createdAt,
        
      })),

      
      chartData: {
        labels: results.map(r =>  r.session?.formation?.titre).reverse(),
        scores: results.map(r => Number(r.note)).reverse(),
      }
    };
  }
}