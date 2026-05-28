import numpy as np
import joblib
from pathlib import Path
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error

from data.postgres_loader import load_data, get_features

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)
MODEL_PATH = MODELS_DIR / "ca_model_mensuel.pkl"

def train():
    df = load_data()  # ← Charge d'abord
    FEATURES = get_features(df)  # ← Passe df ici
    
    print(f"📦 Mois : {len(df)} | Features : {FEATURES}")
    
    X = df[FEATURES].values
    y = df['ca_mensuel'].values
    
    # ... reste identique
    
    # Leave-One-Out (meilleur avec peu de données)
    from sklearn.model_selection import LeaveOneOut
    
    loo = LeaveOneOut()
    predictions = []
    actuals = []
    
    for train_idx, test_idx in loo.split(X):
        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]
        
        scaler = StandardScaler()
        X_train_s = scaler.fit_transform(X_train)
        X_test_s = scaler.transform(X_test)
        
        model = LinearRegression()
        model.fit(X_train_s, y_train)
        
        pred = model.predict(X_test_s)[0]
        predictions.append(pred)
        actuals.append(y_test[0])
    
    predictions = np.array(predictions)
    actuals = np.array(actuals)
    
    r2 = r2_score(actuals, predictions)
    mae = mean_absolute_error(actuals, predictions)
    
    print(f"\n--- Résultats Leave-One-Out ---")
    print(f"R²  : {r2:+.4f}")
    print(f"MAE : {mae:,.0f} DT")
    
    for i, row in df.iterrows():
        print(f"  {int(row['annee'])}-{int(row['mois']):02d} | "
              f"Réel: {actuals[i]:>8,.0f} | "
              f"Prédit: {predictions[i]:>8,.0f}")
    
    # Modèle final sur tout
    scaler_final = StandardScaler()
    X_all_s = scaler_final.fit_transform(X)
    
    model_final = LinearRegression()
    model_final.fit(X_all_s, y)
    
    joblib.dump({
        "model": model_final,
        "scaler": scaler_final,
        "features": FEATURES,
        "history": df.to_dict("records")
    }, MODEL_PATH)
    
    print(f"\n✅ Modèle sauvegardé")

if __name__ == "__main__":
    train()