// JF, 16/11: "zerar os valores dos bancos sem apagar os bancos" (Recomeçar, em Ajustes)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zerarSaldos, createAccount, createCartao, createExpense, accountBalance, faturaDoCartao, DEFAULT_CATEGORIES } from '../js/engine.js';

test('zerar saldos: conta vai a 0 a partir de agora, cartão volta a 0 de já usado; o resto continua', () => {
  const antes = new Date('2026-11-01T10:00:00');
  const conta = { ...createAccount({ bank: 'Inter', nickname: 'principal', balanceCents: 50000 }, { now: antes, id: 'c1' }), pisoCents: 10000 };
  const cartao = createCartao({ bank: 'Nubank', limiteCents: 200000, fechamentoDia: 5, vencimentoDia: 12, usadoCents: 30000 }, { now: antes, id: 'k1' });
  const gasto = createExpense({ amountCents: 4000, categoryId: 'mercado', date: '2026-11-10', accountId: 'c1' }, { categories: DEFAULT_CATEGORIES, id: 'g1', now: new Date('2026-11-10T12:00:00') });
  assert.equal(accountBalance(conta, [gasto], []), 46000);
  const agora = new Date('2026-11-16T12:00:00');
  const [c, k] = zerarSaldos([conta, cartao], { now: agora });
  assert.equal(c.balanceCents, 0);
  assert.equal(accountBalance(c, [gasto], []), 0, 'gasto de antes não conta mais');
  assert.equal(c.pisoCents, 10000);
  assert.equal(c.nickname, 'principal');
  assert.equal(k.usadoInicialCents, 0);
  assert.equal(k.limiteCents, 200000);
  assert.equal(faturaDoCartao(k, [], '2026-11-16').usadoCents, 0);
  assert.equal(conta.balanceCents, 50000, 'não mexe no original');
});
