import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

from data.postgres_loader import load_ca_data

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)


def completer_historique(df_real: pd.DataFrame, target_months: int = 36) -> pd.DataFrame:
    """Complète avec du synthétique basé sur les vraies données."""
    n = len(df_real)
    if n >= target_months:
        return df_real

    print(f"[train] ➕ Complétion : {n} réels → {target_months} mois total")

    # Tendance linéaire sur les vraies données
    x = np.arange(n)
    y = df_real["ca_mensuel"].values
    a, b = np.polyfit(x, y, 1)

    # Ratios moyens du business réel
    ca_total = df_real["ca_mensuel"].sum()
    ratio_form = df_real["total_cout_formateur"].sum() / (ca_total + 1)
    ratio_log  = df_real["total_cout_logistique"].sum() / (ca_total + 1)
    ratio_imp  = df_real["total_impaye"].sum() / (ca_total + 1)
    mean_sess  = int(df_real["nb_sessions"].mean())
    mean_insc  = int(df_real["total_inscrits"].mean())

    # Écart-type des résidus (pour le bruit réaliste)
    trend_vals = a * x + b
    residus = y - trend_vals
    std_residus = np.std(residus) if np.std(residus) > 0 else y.mean() * 0.05

    # Dernier mois réel comme point de départ
    last = df_real.iloc[-1]
    start_year = int(last["annee"])
    start_month = int(last["mois"])

    rows = df_real.to_dict("records")

    # Générer les mois manquants
    for i in range(1, target_months - n + 1):
        mois_total = (start_month - 1) + i
        year = start_year + (mois_total // 12)
        month = (mois_total % 12) + 1
        trimestre = ((month - 1) // 3) + 1

        # CA = tendance + effet saisonnier moyen + bruit
        trend = a * (n + i - 1) + b
        saison = np.mean(residus) if len(residus) > 0 else 0
        bruit = np.random.normal(0, std_residus * 0.5)
        ca = max(0, trend + saison + bruit)

        rows.append({
            "annee": year,
            "mois": month,
            "trimestre": trimestre,
            "ca_mensuel": round(ca, 2),
            "total_cout_formateur": round(ca * ratio_form + np.random.normal(0, 200), 2),
            "total_cout_logistique": round(ca * ratio_log + np.random.normal(0, 100), 2),
            "nb_sessions": max(1, mean_sess + np.random.randint(-2, 3)),
            "total_inscrits": max(1, int(ca / 500) if ca > 500 else mean_insc),
            "total_impaye": round(ca * ratio_imp, 2),
        })

    return pd.DataFrame(rows)


def generate_data():
    df_real = load_ca_data()
    n_real = len(df_real)

    #if n < 15:
    #    raise ValueError(f"❌ Insuffisant : {n} mois réels, minimum 15 requis pour ce modèle.")
    
    #return df

    if n_real == 0:
        raise ValueError("Aucune donnée dans le DW")

    # Compléter si insuffisant pour le feature engineering (besoin de 15+ mois)
    #ki naamel generation lezem nahiha 
    df = completer_historique(df_real, target_months=36)
    return df


def build_features(df):
    df = df.sort_values(["annee", "mois"]).reset_index(drop=True)

    #Parce que le CA de ce mois dépend fortement du CA du mois dernier (tendance, inertie commerciale, saisonnalité).
    df["ca_lag_1"]  = df["ca_mensuel"].shift(1)# valeur du mois précédent
    df["ca_lag_2"]  = df["ca_mensuel"].shift(2)
    df["ca_lag_3"]  = df["ca_mensuel"].shift(3)
    df["ca_lag_12"] = df["ca_mensuel"].shift(12)

    df["ca_moy_3m"] = df["ca_mensuel"].shift(1).rolling(3).mean()
    df["ca_moy_6m"] = df["ca_mensuel"].shift(1).rolling(6).mean()

    df["cout_formateur_lag1"]  = df["total_cout_formateur"].shift(1)
    df["cout_logistique_lag1"] = df["total_cout_logistique"].shift(1)
    df["inscrits_lag1"]        = df["total_inscrits"].shift(1)
    df["nb_sessions_lag1"]     = df["nb_sessions"].shift(1)

    df["taux_impaye_lag1"] = (df["total_impaye"] / (df["ca_mensuel"] + 1)).shift(1)
    df["marge_lag1"]  = (
        df["ca_mensuel"].shift(1)
        - df["total_cout_formateur"].shift(1)
        - df["total_cout_logistique"].shift(1)
    )

    df["mois_num"] = df["mois"]
    df["mois_sin"] = np.sin(2 * np.pi * df["mois"] / 12)
    df["mois_cos"] = np.cos(2 * np.pi * df["mois"] / 12)

    return df.dropna()


FEATURES = [
    "ca_lag_1", "ca_lag_2", "ca_lag_3", "ca_lag_12",
    "ca_moy_3m", "ca_moy_6m",
    "cout_formateur_lag1", "cout_logistique_lag1",
    "inscrits_lag1", "nb_sessions_lag1",
    "taux_impaye_lag1", "marge_lag1",
    "mois_num", "trimestre", "mois_sin", "mois_cos",
]


def train():
    df = generate_data()
    df = build_features(df)

    print(f"[train] 📊 {len(df)} mois utilisables après feature engineering")

    scaler = StandardScaler()
    X = df[FEATURES].values
    y = df["ca_mensuel"].values

    # 80/20 temporel
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=False
    )

    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)

    model = LinearRegression()
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    score_r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)

    print(f"\n📊 RÉSULTATS : R²={score_r2:.4f}, MAE={mae:.2f} DT")

    joblib.dump(
        {"model": model, "scaler": scaler, "last_data": df, "features": FEATURES},
        MODELS_DIR / "ca_model.pkl"
    )
    print(f"💾 Modèle sauvegardé : {MODELS_DIR}/ca_model.pkl")


if __name__ == "__main__":
    train()