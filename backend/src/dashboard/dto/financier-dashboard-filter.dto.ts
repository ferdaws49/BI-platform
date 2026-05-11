import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { PerformanceSortBy, PaiementStatus } from 'src/utils/enums';



export enum SortOrder {
    ASC = 'ASC',
    DESC = 'DESC',
  }
  export class FinancierDashboardFilterDto {
    @ApiPropertyOptional({ example: '2026-01-01' })
    @IsOptional()
    @IsDateString()
    startDate?: string;
    @ApiPropertyOptional({ example: '2026-12-31' })
    @IsOptional()
    @IsDateString()
    endDate?: string;
    @ApiPropertyOptional({ example: 3 })
    @IsOptional()
    @Transform(({ value }) => { const v = Number(value);
      return isNaN(v) ? undefined : v;
    })
    @IsInt()
    @Min(1)
    formationId?: number;

    @ApiPropertyOptional({
      enum: PaiementStatus,
      })
      @IsOptional()
      @IsEnum(PaiementStatus)
      status?: string;
      
      @ApiPropertyOptional({ example: 1, minimum: 1 })
      @IsOptional()
      @Transform(({ value }) => Number(value))
      @IsInt()
      @Min(1)
      page?: number = 1;

      @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
      @IsOptional()
      @Transform(({ value }) => Number(value))
      @IsInt()
      @Min(1)
      @Max(100)
      limit?: number = 10;
      @ApiPropertyOptional({ enum: PerformanceSortBy, example: PerformanceSortBy.DATE })
      @IsOptional()
      @IsEnum(PerformanceSortBy)
      sortBy?: PerformanceSortBy = PerformanceSortBy.DATE;
      @ApiPropertyOptional({ enum: SortOrder, example: SortOrder.DESC })
      @IsOptional()
      @IsEnum(SortOrder)
      sortOrder?: SortOrder = SortOrder.DESC;
    }
 