// Cartão de crédito (06/11). Valores inventados (ex.: cartão com limite de R$ 100, como o do pedido do JF).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CATEGORIES, createCartao, createAccount, createExpense, faturaDoCartao, totalBalance, analyze, validarBackup } from '../js/engine.js';
import { conversar, reagir } from '../js/caos/index.js';
import { entender } from '../js/caos/conversa.js';

const cats = DEFAULT_CATEGORIES.map(c => ({ ...c }));
const cadastro = new Date(2026, 9, 1, 12); // 01/10
const cartao = createCartao({ bank: 'PicPay', limiteCents: 10000, fechamentoDia: 25, vencimentoDia: 5, usadoCents: 1000 }, { now: cadastro, id: 'cartao-1' });
const g = (v, d, accountId = 'cartao-1') => createExpense({ amountCents: v, categoryId: 'lazer', date: d, accountId }, { categories: cats });

test('cria cartão e valida', () => {
  assert.equal(cartao.tipo, 'cartao');
  assert.throws(() => createCartao({ bank: 'PicPay', limiteCents: 0, fechamentoDia: 25, vencimentoDia: 5 }), /limite/);
  assert.throws(() => createCartao({ bank: 'PicPay', limiteCents: 100, fechamentoDia: 32, vencimentoDia: 5 }), /fechamento/);
});

test('fatura aberta, fechada, limite usado e datas', () => {
  const gastos = [g(2000, '2026-10-10'), g(3000, '2026-10-26'), g(1500, '2026-11-02'), g(999, '2026-11-02', 'outra-conta')];
  // hoje 02/11: fechou 25/10 (fatura de 01/10 a 25/10 = 1000 do cadastro + 2000), aberta desde 26/10 = 3000 + 1500
  const f = faturaDoCartao(cartao, gastos, '2026-11-02');
  assert.equal(f.ultimoFechamento, '2026-10-25');
  assert.equal(f.fechamento, '2026-11-25');
  assert.equal(f.vencimento, '2026-11-05');
  assert.equal(f.fechadaCents, 3000);
  assert.equal(f.abertaCents, 4500);
  assert.equal(f.usadoCents, 7500);
  assert.equal(f.pct, 75);
  assert.equal(f.disponivelCents, 2500);
  assert.equal(f.diasParaVencer, 3);
  // depois do vencimento, a fechada sai do limite usado
  const depois = faturaDoCartao(cartao, gastos, '2026-11-06');
  assert.equal(depois.fechadaCents, 0);
  assert.equal(depois.usadoCents, 4500);
});

test('fechamento dia 31 em fevereiro vira o último dia', () => {
  const c = createCartao({ bank: 'Nubank', limiteCents: 50000, fechamentoDia: 31, vencimentoDia: 10 }, { now: new Date(2027, 0, 1), id: 'c31' });
  const f = faturaDoCartao(c, [], '2027-02-15');
  assert.equal(f.fechamento, '2027-02-28');
});

test('cartão não entra no saldo guardado e gera avisos de limite e vencimento', () => {
  const conta = createAccount({ bank: 'Nubank', balanceCents: 50000 }, { id: 'conta-1' });
  assert.equal(totalBalance([conta, cartao], [], []), 50000);
  const gastos = [g(2000, '2026-10-10'), g(3000, '2026-10-26'), g(4500, '2026-11-02')];
  const al = analyze({ expenses: gastos, categories: cats, accounts: [conta, cartao], incomes: [] }, '2026-11-03');
  assert.ok(al.some(a => a.type === 'cartao_limite' && a.pct >= 100));
  assert.ok(al.some(a => a.type === 'cartao_vence' && a.days === 2 && a.amountCents === 3000));
  assert.ok(!al.some(a => a.type === 'conta_negativa'));
  for (const a of al.filter(x => x.type.startsWith('cartao'))) {
    const r = reagir([a], { now: new Date(2026, 10, 3, 10).getTime() });
    assert.ok(r.fala && !/\{\w+\}/.test(r.fala.texto), r.fala?.texto);
    assert.match(r.fala.texto, /PicPay/);
  }
});

test('conversa: "como está meu cartão?" e "quanto vem na fatura?"', () => {
  assert.equal(entender('como está meu cartão?', { categories: cats }).intent, 'cartao');
  assert.equal(entender('quanto vem na fatura?', { categories: cats }).intent, 'cartao');
  assert.equal(entender('como cadastro meu cartão?', { categories: cats }).intent, 'tutorial');
  const d = { expenses: [g(2000, '2026-10-10')], incomes: [], categories: cats, accounts: [cartao], compromissos: [], planos: [] };
  const r = conversar('como está meu cartão?', d, { now: new Date(2026, 9, 12, 10).getTime(), today: '2026-10-12' });
  assert.match(r.fala.texto, /PicPay/);
  assert.match(r.fala.texto, /30,00 de R\$ 100,00/);
});

test('backup com cartão passa; cartão estragado é recusado', () => {
  const b = { app: 'carteira-jf', categories: cats, expenses: [], accounts: [{ ...cartao }] };
  assert.equal(validarBackup(b).ok, true);
  assert.equal(validarBackup({ ...b, accounts: [{ ...cartao, fechamentoDia: 40 }] }).ok, false);
  assert.equal(validarBackup({ ...b, accounts: [{ ...cartao, tipo: 'hack' }] }).ok, false);
});
