import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
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

  // Existant — inchangé
  @Get()
  findAll() {
    return this.formateursService.findAll();
  }

  // ➕ Nouveau — DOIT être avant @Get(':id') sinon NestJS parse
  //    "performances" comme un id et retourne une 400/404
  @Get('performances')
  getPerformances(
    @Query('periode') periode?: string,
    @Query('formation') formation?: string,
    @Query('formateur') formateur?: string,
    @Query('statut') statut?: string,
  ) {
    return this.formateursService.getPerformances({
      periode,
      formation,
      formateur,
      statut,
    });
  }

  // Existant — inchangé
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
