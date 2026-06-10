// src/results/results.controller.ts

import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from "@nestjs/common";
import { CurrentUser } from "src/users/decorators/current-user.decorator";
import { PerformanceService } from "./performances.service";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/auth/roles.decorator";
import { RolesGuard } from "src/auth/guards/roles.guard";

@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('apprenant')
@Controller('results')

export class PerformanceController {
  constructor(
    private readonly performanceService: PerformanceService,
  ) {}

  // GET: ~/results/student 
  @Get('summary')
  async getMyResults(@CurrentUser() user: any) {
    return this.performanceService.getStudentGlobalResults(user.userId);
  }

 
  // GET: ~/results/formation/1 
  @Get('formation/:id')
  async getFormationResults(
    @Param('id', ParseIntPipe) formationId: number,
    @CurrentUser() user: any
  ) {
    return this.performanceService.getResultsByFormation(user.userId, formationId);
  }

  @Get('mes-notes')
  async getMesNotes(@Req() req) {
    return this.performanceService.getMesNotes(req.user.userId);
  }

  
}