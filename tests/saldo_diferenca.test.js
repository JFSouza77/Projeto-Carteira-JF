// Atualizou o saldo e não bate com o anotado (JF, 15/11): o C.A.O.S. avisa gasto ou entrada que ficou sem anotar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reagir } from '../js/caos/index.js';
import { diferencaDoSaldo, createAccount, createExpense, accountBalance } from '../js/engine.js';

test('diferença: menor = gasto sem anotar, maior = entrada, menos de R$ 1 não conta', () => {
  assert.deepEqual(diferencaDoSaldo(100000, 92000), { tipo: 'saldo_sem_gasto', valorCents: 8000 });
  assert.deepEqual(diferencaDoSaldo(100000, 105000), { tipo: 'saldo_sem_entrada', valorCents: 5000 });
  assert.equal(diferencaDoSaldo(100000, 99950), null);
});

test('o C.A.O.S. fala da diferença com a conta e o valor', () => {
  const { fala } = reagir([{ type: 'saldo_sem_gasto', accountName: 'C6 Bank', valorCents: 8000 }], { mood: 'suave', memory: {}, now: Date.UTC(2026, 10, 15, 12) });
  assert.match(fala.texto, /C6 Bank/);
  assert.match(fala.texto, /R\$\s80,00/);
});

test('gasto anotado antes do saldo novo fica dentro dele (não conta duas vezes)', () => {
  const t = new Date(2026, 10, 15, 10);
  const conta = createAccount({ bank: 'C6 Bank', balanceCents: 100000 }, { id: 'c6', now: new Date(2026, 10, 1) });
  const e = createExpense({ amountCents: 8000, categoryId: 'outros', date: '2026-11-15', accountId: 'c6' }, { now: t });
  const nova = { ...conta, balanceCents: 92000, balanceAt: t.getTime() };
  assert.equal(accountBalance(nova, [e], []), 92000);
});
