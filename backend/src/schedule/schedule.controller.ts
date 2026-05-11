import { Controller, Get, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { SchedulesService } from './schedule.service';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FilterScheduleDto } from './dtos/schedule-filter.dto';

@UseGuards(JwtAuthGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  // GET /schedules/student?start=2026-03-01&end=2026-03-31
  @Get('student')
  async getMySchedule(
    @CurrentUser() user: any,
     @Query() filterDto: FilterScheduleDto
  ) {
    return this.schedulesService.getStudentSchedule(user.userId, filterDto);
  }

  // GET /schedules/formation/1
  @Get('formation/:id')
  async getFormationSchedule(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) formationId: number
) {
    return this.schedulesService.getScheduleByFormation(user.userId, formationId);
  }
}