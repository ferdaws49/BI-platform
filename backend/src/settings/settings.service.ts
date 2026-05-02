import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { UpdateProfileDto, ChangePasswordDto } from './dto/settings.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'prenom', 'nom', 'email', 'phone']
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    return {
      firstName: user.prenom,
      lastName: user.nom,
      email: user.email,
      phone: user.phone,
    };
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    // Vérification email unique
    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({ where: { email: dto.email } });
      if (existing) throw new BadRequestException('Cet email est déjà utilisé');
    }

    if (dto.firstName !== undefined) user.prenom = dto.firstName;
    if (dto.lastName !== undefined) user.nom = dto.lastName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.phone !== undefined) user.phone = dto.phone;

    await this.userRepository.save(user);

    return {
      firstName: user.prenom,
      lastName: user.nom,
      email: user.email,
      phone: user.phone,
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(dto.newPassword, salt);
    await this.userRepository.save(user);

    return { message: 'Mot de passe mis à jour avec succès' };
  }
}