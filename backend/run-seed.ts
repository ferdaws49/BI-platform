// run-seed.ts
// Lancer avec : npx ts-node run-seed.ts

import { DataSource } from 'typeorm';
import { seed } from './seed';

// ─── Entités ────────────────────────────────────────────────
import { Inscription } from 'src/inscriptions/entities/inscriptions.entity';
import { User } from './src/users/users.entity';
import { Apprenant } from './src/apprenants/entities/apprenant.entity';
import { Formation } from './src/formations/entities/formation.entity';
import { Formateur } from './src/formateurs/entities/formateur.entity';
import { Session } from './src/sessions/entities/session.entity';
import { Presence } from './src/sessions/entities/presence.entity';
import { Finance } from './src/finances/entities/finance.entity';
import { Satisfaction } from './src/satisfaction/entities/satisfaction.entity';
import { Performance } from './src/performances/entities/performance.entity';

// ─── Connexion ───────────────────────────────────────────────
const AppDataSource = new DataSource({
  type: 'postgres',           // ← adapte si tu utilises mysql / sqlite
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_NAME ?? 'formation_db',
  synchronize: false,         // ← utilise tes migrations, ne pas mettre true en prod
  logging: false,
  entities: [
    Inscription,
    User,
    Apprenant,
    Formation,
    Formateur,
    Session,
    Presence,
    Finance,
    Satisfaction,
    Performance,
  ],
});

AppDataSource.initialize()
  .then(async (ds) => {
    console.log('🔌 Connexion DB établie');
    await seed(ds);
    await ds.destroy();
    console.log('🔌 Connexion fermée');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erreur lors du seed :', err);
    process.exit(1);
  });