import pandas as pd
import numpy as np
import os
import joblib
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_absolute_error
from sklearn.preprocessing import StandardScaler
from data.postgres_loader import get_filtered_finance_data

def prepare_and_train(df=None, filters=None, horizon=3):
    logs = []
    
    def log(msg):
        logs.append(msg)
        print(msg)
    
    if df is None:
        df = get_filtered_finance_data(filters)
    
    if df is None or len(df) < 10:
        log("❌ Données insuffisantes.")
        return {"success": False, "message": "Données insuffisantes", "logs": logs}
    
    df = df.sort_values(['annee', 'mois']).reset_index(drop=True)
    
    # --- FEATURE ENGINEERING : TON ORIGINAL EXACT ---
    df['target'] = df['ca_reel']
    df['lag_ca_1'] = df['ca_reel'].shift(1)
    df['lag_impayes_1'] = df['flux_impayes'].shift(1)
    df['lag_apprenants_1'] = df['nb_apprenants_uniques'].shift(1)
    
    features = ['lag_ca_1', 'lag_impayes_1', 'lag_apprenants_1', 'capacite_plan', 'mois']
    
    df_ml = df.dropna().copy()
    
    if len(df_ml) < 8:
        log("❌ Pas assez de lignes après dropna.")
        return {"success": False, "message": "Pas assez de lignes", "logs": logs}

    X = df_ml[features]
    y = df_ml['target']

    # --- SPLIT 80/20 CHRONOLOGIQUE ---
    split_idx = int(len(df_ml) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    # --- ENTRAÎNEMENT ---
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    model = LinearRegression()
    model.fit(X_train_scaled, y_train)

    # --- ÉVALUATION ---
    y_pred_test = model.predict(X_test_scaled)
    r2 = r2_score(y_test, y_pred_test)
    mae = mean_absolute_error(y_test, y_pred_test)
    r2_global = model.score(scaler.transform(X), y)

    # Baseline naïve
    dernier_ca_train = y_train.iloc[-1]
    y_pred_naive = np.full_like(y_test, dernier_ca_train)
    mae_naive = mean_absolute_error(y_test, y_pred_naive)

    mape = np.mean(np.abs((y_test.values - y_pred_test) / y_test.values)) * 100

    
    log(f"\n--- BASELINE NAÏVE (dernier CA = {dernier_ca_train:,.2f} DT) ---")
    log(f"MAE Naïve : {mae_naive:,.2f} DT")
    if mae < mae_naive:
        log(f"✅ Le ML gagne de {mae_naive - mae:,.2f} DT vs la recopie")
    else:
        log(f"⚠️  La recopie est meilleure de {mae - mae_naive:,.2f} DT")

    log(f"\n--- RÉSULTATS ---")
    log(f"R² Score (Test) : {r2:.4f}")
    log(f"MAE (Test)      : {mae:,.2f} DT")
    #log(f"R² Global       : {r2_global:.4f}")
    
    for i, (real, pred) in enumerate(zip(y_test.values, y_pred_test)):
        log(f"  Ligne {i+1} | Réel : {real:>12,.2f} DT | Prédit : {pred:>12,.2f} DT | Écart : {abs(real-pred):>10,.2f} DT")

    # --- FORECAST : FALLBACKS LISSÉS (SEULE AMÉLIORATION) ---
    # Au lieu de figer sur la dernière valeur, on prend la moyenne des 3 derniers mois
    fallback = {
        'lag_ca_1': df_ml['ca_reel'].iloc[-1],  # dernier CA connu (obligatoire pour lag)
        'lag_impayes_1': df_ml['flux_impayes'].tail(3).mean(),
        'lag_apprenants_1': df_ml['nb_apprenants_uniques'].tail(3).mean(),
        'capacite_plan': df_ml['capacite_plan'].mean(),
        'mois': 1
    }
    
    temp_df = df_ml.copy()
    forecast_results = []
    
    for i in range(horizon):
        last_row = temp_df.iloc[-1]
        f_month = (int(last_row['mois']) % 12) + 1
        f_year = last_row['annee'] if f_month > 1 else last_row['annee'] + 1
        
        row_values = []
        for feat in features:
            if feat == 'lag_ca_1' and i > 0:
                # M+2, M+3 : on utilise la prédiction précédente (walk-forward)
                val = last_row['ca_reel']
            elif feat == 'lag_impayes_1':
                # On garde la moyenne lissée (pas la dernière valeur brute)
                val = fallback['lag_impayes_1']
            elif feat == 'lag_apprenants_1':
                val = fallback['lag_apprenants_1']
            else:
                val = last_row.get(feat, np.nan)
                if pd.isna(val):
                    val = fallback[feat]
            row_values.append(val)
        
        X_fut = pd.DataFrame([row_values], columns=features)
        pred_val = max(0, model.predict(scaler.transform(X_fut))[0])
        
        # Nouvelle ligne
        new_row = {
            'annee': f_year,
            'mois': f_month,
            'ca_reel': pred_val,
            'flux_impayes': row_values[1],
            'nb_apprenants_uniques': row_values[2],
            'capacite_plan': row_values[3],
            'target': pred_val,
            'lag_ca_1': pred_val,
            'lag_impayes_1': row_values[1],
            'lag_apprenants_1': row_values[2]
        }
        
        temp_df = pd.concat([temp_df, pd.DataFrame([new_row])], ignore_index=True)
        forecast_results.append({
            'date': f"{int(f_month):02d}/{int(f_year)}",
            'ca': round(float(pred_val), 2)
        })

    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/model_ca.pkl")
    joblib.dump(scaler, "models/scaler_ca.pkl")
    log(f"MAPE (Test)     : {mape:.2f} %")   # AJOUTER CETTE LIGNE

    log("\n✅ Modèle sauvegardé dans models/")



    # Historique pour le frontend
    history = df[['annee', 'mois', 'ca_reel']].copy()
    history['date'] = history['mois'].astype(int).astype(str).str.zfill(2) + "/" + history['annee'].astype(int).astype(str)
    history = history[['date', 'ca_reel']].rename(columns={'ca_reel': 'ca'}).to_dict('records')

    return {
        "success": True,
        "metrics": {
            "r2": round(r2, 4),
            "mae": round(mae, 2),
            "mae_naive": round(mae_naive, 2),
            "r2_global": round(r2_global, 4),
            "dernier_ca": round(float(dernier_ca_train), 2)
        },
        "history": history,
        "forecast": forecast_results,
        "logs": logs
    }

if __name__ == "__main__":
    result = prepare_and_train(horizon=3)
    for line in result.get("logs", []):
        print(line)










