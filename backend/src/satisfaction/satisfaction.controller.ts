// satisfaction/satisfaction.controller.ts
import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { SatisfactionService } from './satisfaction.service';
import { CreateSatisfactionDto } from './dtos/create-satisfaction.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'; // Ajustez selon votre auth
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';

@Controller('satisfaction')
 @UseGuards(JwtAuthGuard, RolesGuard)
 @Roles('apprenant')
export class SatisfactionController {
  constructor(private readonly satisfactionService: SatisfactionService) {}

  @Post()
  async create(
    @CurrentUser() user: any, @Body() dto: CreateSatisfactionDto
    ) {
        const userId = user?.id || user?.userId || user?.sub;
          if (!userId) throw new BadRequestException("Utilisateur non identifié");
    // On récupère le userId du token JWT
    return this.satisfactionService.rateFormation(userId, dto);
  }
}