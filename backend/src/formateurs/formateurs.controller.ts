import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FormateursService } from './formateurs.service';
import { CreateFormateurDto } from './dto/create-formateur.dto';
import { UpdateFormateurDto } from './dto/update-formateur.dto';

@Controller('responsable/formateurs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('resp_pedagogique', 'admin')
export class FormateursController {
  constructor(private readonly formateursService: FormateursService) {}

  @Get()
  findAll() {
    return this.formateursService.findAll();
  }

  @Post()
  create(@Body() dto: CreateFormateurDto) {
    return this.formateursService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFormateurDto) {
    return this.formateursService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.formateursService.delete(id);
  }
}