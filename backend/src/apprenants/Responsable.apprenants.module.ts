import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponsableApprenantsController } from './Responsable.apprenants.controller';
import { ResponsableApprenantsService } from './Responsable.apprenants.service';
import { Apprenant } from './entities/apprenant.entity';
import { Performance } from '../performances/entities/performance.entity';
import { Presence } from '../sessions/entities/presence.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Apprenant,
      Performance,
      Presence,
    ]),
  ],
  controllers: [ResponsableApprenantsController],
  providers: [ResponsableApprenantsService],
  exports: [ResponsableApprenantsService],
})
export class ResponsableApprenantsModule {}