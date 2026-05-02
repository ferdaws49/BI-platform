import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Existing
import { Finance } from './entities/finance.entity';
import { Formation } from '../formations/entities/formation.entity';

// New directeur-specific service + controller
import { FinanceDirecteurService } from './Finance.directeur.service';
import { FinanceDirecteurController } from './Finance. directeur.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Finance, Formation])],
  controllers: [
    // ... tes controllers existants +
    FinanceDirecteurController,
  ],
  providers: [
    // ... tes services existants +
    FinanceDirecteurService,
  ],
  exports: [FinanceDirecteurService], // pour AlertsModule plus tard
})
export class FinancesModule {}