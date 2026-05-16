# 📚 Mini Data Warehouse (ROLAP) - Concepts Clés

## 🎯 Les 3 Concepts Essentiels

### 1️⃣ Table de FAITS (Fact Table)

**Qu'est-ce que c'est?**

- **Les CHIFFRES** à analyser (métriques)
- Les transactions, ventes, inscriptions, etc.
- Toujours des **nombres quantifiables**

**Exemple:**

```sql
-- Table de FAITS: enrollment_facts
CREATE TABLE enrollment_facts (
  fact_id SERIAL PRIMARY KEY,
  -- Les CLÉS vers les dimensions
  dimension_formation_id INT,
  dimension_apprenant_id INT,
  dimension_date_id INT,

  -- Les MÉTRIQUES (faits)
  enrollment_count INT,         -- 1 apprenant inscrit
  revenue DECIMAL(10,2),         -- Montant payé
  completion_status VARCHAR(50), -- Statut
);
```

**Caractéristiques:**

- ✅ Contient des **clés étrangères** vers les dimensions
- ✅ Contient des **métriques** (COUNT, SUM, AVG)
- ✅ Optimisée pour **les calculs/agrégations**

---

### 2️⃣ Tables de DIMENSIONS (Dimension Tables)

**Qu'est-ce que c'est?**

- **Les CONTEXTES** (qui, quoi, quand, où)
- Les attributs descriptifs
- Les références, catégories, dates, etc.

**Exemples:**

#### Dimension Formation

```sql
CREATE TABLE dim_formation (
  formation_id SERIAL PRIMARY KEY,
  formation_code VARCHAR(50),
  formation_titre VARCHAR(255),
  formation_categorie VARCHAR(100),
  formation_prix DECIMAL(10,2),
  formation_duree_heures INT,
  formation_statut VARCHAR(50),
  formation_created_at DATE,
);
```

#### Dimension Apprenant

```sql
CREATE TABLE dim_apprenant (
  apprenant_id SERIAL PRIMARY KEY,
  user_id INT,
  apprenant_nom VARCHAR(100),
  apprenant_prenom VARCHAR(100),
  apprenant_email VARCHAR(100),
  apprenant_date_joined DATE,
  apprenant_region VARCHAR(100),
);
```

#### Dimension Date

```sql
CREATE TABLE dim_date (
  date_id SERIAL PRIMARY KEY,
  full_date DATE UNIQUE,
  year INT,
  month INT,
  month_name VARCHAR(20),
  quarter INT,
  day_of_week INT,
  day_name VARCHAR(20),
);
```

**Caractéristiques:**

- ✅ Contiennent les **attributs descriptifs**
- ✅ **Dénormalisées** (pas de JOIN compliqué)
- ✅ Petites tables (peu de lignes)
- ✅ Référencées par les tables de faits

---

## 🔗 Le Schéma en Étoile (Star Schema)

```
                   ┌─────────────────┐
                   │  dim_date       │
                   ├─────────────────┤
                   │ date_id         │
                   │ full_date       │
                   │ year, month     │
                   │ day_name        │
                   └────────┬────────┘
                            │
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        │                   │                   │
┌───────▼──────────┐  ┌─────▼─────────────┐  ┌─▼─────────────────┐
│ dim_formation    │  │ enrollment_facts  │  │ dim_apprenant     │
├──────────────────┤  ├───────────────────┤  ├───────────────────┤
│ formation_id (FK)├──┤ dimension_formation│  │ apprenant_id (FK) │
│ titre            │  │ dimension_apprenant│─┤ user_id           │
│ categorie        │  │ dimension_date_id  │  │ nom, prenom       │
│ prix             │  │ enrollment_count   │  │ email, region     │
│ duree_heures     │  │ revenue            │  └───────────────────┘
└──────────────────┘  │ completion_status  │
                      └───────────────────┘
```

**C'est quoi "Star Schema"?**

- Les dimensions sont **autour** de la table de faits
- Comme une **étoile** ⭐
- Ultra simple à comprendre et requêter!

---

