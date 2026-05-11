import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { join } from "node:path";
import { unlinkSync} from 'node:fs';
import { UsersService } from "src/users/users.service";
import { InjectRepository } from "@nestjs/typeorm";
import { UpdateProfileDto } from "./dtos/update-profile.dto";
import * as bcrypt from 'bcryptjs' ;
import { JWTPayloadType } from "src/utils/types";
import { User, UserRole } from "src/users/users.entity";
import { Apprenant } from "src/apprenants/entities/apprenant.entity";
import { Repository } from "typeorm";
import { Performance } from "src/performances/entities/performance.entity";

@Injectable()
export class ProfileService {
    constructor(
        
        @InjectRepository (Apprenant) private readonly apprenantRepository: Repository<Apprenant>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Performance) private readonly performanceRepository: Repository<Performance>, // <--- AJOUTE CECI
        private readonly usersService: UsersService,
        
    ){}

    public async getProfile(userId: number) {
        if (!userId) {
            throw new BadRequestException("ID utilisateur manquant");
        }
        const user = await this.usersService.getCurrentUser(userId);
    if (!user) throw new NotFoundException("Utilisateur non trouvé");
    return user;

    }

    //set profile image
    public async setProfileImage(userId: number, newProfileImage: string){
        const user = await this.usersService.getCurrentUser(userId);

        //ken maandouch profile image khallih yhott
        if(user.profileImage === null){
             user.profileImage= newProfileImage;

        }
        //ken howa c'est deja andou taswira w yheb ybadalha:
        else{
            // bech yayet lel fonction bech tfassakh 
            await  this.removeProfileImage(userId);
            // w lenna hat taswira jdida
            user.profileImage = newProfileImage;

        }

        //kent fl asel return this.usersRepository.save(user)
        return this.usersService.updateUser(user);
    }

    //delete profile image
    public async removeProfileImage(userId: number){
        const user = await this.usersService.getCurrentUser(userId);
        // lenna 9otlou ken fl assel maandouch profile image 9ollou enti tfassakh fi haja deja mch mawjouda 
        if(!user.profileImage === null)
            throw new BadRequestException ("there is no profile image");
        //tawa ken andou taswira w howa yheb yfassakha donc ena lezemn nfassakha mn dossier images w mn DB

        //1: nheb ala image path (el massar)
        //cwd: current work directory: hedha mn nodejs w bech yaatini el root(massar) mta3 projet
        const imagePath = join(process.cwd(), `./images/users/${user.profileImage}`);
        //lenna bech nfasakh el image mn folder
        unlinkSync(imagePath);

        //lenna bech nfassakh mn db
        user.profileImage = null;
       
        //kent fl asel return this.usersRepository.save(user)
        //lezem net2aked
        return this.usersService.updateUser(user);

    }
    //update profile
    public async update(userId: number, updateProfileDto: UpdateProfileDto){
        const {password, nom, prenom, phone} = updateProfileDto;
        const user = await this.usersService.getCurrentUser(userId);
        if (!user) {
        throw new NotFoundException("Utilisateur non trouvé");
    }

        if (nom !== undefined) user.nom = nom;
        if (prenom !== undefined) user.prenom = prenom;
        if (phone !== undefined) user.phone = phone;
        //bech nchouf ken howa badel el password 
        //ken badel donc lezem naamel tachfir 
        if(password){
            user.password =await this.hashPassword(password);
        }
        return this.usersService.updateUser(user)
        //kenet haka return this.usersRepository.save(user);

    }
    //delete profile
    // profile.service.ts

public async delete(userId: number, payload: any) {
    const user = await this.usersService.getCurrentUser(userId);
    if (!user) throw new NotFoundException("Utilisateur non trouvé");

    // SÉCURITÉ
    if (user.id !== payload.userId && payload.role !== UserRole.ADMIN) {
        throw new ForbiddenException("Accès refusé");
    }

    // 1. Supprimer d'abord le profil apprenant (et ses relations)
    // On cherche l'apprenant lié à ce User
    const apprenant = await this.apprenantRepository.findOne({ where: { userId: userId } });
    
    if (apprenant) {
        // Cela supprime toutes les notes liées à cet apprenant (ID 5 dans ton cas)
        await this.performanceRepository.delete({ apprenant: { id: apprenant.id } });
        // Supprime l'apprenant (ceci nettoiera aussi la table pivot sessions_apprenants)
        await this.apprenantRepository.remove(apprenant);
    }

    // 2. Maintenant on peut supprimer l'utilisateur sans erreur de clé étrangère
    await this.usersService.deleteUser(user);

    return { message: "Utilisateur et profil supprimés." };
}

    /**
     * hashng password
     * @param password plain text password
     * @returns hashed password
     */
    private async hashPassword(password:string): Promise <string> {
        const salt =await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt)
        
    }

}


