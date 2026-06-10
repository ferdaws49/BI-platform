import pandas as pd
import numpy as np
from services.ca_service import ca_registry
from training.train_ca import build_features, FEATURES

def test_ca_feature_skew():
    # 15 mois de données
    df = pd.DataFrame({
        "annee": [2024]*12 + [2025]*3,
        "mois": list(range(1, 13)) + [1, 2, 3],
        "trimestre": [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 1, 1, 1],
        "ca_mensuel": [10000 + i*200 for i in range(15)],
        "total_cout_formateur": [4000]*15,
        "total_cout_logistique": [1500]*15,
        "nb_sessions": [4]*15,
        "total_inscrits": [35]*15,
        "total_impaye": [200]*15,
    })

    # Entraînement
    train_df = build_features(df.copy())
    assert len(train_df) > 0, f"train_df vide — fournissez plus de données"
    
    # La dernière ligne du training = le mois qu'on veut prédire
    train_features = train_df[FEATURES].iloc[-1].values

    # Serving : historique = tout sauf la dernière ligne
    historique = df.iloc[:-1].copy()

    last = historique.iloc[-1]
    mois_suivant = int(last["mois"]) % 12 + 1
    annee_suivante = int(last["annee"]) + (1 if mois_suivant == 1 else 0)
    trimestre = ((mois_suivant - 1) // 3) + 1

    enriched = ca_registry._enrich_data(historique)
    pred_features = ca_registry._build_row_features(
        enriched, mois_suivant, annee_suivante, trimestre
    )[0]

    # Comparaison
    for i, feat_name in enumerate(FEATURES):
        train_val = train_features[i]
        pred_val = pred_features[i]
        assert np.isclose(train_val, pred_val, rtol=1e-4), \
            f"SKEW sur {feat_name}: train={train_val:.6f}, pred={pred_val:.6f}"

    print("✅ PAS DE SKEW entre entraînement et prédiction")

if __name__ == "__main__":
    test_ca_feature_skew()