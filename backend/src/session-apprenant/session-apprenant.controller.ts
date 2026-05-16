// src/inscriptions/inscriptions.controller.ts
import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  ParseIntPipe, 
  BadRequestException
} from '@nestjs/common';
import { ParticipateSessionDto } from './dtos/participate-session.dto';
import type { JWTPayloadType } from 'src/utils/types';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { SessionApprenantService } from './session-apprenant.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

//@UseGuards(AuthGuard) // Seul un utilisateur connecté peut accéder à ces routes
@Controller('inscriptions')
export class SessionApprenantController {
  constructor(private readonly sessionApprenantService: SessionApprenantService) {}


   @Get('apprenants-list') // ✅ L'URL finale : /users/apprenants-list
  @UseGuards(JwtAuthGuard)
  async getStudentList() {
    return this.sessionApprenantService.getApprenantsForSelect();
  }

  // POST: ~/inscription
  @Post()
  @UseGuards(JwtAuthGuard)
  public async create(@CurrentUser() user: any, @Body() createDto: ParticipateSessionDto) {
    const userId = user?.id || user?.userId || user?.sub;
  if (!userId) throw new BadRequestException("Utilisateur non identifié");
    // On récupère l'ID de l'élève depuis le Token (req.user.id)
    // On récupère l'ID du cours depuis le Body (createDto.formationId)
    return this.sessionApprenantService.create(Number(userId), createDto);
  }

  // GET: ~inscriptions/student
  @Get('student')
  @UseGuards(JwtAuthGuard)
  async getMyHistory (@CurrentUser() user: any) {
    // On demande au service de chercher toutes les inscriptions liées à cet ID utilisateur
    const userId = user?.userId || user?.sub || user?.id;
    if (!userId) throw new BadRequestException("ID manquant");
    return this.sessionApprenantService.getStudentHistory(Number(userId));
  }

  /**
   * ENDPOINT : DELETE /inscriptions/:id
   * Objectif : Annuler une inscription (changer son statut en 'cancelled')
   */
  @Delete(':sessionId')
  @UseGuards(JwtAuthGuard)
  async cancel(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string
  ) {
    // On passe l'ID de l'inscription ET l'ID de l'utilisateur pour vérifier
    // que l'élève n'annule pas l'inscription de quelqu'un d'autre par erreur.
   const userId = user?.userId || user?.sub || user?.id;
    if (!userId) throw new BadRequestException("ID manquant");
    return this.sessionApprenantService.cancel(sessionId, Number(userId));
  }


  // formations.controller.ts


}



