// satisfaction/satisfaction.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Satisfaction } from './entities/satisfaction.entity';
import { CreateSatisfactionDto } from './dtos/create-satisfaction.dto';
import { Apprenant } from 'src/apprenants/entities/apprenant.entity';
import { Formation } from 'src/formations/entities/formation.entity';

@Injectable()
export class SatisfactionService {
  constructor(
    @InjectRepository(Satisfaction)
    private satisfactionRepo: Repository<Satisfaction>,
    @InjectRepository(Apprenant)
    private apprenantRepo: Repository<Apprenant>,
    @InjectRepository(Formation)
    private formationRepo: Repository<Formation>,
  ) {}

  async rateFormation(userId: number, dto: CreateSatisfactionDto) {
    // 1. Trouver l'apprenant
    const apprenant = await this.apprenantRepo.findOne({ where: { userId } });
    if (!apprenant) throw new NotFoundException('Apprenant non trouvé');

    // 2. Vérifier si la formation existe et si l'apprenant y est inscrit
    // On réutilise une logique similaire à votre findFormation
    const formation = await this.formationRepo.findOne({
      where: { id: dto.formationId },
      relations: ['sessions', 'sessions.apprenants'],
    });

    if (!formation) throw new NotFoundException('Formation non trouvée');

    const isEnrolled = formation.sessions?.some(session =>
      session.apprenants?.some(a => a.id === apprenant.id)
    );

    if (!isEnrolled) {
      throw new BadRequestException("Vous ne pouvez pas noter une formation à laquelle vous n'êtes pas inscrit.");
    }

    // 3. Vérifier s'il a déjà noté (Update ou Create)
    let satisfaction = await this.satisfactionRepo.findOne({
      where: { 
        apprenant: { id: apprenant.id }, 
        formation: { id: dto.formationId } 
      }
    });

    if (satisfaction) {
      // Mise à jour si l'avis existe déjà
      satisfaction.note = dto.note;
      satisfaction.commentaire = dto.commentaire;
    } else {
      // Création d'un nouvel avis
      satisfaction = this.satisfactionRepo.create({
        apprenant,
        formation,
        note: dto.note,
        commentaire: dto.commentaire,
      });
    }

    return this.satisfactionRepo.save(satisfaction);
  }
}