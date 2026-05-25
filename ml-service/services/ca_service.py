import numpy as np
import pandas as pd
import joblib
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "ca_model.pkl"

class CAModelRegistry:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.FEATURES = None
        self._load()

    def _load(self):
        if not MODEL_PATH.exists():
            print("❌ models/ca_model.pkl introuvable. Lance l'entraînement d'abord.")
            return
        bundle = joblib.load(MODEL_PATH)
        self.model = bundle["model"]
        self.scaler = bundle["scaler"]
        self.FEATURES = bundle["features"]
        print(f"[CAModelRegistry] ✅ Modèle CA chargé ({len(self.FEATURES)} features)")

    def _enrich_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prépare le DataFrame pour la prédiction."""
        df = df.copy()
        # Conversion numérique pour éviter les erreurs
        df["ca_mensuel"] = pd.to_numeric(df["ca_mensuel"], errors="coerce").fillna(0)
        df["annee"] = pd.to_numeric(df["annee"], errors="coerce").fillna(0).astype(int)
        df["mois_num"] = pd.to_numeric(df["mois"], errors="coerce").fillna(0).astype(int)

        # Fallbacks pour les coûts et inscrits
        for col in ["total_cout_formateur", "total_cout_logistique", "total_inscrits"]:
            if col not in df.columns:
                df[col] = 0
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

        return df.reset_index(drop=True)

    def _build_row_features(self, df, mois_suivant):
        """Construit exactement les 5 features attendues par le modèle."""
        last = df.iloc[-1]
        
        # Calcul du coût total
        cout_total = float(last.get("total_cout_formateur", 0)) + float(last.get("total_cout_logistique", 0))
        
        return [[
            float(last["ca_mensuel"]),          # ca_lag_1
            float(last.get("total_inscrits", 0)), # inscrits_lag1
            cout_total,                         # cout_total_lag1
            np.sin(2 * np.pi * mois_suivant / 12),
            np.cos(2 * np.pi * mois_suivant / 12)
        ]]

    def predict_next_months(self, historique: pd.DataFrame, nb_mois: int = 3) -> list:
        if self.model is None:
            raise ValueError("Modèle non chargé.")

        df = self._enrich_data(historique)
        previsions = []

        for _ in range(nb_mois):
            last = df.iloc[-1]
            
            # Calcul de la date du mois suivant
            mois_suivant = int(last["mois_num"]) % 12 + 1
            annee_suivante = int(last["annee"]) + (1 if mois_suivant == 1 else 0)

            # 1. Préparer les features (5 colonnes)
            features = self._build_row_features(df, mois_suivant)
            
            # 2. Prédire avec le scaler et le modèle
            X_scaled = self.scaler.transform(features)
            ca_predit = max(0, float(self.model.predict(X_scaled)[0]))

            # 3. Ajouter aux résultats
            previsions.append({
                "mois": f"{annee_suivante}-{mois_suivant:02d}",
                "ca_predit": round(ca_predit, 2),
                "marge_estimee": round(ca_predit * 0.3, 2)
            })

            # 4. Ajouter la prédiction au DF pour que le mois suivant puisse utiliser ce CA comme "Lag 1"
            new_row = {
                "annee": annee_suivante,
                "mois_num": mois_suivant,
                "ca_mensuel": ca_predit,
                "total_inscrits": last.get("total_inscrits", 0),
                "total_cout_formateur": last.get("total_cout_formateur", 0),
                "total_cout_logistique": last.get("total_cout_logistique", 0)
            }
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)

        return previsions

# Instance globale pour l'API
ca_registry = CAModelRegistry()