## 📊 Exemple Concret: Ton Projet

### Tables SOURCES (déjà existantes - inchangées!)

```
user → inscriptions → apprenants → sessions → formations → finances → performances
```

### Mini DW à créer:

```sql
-- 1️⃣ TABLE DE FAITS
CREATE TABLE enrollment_facts (
  fact_id SERIAL PRIMARY KEY,

  -- Clés vers dimensions
  dim_formation_id INT REFERENCES dim_formation(formation_id),
  dim_apprenant_id INT REFERENCES dim_apprenant(apprenant_id),
  dim_date_enrollment_id INT REFERENCES dim_date(date_id),
  dim_date_completion_id INT REFERENCES dim_date(date_id),

  -- Métriques/Faits
  enrollment_count INT DEFAULT 1,           -- 1 inscription = 1
  revenue DECIMAL(10,2),                    -- Prix formation
  is_completed BOOLEAN,                     -- Complétée?
  completion_percentage INT,                -- 0-100
  success_score INT,                        -- Note apprenant

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2️⃣ DIMENSIONS
-- dim_formation (extraction depuis formations)
CREATE TABLE dim_formation (
  formation_id SERIAL PRIMARY KEY,
  source_formation_id INT UNIQUE REFERENCES formations(id),
  formation_code VARCHAR(50),
  formation_titre VARCHAR(255),
  formation_categorie VARCHAR(100),
  formation_prix DECIMAL(10,2),
  formation_duree_heures INT,
  formation_statut VARCHAR(50),
  formation_created_at DATE,
  dw_load_date TIMESTAMP DEFAULT NOW()
);

-- dim_apprenant
CREATE TABLE dim_apprenant (
  apprenant_id SERIAL PRIMARY KEY,
  source_apprenant_id INT UNIQUE REFERENCES apprenants(id),
  source_user_id INT REFERENCES "user"(id),
  apprenant_nom VARCHAR(100),
  apprenant_prenom VARCHAR(100),
  apprenant_email VARCHAR(100),
  apprenant_date_joined DATE,
  apprenant_region VARCHAR(100),
  dw_load_date TIMESTAMP DEFAULT NOW()
);

-- dim_date (pré-générée pour les 10 prochaines années)
CREATE TABLE dim_date (
  date_id SERIAL PRIMARY KEY,
  full_date DATE UNIQUE,
  year INT,
  month INT,
  month_name VARCHAR(20),
  quarter INT,
  day_of_week INT,
  day_name VARCHAR(20),
  is_weekend BOOLEAN,
  is_holiday BOOLEAN
);
```

---

## 🔄 Comment ça MARCHE ensemble?

### Exemple 1: "Combien d'apprenants par formation ce mois-ci?"

#### ❌ AVANT (OLTP - beaucoup de JOINs)

```sql
-- Lent et compliqué!
SELECT
  f.titre,
  COUNT(DISTINCT sa.apprenantId)
FROM formations f
LEFT JOIN sessions s ON f.id = s.formationId
LEFT JOIN sessions_apprenants sa ON s.id = sa.sessionId
LEFT JOIN apprenants a ON a.id = sa.apprenantId
WHERE MONTH(a.dateAccepted) = MONTH(NOW())
GROUP BY f.titre;
```

#### ✅ APRÈS (ROLAP - simple!)

```sql
-- Ultra rapide et clair!
SELECT
  df.formation_titre,
  SUM(ef.enrollment_count) as total_enrollments
FROM enrollment_facts ef
LEFT JOIN dim_formation df ON ef.dim_formation_id = df.formation_id
LEFT JOIN dim_date dd ON ef.dim_date_enrollment_id = dd.date_id
WHERE dd.year = YEAR(NOW()) AND dd.month = MONTH(NOW())
GROUP BY df.formation_titre;
```

### Exemple 2: "Quel est le revenu par formation et par mois?"

#### ❌ AVANT (OLTP)

