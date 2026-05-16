import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from 'src/sessions/entities/session.entity';
import { User } from 'src/users/users.entity';
import { Formation } from 'src/formations/entities/formation.entity';
import { Apprenant } from 'src/apprenants/entities/apprenant.entity';
import { Finance } from 'src/finances/entities/finance.entity';
import { AiPredictionService } from './ai-prediction.service';
import { AiPredictionController } from './ai-prediction.controller';
import { FinancesModule } from 'src/finances/finances.module';
import { DashboardModule } from 'src/dashboard/dashboard.module';

@Module({
  imports: [TypeOrmModule.forFeature([Session, User, Formation, Apprenant, Finance]),
   FinancesModule, DashboardModule],  
  providers: [AiPredictionService],
  controllers: [AiPredictionController],
  
})
export class FinancePredictModule {}