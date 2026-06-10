import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { SchedulesController } from './schedule.controller';
import { SchedulesService } from './schedule.service';
import {ApprenantModule} from "../apprenants/apprenants.module";
import { Session } from 'src/sessions/entities/session.entity';
import { Presence } from 'src/sessions/entities/presence.entity';
@Module({
  imports: [
    // On enregistre les deux entités pour que TypeORM crée les tables
    TypeOrmModule.forFeature([Session, Presence]),

    ApprenantModule, 
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
