import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Finance } from '../finances/entities/finance.entity';
import { Session } from '../sessions/entities/session.entity';
import { Formation } from '../formations/entities/formation.entity';
import { Formateur } from '../formateurs/entities/formateur.entity';
import { Apprenant } from '../apprenants/entities/apprenant.entity';

import { DwController } from './dw.controller';
import { EtlService } from './etl.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Finance,
      Session,
      Formation,
      Formateur,
      Apprenant,
    ]),
  ],
  controllers: [DwController],
  providers: [EtlService],
  exports: [EtlService],
})
export class DwModule {}