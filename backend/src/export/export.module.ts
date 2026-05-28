import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { Apprenant } from '../apprenants/entities/apprenant.entity';
import { Formation } from '../formations/entities/formation.entity';
import { Formateur } from '../formateurs/entities/formateur.entity';
import { Finance } from '../finances/entities/finance.entity';
import { Performance } from '../performances/entities/performance.entity';
import { Session } from '../sessions/entities/session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Apprenant,
      Formation,
      Formateur,
      Finance,
      Performance,
      Session,
    ]),
  ],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
