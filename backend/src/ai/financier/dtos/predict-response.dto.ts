export class SessionRiskDto {
  session_id: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  is_deficit: 0 | 1;
  estimated_loss: number;
  recommendation: string;
}

export class PredictResponseDto {
  sessionRisk: SessionRiskDto[];
  insights: string[];
  recommendations: string[];
}
