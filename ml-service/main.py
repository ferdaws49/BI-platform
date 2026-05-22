"""
Plateforme BI — Centre de Formation Privé
Risk Prediction Microservice — FastAPI + scikit-learn
Port: 8000

Architecture du fichier :
  1. Schémas Pydantic  — contrat JSON entrée/sortie des API
  2. ModelRegistry     — entraînement ML au démarrage + prédiction risque d'abandon
  3. POST /predict     — score de risque par apprenant (0-100)
  4. POST /forecast    — prévision d'inscriptions (Prophet ou régression linéaire)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings("ignore")

# Instance FastAPI exposée à uvicorn (ex. : uvicorn main:app --reload --port 8000)
app = FastAPI(title="BI Risk Prediction Service", version="1.0.0")

# CORS : autorise le frontend (Nest/React) à appeler ce service depuis le navigateur
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Schemas ──────────────────────────────────────────────────────────────────
# Modèles de validation : FastAPI vérifie automatiquement le corps des requêtes JSON.

class ApprenantFeatures(BaseModel):
    """Indicateurs agrégés d'un apprenant, calculés côté backend avant l'appel ML."""
    apprenant_id: int
    # Présence (weight 40%)
    taux_presence: float          # 0.0 → 1.0 (1 = toujours présent)
    absences_consecutives: int    # nb séances manquées d'affilée
    # Notes (weight 35%)
    moyenne_notes: float          # 0 → 20
    tendance_notes: float         # positif = en hausse, négatif = en baisse (ex: -3.5)
    # Satisfaction (weight 15%)
    moyenne_satisfaction: float   # 0 → 5
    # Paiements (weight 10%)
    jours_retard_paiement: int    # 0 = à jour

class PredictRequest(BaseModel):
    """Batch : plusieurs apprenants en une seule requête pour limiter les allers-retours HTTP."""
    apprenants: List[ApprenantFeatures]

class RiskResult(BaseModel):
    """Réponse par apprenant : score, niveau lisible, proba brute et facteurs explicatifs."""
    apprenant_id: int
    risk_score: int               # 0-100
    risk_level: str               # critique / eleve / modere / faible
    risk_probability: float       # 0.0-1.0 (raw ML output)
    factors: dict
    model_used: str

class PredictResponse(BaseModel):
    results: List[RiskResult]
    model_info: dict

# ─── Model Registry ───────────────────────────────────────────────────────────

class ModelRegistry:
    """
    Charge et entraîne le modèle une seule fois au démarrage du serveur.
    - StandardScaler : normalise les features (même échelle que à l'entraînement)
    - Comparaison LogisticRegression vs RandomForest via validation croisée (AUC)
    """

    def __init__(self):
        self.scaler = StandardScaler()
        self.model = None
        self.model_name = ""
        self._train()  # exécuté à l'import du module → coût au boot, pas à chaque /predict

    def _generate_synthetic_data(self):
        """
        Génère des données synthétiques réalistes pour l'entraînement.
        Les vraies données Supabase remplaceront ceci en Phase 2.

        Features: [taux_presence, absences_consec, moyenne_notes,
                   tendance_notes, moy_satisfaction, jours_retard]
        Label: 1 = risque d'abandon, 0 = pas de risque
        """
        np.random.seed(42)
        n = 300

        # Apprenants à risque (label=1) — ~35% de la population
        n_risk = int(n * 0.35)
        X_risk = np.column_stack([
            np.random.uniform(0.2, 0.65, n_risk),    # taux_presence faible
            np.random.randint(2, 8, n_risk),           # absences consécutives élevées
            np.random.uniform(3.0, 9.5, n_risk),       # notes faibles
            np.random.uniform(-6.0, -1.0, n_risk),     # tendance négative
            np.random.uniform(1.0, 2.8, n_risk),       # satisfaction faible
            np.random.randint(20, 90, n_risk),          # retard paiement
        ])

        # Apprenants stables (label=0)
        n_ok = n - n_risk
        X_ok = np.column_stack([
            np.random.uniform(0.70, 1.0, n_ok),        # bonne présence
            np.random.randint(0, 2, n_ok),              # peu d'absences
            np.random.uniform(10.0, 19.5, n_ok),        # bonnes notes
            np.random.uniform(-1.0, 4.0, n_ok),         # tendance stable/positive
            np.random.uniform(3.0, 5.0, n_ok),          # satisfaction bonne
            np.random.randint(0, 15, n_ok),              # paiements à jour
        ])

        X = np.vstack([X_risk, X_ok])
        y = np.array([1] * n_risk + [0] * n_ok)

        # Mélange aléatoire pour que la CV ne soit pas biaisée par l'ordre des classes
        idx = np.random.permutation(n)
        return X[idx], y[idx]

    def _train(self):
        X, y = self._generate_synthetic_data()
        # fit_transform : calcule moyenne/écart-type sur X et applique la normalisation
        X_scaled = self.scaler.fit_transform(X)

        # Deux classificateurs testés ; le meilleur AUC moyen (5 folds) est retenu
        candidates = {
            "LogisticRegression": LogisticRegression(
                max_iter=1000, C=1.0, random_state=42
            ),
            "RandomForest": RandomForestClassifier(
                n_estimators=100, max_depth=6, random_state=42
            ),
        }

        best_score = -1
        for name, clf in candidates.items():
            scores = cross_val_score(clf, X_scaled, y, cv=5, scoring="roc_auc")
            mean_score = scores.mean()
            print(f"[ModelRegistry] {name}: AUC = {mean_score:.3f} ± {scores.std():.3f}")
            if mean_score > best_score:
                best_score = mean_score
                self.model = clf
                self.model_name = name

        # Ré-entraînement sur tout le jeu : le modèle servi en prod utilise 100 % des données synthétiques
        self.model.fit(X_scaled, y)
        print(f"[ModelRegistry] ✅ Modèle sélectionné: {self.model_name} (AUC={best_score:.3f})")

    def predict(self, features: List[List[float]]) -> np.ndarray:
        """Retourne P(abandon) pour chaque ligne — colonne 1 de predict_proba = classe « à risque »."""
        X = np.array(features)
        # transform uniquement (pas fit) : réutilise les stats apprises à l'entraînement
        X_scaled = self.scaler.transform(X)
        return self.model.predict_proba(X_scaled)[:, 1]

# Singleton : un seul modèle en mémoire pour toute la durée de vie du processus
registry = ModelRegistry()

# ─── Risk Level Mapping ───────────────────────────────────────────────────────

def score_to_level(score: int) -> str:
    """Convertit le score 0-100 en libellé métier pour tableaux de bord et alertes."""
    if score >= 75: return "critique"
    if score >= 55: return "eleve"
    if score >= 35: return "modere"
    return "faible"

def build_factors(f: ApprenantFeatures) -> dict:
    """
    Explications lisibles pour l'UI (indépendantes du modèle ML).
    Règles métier par seuil — les poids 40/35/15/10 sont documentés dans model_info.
    """
    factors = {}

    # Présence (priorité aux absences consécutives, signal fort d'abandon)
    presence_pct = round(f.taux_presence * 100)
    if f.absences_consecutives >= 3:
        factors["presence"] = f"{f.absences_consecutives} absences consécutives ({presence_pct}% de présence)"
    elif presence_pct < 70:
        factors["presence"] = f"Taux de présence insuffisant: {presence_pct}%"
    else:
        factors["presence"] = f"Présence correcte: {presence_pct}%"

    # Notes
    if f.tendance_notes <= -3:
        factors["notes"] = f"Forte baisse: {f.tendance_notes:+.1f} pts — Moyenne actuelle {f.moyenne_notes:.1f}/20"
    elif f.moyenne_notes < 10:
        factors["notes"] = f"Sous la moyenne: {f.moyenne_notes:.1f}/20"
    else:
        factors["notes"] = f"Notes stables: {f.moyenne_notes:.1f}/20 ({f.tendance_notes:+.1f} pts)"

    # Satisfaction
    if f.moyenne_satisfaction < 2.5:
        factors["satisfaction"] = f"Insatisfaction: {f.moyenne_satisfaction:.1f}/5 ⭐"
    elif f.moyenne_satisfaction < 3.5:
        factors["satisfaction"] = f"Satisfaction mitigée: {f.moyenne_satisfaction:.1f}/5"
    else:
        factors["satisfaction"] = f"Satisfaction bonne: {f.moyenne_satisfaction:.1f}/5"

    # Paiements
    if f.jours_retard_paiement > 30:
        factors["paiements"] = f"Retard de paiement: {f.jours_retard_paiement} jours"
    elif f.jours_retard_paiement > 0:
        factors["paiements"] = f"Légère irrégularité: {f.jours_retard_paiement} jours de retard"
    else:
        factors["paiements"] = "À jour"

    return factors

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Sonde pour orchestration / load balancer : vérifie que le service et le modèle sont chargés."""
    return {"status": "ok", "model": registry.model_name}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """
    Pipeline risque d'abandon :
      features JSON → matrice numpy → proba ML → score 0-100 → niveau + facteurs texte
    """
    if not req.apprenants:
        raise HTTPException(status_code=400, detail="Liste d'apprenants vide")

    # Ordre des colonnes DOIT correspondre à _generate_synthetic_data (sinon prédictions fausses)
    feature_matrix = []
    for f in req.apprenants:
        row = [
            f.taux_presence,
            float(f.absences_consecutives),
            f.moyenne_notes,
            f.tendance_notes,
            f.moyenne_satisfaction,
            float(f.jours_retard_paiement),
        ]
        feature_matrix.append(row)

    # Inférence batch : une seule passe scaler + modèle pour tous les apprenants
    probabilities = registry.predict(feature_matrix)

    results = []
    for i, apprenant in enumerate(req.apprenants):
        prob = float(probabilities[i])
        risk_score = min(100, int(round(prob * 100)))  # proba → pourcentage entier plafonné à 100
        results.append(RiskResult(
            apprenant_id=apprenant.apprenant_id,
            risk_score=risk_score,
            risk_level=score_to_level(risk_score),
            risk_probability=round(prob, 4),
            factors=build_factors(apprenant),
            model_used=registry.model_name,
        ))

    return PredictResponse(
        results=results,
        model_info={
            "model": registry.model_name,
            "features": ["taux_presence", "absences_consecutives", "moyenne_notes",
                         "tendance_notes", "moyenne_satisfaction", "jours_retard_paiement"],
            "weights_used": {"presence": 0.40, "notes": 0.35, "satisfaction": 0.15, "paiements": 0.10},
        }
    )


# ─── Dev server ───────────────────────────────────────────────────────────────
# uvicorn main:app --reload --port 8000

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE PRÉVISION D'INSCRIPTIONS (séries temporelles mensuelles)
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Forecast Schemas ─────────────────────────────────────────────────────────

from pydantic import BaseModel as PydanticBase  # alias pour éviter conflit avec les schémas risque
from typing import List as TypingList
import pandas as pd
from datetime import datetime, timedelta

class InscriptionPoint(PydanticBase):
    """Un point historique: mois + nombre d'inscriptions"""
    ds: str    # format: "2024-01"
    y: int     # nombre inscriptions

class ForecastRequest(PydanticBase):
    historique: TypingList[InscriptionPoint]
    periodes: int = 3              # nb mois à prédire (défaut: 3)

class ForecastPoint(PydanticBase):
    mois: str
    valeur_prevue: int
    borne_basse: int
    borne_haute: int

class ForecastResponse(PydanticBase):
    historique: TypingList[dict]
    previsions: TypingList[ForecastPoint]
    tendance: str                  # "hausse" / "baisse" / "stable"
    model_used: str
    insight: str                   # explication pour le directeur

# ─── Static Fallback Data ─────────────────────────────────────────────────────
# Jeu minimal si le client n'envoie pas assez d'historique (< 3 mois) — démo / dev uniquement

STATIC_HISTORIQUE = [
    {"ds": "2024-10", "y": 8},
    {"ds": "2024-11", "y": 12},
    {"ds": "2024-12", "y": 10},
    {"ds": "2025-01", "y": 18},
    {"ds": "2025-02", "y": 22},
    {"ds": "2025-03", "y": 19},
    {"ds": "2025-04", "y": 28},
]

# ─── Forecast Logic ───────────────────────────────────────────────────────────

def linear_trend_forecast(df: pd.DataFrame, periodes: int):
    """
    Fallback si Prophet absent ou en erreur.
    Index temporel t = 0, 1, 2… ; la pente estimée prolonge la série de periodes mois.
    """
    from sklearn.linear_model import LinearRegression as LR
    import numpy as np

    df = df.copy()
    df["t"] = range(len(df))  # variable « temps » pour la régression
    X = df[["t"]].values
    y = df["y"].values

    model = LR().fit(X, y)

    last_date = pd.to_datetime(df["ds"].iloc[-1])
    previsions = []
    for i in range(1, periodes + 1):
        t_next = len(df) + i - 1
        val = max(0, int(round(model.predict([[t_next]])[0])))
        std = max(1, int(np.std(y) * 0.5))  # bande d'incertitude grossière autour de la prédiction
        next_month = last_date + pd.DateOffset(months=i)
        previsions.append(ForecastPoint(
            mois=next_month.strftime("%Y-%m"),
            valeur_prevue=val,
            borne_basse=max(0, val - std),
            borne_haute=val + std,
        ))
    return previsions, "LinearTrend"


def prophet_forecast(df: pd.DataFrame, periodes: int):
    """Prophet forecast avec confidence interval."""
    try:
        from prophet import Prophet

        prophet_df = df.rename(columns={"ds": "ds", "y": "y"}).copy()
        prophet_df["ds"] = pd.to_datetime(prophet_df["ds"])

        m = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
            seasonality_mode="additive",
            interval_width=0.80,
        )
        m.fit(prophet_df)

        future = m.make_future_dataframe(periods=periodes, freq="MS")  # MS = début de mois
        forecast = m.predict(future)

        # tail(periodes) : ignore l'historique ajusté, ne garde que les mois à venir
        future_forecast = forecast.tail(periodes)
        previsions = []
        for _, row in future_forecast.iterrows():
            previsions.append(ForecastPoint(
                mois=row["ds"].strftime("%Y-%m"),
                valeur_prevue=max(0, int(round(row["yhat"]))),
                borne_basse=max(0, int(round(row["yhat_lower"]))),
                borne_haute=max(0, int(round(row["yhat_upper"]))),
            ))
        return previsions, "Prophet"

    except Exception as e:
        print(f"[Forecast] Prophet failed: {e} → fallback LinearTrend")
        return linear_trend_forecast(df, periodes)


