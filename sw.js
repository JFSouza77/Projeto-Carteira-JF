// Service worker: app shell em cache para funcionar offline + lembretes.
// Mudou algum arquivo abaixo? Suba CACHE_VERSION.
const CACHE_VERSION = 'v59';
const CACHE = `carteira-jf-${CACHE_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/engine.js',
  './js/db.js',
  './js/voz.js',
  './js/imagens.js',
  './js/ia.js',
  './js/notificacoes.js',
  './js/mercado.js',
  './js/novidades.js',
  './js/cores.js',
  './js/sincronia.js',
  './js/conta.js',
  './js/cripto.js',
  './js/caos/index.js',
  './js/caos/espinha.js',
  './js/caos/emocoes.js',
  './js/caos/gerador.js',
  './js/caos/falas.js',
  './js/caos/conversa.js',
  './js/caos/identidade.js',
  './js/caos/nucleo.js',
  './js/caos/glossario.js',
  './js/caos/rostos.js',
  './js/caos/rostos-dados.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('carteira-jf-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Cache primeiro (offline-first); se não tiver no cache, vai à rede.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    }),
  );
});

// ---------- Lembretes ----------
// O texto é montado AQUI, com os dados do aparelho. O servidor só manda um toque vazio na hora marcada.

function abrirBanco() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('carteira-jf'); // sem versão: nunca dispara upgrade aqui
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function lerTudo(db, store) {
  return new Promise(resolve => {
    if (!db.objectStoreNames.contains(store)) return resolve([]);
    const r = db.transaction(store).objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => resolve([]);
  });
}

function lerMeta(db, key) {
  return new Promise(resolve => {
    if (!db.objectStoreNames.contains('meta')) return resolve(null);
    const r = db.transaction('meta').objectStore('meta').get(key);
    r.onsuccess = () => resolve(r.result ? r.result.value : null);
    r.onerror = () => resolve(null);
  });
}

function gravarMeta(db, key, value) {
  return new Promise(resolve => {
    if (!db.objectStoreNames.contains('meta')) return resolve();
    const tx = db.transaction('meta', 'readwrite');
    tx.objectStore('meta').put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const brl = c => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Contas fixas que vencem hoje ou amanhã e ainda não foram pagas este mês (13/11, ideia do AI Studio).
// Tudo lido do aparelho: o servidor continua sem saber nada.
async function vencendo(db, gastos) {
  const d = new Date();
  const mes = hojeISO().slice(0, 7);
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const meses = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
  const comps = (await lerTudo(db, 'compromissos')).filter(c => c.ativo !== false && c.dia && c.tipo !== 'plano'
    && (!c.inicioMes || (meses(c.inicioMes, mes) >= 0 && meses(c.inicioMes, mes) % (c.cadaMeses || 1) === 0)));
  const out = [];
  for (const c of comps) {
    const dia = Math.min(c.dia, ultimoDia);
    const falta = dia - d.getDate();
    if (falta !== 0 && falta !== 1) continue;
    // mesma regra do motor: conta sem valor fixo (0) só sai quando tem pagamento lançado (achado do Gemini)
    const pagos = gastos.filter(e => e.compromissoId === c.id && e.month === mes);
    const pago = pagos.reduce((s, e) => s + e.amountCents, 0);
    if (!pagos.length || pago < c.valorCents) {
      out.push(`${c.nome} vence ${falta === 0 ? 'hoje' : 'amanhã'}${c.valorCents > pago ? ` (${brl(c.valorCents - pago)})` : ''}`);
    }
  }
  return out;
}

async function textoDoLembrete(db) {
  const hoje = hojeISO();
  const todos = await lerTudo(db, 'expenses');
  const venc = await vencendo(db, todos).catch(() => []);
  const aviso = venc.length ? ` E não esquece: ${venc.slice(0, 2).join('; ')}.` : '';
  const gastos = todos.filter(e => e.date === hoje);
  if (!gastos.length) return `Nenhum gasto anotado hoje. Teve alguma despesa? Leva 10 segundos.${aviso}`;
  const total = gastos.reduce((s, e) => s + e.amountCents, 0);
  return `Hoje você anotou ${gastos.length} ${gastos.length === 1 ? 'gasto' : 'gastos'} (${brl(total)}). Faltou algum?${aviso}`;
}

async function lembrar({ conferirHora }) {
  let db;
  try {
    db = await abrirBanco();
  } catch {
    return self.registration.showNotification('C.A.O.S. Finanças', { body: 'Passa aqui pra anotar os gastos de hoje.', icon: './icons/icon-192.png', tag: 'lembrete' });
  }
  const cfg = (await lerMeta(db, 'lembrete')) || {};
  if (conferirHora) {
    // sincronização periódica: só lembra depois do horário escolhido e uma vez por dia
    if (!cfg.ativo) return;
    const [h, m] = String(cfg.hora || '20:30').split(':').map(Number);
    const agora = new Date();
    if (agora.getHours() * 60 + agora.getMinutes() < h * 60 + m) return;
    if ((await lerMeta(db, 'ultimoLembrete')) === hojeISO()) return;
  }
  await gravarMeta(db, 'ultimoLembrete', hojeISO());
  return self.registration.showNotification('C.A.O.S. Finanças', {
    body: await textoDoLembrete(db), icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: 'lembrete',
  });
}

self.addEventListener('push', event => {
  // push sem conteúdo (o servidor não sabe nada dos seus gastos): o texto sai daqui
  event.waitUntil(lembrar({ conferirHora: false }));
});

self.addEventListener('periodicsync', event => {
  if (event.tag === 'lembrete') event.waitUntil(lembrar({ conferirHora: true }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const aberto = list.find(c => c.url.startsWith(self.registration.scope));
      return aberto ? aberto.focus() : self.clients.openWindow('./#lancar');
    }),
  );
});
