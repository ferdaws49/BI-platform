import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formation } from './entities/formation.entity';
import { FormationsController } from './formations.controller';
import { FormationsService } from './formations.service';
import { AuthModule } from 'src/auth/auth.module';
import { ApprenantFormationsController } from './apprenant-formation.controller';
import { Session } from 'src/sessions/entities/session.entity';
import { Apprenant } from 'src/apprenants/entities/apprenant.entity';
import { Satisfaction } from 'src/satisfaction/entities/satisfaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Formation, Session, Apprenant, Satisfaction]), AuthModule],
  controllers: [FormationsController, ApprenantFormationsController],
  providers: [FormationsService],
  exports: [TypeOrmModule, FormationsService],
})
export class FormationModule {}
