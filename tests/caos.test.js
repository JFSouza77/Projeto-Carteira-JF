import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { react, LINES, MOODS, DEFAULT_MOOD, emptyMemory } from '../js/caos.js';

const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const gasto = deepFreeze({ type: 'gasto_cadastrado', categoryId: 'mercado', categoryName: 'Mercado', amountCents: 1990 });
const estouro = deepFreeze({
  type: 'categoria_estourada', categoryId: 'lazer', categoryName: 'Lazer',
  spentCents: 12000, budgetCents: 10000, pct: 120, overCents: 2000,
});

test('o narrador não importa persistência nem toca em DOM/storage', () => {
  const src = readFileSync(new URL('../js/caos.js', import.meta.url), 'utf8');
  const code = src.replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /db\.js|indexedDB|localStorage|sessionStorage|document\.|window\./);
});

test('aceita eventos e memória congelados (nunca altera a entrada)', () => {
  const memory = deepFreeze(emptyMemory());
  const out = react(deepFreeze([gasto, estouro]), { memory, now: 1000, rng: () => 0 });
  assert.equal(out.fala.evento, 'categoria_estourada');
  assert.match(out.fala.texto, /Lazer/);
  assert.match(out.fala.texto, /20,00/);
  assert.notEqual(out.memoria, memory);
});

test('humor padrão é Suave', () => {
  assert.equal(DEFAULT_MOOD, 'suave');
});

test('todos os eventos têm falas nos três humores e sem placeholder sobrando', () => {
  const samples = {
    boas_vindas: {},
    gasto_cadastrado: gasto,
    orcamento_80: { categoryName: 'Mercado', pct: 85, leftCents: 1500 },
    categoria_estourada: estouro,
    delivery_repetido: { count: 3, days: 7, totalCents: 9000 },
    mes_verde: { month: '2026-10', monthName: 'outubro de 2026', savedCents: 20000 },
  };
  for (const [type, ev] of Object.entries(LINES)) {
    for (const mood of Object.keys(MOODS)) {
      assert.ok(ev[mood]?.length >= 3, `${type}/${mood}`);
      for (let i = 0; i < ev[mood].length; i++) {
        const { fala } = react([{ type, ...samples[type] }], { mood, rng: () => i / ev[mood].length });
        assert.doesNotMatch(fala.texto, /\{\w+\}/, `${type}/${mood}: ${fala.texto}`);
      }
    }
  }
});

test('anti-repetição: não repete as últimas falas', () => {
  let memory = emptyMemory();
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const out = react([estouro], { memory, now: i, rng: () => 0 });
    seen.push(out.fala.texto);
    memory = out.memoria;
  }
  for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1]);
});

test('cooldown: gasto cadastrado não vira spam, alerta passa', () => {
  const first = react([gasto], { now: 0 });
  assert.ok(first.fala);
  const second = react([gasto], { memory: first.memoria, now: 60_000 });
  assert.equal(second.fala, null);
  const alert = react([gasto, estouro], { memory: first.memoria, now: 60_000 });
  assert.equal(alert.fala.evento, 'categoria_estourada');
  const later = react([gasto], { memory: first.memoria, now: 4 * 60_000 });
  assert.ok(later.fala);
});

test('mês verde só é anunciado uma vez', () => {
  const ev = { type: 'mes_verde', month: '2026-10', monthName: 'outubro de 2026', savedCents: 100 };
  const a = react([ev], {});
  assert.ok(a.fala);
  assert.equal(react([ev], { memory: a.memoria }).fala, null);
});