```sql
-- Beaucoup de calculs et JOINs
SELECT
  f.titre,
  DATE_TRUNC('month', a.dateAccepted) as month,
  SUM(f.prix) as total_revenue
FROM formations f
LEFT JOIN sessions s ON f.id = s.formationId
LEFT JOIN sessions_apprenants sa ON s.id = sa.sessionId
LEFT JOIN apprenants a ON a.id = sa.apprenantId
WHERE a.dateAccepted IS NOT NULL
GROUP BY f.titre, DATE_TRUNC('month', a.dateAccepted)
ORDER BY month DESC;
```

#### ✅ APRÈS (ROLAP)

```sql
-- Rapide et direct!
SELECT
  df.formation_titre,
  dd.month_name || ' ' || dd.year as month,
  SUM(ef.revenue) as total_revenue,
  COUNT(*) as enrollments
FROM enrollment_facts ef
LEFT JOIN dim_formation df ON ef.dim_formation_id = df.formation_id
LEFT JOIN dim_date dd ON ef.dim_date_enrollment_id = dd.date_id
GROUP BY df.formation_titre, dd.year, dd.month, dd.month_name
ORDER BY dd.year DESC, dd.month DESC;
```

---

## 🛠️ Comment REMPLIR les Tables du DW?

### Processus: ETL (Extract, Transform, Load)

```
SOURCE (OLTP)          TRANSFORM           TARGET (DW)
┌─────────────┐        ┌───────────┐      ┌──────────────┐
│ formations  │───────▶│ Extract   │─────▶│ dim_formation│
│ apprenants  │        │ Transform │      │              │
│ sessions    │───────▶│ Load      │─────▶│ dim_apprenant│
│ dates       │        └───────────┘      │ dim_date     │
└─────────────┘                           │              │
                                          └──────────────┘
                                                  ▲
                                                  │
                                          Requête d'agrégation
                                                  │
                                          ┌──────────────────┐
                                          │enrollment_facts  │
                                          │(table des faits) │
                                          └──────────────────┘
```

### Exemple de Service ETL

```typescript
// src/common/services/dw-etl.service.ts
@Injectable()
export class DwEtlService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  // Charger dim_formation
  async loadDimFormation() {
    await this.dataSource.query(`
      INSERT INTO dim_formation 
      (source_formation_id, formation_code, formation_titre, formation_categorie, formation_prix, formation_duree_heures, formation_statut, formation_created_at)
      SELECT 
        id, 
        CONCAT('FORM-', id),
        titre,
        categorie,
        prix,
        dureeHeures,
        statut,
        createdAt
      FROM formations
      ON CONFLICT (source_formation_id) DO UPDATE SET
        formation_titre = EXCLUDED.formation_titre,
        formation_prix = EXCLUDED.formation_prix;
    `);
  }

  // Charger dim_apprenant
  async loadDimApprenant() {
    await this.dataSource.query(`
      INSERT INTO dim_apprenant
      (source_apprenant_id, source_user_id, apprenant_nom, apprenant_prenom, apprenant_email, apprenant_date_joined, apprenant_region)
      SELECT 
        a.id,
        a.userId,
        u.nom,
        u.prenom,
        u.email,
        a.dateAccepted,
        'FR' -- ou depuis une colonne region si elle existe
      FROM apprenants a
      LEFT JOIN "user" u ON a.userId = u.id
      ON CONFLICT (source_apprenant_id) DO UPDATE SET
        apprenant_nom = EXCLUDED.apprenant_nom,
        apprenant_prenom = EXCLUDED.apprenant_prenom;
    `);
  }

  // Charger enrollment_facts
  async loadEnrollmentFacts() {
    await this.dataSource.query(`
      INSERT INTO enrollment_facts
      (dim_formation_id, dim_apprenant_id, dim_date_enrollment_id, enrollment_count, revenue, is_completed)
      SELECT 
        df.formation_id,
        da.apprenant_id,
        dd.date_id,
        1,
        f.prix,
        CASE WHEN perf.estReussi = true THEN true ELSE false END
      FROM sessions_apprenants sa
      LEFT JOIN apprenants a ON sa.apprenantId = a.id
      LEFT JOIN dim_apprenant da ON a.id = da.source_apprenant_id
      LEFT JOIN sessions s ON sa.sessionId = s.id
      LEFT JOIN formations f ON s.formationId = f.id
      LEFT JOIN dim_formation df ON f.id = df.source_formation_id
      LEFT JOIN dim_date dd ON DATE(a.dateAccepted) = dd.full_date
      LEFT JOIN performances perf ON a.id = perf.apprenantId AND s.id = perf.sessionId;
    `);
  }

  // Cron: Rafraîchir toutes les nuits
  @Cron('0 3 * * *') // 3h du matin
  async refreshAllDimensions() {
    await this.loadDimFormation();
    await this.loadDimApprenant();
    await this.loadEnrollmentFacts();
    console.log('✅ DW refreshed');
  }
}
```

