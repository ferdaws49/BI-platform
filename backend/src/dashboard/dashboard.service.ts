import { Injectable } from '@nestjs/common';
import { DirecteurDashboardService } from './services/directeur.dashboard.service';
import { PaginationFilterDto } from './dto/dashboard-filter.dto';

// Router simple — délègue tout à DirecteurDashboardService
// ✅ v3: tous les filtres sont maintenant passés à chaque méthode

@Injectable()
export class DashboardService {
  constructor(
    private readonly directeurService: DirecteurDashboardService,
  ) {}

  getOverview(user: any, filters: PaginationFilterDto) {
    return this.directeurService.getOverview(filters);
  }

  getKpis(user: any, filters: PaginationFilterDto) {
    return this.directeurService.getKpis(filters);
  }

  getEnrollmentsChart(user: any, filters: PaginationFilterDto) {
    return this.directeurService.getEnrollmentsChart(filters);
  }

  getRevenueChart(user: any, filters: PaginationFilterDto) {
    return this.directeurService.getRevenueChart(filters);
  }

  getCoursesChart(user: any, filters: PaginationFilterDto) {
    return this.directeurService.getCoursesChart(filters);
  }

  getTopCourses(user: any, filters: PaginationFilterDto) {
    return this.directeurService.getTopCourses(filters);
  }

  getTopStudents(user: any, filters: PaginationFilterDto) {
    return this.directeurService.getTopStudents(filters);
  }

  getRecentEnrollments(user: any, filters: PaginationFilterDto) {
    return this.directeurService.getRecentEnrollments(filters);
  }

  getAlerts(user: any) {
    return this.directeurService.getAlerts();
  }
}