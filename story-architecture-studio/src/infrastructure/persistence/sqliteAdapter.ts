import Database from '@tauri-apps/plugin-sql';
import { CURRENT_MIGRATION_VERSION } from '../migrations';
import type { PersistenceAdapter } from './types';
import type { ProjectExport } from '@/domain/types';
import { normalizeProjectExport } from './normalize';

const DB_URL = 'sqlite:story-architecture.db';

export class SqliteAdapter implements PersistenceAdapter {
  private db: Database | null = null;
  private initialized = false;

  private async getDb(): Promise<Database> {
    if (!this.db) {
      this.db = await Database.load(DB_URL);
    }
    return this.db;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const db = await this.getDb();
    await db.execute(`
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS project_data (project_id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        reason TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_project ON snapshots(project_id);
    `);
    await this.runMigrations();
    this.initialized = true;
  }

  async getMigrationVersion(): Promise<number> {
    const db = await this.getDb();
    const rows = await db.select<{ value: number }[]>('SELECT value FROM meta WHERE key = ?', ['migrationVersion']);
    return rows[0]?.value ?? 0;
  }

  async runMigrations(): Promise<void> {
    const current = await this.getMigrationVersion();
    if (current >= CURRENT_MIGRATION_VERSION) return;
    const db = await this.getDb();
    await db.execute(
      'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
      ['migrationVersion', CURRENT_MIGRATION_VERSION],
    );
  }

  async listProjects() {
    const db = await this.getDb();
    const rows = await db.select<{ json: string }[]>('SELECT json FROM projects');
    return rows.map((r: { json: string }) => JSON.parse(r.json));
  }

  async getProject(id: string) {
    const db = await this.getDb();
    const rows = await db.select<{ json: string }[]>('SELECT json FROM projects WHERE id = ?', [id]);
    return rows[0] ? JSON.parse(rows[0].json) : null;
  }

  async saveProject(project: import('@/domain/types').Project) {
    const db = await this.getDb();
    await db.execute('INSERT OR REPLACE INTO projects (id, json) VALUES (?, ?)', [project.id, JSON.stringify(project)]);
  }

  async deleteProject(id: string) {
    const db = await this.getDb();
    await db.execute('DELETE FROM projects WHERE id = ?', [id]);
    await db.execute('DELETE FROM project_data WHERE project_id = ?', [id]);
    await db.execute('DELETE FROM snapshots WHERE project_id = ?', [id]);
  }

  async loadProjectData(projectId: string): Promise<ProjectExport | null> {
    const db = await this.getDb();
    const rows = await db.select<{ json: string }[]>('SELECT json FROM project_data WHERE project_id = ?', [projectId]);
    return rows[0] ? normalizeProjectExport(JSON.parse(rows[0].json)) : null;
  }

  async saveProjectData(data: ProjectExport): Promise<void> {
    const db = await this.getDb();
    await db.execute('INSERT OR REPLACE INTO project_data (project_id, json) VALUES (?, ?)', [
      data.project.id,
      JSON.stringify(data),
    ]);
  }

  async createSnapshot(projectId: string, name: string, reason: string, data: ProjectExport) {
    const snapshot: import('@/domain/types').Snapshot = {
      id: crypto.randomUUID(),
      projectId,
      name,
      reason,
      dataJson: JSON.stringify(data),
      createdAt: new Date().toISOString(),
    };
    const db = await this.getDb();
    await db.execute(
      'INSERT INTO snapshots (id, project_id, name, reason, data_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [snapshot.id, snapshot.projectId, snapshot.name, snapshot.reason, snapshot.dataJson, snapshot.createdAt],
    );
    return snapshot;
  }

  async listSnapshots(projectId: string) {
    const db = await this.getDb();
    const rows = await db.select<Array<{ id: string; project_id: string; name: string; reason: string; data_json: string; created_at: string }>>(
      'SELECT id, project_id, name, reason, data_json, created_at FROM snapshots WHERE project_id = ?',
      [projectId],
    );
    return rows.map((r: { id: string; project_id: string; name: string; reason: string; data_json: string; created_at: string }) => ({
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      reason: r.reason,
      dataJson: r.data_json,
      createdAt: r.created_at,
    }));
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    const db = await this.getDb();
    await db.execute('DELETE FROM snapshots WHERE id = ?', [snapshotId]);
  }

  async deleteSnapshotsByReason(projectId: string, reason: string): Promise<void> {
    const db = await this.getDb();
    await db.execute('DELETE FROM snapshots WHERE project_id = ? AND reason = ?', [projectId, reason]);
  }
}

let sqliteInstance: SqliteAdapter | null = null;

export function getSqliteAdapter(): SqliteAdapter {
  if (!sqliteInstance) {
    sqliteInstance = new SqliteAdapter();
  }
  return sqliteInstance;
}
