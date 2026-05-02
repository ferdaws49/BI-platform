import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FinanceDirecteurService } from './Finance.directeur.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FinanceFilterDto } from './dto/finances.dto';

@Controller('directeur/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('directeur')
export class FinanceDirecteurController {
  constructor(private readonly financeService: FinanceDirecteurService) {}

  @Get('overview')
  getOverview(@Query() query: FinanceFilterDto) {
    return this.financeService.getOverview(query);
  }

  @Get('formations-profitability')
  getProfitability(@Query() query: FinanceFilterDto) {
    return this.financeService.getFormationsProfitability(query);
  }

  @Get('impayes')
  getImpayes() {
    return this.financeService.getImpayes();
  }
}