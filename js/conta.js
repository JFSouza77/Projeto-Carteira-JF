// Conta e sincronização entre aparelhos (06/11). Camada de navegador: fala com o servidor do C.A.O.S. Finanças.
// Quem guarda as mudanças pendentes e aplica as que chegam é o db.js; quem decide quando sincronizar é o app.js.
// A conta (apelido + token) fica em meta/conta, só no aparelho. A senha nunca é guardada.
// Ponta a ponta (07/11): a senha nem sai do aparelho. Dela sai uma "senha de acesso" (é o que vai pro servidor) e a
// chave que embaralha cada registro antes de subir (fica em meta/contaChave, só aqui). O servidor guarda só blocos
// embaralhados: vê que existe um gasto (o tipo, o id e quando mudou), mas não vê valor, nome, nada.

import * as db from './db.js';
import { derivarChaves, cifrarMudancas, decifrarMudancas } from './cripto.js';

const LOTE = 300; // mudanças por pedido (a primeira sincronização de quem tem muita coisa vai em partes)

const TEMPO_MS = 20_000;

async function chamar(base, rota, corpo, token) {
  if (!base) throw new Error('Falta o endereço do servidor do C.A.O.S. Finanças (Ajustes → Servidor e IA online).');
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
    if (e instanceof TypeError) throw new Error('Sem conexão com o servidor do C.A.O.S. Finanças agora.');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export async function contaAtual() {
  return db.getMeta('conta', null);
}

async function guardar(conta, chave) {
  await db.setMeta('conta', conta);
  if (chave !== undefined) await db.setMeta('contaChave', chave);
  db.setRastrear(!!conta);
  return conta;
}

/** Cria a conta ou entra numa que já existe. Na primeira vez, junta o que já estava no aparelho com o servidor. */
export async function entrar(base, { apelido, senha, criar = false }) {
  const { acesso, chave } = await derivarChaves(apelido, senha);
  const r = await chamar(base, criar ? '/conta/criar' : '/conta/entrar', { apelido, senha: acesso });
  // 14/11 (JF): o login não liga pra maiúscula ("JF" = "jf"), mas o nome aparece do jeito que a pessoa digitou
  const exibicao = nomeDeExibicao(apelido) || r.apelido;
  await guardar({ apelido: r.apelido, exibicao, token: r.token, versao: 0, ultimaSync: null, cripto: 1 }, chave);
  // os dados deste aparelho passam a ser desta conta (quem confere troca de conta é o app, antes de chamar aqui)
  await db.setMeta('contaDona', r.apelido);
  await db.marcarTudo();
  return { apelido: r.apelido, exibicao, criador: r.criador === true };
}

/** Nome que aparece na tela (2 a 30 letras, números, espaço, ponto, traço ou sublinhado). Não muda o login. */
export function nomeDeExibicao(nome) {
  const n = String(nome || '').trim().replace(/\s+/g, ' ');
  return /^[\p{L}\p{N} ._-]{2,30}$/u.test(n) ? n : null;
}

/** Troca só o nome que aparece (o "nick"); pra entrar continua valendo o apelido da conta, sem ligar pra maiúscula. */
export async function trocarExibicao(nome) {
  const c = await contaAtual();
  const n = nomeDeExibicao(nome);
  if (!c) throw new Error('Entre na conta primeiro.');
  if (!n) throw new Error('Use de 2 a 30 letras ou números (pode espaço, ponto, traço e sublinhado).');
  await db.setMeta('conta', { ...c, exibicao: n });
  return n;
}

/** De qual conta são os dados deste aparelho (null = nunca entrou em conta). */
export async function contaDona() {
  return db.getMeta('contaDona', null);
}

export async function sair(base) {
  const c = await contaAtual();
  if (c?.token) await chamar(base, '/conta/sair', {}, c.token).catch(() => {});
  await guardar(null, null);
}

/**
 * Manda o que mudou aqui e recebe o que mudou nos outros aparelhos.
 * Devolve { recebidas } (quantas mudanças chegaram de fora: o app recarrega a tela se for > 0).
 */
export async function sincronizar(base) {
  let c = await contaAtual();
  if (!c?.token) return { recebidas: 0, semConta: true };
  const chave = await db.getMeta('contaChave', null);
  if (!chave || !c.cripto) {
    // conta de antes da criptografia, ou chave perdida: pede a senha de novo (sem senha não dá pra abrir nada)
    await guardar(null, null);
    throw new Error('Por segurança, entre na sua conta de novo em Ajustes (agora seus dados sobem embaralhados).');
  }
  db.setRastrear(true);
  const pendentes = await db.pegarPendentes();
  let recebidas = 0, ruins = 0, primeira = true;
  // manda em lotes; o primeiro pedido vai mesmo sem nada pendente, pra buscar o que mudou nos outros aparelhos
  for (let i = 0; primeira || i < pendentes.length; i += LOTE) {
    primeira = false;
    const lote = pendentes.slice(i, i + LOTE);
    let r;
    try {
      r = await chamar(base, '/sync', { desde: c.versao || 0, mudancas: await cifrarMudancas(chave, lote) }, c.token);
    } catch (e) {
      if (e.status === 401) { await guardar(null, null); throw new Error('Sua sessão expirou. Entre na conta de novo em Ajustes.'); }
      throw e;
    }
    await db.limparPendentes(lote);
    // o que eu mesmo mandei volta igual: não precisa reaplicar
    const minhas = new Set(lote.map(m => `${m.store}/${m.id}/${m.em}`));
    const aberto = await decifrarMudancas(chave, (r.mudancas || []).filter(m => !minhas.has(`${m.store}/${m.id}/${m.em}`)));
    await db.aplicarRemotas(aberto.ok);
    recebidas += aberto.ok.length;
    ruins += aberto.ruins;
    // registro que não abriu (achado do GPT, 12/11): não avança o cursor, pra ele ser pedido de novo na próxima vez
    // (o que abriu é reaplicado sem problema: aplicar a mesma mudança duas vezes dá o mesmo resultado)
    c = { ...c, versao: aberto.ruins ? (c.versao || 0) : r.versao, ultimaSync: Date.now() };
    await guardar(c);
  }
  return { recebidas, enviadas: pendentes.length, ruins };
}
