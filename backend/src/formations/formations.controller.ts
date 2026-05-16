import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FormationsService } from './formations.service';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
@Controller('responsable/formations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('resp_pedagogique', 'admin')
export class FormationsController {
  constructor(private readonly formationsService: FormationsService) {}

  @Get()
  findAll() {
    return this.formationsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateFormationDto) {
    return this.formationsService.create(dto);
  }

  @Patch(':id')
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateFormationDto,
) {
  return this.formationsService.update(id, dto);
}

@Delete(':id')
delete(@Param('id', ParseIntPipe) id: number) {
  return this.formationsService.delete(id);
}
}