---

## 🚀 Mini DW en 5 Étapes

### Étape 1: Créer les tables (SQL)

```sql
-- Migration TypeORM
1. dim_formation
2. dim_apprenant
3. dim_date
4. enrollment_facts
```

### Étape 2: Charger les dimensions

```typescript
// Service: loadDimFormation(), loadDimApprenant()
// Quand? À la migration ou manuellement une fois
```

### Étape 3: Remplir la table de faits

```typescript
// Service: loadEnrollmentFacts()
// Quand? Chaque nuit (CRON)
```

### Étape 4: Requêtes OLAP ultra simples

```sql
SELECT formation_titre, SUM(revenue)
FROM enrollment_facts ef
LEFT JOIN dim_formation df ON ...
GROUP BY formation_titre;
```

### Étape 5: Adapter les services dashboard

```typescript
// Remplacer les requêtes complexes par des SELECT simples depuis le DW
```

---

## 📋 Résumé: Faits vs Dimensions

| Aspect          | Table de FAITS                    | Table de DIMENSIONS            |
| --------------- | --------------------------------- | ------------------------------ |
| **Contient**    | Métriques, nombres                | Attributs descriptifs          |
| **Exemple**     | enrollment_count, revenue         | formation_titre, apprenant_nom |
| **Taille**      | Grande (millions de lignes)       | Petite (milliers de lignes)    |
| **Grain**       | 1 ligne = 1 transaction/événement | 1 ligne = 1 entité             |
| **Clés**        | Clés étrangères vers dimensions   | Clés primaires simples         |
| **Modificat.**  | Souvent (nouveau fait/jour)       | Rarement (changer un attribut) |
| **Exemple SQL** | `SELECT COUNT(*), SUM(revenue)`   | `SELECT titre, categorie`      |

---

## ✅ TON MINI DW (simplifié)

```
┌─────────────────────────────────────────────────────────┐
│              TA PLATEFORME (OLTP) - INCHANGÉE          │
│    user, inscriptions, formations, sessions, etc.       │
└────────────────────┬────────────────────────────────────┘
                     │ (ETL Chaque nuit)
                     ▼
┌─────────────────────────────────────────────────────────┐
│              TON MINI DATA WAREHOUSE                     │
├─────────────────────────────────────────────────────────┤
│ DIMENSIONS:                                             │
│  - dim_formation (titre, prix, catégorie, etc.)        │
│  - dim_apprenant (nom, email, région, etc.)            │
│  - dim_date (jour, mois, année, etc.)                   │
│                                                          │
│ TABLE DE FAITS:                                         │
│  - enrollment_facts (qui s'inscrit, quand, combien $)  │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
         (Requêtes OLAP ultra rapides)
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         DASHBOARDS (10x plus rapide)                     │
│    Admin, Directeur, Financier, Pédagogique            │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Maintenant tu peux:

1. **Créer les tables** (dim_formation, dim_apprenant, dim_date, enrollment_facts)
2. **Écrire le service ETL** (charger les données chaque nuit)
3. **Utiliser le DW** dans tes dashboards pour des requêtes ultra rapides

**Aucune modification sur tes entities existantes!** ✅

Veux-tu que je code directement le **DW complet** ou tu veux comprendre plus d'aspects?
