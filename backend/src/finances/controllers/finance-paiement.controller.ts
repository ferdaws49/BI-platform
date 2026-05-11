import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  PaymentManagementBarDto,
  PaymentManagementKpisDto,
  PaymentManagementPieDto, PaymentManagementTableResponseDto } from '../dto/revenue-response.dto';
import { FinanceRevenueService } from '../services/finance-revenu.service';
import { AddPaymentDto } from '../dto/add-payement.dto';
import { RevenueFilterDto } from '../dto/revenue-filter.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';


/**
 * Onglet « Gestion des paiements » : KPIs, graphiques, tableau et saisie d’encaissement.
 * Délègue au même service que le dashboard pour réutiliser les agrégations (pas de duplication SQL).
 */
@ApiTags('Finance — Paiements')
@ApiBearerAuth()
@Controller('finance/payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  
  constructor(private readonly dashboard: FinanceRevenueService) {}
  @Get('kpis')
  @ApiOperation({ summary: 'KPIs : encaissé, non encaissé, taux, nombre de paiements' })
  @ApiOkResponse({ type: PaymentManagementKpisDto })
  getKpis(@Query() filter: RevenueFilterDto): Promise<PaymentManagementKpisDto> {
    return this.dashboard.getPaymentManagementKpis(filter);
  }

  @Get('charts/pie')
  @ApiOperation({ summary: 'Camembert : répartition payé / avance / impayé (%)' })
  @ApiOkResponse({ type: PaymentManagementPieDto })
  getPie(@Query() filter: RevenueFilterDto): Promise<PaymentManagementPieDto> {
    return this.dashboard.getPaymentManagementPie(filter);
  }


  @Get('charts/bar')
  @ApiOperation({ summary: 'Histogramme : CA facturé vs CA encaissé par mois' })
  @ApiOkResponse({ type: PaymentManagementBarDto })
  getBar(@Query() filter: RevenueFilterDto): Promise<PaymentManagementBarDto> {
    return this.dashboard.getPaymentManagementBar(filter);
  }

  @Get('table')
  @ApiOperation({ summary: 'Tableau des paiements (pagination, tri)' })
  @ApiOkResponse({ type: PaymentManagementTableResponseDto })
  getTable(
    @Query() filter: RevenueFilterDto,
  ): Promise<PaymentManagementTableResponseDto> {
    return this.dashboard.getPaymentManagementTable(filter);
  }
  
  @Post()
  @ApiOperation({
    summary: 'Ajouter un paiement (écriture finance + mise à jour inscription)',
  })
  @ApiCreatedResponse({ description: 'Finance créée et inscription mise à jour' })
  addPayment(
    @Body() dto: AddPaymentDto,
  ): Promise<{ finance: unknown }> {
    return this.dashboard.addPayment(dto);
  }
/** 
  @Get("apprenants/:id/sessions")
getSessions(@Param("id") id: string) {
  return this.dashboard.getSessionsByApprenant(Number(id));
}
   */

}