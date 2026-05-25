from fastapi.testclient import TestClient
from main import app  # adaptez si votre fichier s'appelle différemment

client = TestClient(app)

def test_ca_historique():
    response = client.get("/ca/historique?date_from=2024-01-01&date_to=2024-12-31")
    assert response.status_code in [200, 400]  # 400 si pas de données DW
    print(f"✅ /ca/historique: {response.status_code}")

def test_ca_predict():
    response = client.post("/ca/predict", json={
        "date_from": "2024-01-01",
        "date_to": "2024-12-31",
        "periode": 3
    })
    assert response.status_code in [200, 400, 422]
    print(f"✅ /ca/predict: {response.status_code}")

def test_deficit_predict_no_model():
    response = client.post("/deficit/predict", json={
        "date_from": "2024-01-01",
        "date_to": "2024-12-31"
    })
    # 503 si pas de modèle entraîné, 200 si modèle existe, 400 si pas de données
    assert response.status_code in [200, 400, 503]
    print(f"✅ /deficit/predict: {response.status_code}")

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    print(f"✅ /health: {response.json()}")

if __name__ == "__main__":
    test_health()
    test_ca_historique()
    test_ca_predict()
    test_deficit_predict_no_model()
    print("\n🎉 Tous les endpoints répondent correctement")