def compute_tendance(historique_y: list, previsions: list) -> tuple:
    """Calcule la tendance et génère un insight pour le directeur."""
    if not previsions:
        return "stable", "Données insuffisantes."

    derniere_valeur = historique_y[-1] if historique_y else 0
    prochaine_valeur = previsions[0].valeur_prevue

    variation = prochaine_valeur - derniere_valeur
    pct = round((variation / max(1, derniere_valeur)) * 100)  # max(1,…) évite division par zéro

    # Seuils ±10 % : classification hausse / baisse / stable pour les graphiques BI
    if pct >= 10:
        tendance = "hausse"
        insight = f"📈 Hausse prévue de +{pct}% le mois prochain ({prochaine_valeur} inscriptions). Préparez les ressources."
    elif pct <= -10:
        tendance = "baisse"
        insight = f"📉 Baisse prévue de {pct}% le mois prochain ({prochaine_valeur} inscriptions). Renforcez la communication."
    else:
        tendance = "stable"
        insight = f"📊 Inscriptions stables autour de {prochaine_valeur} le mois prochain (variation {pct:+}%)."

    return tendance, insight


# ─── Forecast Route ───────────────────────────────────────────────────────────

@app.post("/forecast", response_model=ForecastResponse)
def forecast_inscriptions(req: ForecastRequest):
    """
    Prévision du nombre d'inscriptions pour les N prochains mois.
    Utilise Prophet si disponible, sinon Linear Trend.
    Si historique vide → static fallback data.
    """
    # Prophet a besoin d'un minimum de points ; sinon données de démo intégrées
    if not req.historique or len(req.historique) < 3:
        print("[Forecast] Données insuffisantes → static fallback")
        data = STATIC_HISTORIQUE
    else:
        data = [{"ds": p.ds, "y": p.y} for p in req.historique]

    df = pd.DataFrame(data)
    df["y"] = df["y"].astype(float)

    # Prophet si installé (requirements optionnel) ; sinon régression linéaire
    try:
        from prophet import Prophet
        previsions, model_used = prophet_forecast(df, req.periodes)
    except ImportError:
        previsions, model_used = linear_trend_forecast(df, req.periodes)

    # Compare dernier mois réel vs 1er mois prévu pour tendance + message directeur
    tendance, insight = compute_tendance(df["y"].tolist(), previsions)

    return ForecastResponse(
        historique=[{"mois": r["ds"], "valeur": int(r["y"])} for r in data],
        previsions=previsions,
        tendance=tendance,
        model_used=model_used,
        insight=insight,
    )