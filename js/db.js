// Persistência local (IndexedDB). Único módulo que lê e grava dados.

const DB_NAME = 'carteira-jf';
const DB_VERSION = 2;
export const STORES = Object.freeze({
  expenses: 'expenses', categories: 'categories', meta: 'meta',
  incomes: 'incomes', accounts: 'accounts', images: 'images',
});

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
      // v2: entradas (rendimentos), contas bancárias e fotos
      if (!db.objectStoreNames.contains(STORES.incomes)) {
        db.createObjectStore(STORES.incomes, { keyPath: 'id' }).createIndex('month', 'month');
      }
      if (!db.objectStoreNames.contains(STORES.accounts)) db.createObjectStore(STORES.accounts, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.images)) db.createObjectStore(STORES.images, { keyPath: 'id' });
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

export async function get(store, key) {
  const db = await openDB();
  return request(db.transaction(store).objectStore(store).get(key));
}

export async function getMeta(key, fallback = null) {
  const db = await openDB();
  const row = await request(db.transaction(STORES.meta).objectStore(STORES.meta).get(key));
  return row ? row.value : fallback;
}

export function setMeta(key, value) {
  return put(STORES.meta, { key, value });
}

/** Troca todos os dados financeiros de uma vez (restauração de backup). Tudo ou nada. Fotos ficam como estão. */
export async function replaceAll({ expenses, categories, incomes = [], accounts = [] }) {
  const db = await openDB();
  const names = [STORES.expenses, STORES.categories, STORES.incomes, STORES.accounts];
  const tx = db.transaction(names, 'readwrite');
  const data = [expenses, categories, incomes, accounts];
  names.forEach((n, i) => {
    const s = tx.objectStore(n);
    s.clear();
    for (const x of data[i]) s.put(x);
  });
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
