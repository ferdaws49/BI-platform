# diagnostic_best_features.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import pandas as pd
import numpy as np
from itertools import combinations
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error
from db import get_connection

def load_enriched_data():
    """Charge toutes les features possibles"""
    conn = get_connection()
    
    # 1. Features depuis public.sessions (planning réel)
    query_sessions = """
    SELECT 
        EXTRACT(YEAR FROM date) as annee,
        EXTRACT(MONTH FROM date) as mois,
        COUNT(*) as total_sessions,
        SUM(capacite) as capacite_totale,
        AVG(prix) as prix_moyen_session,
        COUNT(CASE WHEN type = 'présentiel' THEN 1 END)::float / NULLIF(COUNT(*), 0) as prop_presentiel,
        COUNT(CASE WHEN statut = 'Completed' THEN 1 END)::float / NULLIF(COUNT(*), 0) as taux_completion
    FROM public.sessions
    GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
    ORDER BY annee, mois;
    """
    
    df_sessions = pd.read_sql(query_sessions, conn)
    
    # 2. CA depuis public.finances (plus simple que DW)
    query_ca = """
    SELECT 
        EXTRACT(YEAR FROM date) as annee,
        EXTRACT(MONTH FROM date) as mois,
        SUM(montant) as ca_mensuel
    FROM public.finances
    WHERE type = 'paiement'
    GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
    ORDER BY annee, mois;
    """
    
    df_ca = pd.read_sql(query_ca, conn)
    conn.close()
    
    # Merge
    df = df_sessions.merge(df_ca, on=['annee', 'mois'], how='inner')
    
    # Nettoyage
    for col in df.columns:
        if col not in ['annee', 'mois']:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    # Saisonnalité
    df["mois_sin"] = np.sin(2 * np.pi * df["mois"] / 12)
    df["mois_cos"] = np.cos(2 * np.pi * df["mois"] / 12)
    
    return df

def test_all_combinations(df):
    """Teste toutes les paires de 2 features"""
    
    # Toutes les features candidates (planifiables uniquement)
    ALL_FEATURES = [
        "total_sessions",      # Nombre de sessions créées
        "capacite_totale",     # Somme des capacités
        "prix_moyen_session",  # Prix moyen
        "prop_presentiel",     # % présentiel
        "mois_sin",           # Saisonnalité
        "mois_cos"            # Saisonnalité
    ]
    
    print("=" * 80)
    print("🔬 TEST DE TOUTES LES COMBINAISONS DE 2 FEATURES")
    print("=" * 80)
    print(f"Nombre de mois : {len(df)}")
    print(f"Features testées : {ALL_FEATURES}")
    print()
    
    results = []
    
    for feat1, feat2 in combinations(ALL_FEATURES, 2):
        X = df[[feat1, feat2]].values
        y = df["ca_mensuel"].values
        
        # Split 80/20 temporel
        split = int(len(df) * 0.8)
        X_train, X_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]
        
        if len(y_test) == 0:
            continue
        
        # StandardScaler
        scaler = StandardScaler()
        X_train_s = scaler.fit_transform(X_train)
        X_test_s = scaler.transform(X_test)
        
        model = LinearRegression()
        model.fit(X_train_s, y_train)
        
        y_pred = model.predict(X_test_s)
        r2 = r2_score(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        
        results.append({
            'features': f"{feat1} + {feat2}",
            'r2': r2,
            'mae': mae,
            'model': model,
            'scaler': scaler,
            'feat1': feat1,
            'feat2': feat2
        })
        
        status = "✅" if r2 > 0.5 else "⚠️" if r2 > 0 else "❌"
        print(f"  {status} {feat1:<20} + {feat2:<20} | R² = {r2:>+7.4f} | MAE = {mae:>8,.0f} DT")

    # Classement
    results_sorted = sorted(results, key=lambda x: x['r2'], reverse=True)
    
    print("\n" + "=" * 80)
    print("🏆 CLASSEMENT TOP 5")
    print("=" * 80)
    
    for i, r in enumerate(results_sorted[:5], 1):
        print(f"  {i}. {r['features']:<40} | R² = {r['r2']:+.4f} | MAE = {r['mae']:,.0f} DT")
    
    # Meilleur
    best = results_sorted[0]
    print("\n" + "=" * 80)
    print("🥇 MEILLEURE COMBINAISON")
    print("=" * 80)
    print(f"Features : {best['features']}")
    print(f"R² test  : {best['r2']:+.4f}")
    print(f"MAE test : {best['mae']:,.0f} DT")
    
    return best

def detail_best_model(df, best):
    """Détail du meilleur modèle"""
    
    feat1, feat2 = best['feat1'], best['feat2']
    X = df[[feat1, feat2]].values
    y = df["ca_mensuel"].values
    
    split = int(len(df) * 0.8)
    
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X[:split])
    X_test_s = scaler.transform(X[split:])
    
    model = LinearRegression()
    model.fit(X_train_s, y[:split])
    y_pred = model.predict(X_test_s)
    
    print(f"\n--- 📊 Formule ---")
    print(f"  CA = {model.coef_[0]:+.1f} × {feat1} + {model.coef_[1]:+.1f} × {feat2} + {model.intercept_:.1f}")
    
    print(f"\n--- 🔍 Détail test ---")
    print(f"{'Mois':<<10} {'Réel':>10} {'Prédit':>10} {'Erreur':>8} {feat1:>12} {feat2:>12}")
    print("-" * 70)
    
    for i in range(split, len(df)):
        row = df.iloc[i]
        print(f"{int(row['annee'])}-{int(row['mois']):02d}     "
              f"{y[i]:>10,.0f} {y_pred[i-split]:>10,.0f} "
              f"{abs(y[i]-y_pred[i-split]):>8,.0f} "
              f"{row[feat1]:>12.1f} {row[feat2]:>12.2f}")

if __name__ == "__main__":
    print("📦 Chargement des données enrichies...")
    df = load_enriched_data()
    
    print(f"\n📊 Aperçu :")
    print(df.to_string(index=False))
    
    best = test_all_combinations(df)
    detail_best_model(df, best)