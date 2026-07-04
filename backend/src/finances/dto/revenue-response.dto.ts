import { ApiProperty } from '@nestjs/swagger';



export class TopFormationKpiDto {
  @ApiProperty()
  formationId: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  revenue: number;
}
/** Cartes KPI (dashboard principal). */
export class KpiCardsDto {

  @ApiProperty({ description: 'CA réalisé = SUM(montant_encaisse)' })
  totalRevenue: number;

  @ApiProperty({ description: 'Croissance % du CA réalisé vs période précédente' })
  totalRevenueGrowthPercent: number;

  @ApiProperty({ description: 'Taux de recouvrement = encaissé / facturé * 100' })
  recoveryRatePercent: number;

  @ApiProperty({ type: TopFormationKpiDto, nullable: true })
  topFormation: TopFormationKpiDto | null;

  @ApiProperty({ description: 'Panier moyen = CA réalisé / nombre d’inscriptions' })
  averageBasket: number;

  @ApiProperty({ description: 'Croissance % du panier moyen vs période précédente' })
  averageBasketGrowthPercent: number;
}



export class MonthlyRevenueSeriesDto {

  @ApiProperty({ example: 1 })
  formationId: number;

  @ApiProperty()
  formationTitle: string;

  @ApiProperty({ type: [Number], description: 'Valeurs alignées sur `months`' })
  monthlyRevenue: number[];
}
/** Line chart : un mois + plusieurs séries (formations). */
export class RevenueEvolutionMultiLineDto {

  @ApiProperty({ type: [String], example: ['2026-01', '2026-02'] })
  months: string[];

  @ApiProperty({ type: [MonthlyRevenueSeriesDto] })
  series: MonthlyRevenueSeriesDto[];
}

export class CategoryRevenueShareDto {

  @ApiProperty()
  category: string;

  @ApiProperty()
  revenue: number;

  @ApiProperty({ description: 'Part % du CA catégorie sur le total' })
  percent: number;
}

export class BubbleChartPointDto {

  @ApiProperty()
  formationId: number;

  @ApiProperty()
  formationTitle: string;

  @ApiProperty({ description: 'Nombre d’inscriptions (validées)' })
  inscriptions: number;

  @ApiProperty({ description: 'CA réalisé sur la période' })
  revenue: number;

  @ApiProperty({ description: 'Taille bulle (marge ou prix selon filtre)' })
  bubbleSize: number;

  @ApiProperty({ enum: ['margin', 'price'] })
  bubbleMetric: 'margin' | 'price';
}

export class VariationTrendDto {
  @ApiProperty({ enum: ['green', 'red', 'neutral'] })
  color: 'green' | 'red' | 'neutral';
  @ApiProperty({ description: 'Variation % vs période précédente (CA encaissé session)' })
  variationPercent: number;
}

export class SessionRevenueTableRowDto {
  @ApiProperty()
  sessionId: string;


  @ApiProperty()
  session: string;

  @ApiProperty()
  formation: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  inscrits: number;

  @ApiProperty({ description: 'Somme prix_final (inscriptions validées)' })
  prix: number;

  @ApiProperty({ description: 'CA encaissé sur la période filtrée' })
  caEncaisse: number;

  @ApiProperty({ type: VariationTrendDto })
  variation: VariationTrendDto;
}

export class SessionRevenueTableResponseDto {

  @ApiProperty({ type: [SessionRevenueTableRowDto] })
  items: SessionRevenueTableRowDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

/** --- Onglet gestion des paiements --- */
export class PaymentManagementKpisDto {
  @ApiProperty()
  totalEncaisse: number;

  @ApiProperty({ description: 'Facturé - encaissé (sur inscriptions filtrées)' })
  totalNonEncaisse: number;

  @ApiProperty({ description: 'Taux de recouvrement %' })
  paymentRatePercent: number;

  @ApiProperty({ description: 'Nombre de lignes paiement (finance)' })
  paymentsCount: number;
}

export class PaymentStatusSliceDto {

  @ApiProperty({ enum: ['paye', 'avance', 'impaye'] })
  status: 'paye' | 'avance' | 'impaye';

  @ApiProperty()
  count: number;

  @ApiProperty()
  percent: number;
}

export class PaymentManagementPieDto {

  @ApiProperty({ type: [PaymentStatusSliceDto] })
  slices: PaymentStatusSliceDto[];
}

export class PaymentManagementBarRowDto {

  @ApiProperty({ example: '2026-04' })
  month: string;

  @ApiProperty()
  caFacture: number;

  @ApiProperty()
  caEncaisse: number;
}

export class PaymentManagementBarDto {

  @ApiProperty({ type: [PaymentManagementBarRowDto] })
  rows: PaymentManagementBarRowDto[];
}

export class PaymentManagementTableRowDto {
  @ApiProperty()
  inscriptionId: number;

  @ApiProperty()
  apprenant: string;

  @ApiProperty()
  session: string;

  @ApiProperty()
  formation: string;

  @ApiProperty()
  total: number;          // prix_final

  @ApiProperty()
  paid: number;           // SUM(finance.montant_encaisse)

  @ApiProperty()
  remaining: number;      // total - paid

  @ApiProperty({ enum: ['PAID', 'PARTIAL', 'UNPAID'] })
  status: string;

}
export class PaymentManagementTableResponseDto {

  @ApiProperty({ type: [PaymentManagementTableRowDto] })
  items: PaymentManagementTableRowDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;

   @ApiProperty()
  hasPreviousPage: boolean;
   @ApiProperty()
  hasNextPage: boolean;
   @ApiProperty()
  startItem: number;  // numéro du 1er élément affiché
   @ApiProperty()
  endItem: number;
}

export enum BubbleMetric {
  MARGIN = 'margin',
  PRICE = 'price',
}


export class FormationRevenueItemDto {
  @ApiProperty()
  formationId: number;

  @ApiProperty()
  formationTitle: string;

  @ApiProperty()
  caRealise: number;
}


