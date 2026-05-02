import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityController } from './Quality.controller ';
import { QualityService } from './Quality.service';
import { Performance } from '../performances/entities/performance.entity';
import { Formation } from '../formations/entities/formation.entity';
import { Apprenant } from '../apprenants/entities/apprenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Performance, Formation, Apprenant])],
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService], // AlertsModule will use this
})
export class QualityModule {}