// performances/performances.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Performance } from './entities/performance.entity';
import { PerformanceService } from './performances.service';
import { PerformanceController } from './performances.controller';
import { User } from 'src/users/users.entity';
import { Formation } from 'src/formations/entities/formation.entity';
import { Session } from 'src/sessions/entities/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Performance, Formation, User, Session])],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [TypeOrmModule],
})
export class PerformanceModule {}