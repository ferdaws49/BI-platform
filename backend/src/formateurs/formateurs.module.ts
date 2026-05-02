import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formateur } from './entities/formateur.entity';
import { FormateursController } from './formateurs.controller';
import { FormateursService } from './formateurs.service';
import { Session } from '../sessions/entities/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Formateur, Session])],
  controllers: [FormateursController],
  providers: [FormateursService],
  exports: [TypeOrmModule, FormateursService],
})
export class FormateurModule {}
