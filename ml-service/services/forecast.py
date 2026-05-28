"""
services/forecast.py — Interprétation métier des prévisions d'inscriptions

Rôle : après les valeurs numériques (models/forecast.py), produire
       une tendance globale + un message pour le directeur.

Seuils : variation ≥ +10 % → hausse ; ≤ -10 % → baisse ; sinon stable.
         (comparaison entre le dernier mois observé et le 1er mois prédit)

Fichiers liés :
  - api/forecast_routes.py
  - schemas/forecast.ForecastPoint
"""

from schemas.forecast import ForecastPoint
from typing import List


def compute_tendance(historique_y: list, previsions: List[ForecastPoint]) -> tuple:
    """
    Retourne (tendance, insight).
    historique_y : liste des effectifs passés (colonne y du DataFrame)
    previsions   : sortie de ForecastRegistry.predict_next_months
    """
    if not previsions:
        return "stable", "Données insuffisantes."

    derniere_valeur = historique_y[-1] if historique_y else 0
    prochaine_valeur = previsions[0].valeur_prevue

    variation = prochaine_valeur - derniere_valeur
    # max(1, ...) évite division par zéro si le dernier mois = 0 inscription
    pct = round((variation / max(1, derniere_valeur)) * 100)

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
