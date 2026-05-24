import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
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
    private readonly dataSource: DataSource,
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

    const rawRows = await this.dataSource.query(`
      WITH session_inscrits AS (
        SELECT 
          f.sk_session,
          COUNT(DISTINCT f.sk_apprenant) as inscrits
        FROM dw.fact_finance f
        JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
        WHERE t.date_key BETWEEN $1 AND $2
          AND f.sk_apprenant != -1
        GROUP BY f.sk_session
      ),
      session_revenue AS (
        SELECT 
          f.sk_session,
          COALESCE(SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END), 0) as collected_amount
        FROM dw.fact_finance f
        JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
        JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
        WHERE t.date_key BETWEEN $1 AND $2
        GROUP BY f.sk_session
      ),
      session_couts AS (
        SELECT 
          f.sk_session,
          COALESCE(SUM(CASE WHEN tf.type = 'depense_formateur' THEN -f.montant ELSE 0 END), 0) as trainer_cost,
          COALESCE(SUM(CASE WHEN tf.type = 'depense_logistique' THEN -f.montant ELSE 0 END), 0) as logistics_cost
        FROM dw.fact_finance f
        JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
        JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
        WHERE t.date_key BETWEEN $1 AND $2
        GROUP BY f.sk_session
      ),
      session_formation AS (
        SELECT DISTINCT ON (f.sk_session)
          f.sk_session,
          df.titre as formation_name
        FROM dw.fact_finance f
        JOIN dw.dim_formation df ON f.sk_formation = df.sk_formation
        ORDER BY f.sk_session, f.id_fact_finance
      )
      SELECT 
        ds.session_id as "sessionId",
        COALESCE(ds.titre, ds.type_session, 'Session sans nom') as "sessionName",
        ds.date as "sessionDate",
        COALESCE(sf.formation_name, 'Formation inconnue') as "formationName",
        COALESCE(ds.prix_session, 0) as "unitPrice",
        COALESCE(sc.trainer_cost, 0) as "trainerCost",
        COALESCE(sc.logistics_cost, 0) as "logisticsCost",
        ds.capacite as "capacite",
        COALESCE(si.inscrits, 0) as "inscrits",
        COALESCE(sr.collected_amount, 0) as "collectedAmount"
      FROM dw.dim_session ds
      LEFT JOIN session_inscrits si ON si.sk_session = ds.sk_session
      LEFT JOIN session_revenue sr ON sr.sk_session = ds.sk_session
      LEFT JOIN session_couts sc ON sc.sk_session = ds.sk_session
      LEFT JOIN session_formation sf ON sf.sk_session = ds.sk_session
      WHERE ds.session_id != '00000000-0000-0000-0000-000000000000'
        AND ds.date BETWEEN $1 AND $2
    `, [sd, ed]);

    return rawRows.map((row) => {
      const collectedAmount = Number(row.collectedAmount) || 0;
      const unitPrice = parseFloat(row.unitPrice) || 0;
      const trainerCost = parseFloat(row.trainerCost) || 0;
      const logisticsCost = parseFloat(row.logisticsCost) || 0;
      const cost = trainerCost + logisticsCost;
      const margin = collectedAmount - cost;
      const inscrits = parseInt(row.inscrits) || 0;
      const expectedRevenue = unitPrice * inscrits;
      const recoveryRate = expectedRevenue > 0 ? Number(((collectedAmount / expectedRevenue) * 100).toFixed(2)) : 0;
      const capacite = parseInt(row.capacite) || 0;
      const fillRate = capacite > 0 ? (inscrits / capacite) * 100 : 0;
      const status = this.resolveSessionStatus(margin);

      return {
        sessionName: row.sessionName || 'Session sans nom',
        formationName: row.formationName || 'Formation inconnue',
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

  private async computeKpis(
    rows: FinanceReportSessionRowDto[],
    range: DateRange,
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
      performanceVsPreviousPeriod: Number(performanceVsPreviousPeriod.toFixed(2)),
    };
  }

  private async computeRevenuePerformance(range: DateRange, currentRevenue: number): Promise<number> {
    const duration = range.endDate.getTime() - range.startDate.getTime();
    const prevStart = new Date(range.startDate.getTime() - duration);
    const prevEnd = new Date(range.endDate.getTime() - duration);

    const prevStartStr = prevStart.toISOString().split('T')[0];
    const prevEndStr = prevEnd.toISOString().split('T')[0];

    const result = await this.dataSource.query(`
      SELECT COALESCE(SUM(f.montant), 0) as total
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE tf.type = 'paiement'
        AND t.date_key BETWEEN $1 AND $2
    `, [prevStartStr, prevEndStr]);

    const previousRevenue = parseFloat(result[0]?.total) || 0;

    if (previousRevenue <= 0) return currentRevenue > 0 ? 100 : 0;
    return ((currentRevenue - previousRevenue) / previousRevenue) * 100;
  }

  private resolveDateRange(filter: FinanceReportFilterDto): DateRange {
    const now = new Date();
    if (filter.period === FinanceReportPeriod.CUSTOM && filter.startDate && filter.endDate) {
      return { startDate: new Date(filter.startDate), endDate: new Date(filter.endDate) };
    }
    return { startDate: new Date(now.getFullYear(), now.getMonth(), 1), endDate: now };
  }

  private generateCsv(report: FinanceReportResponseDto): Buffer {
    const csvLines: string[] = [];
    csvLines.push('KPI,Value');
    csvLines.push(`Revenue,${report.kpis.revenue}`);
    csvLines.push(`Cost,${report.kpis.cost}`);
    csvLines.push(`Margin,${report.kpis.margin}`);
    csvLines.push(`Recovery Rate,${report.kpis.recoveryRate}`);
    csvLines.push(`Performance vs Previous Period,${report.kpis.performanceVsPreviousPeriod}`);
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