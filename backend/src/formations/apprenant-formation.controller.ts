import { Controller, Get,Post,
   Patch, Delete, Param,
    Body, UseGuards, ParseIntPipe,
     Req, Query, 
     BadRequestException} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FormationsService } from './formations.service';
import {AuthGuard} from "../auth/guards/auth.guard";
import type { JWTPayloadType } from 'src/utils/types';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { FormationStatus } from './entities/formation.entity';



@Controller('student/formations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('apprenant')
export class ApprenantFormationsController {
  constructor(private readonly formationsService: FormationsService) {}

    @Get('catalogue')
    async getFormationCatalogue(@CurrentUser() user: any) {
      const userId = user.id || user.userId || user.sub;
       return this.formationsService.findAllAvailableFormations();
    }

  
//GET: ~/student/formations  
    //@UseGuards(AuthGuard) // on a besoin du Token pour savoir qui est l'élève
    @Get('my-list') 
   async findStudentFormations(
   @CurrentUser() user: any, // On le reçoit souvent en string depuis l'URL
  @Query('page') page: number = 1,
  @Query('status') status: FormationStatus
) {
  // On convertit explicitement ici en nombre
  return this.formationsService.findStudentFormations(user.id, page, 10, status);
}

     /**
   * ENDPOINT : GET /formations/:id
   * Objectif : Afficher les détails d'un cours quand l'apprenant clique dessus
   */
    @UseGuards(JwtAuthGuard)
    @Get('formations/:id')
    async getFormationDetails(
        @Param('id', ParseIntPipe) id: number, // ParseIntPipe vérifie que l'ID est bien un nombre
        @CurrentUser() user: JWTPayloadType
        ) {
             if (!user || !user.userId) {
        console.error("ERREUR : L'ID utilisateur est introuvable dans le token JWT");
        throw new BadRequestException("ID utilisateur manquant dans le token");
    }
            return this.formationsService.findFormation(id, user.userId);
        }
  
   //elli yabda fehom id lezem thotthom fl lekher   , ken thotthom mellouwel ell ft elli mafihomch id maadch yekhdmou
    @UseGuards(JwtAuthGuard)
    @Get(':id/available-sessions')
    async getAvailableSessions(
      @Param('id', ParseIntPipe) formationId: number, // ParseIntPipe vérifie que l'ID est bien un nombre
      @CurrentUser() user: any
    ) {
        // PROTECTION : On vérifie id ou sub pour éviter le NaN
       const userId = user?.id || user?.userId || user?.sub;

       if (!userId) {
         throw new BadRequestException("Impossible d'identifier l'utilisateur (ID manquant dans le token)");
       }

       return this.formationsService.findAllAvailableSessions(formationId, user.id);
    }
}