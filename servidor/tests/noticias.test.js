// Notícias do dia (14/11): rodam 2x por dia, com teto no mês, e a rota só lê o KV. IA de mentira (nada é cobrado).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { turnoDasNoticias, lerNoticias, atualizarNoticiasSeHora, noticiasRota } from '../worker.js';

function kv() {
  const m = new Map();
  return { m, async get(k) { return m.get(k) ?? null; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); } };
}
const RESPOSTA = 'Aqui:\n[{"titulo":"Dólar cai","resumo":"O dólar fechou em baixa.","porque":"Viagem fica mais barata.","fonte":"Site X","url":"https://exemplo.com/a"},'
  + '{"titulo":"Golpe do Pix","resumo":"Novo golpe circula.","porque":"Confira o nome antes de pagar.","fonte":"Site Y","url":"javascript:alert(1)"}]';
function iaFalsa() {
  const chamadas = [];
  return { chamadas, criar: () => ({ messages: { create: async p => { chamadas.push(p); return { stop_reason: 'end_turn', content: [{ type: 'text', text: RESPOSTA }] }; } } }) };
}
const env = extra => ({ CARTEIRA_KV: kv(), NOTICIAS_LIGADAS: '1', ANTHROPIC_API_KEY: 'chave-de-mentira', ...extra });

test('turno: nada antes das 7h de Brasília, manhã até 17h, depois tarde', () => {
  assert.equal(turnoDasNoticias(new Date('2026-11-14T09:59:00Z')), null);
  assert.equal(turnoDasNoticias(new Date('2026-11-14T10:00:00Z')).turno, 'manha');
  assert.equal(turnoDasNoticias(new Date('2026-11-14T20:15:00Z')).turno, 'tarde');
});

test('lerNoticias: tira o JSON do texto e joga fora link perigoso', () => {
  const l = lerNoticias(RESPOSTA);
  assert.equal(l.length, 2);
  assert.equal(l[0].url, 'https://exemplo.com/a');
  assert.equal(l[1].url, '');
  assert.deepEqual(lerNoticias('sem json'), []);
});

test('roda 1 vez por turno, com no máximo 2 buscas e o modelo barato, e guarda pra rota ler', async () => {
  const e = env({ NOTICIAS_MODELO: 'modelo-barato' });
  const ia = iaFalsa();
  const agora = new Date('2026-11-14T10:05:00Z');
  const p = await atualizarNoticiasSeHora(e, agora, ia.criar);
  assert.equal(p.itens.length, 2);
  assert.equal(ia.chamadas[0].model, 'modelo-barato');
  assert.equal(ia.chamadas[0].tools[0].max_uses, 2);
  assert.equal(await atualizarNoticiasSeHora(e, new Date('2026-11-14T10:20:00Z'), ia.criar), null); // mesmo turno: não repete
  assert.equal(ia.chamadas.length, 1);
  assert.equal((await noticiasRota(e)).itens[0].titulo, 'Dólar cai');
});

test('desligado, sem chave ou no teto do mês: não chama a IA', async () => {
  const ia = iaFalsa();
  const agora = new Date('2026-11-14T10:05:00Z');
  assert.equal(await atualizarNoticiasSeHora(env({ NOTICIAS_LIGADAS: '0' }), agora, ia.criar), null);
  assert.equal(await atualizarNoticiasSeHora(env({ ANTHROPIC_API_KEY: '' }), agora, ia.criar), null);
  const e = env({ NOTICIAS_TETO_MES: '3' });
  await e.CARTEIRA_KV.put('noticias:mes:2026-11', '3');
  assert.equal(await atualizarNoticiasSeHora(e, agora, ia.criar), null);
  assert.equal(ia.chamadas.length, 0);
});

test('rota sem notícia ainda: erro claro, sem chamar a IA', async () => {
  await assert.rejects(() => noticiasRota(env()), /Ainda sem notícias/);
});
