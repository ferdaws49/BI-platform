// src/results/results.controller.ts

import { Controller, Get, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { CurrentUser } from "src/users/decorators/current-user.decorator";
import { PerformanceService } from "./performances.service";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller('results')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  // GET: ~/results/student 
  @Get('summary')
  async getMyResults(@CurrentUser() user: any) {
    return this.performanceService.getStudentGlobalResults(user.userId);
  }

 
  // GET: ~/results/formation/1 
  @Get('formation/:id')
  async getFormationResults(
    @Param('id', ParseIntPipe) formationId: number,
    @CurrentUser('id') user: any
  ) {
    return this.performanceService.getResultsByFormation(user.userId, formationId);
  }

  
}