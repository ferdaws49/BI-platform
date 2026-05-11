import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const queryRunner = dataSource.createQueryRunner();

  console.log('🚀 Démarrage de la synchronisation des séquences...');

  try {
    // Récupère toutes les tables de la base de données
    const tables = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    for (const table of tables) {
      const tableName = table.table_name;
      
      // Vérifie si la table a une colonne 'id' et une séquence associée
      const hasSerial = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' 
        AND column_name = 'id'
      `);

      if (hasSerial.length > 0) {
        try {
          console.log(`--- Synchronisation de la table : ${tableName} ---`);
          // La magie : recalage de la séquence sur le MAX(id)
          await queryRunner.query(`
            SELECT setval(
              pg_get_serial_sequence('"${tableName}"', 'id'), 
              coalesce(max(id), 0) + 1, 
              false
            ) FROM "${tableName}";
          `);
          console.log(`✅ Table ${tableName} synchronisée.`);
        } catch (e) {
          console.error(`❌ Impossible de synchroniser ${tableName} (pas de séquence ?)`);
        }
      }
    }

    console.log('✨ Toutes les séquences ont été recalées avec succès !');
  } catch (error) {
    console.error('💥 Erreur lors de la synchronisation :', error);
  } finally {
    await queryRunner.release();
    await app.close();
  }
}

bootstrap();
