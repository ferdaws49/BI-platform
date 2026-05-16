// satisfaction/dto/create-satisfaction.dto.ts
import { IsInt, Min, Max, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateSatisfactionDto {
  @IsNumber()
  formationId: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  note: number;

  @IsOptional()
  @IsString()
  commentaire?: string;
}