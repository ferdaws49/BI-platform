import { Controller, Get, Post, Body, Res, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DashboardService } from './dashboard.service';
import { PaginationFilterDto } from './dto/dashboard-filter.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('directeur')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    
  ) {}

  // ══════════════════════════════════════════════════════════════════
  // DASHBOARD PRINCIPAL
  // ══════════════════════════════════════════════════════════════════

  @Get('overview')
  getOverview(@Request() req) {
    return this.dashboardService.getOverview(req.user);
  }

  @Get('kpis')
  getKpis(@Request() req) {
    return this.dashboardService.getKpis(req.user);
  }

  // ══════════════════════════════════════════════════════════════════
  // CHARTS
  // ══════════════════════════════════════════════════════════════════

  @Get('charts/enrollments')
  getEnrollmentsChart(@Request() req) {
    return this.dashboardService.getEnrollmentsChart(req.user);
  }

  @Get('charts/revenue')
  getRevenueChart(@Request() req) {
    return this.dashboardService.getRevenueChart(req.user);
  }

  @Get('charts/courses')
  getCoursesChart(@Request() req) {
    return this.dashboardService.getCoursesChart(req.user);
  }

  // ══════════════════════════════════════════════════════════════════
  // TABLES avec filtres complets
  // ══════════════════════════════════════════════════════════════════

  @Get('top-courses')
  getTopCourses(@Request() req, @Query() query: PaginationFilterDto) {
    return this.dashboardService.getTopCourses(req.user, query);
  }

  @Get('top-students')
  getTopStudents(@Request() req, @Query() query: PaginationFilterDto) {
    return this.dashboardService.getTopStudents(req.user, query);
  }

  @Get('recent-enrollments')
  getRecentEnrollments(@Request() req, @Query() query: PaginationFilterDto) {
    return this.dashboardService.getRecentEnrollments(req.user, query);
  }

  

  

  // ══════════════════════════════════════════════════════════════════
  // PAGE ALERTES
  // ══════════════════════════════════════════════════════════════════

  @Get('alerts')
  getAlerts(@Request() req) {
    return this.dashboardService.getAlerts(req.user);
  }
  
}