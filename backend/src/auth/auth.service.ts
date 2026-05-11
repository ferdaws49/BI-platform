import { Injectable, UnauthorizedException, BadRequestException} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InscriptionsService } from '../inscriptions/inscriptions.service';
import { User } from 'src/users/users.entity';
import { randomBytes } from 'crypto';
import { MailService } from "src/mail/mail.service";
import{JWTPayloadType} from "../utils/types"
import { ResetPasswordDto } from "./dtos/reset-password.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from 'typeorm';
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private inscriptionsService: InscriptionsService,
    private readonly mailService: MailService,
    private readonly config: ConfigService, 
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = (email ?? '').trim();
    const users = await this.usersService.findByEmail(normalizedEmail);

    if (!users) {
      throw new UnauthorizedException('User not found or wrong email');
    }

    // Manual inserts in Supabase often introduce hidden whitespace/newlines.
    // Normalize both values before comparing to avoid false "Wrong password".
    const storedHash = (users.password ?? '').trim();
    const rawPassword = password ?? '';
    let isMatch = await bcrypt.compare(rawPassword, storedHash);
    if (!isMatch && rawPassword !== rawPassword.trim()) {
      isMatch = await bcrypt.compare(rawPassword.trim(), storedHash);
    }

    if (!isMatch) {
      throw new UnauthorizedException('Wrong password');
    }

    if (!users.isActive) {
      throw new UnauthorizedException('Votre compte est désactivé. Veuillez contacter l\'administration.');
    }

    if (users.status !== 'accepted') {
      throw new UnauthorizedException('Votre inscription est en cours de traitement ou a été refusée.');
    }

    const payload = {
      sub: users.id,
      email: users.email,
      role: users.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: users.id,
        nom: users.nom,
        prenom: users.prenom,
        email: users.email,
        role: users.role,
      },
    };
  }

  async register(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.inscriptionsService.create({
      ...data,
      password: hashedPassword,
    });
  }

  async verifyEmail(token: string) {
    return this.inscriptionsService.verify(token);
  }


  public async sendResetPasswordLink(email: string){
            const user = await this.usersRepository.findOne({ where: { email}});
            if(!user) throw new BadRequestException("user with given email does not exist");
            //les etapes hedhom zedthom bech lien ywalli andou timing 
            //heya fel assel kenet user.resetPasswordToken = randomBytes(32).toString('hex');

            // 1. Générer la chaîne aléatoire
           const randomString = randomBytes(32).toString('hex');
    
           // 2. Calculer l'expiration (Maintenant + 1 heure en millisecondes)
          const expirationTime = Date.now() + 3600000; // 3600000 ms = 1h

          // 3. On stocke les deux dans la même colonne, séparés par un point
          user.resetToken = `${randomString}.${expirationTime}`;
            const result = await this. usersRepository.save(user);

            const resetPasswordLink= `${this.config.get<string>("USER_DOMAIN")}/reset-password/${user.id}/${result.resetToken}`;
            await this.mailService.sendResetPasswordTemplate(email, resetPasswordLink);

            return{ message: "Password reset link sent to your email, please check your inbox"}
        }

         //2eme etape: get reset password link
         public async getResetPasswordLink(userId: number, resetPasswordToken: string){
            const user = await this.usersRepository.findOne({ where: { id: userId}});
            if(!user) throw new BadRequestException("invalid link");

            if(user.resetToken === null || user.resetToken !== resetPasswordToken)
                throw new BadRequestException("invalid link");
            //hedha zedneh bech nett2akdou ken el temps mta3 e lien mzel ou non
            //najmou nahiwah juste tkhallli return { message: 'valid link'}

            const [token, expiresAt] = resetPasswordToken.split('.');
            // VÉRIFICATION DU TEMPS
            if (Date.now() > Number(expiresAt)) {
            // Optionnel : on nettoie la base si c'est expiré
                user.resetToken = null;
                await this.usersRepository.save(user);
                throw new BadRequestException("link has expired");
            } 
            return { message: 'valid link'}

         }
         //3eme etape : reset password
         public async resetPassword(dto: ResetPasswordDto){
            const { userId, resetPasswordToken, newPassword} = dto;
            const user = await this.usersRepository.findOne({ where: { id: userId}});
            if(!user) throw new BadRequestException("invalid link");

            if(user.resetToken === null || user.resetToken !== resetPasswordToken)
                throw new BadRequestException("invalid link");
            
            //hedha kif kif najmou nahiwah
            // VÉRIFICATION DE L'EXPIRATION AVANT DE CHANGER LE MOT DE PASSE
            const expiresAt = Number(resetPasswordToken.split('.')[1]);
            if (Date.now() > expiresAt) {
                throw new BadRequestException("link has expired");
            }
            
            const hashedPassword = await this.hashPassword(newPassword);
            user.password = hashedPassword;
            user.resetToken = null;
            await this.usersRepository.save(user);

            return { message: 'password reset successfully, please log in '};
         }
    public async hashPassword(password: string): Promise<string> {
            const salt = await bcrypt.genSalt(10);
            return bcrypt.hash(password, salt);
    
        }


         // fi3oudh ahna fi kol marra n3awdou nektbou jwt nwalliw naamlou class privé
    // dima classe privé nhotouha fel  ekher
    private generateJWT(payload: JWTPayloadType) : Promise<string>{
        return this.jwtService.signAsync(payload);

    }
}