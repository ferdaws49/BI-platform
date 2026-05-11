// src/horaires/dto/filter-schedule.dto.ts
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export enum FilterPeriod {
  WEEK  = 'week',
  MONTH = 'month',
}

export class FilterScheduleDto {
  @IsOptional()
  @IsEnum(FilterPeriod)
  period?: FilterPeriod; // 'week' | 'month'

  @IsOptional()
  @IsISO8601()
  date?: string; // date de référence, ex: '2025-04-01'

  @IsOptional()
  @IsString()
  timezone?: string; // ex: 'Africa/Tunis'
}