import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { FinanceExportFormat } from 'src/utils/enums';
import { FinanceReportFilterDto } from './finance-report-filter.dto';


//ena zedet el extends FinanceReportFilterDto bech maykounech mosta9ell, bech tkoun andou fekra ala el filtre
export class FinanceReportExportQueryDto extends FinanceReportFilterDto {
  @ApiProperty({ enum: FinanceExportFormat })
  @IsEnum(FinanceExportFormat)
  format: FinanceExportFormat;
}
