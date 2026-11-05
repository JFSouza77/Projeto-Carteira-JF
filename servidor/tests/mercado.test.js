import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { buscarMercado, horaDeAtualizar, atualizarMercadoSeHora, mercadoRota } from '../worker.js';
import { analisarSerie, quandoFoi } from '../../js/mercado.js';

// Dados de mentira no formato das APIs públicas (este ambiente não alcança as reais).
const serieAlta = Array.from({ length: 21 }, (_, i) => 5 + i * 0.02); // 5,00 → 5,40
function fetchFalso(falhar = []) {
  const chamadas = [];
  const f = async url => {
    chamadas.push(url);
    const u = String(url);
    const ok = obj => new Response(JSON.stringify(obj), { status: 200, headers: { 'content-type': 'application/json' } });
    if (falhar.some(x => u.includes(x))) return new Response('erro', { status: 500 });
    if (u.includes('/json/last/')) {
      return ok({
        USDBRL: { bid: '5.48', pctChange: '0.42', create_date: '2026-11-06 10:05:00' },
        EURBRL: { bid: '6.10', pctChange: '-0.10', create_date: '2026-11-06 10:05:00' },
        BTCBRL: { bid: '600000', pctChange: '1.5', create_date: '2026-11-06 10:05:00' },
      });
    }
    if (u.includes('/json/daily/')) return ok([...serieAlta].reverse().map(v => ({ bid: String(v) })));
    if (u.includes('finance.yahoo.com')) {
      return ok({ chart: { result: [{ meta: { regularMarketPrice: 132000 }, indicators: { quote: [{ close: Array.from({ length: 30 }, (_, i) => 140000 - i * 300) }] } }] } });
    }
    if (u.includes('sgs.432')) return ok([{ data: '05/11/2026', valor: '10,75' }]);
    if (u.includes('sgs.4389')) return ok([{ data: '05/11/2026', valor: '10,65' }]);
    if (u.includes('sgs.13522')) return ok([{ data: '01/10/2026', valor: '4,20' }]);
    return new Response('?', { status: 404 });
  };
  return { f, chamadas };
}
function kv() {
  const m = new Map();
  return { m, async get(k) { return m.get(k) ?? null; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); }, async list() { return { keys: [], list_complete: true }; } };
}

test('análise: variação, médias e tendência com base de cálculo', () => {
  const a = analisarSerie(serieAlta);
  assert.equal(a.tendencia, 'alta');
  assert.ok(a.var5 > 0 && a.media5 > a.media20);
  assert.equal(analisarSerie([...serieAlta].reverse()).tendencia, 'queda');
  assert.equal(analisarSerie([5, 5.01, 4.99, 5, 5.01, 5, 5]).tendencia, 'estavel');
  assert.equal(analisarSerie([]), null);
});

test('buscarMercado monta o resumo e segue mesmo se uma fonte cair', async () => {
  const { f } = fetchFalso();
  const r = await buscarMercado(f, new Date('2026-11-06T13:10:00Z'));
  assert.equal(r.moedas.USD.atual, 5.48);
  assert.equal(r.moedas.USD.varDia, 0.42);
  assert.equal(r.moedas.USD.tendencia, 'alta');
  assert.equal(r.ibov.tendencia, 'queda');
  assert.equal(r.selic.valor, 10.75);
  assert.equal(r.cdi.valor, 10.65);
  assert.deepEqual(r.falhas, []);
  const caiu = await buscarMercado(fetchFalso(['finance.yahoo.com']).f);
  assert.ok(caiu.moedas.USD && !caiu.ibov);
  assert.match(caiu.falhas.join(), /ibovespa/);
});

test('atualiza só em dia útil depois das 10h05 (Brasília) e uma vez por dia', async () => {
  assert.equal(horaDeAtualizar(new Date('2026-11-06T13:10:00Z')).pode, true); // sexta 10h10
  assert.equal(horaDeAtualizar(new Date('2026-11-06T12:50:00Z')).pode, false); // sexta 09h50
  assert.equal(horaDeAtualizar(new Date('2026-11-07T13:10:00Z')).pode, false); // sábado
  const env = { CARTEIRA_KV: kv() };
  const { f, chamadas } = fetchFalso();
  assert.ok(await atualizarMercadoSeHora(env, new Date('2026-11-06T13:10:00Z'), f));
  const n = chamadas.length;
  assert.equal(await atualizarMercadoSeHora(env, new Date('2026-11-06T13:25:00Z'), f), null);
  assert.equal(chamadas.length, n, 'não busca de novo no mesmo dia');
  assert.ok(JSON.parse(env.CARTEIRA_KV.m.get('mercado:resumo')).moedas.EUR);
});

test('rota /mercado entrega o resumo guardado (e só pra origem autorizada)', async () => {
  const env = { ORIGENS: 'https://carteira.exemplo.dev', CARTEIRA_KV: kv() };
  await env.CARTEIRA_KV.put('mercado:resumo', JSON.stringify({ atualizadoEm: '2026-11-06T13:10:00Z', moedas: { USD: { atual: 5.48 } } }));
  const ok = await worker.fetch(new Request('https://srv/mercado', { headers: { origin: 'https://carteira.exemplo.dev' } }), env);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).moedas.USD.atual, 5.48);
  const nao = await worker.fetch(new Request('https://srv/mercado', { headers: { origin: 'https://outro.dev' } }), env);
  assert.equal(nao.status, 403);
  const vazio = { CARTEIRA_KV: kv() };
  const r = await mercadoRota(vazio, fetchFalso().f);
  assert.ok(r.moedas.USD, 'primeira vez busca na hora');
});

test('quandoFoi diz a idade do dado', () => {
  assert.match(quandoFoi('2026-11-06T13:05:00Z', new Date('2026-11-06T15:00:00Z')), /^hoje às 10:05$/);
  assert.match(quandoFoi('2026-11-05T13:05:00Z', new Date('2026-11-06T15:00:00Z')), /^ontem/);
});
