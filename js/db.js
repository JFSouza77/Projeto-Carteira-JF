// Persistência local (IndexedDB). Único módulo que lê e grava dados.

const DB_NAME = 'carteira-jf';
const DB_VERSION = 1;
export const STORES = Object.freeze({ expenses: 'expenses', categories: 'categories', meta: 'meta' });

let dbPromise;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.expenses)) {
        const s = db.createObjectStore(STORES.expenses, { keyPath: 'id' });
        s.createIndex('month', 'month');
      }
      if (!db.objectStoreNames.contains(STORES.categories)) db.createObjectStore(STORES.categories, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Feche outras abas do app e tente de novo.'));
  });
  return dbPromise;
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transação abortada'));
  });
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll(store) {
  const db = await openDB();
  return request(db.transaction(store).objectStore(store).getAll());
}

export async function put(store, value) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  return done(tx);
}

export async function putMany(store, values) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  const s = tx.objectStore(store);
  for (const v of values) s.put(v);
  return done(tx);
}

export async function remove(store, key) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  return done(tx);
}

export async function getMeta(key, fallback = null) {
  const db = await openDB();
  const row = await request(db.transaction(STORES.meta).objectStore(STORES.meta).get(key));
  return row ? row.value : fallback;
}

export function setMeta(key, value) {
  return put(STORES.meta, { key, value });
}

/** Troca todos os gastos e categorias de uma vez (restauração de backup). Tudo ou nada. */
export async function replaceAll({ expenses, categories }) {
  const db = await openDB();
  const tx = db.transaction([STORES.expenses, STORES.categories], 'readwrite');
  const e = tx.objectStore(STORES.expenses);
  const c = tx.objectStore(STORES.categories);
  e.clear();
  c.clear();
  for (const x of expenses) e.put(x);
  for (const x of categories) c.put(x);
  return done(tx);
}

/** Pede ao navegador para não apagar os dados sozinho (ajuda no iPhone). */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) return await navigator.storage.persist();
    return true;
  } catch {
    return false;
  }
}
