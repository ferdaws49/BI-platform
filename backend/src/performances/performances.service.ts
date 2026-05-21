import { Injectable, NotFoundException} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Performance } from "./entities/performance.entity";


@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(Performance) private readonly performanceRepository: Repository<Performance>
  ) {}

  /** shiha
   *  Vue Globale (Historique de toutes les formations)
   * Affiche une liste chronologique de TOUTES les notes reçues.
   */
  async getStudentGlobalResults(userId: number) {
  // 1. On cherche les performances en filtrant par apprenant.userId
  const performances = await this.performanceRepository
    .createQueryBuilder('performance')
    .innerJoin('performance.apprenant', 'apprenant') // On joint l'apprenant
    .leftJoinAndSelect('performance.session', 'session')
    .leftJoinAndSelect('session.formation', 'formation')
    .where('apprenant.userId = :userId', { userId }) // <--- CORRECTION ICI
    .getMany();

  if (performances.length === 0) {
    return { userId, overallAverage: 0, results: [], message: "Aucun résultat trouvé." };
  }

  const resultsByFormation = new Map();

  performances.forEach(p => {
    const formation = p.session?.formation;
    if (!formation) return; // Sécurité si pas de formation liée

    const formationId = formation.id;
    if (!resultsByFormation.has(formationId)) {
      resultsByFormation.set(formationId, {
        formationId,
        name: formation.titre,
        notes: [],
      });
    }
    resultsByFormation.get(formationId).notes.push(Number(p.note));
  });

  const results = Array.from(resultsByFormation.values()).map(f => {
    const sum = f.notes.reduce((a, b) => a + b, 0);
    const avg = f.notes.length > 0 ? sum / f.notes.length : 0; // Sécurité division

    return {
       id: f.formationId,       // ✅ On ajoute 'id' pour correspondre au design front
      formationId: f.formationId, 
      name: f.name,
      count: f.notes.length,
      average: Number(avg.toFixed(2)),
      isPassed: avg >= 10,
    };
  });

  // Calcul de la moyenne générale
  const totalAvgSum = results.reduce((a, b) => a + b.average, 0);
  const overallAverage = results.length > 0 ? totalAvgSum / results.length : 0;

  return {
    userId,
    overallAverage: Number(overallAverage.toFixed(2)),
    results,
  };
}


  /**tekhdem
   * Vue Spécifique (Détail d'une formation)
   * Affiche la moyenne globale et le détail note par note par session.
   */
  async getResultsByFormation(userId: number, formationId: number) {
    const performances = await this.performanceRepository.find({
    where: { apprenant: { userId: userId }, formation: { id: formationId } },
     relations: ['session', 'session.formation', 'apprenant'],
    order: { date: 'ASC' },
});

  if (!performances.length || performances.length === 0) {
    throw new NotFoundException("No results found");
  }

  const notes = performances.map(p => Number(p.note));

  const average =
    notes.reduce((a, b) => a + b, 0) / notes.length;

  return {
   
    formationId,
    formationTitle: performances[0].session?.formation?.titre || "Formation",
    average: Number(average.toFixed(2)),        
    isPassed: average >= 10,
    sessions: performances.map(p => ({
      sessionId: p.id,
      note: Number(p.note),
      date: p.date,
    })),
  };
  }

}