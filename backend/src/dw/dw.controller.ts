import { Controller, Post } from '@nestjs/common';
import { EtlService } from './etl.service';

@Controller('dw')
export class DwController {
  constructor(private readonly etlService: EtlService) {}

  @Post('refresh')
  async refreshDW() {
    await this.etlService.runETL();

    return {
      message: 'DW refreshed successfully',
    };
  }
}