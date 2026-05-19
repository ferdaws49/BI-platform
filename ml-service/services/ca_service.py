import numpy as np
import pandas as pd
import joblib
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "ca_model.pkl"


class CAModelRegistry:
    def __init__(self):
        self.model     = None
        self.scaler    = None
        self.last_data = None
        self.FEATURES  = None
        self._load()

    def _load(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                "❌ models/ca_model.pkl introuvable. "
                "Lance d'abord : python -m training.train_ca"
            )
        bundle         = joblib.load(MODEL_PATH)
        self.model     = bundle["model"]
        self.scaler    = bundle["scaler"]
        self.last_data = bundle["last_data"]
        self.FEATURES  = bundle["features"]
        print(f"[CAModelRegistry] ✅ Modèle CA chargé depuis {MODEL_PATH}")

    def _build_row_features(self, df, mois_suivant, annee_suivante, trimestre):
        last  = df.iloc[-1]
        last2 = df.iloc[-2]
        last3 = df.iloc[-3]
        last12 = df.iloc[-12]["ca_mensuel"] if len(df) >= 12 else last["ca_mensuel"]
        return [[
            last["ca_mensuel"], last2["ca_mensuel"], last3["ca_mensuel"], last12,
            df["ca_mensuel"].iloc[-3:].mean(),
            df["ca_mensuel"].iloc[-6:].mean(),
            last["total_cout_formateur"],
            last["total_cout_logistique"],
            last["total_inscrits"],
            last["nb_sessions"],
            last["taux_impaye"],
            last["marge_lag1"],
            mois_suivant, trimestre,
            np.sin(2 * np.pi * mois_suivant / 12),
            np.cos(2 * np.pi * mois_suivant / 12),
        ]]

    def predict_next_months(self, nb_mois: int = 3) -> list:
        df = self.last_data.copy()
        previsions = []

        for _ in range(nb_mois):
            last           = df.iloc[-1]
            mois_suivant   = int(last["mois_num"]) % 12 + 1
            annee_suivante = int(last["annee"]) + (1 if mois_suivant == 1 else 0)
            trimestre      = ((mois_suivant - 1) // 3) + 1

            features  = self._build_row_features(df, mois_suivant, annee_suivante, trimestre)
            ca_predit = float(self.model.predict(self.scaler.transform(features))[0])
            cout_moy  = float(last["total_cout_formateur"] + last["total_cout_logistique"])

            previsions.append({
                "mois":          f"{annee_suivante}-{mois_suivant:02d}",
                "ca_predit":     round(ca_predit, 2),
                "marge_estimee": round(ca_predit - cout_moy, 2),
            })

            new_row = last.copy()
            new_row["annee"]      = annee_suivante
            new_row["mois_num"]   = mois_suivant
            new_row["trimestre"]  = trimestre
            new_row["ca_mensuel"] = ca_predit
            new_row["marge_lag1"] = ca_predit - cout_moy
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)

        return previsions


# Instance globale
ca_registry = CAModelRegistry()