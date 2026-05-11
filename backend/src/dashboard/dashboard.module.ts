import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { PedagogiqueDashboardController } from './pedagogique.dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DirecteurDashboardService } from './services/directeur.dashboard.service';
import { PedagogiqueDashboardService } from './services/pedagogique.dashboard.service';
import { AdminDashboardController } from './admin.dashboard.controller';


// your entities
import { Apprenant } from '../apprenants/entities/apprenant.entity';
import { Formation } from '../formations/entities/formation.entity';
import { Formateur } from '../formateurs/entities/formateur.entity';
import { Finance } from '../finances/entities/finance.entity';
import { Performance } from '../performances/entities/performance.entity';
import { AdminDashboardService } from './services/admin.dashboard.service';
import { Satisfaction } from '../satisfaction/entities/satisfaction.entity';
import { User } from 'src/users/users.entity';
import { FinancierDashboardController } from './financier-dashboard.controller';
import { FinancierDashboardService } from './services/financier.dashboard.service';
import { Session } from 'src/sessions/entities/session.entity';
import { ApprennatDashboardService } from './services/apprenant-dashboard.service';
import { ApprenantDashboardController } from './apprenant-dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Apprenant,
      Formation,
      Formateur,
      Finance,
      Performance,
      User,
      Satisfaction, // 
      Session,
    ])
  ],
  controllers: [DashboardController, PedagogiqueDashboardController,AdminDashboardController, FinancierDashboardController, ApprenantDashboardController],
  providers: [
    DashboardService,
    DirecteurDashboardService,  // ← add this
    PedagogiqueDashboardService,
    AdminDashboardService,
    FinancierDashboardService,
    ApprennatDashboardService

  ],
})
export class DashboardModule {}