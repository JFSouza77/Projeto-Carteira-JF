// "Dá pra gastar R$ X até o salário" e sugestão de orçamento quando uma categoria pesa (15/11, ideias do Code, ok do JF).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reagir } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES, createExpense, createIncome, podeGastar, analyze } from '../js/engine.js';

const g = (v, cat, date) => createExpense({ amountCents: v, categoryId: cat, date }, { categories: DEFAULT_CATEGORIES, now: new Date(date + 'T12:00') });
const sal = createIncome({ amountCents: 300000, sourceId: 'salario', date: '2026-11-04' }, { now: new Date(2026, 10, 4) });
const d = { expenses: [g(60000, 'mercado', '2026-11-05'), g(30000, 'transporte', '2026-11-10')], incomes: [sal], categories: DEFAULT_CATEGORIES, compromissos: [], planos: [] };

test('dá pra gastar até o próximo salário, com o valor por dia', () => {
  const p = podeGastar(d, '2026-11-15');
  assert.equal(p.sobraCents, 210000);
  assert.equal(p.ate, '2026-12-04');
  assert.equal(p.dias, 19);
  assert.equal(p.porDiaCents, Math.floor(210000 / 19));
});

test('sem salário anotado vale até o fim do mês; sem entrada, não mostra', () => {
  const extra = createIncome({ amountCents: 100000, sourceId: 'freela', date: '2026-11-02' }, { now: new Date(2026, 10, 2) });
  const p = podeGastar({ ...d, incomes: [extra] }, '2026-11-15');
  assert.equal(p.ate, '2026-12-01');
  assert.equal(p.diaSalario, null);
  assert.equal(podeGastar({ ...d, incomes: [] }, '2026-11-15'), null);
});

test('categoria que pesa 40% ou mais ganha sugestão de orçamento', () => {
  const a = analyze({ ...d, accounts: [] }, '2026-11-15').find(x => x.type === 'categoria_pesando');
  assert.equal(a.categoryName, 'Mercado');
  assert.equal(a.pct, 67);
  const { fala } = reagir([a], { mood: 'suave', memory: {}, now: Date.UTC(2026, 10, 15, 12) });
  assert.match(fala.texto, /Mercado/);
  assert.match(fala.texto, /67%/);
});

test('aba Entradas: total do mês e quanto falta pra igualar o mês passado', async () => {
  const { resumoEntradas } = await import('../js/engine.js');
  const out = createIncome({ amountCents: 450000, sourceId: 'salario', date: '2026-10-04' }, { now: new Date(2026, 9, 4) });
  const r = resumoEntradas([sal, out], [], '2026-11');
  assert.equal(r.totalCents, 300000);
  assert.equal(r.passadoCents, 450000);
  assert.equal(r.faltaCents, 150000);
  assert.equal(r.acimaCents, 0);
});
