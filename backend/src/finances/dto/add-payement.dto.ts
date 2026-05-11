import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
/** Formulaire « Ajouter un paiement » : crée une ligne finance et met à jour l’inscription. */
export class AddPaymentDto {
  //nzid nthabet feha hedi khater 9alli ennou ynajem  💥 هذا خطر في security
  //خاطر أي user ينجم يبدّل userId ويعمل payment باسم شخص آخر
  @ApiProperty({ description: 'Identifiant apprenant (user)' })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ description: 'Formation concernée' })
  @IsInt()
  @Min(1)
  formationId: number;
  @ApiPropertyOptional({
    description:
      'Session ciblée si plusieurs inscriptions possibles (sinon la plus récente validée)',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
  @ApiProperty({ example: 150.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  montant: number;
  @ApiProperty({ example: '2026-04-19' })
  @IsDateString()
  @IsNotEmpty()
  paymentDate: string;
}