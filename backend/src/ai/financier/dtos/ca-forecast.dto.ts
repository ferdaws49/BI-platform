export class CAMoisPrevu {
  mois:          string;
  ca_predit:     number;
  marge_estimee: number;
}

export class CAForecastResponseDto {
  previsions: CAMoisPrevu[];
  unite:      string;
  model_used: string;
  tendance:   string;
}

export interface SessionFeatures {
  session_id: number;
  nb_inscrits: number;
  cout_formateur: number;
  cout_logistique: number;
  montant_inscriptions: number;
  duree_jours: number;
  mois: number;
}