import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

import { Session } from './entities/session.entity';
import { Presence } from './entities/presence.entity';
import { Formation } from '../formations/entities/formation.entity';
import { Formateur } from '../formateurs/entities/formateur.entity';
import { Apprenant } from '../apprenants/entities/apprenant.entity';
import { Finance } from 'src/finances/entities/finance.entity';

// Ce module regroupe la planification des sessions
// et la gestion des presences associees.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      Presence,
      Formation,
      Formateur,
      Apprenant,
      Finance,
      // Pas besoin d'entite Finance ici :
      
    ]),
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
