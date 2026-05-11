import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { SchedulesController } from './schedule.controller';
import { SchedulesService } from './schedule.service';
import {ApprenantModule} from "../apprenants/apprenants.module";
import { DateDimension } from 'src/temps/entities/temps.entity';
import { Session } from 'src/sessions/entities/session.entity';
@Module({
  imports: [
    // On enregistre les deux entités pour que TypeORM crée les tables
    TypeOrmModule.forFeature([ DateDimension, Session]),

    ApprenantModule, 
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
