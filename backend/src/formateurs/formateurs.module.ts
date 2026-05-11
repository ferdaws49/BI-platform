import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formateur } from './entities/formateur.entity';
import { FormateursController } from './formateurs.controller';
import { FormateursService } from './formateurs.service';
import { Session } from '../sessions/entities/session.entity';
// ➕ Ajoutés pour getPerformances()
import { Performance } from '../performances/entities/performance.entity';
import { Satisfaction } from '../satisfaction/entities/satisfaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Formateur,
      Session,
      Performance,  // ➕
      Satisfaction, // ➕
    ]),
  ],
  controllers: [FormateursController],
  providers: [FormateursService],
  exports: [TypeOrmModule, FormateursService],
})
export class FormateurModule {}