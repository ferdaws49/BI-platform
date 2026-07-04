import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inscription } from './entities/inscriptions.entity';
import { InscriptionsService } from './inscriptions.service';
import { InscriptionsController } from './inscriptions.controller';
import { UsersModule } from '../users/users.module';
import { ApprenantModule } from '../apprenants/apprenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inscription]),
    UsersModule,
    ApprenantModule,
   
  ],
  controllers: [InscriptionsController],
  providers: [InscriptionsService],
  exports: [InscriptionsService],
})
export class InscriptionsModule {}
