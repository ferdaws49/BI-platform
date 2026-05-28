import numpy as np
import joblib
from pathlib import Path
from datetime import datetime
from dateutil.relativedelta import relativedelta
from db import get_connection
import pandas as pd

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "ca_model_mensuel.pkl"

class CAService:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.FEATURES = None
        self.history = None 
        self._load()
    
    def _load(self):
        if MODEL_PATH.exists():
            bundle = joblib.load(MODEL_PATH)
            self.model = bundle["model"]
            self.scaler = bundle["scaler"]
            self.FEATURES = bundle["features"]
            history_data = bundle.get("history", None)
            self.history = pd.DataFrame(history_data) if history_data else None
            print("✅ Modèle chargé")
        else:
            print("❌ Modèle non trouvé")
    
    def _get_nb_sessions(self, year, month):
        conn = get_connection()
        query = """
        SELECT COUNT(*) as nb
        FROM public.sessions
        WHERE EXTRACT(YEAR FROM date) = %s
          AND EXTRACT(MONTH FROM date) = %s
          AND statut IN ('Active', 'Completed');
        """
        df = pd.read_sql(query, conn, params=(year, month))
        conn.close()
        return int(df.iloc[0]['nb']) if not df.empty else 0
    
    def predict_month(self, year=None, month=None):
        if self.model is None:
            return {"error": "Modèle non chargé"}
        
        if year is None or month is None:
            next_d = datetime.now() + relativedelta(months=1)
            year, month = next_d.year, next_d.month
        
        mois_str = f"{year}-{month:02d}"
        nb_sessions = self._get_nb_sessions(year, month)
        
        if nb_sessions == 0:
            return self._fallback(year, month, mois_str)
        
        mois_cos = np.cos(2 * np.pi * month / 12)
        
        vec = np.array([[nb_sessions, mois_cos]])
        vec_s = self.scaler.transform(vec)
        ca_pred = float(self.model.predict(vec_s)[0])
        ca_pred = max(0, ca_pred)
        
        return {
            "mois": mois_str,
            "ca_predit": round(ca_pred, 2),
            "marge_estimee": round(ca_pred * 0.3, 2),
            "nb_sessions": nb_sessions,
            "source": "planning_reel"
        }
    
    def _fallback(self, year, month, mois_str):
        # Moyenne historique du même mois
        return {
            "mois": mois_str,
            "ca_predit": 12000,  # à adapter
            "marge_estimee": 3600,
            "nb_sessions": 0,
            "source": "estimation_historique",
            "warning": "Aucune session planifiée"
        }
    
    def predict_period(self, nb_mois=1):
        if nb_mois not in [1, 3, 6]:
            return {"error": "Période: 1, 3 ou 6"}
        
        previsions = []
        total_ca = 0
        
        start = datetime.now() + relativedelta(months=1)
        
        for i in range(nb_mois):
            current = start + relativedelta(months=i)
            result = self.predict_month(current.year, current.month)
            previsions.append(result)
            total_ca += result.get('ca_predit', 0)
        
        return {
            "periode_mois": nb_mois,
            "ca_total": round(total_ca, 2),
            "marge_total": round(total_ca * 0.3, 2),
            "previsions": previsions
        }

ca_service = CAService()