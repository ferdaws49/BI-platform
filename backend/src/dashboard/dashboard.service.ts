import { Injectable } from '@nestjs/common';
import { DirecteurDashboardService } from './services/directeur.dashboard.service';
import { PaginationFilterDto } from './dto/dashboard-filter.dto';

// Ce service est un simple ROUTER — il délègue tout à DirecteurDashboardService
// Quand tu ajoutes FormateurDashboardService ou AdminDashboardService,
// tu ajoutes juste un case ici.

@Injectable()
export class DashboardService {
  constructor(
    private readonly directeurService: DirecteurDashboardService,
  ) {}

  // ── Dashboard principal ────────────────────────────────────────────────────
  getOverview(user: any) {
    return this.directeurService.getOverview();
  }

  getKpis(user: any) {
    return this.directeurService.getKpis();
  }

  // ── Charts ─────────────────────────────────────────────────────────────────
  getEnrollmentsChart(user: any) {
    return this.directeurService.getEnrollmentsChart();
  }

  getRevenueChart(user: any) {
    return this.directeurService.getRevenueChart();
  }

  getCoursesChart(user: any) {
    return this.directeurService.getCoursesChart();
  }

  // ── Tables ─────────────────────────────────────────────────────────────────
  getTopCourses(user: any, filters: PaginationFilterDto) {
    return this.directeurService.getTopCourses(filters);
  }

  getTopStudents(user: any, filters: PaginationFilterDto) {
    return this.directeurService.getTopStudents(filters);
  }

  getRecentEnrollments(user: any, filters: PaginationFilterDto) {
    return this.directeurService.getRecentEnrollments(filters);
  }

  

  // ── Alertes ────────────────────────────────────────────────────────────────
  getAlerts(user: any) {
    return this.directeurService.getAlerts();
  }
}