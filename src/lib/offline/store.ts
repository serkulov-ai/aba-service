// Небольшая обёртка над IndexedDB: память браузера, которая переживает
// закрытие вкладки и перезагрузку телефона. Если IndexedDB недоступна
// (приватный режим), работаем в памяти страницы — пока вкладка открыта.

const DB_NAME = "aba-offline";
const DB_VERSION = 1;
export const OUTBOX = "outbox";
export const DRAFTS = "drafts";

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, Map<IDBValidKey, unknown>>();

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(OUTBOX)) {
          db.createObjectStore(OUTBOX, { keyPath: "seq", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(DRAFTS)) {
          db.createObjectStore(DRAFTS);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function mem(store: string) {
  let m = memory.get(store);
  if (!m) memory.set(store, (m = new Map()));
  return m;
}

function run<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

let memSeq = 0;

// Добавить в очередь; возвращает порядковый номер записи.
export async function append<T extends object>(store: string, value: T): Promise<number> {
  const db = await open();
  if (!db) {
    const seq = ++memSeq;
    mem(store).set(seq, { ...value, seq });
    return seq;
  }
  return Number(await run(db, store, "readwrite", (s) => s.add(value)));
}

// Все записи очереди по порядку.
export async function all<T>(store: string): Promise<T[]> {
  const db = await open();
  if (!db) return [...mem(store).values()] as T[];
  return run(db, store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

export async function get<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await open();
  if (!db) return mem(store).get(key) as T | undefined;
  return run(db, store, "readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
}

export async function put(store: string, key: IDBValidKey, value: unknown): Promise<void> {
  const db = await open();
  if (!db) {
    mem(store).set(key, value);
    return;
  }
  await run(db, store, "readwrite", (s) => s.put(value, key));
}

export async function remove(store: string, key: IDBValidKey): Promise<void> {
  const db = await open();
  if (!db) {
    mem(store).delete(key);
    return;
  }
  await run(db, store, "readwrite", (s) => s.delete(key));
}
