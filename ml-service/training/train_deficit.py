import numpy as np
import joblib
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression # On utilise la Régression Logistique
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

#from data.postgres_loader import load_sessions_data

#def generate_data():
    #df = load_sessions_data()
    #assert len(df) >= 50, "Pas assez de sessions historiques (minimum 50)"

    #X = df[[
    #    "nb_inscrits",
    #    "cout_formateur",
    #    "cout_logistique",
    #    "montant_inscriptions",
    #    "duree_jours",
    #    "mois",
    #]].values

    #y = df["est_deficitaire"].values
    #return X, y

def generate_data():
    np.random.seed(99)
    n = 500
    nb_inscrits          = np.random.randint(2, 25, n)
    cout_formateur       = np.random.uniform(500, 3000, n)
    cout_logistique      = np.random.uniform(100, 800, n)
    tarif_moyen          = np.random.uniform(150, 800, n)
    montant_inscriptions = nb_inscrits * tarif_moyen
    duree_jours          = np.random.randint(1, 10, n)
    mois                 = np.random.randint(1, 13, n)
    cout_total           = cout_formateur + cout_logistique
    marge_brute          = montant_inscriptions - cout_total
    est_deficitaire      = (cout_total > montant_inscriptions).astype(int)

    X = np.column_stack([
        nb_inscrits, cout_formateur, cout_logistique,
        montant_inscriptions,
        duree_jours, mois,
    ])
    return X, est_deficitaire


def train():
    X, y     = generate_data()
    scaler   = StandardScaler()
    
    # --- 1. DIVISION 80/20 ---
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # --- 2. NORMALISATION ---
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)

    # --- 3. ENTRAÎNEMENT ---
    model = LogisticRegression()
    model.fit(X_train_scaled, y_train)

    # --- 4. CALCUL DES SCORES ---
    y_pred = model.predict(X_test_scaled)
    y_prob = model.predict_proba(X_test_scaled)[:, 1] # Pour le score AUC
    
    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)

    print("-" * 30)
    print(f"📊 PERFORMANCE MODÈLE DÉFICIT")
    print(f"Précision Globale (Accuracy) : {acc*100:.1f} %")
    print(f"Score AUC : {auc:.2f}")
    print("-" * 30)

    # --- 5. SAUVEGARDE ---
    joblib.dump({"model": model, "scaler": scaler, "model_name": "LogisticRegression"},
                MODELS_DIR / "deficit_model.pkl")

if __name__ == "__main__":
    train()