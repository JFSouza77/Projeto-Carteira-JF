import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAmount, formatBRL, shiftMonth, createExpense, summarizeMonth,
  detectExpenseEvents, detectMonthClose, DEFAULT_CATEGORIES,
} from '../js/engine.js';

// Dados inventados. Nunca use dados reais aqui.
const cats = DEFAULT_CATEGORIES.map(c => ({ ...c }));
const withBudget = (id, budgetCents) => cats.map(c => (c.id === id ? { ...c, budgetCents } : c));
const exp = (amountCents, categoryId, date) => createExpense({ amountCents, categoryId, date }, { categories: cats });

test('parseAmount entende formatos brasileiros', () => {
  assert.equal(parseAmount('12'), 1200);
  assert.equal(parseAmount('12,5'), 1250);
  assert.equal(parseAmount('R$ 9,90'), 990);
  assert.equal(parseAmount('1.234,56'), 123456);
  assert.equal(parseAmount('1.234'), 123400);
  assert.equal(parseAmount('12.50'), 1250);
  assert.equal(parseAmount('0'), null);
  assert.equal(parseAmount('-5'), null);
  assert.equal(parseAmount('abc'), null);
  assert.equal(parseAmount(''), null);
});

test('formatBRL', () => {
  assert.match(formatBRL(123456), /R\$\s?1\.234,56/);
});

test('shiftMonth vira o ano', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
});

test('createExpense valida', () => {
  assert.throws(() => createExpense({ amountCents: 0, categoryId: 'mercado' }, { categories: cats }));
  assert.throws(() => createExpense({ amountCents: 100, categoryId: 'xyz' }, { categories: cats }));
  assert.throws(() => createExpense({ amountCents: 100, categoryId: 'mercado', date: '2026-02-30' }, { categories: cats }));
  const e = exp(1000, 'mercado', '2026-11-05');
  assert.equal(e.month, '2026-11');
});

test('summarizeMonth soma por categoria e só do mês pedido', () => {
  const list = [exp(1000, 'mercado', '2026-11-01'), exp(500, 'mercado', '2026-11-02'), exp(700, 'lazer', '2026-10-31')];
  const s = summarizeMonth(list, withBudget('mercado', 3000), '2026-11');
  assert.equal(s.totalCents, 1500);
  assert.equal(s.budgetTotalCents, 3000);
  const s2 = summarizeMonth([...list, exp(9000, 'lazer', '2026-11-03')], withBudget('mercado', 3000), '2026-11');
  assert.equal(s2.totalCents, 10500);
  assert.equal(s2.ratio, 0.5, 'gasto em categoria sem limite não conta contra o orçamento');
  assert.equal(s.rows.find(r => r.id === 'mercado').ratio, 0.5);
  assert.equal(s.rows.find(r => r.id === 'lazer').ratio, null);
});

test('alerta de 80% dispara só na travessia', () => {
  const c = withBudget('mercado', 10000);
  const a = exp(7000, 'mercado', '2026-11-01');
  const b = exp(1500, 'mercado', '2026-11-02');
  const ev = detectExpenseEvents({ expenses: [a, b], categories: c, newExpense: b });
  assert.deepEqual(ev.map(e => e.type), ['gasto_cadastrado', 'orcamento_80']);
  assert.equal(ev[1].pct, 85);
  const d = exp(100, 'mercado', '2026-11-03');
  const ev2 = detectExpenseEvents({ expenses: [a, b, d], categories: c, newExpense: d });
  assert.deepEqual(ev2.map(e => e.type), ['gasto_cadastrado']);
});

test('estouro tem prioridade sobre 80% quando cruza os dois de uma vez', () => {
  const c = withBudget('lazer', 10000);
  const a = exp(12000, 'lazer', '2026-11-01');
  const ev = detectExpenseEvents({ expenses: [a], categories: c, newExpense: a });
  assert.deepEqual(ev.map(e => e.type), ['gasto_cadastrado', 'categoria_estourada']);
  assert.equal(ev[1].overCents, 2000);
});

test('delivery repetido: 3 em 7 dias', () => {
  const list = [exp(3000, 'delivery', '2026-11-01'), exp(3000, 'delivery', '2026-11-04')];
  const third = exp(3000, 'delivery', '2026-11-07');
  const ev = detectExpenseEvents({ expenses: [...list, third], categories: cats, newExpense: third });
  assert.ok(ev.some(e => e.type === 'delivery_repetido' && e.count === 3));
  const late = exp(3000, 'delivery', '2026-11-09'); // 01/11 fica de fora da janela
  const ev2 = detectExpenseEvents({ expenses: [...list, late], categories: cats, newExpense: late });
  assert.ok(!ev2.some(e => e.type === 'delivery_repetido'));
});

