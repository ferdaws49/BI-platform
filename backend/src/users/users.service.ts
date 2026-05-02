import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from './users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MailService } from 'src/mail/mail.service';

// Mapping frontend label → enum BDD
const ROLE_MAP: Record<string, UserRole> = {
  'Admin':              UserRole.ADMIN,
  'Directeur':          UserRole.DIRECTEUR,
  'Resp. Pédagogique':  UserRole.RESP_PEDAGOGIQUE,
};

// Mapping enum BDD → frontend label
const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.ADMIN]:           'Admin',
  [UserRole.DIRECTEUR]:       'Directeur',
  [UserRole.RESP_PEDAGOGIQUE]: 'Resp. Pédagogique',
  [UserRole.APPRENANT]:       'Apprenant',
};

@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private mailService: MailService,
  ) {}

  // ─── Déjà existant (auth) ──────────────────────────────────────────────
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // ─── Sérialiser un User pour le frontend ──────────────────────────────
  // Transforme l'enum role en label lisible + formate createdAt + cache password
  private serialize(user: User) {
    return {
      id:       user.id,
      nom:      user.nom,
      prenom:   user.prenom,
      email:    user.email,
      role:     ROLE_LABEL[user.role] ?? user.role,
      isActive: user.isActive,
      creeLe:   user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
        : '—',
    };
  }

  // ─── GET /admin/users ──────────────────────────────────────────────────
  async findAll() {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => this.serialize(u));
  }

  // ─── GET /admin/users/:id ──────────────────────────────────────────────
  async findOne(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Utilisateur #${id} introuvable`);
    return this.serialize(user);
  }

  // ─── POST /admin/users ─────────────────────────────────────────────────
  async create(dto: CreateUserDto) {
    // Vérifier email unique
    const existing = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const cleanPassword = dto.password.trim();
    const hashed = await bcrypt.hash(cleanPassword, 10);
    const user = this.usersRepository.create({
      nom:     dto.nom,
      prenom:  dto.prenom,
      email:   dto.email,
      password: hashed,
      role:     ROLE_MAP[dto.role as string] ?? dto.role,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.usersRepository.save(user);
    return this.serialize(saved);
  }

  // ─── PATCH /admin/users/:id ────────────────────────────────────────────
  async update(id: number, dto: UpdateUserDto) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Utilisateur #${id} introuvable`);

    if (dto.nom)      user.nom      = dto.nom;
    if (dto.email)    user.email    = dto.email;
    if (dto.role)     user.role     = ROLE_MAP[dto.role as string] ?? dto.role as unknown as UserRole;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    const saved = await this.usersRepository.save(user);
    return this.serialize(saved);
  }

  // ─── PATCH /admin/users/:id/toggle-active ─────────────────────────────
  async toggleActive(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Utilisateur #${id} introuvable`);

    user.isActive = !user.isActive;
    const saved = await this.usersRepository.save(user);
    return this.serialize(saved);
  }

  // ─── DELETE /admin/users/:id ───────────────────────────────────────────
  async remove(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Utilisateur #${id} introuvable`);

    await this.usersRepository.remove(user);
    return { message: `Utilisateur #${id} supprimé` };
  }

  // ─── POST /admin/users/:id/reset-password ─────────────────────────────
    // ─── POST /admin/users/:id/reset-password ─────────────────
  // Étape 1 : l'admin demande le reset → génère token + envoie email
  async requestResetPassword(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Utilisateur #${id} introuvable`);
 
    // 1. Générer un token UUID unique
    const token = uuidv4();
 
    // 2. Expiration dans 1 heure
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
 
    // 3. Sauvegarder token + expiry en BD
    user.resetToken       = token;
    user.resetTokenExpiry = expiry;
    await this.usersRepository.save(user);
 
    // 4. Envoyer l'email avec le lien contenant le token
    await this.mailService.sendResetPasswordEmail(
      user.email,
      user.prenom ?? user.nom,
      token,
    );
 
    return { message: `Email de réinitialisation envoyé à ${user.email}` };
  }
 
  // ─── POST /auth/reset-password ────────────────────────────
  // Étape 2 : l'utilisateur soumet son nouveau mot de passe via le lien
  async resetPassword(token: string, newPassword: string) {
    // 1. Trouver l'user par token
    const user = await this.usersRepository.findOne({
      where: { resetToken: token },
    });
 
    if (!user) {
      throw new BadRequestException('Token invalide ou déjà utilisé');
    }
 
    // 2. Vérifier que le token n'est pas expiré
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Ce lien a expiré. Demandez un nouveau lien.');
    }
 
    // 3. Valider le mot de passe (min 6 caractères)
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 6 caractères');
    }
 
    // 4. Hacher le nouveau mot de passe avec bcrypt
    user.password = await bcrypt.hash(newPassword, 10);
 
    // 5. Supprimer le token (usage unique)
    user.resetToken       = null;
    user.resetTokenExpiry = null;
 
    // 6. Sauvegarder en BD
    await this.usersRepository.save(user);
 
    return { message: 'Mot de passe mis à jour avec succès' };
  }
}