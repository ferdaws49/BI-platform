import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { FilterSessionDto } from './dto/filter-session.dto';
import { ConflictCheckDto } from './dto/conflict-check.dto';
import { MarquerPresenceDto } from './dto/marquer-presence.dto';

// Le controller expose les routes HTTP.
// La logique metier reste centralisee dans `SessionsService`.
@Controller('responsable/sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('resp_pedagogique')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  // Cette route doit rester avant `:id`,
  // sinon NestJS peut interprete `check-conflict` comme un UUID.
  @Get('check-conflict')
  checkConflict(@Query() dto: ConflictCheckDto) {
    return this.sessionsService.checkConflicts(dto);
  }

  // Liste des sessions avec filtres optionnels.
  @Get()
  findAll(@Query() filters: FilterSessionDto) {
    return this.sessionsService.findAll(filters);
  }

  // Creation d'une nouvelle session.
  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.sessionsService.create(dto);
  }

  // Mise a jour d'une session existante.
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessionsService.update(id, dto);
  }

  // Annulation logique ou suppression physique selon le paramètre `hard`
  @Delete(':id')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('hard') hard?: string,
  ) {
    if (hard === 'true') {
      return this.sessionsService.remove(id);
    }
    return this.sessionsService.cancel(id);
  }

  // Retourne les presences deja enregistrees pour la session.
  @Get(':id/presences')
  getPresences(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.getPresences(id);
  }

  // Cree ou met a jour les lignes de presence envoyees.
  @Post(':id/presences')
  upsertPresences(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarquerPresenceDto[],
  ) {
    return this.sessionsService.upsertPresences(id, dto);
  }

  
}
