import { Module } from '@nestjs/common';
import { FinanceAlertService } from './finance-alert.service';
import { FinanceAlertController } from './finance-alert.controller';
import { FinanceRevenueService } from 'src/finances/services/finance-revenu.service';
import { FinanceCostService } from 'src/finances/services/finance-cost.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from 'src/sessions/entities/session.entity';
import { User } from 'src/users/users.entity';
import { Formation } from 'src/formations/entities/formation.entity';
import { Apprenant } from 'src/apprenants/entities/apprenant.entity';
import { Finance } from 'src/finances/entities/finance.entity';
import { DwModule } from 'src/dw/dw.module';

@Module({
  imports: [DwModule, TypeOrmModule.forFeature([Session, User, Formation, Apprenant, Finance])],  
  providers: [FinanceAlertService, FinanceCostService,
    FinanceRevenueService,],
  controllers: [FinanceAlertController],
  exports: [FinanceAlertService],
})
export class FinanceAlertModule {}