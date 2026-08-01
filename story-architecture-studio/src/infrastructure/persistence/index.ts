import type { PersistenceAdapter } from './types';
import { getIndexedDbAdapter } from './indexedDbAdapter';

let adapterInstance: PersistenceAdapter | null = null;

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function initPersistenceAdapter(): Promise<PersistenceAdapter> {
  if (adapterInstance) return adapterInstance;
  if (isTauriRuntime()) {
    const { SqliteAdapter } = await import('./sqliteAdapter');
    adapterInstance = new SqliteAdapter();
  } else {
    adapterInstance = getIndexedDbAdapter();
  }
  await adapterInstance.initialize();
  return adapterInstance;
}

export function getPersistenceAdapter(): PersistenceAdapter {
  if (!adapterInstance) {
    adapterInstance = getIndexedDbAdapter();
  }
  return adapterInstance;
}

export function resetPersistenceAdapter(): void {
  adapterInstance = null;
}
