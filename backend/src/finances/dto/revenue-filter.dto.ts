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
import {
  PerformanceSortBy,
  PaiementStatus,
} from 'src/utils/enums';

/** Statut paiement (filtre BI / tableau), aligné sur l’état réel des encaissements. */


/** Badge / état agrégé session (CA encaissé vs facturé). */


export enum SortOrder {
  DESC = 'DESC',
  ASC = 'ASC',
}

/** Taille bulle : marge (revenu - coûts sessions) ou « prix » (panier moyen des inscriptions). */
export enum BubbleMetric {
  MARGIN = 'margin',
  PRICE = 'price',
}


export class RevenueFilterDto {

  @ApiPropertyOptional({ example: '2026-01-01' })
    @IsOptional()
    @IsDateString()
    startDate?: string;
    @ApiPropertyOptional({ example: '2026-12-31' })
    @IsOptional()
    @IsDateString()
    endDate?: string;


  //end date et start date pour line chart
  @ApiPropertyOptional({ example: 1, description: 'ID de la formation' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),)
  formationId?: number;


    @ApiPropertyOptional({ example: 1, description: 'ID de la formation' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),)
  sessionId?: number;



  @ApiPropertyOptional({ enum: PaiementStatus })
  @IsOptional()
  @IsEnum(PaiementStatus)
  paymentStatus?: PaiementStatus;



  @ApiPropertyOptional({ example: 5, description: 'Top N formations (défaut 5)' })
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(20)
  topFormations?: number;


  @ApiPropertyOptional({ enum: BubbleMetric, default: BubbleMetric.MARGIN })
  @IsOptional()
  @IsEnum(BubbleMetric)
  bubbleMetric?: BubbleMetric;


  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? 1 : Number(value),
  )//convertit automatiquement le texte en vrai chiffre avant que le reste du code ne l'utilise.
  //car lorsque un url est envoyé toujours comme un text
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
      @IsOptional()
       @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? 10 : Number(value),
  )
      @IsInt()
      @Min(1)
      @Max(200)
      limit?: number = 10;


  @ApiPropertyOptional({ enum: SortOrder, example: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)//pour le tri
  sortOrder?: SortOrder = SortOrder.DESC;

   @ApiPropertyOptional({ enum: PerformanceSortBy, example: PerformanceSortBy.DATE })
        @IsOptional()
        @IsEnum(PerformanceSortBy)
        sortBy?: PerformanceSortBy = PerformanceSortBy.DATE;
}
