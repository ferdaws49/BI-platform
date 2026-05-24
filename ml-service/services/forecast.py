from schemas.forecast import ForecastPoint
from typing import List


def compute_tendance(historique_y: list, previsions: List[ForecastPoint]) -> tuple:
    """
    Calcule la tendance et génère un insight pour le directeur.
    Seuils ±10% : hausse / baisse / stable.
    """
    if not previsions:
        return "stable", "Données insuffisantes."

    derniere_valeur = historique_y[-1] if historique_y else 0
    prochaine_valeur = previsions[0].valeur_prevue

    variation = prochaine_valeur - derniere_valeur
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