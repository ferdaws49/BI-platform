import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { ApprenantsService } from './apprenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/apprenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ApprenantsController {
  constructor(private readonly apprenantsService: ApprenantsService) {}

  @Get()
  findAll() {
    return this.apprenantsService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.apprenantsService.remove(+id);
  }
}
