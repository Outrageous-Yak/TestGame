import type { ClipBlobRecord, SoundProject } from '@/domain/types';

const DB_NAME = 'sound-studio';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('clipBlobs')) {
        db.createObjectStore('clipBlobs', { keyPath: 'clipId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function listProjects(): Promise<SoundProject[]> {
  const db = await openDb();
  const tx = db.transaction('projects', 'readonly');
  const store = tx.objectStore('projects');
  const request = store.getAll();
  const projects = await new Promise<SoundProject[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as SoundProject[]);
    request.onerror = () => reject(request.error);
  });
  await txDone(tx);
  db.close();
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(id: string): Promise<SoundProject | null> {
  const db = await openDb();
  const tx = db.transaction('projects', 'readonly');
  const store = tx.objectStore('projects');
  const request = store.get(id);
  const project = await new Promise<SoundProject | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as SoundProject | undefined);
    request.onerror = () => reject(request.error);
  });
  await txDone(tx);
  db.close();
  return project ?? null;
}

export async function saveProject(project: SoundProject): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('projects', 'readwrite');
  tx.objectStore('projects').put(project);
  await txDone(tx);
  db.close();
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(['projects', 'clipBlobs'], 'readwrite');
  tx.objectStore('projects').delete(id);

  const blobStore = tx.objectStore('clipBlobs');
  const all = blobStore.getAll();
  const blobs = await new Promise<ClipBlobRecord[]>((resolve, reject) => {
    all.onsuccess = () => resolve(all.result as ClipBlobRecord[]);
    all.onerror = () => reject(all.error);
  });
  for (const record of blobs) {
    if (record.projectId === id) {
      blobStore.delete(record.clipId);
    }
  }
  await txDone(tx);
  db.close();
}

export async function saveClipBlob(record: ClipBlobRecord): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('clipBlobs', 'readwrite');
  tx.objectStore('clipBlobs').put(record);
  await txDone(tx);
  db.close();
}

export async function getClipBlob(clipId: string): Promise<Blob | null> {
  const db = await openDb();
  const tx = db.transaction('clipBlobs', 'readonly');
  const store = tx.objectStore('clipBlobs');
  const request = store.get(clipId);
  const record = await new Promise<ClipBlobRecord | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as ClipBlobRecord | undefined);
    request.onerror = () => reject(request.error);
  });
  await txDone(tx);
  db.close();
  return record?.blob ?? null;
}

export async function deleteClipBlob(clipId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('clipBlobs', 'readwrite');
  tx.objectStore('clipBlobs').delete(clipId);
  await txDone(tx);
  db.close();
}
