// import/utils/entity-schemas.ts
// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES définissant le format des schemas.
// Les schemas sont maintenant générés automatiquement depuis TypeORM metadata
// dans schema-generator.ts. Cette approche élimine le hardcoding et la maintenance manuelle.
//
// Pour ajouter une nouvelle entité importable :
// 1. Créer l'entité TypeORM avec les bons décorateurs (@Column, @Enum, etc.)
// 2. L'ajouter à ENTITY_METADATA_CONFIG dans entity-metadata.ts
// 3. C'est tout ! Le schema est auto-généré.
// ─────────────────────────────────────────────────────────────────────────────

import { DataSource } from 'typeorm';

export interface FieldSchema {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'email' | 'date' | 'time' | 'enum' | 'boolean'; // ✅ boolean ajouté
  enumValues?: string[];
}

export interface StaticEntitySchema {
  key: string;
  label: string;
  description: string;
  icon: string;
  fields: FieldSchema[];
}

// Cache des schemas générés une fois au startup
let cachedSchemas: StaticEntitySchema[] | null = null;

/**
 * Invalide le cache des schemas générés.
 * Utile en cas de réinitialisation du DataSource ou en environnement de test.
 */
export function clearSchemaCache(): void {
  cachedSchemas = null;
}

/**
 * Retourne les schemas générés automatiquement depuis TypeORM metadata.
 * Met en cache les résultats pour éviter de régénérer à chaque appel.
 *
 * ✅ Si tu modifies une entité demain → les schemas sont mis à jour auto (après clearSchemaCache).
 * ✅ Pas de maintenance manuelle de entity-schemas.ts.
 */
export async function getGeneratedSchemas(
  dataSource: DataSource,
): Promise<StaticEntitySchema[]> {
  if (cachedSchemas) {
    return cachedSchemas;
  }

  try {
    const { generateEntitySchemas } = await import('./schema-generator.js');
    cachedSchemas = await generateEntitySchemas(dataSource);
    return cachedSchemas;
  } catch (error) {
    console.error(
      '❌ Error generating entity schemas from TypeORM metadata:',
      error,
    );
    return [];
  }
}

/**
 * Retrouve un schema par clé d'entité.
 * Utilise le cache des schemas générés.
 */
export async function getEntitySchema(
  key: string,
  dataSource: DataSource,
): Promise<StaticEntitySchema | undefined> {
  const schemas = await getGeneratedSchemas(dataSource);
  return schemas.find((e) => e.key === key);
}