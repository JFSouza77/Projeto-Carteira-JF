// 2.3.6.14 (JF, 25/11: "ele considera déficit gastar mais do que recebeu; faz sentido, mas eu tenho dinheiro guardado em
// outras contas. Não é tão preto no branco"): quando o mês não fecha, ele olha também o que está nas contas
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { entender } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES, createAccount, createIncome, createExpense } from '../js/engine.js';

const now = Date.UTC(2026, 10, 25, 15);
const dados = saldo => ({
  expenses: [createExpense({ amountCents: 289916, categoryId: 'moradia', date: '2026-11-10' })],
  incomes: [createIncome({ amountCents: 255000, sourceId: 'salario', date: '2026-11-05' })],
  accounts: [createAccount({ bank: 'Nubank', balanceCents: saldo }, { now: new Date(2026, 10, 1) })],
  categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [], planos: [],
});

test('mês no vermelho mas com dinheiro guardado: avisa e diz que dá, saindo do guardado', () => {
  const t = conversar('posso gastar 300?', dados(1074861), { now }).fala.texto;
  assert.match(t, /olhando o todo/);
  assert.match(t, /dá pra cobrir sem dívida/);
  assert.doesNotMatch(t, /esperar o próximo mês/);
  assert.match(conversar('cabe no mês?', dados(1074861), { now }).fala.texto, /olhando o todo/);
});

test('mês no vermelho e pouco guardado: segura mesmo', () => {
  assert.match(conversar('cabe no mês?', dados(20000), { now }).fala.texto, /segurar mesmo/);
});

test('"posso gastar 300?" e "dá pra gastar 300?" são pergunta, não gasto', () => {
  for (const f of ['posso gastar 300?', 'dá pra gastar 300?', 'cabe 300 esse mês?']) assert.equal(entender(f, { categories: [] }).intent, 'cabe', f);
  assert.equal(entender('gastei 300', { categories: [] }).intent, 'registrar_gasto');
});
