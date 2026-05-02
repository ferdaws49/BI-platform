import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Apprenant } from './entities/apprenant.entity';
import { ApprenantsService } from './apprenants.service';
import { ApprenantsController } from './apprenants.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Apprenant])],
  controllers: [ApprenantsController],
  providers: [ApprenantsService],
  exports: [ApprenantsService, TypeOrmModule],
})
export class ApprenantModule {}
