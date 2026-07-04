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

// Alias de type pour l'instance PDFDocument (évite l'erreur TS2749)
type PDFKitDocument = InstanceType<typeof PDFDocument>;

interface PdfColumn {
  header: string;
  key: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  format?: (val: any) => string;
}

@Injectable()
export class FinanceReportingService {
  constructor(private readonly dataSource: DataSource) {}

  async getPreviewReport(
    filter: FinanceReportFilterDto,
  ): Promise<FinanceReportResponseDto> {
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
        mimeType: 'text/csv; charset=utf-8',
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

  private async loadSessionRows(
    range: DateRange,
  ): Promise<FinanceReportSessionRowDto[]> {
    const sd = range.startDate.toISOString().split('T')[0];
    const ed = range.endDate.toISOString().split('T')[0];

    const rawRows = await this.dataSource.query(
      `
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
          COALESCE(SUM(CASE WHEN tf.type = 'paiement' THEN ABS(f.montant) ELSE 0 END), 0) as collected_amount
        FROM dw.fact_finance f
        JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
        JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
        WHERE t.date_key BETWEEN $1 AND $2
        GROUP BY f.sk_session
      ),
      session_couts AS (
        SELECT 
          f.sk_session,
          COALESCE(SUM(CASE WHEN tf.type = 'depense_formateur' THEN ABS(f.montant) ELSE 0 END), 0) as trainer_cost,
          COALESCE(SUM(CASE WHEN tf.type = 'depense_logistique' THEN ABS(f.montant) ELSE 0 END), 0) as logistics_cost
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
    `,
      [sd, ed],
    );

    return rawRows.map((row) => {
      const collectedAmount = Number(row.collectedAmount) || 0;
      const unitPrice = parseFloat(row.unitPrice) || 0;
      const trainerCost = parseFloat(row.trainerCost) || 0;
      const logisticsCost = parseFloat(row.logisticsCost) || 0;
      const cost = trainerCost + logisticsCost;
      const margin = collectedAmount - cost;
      const inscrits = parseInt(row.inscrits) || 0;
      const expectedRevenue = unitPrice * inscrits;
      const recoveryRate =
        expectedRevenue > 0
          ? Number(((collectedAmount / expectedRevenue) * 100).toFixed(2))
          : 0;
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
    const start = range.startDate.toISOString().split('T')[0];
    const end = range.endDate.toISOString().split('T')[0];

    const revenue = await this.sumFinanceByTypes(start, end, ['paiement']);
    const cost = await this.sumFinanceByTypes(start, end, [
      'depense_formateur',
      'depense_logistique',
    ]);
    const totalExpected = await this.sumFactureTotal(start, end);
    const margin = revenue - cost;
    const recoveryRate = totalExpected > 0 ? (revenue / totalExpected) * 100 : 0;
    const performanceVsPreviousPeriod = await this.computeRevenuePerformance(
      range,
      revenue,
    );

    return {
      revenue: Number(revenue.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      margin: Number(margin.toFixed(2)),
      recoveryRate: Number(recoveryRate.toFixed(2)),
      performanceVsPreviousPeriod: Number(
        performanceVsPreviousPeriod.toFixed(2),
      ),
    };
  }

  private async computeRevenuePerformance(
    range: DateRange,
    currentRevenue: number,
  ): Promise<number> {
    const duration = range.endDate.getTime() - range.startDate.getTime();
    const prevStart = new Date(range.startDate.getTime() - duration);
    const prevEnd = new Date(range.endDate.getTime() - duration);

    const prevStartStr = prevStart.toISOString().split('T')[0];
    const prevEndStr = prevEnd.toISOString().split('T')[0];

    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(ABS(f.montant)), 0) as total
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE tf.type = 'paiement'
        AND t.date_key BETWEEN $1 AND $2
    `,
      [prevStartStr, prevEndStr],
    );

    const previousRevenue = parseFloat(result[0]?.total) || 0;

    if (previousRevenue <= 0) return currentRevenue > 0 ? 100 : 0;
    return Number(((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(2));
  }

  private async sumFinanceByTypes(
    start: string,
    end: string,
    types: string[],
  ): Promise<number> {
    const params: any[] = [start, end, types];
    const res = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(ABS(f.montant)), 0) as total
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE t.date_key BETWEEN $1 AND $2
        AND tf.type = ANY($3)
    `,
      params,
    );

    return parseFloat(res[0]?.total) || 0;
  }

  private async sumFactureTotal(start: string, end: string): Promise<number> {
    const res = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(ABS(f.montant)), 0) as total
      FROM dw.fact_finance f
      JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
      JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
      WHERE t.date_key BETWEEN $1 AND $2
        AND tf.type IN ('paiement', 'impaye')
        AND f.sk_apprenant != -1
    `,
      [start, end],
    );

    return parseFloat(res[0]?.total) || 0;
  }

  private resolveDateRange(filter: FinanceReportFilterDto): DateRange {
    const now = new Date();
    
    if (
      filter.period === FinanceReportPeriod.CUSTOM &&
      filter.startDate &&
      filter.endDate
    ) {
      return {
        startDate: new Date(filter.startDate),
        endDate: new Date(filter.endDate),
      };
    }

    // Align with Dashboard/Revenue defaults: use CURRENT_YEAR by default
    let startDate: Date;
    switch (filter.period) {
      case FinanceReportPeriod.CURRENT_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case FinanceReportPeriod.CURRENT_QUARTER: {
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      }
      case FinanceReportPeriod.CURRENT_YEAR:
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    return {
      startDate,
      endDate: now,
    };
  }

  /* =========================================================
   *  PDF PROFESSIONNEL
   * ========================================================= */
  private async generatePdf(
    report: FinanceReportResponseDto,
  ): Promise<Buffer> {
    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
      layout: 'landscape',
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const primaryColor = '#1f4e79';
    const accentColor = '#2e7d32';
    const dangerColor = '#c62828';
    const warningColor = '#f9a825';
    const bgHeader = '#1f4e79';
    const bgRow = '#f5f5f5';
    const textColor = '#333333';
    const lightText = '#777777';

    // --- EN-TÊTE ---
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(22).text('RAPPORT FINANCIER', 40, 35);
    doc.fillColor(lightText).font('Helvetica').fontSize(10)
      .text(`Édité le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 40, 62);
    doc.moveTo(40, 80).lineTo(802, 80).strokeColor(primaryColor).lineWidth(2).stroke();

    // --- SECTION KPIs ---
    let y = 100;
    doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('INDICATEURS CLÉS DE PERFORMANCE', 40, y);
    y += 22;

    const kpiRows = [
      { label: 'Chiffre d\'affaires total', value: `${report.kpis.revenue.toFixed(2)} DT`, color: primaryColor },
      { label: 'Coûts totaux', value: `${report.kpis.cost.toFixed(2)} DT`, color: dangerColor },
      { label: 'Marge nette', value: `${report.kpis.margin.toFixed(2)} DT`, color: report.kpis.margin >= 0 ? accentColor : dangerColor },
      { label: 'Taux de recouvrement', value: `${report.kpis.recoveryRate.toFixed(2)} %`, color: primaryColor },
      { label: 'Performance vs période précédente', value: `${report.kpis.performanceVsPreviousPeriod.toFixed(2)} %`, color: primaryColor },
    ];

    const kpiCols: PdfColumn[] = [
      { header: 'Métrique', key: 'label', width: 320, align: 'left' },
      { header: 'Valeur', key: 'value', width: 180, align: 'right' },
    ];
    y = this.drawPdfTable(doc, kpiCols, kpiRows, 40, y, {
      headerBg: bgHeader,
      headerText: '#ffffff',
      rowBg: bgRow,
      text: textColor,
      alternateRowBg: '#ffffff',
      rowHeight: 22,
    });

    // --- SECTION SESSIONS ---
    y += 18;
    doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('DÉTAIL PAR SESSION', 40, y);
    y += 22;

    const sessionCols: PdfColumn[] = [
      { header: 'Session', key: 'sessionName', width: 130, align: 'left' },
      { header: 'Formation', key: 'formationName', width: 120, align: 'left' },
      { header: 'Insc.', key: 'inscrits', width: 40, align: 'center' },
      { header: 'Cap.', key: 'capacite', width: 40, align: 'center' },
      { header: 'CA (DT)', key: 'revenue', width: 70, align: 'right', format: (v) => v.toFixed(2) },
      { header: 'Coût (DT)', key: 'cost', width: 70, align: 'right', format: (v) => v.toFixed(2) },
      { header: 'Marge (DT)', key: 'margin', width: 70, align: 'right', format: (v) => v.toFixed(2) },
      { header: 'Recouv. %', key: 'recoveryRate', width: 65, align: 'right', format: (v) => `${v.toFixed(2)}%` },
      { header: 'Rempl. %', key: 'fillRate', width: 65, align: 'right', format: (v) => `${v.toFixed(2)}%` },
      { header: 'Statut', key: 'status', width: 80, align: 'center' },
    ];

    const sessionData = report.sessions.map((s) => ({
      ...s,
      _statusColor:
        s.status === SessionFinancialStatus.RENTABLE
          ? accentColor
          : s.status === SessionFinancialStatus.DEFICITAIRE
            ? dangerColor
            : warningColor,
    }));

    y = this.drawPdfTable(doc, sessionCols, sessionData, 40, y, {
      headerBg: bgHeader,
      headerText: '#ffffff',
      rowBg: bgRow,
      text: textColor,
      alternateRowBg: '#fafafa',
      rowHeight: 20,
      statusColorKey: '_statusColor',
    });

    // --- PIED DE PAGE ---
    const pageRange = doc.bufferedPageRange();
    for (let i = 0; i < pageRange.count; i++) {
      doc.switchToPage(i);
      doc.fillColor(lightText).fontSize(8).font('Helvetica')
        .text(`Document confidentiel  •  Page ${i + 1} / ${pageRange.count}`, 40, 555, { align: 'center', width: 722 });
    }

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private drawPdfTable(
    doc: PDFKitDocument,
    columns: PdfColumn[],
    data: any[],
    x: number,
    startY: number,
    opts: {
      headerBg: string;
      headerText: string;
      rowBg: string;
      text: string;
      alternateRowBg?: string;
      rowHeight: number;
      statusColorKey?: string;
    },
  ): number {
    let y = startY;
    const rowH = opts.rowHeight;
    const headerH = 24;
    const tableWidth = columns.reduce((s, c) => s + c.width, 0);
    const pageBottom = 540;

    const drawHeader = (yPos: number) => {
      doc.rect(x, yPos, tableWidth, headerH).fillColor(opts.headerBg).fill();
      let cx = x;
      doc.fillColor(opts.headerText).fontSize(9).font('Helvetica-Bold');
      for (const col of columns) {
        doc.text(col.header, cx + 4, yPos + 7, { width: col.width - 8, align: col.align || 'left' });
        cx += col.width;
      }
      return yPos + headerH;
    };

    if (y + headerH > pageBottom) {
      doc.addPage();
      y = 40;
    }
    y = drawHeader(y);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      if (y + rowH > pageBottom) {
        doc.addPage();
        y = 40;
        y = drawHeader(y);
      }

      const bg = i % 2 === 0 ? (opts.alternateRowBg || opts.rowBg) : opts.rowBg;
      doc.rect(x, y, tableWidth, rowH).fillColor(bg).fill();
      doc.moveTo(x, y).lineTo(x + tableWidth, y).strokeColor('#e0e0e0').lineWidth(0.5).stroke();

      let cx = x;
      for (const col of columns) {
        const raw = row[col.key];
        const txt = col.format ? col.format(raw) : String(raw ?? '-');

        if (col.key === 'status' && opts.statusColorKey && row[opts.statusColorKey]) {
          doc.fillColor(row[opts.statusColorKey]).font('Helvetica-Bold').fontSize(8);
        } else {
          doc.fillColor(opts.text).font('Helvetica').fontSize(8);
        }

        doc.text(txt, cx + 4, y + 6, { width: col.width - 8, align: col.align || 'left' });
        cx += col.width;
      }
      y += rowH;
    }

    doc.moveTo(x, y).lineTo(x + tableWidth, y).strokeColor('#e0e0e0').lineWidth(0.5).stroke();
    return y;
  }

