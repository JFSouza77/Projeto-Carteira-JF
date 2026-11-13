// Achados do debug do GPT (12/11). Dados inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CATEGORIES, createCartao, createExpense, createCompromisso, analyze } from '../js/engine.js';
import { conversar } from '../js/caos/index.js';

const cats = DEFAULT_CATEGORIES;
const cartao = createCartao({ bank: 'Banco Teste', limiteCents: 100000, fechamentoDia: 5, vencimentoDia: 12 }, { now: new Date(2026, 9, 1), id: 'cart-1' });
const compra = createExpense({ amountCents: 30000, categoryId: 'compras', date: '2026-10-20', accountId: 'cart-1', forma: 'credito' }, { categories: cats });
const dados = (extra = {}) => ({ expenses: [compra], incomes: [], categories: cats, accounts: [cartao], compromissos: [], planos: [], ...extra });
const NOW = new Date(2026, 10, 13, 12).getTime();

test('"o que tenho pra pagar?" inclui a fatura do cartão, mesmo sem compromisso cadastrado', () => {
  const r = conversar('o que tenho pra pagar?', dados(), { now: NOW, today: '2026-11-13' });
  assert.match(r.fala.texto, /fatura do Banco Teste/);
  assert.match(r.fala.texto, /300,00/);
  assert.match(r.fala.texto, /venceu dia 12\/11/);
  assert.equal(r.fala.acao, null); // fatura não vira gasto (as compras já foram lançadas)
});

test('fatura cadastrada como compromisso não conta duas vezes', () => {
  const comp = createCompromisso({ nome: 'Fatura Banco Teste', valorCents: 30000, tipo: 'fatura', dia: 12, categoryId: 'contas', accountId: 'cart-1' }, { categories: cats, now: new Date(2026, 10, 1) });
  const r = conversar('o que tenho pra pagar?', dados({ compromissos: [comp] }), { now: NOW, today: '2026-11-13' });
  assert.doesNotMatch(r.fala.texto, /fatura do Banco Teste/);
  assert.match(r.fala.texto, /Fatura Banco Teste/);
});

test('fatura vencida e não marcada como paga vira alerta de atraso', () => {
  const al = analyze(dados(), '2026-11-13').find(a => a.type === 'compromisso_atrasado');
  assert.equal(al?.nome, 'Fatura do Banco Teste · Cartão');
  assert.equal(al.valorCents, 30000);
  const pago = analyze(dados({ accounts: [{ ...cartao, faturaPagaAte: '2026-11-05' }] }), '2026-11-13');
  assert.ok(!pago.some(a => a.type === 'compromisso_atrasado'));
});

// ---- Achados do Gemini (12/11) ----
import { lerParcelamento, dataDoTexto } from '../js/caos/conversa.js';
import { createAccount } from '../js/engine.js';

test('descrição guarda número que não é parcela ("no 99", "padaria 2 irmãos")', () => {
  const d = { expenses: [], incomes: [], categories: cats, accounts: [], compromissos: [], planos: [] };
  assert.equal(conversar('gastei 30 no 99', d, { now: NOW, today: '2026-11-13' }).fala.acao.note, '99');
  assert.match(conversar('gastei 45 na padaria 2 irmaos', d, { now: NOW, today: '2026-11-13' }).fala.acao.note, /2 irmaos/i);
});

test('parcelamento com "vezes de R$" e milhar não troca parcela por preço à vista', () => {
  assert.deepEqual(lerParcelamento('parcelar em 10 vezes de r$ 330 um celular de 3000'), { vista: 300000, n: 10, parcela: 33000 });
  assert.deepEqual(lerParcelamento('3.000 a vista ou em 12 vezes de 1.200,50'), { vista: 300000, n: 12, parcela: 120050 });
});

test('"dia 31" num mês de 30 dias vira o último dia, não hoje', () => {
  assert.equal(dataDoTexto('gastei 50 dia 31', '2026-05-10'), '2026-04-30');
});

test('"recebi 1500 de salário no nubank" cai na conta do Nubank', () => {
  const nu = createAccount({ bank: 'Nubank', balanceCents: 0 }, { id: 'nu-1' });
  const d = { expenses: [], incomes: [], categories: cats, accounts: [nu, cartao], compromissos: [], planos: [] };
  assert.equal(conversar('recebi 1500 de salario no nubank', d, { now: NOW, today: '2026-11-13' }).fala.acao.accountId, 'nu-1');
});

// ---- Parte 2 do Gemini (12/11) ----
import { faturaDoCartao } from '../js/engine.js';

test('fatura não paga não some quando passa mais um fechamento (desde o último "Paguei")', () => {
  const nov = createExpense({ amountCents: 10000, categoryId: 'compras', date: '2026-11-20', accountId: 'cart-1', forma: 'credito' }, { categories: cats });
  const c = { ...cartao, faturaPagaAte: '2026-10-05' };
  const f = faturaDoCartao(c, [compra, nov], '2026-12-08'); // fechou 05/11 (300) e 05/12 (100): nada marcado como pago
  assert.equal(f.fechadaCents, 40000);
  assert.equal(f.atrasada, true);
  const pago = faturaDoCartao({ ...cartao, faturaPagaAte: f.ultimoFechamento }, [compra, nov], '2026-12-08');
  assert.equal(pago.fechadaCents, 0);
});
