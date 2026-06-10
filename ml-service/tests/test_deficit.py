from services.deficit_service import (
    clean_sessions, engineer_features, create_labels, train_model
)
from schemas.deficit_schema import RawSessionInput

def test_deficit_pipeline():
    # ── CORRECTION : 10 sessions minimum pour le split stratifié ──
    sessions = [
        # Sessions DÉFICITAIRES (marge < 0)
        RawSessionInput(session_id="S001", nb_inscrits=5,  capacite=20, revenu=1000,  cout_formateur=2000, cout_logistique=500, impayes=100, date="2024-01-15"),
        RawSessionInput(session_id="S002", nb_inscrits=3,  capacite=15, revenu=500,   cout_formateur=1500, cout_logistique=400, impayes=50,  date="2024-02-20"),
        RawSessionInput(session_id="S003", nb_inscrits=8,  capacite=25, revenu=2000,  cout_formateur=3000, cout_logistique=600, impayes=200, date="2024-03-10"),
        RawSessionInput(session_id="S004", nb_inscrits=2,  capacite=10, revenu=300,   cout_formateur=1200, cout_logistique=300, impayes=30,  date="2024-04-05"),
        RawSessionInput(session_id="S005", nb_inscrits=6,  capacite=18, revenu=800,   cout_formateur=1800, cout_logistique=450, impayes=80,  date="2024-05-12"),
        # Sessions RENTABLES (marge > 0)
        RawSessionInput(session_id="S006", nb_inscrits=18, capacite=20, revenu=8000,  cout_formateur=2000, cout_logistique=500, impayes=50,  date="2024-06-15"),
        RawSessionInput(session_id="S007", nb_inscrits=15, capacite=15, revenu=6000,  cout_formateur=1500, cout_logistique=400, impayes=30,  date="2024-07-20"),
        RawSessionInput(session_id="S008", nb_inscrits=22, capacite=25, revenu=10000, cout_formateur=2500, cout_logistique=600, impayes=100, date="2024-08-10"),
        RawSessionInput(session_id="S009", nb_inscrits=12, capacite=12, revenu=5000,  cout_formateur=1200, cout_logistique=300, impayes=40,  date="2024-09-05"),
        RawSessionInput(session_id="S010", nb_inscrits=20, capacite=22, revenu=9000,  cout_formateur=2200, cout_logistique=550, impayes=60,  date="2024-10-12"),
    ]

    # Test cleaning + features
    df = clean_sessions(sessions)
    df = engineer_features(df)
    df = create_labels(df)

    print(f"✅ Clean: {len(df)} sessions")
    print(f"✅ Features: fill_rate={df['fill_rate'].tolist()}")
    print(f"✅ Labels: {df['is_deficit'].tolist()}")

    # Vérification
    assert "fill_rate" in df.columns
    assert "is_deficit" in df.columns
    assert df["is_deficit"].sum() == 5  # 5 déficitaires
    assert (df["is_deficit"] == 0).sum() == 5  # 5 rentables

    # Test entraînement
    model, scaler, metrics = train_model(df)
    
    print(f"\n📊 Métriques d'entraînement:")
    print(f"   Accuracy: {metrics.accuracy:.3f}")
    print(f"   ROC-AUC: {metrics.roc_auc:.3f}")
    print(f"   Precision: {metrics.precision:.3f}")
    print(f"   Recall: {metrics.recall:.3f}")

    assert metrics.accuracy > 0.5  # Meilleur que le hasard
    assert metrics.roc_auc > 0.5

    print("✅ Pipeline déficit OK")

if __name__ == "__main__":
    test_deficit_pipeline()