import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertStatus } from './entities/alert-status.entity';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { Formateur } from 'src/formateurs/entities/formateur.entity';
import { FormateurModule } from 'src/formateurs/formateurs.module';

@Module({
  imports: [TypeOrmModule.forFeature([AlertStatus, Formateur]),FormateurModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
