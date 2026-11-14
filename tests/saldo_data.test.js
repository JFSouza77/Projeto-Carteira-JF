// Saldo da conta (JF, 14/11): vale a DATA do lançamento, não a hora em que foi anotado.
// "O salário caiu dia 4, informei o saldo dia 13 e anotei o salário dia 14: o app somou de novo."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAccount, createIncome, createExpense, accountBalance, depoisDoSaldo, DEFAULT_CATEGORIES } from '../js/engine.js';

const mp = createAccount({ bank: 'Mercado Pago', balanceCents: 300000 }, { id: 'mp', now: new Date(2026, 10, 13, 10) }); // saldo informado em 13/11
const depois = new Date(2026, 10, 14, 9);

test('salário de antes do saldo informado, anotado depois: não soma de novo', () => {
  const salario = createIncome({ amountCents: 500000, sourceId: 'salario', date: '2026-11-04', accountId: 'mp' }, { now: depois });
  assert.equal(accountBalance(mp, [], [salario]), 300000);
});

test('gasto esquecido de antes do saldo: não desconta de novo', () => {
  const g = createExpense({ amountCents: 5000, categoryId: 'mercado', date: '2026-11-10', accountId: 'mp' }, { categories: DEFAULT_CATEGORIES, now: depois });
  assert.equal(accountBalance(mp, [g], []), 300000);
});

test('lançamento de depois do saldo conta normal', () => {
  const g = createExpense({ amountCents: 5000, categoryId: 'mercado', date: '2026-11-14', accountId: 'mp' }, { categories: DEFAULT_CATEGORIES, now: depois });
  const e = createIncome({ amountCents: 20000, sourceId: 'freela', date: '2026-11-14', accountId: 'mp' }, { now: depois });
  assert.equal(accountBalance(mp, [g], [e]), 300000 - 5000 + 20000);
});

test('no mesmo dia do saldo, vale a ordem em que foi anotado', () => {
  assert.equal(depoisDoSaldo({ date: '2026-11-13', createdAt: new Date(2026, 10, 13, 9).getTime() }, mp), false);
  assert.equal(depoisDoSaldo({ date: '2026-11-13', createdAt: new Date(2026, 10, 13, 11).getTime() }, mp), true);
});
