export const MIGRATIONS = [
  {
    version: 1,
    description: 'Initial schema: projects, nodes, relationships, and planning tables',
  },
] as const;

export const CURRENT_MIGRATION_VERSION = MIGRATIONS.at(-1)!.version;
