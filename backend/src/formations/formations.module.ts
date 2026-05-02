import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formation } from './entities/formation.entity';
import { FormationsController } from './formations.controller';
import { FormationsService } from './formations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Formation])],
  controllers: [FormationsController],
  providers: [FormationsService],
  exports: [TypeOrmModule, FormationsService],
})
export class FormationModule {}
