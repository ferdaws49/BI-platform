import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Finance, FinanceType } from '../entities/finance.entity';
import { Formation } from 'src/formations/entities/formation.entity';
import { Session } from 'src/sessions/entities/session.entity';
import { Between, Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import {
  FinanceReportFilterDto,
  FinanceReportPeriod,
} from '../dto/finance-report-filter.dto';
import { FinanceReportExportQueryDto } from '../dto/finance-report-export.dto';
import { FinanceExportFormat } from 'src/utils/enums';
import {
  FinanceReportKpisDto,
  FinanceReportResponseDto,
  FinanceReportSessionRowDto,
  SessionFinancialStatus,
} from '../dto/finance-report-response.dto';


type DateRange = { startDate: Date; endDate: Date };

@Injectable()
export class FinanceReportingService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Finance)
    private readonly financeRepository: Repository<Finance>,
  ) {}

  async getPreviewReport(filter: FinanceReportFilterDto): Promise<FinanceReportResponseDto> {
    const fullReport = await this.buildFullReport(filter);
    return {
      kpis: fullReport.kpis,
      sessions: fullReport.sessions.slice(0, 5),
    };
  }

  async exportReport(
    dto: FinanceReportExportQueryDto,
  ): Promise<{ content: Buffer; mimeType: string; fileName: string }> {
    const report = await this.buildFullReport(dto);
    const now = new Date().toISOString().slice(0, 10);

    if (dto.format === FinanceExportFormat.CSV) {
      return {
        content: this.generateCsv(report),
        mimeType: 'text/csv',
        fileName: `finance-report-${now}.csv`,
      };
    }

    if (dto.format === FinanceExportFormat.EXCEL) {
      return {
        content: await this.generateExcel(report),
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileName: `finance-report-${now}.xlsx`,
      };
    }

    return {
      content: await this.generatePdf(report),
      mimeType: 'application/pdf',
      fileName: `finance-report-${now}.pdf`,
    };
  }

  private async buildFullReport(
    filter: FinanceReportFilterDto,
  ): Promise<FinanceReportResponseDto> {
    const range = this.resolveDateRange(filter);
    const allSessions = await this.loadSessionRows(range);
    const sortedSessions = allSessions.sort((a, b) => b.revenue - a.revenue);
    const kpis = await this.computeKpis(sortedSessions, range);

    return {
      kpis,
      sessions: sortedSessions,
    };
  }

  private async loadSessionRows(range: DateRange): Promise<FinanceReportSessionRowDto[]> {
    const sd = range.startDate.toISOString().split('T')[0];
    const ed = range.endDate.toISOString().split('T')[0];

    const qb = this.sessionRepository.createQueryBuilder('s')
      .leftJoin('s.formation', 'fo')
      .select([
        's.id AS "sessionId"',
        's.title AS "sessionName"',
        's.date AS "sessionDate"',
        'fo.titre AS "formationName"',
        'COALESCE(s.prix, fo.prix, 0) AS "unitPrice"',
        'COALESCE(s.cout_formateur, 0) AS "trainerCost"',
        'COALESCE(s.cout_logistique, 0) AS "logisticsCost"',
        's.capacite AS "capacite"',
      ]);
      qb.addSelect(sub => {
        return sub.select('COUNT(*)', 'count').from('sessions_apprenants', 'sa').where('sa.sessionId = s.id');
      }, 'inscrits');

       // Sous-requête pour le CA ENCAISSÉ (Finances)
       qb.addSelect(sub => {
        return sub.select('SUM(fin.montant)', 'sum')
        .from('finances', 'fin') // Table exacte : finances
        .where('fin.sessionId = s.id')
        .andWhere('fin.type = :type', { type: FinanceType.PAIEMENT });
       }, 'collectedAmount');
       // Filtre sur la date de session
       qb.where('CAST(s.date AS DATE) BETWEEN :sd AND :ed', { sd, ed });

    const rawRows = await qb.getRawMany();

    return rawRows.map((row) => {
        const collectedAmount = Number(row.collectedAmount);
        const unitPrice = parseFloat(row.unitPrice) || 0;
        const invoicedRevenue = Number(row.revenue);
        const cost =parseFloat(row.trainerCost) + parseFloat(row.logisticsCost);
        const margin = collectedAmount - cost;
        const inscrits = parseInt(row.inscrits);
        const expectedRevenue = unitPrice * inscrits;
        const recoveryRate = expectedRevenue > 0 ? Number(((collectedAmount / expectedRevenue) * 100).toFixed(2)) : 0;
        const capacite = parseInt(row.capacite);
        const fillRate = capacite > 0 ? (inscrits / capacite) * 100 : 0;
        const status = this.resolveSessionStatus(margin);

      return {
        sessionName: row.sessionName || 'Session sans nom',
        formationName: row.formationName,
        inscrits,
        capacite,
        revenue: collectedAmount,
        expectedPerSession: unitPrice,
        cost,
        margin,
        recoveryRate,
        fillRate,
        status,
      };
    });
  }

  private async computeKpis(rows: FinanceReportSessionRowDto[], range: DateRange,
  ): Promise<FinanceReportKpisDto> {
    const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    const cost = rows.reduce((sum, row) => sum + row.cost, 0);
    const totalExpected = rows.reduce((sum, row) => sum + (row.expectedPerSession * row.inscrits), 0);
    const margin = revenue - cost;
    const recoveryRate = totalExpected > 0 ? (revenue / totalExpected) * 100 : 0;
    const performanceVsPreviousPeriod = await this.computeRevenuePerformance(range, revenue);

    return {
      revenue: Number(revenue.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      margin: Number(margin.toFixed(2)),
      recoveryRate: Number(recoveryRate.toFixed(2)),
      performanceVsPreviousPeriod : Number(performanceVsPreviousPeriod.toFixed(2)),
    };
  }

  private async computeRevenuePerformance(range: DateRange, currentRevenue: number): Promise<number> {
    const duration = range.endDate.getTime() - range.startDate.getTime();
    const prevStart = new Date(range.startDate.getTime() - duration);
    const prevEnd = new Date(range.endDate.getTime() - duration);

    const result = await this.financeRepository.createQueryBuilder('f')
      .select('SUM(f.montant)', 'total')
      .where('f.type = :type', { type: FinanceType.PAIEMENT })
      .andWhere('f.date BETWEEN :start AND :end', { start: prevStart, end: prevEnd })
      .getRawOne();

    const previousRevenue = parseFloat(result?.total) || 0;

    if (previousRevenue <= 0) return currentRevenue > 0 ? 100 : 0;
    return ((currentRevenue - previousRevenue) / previousRevenue) * 100;
  }



  private resolveDateRange(filter: FinanceReportFilterDto): DateRange {
    const now = new Date();
    if (filter.period === FinanceReportPeriod.CUSTOM && filter.startDate && filter.endDate) {
      return { startDate: new Date(filter.startDate), endDate: new Date(filter.endDate) };
    }
    // ... reste de votre logique de période ...
    return { startDate: new Date(now.getFullYear(), now.getMonth(), 1), endDate: now };
  }



  private generateCsv(report: FinanceReportResponseDto): Buffer {
    const csvLines: string[] = [];
    csvLines.push('KPI,Value');
    csvLines.push(`Revenue,${report.kpis.revenue}`);
    csvLines.push(`Cost,${report.kpis.cost}`);
    csvLines.push(`Margin,${report.kpis.margin}`);
    csvLines.push(`Recovery Rate,${report.kpis.recoveryRate}`);
    csvLines.push(
      `Performance vs Previous Period,${report.kpis.performanceVsPreviousPeriod}`,
    );
    csvLines.push('');
    csvLines.push(
      'Session,Formation,Inscrits,Capacite,CA (Revenue),Cost,Margin,Recovery Rate,Fill Rate,Status',
    );
    for (const row of report.sessions) {
      csvLines.push(
        [
          this.escapeCsv(row.sessionName),
          this.escapeCsv(row.formationName),
          row.inscrits,
          row.capacite,
          row.revenue,
          row.cost,
          row.margin,
          row.recoveryRate,
          row.fillRate,
          row.status,
        ].join(','),
      );
    }

    return Buffer.from(csvLines.join('\n'));
  }

  private async generateExcel(report: FinanceReportResponseDto): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const kpiSheet = workbook.addWorksheet('KPIs');
    kpiSheet.addRow(['Metric', 'Value']);
    kpiSheet.addRow(['Revenue', report.kpis.revenue]);
    kpiSheet.addRow(['Cost', report.kpis.cost]);
    kpiSheet.addRow(['Margin', report.kpis.margin]);
    kpiSheet.addRow(['Recovery Rate', report.kpis.recoveryRate]);
    kpiSheet.addRow([
      'Performance vs Previous Period',
      report.kpis.performanceVsPreviousPeriod,
    ]);

    const tableSheet = workbook.addWorksheet('Sessions');
    tableSheet.columns = [
      { header: 'Session', key: 'sessionName', width: 30 },
      { header: 'Formation', key: 'formationName', width: 30 },
      { header: 'Inscrits', key: 'inscrits', width: 10 },
      { header: 'Capacite', key: 'capacite', width: 10 },
      { header: 'CA (Revenue)', key: 'revenue', width: 16 },
      { header: 'Cost', key: 'cost', width: 16 },
      { header: 'Margin', key: 'margin', width: 14 },
      { header: 'Recovery Rate', key: 'recoveryRate', width: 14 },
      { header: 'Fill Rate', key: 'fillRate', width: 12 },
      { header: 'Status', key: 'status', width: 14 },
    ];
    tableSheet.addRows(report.sessions);

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  private async generatePdf(report: FinanceReportResponseDto): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    doc.fontSize(18).text('Financial Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Revenue: ${report.kpis.revenue.toFixed(2)}`);
    doc.text(`Cost: ${report.kpis.cost.toFixed(2)}`);
    doc.text(`Margin: ${report.kpis.margin.toFixed(2)}`);
    doc.text(`Recovery Rate: ${report.kpis.recoveryRate.toFixed(2)}%`);
    doc.text(
      `Performance vs Previous Period: ${report.kpis.performanceVsPreviousPeriod.toFixed(2)}%`,
    );

    doc.moveDown();
    doc.fontSize(13).text('Sessions');
    doc.moveDown(0.5);
    doc.fontSize(10);
    for (const row of report.sessions) {
      doc.text(
        `${row.sessionName} | ${row.formationName} | CA (Rev) ${row.revenue.toFixed(2)} | cost ${row.cost.toFixed(2)} | margin ${row.margin.toFixed(2)} | ${row.status}`,
      );
    }

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private escapeCsv(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private resolveSessionStatus(margin: number): SessionFinancialStatus {
    if (margin > 0) {
      return SessionFinancialStatus.RENTABLE;
    }
    if (margin === 0) {
      return SessionFinancialStatus.SEUIL;
    }
    return SessionFinancialStatus.DEFICITAIRE;
  }
}
