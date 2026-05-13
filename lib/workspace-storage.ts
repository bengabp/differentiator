"use client";

const DB_NAME = "differentiator";
const STORE = "files";
const DB_VERSION = 1;

const FIELDS_KEY = "differentiator.workspace.v1";

export type WorkspaceFields = {
  focus: string;
  exclude: string;
  instructions: string;
  showNotes: boolean;
};

export const DEFAULT_FIELDS: WorkspaceFields = {
  focus: "",
  exclude: "",
  instructions: "",
  showNotes: false,
};

export function loadFields(): WorkspaceFields {
  if (typeof window === "undefined") return DEFAULT_FIELDS;
  try {
    const raw = window.localStorage.getItem(FIELDS_KEY);
    if (!raw) return DEFAULT_FIELDS;
    return { ...DEFAULT_FIELDS, ...(JSON.parse(raw) as Partial<WorkspaceFields>) };
  } catch {
    return DEFAULT_FIELDS;
  }
}

export function saveFields(f: WorkspaceFields) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FIELDS_KEY, JSON.stringify(f));
}

type StoredFile = {
  name: string;
  type: string;
  size: number;
  buffer: ArrayBuffer;
  storedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
  });
}

const MAX_PERSIST_BYTES = 20 * 1024 * 1024;

export async function persistFile(slot: "main" | "sample", file: File | null) {
  if (typeof window === "undefined") return;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    if (!file) {
      store.delete(slot);
    } else if (file.size <= MAX_PERSIST_BYTES) {
      const buffer = await file.arrayBuffer();
      const record: StoredFile = {
        name: file.name,
        type: file.type,
        size: file.size,
        buffer,
        storedAt: Date.now(),
      };
      store.put(record, slot);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Persistence is best-effort
  }
}

export async function loadPersistedFile(
  slot: "main" | "sample"
): Promise<File | null> {
  if (typeof window === "undefined") return null;
  try {
    const db = await openDb();
    const result = await new Promise<StoredFile | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.get(slot);
      req.onsuccess = () => resolve((req.result as StoredFile) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!result) return null;
    return new File([result.buffer], result.name, { type: result.type });
  } catch {
    return null;
  }
}

export async function clearPersistedFiles() {
  if (typeof window === "undefined") return;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}
