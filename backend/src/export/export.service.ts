/* eslint-disable @typescript-eslint/no-require-imports */
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
/* eslint-enable @typescript-eslint/no-require-imports */
pdfMake.vfs = pdfFonts?.pdfMake?.vfs ?? pdfFonts?.vfs ?? {};

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Response as ExpressResponse } from 'express';
import * as ExcelJS from 'exceljs';
import { Apprenant } from '../apprenants/entities/apprenant.entity';
import { Formation } from '../formations/entities/formation.entity';
import { Formateur } from '../formateurs/entities/formateur.entity';
import { Finance, FinanceType } from '../finances/entities/finance.entity';
import { Performance } from '../performances/entities/performance.entity';
import { Session } from '../sessions/entities/session.entity';
import { ExportDto } from './dto/export-filter.dto';

type ExportSection = {
  titre: string;
  columns?: string[];
  keys: string[];
  rows: Record<string, string | number>[];
};

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
    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
  ) {}

  private resolveStartDate(periode?: string): Date {
    const now = new Date();

    switch (periode) {
      case '7 derniers jours':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '3 derniers mois':
        return new Date(now.getFullYear(), now.getMonth() - 3, 1);
      case 'Année actuelle':
        return new Date(now.getFullYear(), 0, 1);
      case 'Toutes les données':
        return new Date(0);
      case '30 derniers jours':
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private applyScopedFilters(
    qb: any,
    dto: ExportDto,
    cfg: {
      dateField: string;
      formationField?: string;
      formateurField?: string;
    },
  ) {
    qb.andWhere(`${cfg.dateField} >= :startDate`, {
      startDate: this.resolveStartDate(dto.periode),
    });

    if (dto.formation && cfg.formationField) {
      qb.andWhere(`${cfg.formationField} = :formation`, {
        formation: dto.formation,
      });
    }

    if (dto.formateur && cfg.formateurField) {
      qb.andWhere(
        `CONCAT(${cfg.formateurField}.prenom, ' ', ${cfg.formateurField}.nom) = :formateur`,
        { formateur: dto.formateur },
      );
    }

    return qb;
  }

  async getFilterOptions() {
    const [formations, formateurs] = await Promise.all([
      this.formationRepo.find({
        select: ['titre'],
        order: { titre: 'ASC' },
      }),
      this.formateurRepo.find({
        select: ['prenom', 'nom'],
      }),
    ]);

    const formateurNames = formateurs
      .map((f) => `${f.prenom} ${f.nom}`.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'fr'));

    return {
      formations: ['Tous', ...formations.map((f) => f.titre)],
      formateurs: ['Tous', ...formateurNames],
      periodes: [
        '7 derniers jours',
        '30 derniers jours',
        '3 derniers mois',
        'Année actuelle',
        'Toutes les données',
      ],
    };
  }

  private async buildStrategique(dto: ExportDto): Promise<ExportSection> {
    const apprenantsQb = this.sessionRepo
      .createQueryBuilder('session')
      .innerJoin('session.apprenants', 'apprenant')
      .innerJoin('session.formation', 'formation')
      .leftJoin('session.formateur', 'formateur')
      .select('COUNT(DISTINCT apprenant.id)', 'count');
    this.applyScopedFilters(apprenantsQb, dto, {
      dateField: 'session.date',
      formationField: 'formation.titre',
      formateurField: 'formateur',
    });

    const formationsQb = this.sessionRepo
      .createQueryBuilder('session')
      .innerJoin('session.formation', 'formation')
      .leftJoin('session.formateur', 'formateur')
      .select('COUNT(DISTINCT formation.id)', 'count');
    this.applyScopedFilters(formationsQb, dto, {
      dateField: 'session.date',
      formationField: 'formation.titre',
      formateurField: 'formateur',
    });

    const formateursQb = this.sessionRepo
      .createQueryBuilder('session')
      .leftJoin('session.formateur', 'formateur')
      .innerJoin('session.formation', 'formation')
      .select('COUNT(DISTINCT formateur.id)', 'count')
      .where('formateur.id IS NOT NULL');
    this.applyScopedFilters(formateursQb, dto, {
      dateField: 'session.date',
      formationField: 'formation.titre',
      formateurField: 'formateur',
    });

    const revenuQb = this.financeRepo
      .createQueryBuilder('finance')
      .innerJoin('finance.session', 'session')
      .innerJoin('session.formation', 'formation')
      .leftJoin('session.formateur', 'formateur')
      .select('SUM(finance.montant)', 'total')
      .where('finance.type = :type', { type: FinanceType.PAIEMENT });
    this.applyScopedFilters(revenuQb, dto, {
      dateField: 'finance.date',
      formationField: 'formation.titre',
      formateurField: 'formateur',
    });

    const perfQb = this.performanceRepo
      .createQueryBuilder('perf')
      .innerJoin('perf.session', 'session')
      .innerJoin('perf.formation', 'formation')
      .leftJoin('session.formateur', 'formateur')
      .select('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN perf.estReussi = true THEN 1 ELSE 0 END)',
        'reussies',
      );
    this.applyScopedFilters(perfQb, dto, {
      dateField: 'perf.date',
      formationField: 'formation.titre',
      formateurField: 'formateur',
    });

    const [
      totalApprenantsResult,
      totalFormationsResult,
      totalFormateursResult,
      revenuResult,
      perfResult,
    ] = await Promise.all([
      apprenantsQb.getRawOne(),
      formationsQb.getRawOne(),
      formateursQb.getRawOne(),
      revenuQb.getRawOne(),
      perfQb.getRawOne(),
    ]);

    const totalPerformances = parseInt(perfResult?.total ?? '0', 10);
    const reussies = parseInt(perfResult?.reussies ?? '0', 10);

    return {
      titre: 'Rapport Stratégique',
      keys: ['indicateur', 'valeur'],
      rows: [
        {
          indicateur: 'Total Apprenants',
          valeur: parseInt(totalApprenantsResult?.count ?? '0', 10),
        },
        {
          indicateur: 'Total Formations',
          valeur: parseInt(totalFormationsResult?.count ?? '0', 10),
        },
        {
          indicateur: 'Total Formateurs',
          valeur: parseInt(totalFormateursResult?.count ?? '0', 10),
        },
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

  private async buildFinanciere(dto: ExportDto): Promise<ExportSection> {
    const result = await this.financeRepo
      .createQueryBuilder('finance')
      .innerJoin('finance.session', 'session')
      .innerJoin('session.formation', 'formation')
      .leftJoin('session.formateur', 'formateur')
      .select('formation.titre', 'formation')
      .addSelect(
        "SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END)",
        'revenus',
      )
      .addSelect(
        "SUM(CASE WHEN finance.type IN ('depense_formateur', 'depense_logistique') THEN finance.montant ELSE 0 END)",
        'couts',
      )
      .addSelect(
        "SUM(CASE WHEN finance.type = 'paiement' THEN finance.montant ELSE 0 END) - SUM(CASE WHEN finance.type IN ('depense_formateur', 'depense_logistique') THEN finance.montant ELSE 0 END)",
        'profit',
      )
      .where('formation.id IS NOT NULL')
      .andWhere('finance.type IN (:...types)', {
        types: [
          FinanceType.PAIEMENT,
          FinanceType.DEPENSE_FORMATEUR,
          FinanceType.DEPENSE_LOGISTIQUE,
        ],
      })
      .groupBy('formation.id')
      .addGroupBy('formation.titre')
      .orderBy('profit', 'DESC')
      .andWhere('finance.date >= :startDate', {
        startDate: this.resolveStartDate(dto.periode),
      })
      .andWhere(dto.formation ? 'formation.titre = :formation' : '1=1', {
        formation: dto.formation,
      })
      .andWhere(
        dto.formateur
          ? "CONCAT(formateur.prenom, ' ', formateur.nom) = :formateur"
          : '1=1',
        { formateur: dto.formateur },
      )
      .getRawMany();

    return {
      titre: 'Analyse Financière',
      columns: [
        'Formation',
        'Revenus (DT)',
        'Coûts (DT)',
        'Profit (DT)',
        'Marge (%)',
      ],
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

  private async buildPerformance(dto: ExportDto): Promise<ExportSection> {
    const result = await this.performanceRepo
      .createQueryBuilder('perf')
      .innerJoin('perf.formation', 'formation')
      .innerJoin('perf.session', 'session')
      .leftJoin('session.formateur', 'formateur')
      .select('formation.titre', 'formation')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN perf.estReussi = true THEN 1 ELSE 0 END)',
        'reussis',
      )
      .addSelect('AVG(perf.note)', 'avgNote')
      .where('perf.date >= :startDate', {
        startDate: this.resolveStartDate(dto.periode),
      })
      .andWhere(dto.formation ? 'formation.titre = :formation' : '1=1', {
        formation: dto.formation,
      })
      .andWhere(
        dto.formateur
          ? "CONCAT(formateur.prenom, ' ', formateur.nom) = :formateur"
          : '1=1',
        { formateur: dto.formateur },
      )
      .groupBy('formation.id')
      .addGroupBy('formation.titre')
      .orderBy('AVG(perf.note)', 'DESC')
      .getRawMany();

    return {
      titre: 'Performance des Formations',
      columns: [
        'Formation',
        'Évaluations',
        'Réussis',
        'Taux Réussite (%)',
        'Note Moyenne /20',
      ],
      keys: ['formation', 'total', 'reussis', 'tauxReussite', 'avgNote'],
      rows: result.map((r) => ({
        formation: r.formation,
        total: r.total,
        reussis: r.reussis,
        tauxReussite:
          r.total === '0'
            ? '0'
            : (
                (parseInt(r.reussis ?? '0', 10) /
                  Math.max(1, parseInt(r.total ?? '0', 10))) *
                100
              ).toFixed(2),
        avgNote: parseFloat(r.avgNote ?? '0').toFixed(2),
      })),
    };
  }

  private async buildQualite(dto: ExportDto): Promise<ExportSection> {
    const result = await this.performanceRepo
      .createQueryBuilder('perf')
      .innerJoin('perf.session', 'session')
      .innerJoin('perf.formation', 'formation')
      .leftJoin('session.formateur', 'formateur')
      .select(
        "COALESCE(CONCAT(formateur.prenom, ' ', formateur.nom), '—')",
        'formateur',
      )
      .addSelect('COUNT(DISTINCT session.id)', 'total')
      .addSelect('AVG(perf.note)', 'avgNote')
      .addSelect(
        'COUNT(CASE WHEN perf.estReussi = true THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)',
        'tauxReussite',
      )
      .where('perf.date >= :startDate', {
        startDate: this.resolveStartDate(dto.periode),
      })
      .andWhere(dto.formation ? 'formation.titre = :formation' : '1=1', {
        formation: dto.formation,
      })
      .andWhere(
        dto.formateur
          ? "CONCAT(formateur.prenom, ' ', formateur.nom) = :formateur"
          : '1=1',
        { formateur: dto.formateur },
      )
      .groupBy('formateur.id')
      .addGroupBy('formateur.prenom')
      .addGroupBy('formateur.nom')
      .orderBy('AVG(perf.note)', 'DESC')
      .getRawMany();

    return {
      titre: 'Qualité Pédagogique',
      columns: [
        'Formateur',
        'Sessions',
        'Note Moyenne /20',
        'Taux Réussite (%)',
      ],
      keys: ['formateur', 'total', 'avgNote', 'tauxReussite'],
      rows: result.map((r) => ({
        formateur: r.formateur ?? '—',
        total: r.total,
        avgNote: parseFloat(r.avgNote ?? '0').toFixed(2),
        tauxReussite: parseFloat(r.tauxReussite ?? '0').toFixed(2),
      })),
    };
  }

  private async collectData(dto: ExportDto) {
    const rapports = dto.rapports ?? [
      'strategique',
      'financiere',
      'performance',
      'qualite',
    ];
    const data: Record<string, ExportSection> = {};

    if (rapports.includes('strategique')) {
      data.strategique = await this.buildStrategique(dto);
    }

    if (rapports.includes('financiere')) {
      data.financiere = await this.buildFinanciere(dto);
    }

    if (rapports.includes('performance')) {
      data.performance = await this.buildPerformance(dto);
    }

    if (rapports.includes('qualite')) {
      data.qualite = await this.buildQualite(dto);
    }

    return data;
  }

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
        lines.push((section.columns ?? []).join(','));
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

  async exportExcel(dto: ExportDto, res: ExpressResponse) {
    const data = await this.collectData(dto);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BI Platform';
    workbook.created = new Date();

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF166534' },
      },
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
        const headerRow = sheet.addRow(section.columns ?? []);
        headerRow.eachCell((cell) => Object.assign(cell, headerStyle));
        (section.columns ?? []).forEach((_: any, i: number) => {
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

  async exportPdf(dto: ExportDto, res: ExpressResponse) {
    const data = await this.collectData(dto);
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40 });

    const filename = `rapport_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc
      .fontSize(20)
      .fillColor('#166534')
      .text('Rapport BI - Centre de Formation', { align: 'center' });
    doc
      .fontSize(10)
      .fillColor('#6b7280')
      .text(
        `Genere le ${new Date().toLocaleDateString('fr-FR')} - Periode: ${dto.periode ?? '30 derniers jours'}`,
        { align: 'center' },
      );
    doc.moveDown(1.5);

    for (const key of Object.keys(data)) {
      const section = data[key];

      doc
        .fontSize(13)
        .fillColor('#15803d')
        .text(section.titre, { underline: true });
      doc.moveDown(0.5);

      if (key === 'strategique') {
        const colWidths = [300, 150];
        const rowH = 22;
        let x = 40;
        let y = doc.y;

        doc.rect(x, y, colWidths[0], rowH).fill('#166534');
        doc.rect(x + colWidths[0], y, colWidths[1], rowH).fill('#166534');
        doc.fontSize(10).fillColor('#ffffff');
        doc.text('Indicateur', x + 5, y + 6, { width: colWidths[0] - 10 });
        doc.text('Valeur', x + colWidths[0] + 5, y + 6, {
          width: colWidths[1] - 10,
        });
        y += rowH;

        section.rows.forEach((row: any, i: number) => {
          const bg = i % 2 === 0 ? '#f0fdf4' : '#ffffff';
          doc.rect(x, y, colWidths[0], rowH).fill(bg);
          doc.rect(x + colWidths[0], y, colWidths[1], rowH).fill(bg);
          doc.fontSize(9).fillColor('#374151');
          doc.text(String(row.indicateur), x + 5, y + 6, {
            width: colWidths[0] - 10,
          });
          doc.text(String(row.valeur), x + colWidths[0] + 5, y + 6, {
            width: colWidths[1] - 10,
          });
          y += rowH;
        });

        doc.y = y + 10;
        doc.moveDown(1);
      } else {
        const colCount = (section.columns ?? []).length;
        const tableWidth = 515;
        const colW = Math.max(1, Math.floor(tableWidth / Math.max(1, colCount)));
        const rowH = 22;
        let x = 40;
        let y = doc.y;

        (section.columns ?? []).forEach((_: string, ci: number) => {
          doc.rect(x + ci * colW, y, colW, rowH).fill('#166534');
        });
        doc.fontSize(9).fillColor('#ffffff');
        (section.columns ?? []).forEach((col: string, ci: number) => {
          doc.text(col, x + ci * colW + 3, y + 6, { width: colW - 6 });
        });
        y += rowH;

        section.rows.forEach((row: any, i: number) => {
          if (y > 720) {
            doc.addPage();
            y = 40;
          }
          const bg = i % 2 === 0 ? '#f0fdf4' : '#ffffff';
          (section.columns ?? []).forEach((_: string, ci: number) => {
            doc.rect(x + ci * colW, y, colW, rowH).fill(bg);
          });
          doc.fontSize(8).fillColor('#374151');
          section.keys.forEach((k: string, ci: number) => {
            doc.text(String(row[k] ?? ''), x + ci * colW + 3, y + 6, {
              width: colW - 6,
            });
          });
          y += rowH;
        });

        doc.y = y + 10;
        doc.moveDown(1);
      }
    }

    doc.end();
  }

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
