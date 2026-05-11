// import/utils/entity-metadata.ts
// ─────────────────────────────────────────────────────────────────────────────
// Configuration centralisée des métadonnées des entités (icons, descriptions).
// Les champs sont générés automatiquement depuis TypeORM.
// ─────────────────────────────────────────────────────────────────────────────

export interface EntityMetadata {
  icon: string;
  label: string;
  description: string;
  uniqueKey: string;
}

export const ENTITY_METADATA_CONFIG: Record<string, EntityMetadata> = {
  users: {
    icon: 'Users',
    label: 'Utilisateurs',
    description: 'Importer des comptes utilisateurs avec leurs rôles',
    uniqueKey: 'email',
  },

  inscriptions: {
    icon: 'ClipboardList',
    label: 'Inscriptions',
    description: "Importer des demandes d'inscription apprenants",
    uniqueKey: 'email',
  },

  formateurs: {
    icon: 'GraduationCap',
    label: 'Formateurs',
    description: 'Importer des profils formateurs',
    uniqueKey: 'email',
  },

  formations: {
    icon: 'BookOpen',
    label: 'Formations',
    description: 'Importer des formations avec leurs métadonnées',
    uniqueKey: 'titre',
  },

  sessions: {
    icon: 'CalendarDays',
    label: 'Sessions',
    description: 'Importer des sessions de formation planifiées',
    uniqueKey: 'id',
  },

  finances: {
    icon: 'Banknote',
    label: 'Finances',
    description: 'Importer des transactions financières liées aux sessions',
    uniqueKey: 'id',
  },

  apprenants: {
    icon: 'BookMarked',
    label: 'Apprenants',
    description: 'Importer des profils apprenants avec leurs affiliations',
    uniqueKey: 'email',
  },
};
