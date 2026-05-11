import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DashboardService } from './dashboard.service';
import { PaginationFilterDto } from './dto/dashboard-filter.dto';
import { DirecteurReportsService } from './services/directeur.reports.service';
import { ReportFiltersDto } from './dto/report-filters.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('directeur')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly reportsService: DirecteurReportsService,
  ) {}

  // ── Overview & KPIs ────────────────────────────────────────────────────────
  // ✅ v3: @Query() ajouté — les filtres sont maintenant lus depuis l'URL

  @Get('overview')
  getOverview(@Request() req, @Query() query: PaginationFilterDto) {
    return this.dashboardService.getOverview(req.user, query);
  }

  @Get('kpis')
  getKpis(@Request() req, @Query() query: PaginationFilterDto) {
    return this.dashboardService.getKpis(req.user, query);
  }

  // ── Charts ─────────────────────────────────────────────────────────────────

  @Get('charts/enrollments')
  getEnrollmentsChart(@Request() req, @Query() query: PaginationFilterDto) {
    return this.dashboardService.getEnrollmentsChart(req.user, query);
  }

  @Get('charts/revenue')
  getRevenueChart(@Request() req, @Query() query: PaginationFilterDto) {
    return this.dashboardService.getRevenueChart(req.user, query);
  }

  @Get('charts/courses')
  getCoursesChart(@Request() req, @Query() query: PaginationFilterDto) {
    return this.dashboardService.getCoursesChart(req.user, query);
  }

  // ── Tables ─────────────────────────────────────────────────────────────────

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
   // ── Alertes ────────────────────────────────────────────────────────────────

  @Get('alerts')
  getAlerts(@Request() req) {
    return this.dashboardService.getAlerts(req.user);
  }
  // Nouvel endpoint — ajouter après les endpoints existants //

@Get('reports')
getReports(@Query() filters: ReportFiltersDto) {
  return this.reportsService.getReports(filters);
}
  
}