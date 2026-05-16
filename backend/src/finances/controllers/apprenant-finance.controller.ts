import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetStudentPaymentsDto } from '../dto/get-student-payments.dto';
import { StudentFinanceService } from '../services/apprenant-finance.service';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';



@Controller('student-finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('apprenant')

export class StudentFinanceController {
  constructor(private readonly service: StudentFinanceService) {}

  @Get('filters')
  
@ApiOperation({
  summary: 'Formations et sessions disponibles pour les filtres',
  description: 'Liste des formations et sessions où l\'étudiant est inscrit',
})
async getFilterOptions(@Req() req: any) {
    
    console.log("REQ USER:", req.user);
    console.log("FILTER ENDPOINT HIT");
  const userId = req.user?.userId;
  return this.service.getFilterOptions(userId);
}

  @Get('payments')
  @ApiOperation({
    summary: 'Mes paiements (avec filtres et pagination)',
    description:
      'Retourne la liste des paiements de l\'étudiant connecté. ' +
      'Rafraîchir la page pour voir les nouveaux paiements.',
  })
  async getPayments(
    @CurrentUser('userId') userId: number,
    @Query() dto: GetStudentPaymentsDto,
  ) {
    return this.service.getPayments(userId, dto);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Résumé de mes paiements',
    description: 'Total payé, reste à payer, nombre de sessions et paiements',
  })
  async getSummary(@Req() req: any) {
    const userId = req.user?.userId ?? req.user?.id;
    return this.service.getSummary(userId);
  }
}