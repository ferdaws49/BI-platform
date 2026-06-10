// src/finances/dto/create-expense.dto.ts
import { IsEnum, IsNumber, IsString, IsOptional, Min, IsNotEmpty } from 'class-validator';
import { FinanceType } from '../entities/finance.entity';

export class CreateExpenseDto {
  @IsEnum(FinanceType)
  type: FinanceType.DEPENSE_FORMATEUR | FinanceType.DEPENSE_LOGISTIQUE;

  @IsNumber()
  @Min(0)
  montant: number;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  // --- Uniquement pour DEPENSE_FORMATEUR ---
  @IsString()
  @IsOptional()
  formateurNom?: string;   // ce que l'utilisateur saisit

  @IsNumber()
  @IsOptional()
  formateurId?: number;    // préférable si tu as un dropdown ID

  // --- Uniquement pour DEPENSE_LOGISTIQUE ---
  @IsString()
  @IsOptional()
  description?: string;
}