"""
services/risk.py — Règles métier post-ML pour le risque d'abandon

Rôle : transformer le score numérique en alertes compréhensibles.
       Complète le modèle (boîte noire) par des messages lisibles (boîte blanche).

Ce fichier NE fait PAS de prédiction : uniquement
  - score_to_level()  : score 0–100 → critique / eleve / modere / faible
  - build_factors()   : phrases pour l'UI selon des seuils fixes

Fichiers liés :
  - config.RISK_THRESHOLDS
  - api/predict_routes.py (appelle ces fonctions après registry.predict)
"""

from config import RISK_THRESHOLDS
from schemas.risk import ApprenantFeatures


def score_to_level(score: int) -> str:
    """
    Découpage en paliers. Les seuils sont dans config.py pour les ajuster
    sans retoucher le modèle ni l'API.
    """
    if score >= RISK_THRESHOLDS["critique"]:
        return "critique"
    if score >= RISK_THRESHOLDS["eleve"]:
        return "eleve"
    if score >= RISK_THRESHOLDS["modere"]:
        return "modere"
    return "faible"


def build_factors(f: ApprenantFeatures) -> dict:
    """
    Génère un dict {presence, notes, satisfaction, paiements} pour le dashboard.
    Logique indépendante du classifieur : même apprenant peut avoir un score ML
    élevé mais des facteurs « corrects » sur un axe (utile pour le dialogue pédago).
    """
    factors = {}

    # ── Présence ──────────────────────────────────────────────────────────────
    presence_pct = round(f.taux_presence * 100)
    if f.absences_consecutives >= 3:
        factors["presence"] = f"{f.absences_consecutives} absences consécutives ({presence_pct}% de présence)"
    elif presence_pct < 70:
        factors["presence"] = f"Taux de présence insuffisant: {presence_pct}%"
    else:
        factors["presence"] = f"Présence correcte: {presence_pct}%"

    # ── Notes ─────────────────────────────────────────────────────────────────
    if f.tendance_notes <= -3:
        factors["notes"] = f"Forte baisse: {f.tendance_notes:+.1f} pts — Moyenne actuelle {f.moyenne_notes:.1f}/20"
    elif f.moyenne_notes < 10:
        factors["notes"] = f"Sous la moyenne: {f.moyenne_notes:.1f}/20"
    else:
        factors["notes"] = f"Notes stables: {f.moyenne_notes:.1f}/20 ({f.tendance_notes:+.1f} pts)"

    # ── Satisfaction ────────────────────────────────────────────────────────────
    if f.moyenne_satisfaction < 2.5:
        factors["satisfaction"] = f"Insatisfaction: {f.moyenne_satisfaction:.1f}/5 ⭐"
    elif f.moyenne_satisfaction < 3.5:
        factors["satisfaction"] = f"Satisfaction mitigée: {f.moyenne_satisfaction:.1f}/5"
    else:
        factors["satisfaction"] = f"Satisfaction bonne: {f.moyenne_satisfaction:.1f}/5"

    # ── Paiements ───────────────────────────────────────────────────────────────
    if f.jours_retard_paiement > 30:
        factors["paiements"] = f"Retard de paiement: {f.jours_retard_paiement} jours"
    elif f.jours_retard_paiement > 0:
        factors["paiements"] = f"Légère irrégularité: {f.jours_retard_paiement} jours de retard"
    else:
        factors["paiements"] = "À jour"

    return factors
