import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { PedagogiqueDashboardController } from './pedagogique.dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DirecteurDashboardService } from './services/directeur.dashboard.service';
import { PedagogiqueDashboardService } from './services/pedagogique.dashboard.service';
import { AdminDashboardController } from './admin.dashboard.controller';
import { AdminDashboardService } from './services/admin.dashboard.service';

import { Apprenant } from '../apprenants/entities/apprenant.entity';
import { Formation } from '../formations/entities/formation.entity';
import { Formateur } from '../formateurs/entities/formateur.entity';
import { Finance } from '../finances/entities/finance.entity';
import { Performance as PerformanceEntity } from '../performances/entities/performance.entity';
import { Satisfaction } from '../satisfaction/entities/satisfaction.entity';
import { User } from 'src/users/users.entity';
<<<<<<< HEAD
import { FinancierDashboardController } from './financier-dashboard.controller';
import { FinancierDashboardService } from './services/financier.dashboard.service';
import { Session } from 'src/sessions/entities/session.entity';
import { ApprennatDashboardService } from './services/apprenant-dashboard.service';
import { ApprenantDashboardController } from './apprenant-dashboard.controller';
=======
// ✅ NOUVEAU: Session requis par DirecteurDashboardService
import { Session } from '../sessions/entities/session.entity';
import { Inscription } from '../inscriptions/entities/inscriptions.entity';
import { DirecteurReportsService } from './services/directeur.reports.service';
>>>>>>> 2b077d31bd11532c6659a78b2d09dbd76bf7138b

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Apprenant,
      Formation,
      Formateur,
      Finance,
      PerformanceEntity,
      User,
<<<<<<< HEAD
      Satisfaction, // 
      Session,
    ])
  ],
  controllers: [DashboardController, PedagogiqueDashboardController,AdminDashboardController, FinancierDashboardController, ApprenantDashboardController],
=======
      Satisfaction,
      Session,
      Inscription,
    ]),
  ],
  controllers: [
    DashboardController,
    PedagogiqueDashboardController,
    AdminDashboardController,
  ],
>>>>>>> 2b077d31bd11532c6659a78b2d09dbd76bf7138b
  providers: [
    DashboardService,
    DirecteurDashboardService,
    PedagogiqueDashboardService,
    AdminDashboardService,
<<<<<<< HEAD
    FinancierDashboardService,
    ApprennatDashboardService

=======
    DirecteurReportsService,
>>>>>>> 2b077d31bd11532c6659a78b2d09dbd76bf7138b
  ],
})
export class DashboardModule {}