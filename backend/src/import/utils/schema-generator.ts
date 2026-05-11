// import/utils/schema-generator.ts
// ─────────────────────────────────────────────────────────────────────────────
// Génère automatiquement les FieldSchema depuis les metadata TypeORM réelles.
// Remplace le hardcoding dans entity-schemas.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { DataSource } from 'typeorm';
import { FieldSchema, StaticEntitySchema } from './entity-schemas.js';
import { ENTITY_METADATA_CONFIG } from './entity-metadata.js';

// ─── Configuration des entités ─────────────────────────────────────────────
/**
 * Map le nom de l'entité TypeORM au nom de la classe
 * Utilisé pour récupérer les metadata via dataSource.getMetadata()
 */
const ENTITY_NAMES: Record<string, string> = {
  users: 'User',
  inscriptions: 'Inscription',
  formateurs: 'Formateur',
  formations: 'Formation',
  sessions: 'Session',
  finances: 'Finance',
  apprenants: 'Apprenant',
};

// ─── Field filtering ───────────────────────────────────────────────────────
/**
 * Champs système à exclure de la génération (auto-gérés par TypeORM, pas importables)
 */
const EXCLUDED_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'resetToken',
  'resetTokenExpiry',
  'isActive',
  'verifyToken',
]);

/**
 * Champs enum à exclure par entité
 */
const EXCLUDED_ENUM_FIELDS: Record<string, Set<string>> = {
  users: new Set(['status']),
};

// ─── Type mapping ───────────────────────────────────────────────────────────
/**
 * Mappe les types de colonnes TypeORM aux types FieldSchema
 */
function mapTypeToFieldType(
  columnType: string | Function,
  isEnum: boolean,
): 'string' | 'number' | 'email' | 'date' | 'time' | 'enum' | 'boolean' {
  if (isEnum) return 'enum';

  const typeStr =
    typeof columnType === 'string'
      ? columnType.toLowerCase()
      : columnType.name?.toLowerCase() || 'string';

  if (
    typeStr.includes('decimal') ||
    typeStr.includes('float') ||
    typeStr.includes('numeric')
  ) {
    return 'number';
  }
  if (typeStr.includes('int')) return 'number';
  if (typeStr.includes('date')) return 'date';
  if (typeStr.includes('time')) return 'time';
  if (typeStr.includes('bool')) return 'boolean'; // ✅ ajout support boolean
  if (
    typeStr.includes('varchar') ||
    typeStr.includes('text') ||
    typeStr.includes('string')
  ) {
    return 'string';
  }

  return 'string';
}

// ─── Label generation ───────────────────────────────────────────────────────
/**
 * Transforme camelCase en Titre Français
 */
const FIELD_LABEL_MAPPING: Record<string, string> = {
  id: 'ID',
  nom: 'Nom',
  prenom: 'Prénom',
  email: 'Email',
  password: 'Mot de passe',
  phone: 'Téléphone',
  telephone: 'Téléphone',
  role: 'Rôle',
  status: 'Statut',
  type: 'Type',
  description: 'Description',
  createdAt: 'Date de création',
  updatedAt: 'Date de mise à jour',
  resetToken: 'Token de réinitialisation',
  resetTokenExpiry: 'Expiration du token',
  isActive: 'Actif',
  titre: 'Titre',
  categorie: 'Catégorie',
  dureeHeures: 'Durée (Heures)',
  prix: 'Prix',
  statut: 'Statut',
  date: 'Date',
  heureDebut: 'Heure début',
  heureFin: 'Heure fin',
  lieu: 'Lieu',
  capacite: 'Capacité',
  formationId: 'ID Formation',
  formateurId: 'ID Formateur',
  montant: 'Montant',
  sessionId: 'ID Session',
  userId: 'ID Utilisateur',
  dateAccepted: "Date d'acceptation",
  programme: 'Programme',
  verifyToken: 'Token de vérification',
  specialite: 'Spécialité',
  estPresent: 'Présent',       // ✅ ajout boolean presence.entity.ts
  estReussi: 'Réussi',         // ✅ ajout boolean performance.entity.ts
};

function generateLabel(fieldKey: string): string {
  if (FIELD_LABEL_MAPPING[fieldKey]) {
    return FIELD_LABEL_MAPPING[fieldKey];
  }

  return fieldKey
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// ─── Enum extraction ───────────────────────────────────────────────────────
function extractEnumValues(enumType: any): string[] {
  if (!enumType) return [];

  if (typeof enumType === 'object') {
    return Object.values(enumType)
      .filter((v) => typeof v === 'string')
      .map((v) => String(v));
  }

  return [];
}

// ─── Main generator ───────────────────────────────────────────────────────
/**
 * Génère les schémas statiques depuis les metadata TypeORM
 * Nécessite le DataSource injecté pour accéder aux metadata en runtime
 */
export async function generateEntitySchemas(
  dataSource: DataSource,
): Promise<StaticEntitySchema[]> {
  const schemas: StaticEntitySchema[] = [];

  // Parcourt chaque entité configurée
  for (const [entityKey, entityClassName] of Object.entries(ENTITY_NAMES)) {
    try {
      // Récupère la config metadata
      const config = ENTITY_METADATA_CONFIG[entityKey];
      if (!config) {
        continue;
      }

      // Récupère les metadata TypeORM
      const entityMetadata = dataSource.getMetadata(entityClassName);
      const fields: FieldSchema[] = [];

      // Parcourt toutes les colonnes
      for (const column of entityMetadata.columns) {
        const fieldKey = column.propertyName;

        // Exclut les champs système
        if (EXCLUDED_FIELDS.has(fieldKey)) {
          continue;
        }

        // Exclut les champs enum spécifiques par entité
        const excludedForEntity = EXCLUDED_ENUM_FIELDS[entityKey];
        if (excludedForEntity && excludedForEntity.has(fieldKey)) {
          continue;
        }

        // Détermine si c'est un enum
        const isEnum = column.enum !== undefined && column.enum !== null;
        const enumValues = isEnum ? extractEnumValues(column.enum) : undefined;

        // Mappe le type
        const fieldType = mapTypeToFieldType(column.type, isEnum);

        // Détermine si requis
        const isRequired =
          !column.isNullable && !column.isGenerated && !column.isUpdate;

        const fieldSchema: FieldSchema = {
          key: fieldKey,
          label: generateLabel(fieldKey),
          required: isRequired,
          type: fieldType,
          ...(enumValues && { enumValues }),
        };

        fields.push(fieldSchema);
      }

      // Crée le StaticEntitySchema
      const schema: StaticEntitySchema = {
        key: entityKey,
        label: config.label,
        description: config.description,
        icon: config.icon,
        fields,
      };

      schemas.push(schema);
    } catch (error) {
      console.error(`⚠️ Error generating schema for ${entityKey}:`, error);
    }
  }

  return schemas;
}