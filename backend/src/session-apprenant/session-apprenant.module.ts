import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formation } from '../formations/entities/formation.entity';
import { Apprenant } from '../apprenants/entities/apprenant.entity';
import { SessionApprenantService } from './session-apprenant.service';
import { SessionApprenantController } from './session-apprenant.controller';
import { User } from 'src/users/users.entity';
import { Session } from 'src/sessions/entities/session.entity';
import { AuthModule } from 'src/auth/auth.module';

// Ce module regroupe la planification des sessions
// et la gestion des presences associees.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Formation,
      Apprenant,
      User,
      Session,
      
      
      
    ]),
    AuthModule
  ],
  controllers: [SessionApprenantController],
  providers: [ SessionApprenantService],
  exports: [SessionApprenantService], // Exporté pour être utilisé dans SessionApprenantModule
})
export class SessionApprenantModule {}
