# ml-service

Ce service contient les scripts d'entraînement ML et les loaders PostgreSQL pour le projet.

## Activation du loader PostgreSQL

1. Copier `.env.example` en `.env`.
2. Remplir `DATABASE_URL` avec la chaîne de connexion Postgres.
3. Par défaut, `USE_DB=0` : les scripts s'exécutent avec des données synthétiques.
4. Pour activer les loaders DB :

```bash
set USE_DB=1
set DATABASE_URL=postgresql://user:password@host:5432/dbname
python -m training.train_risk
```

## Points d'alignement importants

- `finances.type` est une colonne de type `FinanceType` stockant des chaînes :
  - `paiement`, `depense`, `depense_formateur`, `depense_logistique`, `impaye`, `remboursement`
- Pour le calcul de `jours_retard_paiement` en ML, le loader utilise `type = 'impaye'`.
- `load_risk_data()` utilise par défaut `payment_type='impaye'` pour être aligné sur la logique métier.
- `session_id` est traité comme `str` dans `schemas/deficit_schema.py` pour rester compatible avec l'UUID de la base.

## Commandes de test

```bash
python -m training.train_risk
python -m training.train_ca
python -m training.train_deficit
python -m training.train_forecast
```

Avec `USE_DB=1`, le même pipeline passe de données synthétiques à la base PostgreSQL.
