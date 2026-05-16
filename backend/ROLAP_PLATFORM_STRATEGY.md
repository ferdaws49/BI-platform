# 📊 ROLAP Strategy - Plateforme Complète

## 🎯 Vision Globale

**Transformer toute la plateforme de OLTP → ROLAP**

| Module                   | État Actuel      | Cible ROLAP     |
| ------------------------ | ---------------- | --------------- |
| 👨‍💼 Admin Dashboard       | 11 requêtes/load | 2 requêtes/load |
| 📈 Directeur Dashboard   | 20+ requêtes     | 5 requêtes      |
| 💰 Financier Dashboard   | 15+ requêtes     | 3 requêtes      |
| 🎓 Pédagogique Dashboard | 12+ requêtes     | 3 requêtes      |
| 📚 Apprenant Dashboard   | 8 requêtes       | 2 requêtes      |

---

## 🏗️ Architecture ROLAP

### Concept: Vues Matérialisées (Materialized Views)

**SANS modifier les entities existantes!**

```
┌──────────────────────────────────────────────┐
│         TABLES SOURCE (Inchangées)            │
├──────────────────────────────────────────────┤
│ - user                                        │
│ - inscription                                 │
│ - formations                                  │
│ - sessions                                    │
│ - apprenants                                  │
│ - finances                                    │
│ - performances                                │
└──────────────────────────────────────────────┘
                      ↓
            (Chaque nuit / Toutes les 5 min)
                      ↓
┌──────────────────────────────────────────────┐
│      VUES MATÉRIALISÉES (Agrégations)         │
├──────────────────────────────────────────────┤
│ - kpi_dashboard_mv                            │
│ - activity_dashboard_mv                       │
│ - directeur_enrollments_mv                    │
│ - directeur_revenue_mv                        │
│ - financier_recap_mv                          │
│ - pedagogique_stats_mv                        │
│ - apprenant_progress_mv                       │
└──────────────────────────────────────────────┘
                      ↓
            (1 requête simple par endpoint)
                      ↓
┌──────────────────────────────────────────────┐
│           API Response (Ultra rapide)          │
└──────────────────────────────────────────────┘
```

---

## 📋 Vues Matérialisées à Créer

### 1️⃣ **Admin Dashboard**

```sql
-- kpi_dashboard_mv
CREATE MATERIALIZED VIEW kpi_dashboard_mv AS
SELECT
  (SELECT COUNT(*) FROM "user" WHERE status = 'ACCEPTED') as utilisateurs_actifs,
  (SELECT COUNT(*) FROM "user" WHERE "createdAt" >= DATE_TRUNC('month', NOW())) as donnees_importees,
  (SELECT COUNT(*) FROM inscription WHERE statut = 'PENDING') as demandes_en_attente,
  (SELECT COUNT(*) FROM "user" WHERE status = 'REJECTED') as erreurs_systeme,
  NOW() as last_refreshed;

-- activity_dashboard_mv
CREATE MATERIALIZED VIEW activity_dashboard_mv AS
SELECT
  DATE("createdAt") as day_date,
  TO_CHAR(DATE("createdAt"), 'Dy') as day_name,
  COUNT(*) as imports,
  0 as connexions
FROM "user"
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY DATE("createdAt"), TO_CHAR(DATE("createdAt"), 'Dy')
ORDER BY day_date ASC;
```

### 2️⃣ **Directeur Dashboard**

```sql
-- directeur_enrollments_mv (avec dimensions temps + formation)
CREATE MATERIALIZED VIEW directeur_enrollments_mv AS
SELECT
  f.id as formation_id,
  f.titre as formation_titre,
  COUNT(DISTINCT sa.apprenantId) as total_enrolled,
  COUNT(DISTINCT CASE WHEN a.dateAccepted >= DATE_TRUNC('month', NOW()) THEN a.id END) as enrollments_this_month,
  DATE_TRUNC('month', a.dateAccepted)::DATE as month,
  NOW() as last_refreshed
FROM formations f
LEFT JOIN sessions s ON s.formationId = f.id
LEFT JOIN sessions_apprenants sa ON sa.sessionId = s.id
LEFT JOIN apprenants a ON a.id = sa.apprenantId
GROUP BY f.id, f.titre, DATE_TRUNC('month', a.dateAccepted)
ORDER BY month DESC, formation_titre ASC;

-- directeur_revenue_mv
CREATE MATERIALIZED VIEW directeur_revenue_mv AS
SELECT
  f.id as formation_id,
  f.titre as formation_titre,
  f.prix as unit_price,
  COUNT(DISTINCT sa.apprenantId) as total_seats_sold,
  (f.prix * COUNT(DISTINCT sa.apprenantId)) as total_revenue,
  DATE_TRUNC('month', a.dateAccepted)::DATE as month,
  NOW() as last_refreshed
FROM formations f
LEFT JOIN sessions s ON s.formationId = f.id
LEFT JOIN sessions_apprenants sa ON sa.sessionId = s.id
LEFT JOIN apprenants a ON a.id = sa.apprenantId
GROUP BY f.id, f.titre, f.prix, DATE_TRUNC('month', a.dateAccepted)
ORDER BY month DESC, total_revenue DESC;

-- directeur_top_courses_mv
CREATE MATERIALIZED VIEW directeur_top_courses_mv AS
SELECT
  f.id,
  f.titre,
  COUNT(DISTINCT sa.apprenantId) as enrollments,
  AVG(CASE WHEN perf.estReussi = true THEN 100 ELSE 0 END) as success_rate,
  NOW() as last_refreshed
FROM formations f
LEFT JOIN sessions s ON s.formationId = f.id
LEFT JOIN sessions_apprenants sa ON sa.sessionId = s.id
LEFT JOIN performances perf ON perf.sessionId = s.id
GROUP BY f.id, f.titre
ORDER BY enrollments DESC
LIMIT 10;
```

