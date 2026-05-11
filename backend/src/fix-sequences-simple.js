const { Client } = require('pg');
require('dotenv').config();

async function fixSequences() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('🚀 Connecté à la base de données Supabase...');

    // Liste des tables à synchroniser
    const tables = ['users', 'inscriptions', 'apprenants', 'formateurs', 'formations', 'sessions', 'finances', 'import_jobs'];

    for (const table of tables) {
      try {
        // Vérifie si la table existe
        const res = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [table]);
        if (!res.rows[0].exists) continue;

        console.log(`--- Synchronisation de la table : ${table} ---`);
        
        // Recalage de la séquence
        await client.query(`
          SELECT setval(
            pg_get_serial_sequence('"${table}"', 'id'), 
            coalesce(max(id), 0) + 1, 
            false
          ) FROM "${table}";
        `);
        console.log(`✅ Table "${table}" synchronisée.`);
      } catch (e) {
        console.warn(`⚠️  Séquence ignorée pour "${table}" (peut-être pas de colonne "id" auto-incrémentée)`);
      }
    }

    console.log('\n✨ Toutes les séquences ont été recalées avec succès !');
  } catch (err) {
    console.error('💥 Erreur fatale :', err.message);
  } finally {
    await client.end();
  }
}

fixSequences();
