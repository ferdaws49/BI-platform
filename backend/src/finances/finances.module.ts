import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Existing
import { Finance } from './entities/finance.entity';
import { Formation } from '../formations/entities/formation.entity';

// New directeur-specific service + controller
import { FinanceDirecteurService } from './Finance.directeur.service';
import { FinanceDirecteurController } from './Finance. directeur.controller';
import { FinanceRevenueService } from './services/finance-revenu.service';
import { FinanceRevenueController } from './controllers/finance-revenu.controller';
import { Session } from 'src/sessions/entities/session.entity';
import { User } from 'src/users/users.entity';
import { FinanceCostController } from './controllers/finance-cost.controller';
import { FinanceCostService } from './services/finance-cost.service';
import { PaymentsController } from './controllers/finance-paiement.controller';
import { Apprenant } from 'src/apprenants/entities/apprenant.entity';
import { FinanceReportingController } from './controllers/finance-reporting.controller';
import { FinanceReportingService } from './services/finance-reporting.service';
import { StudentFinanceService } from './services/apprenant-finance.service';
import { StudentFinanceController } from './controllers/apprenant-finance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Finance, Formation, Session, User, Apprenant ])],
  controllers: [
    // ... tes controllers existants +
    FinanceDirecteurController,
    FinanceRevenueController,
    FinanceCostController,
    PaymentsController,
    FinanceReportingController,
    StudentFinanceController
  
   
  ],
  providers: [
    // ... tes services existants +
    FinanceDirecteurService,
    FinanceRevenueService,
    FinanceCostService,
    FinanceReportingService,
    StudentFinanceService
  ],
  exports: [FinanceDirecteurService, FinanceCostService, FinanceRevenueService], // pour AlertsModule plus tard
  
})

export class FinancesModule {}
