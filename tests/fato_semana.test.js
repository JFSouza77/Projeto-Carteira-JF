// Fato da semana (15/11, no lugar do troféu da ofensiva): compara 7 dias com os 7 anteriores e fala só se fizer diferença.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reagir } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES, createExpense, fatoDaSemana } from '../js/engine.js';

const g = (v, cat, date) => createExpense({ amountCents: v, categoryId: cat, date }, { categories: DEFAULT_CATEGORIES, now: new Date(date + 'T12:00') });
const passada = [g(5000, 'mercado', '2026-11-02'), g(4000, 'mercado', '2026-11-04'), g(3000, 'transporte', '2026-11-06')];
const esta = [g(2000, 'mercado', '2026-11-09'), g(1500, 'mercado', '2026-11-11'), g(3000, 'transporte', '2026-11-14')];

test('semana com menos gasto: diferença e quem mais ajudou', () => {
  const f = fatoDaSemana([...passada, ...esta], DEFAULT_CATEGORIES, '2026-11-15');
  assert.equal(f.type, 'semana_menos');
  assert.equal(f.amountCents, 5500);
  assert.equal(f.categoryName, 'Mercado');
  const { fala } = reagir([f], { mood: 'suave', memory: {}, now: Date.UTC(2026, 10, 15, 12) });
  assert.match(fala.texto, /R\$\s55,00/);
  assert.match(fala.texto, /Mercado/);
});

test('fica quieto com pouca anotação ou diferença pequena', () => {
  assert.equal(fatoDaSemana(esta, DEFAULT_CATEGORIES, '2026-11-15'), null);
  const quase = [g(5000, 'mercado', '2026-11-09'), g(4000, 'mercado', '2026-11-11'), g(2500, 'transporte', '2026-11-14')];
  assert.equal(fatoDaSemana([...passada, ...quase], DEFAULT_CATEGORIES, '2026-11-15'), null);
});

test('não repete na mesma semana', () => {
  const f = fatoDaSemana([...passada, ...esta], DEFAULT_CATEGORIES, '2026-11-15');
  const t = Date.UTC(2026, 10, 15, 12);
  const r1 = reagir([f], { mood: 'suave', memory: {}, now: t });
  const r2 = reagir([f], { mood: 'suave', memory: r1.memoria, now: t + 2 * 24 * 3_600_000 });
  assert.ok(!r2.fala || !/semana/.test(r2.fala.texto));
});
