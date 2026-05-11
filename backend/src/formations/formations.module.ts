import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formation } from './entities/formation.entity';
import { FormationsController } from './formations.controller';
import { FormationsService } from './formations.service';
import { AuthModule } from 'src/auth/auth.module';
import { ApprenantFormationsController } from './apprenant-formation.controller';
import { Session } from 'src/sessions/entities/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Formation, Session]), AuthModule],
  controllers: [FormationsController, ApprenantFormationsController],
  providers: [FormationsService],
  exports: [TypeOrmModule, FormationsService],
})
export class FormationModule {}
