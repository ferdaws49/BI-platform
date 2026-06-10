import { IsArray, IsNumber, IsString, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// ─── Sous-DTOs pour les objets imbriqués ─────────────────────────

class KPIDto {
  @ApiProperty({ example: 150000 })
  @IsNumber()
  caRealise: number;

  @ApiProperty({ example: 180000 })
  @IsNumber()
  caPredicted: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  riskSessionsCount: number;

  @ApiProperty({ example: 25.5 })
  @IsNumber()
  profitMargin: number;

  @ApiProperty({ example: 12.3 })
  @IsNumber()
  croissance: number;
}

class RiskSessionDto {
  @ApiProperty({ example: 'sess-001' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Session React Avancé - Juin 2025' })
  @IsString()
  sessionName: string;

  @ApiProperty({ example: 'React Avancé' })
  @IsString()
  formation: string;

  @ApiProperty({ example: 0.85 })
  @IsNumber()
  riskScore: number;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  financialImpact: number;

  @ApiProperty({ example: 'High', enum: ['Safe', 'Medium', 'High'] })
  @IsString()
  status: 'Safe' | 'Medium' | 'High';

  @ApiProperty({ example: 0.3 })
  @IsNumber()
  fillRate: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  profitable: boolean;
}

class InsightDto {
  @ApiProperty({ example: 'ins-001' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'risk', enum: ['trend', 'risk', 'observation'] })
  @IsString()
  type: 'trend' | 'risk' | 'observation';

  @ApiProperty({ example: 'Baisse des inscriptions' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Les inscriptions ont chuté de 15% ce mois' })
  @IsString()
  description: string;

  @ApiProperty({ example: '-15%', required: false })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiProperty({ example: 'down', enum: ['up', 'down', 'neutral'], required: false })
  @IsOptional()
  @IsString()
  direction?: 'up' | 'down' | 'neutral';
}

class RecommendationDto {
  @ApiProperty({ example: 'rec-001' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'promote', enum: ['cancel', 'promote', 'reduce-costs', 'watch'] })
  @IsString()
  action: 'cancel' | 'promote' | 'reduce-costs' | 'watch';

  @ApiProperty({ example: 'Lancer une campagne promotionnelle' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Réduire les prix de 10% pour augmenter le taux de remplissage' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'React Avancé - Juin', required: false })
  @IsOptional()
  @IsString()
  session?: string;

  @ApiProperty({ example: '+15% de remplissage' })
  @IsString()
  impact: string;

  @ApiProperty({ example: 'high', enum: ['high', 'medium', 'low'] })
  @IsString()
  priority: 'high' | 'medium' | 'low';
}

// ─── DTO Principal ───────────────────────────────────────────────

export class PredictResponseDto {
  @ApiProperty({ type: KPIDto })
  @ValidateNested()
  @Type(() => KPIDto)
  kpi: KPIDto;

  @ApiProperty({ type: [RiskSessionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RiskSessionDto)
  riskSessions: RiskSessionDto[];

  @ApiProperty({ type: [InsightDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InsightDto)
  insights: InsightDto[];

  @ApiProperty({ type: [RecommendationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecommendationDto)
  recommendations: RecommendationDto[];
}