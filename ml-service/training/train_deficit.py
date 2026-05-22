import numpy as np
import joblib
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.model_selection import cross_val_score

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
    X_scaled = scaler.fit_transform(X)

    candidates = {
        "GradientBoosting": GradientBoostingClassifier(
            n_estimators=150, max_depth=4, learning_rate=0.05, random_state=42
        ),
        "RandomForest": RandomForestClassifier(
            n_estimators=100, max_depth=5, random_state=42
        ),
    }

    best_score, best_name, best_model = -1, "", None
    for name, clf in candidates.items():
        score = cross_val_score(clf, X_scaled, y, cv=5, scoring="roc_auc").mean()
        print(f"[train_deficit] {name}: AUC = {score:.3f}")
        if score > best_score:
            best_score, best_name, best_model = score, name, clf

    best_model.fit(X_scaled, y)

    joblib.dump({"model": best_model, "scaler": scaler, "model_name": best_name},
                MODELS_DIR / "deficit_model.pkl")
    print(f"[train_deficit] ✅ {best_name} sauvegardé dans models/deficit_model.pkl (AUC={best_score:.3f})")


if __name__ == "__main__":
    train()