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
import { RegisterDto } from './dtos/register-dto';
import { Inscription, InscriptionStatut } from 'src/inscriptions/entities/inscriptions.entity';
import { resolveMx } from 'dns/promises';
import { validate } from 'deep-email-validator';


@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private inscriptionsService: InscriptionsService,
    private readonly mailService: MailService,
    private readonly config: ConfigService, 
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Inscription) private readonly inscriptionsRepository: Repository<Inscription>,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = (email ?? '').trim();

     // ─── 1. Vérification préalable pour les apprenants ───
  const inscription = await this.inscriptionsRepository.findOne({
    where: { email: normalizedEmail },
  });

  if (inscription) {
    // L'utilisateur existe dans la table inscriptions = c'est un apprenant
    if (inscription.statut === InscriptionStatut.NOT_VERIFIED) {
      throw new UnauthorizedException(
        'Veuillez vérifier votre compte. Un email de vérification vous a été envoyé.'
      );
    }

    if (inscription.statut === InscriptionStatut.PENDING) {
      throw new UnauthorizedException(
        'Votre inscription est en attente de validation par l\'administration.'
      );
    }

    if (inscription.statut === InscriptionStatut.REJECTED) {
      throw new UnauthorizedException(
        'Votre inscription a été refusée. Veuillez contacter l\'administration.'
      );
    }

    // Si ACCEPTED → on continue vers la table users pour le login normal
    // (suppose qu'une inscription acceptée a un compte utilisateur créé)
  }
    
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
        profileImage: users.profileImage || null,
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

  

  public async registerapprenant(registerDto: RegisterDto) {/**ena lenna bech nthabet ken el user maamalch inscript 9bal b nafs email */
     /** mademe staamalt await lezem nhot async */
    const { email, password, nom, prenom, programme, telephone} = registerDto ;
    
    const userFromDb = await this.usersRepository.findOne({ where: { email }})
     /** ken tkoun famma inscrit bl email   */
    if(userFromDb) throw new BadRequestException("user already exist");
    const inscExists = await this.inscriptionsRepository.findOne({ where: {email} });
    if (inscExists) {
      throw new BadRequestException("inscription en attente de validation");
    }
    const emailCheck = await this.isRealEmail(email);
    if (!emailCheck.valid) {
      throw new BadRequestException(
        `Email invalide${emailCheck.reason ? ` : ${emailCheck.reason}` : ''}. Veuillez utiliser une adresse email réelle.`
      );
    }


    /** tawa ken mal9inech email */
    /**bech naamlou tachfir lel password elli 3tah */
    /** salt y9awwi akther fi tachfir*/
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    /** lenna bech naamlou creation de new user */
    let newUser = this.inscriptionsRepository.create({
      email,
      nom,
      prenom,
      password : hashedPassword,
      telephone,
      programme,
      statut: InscriptionStatut.NOT_VERIFIED,
      verifyToken: randomBytes(32).toString('hex'),
      isAccountVerified: false
    })
    newUser = await this.inscriptionsRepository.save(newUser);
            
    const link = `${this.config.get<string>("USER_DOMAIN")}/auth/verify-email/${newUser.id}/${newUser.verifyToken}`;
    await this.mailService.sendVerifyEmailTemplate(email, link);
    
    //JWT
    return{ message: 'verification token has been sent to your email, please verify your email adress ' };
        }


  public async verifyemail(id: number, token: string) {
        const inscription = await this.inscriptionsRepository.findOne({ where: { id }});
        if (!inscription) {
            throw new BadRequestException("Invalid link");
        }
        if (inscription.verifyToken !== token) {
            throw new BadRequestException("Invalid token");
        }
        // تحقق إذا déjà verified
        if (inscription.statut !== InscriptionStatut.NOT_VERIFIED) {
            throw new BadRequestException("Email already verified");
        }
            
        inscription.statut = InscriptionStatut.PENDING;
        inscription.verifyToken = null;

        await this.inscriptionsRepository.save(inscription);

        return { message: "Email verified successfully, waiting for admin approval" };
        }
        
  async verifyEmail(token: string) {
    return this.inscriptionsService.verify(token);
  }


  public async sendResetPasswordLink(email: string){
            const user = await this.usersRepository.findOne({ where: { email}});
            if(!user) return { success: false, error: 'Aucun compte associé à cet email' }
            //les etapes hedhom zedthom bech lien ywalli andou timing 
            //heya fel assel kenet user.resetPasswordToken = randomBytes(32).toString('hex');

            // 1. Générer la chaîne aléatoire
           const randomString = randomBytes(32).toString('hex');
    
           // 2. Calculer l'expiration (Maintenant + 1 heure en millisecondes)
          const expirationTime = Date.now() + 3600000; // 3600000 ms = 1h

          // 3. On stocke les deux dans la même colonne, séparés par un point
          user.resetToken = `${randomString}.${expirationTime}`;
            const result = await this. usersRepository.save(user);

            const resetPasswordLink= `${this.config.get<string>("USER_DOMAIN")}/auth/reset-password/${user.id}/${user.resetToken}`;
            await this.mailService.sendResetPasswordTemplate(email, resetPasswordLink);

            return {
      success: true,
      message: 'Password reset link sent to your email, please check your inbox',
    }
        }

         //2eme etape: get reset password link
         public async getResetPasswordLink(userId: number, resetPasswordToken: string){
            const user = await this.usersRepository.findOne({ where: { id: userId}});
            if(!user) return { success: false, error: 'invalid link' }

            if(user.resetToken === null || user.resetToken !== resetPasswordToken)
                return { success: false, error: 'invalid link' }
            //hedha zedneh bech nett2akdou ken el temps mta3 e lien mzel ou non
            //najmou nahiwah juste tkhallli return { message: 'valid link'}

            const [token, expiresAt] = resetPasswordToken.split('.');
            // VÉRIFICATION DU TEMPS
            if (Date.now() > Number(expiresAt)) {
            // Optionnel : on nettoie la base si c'est expiré
                user.resetToken = null;
                await this.usersRepository.save(user);
                return { success: false, error: 'link has expired' }
            } 
            return { success: true, message: 'valid link'}

         }
         //3eme etape : reset password
         public async resetPassword(dto: ResetPasswordDto){
            const { userId, resetPasswordToken, newPassword} = dto;
            const user = await this.usersRepository.findOne({ where: { id: userId}});
            if(!user) return { success: false, error: 'invalid link' }

            if(user.resetToken === null || user.resetToken !== resetPasswordToken)
                return { success: false, error: 'invalid link' }
            
            //hedha kif kif najmou nahiwah
            // VÉRIFICATION DE L'EXPIRATION AVANT DE CHANGER LE MOT DE PASSE
            const expiresAt = Number(resetPasswordToken.split('__')[1]);
            if (Date.now() > expiresAt) {
                throw new BadRequestException("link has expired");
            }
            
            const hashedPassword = await this.hashPassword(newPassword);
            user.password = hashedPassword;
            user.resetToken = null;
            await this.usersRepository.save(user);

            return {
      success: true,
      message: 'password reset successfully, please log in',
    };
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




// 🔥 VÉRIFICATION COMPLÈTE
  private async isRealEmail(email: string): Promise<{ valid: boolean; reason?: string }> {
    // Option A : deep-email-validator (SMTP + MX + typo + disposable)
    try {
      const res = await validate({
        email,
        validateRegex: true,
        validateMx: true,
        validateTypo: true,
        validateDisposable: true,
        validateSMTP: true,
      });
      return {
        valid: res.valid,
        reason: res.reason,
      };
    } catch (err) {
      // Fallback : au moins vérifier le MX si deep-email-validator plante
      return this.fallbackMxCheck(email);
    }
  }

  private async fallbackMxCheck(email: string): Promise<{ valid: boolean; reason?: string }> {
    const domain = email.split('@')[1];
    if (!domain) return { valid: false, reason: 'format invalide' };

    try {
      const records = await resolveMx(domain);
      const hasMx = records && records.length > 0;
      return {
        valid: hasMx,
        reason: hasMx ? undefined : 'domaine sans serveur mail',
      };
    } catch {
      return { valid: false, reason: 'domaine introuvable' };
    }
  }

}