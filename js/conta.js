// Conta e sincronização entre aparelhos (06/11). Camada de navegador: fala com o servidor da Carteira.
// Quem guarda as mudanças pendentes e aplica as que chegam é o db.js; quem decide quando sincronizar é o app.js.
// A conta (apelido + token) fica em meta/conta, só no aparelho. A senha nunca é guardada.

import * as db from './db.js';

const TEMPO_MS = 20_000;

async function chamar(base, rota, corpo, token) {
  if (!base) throw new Error('Falta o endereço do servidor da Carteira (Ajustes → Servidor e IA online).');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TEMPO_MS);
  try {
    const r = await fetch(base.replace(/\/+$/, '') + rota, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(corpo || {}),
      signal: ctrl.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(j.erro || `O servidor respondeu ${r.status}.`);
      e.status = r.status;
      throw e;
    }
    return j;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('O servidor demorou demais. Tenta de novo.');
    if (e instanceof TypeError) throw new Error('Sem conexão com o servidor da Carteira agora.');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export async function contaAtual() {
  return db.getMeta('conta', null);
}

async function guardar(conta) {
  await db.setMeta('conta', conta);
  db.setRastrear(!!conta);
  return conta;
}

/** Cria a conta ou entra numa que já existe. Na primeira vez, junta o que já estava no aparelho com o servidor. */
export async function entrar(base, { apelido, senha, criar = false }) {
  const r = await chamar(base, criar ? '/conta/criar' : '/conta/entrar', { apelido, senha });
  await guardar({ apelido: r.apelido, token: r.token, versao: 0, ultimaSync: null });
  await db.marcarTudo();
  return r.apelido;
}

export async function sair(base) {
  const c = await contaAtual();
  if (c?.token) await chamar(base, '/conta/sair', {}, c.token).catch(() => {});
  await guardar(null);
}

/**
 * Manda o que mudou aqui e recebe o que mudou nos outros aparelhos.
 * Devolve { recebidas } (quantas mudanças chegaram de fora: o app recarrega a tela se for > 0).
 */
export async function sincronizar(base) {
  const c = await contaAtual();
  if (!c?.token) return { recebidas: 0, semConta: true };
  db.setRastrear(true);
  const enviadas = await db.pegarPendentes();
  let r;
  try {
    r = await chamar(base, '/sync', { desde: c.versao || 0, mudancas: enviadas }, c.token);
  } catch (e) {
    if (e.status === 401) { await guardar(null); throw new Error('Sua sessão expirou. Entre na conta de novo em Ajustes.'); }
    throw e;
  }
  await db.limparPendentes(enviadas);
  // o que eu mesmo mandei volta igual: não precisa reaplicar
  const minhas = new Set(enviadas.map(m => `${m.store}/${m.id}/${m.em}`));
  const deFora = (r.mudancas || []).filter(m => !minhas.has(`${m.store}/${m.id}/${m.em}`));
  await db.aplicarRemotas(deFora);
  await guardar({ ...c, versao: r.versao, ultimaSync: Date.now() });
  return { recebidas: deFora.length, enviadas: enviadas.length };
}
