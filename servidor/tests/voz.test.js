// 17/11 (JF): voz natural na Azure, igual ao Perfil. Chave de mentira e fetch simulado: nada sai pra internet.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import { vozSsml, _zerarVoz } from '../voz.js';

const ORIGEM = 'https://carteira.exemplo.dev';
function kv() {
  const m = new Map();
  return { m, async get(k) { return m.has(k) ? m.get(k) : null; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); },
    async list({ prefix }) { return { keys: [...m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; } };
}
const req = (rota, corpo) => new Request(`https://srv.exemplo${rota}`, {
  method: corpo ? 'POST' : 'GET', headers: { origin: ORIGEM, 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4' },
  body: corpo ? JSON.stringify(corpo) : undefined,
});
function simularAzure(falhar = new Set()) {
  const chamadas = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    chamadas.push({ u, init });
    if (falhar.has(u.includes('eastus') ? 'mai' : 'padrao')) return new Response('nao', { status: 401 });
    return new Response(new Uint8Array([73, 68, 51, 1, 2, 3]), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
  };
  return { chamadas, restaurar: () => { globalThis.fetch = original; } };
}
const env = (extra = {}) => ({ ORIGENS: ORIGEM, CARTEIRA_KV: kv(), AZURE_SPEECH_KEY: 'chave-de-mentira', AZURE_SPEECH_REGION: 'brazilsouth', ...extra });

beforeEach(() => _zerarVoz());

test('estado: ligada só com a chave; sem chave, a fala dá 503', async () => {
  assert.deepEqual(await (await worker.fetch(req('/voz/estado'), env())).json(), { ligada: true });
  const sem = { ORIGENS: ORIGEM, CARTEIRA_KV: kv() };
  assert.deepEqual(await (await worker.fetch(req('/voz/estado'), sem)).json(), { ligada: false });
  assert.equal((await worker.fetch(req('/voz', { t: 'Oi' }), sem)).status, 503);
});

test('fala nova vira MP3; a mesma fala volta do cache sem chamar o Azure', async () => {
  const az = simularAzure();
  try {
    const e = env();
    const r1 = await worker.fetch(req('/voz', { t: 'Você gastou 30 reais.', r: 1, p: 1, e: 'calmo' }), e);
    assert.equal(r1.status, 200);
    assert.equal(r1.headers.get('content-type'), 'audio/mpeg');
    assert.equal(r1.headers.get('access-control-allow-origin'), ORIGEM);
    assert.equal(az.chamadas.length, 1);
    assert.match(az.chamadas[0].init.body, /pt-BR-AntonioNeural/);
    assert.equal(az.chamadas[0].init.headers['Ocp-Apim-Subscription-Key'], 'chave-de-mentira');
    const r2 = await worker.fetch(req('/voz', { t: 'Você gastou 30 reais.', r: 1, p: 1, e: 'calmo' }), e);
    assert.equal(r2.headers.get('x-voz'), 'guardada');
    assert.equal(az.chamadas.length, 1);
  } finally { az.restaurar(); }
});

test('teto do mês estourado: 429 (o app usa a voz do aparelho)', async () => {
  const az = simularAzure();
  try {
    const r = await worker.fetch(req('/voz', { t: 'Uma fala comprida demais pro teto.' }), env({ VOZ_TETO_MES: '10' }));
    assert.equal(r.status, 429);
    assert.equal(az.chamadas.length, 0);
  } finally { az.restaurar(); }
});

test('a voz "mai" falhando cai na grátis', async () => {
  const az = simularAzure(new Set(['mai']));
  try {
    const r = await worker.fetch(req('/voz', { t: 'Oi, tudo bem?', e: 'festa' }), env({ AZURE_MAI_KEY: 'mai-de-mentira', AZURE_MAI_REGION: 'eastus' }));
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('x-voz'), 'nova:padrao');
    assert.equal(az.chamadas.length, 2);
  } finally { az.restaurar(); }
});

test('SSML: limpa o texto, põe a emoção e o estilo só na voz com estilos', () => {
  const s = vozSsml('pt-BR-AntonioNeural', 'Oi tudo bem', 0, '+0%', 'carinho', false);
  assert.match(s, /volume="-6%"/);
  assert.match(s, /Oi tudo bem\./);
  assert.doesNotMatch(s, /express-as/);
  assert.match(vozSsml('Caio', 'Eba', 0, '+0%', 'festa', true), /style="excited"/);
});
