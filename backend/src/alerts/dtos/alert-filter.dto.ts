import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class AlertFilterDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumberString()
  formationId?: string;
}