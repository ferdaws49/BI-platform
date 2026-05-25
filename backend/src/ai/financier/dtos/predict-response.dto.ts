// src/ml-prediction/dtos/ca-historique-response.dto.ts

class CAHistoriquePointDto {
  mois: string;           // "2024-01"
  annee: number;
  mois_num: number;
  ca: number;              // CA réel
  marge: number;           // marge réelle
  nb_sessions: number;
  total_inscrits: number;
}

export class CAHistoriqueResponseDto {
  historique: CAHistoriquePointDto[];
  total_mois: number;
  ca_moyen: number;
  filtres: {
    date_from?: string;
    date_to?: string;
    formation_id?: number;
    formateur_id?: number;
    session_type?: string;
  };
}


// src/ml-prediction/dtos/predict-response.dto.ts

export class SessionRiskDto {
  session_id: string;
  risk_score: number;        // 0.0 à 1.0
  risk_level: 'low' | 'medium' | 'high';
  is_deficit: 0 | 1;
  estimated_loss: number;     // en TND
  recommendation: string;
}

export class PredictResponseDto {
  predictions: SessionRiskDto[];
  insights: string[];         // ex: "15 sessions analyzed", "3 at HIGH risk"
  recommendations: string[];   // ex: "Session X: Cancel session..."
}