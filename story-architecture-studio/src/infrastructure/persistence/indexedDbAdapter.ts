import { CURRENT_MIGRATION_VERSION } from '../migrations';
import type { PersistenceAdapter } from './types';
import type { ProjectExport } from '@/domain/types';
import { normalizeProjectExport } from './normalize';

const DB_NAME = 'story-architecture-studio';
const DB_VERSION = CURRENT_MIGRATION_VERSION;

type StoreName =
  | 'meta'
  | 'projects'
  | 'projectData'
  | 'snapshots';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error('Failed to open database'));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('projectData')) {
        db.createObjectStore('projectData', { keyPath: 'projectId' });
      }
      if (!db.objectStoreNames.contains('snapshots')) {
        const store = db.createObjectStore('snapshots', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
      }
    };
  });
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store);

    if (result instanceof Promise) {
      result.then(resolve).catch(reject);
      return;
    }

    result.onsuccess = () => resolve(result.result as T);
    result.onerror = () => reject(result.error ?? new Error(`IndexedDB operation failed on ${storeName}`));
    tx.onerror = () => reject(tx.error ?? new Error(`Transaction failed on ${storeName}`));
  });
}

export class IndexedDbAdapter implements PersistenceAdapter {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await openDatabase();
    await this.runMigrations();
    this.initialized = true;
  }

  async getMigrationVersion(): Promise<number> {
    try {
      const meta = await withStore<{ key: string; value: number }>('meta', 'readonly', (store) =>
        store.get('migrationVersion'),
      );
      return meta?.value ?? 0;
    } catch {
      return 0;
    }
  }

  async runMigrations(): Promise<void> {
    const current = await this.getMigrationVersion();
    if (current >= CURRENT_MIGRATION_VERSION) return;

    await withStore('meta', 'readwrite', (store) => {
      return store.put({ key: 'migrationVersion', value: CURRENT_MIGRATION_VERSION });
    });
  }

  async listProjects() {
    return withStore('projects', 'readonly', (store) => store.getAll());
  }

  async getProject(id: string) {
    return withStore('projects', 'readonly', (store) => store.get(id));
  }

  async saveProject(project: import('@/domain/types').Project) {
    await withStore('projects', 'readwrite', (store) => store.put(project));
  }

  async deleteProject(id: string) {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['projects', 'projectData', 'snapshots'], 'readwrite');
      tx.objectStore('projects').delete(id);
      tx.objectStore('projectData').delete(id);

      const snapshotStore = tx.objectStore('snapshots');
      const index = snapshotStore.index('projectId');
      const request = index.openCursor(IDBKeyRange.only(id));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Delete project failed'));
    });
  }

  async loadProjectData(projectId: string): Promise<ProjectExport | null> {
    const row = await withStore<{ projectId: string; data: ProjectExport }>('projectData', 'readonly', (store) =>
      store.get(projectId),
    );
    return row?.data ? normalizeProjectExport(row.data) : null;
  }

  async saveProjectData(data: ProjectExport): Promise<void> {
    await withStore('projectData', 'readwrite', (store) =>
      store.put({ projectId: data.project.id, data }),
    );
  }

  async createSnapshot(
    projectId: string,
    name: string,
    reason: string,
    data: ProjectExport,
  ): Promise<import('@/domain/types').Snapshot> {
    const snapshot: import('@/domain/types').Snapshot = {
      id: crypto.randomUUID(),
      projectId,
      name,
      reason,
      dataJson: JSON.stringify(data),
      createdAt: new Date().toISOString(),
    };
    await withStore('snapshots', 'readwrite', (store) => store.put(snapshot));
    return snapshot;
  }

  async listSnapshots(projectId: string) {
    return withStore<import('@/domain/types').Snapshot[]>('snapshots', 'readonly', (store) => {
      const index = store.index('projectId');
      return index.getAll(projectId);
    });
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    await withStore('snapshots', 'readwrite', (store) => store.delete(snapshotId));
  }

  async deleteSnapshotsByReason(projectId: string, reason: string): Promise<void> {
    const snapshots = await this.listSnapshots(projectId);
    for (const snapshot of snapshots.filter((s) => s.reason === reason)) {
      await this.deleteSnapshot(snapshot.id);
    }
  }
}

let adapterInstance: IndexedDbAdapter | null = null;

export function getIndexedDbAdapter(): IndexedDbAdapter {
  if (!adapterInstance) {
    adapterInstance = new IndexedDbAdapter();
  }
  return adapterInstance;
}

/** @deprecated Use getPersistenceAdapter from ./index */
export function getPersistenceAdapter(): IndexedDbAdapter {
  return getIndexedDbAdapter();
}
