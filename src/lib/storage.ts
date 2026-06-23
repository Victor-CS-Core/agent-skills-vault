import { DB_NAME, DB_VERSION, STORE_NAME } from "./constants";
import type { Skill } from "../types/skill";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function storeGetAll(): Promise<Skill[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .getAll();
    req.onsuccess = () => resolve((req.result as Skill[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function storeAdd(skill: Omit<Skill, "id" | "addedAt">): Promise<Skill> {
  const existing = await storeGetAll();
  const dup = existing.find((s) => s.name === skill.name && s.source === skill.source);
  if (dup) {
    throw new Error(`"${skill.name}" from ${skill.source} is already in your library`);
  }

  const record: Skill = {
    ...skill,
    id: crypto.randomUUID(),
    addedAt: new Date().toISOString(),
  };

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .add(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function storeRemove(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function storeReplaceAll(skills: Skill[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    for (const skill of skills) {
      store.put(skill);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
