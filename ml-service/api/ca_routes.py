import numpy as np
import pandas as pd
from fastapi import APIRouter
from schemas.ca_schema import CAForecastResponse, CAMoisPrevu
from services.ca_service import ca_registry

router = APIRouter(tags=["CA Forecast"])


@router.get("/predict-ca", response_model=CAForecastResponse)
def predict_ca():
    previsions = ca_registry.predict_next_months(nb_mois=3)
    ca_values  = [p["ca_predit"] for p in previsions]

    if ca_values[-1] > ca_values[0] * 1.05:   tendance = "hausse"
    elif ca_values[-1] < ca_values[0] * 0.95: tendance = "baisse"
    else:                                      tendance = "stable"

    return CAForecastResponse(
        previsions = [CAMoisPrevu(**p) for p in previsions],
        model_used = "GradientBoosting",
        tendance   = tendance,
    )


@router.get("/predict-ca/backtest")
def backtest_ca():
    df       = ca_registry.last_data.copy()
    df_train = df.iloc[:-3].copy()
    df_test  = df.iloc[-3:].copy()

    vraies_valeurs = df_test["ca_mensuel"].tolist()
    mois_test = [
        f"{int(row['annee'])}-{int(row['mois_num']):02d}"
        for _, row in df_test.iterrows()
    ]

    predictions = []
    df_iter = df_train.copy()

    for _ in range(3):
        last           = df_iter.iloc[-1]
        mois_suivant   = int(last["mois_num"]) % 12 + 1
        annee_suivante = int(last["annee"]) + (1 if mois_suivant == 1 else 0)
        trimestre      = ((mois_suivant - 1) // 3) + 1

        features  = ca_registry._build_row_features(df_iter, mois_suivant, annee_suivante, trimestre)
        ca_predit = float(ca_registry.model.predict(ca_registry.scaler.transform(features))[0])
        predictions.append(ca_predit)

        new_row = last.copy()
        new_row["annee"]      = annee_suivante
        new_row["mois_num"]   = mois_suivant
        new_row["trimestre"]  = trimestre
        new_row["ca_mensuel"] = ca_predit
        new_row["marge_lag1"] = ca_predit - (
            last["total_cout_formateur"] + last["total_cout_logistique"]
        )
        df_iter = pd.concat([df_iter, pd.DataFrame([new_row])], ignore_index=True)

    erreurs_pct = [
        abs(predictions[i] - vraies_valeurs[i]) / max(1, vraies_valeurs[i]) * 100
        for i in range(3)
    ]
    mae  = round(sum(abs(predictions[i] - vraies_valeurs[i]) for i in range(3)) / 3, 2)
    mape = round(sum(erreurs_pct) / 3, 2)

    comparaison = []
    for i in range(3):
        ecart = predictions[i] - vraies_valeurs[i]
        comparaison.append({
            "mois":      mois_test[i],
            "ca_reel":   round(vraies_valeurs[i], 2),
            "ca_predit": round(predictions[i], 2),
            "ecart":     round(ecart, 2),
            "ecart_pct": f"{round(erreurs_pct[i], 1)}%",
            "evaluation": (
                "✅ Excellent"  if erreurs_pct[i] < 5  else
                "🟡 Acceptable" if erreurs_pct[i] < 15 else
                "🔴 Mauvais"
            ),
        })

    return {
        "comparaison": comparaison,
        "metriques": {
            "MAE":     f"{mae} DT",
            "MAPE":    f"{mape}%",
            "qualite": (
                "✅ Excellent — erreur < 5%"  if mape < 5  else
                "🟡 Acceptable — erreur < 15%" if mape < 15 else
                "🔴 Mauvais — erreur > 15%"
            ),
        },
        "interpretation": {
            "MAE":  "Erreur moyenne en DT (plus c'est bas, mieux c'est)",
            "MAPE": "Erreur moyenne en % (idéal < 10%)",
        },
    }