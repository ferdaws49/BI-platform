# Architecture — Risk & Forecast

## Risque d'abandon (Alerts IA)

```
training/train_risk.py     →  models/risk_model.pkl
models/registry.py         →  singleton (predict only)
api/predict_routes.py      →  POST /predict
```

| Fichier | Rôle |
|---------|------|
| `training/train_risk.py` | Split 80/20, LR vs RF, métriques test, save .pkl |
| `models/registry.py` | `predict_proba` (imputer + scaler) |
| `services/risk.py` | Niveaux + `factors` texte |

**80/20** = uniquement à l'entraînement. `/predict` = données nouvelles, pas de split.

---

## Prévision inscriptions — Option B + fallback

### Stratégie hybride (pour le mémoire / jury)

> *Prophet est le modèle principal (séries temporelles, intervalles de confiance).
> Un modèle de tendance linéaire est entraîné en parallèle et sert de **fallback** si Prophet
> est indisponible ou si la prédiction échoue, afin de garantir la continuité du service.*

### Flux

```
TRAINING (offline, une fois / cron)
  ├─ Split 80/20 → MAE test : Prophet vs LinearTrend
  ├─ Fit modèle principal sur tout l'historique offline
  ├─ Fit LinearTrend de secours (toujours)
  └─ save forecast_model.pkl

API POST /forecast (predict only)
  ├─ Si .pkl = Prophet → predict Prophet (yhat, yhat_lower, yhat_upper)
  │     └─ si erreur → log + LinearTrend fallback
  └─ Si .pkl = LinearTrend → predict LinearTrend
  └─ model_used dans la réponse = modèle réellement utilisé
```

| Fichier | Rôle |
|---------|------|
| `training/train_forecast.py` | Choix Prophet/Linear + bundle avec `linear_fallback` |
| `models/forecast.py` | Predict only + logging + `last_model_used` |
| `api/forecast_routes.py` | HTTP ; historique NestJS = affichage + tendance |
| `config.STATIC_HISTORIQUE` | Données démo si &lt; 3 mois en entrée |

### Ce n'est PAS (ancien Option A)

- ❌ `Prophet.fit()` à chaque requête HTTP
- ✅ `Prophet.fit()` seulement dans `train_forecast.py`

### Commandes

```bash
python -m training.train_risk
python -m training.train_forecast
uvicorn main:app --reload --port 8000
```

Relancer `train_forecast` quand la base a de nouveaux mois d'inscriptions.