### 3️⃣ **Financier Dashboard**

```sql
-- financier_recap_mv
CREATE MATERIALIZED VIEW financier_recap_mv AS
SELECT
  DATE_TRUNC('month', a.dateAccepted)::DATE as month,
  COUNT(DISTINCT a.id) as new_enrollments,
  SUM(f.prix) as total_revenue,
  COUNT(DISTINCT s.id) as sessions_active,
  NOW() as last_refreshed
FROM formations f
LEFT JOIN sessions s ON s.formationId = f.id
LEFT JOIN sessions_apprenants sa ON sa.sessionId = s.id
LEFT JOIN apprenants a ON a.id = sa.apprenantId
GROUP BY DATE_TRUNC('month', a.dateAccepted)
ORDER BY month DESC;

-- financier_by_formation_mv
CREATE MATERIALIZED VIEW financier_by_formation_mv AS
SELECT
  f.id,
  f.titre,
  f.prix,
  COUNT(DISTINCT sa.apprenantId) as students_enrolled,
  (f.prix * COUNT(DISTINCT sa.apprenantId)) as revenue_total,
  NOW() as last_refreshed
FROM formations f
LEFT JOIN sessions s ON s.formationId = f.id
LEFT JOIN sessions_apprenants sa ON sa.sessionId = s.id
GROUP BY f.id, f.titre, f.prix
ORDER BY revenue_total DESC;
```

### 4️⃣ **Pédagogique Dashboard**

```sql
-- pedagogique_completion_stats_mv
CREATE MATERIALIZED VIEW pedagogique_completion_stats_mv AS
SELECT
  f.id as formation_id,
  f.titre as formation_titre,
  COUNT(DISTINCT sa.apprenantId) as total_students,
  COUNT(DISTINCT CASE WHEN perf.estReussi = true THEN perf.apprenantId END) as students_passed,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN perf.estReussi = true THEN perf.apprenantId END) /
        NULLIF(COUNT(DISTINCT sa.apprenantId), 0), 2) as success_rate_pct,
  NOW() as last_refreshed
FROM formations f
LEFT JOIN sessions s ON s.formationId = f.id
LEFT JOIN sessions_apprenants sa ON sa.sessionId = s.id
LEFT JOIN performances perf ON perf.sessionId = s.id
GROUP BY f.id, f.titre
ORDER BY success_rate_pct DESC;

-- pedagogique_formateur_performance_mv
CREATE MATERIALIZED VIEW pedagogique_formateur_performance_mv AS
SELECT
  fm.id as formateur_id,
  fm.nom || ' ' || fm.prenom as formateur_name,
  s.id as session_id,
  f.titre as formation_titre,
  COUNT(DISTINCT sa.apprenantId) as class_size,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN perf.estReussi = true THEN perf.apprenantId END) /
        NULLIF(COUNT(DISTINCT sa.apprenantId), 0), 2) as success_rate_pct,
  NOW() as last_refreshed
FROM formateurs fm
LEFT JOIN sessions s ON s.formateurId = fm.id
LEFT JOIN formations f ON f.id = s.formationId
LEFT JOIN sessions_apprenants sa ON sa.sessionId = s.id
LEFT JOIN performances perf ON perf.sessionId = s.id
GROUP BY fm.id, fm.nom, fm.prenom, s.id, f.titre
ORDER BY success_rate_pct DESC;
```

### 5️⃣ **Apprenant Dashboard**

