import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApprennatDashboardService } from './services/apprenant-dashboard.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JWTPayloadType } from 'src/utils/types';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard) // Protection par JWT
@Roles('apprenant')
export class ApprenantDashboardController {
  constructor(private readonly apprenantdashboardService: ApprennatDashboardService) {}

  @Get('student')
  async getStudentDashboard(@CurrentUser() user:any) {
    console.log("Appel dashboard pour le user ID:", user.userId);
    return this.apprenantdashboardService.getStudentStats(user.userId);
  }
}