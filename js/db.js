// Persistência local (IndexedDB). Único módulo que lê e grava dados.

const DB_NAME = 'carteira-jf';
const DB_VERSION = 3;
export const STORES = Object.freeze({
  expenses: 'expenses', categories: 'categories', meta: 'meta',
  incomes: 'incomes', accounts: 'accounts', images: 'images',
  compromissos: 'compromissos', planos: 'planos',
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
      // v3: compromissos (contas fixas, faturas, assinaturas, planos que se repetem) e planos do mês
      if (!db.objectStoreNames.contains(STORES.compromissos)) db.createObjectStore(STORES.compromissos, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.planos)) db.createObjectStore(STORES.planos, { keyPath: 'id' }).createIndex('month', 'month');
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

// ---------- Sincronização (06/11): quando a pessoa tem conta, cada gravação vira uma "mudança pendente" ----------
// Gasto, entrada, conta, compromisso, plano, categoria, e as chaves meta "perfil" e "metas". Fotos não sincronizam.
const STORES_SYNC = new Set([STORES.expenses, STORES.incomes, STORES.accounts, STORES.compromissos, STORES.planos, STORES.categories]);
const META_SYNC = new Set(['perfil', 'metas', 'investimentos', 'transferencias']);
let rastrear = false;
let pendentes = null; // { "store/id": {store, id, em, rec} }
let ultimoEm = 0;
const agora = () => { ultimoEm = Math.max(Date.now(), ultimoEm + 1); return ultimoEm; };

/** Liga/desliga o registro de mudanças (liga quando a pessoa entra na conta). */
export function setRastrear(v) { rastrear = !!v; }

async function carregarPendentes() {
  if (!pendentes) pendentes = (await getMetaCru('pendentes')) || {};
  return pendentes;
}

let aoMarcar = null;
/** O app avisa aqui quem chamar quando surgir mudança pendente (pra sincronizar logo). */
export function setAoMarcar(fn) { aoMarcar = fn; }

async function marcar(lista) {
  if (!rastrear || !lista.length) return;
  const p = await carregarPendentes();
  for (const m of lista) p[`${m.store}/${m.id}`] = m;
  await putCru(STORES.meta, { key: 'pendentes', value: p });
  try { aoMarcar?.(); } catch {}
}

/** Mudanças que ainda não foram pro servidor. */
export async function pegarPendentes() {
  return Object.values(await carregarPendentes());
}

/** Tira da fila o que o servidor já recebeu (só se não mudou de novo enquanto ia). */
export async function limparPendentes(enviadas) {
  const p = await carregarPendentes();
  for (const m of enviadas) {
    const k = `${m.store}/${m.id}`;
    if (p[k] && p[k].em === m.em) delete p[k];
  }
  await putCru(STORES.meta, { key: 'pendentes', value: p });
}

/** Marca TUDO o que está no aparelho como pendente (primeira vez que entra na conta: junta com o servidor). */
export async function marcarTudo() {
  const lista = [];
  for (const store of STORES_SYNC) for (const rec of await getAll(store)) lista.push({ store, id: rec.id, em: rec.atualizadoEm || rec.createdAt || 1, rec });
  for (const key of META_SYNC) {
    const v = await getMetaCru(key);
    // perfil e metas do aparelho novo não passam por cima do que já está na conta (em = 1 = "mais velho")
    if (v != null) lista.push({ store: key, id: key, em: 1, rec: { valor: v } });
  }
  const antes = rastrear;
  rastrear = true;
  await marcar(lista);
  rastrear = antes;
  return lista.length;
}

/** Aplica o que veio do servidor, sem marcar como pendente de novo. */
export async function aplicarRemotas(mudancas) {
  for (const m of mudancas) {
    if (META_SYNC.has(m.store)) {
      if (m.rec === null) await removeCru(STORES.meta, m.store);
      else await putCru(STORES.meta, { key: m.store, value: m.rec.valor });
    } else if (STORES_SYNC.has(m.store)) {
      if (m.rec === null) await removeCru(m.store, m.id);
      else await putCru(m.store, m.rec);
    }
  }
}

async function putCru(store, value) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  return done(tx);
}

async function removeCru(store, key) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  return done(tx);
}

async function getMetaCru(key) {
  const db = await openDB();
  const row = await request(db.transaction(STORES.meta).objectStore(STORES.meta).get(key));
  return row ? row.value : null;
}

export async function put(store, value) {
  if (STORES_SYNC.has(store) && value && typeof value === 'object') value.atualizadoEm = agora();
  await putCru(store, value);
  if (STORES_SYNC.has(store)) await marcar([{ store, id: value.id, em: value.atualizadoEm, rec: value }]);
  else if (store === STORES.meta && META_SYNC.has(value?.key)) await marcar([{ store: value.key, id: value.key, em: agora(), rec: { valor: value.value } }]);
}

export async function putMany(store, values, { padrao = false } = {}) {
  const sync = STORES_SYNC.has(store);
  // padrao: registros que o app cria sozinho (categorias de fábrica): "velhos", pra nunca passar por cima do servidor
  if (sync) for (const v of values) v.atualizadoEm = padrao ? 1 : agora();
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  const s = tx.objectStore(store);
  for (const v of values) s.put(v);
  await done(tx);
  if (sync) await marcar(values.map(v => ({ store, id: v.id, em: v.atualizadoEm, rec: v })));
}

export async function remove(store, key) {
  await removeCru(store, key);
  if (STORES_SYNC.has(store)) await marcar([{ store, id: key, em: agora(), rec: null }]);
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

/**
 * Troca todos os dados de uma vez (restauração de backup). Tudo ou nada (achado do GPT, 13/11): as seis listas e os
 * metadados (perfil, metas, investimentos, transferências) vão na MESMA transação; a fila da sincronia só é marcada
 * depois que a gravação deu certo. Fotos ficam como estão. `meta`: { chave: valor }; perfil null não apaga o perfil.
 */
export async function replaceAll({ expenses, categories, incomes = [], accounts = [], compromissos = [], planos = [] }, meta = {}) {
  const db = await openDB();
  const names = [STORES.expenses, STORES.categories, STORES.incomes, STORES.accounts, STORES.compromissos, STORES.planos];
  const novos = { expenses, categories, incomes, accounts, compromissos, planos };
  const metas = Object.entries(meta).filter(([k, v]) => v !== undefined && !(k === 'perfil' && v == null));
  // com conta: o que some no backup vira "apagado" nos outros aparelhos, e o que entra vai pra eles (marcado no fim)
  const lista = [];
  if (rastrear) {
    for (const n of names) {
      const ids = new Set(novos[n].map(x => x.id));
      for (const velho of await getAll(n)) if (!ids.has(velho.id)) lista.push({ store: n, id: velho.id, em: agora(), rec: null });
      for (const x of novos[n]) { x.atualizadoEm = agora(); lista.push({ store: n, id: x.id, em: x.atualizadoEm, rec: x }); }
    }
    for (const [k, v] of metas) if (META_SYNC.has(k)) lista.push({ store: k, id: k, em: agora(), rec: { valor: v } });
  }
  const tx = db.transaction([...names, STORES.meta], 'readwrite');
  names.forEach(n => {
    const st = tx.objectStore(n);
    st.clear();
    for (const x of novos[n]) st.put(x);
  });
  const sm = tx.objectStore(STORES.meta);
  for (const [key, value] of metas) sm.put({ key, value });
  await done(tx);
  if (lista.length) await marcar(lista);
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