```sql
-- apprenant_progress_mv
CREATE MATERIALIZED VIEW apprenant_progress_mv AS
SELECT
  a.id as apprenant_id,
  a.userId,
  f.id as formation_id,
  f.titre as formation_titre,
  s.id as session_id,
  s.date as session_date,
  perf.estPresent,
  perf.estReussi,
  perf.score,
  NOW() as last_refreshed
FROM apprenants a
LEFT JOIN sessions_apprenants sa ON sa.apprenantId = a.id
LEFT JOIN sessions s ON s.id = sa.sessionId
LEFT JOIN formations f ON f.id = s.formationId
LEFT JOIN performances perf ON perf.apprenantId = a.id AND perf.sessionId = s.id
ORDER BY a.userId, session_date DESC;
```

---

## 🔄 Stratégie de Rafraîchissement

### Option A: Cron Jobs (Recommandé)

```typescript
// src/common/services/dashboard-refresh.service.ts
import { Cron } from '@nestjs/schedule';

@Injectable()
export class DashboardRefreshService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  // Toutes les 5 minutes
  @Cron('*/5 * * * *')
  async refreshAdminViews() {
    await this.dataSource.query('REFRESH MATERIALIZED VIEW kpi_dashboard_mv');
    await this.dataSource.query(
      'REFRESH MATERIALIZED VIEW activity_dashboard_mv',
    );
  }

  // Tous les jours à 2h du matin
  @Cron('0 2 * * *')
  async refreshDirecteurViews() {
    await this.dataSource.query(
      'REFRESH MATERIALIZED VIEW directeur_enrollments_mv',
    );
    await this.dataSource.query(
      'REFRESH MATERIALIZED VIEW directeur_revenue_mv',
    );
    await this.dataSource.query(
      'REFRESH MATERIALIZED VIEW directeur_top_courses_mv',
    );
  }

  // Tous les jours à 3h du matin
  @Cron('0 3 * * *')
  async refreshFinancierViews() {
    await this.dataSource.query('REFRESH MATERIALIZED VIEW financier_recap_mv');
    await this.dataSource.query(
      'REFRESH MATERIALIZED VIEW financier_by_formation_mv',
    );
  }

  // Tous les jours à 1h du matin
  @Cron('0 1 * * *')
  async refreshPedagogueViews() {
    await this.dataSource.query(
      'REFRESH MATERIALIZED VIEW pedagogique_completion_stats_mv',
    );
    await this.dataSource.query(
      'REFRESH MATERIALIZED VIEW pedagogique_formateur_performance_mv',
    );
  }

  // Toutes les 30 minutes pour apprenant
  @Cron('*/30 * * * *')
  async refreshApprenantViews() {
    await this.dataSource.query(
      'REFRESH MATERIALIZED VIEW apprenant_progress_mv',
    );
  }
}
```

### Option B: Trigger PostgreSQL (Auto-refresh après INSERT/UPDATE)

