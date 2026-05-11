// import/import.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ImportJob } from './entities/import-job.entity';

@Module({
  imports: [
    // Enregistre ImportJob pour injection via @InjectRepository
    TypeOrmModule.forFeature([ImportJob]),
  ],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