  /* =========================================================
   *  EXCEL PROFESSIONNEL (KPIs + Tableau complet)
   * ========================================================= */
  private async generateExcel(
    report: FinanceReportResponseDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Système de Reporting Financier';
    workbook.created = new Date();

    const primaryColor = 'FF1F4E79';
    const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    const thinBorder = {
      style: 'thin' as const,
      color: { argb: 'FFCCCCCC' },
    };
    const darkBorder = {
      style: 'thin' as const,
      color: { argb: 'FF000000' },
    };

    // ==================== FEUILLE 1 : KPIs ====================
    const kpiSheet = workbook.addWorksheet('KPIs', {
      properties: { tabColor: { argb: primaryColor } },
    });

    kpiSheet.mergeCells('A1:B1');
    const titleKpi = kpiSheet.getCell('A1');
    titleKpi.value = 'INDICATEURS CLÉS DE PERFORMANCE';
    titleKpi.font = { size: 16, bold: true, color: { argb: primaryColor } };
    titleKpi.alignment = { horizontal: 'center', vertical: 'middle' };
    kpiSheet.getRow(1).height = 30;

    kpiSheet.getRow(3).values = ['Métrique', 'Valeur'];
    kpiSheet.getRow(3).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { bottom: darkBorder };
    });

    const kpiData = [
      ['Chiffre d\'affaires', report.kpis.revenue],
      ['Coûts totaux', report.kpis.cost],
      ['Marge nette', report.kpis.margin],
      ['Taux de recouvrement (%)', report.kpis.recoveryRate],
      ['Performance vs période précédente (%)', report.kpis.performanceVsPreviousPeriod],
    ];

    kpiData.forEach((item, idx) => {
      const r = kpiSheet.getRow(idx + 4);
      r.values = item;
      r.eachCell((cell, colNumber) => {
        if (colNumber === 2 && typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00 DT';
          cell.alignment = { horizontal: 'right' };
        } else {
          cell.alignment = { horizontal: 'left' };
        }
        cell.border = { bottom: thinBorder };
      });
    });

    kpiSheet.getColumn(1).width = 45;
    kpiSheet.getColumn(2).width = 22;

    // ==================== FEUILLE 2 : Sessions ====================
    const sessionSheet = workbook.addWorksheet('Sessions', {
      properties: { tabColor: { argb: 'FF2E7D32' } },
    });

    sessionSheet.mergeCells('A1:J1');
    const titleSess = sessionSheet.getCell('A1');
    titleSess.value = 'DÉTAIL FINANCIER PAR SESSION';
    titleSess.font = { size: 16, bold: true, color: { argb: primaryColor } };
    titleSess.alignment = { horizontal: 'center', vertical: 'middle' };
    sessionSheet.getRow(1).height = 30;

    const headers = [
      'Session',
      'Formation',
      'Inscrits',
      'Capacité',
      'CA (Revenue)',
      'Coût',
      'Marge',
      'Taux Recouv.',
      'Taux Rempl.',
      'Statut',
    ];
    const headerRow = sessionSheet.getRow(3);
    headerRow.values = headers;
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: darkBorder,
        left: darkBorder,
        bottom: darkBorder,
        right: darkBorder,
      };
    });

    report.sessions.forEach((session, idx) => {
      const r = sessionSheet.getRow(idx + 4);
      r.values = [
        session.sessionName,
        session.formationName,
        session.inscrits,
        session.capacite,
        session.revenue,
        session.cost,
        session.margin,
        session.recoveryRate / 100,
        session.fillRate / 100,
        session.status,
      ];

      r.eachCell((cell, colNumber) => {
        cell.border = {
          top: thinBorder,
          left: thinBorder,
          bottom: thinBorder,
          right: thinBorder,
        };
        if (idx % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        }

        if ([1, 2].includes(colNumber)) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if ([3, 4].includes(colNumber)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.numFmt = '0';
        } else if ([5, 6, 7].includes(colNumber)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0.00 DT';
        } else if ([8, 9].includes(colNumber)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '0.00%';
        } else if (colNumber === 10) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (session.status === SessionFinancialStatus.RENTABLE) {
            cell.font = { color: { argb: 'FF2E7D32' }, bold: true };
          } else if (session.status === SessionFinancialStatus.DEFICITAIRE) {
            cell.font = { color: { argb: 'FFC62828' }, bold: true };
          } else {
            cell.font = { color: { argb: 'FFF9A825' }, bold: true };
          }
        }
      });
    });

    sessionSheet.columns = [
      { width: 32 },
      { width: 32 },
      { width: 10 },
      { width: 10 },
      { width: 16 },
      { width: 16 },
      { width: 14 },
      { width: 14 },
      { width: 12 },
      { width: 14 },
    ];

    sessionSheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 3, topLeftCell: 'A4', activeCell: 'A4' },
    ];
    if (report.sessions.length > 0) {
      sessionSheet.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3 + report.sessions.length, column: 10 },
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /* =========================================================
   *  CSV COMPLET (KPIs + Tableau des sessions)
   * ========================================================= */
  private generateCsv(report: FinanceReportResponseDto): Buffer {
    const lines: string[] = [];

    // BOM UTF-8 pour que Excel ouvre correctement les accents
    lines.push('\uFEFF');

    // Titre
    lines.push('RAPPORT FINANCIER');
    lines.push(`Généré le,${new Date().toLocaleDateString('fr-FR')}`);
    lines.push('');

    // ========== SECTION KPIs ==========
    lines.push('INDICATEURS CLÉS DE PERFORMANCE');
    lines.push('Métrique,Valeur');
    lines.push(`Chiffre d'affaires,${this.formatCsvNumber(report.kpis.revenue)} €`);
    lines.push(`Coûts totaux,${this.formatCsvNumber(report.kpis.cost)} DT`);
    lines.push(`Marge nette,${this.formatCsvNumber(report.kpis.margin)} DT`);
    lines.push(`Taux de recouvrement (%),${this.formatCsvNumber(report.kpis.recoveryRate)}`);
    lines.push(`Performance vs période précédente (%),${this.formatCsvNumber(report.kpis.performanceVsPreviousPeriod)}`);
    lines.push('');

    // ========== SECTION SESSIONS ==========
    lines.push('DÉTAIL PAR SESSION');
    lines.push(
      [
        'Session',
        'Formation',
        'Inscrits',
        'Capacité',
        'CA (Revenue)',
        'Coût',
        'Marge',
        'Taux Recouvrement (%)',
        'Taux Remplissage (%)',
        'Statut',
      ].join(','),
    );

    for (const row of report.sessions) {
      lines.push(
        [
          this.escapeCsv(row.sessionName),
          this.escapeCsv(row.formationName),
          row.inscrits,
          row.capacite,
          this.formatCsvNumber(row.revenue),
          this.formatCsvNumber(row.cost),
          this.formatCsvNumber(row.margin),
          this.formatCsvNumber(row.recoveryRate),
          this.formatCsvNumber(row.fillRate),
          row.status,
        ].join(','),
      );
    }

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  private formatCsvNumber(value: number): string {
    return Number(value).toFixed(2).replace('.', ',');
  }

  private escapeCsv(value: string): string {
    if (value == null) return '""';
    const str = String(value);
    const needsQuotes = str.includes(',') || str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r');
    const escaped = str.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  }

  private resolveSessionStatus(margin: number): SessionFinancialStatus {
    if (margin > 0) return SessionFinancialStatus.RENTABLE;
    if (margin === 0) return SessionFinancialStatus.SEUIL;
    return SessionFinancialStatus.DEFICITAIRE;
  }
}