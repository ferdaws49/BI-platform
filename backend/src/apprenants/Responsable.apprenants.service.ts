import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Apprenant } from './entities/apprenant.entity';
import { Performance } from '../performances/entities/performance.entity';
import { Presence } from '../sessions/entities/presence.entity';
import { SessionStatut } from '../sessions/entities/session.entity';
import { QualityFilterDto } from '../quality/dto/Quality.dto';



@Injectable()
export class ResponsableApprenantsService {
  constructor(
    @InjectRepository(Apprenant)
    private apprenantRepo: Repository<Apprenant>,

    @InjectRepository(Performance)
    private performanceRepo: Repository<Performance>,

    @InjectRepository(Presence)
    private presenceRepo: Repository<Presence>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Point d'entrée principal — appelé par GET /responsable/apprenants
  // ─────────────────────────────────────────────────────────────────────────
  async getApprenantsData(filters: QualityFilterDto) {
    const students = await this.getStudentsList(filters);
    const [studentStatus, scoreEvolution, formationSuccess] =
      await Promise.all([
        this.calculateStatusDistribution(students),
        this.getScoreEvolution(filters),
        this.getFormationSuccess(filters),
      ]);

    return { students, studentStatus, scoreEvolution, formationSuccess };
  }


  // ─────────────────────────────────────────────────────────────────────────
  // 1. Liste des apprenants pour StudentsTable
  //    Retourne : id, nom, formation, statut, scoreMoyen, tauxCompletion
  //
  //    scoreMoyen   = AVG(performance.note) × 5   (note /20 → /100)
  //    tauxCompletion = présences marquées "présent" / total présences × 100
  //    statut       = déduit du statut des sessions de l'apprenant
  //    formation    = titre de la formation de la première session active
  // ─────────────────────────────────────────────────────────────────────────
  private async getStudentsList(filters: QualityFilterDto) {
    // On charge tous les apprenants avec leurs relations
    const apprenants = await this.apprenantRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'u')
      .leftJoinAndSelect('a.sessions', 's')
      .leftJoinAndSelect('s.formation', 'f')
      // Filtres optionnels
      .andWhere(
        filters.formation
          ? 'f.titre ILIKE :formation'
          : '1=1',
        filters.formation ? { formation: `%${filters.formation}%` } : {},
      )
      .andWhere(
        filters.formateur
          ? 'EXISTS (SELECT 1 FROM formateurs fmt WHERE fmt.id = s."formateurId" AND CONCAT(fmt.nom, \' \', fmt.prenom) ILIKE :formateur)'
          : '1=1',
        filters.formateur ? { formateur: `%${filters.formateur}%` } : {},
      )
      .getMany();

    // Pour chaque apprenant, on calcule scoreMoyen et tauxCompletion
    // On fait un seul appel groupé pour toutes les performances et présences
    const apprenantIds = apprenants.map((a) => a.id);

    if (apprenantIds.length === 0) return [];

    // Scores par apprenant (AVG note, groupé)
    const scores: { apprenantId: number; avgNote: string }[] =
      await this.performanceRepo
        .createQueryBuilder('p')
        .select('p.apprenantId', 'apprenantId')
        .addSelect('AVG(p.note)', 'avgNote')
        .where('p.apprenantId IN (:...ids)', { ids: apprenantIds })
        .groupBy('p.apprenantId')
        .getRawMany();

    const scoreMap = new Map(
      scores.map((s) => [s.apprenantId, parseFloat(s.avgNote)]),
    );

    // Présences par apprenant : total et présents
    const presences: {
      apprenantId: number;
      total: string;
      presents: string;
    }[] = await this.presenceRepo
      .createQueryBuilder('pr')
      .select('pr.apprenantId', 'apprenantId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN pr.estPresent = true THEN 1 ELSE 0 END)',
        'presents',
      )
      .where('pr.apprenantId IN (:...ids)', { ids: apprenantIds })
      .groupBy('pr.apprenantId')
      .getRawMany();

    const presenceMap = new Map(
      presences.map((p) => [
        p.apprenantId,
        { total: parseInt(p.total), presents: parseInt(p.presents) },
      ]),
    );

    return apprenants.map((a) => {
      // Statut : on prend le statut de session le plus "actif"
      const sessionStatuts = (a.sessions || []).map((s) => s.statut);
      let statut: 'Actif' | 'Terminé' | 'Annulé' = 'Annulé';
      if (sessionStatuts.includes(SessionStatut.ACTIF)) statut = 'Actif';
      else if (sessionStatuts.includes(SessionStatut.TERMINE)) statut = 'Terminé';

      // Formation : titre de la première session active, sinon première session
      const activeSession =
        (a.sessions || []).find((s) => s.statut === SessionStatut.ACTIF) ||

        (a.sessions || [])[0];
      const formation = activeSession?.formation?.titre || 'Non assigné';

      // Score moyen /100

      const rawNote = scoreMap.get(a.id);
      // note /20 × 5 = /100. Si pas de note → 0
      const scoreMoyen = rawNote != null ? Math.round(rawNote * 5) : 0;

      // Taux de complétion
      const pres = presenceMap.get(a.id);
      const tauxCompletion =
        pres && pres.total > 0
          ? Math.round((pres.presents / pres.total) * 100)
          : 0;

      return {
        id: String(a.id),
        nom: `${a.user?.prenom || ''} ${a.user?.nom || ''}`.trim() || 'Inconnu',
        formation,
        statut,
        scoreMoyen,
        tauxCompletion,
        email: a.user?.email,
        profileImage: a.user?.profileImage || null,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Distribution par statut pour le Pie chart
  //    { status: 'Actif' | 'Terminé' | 'Annulé', count: number }[]
  //
  //    Le statut d'un apprenant = statut de sa session la plus récente
  //    On simplifie : si au moins une session Actif → Actif
  // ─────────────────────────────────────────────────────────────────────────
  private calculateStatusDistribution(students: any[]) {
    const counts = { Actif: 0, Terminé: 0, Annulé: 0 };

    students.forEach((s) => {
      if (counts.hasOwnProperty(s.statut)) {
        counts[s.statut]++;
      }
    });

    return [
      { status: 'Actif', count: counts.Actif },
      { status: 'Terminé', count: counts.Terminé },
      { status: 'Annulé', count: counts.Annulé },
    ];
  }



  // ─────────────────────────────────────────────────────────────────────────
  // 3. Évolution des scores sur 6 semaines pour le Line chart
  //    { date: 'Sem 1', score: number }[]
  //
  //    On prend les 6 dernières semaines et on calcule AVG(note × 5) par semaine
  // ─────────────────────────────────────────────────────────────────────────
  private async getScoreEvolution(filters: QualityFilterDto) {
    const raw: { semaine: string; avgNote: string }[] =
      await this.performanceRepo
        .createQueryBuilder('p')
        .leftJoin('p.formation', 'f')
        .select(
          `TO_CHAR(DATE_TRUNC('week', p.date), 'DD/MM')`,
          'semaine',
        )
        .addSelect('AVG(p.note)', 'avgNote')
        .where(`p.date >= NOW() - INTERVAL '6 weeks'`)
        .andWhere(
          filters.formation ? 'f.titre ILIKE :formation' : '1=1',
          filters.formation ? { formation: `%${filters.formation}%` } : {},
        )
        .groupBy(`DATE_TRUNC('week', p.date)`)
        .orderBy(`DATE_TRUNC('week', p.date)`, 'ASC')
        .limit(6)
        .getRawMany();

    // Si pas assez de données, on complète avec des labels génériques
    if (raw.length === 0) {
      return Array.from({ length: 6 }, (_, i) => ({
        date: `Sem ${i + 1}`,
        score: 0,
      }));
    }

    return raw.map((r, i) => ({
      date: r.semaine || `Sem ${i + 1}`,
      score: Math.round(parseFloat(r.avgNote) * 5), // /20 → /100
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Taux de réussite par formation pour le Bar chart
  //    { formation: string, tauxReussite: number }[]
  //
  //    tauxReussite = COUNT(estReussi=true) / COUNT(*) × 100 groupé par formation
  // ─────────────────────────────────────────────────────────────────────────
  private async getFormationSuccess(filters: QualityFilterDto) {
    const raw: {
      formation: string;
      total: string;
      reussis: string;
    }[] = await this.performanceRepo
      .createQueryBuilder('p')
      .leftJoin('p.formation', 'f')
      .select('f.titre', 'formation')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN p.estReussi = true THEN 1 ELSE 0 END)',
        'reussis',
      )
      .andWhere(
        filters.formation ? 'f.titre ILIKE :formation' : '1=1',
        filters.formation ? { formation: `%${filters.formation}%` } : {},
      )
      .groupBy('f.titre')
      .orderBy('f.titre', 'ASC')
      .getRawMany();

    return raw.map((r) => ({
      formation: r.formation || 'Inconnue',
      tauxReussite:
        parseInt(r.total) > 0
          ? Math.round((parseInt(r.reussis) / parseInt(r.total)) * 100)
          : 0,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Apprenants à risque
  //    score < 50 OU taux de complétion < 40%
  // ─────────────────────────────────────────────────────────────────────────
  async getApprenantsARisque(filters: QualityFilterDto) {
    const allStudents = await this.getStudentsList(filters);
    return allStudents.filter(
      (s) => s.scoreMoyen < 50 || s.tauxCompletion < 40,
    );
  }
}