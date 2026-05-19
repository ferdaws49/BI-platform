import joblib
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "deficit_model.pkl"


class SessionDeficitRegistry:
    def __init__(self):
        self.model      = None
        self.scaler     = None
        self.model_name = ""
        self._load()

    def _load(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                "❌ models/deficit_model.pkl introuvable. "
                "Lance d'abord : python -m training.train_deficit"
            )
        bundle          = joblib.load(MODEL_PATH)
        self.model      = bundle["model"]
        self.scaler     = bundle["scaler"]
        self.model_name = bundle["model_name"]
        print(f"[SessionDeficitRegistry] ✅ Modèle chargé : {self.model_name}")

    def predict(self, sessions) -> list:
        from schemas.deficit_schema import SessionDeficitResult

        feature_matrix = []
        for s in sessions:
            cout_total  = s.cout_formateur + s.cout_logistique
            marge_brute = s.montant_inscriptions - cout_total
            feature_matrix.append([
                s.nb_inscrits, s.cout_formateur, s.cout_logistique,
                s.montant_inscriptions,
                s.duree_jours, s.mois,
            ])

        probabilities = self.model.predict_proba(
            self.scaler.transform(feature_matrix)
        )[:, 1]

        results = []
        for i, s in enumerate(sessions):
            prob        = float(probabilities[i])
            score       = min(100, int(round(prob * 100)))
            cout_total  = s.cout_formateur + s.cout_logistique
            marge_brute = s.montant_inscriptions - cout_total
            deficit_estime = round(abs(marge_brute), 2) if marge_brute < 0 else 0.0

            if score >= 75:   niveau = "critique"
            elif score >= 55: niveau = "eleve"
            elif score >= 35: niveau = "modere"
            else:             niveau = "faible"

            if marge_brute < 0:
                raison = (
                    f"Perte estimée : {deficit_estime:.0f} DT "
                    f"(Coûts {cout_total:.0f} DT > Revenus {s.montant_inscriptions:.0f} DT)"
                )
                recommandation = (
                    f"Augmenter le tarif ou recruter plus d'inscrits "
                    f"(minimum {int(cout_total / max(s.montant_inscriptions / max(s.nb_inscrits, 1), 1)) + 1} inscrits)"
                )
            else:
                raison         = f"Marge positive : +{marge_brute:.0f} DT"
                recommandation = "Session rentable, aucune action requise"

            results.append(SessionDeficitResult(
                session_id=s.session_id, est_deficitaire=marge_brute < 0,
                probabilite=round(prob, 4), score_risque=score,
                niveau_risque=niveau, deficit_estime=deficit_estime,
                raison=raison, recommandation=recommandation,
            ))
        return results


# Instance globale
session_deficit_registry = SessionDeficitRegistry()