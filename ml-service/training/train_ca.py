import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingRegressor

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

#hedhi ki ndakhel el base
#from data.postgres_loader import load_ca_data 
#def generate_data():
    #df = load_ca_data()

    # Vérification minimale
    #assert len(df) >= 15, "Pas assez de mois historiques (minimum 15)"
    #assert "ca_mensuel" in df.columns, "Colonne ca_mensuel manquante"

    #print(f"[train_ca] 📦 {len(df)} mois chargés depuis PostgreSQL")
    #return df


def generate_data():
    np.random.seed(42)
    nb_mois = 60

    mois_list  = [(2020 + (i // 12), (i % 12) + 1) for i in range(nb_mois)]
    annees     = [m[0] for m in mois_list]
    mois       = [m[1] for m in mois_list]
    trimestres = [((m - 1) // 3) + 1 for m in mois]

    tendance     = np.linspace(50000, 95000, nb_mois)
    saisonnalite = 10000 * np.sin(2 * np.pi * np.array(mois) / 12)
    bruit        = np.random.normal(0, 2000, nb_mois)
    ca_mensuel   = tendance + saisonnalite + bruit

    cout_formateur  = ca_mensuel * 0.25 + np.random.normal(0, 500,  nb_mois)
    cout_logistique = ca_mensuel * 0.10 + np.random.normal(0, 300,  nb_mois)
    nb_inscrits     = (ca_mensuel / 500).astype(int)
    nb_sessions     = np.random.randint(3, 12, nb_mois)
    total_impaye    = ca_mensuel * 0.05

    return pd.DataFrame({
        "annee":                 annees,
        "mois":                  mois,
        "trimestre":             trimestres,
        "ca_mensuel":            ca_mensuel.round(2),
        "total_cout_formateur":  cout_formateur.round(2),
        "total_cout_logistique": cout_logistique.round(2),
        "total_inscrits":        nb_inscrits,
        "nb_sessions":           nb_sessions,
        "total_impaye":          total_impaye.round(2),
    })


def build_features(df):
    df = df.sort_values(["annee", "mois"]).reset_index(drop=True)
    df["ca_lag_1"]             = df["ca_mensuel"].shift(1)
    df["ca_lag_2"]             = df["ca_mensuel"].shift(2)
    df["ca_lag_3"]             = df["ca_mensuel"].shift(3)
    df["ca_lag_12"]            = df["ca_mensuel"].shift(12)
    df["ca_moy_3m"]            = df["ca_mensuel"].shift(1).rolling(3).mean()
    df["ca_moy_6m"]            = df["ca_mensuel"].shift(1).rolling(6).mean()
    df["cout_formateur_lag1"]  = df["total_cout_formateur"].shift(1)
    df["cout_logistique_lag1"] = df["total_cout_logistique"].shift(1)
    df["inscrits_lag1"]        = df["total_inscrits"].shift(1)
    df["nb_sessions_lag1"]     = df["nb_sessions"].shift(1)
    df["taux_impaye"]          = df["total_impaye"] / (df["ca_mensuel"] + 1)
    df["marge_lag1"]           = (
        df["ca_mensuel"].shift(1)
        - df["total_cout_formateur"].shift(1)
        - df["total_cout_logistique"].shift(1)
    )
    df["mois_num"]  = df["mois"]
    df["mois_sin"]  = np.sin(2 * np.pi * df["mois"] / 12)
    df["mois_cos"]  = np.cos(2 * np.pi * df["mois"] / 12)
    return df.dropna()


FEATURES = [
    "ca_lag_1", "ca_lag_2", "ca_lag_3", "ca_lag_12",
    "ca_moy_3m", "ca_moy_6m",
    "cout_formateur_lag1", "cout_logistique_lag1",
    "inscrits_lag1", "nb_sessions_lag1",
    "taux_impaye", "marge_lag1",
    "mois_num", "trimestre", "mois_sin", "mois_cos",
]


def train():
    df     = generate_data()
    df     = build_features(df)
    scaler = StandardScaler()
    X      = scaler.fit_transform(df[FEATURES].values)
    y      = df["ca_mensuel"].values

    model = GradientBoostingRegressor(
        n_estimators=300, learning_rate=0.03,
        max_depth=4, random_state=42
    )
    model.fit(X, y)

    joblib.dump({"model": model, "scaler": scaler, "last_data": df, "features": FEATURES},
                MODELS_DIR / "ca_model.pkl")
    print(f"[train_ca] ✅ Modèle sauvegardé dans models/ca_model.pkl ({len(df)} mois)")


if __name__ == "__main__":
    train()