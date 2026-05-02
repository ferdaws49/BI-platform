import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DashboardFilterDto {
  @IsOptional()
  @IsString()
  periode?: string;

  @IsOptional()
  @IsString()
  formation?: string;

  @IsOptional()
  @IsString()
  formateur?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  statut?: string;
}

export class PaginationFilterDto extends DashboardFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 5;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortDir?: 'ASC' | 'DESC' = 'DESC';
}
