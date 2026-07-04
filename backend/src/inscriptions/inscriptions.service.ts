import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inscription, InscriptionStatut } from './entities/inscriptions.entity';
import { UsersService } from '../users/users.service';
import { User, UserRole, UserStatus } from '../users/users.entity';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Apprenant } from '../apprenants/entities/apprenant.entity';
import { MailService } from 'src/mail/mail.service';

type AcceptInscriptionResult = {
  message: string;
  userId: number;
};

@Injectable()
export class InscriptionsService {
  constructor(
    @InjectRepository(Inscription)
    private inscriptionsRepository: Repository<Inscription>,
    private usersService: UsersService,
    @InjectEntityManager()
    private entityManager: EntityManager,
    
  ) {}

  async create(data: Partial<Inscription>) {
    const inscription = this.inscriptionsRepository.create({
      ...data,
      statut: InscriptionStatut.NOT_VERIFIED,
      verifyToken: Math.random().toString(36).substring(2, 15),
    });
    return this.inscriptionsRepository.save(inscription);
  }

  async verify(token: string) {
    const inscription = await this.inscriptionsRepository.findOne({ where: { verifyToken: token } });
    if (!inscription) throw new NotFoundException('Token invalide');
    
    inscription.statut = InscriptionStatut.PENDING;
    inscription.verifyToken = null;
    return this.inscriptionsRepository.save(inscription);
  }

  async findAllPending() {
    const results = await this.inscriptionsRepository.find({
      where: { statut: InscriptionStatut.PENDING },
      order: { createdAt: 'DESC' },
    });

    return results.map(ins => ({
      id: ins.id,
      nom: ins.nom,
      prenom: ins.prenom,
      email: ins.email,
      telephone: ins.telephone,
      programme: ins.programme,
      dateInscription: ins.createdAt ? ins.createdAt.toISOString() : new Date().toISOString(),
      statut: ins.statut,
      formations: [], // Empty for pending inscriptions
    }));
  }

  async accept(id: number): Promise<AcceptInscriptionResult> {
    const inscription = await this.inscriptionsRepository.findOne({ where: { id } });
    if (!inscription) throw new NotFoundException('Inscription non trouvée');
    if (inscription.statut !== InscriptionStatut.PENDING) 
        throw new BadRequestException('L\'inscription doit être en attente pour être acceptée');

    return this.entityManager.transaction(async (tm) => {
      // 1. Créer le User
      const user = tm.create(User, {
        nom: inscription.nom,
        prenom: inscription.prenom,
        email: inscription.email,
        password: inscription.password,
        role: UserRole.APPRENANT,
        status: UserStatus.ACCEPTED,
        isActive: true,
        phone: inscription.telephone,
      });
      const savedUser = await tm.save(User, user);

      // 2. Créer l'Apprenant
      const apprenant = tm.create(Apprenant, {
        userId: savedUser.id,
        dateAccepted: new Date(),
        // programme: inscription.programme // Optionnel: tu peux ajouter un champ programme dans Apprenant
      });
      await tm.save(apprenant);

      // 3. Update Inscription
      inscription.statut = InscriptionStatut.ACCEPTED;
      await tm.save(inscription);

      return { message: 'Inscription acceptée avec succès', userId: savedUser.id };
    });

    
  }

  async approveAll(ids: number[]) {
    const results: AcceptInscriptionResult[] = [];
    for (const id of ids) {
      try {
        const res = await this.accept(id);
        results.push(res);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.error(`Failed to accept inscription ${id}:`, message);
      }
    }
    return { message: `${results.length} inscriptions acceptées`, count: results.length };
  }

  async reject(id: number) {
    const inscription = await this.inscriptionsRepository.findOne({ where: { id } });
    if (!inscription) throw new NotFoundException('Inscription non trouvée');
    
    inscription.statut = InscriptionStatut.REJECTED;
    return this.inscriptionsRepository.save(inscription);
  }
}
