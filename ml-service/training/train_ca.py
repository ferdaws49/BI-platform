import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

from data.postgres_loader import load_ca_data
from schemas.ca_schema import CAFilter


MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)




def generate_data():
    filters = CAFilter()
    df = load_ca_data(filters)
    n = len(df)

    if n < 6:
        raise ValueError(f"❌ Insuffisant : {n} mois réels, minimum 6 requis pour ce modèle.")
    
    return df


#lezemni nthabet  ml features elli rbat bih  ca_lag_1
def build_features(df):
    df = df.sort_values(["annee", "mois"]).reset_index(drop=True)

    #Parce que le CA de ce mois dépend fortement du CA du mois dernier (tendance, inertie commerciale, saisonnalité).
    df["ca_lag_1"]  = df["ca_mensuel"].shift(1)# valeur du mois précédent

    df["inscrits_lag1"]        = df["total_inscrits"].shift(1)
    df["nb_sessions_lag1"]     = df["nb_sessions"].shift(1)

    df["cout_total_lag1"] = (
        df["total_cout_formateur"] + 
        df["total_cout_logistique"]
    ).shift(1)
    df["mois_sin"] = np.sin(2 * np.pi * df["mois"] / 12)
    df["mois_cos"] = np.cos(2 * np.pi * df["mois"] / 12)

    return df.dropna()


FEATURES = [
    "ca_lag_1",
    "inscrits_lag1",
    "cout_total_lag1",
    "mois_sin",
    "mois_cos"
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