```sql
-- Fonction trigger
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS TRIGGER AS $$
BEGIN
  -- Rafraîchir les vues concernées par la table qui a changé
  CASE NEW.tableoid::regclass::text
    WHEN '"user"' THEN
      REFRESH MATERIALIZED VIEW kpi_dashboard_mv;
      REFRESH MATERIALIZED VIEW activity_dashboard_mv;
    WHEN 'inscription' THEN
      REFRESH MATERIALIZED VIEW kpi_dashboard_mv;
    WHEN 'apprenants' THEN
      REFRESH MATERIALIZED VIEW directeur_enrollments_mv;
      REFRESH MATERIALIZED VIEW apprenant_progress_mv;
    WHEN 'formations' THEN
      REFRESH MATERIALIZED VIEW directeur_revenue_mv;
      REFRESH MATERIALIZED VIEW pedagogique_completion_stats_mv;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📝 Migration SQL

Créer une migration TypeORM pour les vues:

```typescript
// src/migrations/1700000000000-CreateDashboardViews.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDashboardViews1700000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Admin Dashboard
    await queryRunner.query(`CREATE MATERIALIZED VIEW kpi_dashboard_mv AS ...`);
    await queryRunner.query(
      `CREATE MATERIALIZED VIEW activity_dashboard_mv AS ...`,
    );

    // Directeur Dashboard
    await queryRunner.query(
      `CREATE MATERIALIZED VIEW directeur_enrollments_mv AS ...`,
    );
    await queryRunner.query(
      `CREATE MATERIALIZED VIEW directeur_revenue_mv AS ...`,
    );
    await queryRunner.query(
      `CREATE MATERIALIZED VIEW directeur_top_courses_mv AS ...`,
    );

    // Financier Dashboard
    await queryRunner.query(
      `CREATE MATERIALIZED VIEW financier_recap_mv AS ...`,
    );
    await queryRunner.query(
      `CREATE MATERIALIZED VIEW financier_by_formation_mv AS ...`,
    );

    // Pédagogique Dashboard
    await queryRunner.query(
      `CREATE MATERIALIZED VIEW pedagogique_completion_stats_mv AS ...`,
    );
    await queryRunner.query(
      `CREATE MATERIALIZED VIEW pedagogique_formateur_performance_mv AS ...`,
    );

    // Apprenant Dashboard
    await queryRunner.query(
      `CREATE MATERIALIZED VIEW apprenant_progress_mv AS ...`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP MATERIALIZED VIEW apprenant_progress_mv`);
    await queryRunner.query(
      `DROP MATERIALIZED VIEW pedagogique_formateur_performance_mv`,
    );
    await queryRunner.query(
      `DROP MATERIALIZED VIEW pedagogique_completion_stats_mv`,
    );
    await queryRunner.query(`DROP MATERIALIZED VIEW financier_by_formation_mv`);
    await queryRunner.query(`DROP MATERIALIZED VIEW financier_recap_mv`);
    await queryRunner.query(`DROP MATERIALIZED VIEW directeur_top_courses_mv`);
    await queryRunner.query(`DROP MATERIALIZED VIEW directeur_revenue_mv`);
    await queryRunner.query(`DROP MATERIALIZED VIEW directeur_enrollments_mv`);
    await queryRunner.query(`DROP MATERIALIZED VIEW activity_dashboard_mv`);
    await queryRunner.query(`DROP MATERIALIZED VIEW kpi_dashboard_mv`);
  }
}
```

---

## 🔗 Adapter les Services (Zéro changement entities!)

### Admin Dashboard Service

```typescript
async getKpis() {
  return await this.dataSource.query('SELECT * FROM kpi_dashboard_mv LIMIT 1');
}

async getActivity() {
  return await this.dataSource.query('SELECT * FROM activity_dashboard_mv ORDER BY day_date ASC');
}
```

### Directeur Dashboard Service

```typescript
async getEnrollmentsChart(filters: PaginationFilterDto) {
  let query = 'SELECT * FROM directeur_enrollments_mv WHERE 1=1';

  if (filters.periode) {
    query += ` AND month >= '${filters.periode}'`;
  }

  return await this.dataSource.query(query);
}

async getRevenueChart(filters: PaginationFilterDto) {
  return await this.dataSource.query('SELECT * FROM directeur_revenue_mv ORDER BY month DESC');
}
```

**Pareil pour les autres dashboards** - juste des SELECT simples depuis les vues!

---

## ✅ Checklist Implémentation

### Phase 1: Infrastructure (30 min)

- [ ] Créer migration avec toutes les vues matérialisées
- [ ] Installer `@nestjs/schedule` si pas déjà là
- [ ] Créer `DashboardRefreshService`
- [ ] Ajouter les Cron jobs

### Phase 2: Adapter les Services (45 min)

- [ ] Adapter `AdminDashboardService`
- [ ] Adapter `DirecteurDashboardService`
- [ ] Adapter `FinancierDashboardService`
- [ ] Adapter `PedagogiqueDashboardService`
- [ ] Adapter `ApprenantDashboardService`

### Phase 3: Test (20 min)

- [ ] Vérifier les endpoints admin
- [ ] Vérifier les endpoints directeur
- [ ] Vérifier les Cron jobs rafraîchissent bien
- [ ] Checker performance (< 50ms par endpoint)

### Phase 4: Deploy (10 min)

- [ ] Migrer la BD
- [ ] Redémarrer le backend
- [ ] Vérifier les vues sont bien créées

---

## 📊 Résultats Attendus

| Métrique                    | Avant        | Après      | Gain                |
| --------------------------- | ------------ | ---------- | ------------------- |
| **Admin KPIs**              | 4 requêtes   | 1 requête  | -75%                |
| **Admin Activity**          | 7 requêtes   | 1 requête  | -86%                |
| **Directeur Load**          | 20+ requêtes | 3 requêtes | -85%                |
| **Temps réponse admin**     | 100-200ms    | 10-20ms    | **10x plus rapide** |
| **Temps réponse directeur** | 200-500ms    | 20-50ms    | **10x plus rapide** |
| **DB Load**                 | ⚠️ Élevée    | ✅ Basse   | -80%                |
| **Scalabilité**             | Faible       | Excellente | ✅                  |

---

## 🎯 Conclusion

**C'est ROLAP complet pour TOUTE la plateforme:**

- ✅ Admin + Directeur + Financier + Pédagogique + Apprenant
- ✅ Zéro modification entities existantes
- ✅ Juste des vues matérialisées SQL
- ✅ Services qui lisent depuis les vues
- ✅ Rafraîchissement automatique par Cron
- ✅ Performance multiplée par 10x

**Temps d'implémentation: ~2-3 heures**
