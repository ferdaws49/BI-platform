import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Apprenant } from './entities/apprenant.entity';

@Injectable()
export class ApprenantsService {
  constructor(
    @InjectRepository(Apprenant)
    private apprenantRepository: Repository<Apprenant>,
  ) {}

  async findAll() {
    // On récupère les apprenants avec les infos User associées
    const results = await this.apprenantRepository.find({
      relations: ['user', 'sessions', 'sessions.formation'],
    });

    // On formate pour le front-end
    return results.map((a) => ({
      id: a.id,
      nom: a.user?.nom || 'Inconnu',
      prenom: a.user?.prenom || '',
      email: a.user?.email || '',
      telephone: a.user?.phone || null,
      dateInscription: a.dateAccepted ? a.dateAccepted.toISOString() : new Date().toISOString(),
      statut: 'accepted',
      formations: (a.sessions || []).map((sa) => ({
        id: sa.formation?.id,
        titre: sa.formation?.titre,
      })),
    }));
  }

  async remove(id: number) {
    const apprenant = await this.apprenantRepository.findOne({ where: { id } });
    if (!apprenant) throw new NotFoundException('Apprenant non trouvé');
    return this.apprenantRepository.remove(apprenant);
  }
}
