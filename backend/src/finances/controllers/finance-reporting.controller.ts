import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FinanceReportingService } from '../services/finance-reporting.service';
import { FinanceReportFilterDto } from '../dto/finance-report-filter.dto';
import { FinanceReportResponseDto } from '../dto/finance-report-response.dto';
import { FinanceReportExportQueryDto } from '../dto/finance-report-export.dto';
import { FinanceExportFormat } from 'src/utils/enums';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@ApiTags('Finance Reporting')
@ApiBearerAuth()
@Controller('finance/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('resp_financier')
export class FinanceReportingController {
  constructor(private readonly financeReportingService: FinanceReportingService) {}

  @Get('preview')
  @ApiOperation({
    summary: 'Financial report preview (KPIs + top 5 sessions)',
  })
  @ApiOkResponse({ type: FinanceReportResponseDto })
  getPreview(@Query() filter: FinanceReportFilterDto): Promise<FinanceReportResponseDto> {
    return this.financeReportingService.getPreviewReport(filter);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export full financial report with KPIs and all sessions',
  })
  @ApiQuery({
    name: 'format',
    enum: FinanceExportFormat,
    required: true,
  })
  async export(//kenou zouz query , donc tawa nahinehom
    @Query() dto: FinanceReportExportQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.financeReportingService.exportReport(dto);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    response.send(file.content);
  }
}
