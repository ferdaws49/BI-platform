import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SatisfactionService } from './satisfaction.service';
import { SatisfactionController } from './satisfaction.controller';
import { Satisfaction } from './entities/satisfaction.entity';
import { Apprenant } from 'src/apprenants/entities/apprenant.entity';
import { Formation } from 'src/formations/entities/formation.entity';

@Module({
  imports: [
    // Importation des repositories nécessaires
    TypeOrmModule.forFeature([Satisfaction, Apprenant, Formation])
  ],
  controllers: [SatisfactionController],
  providers: [SatisfactionService],
  exports: [SatisfactionService] // Au cas où vous en auriez besoin ailleurs
})
export class SatisfactionModule {}