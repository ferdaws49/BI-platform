import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from 'src/sessions/entities/session.entity';
import { User } from 'src/users/users.entity';
import { Formation } from 'src/formations/entities/formation.entity';
import { Apprenant } from 'src/apprenants/entities/apprenant.entity';
import { Finance } from 'src/finances/entities/finance.entity';
import { FinancesModule } from 'src/finances/finances.module';
import { DashboardModule } from 'src/dashboard/dashboard.module';
import { MlService } from './ml.service';
import { MlController } from './ml.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [TypeOrmModule.forFeature([Session, User, Formation, Apprenant, Finance]),
   FinancesModule, DashboardModule, HttpModule.register({ timeout: 10000 })],  
  providers: [MlService],
  controllers: [MlController],
  
})
export class FinancePredictModule {}