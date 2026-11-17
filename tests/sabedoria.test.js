// 17/11 (JF): frase do dia de manhã e, no Chat, frase de motivação, ditado e curiosidade de dinheiro (sem IA)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar, reagir } from '../js/caos/index.js';
import { GERADORES } from '../js/caos/falas.js';
import { DEFAULT_CATEGORIES as C } from '../js/engine.js';

const d = { expenses: [], incomes: [], accounts: [], categories: C, compromissos: [], planos: [], metas: [] };
const fala = f => conversar(f, d, { today: '2026-11-17', now: Date.UTC(2026, 10, 17, 12) }).fala;

test('listas fecham em 0 ou 5 e frase de autoria incerta avisa', () => {
  for (const k of ['frase_do_dia', 'motivacao', 'ditado', 'curiosidade_fin']) {
    for (const [nome, v] of Object.entries(GERADORES[k])) if (nome !== 'moldes') assert.equal(v.geral.length % 5, 0, `${k}.${nome}`);
  }
  const einstein = GERADORES.motivacao.frase.geral.find(f => /Einstein/.test(f));
  assert.match(einstein, /nunca acharam prova/);
});

test('no Chat: ditado, motivação e curiosidade respondem sem IA', () => {
  for (const [f, re] of [['me conta um ditado', /ditado|vovó|povo|antigo/i], ['me manda uma frase de motivação', /“/], ['me conta uma curiosidade sobre dinheiro', /./]]) {
    const r = fala(f);
    assert.ok(r.entendeu, f);
    assert.match(r.texto, re, f);
  }
  assert.equal(fala('outra frase').intent, 'motivacao');
  assert.equal(fala('outro ditado').intent, 'ditado');
  assert.notEqual(fala('tenho curiosidade de saber quanto gastei este mês').intent, 'curiosidade_fin');
});

test('frase do dia: de manhã sai, mas aviso importante vem antes; no máximo 1 vez por dia', () => {
  const r = reagir([{ type: 'frase_do_dia' }, { type: 'boas_vindas' }], { now: Date.UTC(2026, 10, 17, 11) });
  assert.match(r.fala.texto, /“/);
  const de_novo = reagir([{ type: 'frase_do_dia' }], { memory: r.memoria, now: Date.UTC(2026, 10, 17, 13) });
  assert.equal(de_novo.fala, null);
  const alerta = reagir([{ type: 'frase_do_dia' }, { type: 'conta_negativa', accountName: 'Inter', balanceCents: -500 }], { now: Date.UTC(2026, 10, 17, 11) });
  assert.equal(alerta.fala.evento, 'conta_negativa');
});
