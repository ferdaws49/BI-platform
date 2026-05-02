// ── pdfmake browser bundle — works in Node.js via getStream() ────────────
/* eslint-disable @typescript-eslint/no-require-imports */
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
/* eslint-enable @typescript-eslint/no-require-imports */
// Attach VFS once so Roboto fonts are found at generation time
pdfMake.vfs = pdfFonts?.pdfMake?.vfs ?? pdfFonts?.vfs ?? {};

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Response as ExpressResponse } from 'express';
import * as ExcelJS from 'exceljs';
import { Apprenant } from '../apprenants/entities/apprenant.entity';
import { Formation } from '../formations/entities/formation.entity';
import { Formateur } from '../formateurs/entities/formateur.entity';
import { Finance } from '../finances/entities/finance.entity';
import { Performance } from '../performances/entities/performance.entity';
import { ExportDto } from './dto/export-filter.dto';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Apprenant)
    private apprenantRepo: Repository<Apprenant>,
    @InjectRepository(Formation)
    private formationRepo: Repository<Formation>,
    @InjectRepository(Formateur)
    private formateurRepo: Repository<Formateur>,
    @InjectRepository(Finance)
    private financeRepo: Repository<Finance>,
    @InjectRepository(Performance)
    private performanceRepo: Repository<Performance>,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // COLLECT DATA
  // ══════════════════════════════════════════════════════════════════════════

  private async collectData(dto: ExportDto) {
    const rapports = dto.rapports ?? ['strategique', 'financiere', 'performance', 'qualite'];
    const data: Record<string, any> = {};

    const now = new Date();
    let startDate: Date;

    switch (dto.periode) {
      case '7 derniers jours':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '3 derniers mois':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'Année actuelle':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'Toutes les données':
        startDate = new Date(0);
        break;
      case '30 derniers jours':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // ── 1. Rapport Stratégique ────────────────────────────────────────────
    if (rapports.includes('strategique')) {
      const [totalApprenants, totalFormations, totalFormateurs, revenuResult] =
        await Promise.all([
          this.apprenantRepo.count(),
          this.formationRepo.count(),
          this.formateurRepo.count(),
          this.financeRepo
            .createQueryBuilder('f')
            .select('SUM(f.montant)', 'total')
            .where("f.type = 'paiement'")
            .getRawOne(),
        ]);

      const totalPerformances = await this.performanceRepo.count();
      const reussies = await this.performanceRepo.count({ where: { estReussi: true } });

      data.strategique = {
        titre: 'Rapport Stratégique',
        keys: ['indicateur', 'valeur'],
        rows: [
          { indicateur: 'Total Apprenants', valeur: totalApprenants },
          { indicateur: 'Total Formations', valeur: totalFormations },
          { indicateur: 'Total Formateurs', valeur: totalFormateurs },
          {
            indicateur: 'Revenu Total (DT)',
            valeur: parseFloat(revenuResult?.total ?? '0').toLocaleString(),
          },
          {
            indicateur: 'Taux de Réussite (%)',
            valeur:
              totalPerformances === 0
                ? '0'
                : ((reussies / totalPerformances) * 100).toFixed(2),
          },
        ],
      };
    }

    // ── 2. Analyse Financière ─────────────────────────────────────────────
    if (rapports.includes('financiere')) {
      const result = await this.financeRepo
        .createQueryBuilder('finance')
        .select('formation.titre', 'formation')
        .addSelect(
          "SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END)",
          'revenus',
        )
        .addSelect(
          "SUM(CASE WHEN finance.type = 'remboursement' THEN finance.montant ELSE 0 END)",
          'couts',
        )
        .addSelect(
          "SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END) - SUM(CASE WHEN finance.type = 'remboursement' THEN finance.montant ELSE 0 END)",
          'profit',
        )
        .innerJoin('finance.formation', 'formation')
        .where('finance.date >= :startDate', { startDate })
        .groupBy('formation.titre')
        .orderBy('profit', 'DESC')
        .getRawMany();

      data.financiere = {
        titre: 'Analyse Financière',
        columns: ['Formation', 'Revenus (DT)', 'Coûts (DT)', 'Profit (DT)', 'Marge (%)'],
        keys: ['formation', 'revenus', 'couts', 'profit', 'marge'],
        rows: result.map((r) => {
          const rev = parseFloat(r.revenus ?? '0');
          const cout = parseFloat(r.couts ?? '0');
          const profit = parseFloat(r.profit ?? '0');
          return {
            formation: r.formation,
            revenus: rev.toLocaleString(),
            couts: cout.toLocaleString(),
            profit: profit.toLocaleString(),
            marge: rev === 0 ? '0' : ((profit / rev) * 100).toFixed(2),
          };
        }),
      };
    }

    // ── 3. Performance Formations ─────────────────────────────────────────
    if (rapports.includes('performance')) {
      const result = await this.performanceRepo
        .createQueryBuilder('perf')
        .select('formation.titre', 'formation')
        .addSelect('COUNT(*)', 'total')
        .addSelect('COUNT(CASE WHEN perf.estReussi = true THEN 1 END)', 'reussis')
        .addSelect('AVG(perf.note)', 'avgNote')
        .innerJoin('perf.formation', 'formation')
        .groupBy('formation.titre')
        .orderBy('AVG(perf.note)', 'DESC')
        .getRawMany();

      data.performance = {
        titre: 'Performance des Formations',
        columns: ['Formation', 'Inscrits', 'Réussis', 'Taux Réussite (%)', 'Note Moyenne /20'],
        keys: ['formation', 'total', 'reussis', 'tauxReussite', 'avgNote'],
        rows: result.map((r) => ({
          formation: r.formation,
          total: r.total,
          reussis: r.reussis,
          tauxReussite:
            r.total === '0'
              ? '0'
              : ((parseInt(r.reussis) / parseInt(r.total)) * 100).toFixed(2),
          avgNote: parseFloat(r.avgNote ?? '0').toFixed(2),
        })),
      };
    }

    // ── 4. Qualité Pédagogique ────────────────────────────────────────────
    if (rapports.includes('qualite')) {
      const result = await this.performanceRepo
        .createQueryBuilder('perf')
        .select('formateur.nom', 'formateur')
        .addSelect('COUNT(*)', 'total')
        .addSelect('AVG(perf.note)', 'avgNote')
        .addSelect(
          'COUNT(CASE WHEN perf.estReussi = true THEN 1 END) * 100.0 / COUNT(*)',
          'tauxReussite',
        )
        .innerJoin('perf.formation', 'formation')
        .leftJoin('formation.formateur', 'formateur')
        .groupBy('formateur.nom')
        .orderBy('AVG(perf.note)', 'DESC')
        .getRawMany();

      data.qualite = {
        titre: 'Qualité Pédagogique',
        columns: ['Formateur', 'Sessions', 'Note Moyenne /20', 'Taux Réussite (%)'],
        keys: ['formateur', 'total', 'avgNote', 'tauxReussite'],
        rows: result.map((r) => ({
          formateur: r.formateur ?? '—',
          total: r.total,
          avgNote: parseFloat(r.avgNote ?? '0').toFixed(2),
          tauxReussite: parseFloat(r.tauxReussite ?? '0').toFixed(2),
        })),
      };
    }

    return data;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXPORT CSV
  // ══════════════════════════════════════════════════════════════════════════

  async exportCsv(dto: ExportDto, res: ExpressResponse) {
    const data = await this.collectData(dto);
    const lines: string[] = [];

    for (const key of Object.keys(data)) {
      const section = data[key];
      lines.push(`\n=== ${section.titre} ===`);

      if (key === 'strategique') {
        lines.push('Indicateur,Valeur');
        for (const row of section.rows) {
          lines.push(`${row.indicateur},${row.valeur}`);
        }
      } else {
        lines.push(section.columns.join(','));
        for (const row of section.rows) {
          lines.push(section.keys.map((k: string) => row[k]).join(','));
        }
      }
    }

    const csv = lines.join('\n');
    const filename = `rapport_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXPORT EXCEL
  // ══════════════════════════════════════════════════════════════════════════

  async exportExcel(dto: ExportDto, res: ExpressResponse) {
    const data = await this.collectData(dto);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BI Platform';
    workbook.created = new Date();

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } },
      alignment: { horizontal: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    for (const key of Object.keys(data)) {
      const section = data[key];
      const sheet = workbook.addWorksheet(section.titre);

      sheet.mergeCells('A1:E1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = section.titre;
      titleCell.font = { bold: true, size: 14, color: { argb: 'FF166534' } };
      titleCell.alignment = { horizontal: 'center' };
      sheet.addRow([]);

      if (key === 'strategique') {
        const headerRow = sheet.addRow(['Indicateur', 'Valeur']);
        headerRow.eachCell((cell) => Object.assign(cell, headerStyle));
        sheet.getColumn(1).width = 35;
        sheet.getColumn(2).width = 20;
        for (const row of section.rows) {
          const r = sheet.addRow([row.indicateur, row.valeur]);
          r.eachCell((cell) => {
            cell.border = {
              top: { style: 'hair' },
              bottom: { style: 'hair' },
              left: { style: 'hair' },
              right: { style: 'hair' },
            };
          });
        }
      } else {
        const headerRow = sheet.addRow(section.columns);
        headerRow.eachCell((cell) => Object.assign(cell, headerStyle));
        section.columns.forEach((_: any, i: number) => {
          sheet.getColumn(i + 1).width = 22;
        });
        for (const row of section.rows) {
          const r = sheet.addRow(section.keys.map((k: string) => row[k]));
          r.eachCell((cell) => {
            cell.border = {
              top: { style: 'hair' },
              bottom: { style: 'hair' },
              left: { style: 'hair' },
              right: { style: 'hair' },
            };
          });
        }
      }

      sheet.eachRow((row, rowNum) => {
        if (rowNum > 3 && rowNum % 2 === 0) {
          row.eachCell((cell) => {
            if (!cell.fill || (cell.fill as any).fgColor?.argb !== 'FF166534') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF0FDF4' },
              };
            }
          });
        }
      });
    }

    const filename = `rapport_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXPORT PDF
  // ══════════════════════════════════════════════════════════════════════════
  async exportPdf(dto: ExportDto, res: ExpressResponse) {
  const data = await this.collectData(dto);
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 40 });

  const filename = `rapport_${new Date().toISOString().split('T')[0]}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // ✅ pipe direct vers res — 100% Node.js natif
  doc.pipe(res);

  // ── Header ──────────────────────────────────────────────────────────
  doc.fontSize(20).fillColor('#166534').text('Rapport BI — Centre de Formation', { align: 'center' });
  doc.fontSize(10).fillColor('#6b7280').text(
    `Généré le ${new Date().toLocaleDateString('fr-FR')} · Période: ${dto.periode ?? '30 derniers jours'}`,
    { align: 'center' }
  );
  doc.moveDown(1.5);

  // ── Sections ─────────────────────────────────────────────────────────
  for (const key of Object.keys(data)) {
    const section = data[key];

    // Titre section
    doc.fontSize(13).fillColor('#15803d').text(section.titre, { underline: true });
    doc.moveDown(0.5);

    if (key === 'strategique') {
      // Table stratégique
      const colWidths = [300, 150];
      const rowH = 22;
      let x = 40;
      let y = doc.y;

      // Header
      doc.rect(x, y, colWidths[0], rowH).fill('#166534');
      doc.rect(x + colWidths[0], y, colWidths[1], rowH).fill('#166534');
      doc.fontSize(10).fillColor('#ffffff');
      doc.text('Indicateur', x + 5, y + 6, { width: colWidths[0] - 10 });
      doc.text('Valeur', x + colWidths[0] + 5, y + 6, { width: colWidths[1] - 10 });
      y += rowH;

      // Rows
      section.rows.forEach((row: any, i: number) => {
        const bg = i % 2 === 0 ? '#f0fdf4' : '#ffffff';
        doc.rect(x, y, colWidths[0], rowH).fill(bg);
        doc.rect(x + colWidths[0], y, colWidths[1], rowH).fill(bg);
        doc.fontSize(9).fillColor('#374151');
        doc.text(String(row.indicateur), x + 5, y + 6, { width: colWidths[0] - 10 });
        doc.text(String(row.valeur), x + colWidths[0] + 5, y + 6, { width: colWidths[1] - 10 });
        y += rowH;
      });

      doc.y = y + 10;
      doc.moveDown(1);

    } else {
      // Tables génériques
      const colCount = section.columns.length;
      const tableWidth = 515;
      const colW = Math.floor(tableWidth / colCount);
      const rowH = 22;
      let x = 40;
      let y = doc.y;

      // Header
      section.columns.forEach((col: string, ci: number) => {
        doc.rect(x + ci * colW, y, colW, rowH).fill('#166534');
      });
      doc.fontSize(9).fillColor('#ffffff');
      section.columns.forEach((col: string, ci: number) => {
        doc.text(col, x + ci * colW + 3, y + 6, { width: colW - 6 });
      });
      y += rowH;

      // Rows
      section.rows.forEach((row: any, i: number) => {
        // Nouvelle page si nécessaire
        if (y > 720) {
          doc.addPage();
          y = 40;
        }
        const bg = i % 2 === 0 ? '#f0fdf4' : '#ffffff';
        section.columns.forEach((_: any, ci: number) => {
          doc.rect(x + ci * colW, y, colW, rowH).fill(bg);
        });
        doc.fontSize(8).fillColor('#374151');
        section.keys.forEach((k: string, ci: number) => {
          doc.text(String(row[k] ?? ''), x + ci * colW + 3, y + 6, { width: colW - 6 });
        });
        y += rowH;
      });

      doc.y = y + 10;
      doc.moveDown(1);
    }
  }

  // ✅ Finalise le PDF
  doc.end();
}

  // ══════════════════════════════════════════════════════════════════════════
  // ROUTER
  // ══════════════════════════════════════════════════════════════════════════

  async export(dto: ExportDto, res: ExpressResponse) {
    switch (dto.format) {
      case 'csv':
        return this.exportCsv(dto, res);
      case 'excel':
        return this.exportExcel(dto, res);
      case 'pdf':
        return this.exportPdf(dto, res);
      default:
        return this.exportCsv(dto, res);
    }
  }
}