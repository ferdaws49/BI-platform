import joblib
import pandas as pd
from sklearn.metrics import classification_report, roc_auc_score
from postgres_loader_sessions import PostgresLoader

def validate_ml():
    loader = PostgresLoader()
    df = loader.get_training_data()
    
    # Charger le modèle
    model = joblib.load('model_deficit.joblib')
    
    X = df[['type_session', 'capacite', 'prix_session', 'mois', 'formation_cat']]
    y = df['is_deficit']
    
    # Score de prédiction
    probs = model.predict_proba(X)[:, 1]
    auc = roc_auc_score(y, probs)
    
    print(f"--- Analyse du Modèle ---")
    print(f"ROC-AUC Score: {auc:.4f}")
    
    # DETECTION DE DATA LEAKING
    if auc > 0.98:
        print("ALERTE : Score trop parfait ! Vérifiez si une variable financière n'est pas restée dans X.")
    elif auc < 0.55:
        print("ATTENTION : Le modèle n'est pas meilleur qu'un hasard. Ajoutez des features.")
    else:
        print("Score réaliste. Le modèle semble sain.")

if __name__ == "__main__":
    validate_ml()