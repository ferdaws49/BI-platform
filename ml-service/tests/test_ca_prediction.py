import pandas as pd
from services.ca_service import ca_registry

def test_predict_next_months():
    historique = pd.DataFrame({
        "annee": [2024]*6,
        "mois": [1, 2, 3, 4, 5, 6],
        "trimestre": [1, 1, 1, 2, 2, 2],
        "ca_mensuel": [10000, 10500, 10200, 11000, 10800, 11500],
        "total_cout_formateur": [4000]*6,
        "total_cout_logistique": [1500]*6,
        "nb_sessions": [4]*6,
        "total_inscrits": [35]*6,
        "total_impaye": [200]*6,
    })

    result = ca_registry.predict_next_months(historique, nb_mois=3)

    assert len(result) == 3, f"Attendu 3 prévisions, reçu {len(result)}"
    assert all("mois" in r and "ca_predit" in r for r in result)
    assert all(r["ca_predit"] >= 0 for r in result), "CA négatif détecté"
    
    print(f"✅ Prévisions CA : {result}")

if __name__ == "__main__":
    test_predict_next_months()