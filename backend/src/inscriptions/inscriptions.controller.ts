import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { InscriptionsService } from './inscriptions.service';

@Controller('admin/inscriptions')
export class InscriptionsController {
  constructor(private readonly inscriptionsService: InscriptionsService) {}

  @Get()
  findAllPending(@Query('status') status: string) {
    if (status === 'pending') {
      return this.inscriptionsService.findAllPending();
    }
    // Tu peux ajouter d'autres filtres si besoin
    return this.inscriptionsService.findAllPending();
  }

  @Patch(':id/accept')
  accept(@Param('id') id: string) {
    return this.inscriptionsService.accept(+id);
  }

  @Patch('approve-all')
  approveAll(@Body() body: { ids: number[] }) {
    return this.inscriptionsService.approveAll(body.ids);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.inscriptionsService.reject(+id);
  }
}
