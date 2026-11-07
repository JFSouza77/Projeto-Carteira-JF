// Conta e sincronização (06/11). Tudo de mentira: KV na memória, apelidos e senhas inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import worker from '../worker.js';

// o app manda a "senha de acesso" (tirada da senha no aparelho) e registros embaralhados: aqui, de mentira
const A = s => `e2ee1:${createHash('sha256').update(s).digest('hex')}`;
const C = txt => ({ v: 1, d: Buffer.from(txt).toString('base64') });

const ORIGEM = 'https://carteira.exemplo.dev';
function kv() {
  const m = new Map();
  return { m, async get(k) { return m.has(k) ? m.get(k) : null; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); } };
}
const envBase = () => ({ ORIGENS: ORIGEM, CARTEIRA_KV: kv() });
let ip = 0;
const req = (rota, corpo, token, ipFixo) => new Request(`https://srv.exemplo${rota}`, {
  method: 'POST',
  headers: { origin: ORIGEM, 'content-type': 'application/json', 'cf-connecting-ip': ipFixo || `10.0.0.${++ip % 250}`, ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(corpo ?? {}),
});
const chamar = async (env, rota, corpo, token, ipFixo) => {
  const r = await worker.fetch(req(rota, corpo, token, ipFixo), env);
  return { status: r.status, j: await r.json() };
};

test('criar conta, entrar e sair; a senha nunca fica guardada em texto', async () => {
  const env = envBase();
  const c = await chamar(env, '/conta/criar', { apelido: 'Fulano.Teste', senha: A('senha-de-mentira') });
  assert.equal(c.status, 200);
  assert.equal(c.j.apelido, 'fulano.teste');
  assert.match(c.j.token, /^[a-f0-9]{64}$/);
  const guardado = env.CARTEIRA_KV.m.get('conta:fulano.teste');
  assert.ok(guardado && !guardado.includes('senha-de-mentira') && !guardado.includes(A('senha-de-mentira').slice(6)));
  assert.ok(![...env.CARTEIRA_KV.m.keys()].some(k => k.includes(c.j.token)), 'token não fica em texto');
  assert.equal((await chamar(env, '/conta/criar', { apelido: 'fulano.teste', senha: A('outra-senha') })).status, 409);
  assert.equal((await chamar(env, '/conta/entrar', { apelido: 'FULANO.TESTE', senha: A('senha-de-mentira') })).status, 200);
  const errada = await chamar(env, '/conta/entrar', { apelido: 'fulano.teste', senha: A('errada123') });
  assert.equal(errada.status, 401);
  const naoExiste = await chamar(env, '/conta/entrar', { apelido: 'ninguem', senha: A('errada123') });
  assert.equal(naoExiste.j.erro, errada.j.erro); // não entrega quem tem conta
  assert.equal((await chamar(env, '/conta/sair', {}, c.j.token)).status, 200);
  assert.equal((await chamar(env, '/sync', { desde: 0, mudancas: [] }, c.j.token)).status, 401);
});

test('apelido e senha inválidos, sem token e sem KV', async () => {
  const env = envBase();
  assert.equal((await chamar(env, '/conta/criar', { apelido: 'ab', senha: A('senha123') })).status, 400);
  assert.equal((await chamar(env, '/conta/criar', { apelido: '<script>', senha: A('senha123') })).status, 400);
  assert.equal((await chamar(env, '/conta/criar', { apelido: 'fulano', senha: '123' })).status, 400);
  // senha de verdade (sem passar pelo app novo) é recusada: o servidor nunca deve recebê-la
  assert.equal((await chamar(env, '/conta/criar', { apelido: 'fulano', senha: 'minha-senha-de-verdade' })).status, 400);
  assert.equal((await chamar(env, '/sync', { desde: 0, mudancas: [] })).status, 401);
  assert.equal((await chamar(env, '/sync', { desde: 0, mudancas: [] }, 'f'.repeat(64))).status, 401);
  const semKv = { ORIGENS: ORIGEM };
  assert.equal((await chamar(semKv, '/conta/criar', { apelido: 'fulano', senha: A('senha123') })).status, 503);
});

test('muitas tentativas de senha são barradas', async () => {
  const env = envBase();
  await chamar(env, '/conta/criar', { apelido: 'alvo', senha: A('senha-certa') }, null, '9.9.9.9');
  let ultimo;
  for (let i = 0; i < 12; i++) ultimo = await chamar(env, '/conta/entrar', { apelido: 'alvo', senha: A(`chute${i}xx`) }, null, `8.8.8.${i}`);
  assert.equal(ultimo.status, 429);
});

test('sincroniza entre dois aparelhos: o que muda num aparece no outro, e quem mudou por último ganha', async () => {
  const env = envBase();
  const { j: { token } } = await chamar(env, '/conta/criar', { apelido: 'fulano', senha: A('senha-de-mentira') });
  // celular manda um gasto
  const cel = await chamar(env, '/sync', { desde: 0, mudancas: [{ store: 'expenses', id: 'g1', em: 1000, rec: C('gasto 1500') }] }, token);
  assert.equal(cel.status, 200);
  assert.equal(cel.j.versao, 1);
  // PC (que nunca sincronizou) recebe
  const pc = await chamar(env, '/sync', { desde: 0, mudancas: [] }, token);
  assert.deepEqual(pc.j.mudancas.map(m => m.id), ['g1']);
  // PC muda o valor depois; celular manda uma mudança mais velha: a do PC ganha
  await chamar(env, '/sync', { desde: 1, mudancas: [{ store: 'expenses', id: 'g1', em: 3000, rec: C('gasto 2000') }] }, token);
  const velho = await chamar(env, '/sync', { desde: 1, mudancas: [{ store: 'expenses', id: 'g1', em: 2000, rec: C('gasto 999') }] }, token);
  assert.equal(velho.j.aceitas, 0);
  assert.deepEqual(velho.j.mudancas.find(m => m.id === 'g1').rec, C('gasto 2000'));
  // apagar no celular apaga no PC
  const ap = await chamar(env, '/sync', { desde: 2, mudancas: [{ store: 'expenses', id: 'g1', em: 4000, rec: null }] }, token);
  const pc2 = await chamar(env, '/sync', { desde: 2, mudancas: [] }, token);
  assert.equal(ap.j.versao, 3);
  assert.equal(pc2.j.mudancas.find(m => m.id === 'g1').rec, null);
  // lixo e store desconhecido não entram
  const lixo = await chamar(env, '/sync', { desde: 3, mudancas: [{ store: 'senhas', id: 'x', em: 5000, rec: C('x') }, { store: 'expenses', id: '../x', em: 5000, rec: C('x') }, 'oi'] }, token);
  assert.equal(lixo.j.aceitas, 0);
  // uma conta não vê a outra
  const { j: { token: outro } } = await chamar(env, '/conta/criar', { apelido: 'beltrano', senha: A('senha-de-mentira') });
  assert.equal((await chamar(env, '/sync', { desde: 0, mudancas: [] }, outro)).j.mudancas.length, 0);
});

test('servidor recusa dado aberto (sem embaralhar) e não guarda nada dele', async () => {
  const env = envBase();
  const { j: { token } } = await chamar(env, '/conta/criar', { apelido: 'fulano', senha: A('senha-de-mentira') });
  const aberto = await chamar(env, '/sync', { desde: 0, mudancas: [{ store: 'expenses', id: 'g1', em: 1000, rec: { amountCents: 1500, note: 'farmácia' } }] }, token);
  assert.equal(aberto.status, 400);
  const extra = await chamar(env, '/sync', { desde: 0, mudancas: [{ store: 'expenses', id: 'g1', em: 1000, rec: { ...C('x'), note: 'vazou' } }] }, token);
  assert.equal(extra.status, 400);
  assert.ok(![...env.CARTEIRA_KV.m.values()].some(v => String(v).includes('farmácia') || String(v).includes('vazou')));
});