test('mês verde', () => {
  const c = withBudget('mercado', 50000);
  const list = [exp(30000, 'mercado', '2026-10-10')];
  const ev = detectMonthClose({ expenses: list, categories: c, currentMonth: '2026-11' });
  assert.equal(ev[0].type, 'mes_verde');
  assert.equal(ev[0].savedCents, 20000);
  assert.deepEqual(detectMonthClose({ expenses: [exp(60000, 'mercado', '2026-10-10')], categories: c, currentMonth: '2026-11' }), []);
  assert.deepEqual(detectMonthClose({ expenses: [], categories: c, currentMonth: '2026-11' }), []);
});

import { createIncome, createAccount, accountBalance, totalBalance, analyze, parseSignedAmount, periodRange, forecastMonth } from '../js/engine.js';

test('entradas validam a fonte', () => {
  assert.throws(() => createIncome({ amountCents: 100, sourceId: 'xyz' }));
  const i = createIncome({ amountCents: 150000, sourceId: 'salario', date: '2026-11-05' });
  assert.equal(i.month, '2026-11');
});

test('saldo da conta = informado + lançamentos DEPOIS do saldo', () => {
  const t0 = new Date(2026, 10, 1, 10);
  const acc = createAccount({ bank: 'Nubank', balanceCents: 50000 }, { now: t0 });
  const antes = createExpense({ amountCents: 1000, categoryId: 'mercado', date: '2026-11-01', accountId: acc.id }, { categories: cats, now: new Date(t0 - 1000) });
  const depois = createExpense({ amountCents: 2000, categoryId: 'mercado', date: '2026-11-02', accountId: acc.id }, { categories: cats, now: new Date(+t0 + 1000) });
  const outra = createExpense({ amountCents: 9999, categoryId: 'mercado', date: '2026-11-02' }, { categories: cats, now: new Date(+t0 + 1000) });
  const ent = createIncome({ amountCents: 10000, sourceId: 'freela', date: '2026-11-03', accountId: acc.id }, { now: new Date(+t0 + 2000) });
  assert.equal(accountBalance(acc, [antes, depois, outra], [ent]), 50000 - 2000 + 10000);
  assert.equal(totalBalance([acc], [antes, depois, outra], [ent]), 58000);
});

test('parseSignedAmount aceita negativo e zero', () => {
  assert.equal(parseSignedAmount('-50'), -5000);
  assert.equal(parseSignedAmount('0'), 0);
  assert.equal(parseSignedAmount('1.200,00'), 120000);
  assert.equal(parseSignedAmount('abc'), null);
});

test('períodos', () => {
  assert.deepEqual(periodRange('semana', '2026-11-05'), { from: '2026-10-30', to: '2026-11-05', label: 'nos últimos 7 dias' });
  assert.equal(periodRange('mes_passado', '2026-01-10').month, '2025-12');
  assert.equal(forecastMonth([exp(3000, 'mercado', '2026-11-01')], '2026-11', '2026-11-10').projectedCents, 9000);
});

test('ritmo alto só projeta as categorias COM limite (gasto sem limite não conta)', () => {
  const c = withBudget('lazer', 10000);
  // Lazer: 30 em 10 dias -> 90 no mês, dentro do limite de 100. Mercado (sem limite) gastou muito.
  const list = [exp(3000, 'lazer', '2026-11-02'), exp(80000, 'mercado', '2026-11-03')];
  assert.ok(!analyze({ expenses: list, categories: c }, '2026-11-10').some(a => a.type === 'ritmo_alto'));
  const muito = [exp(6000, 'lazer', '2026-11-02')]; // 60 em 10 dias -> 180 no mês
  const a = analyze({ expenses: muito, categories: c }, '2026-11-10').find(x => x.type === 'ritmo_alto');
  assert.equal(a.projectedCents, 18000);
});

test('alertas: saindo mais do que entrando e conta negativa', () => {
  const t0 = new Date(2026, 10, 1);
  const acc = createAccount({ bank: 'Inter', balanceCents: 1000 }, { now: t0 });
  const g = createExpense({ amountCents: 5000, categoryId: 'mercado', date: '2026-11-04', accountId: acc.id }, { categories: cats, now: new Date(+t0 + 1) });
  const i = createIncome({ amountCents: 2000, sourceId: 'freela', date: '2026-11-02' }, { now: t0 });
  const tipos = analyze({ expenses: [g], incomes: [i], categories: cats, accounts: [acc] }, '2026-11-05').map(a => a.type);
  assert.ok(tipos.includes('mes_negativo'));
  assert.ok(tipos.includes('conta_negativa'));
});
