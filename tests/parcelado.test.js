// P8 (vistoria do JF, 12/11): como pagou e parcelado no cartão. Dados inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CATEGORIES, createExpense, createCartao, faturaDoCartao, parcelasDe, validarBackup } from '../js/engine.js';

const cats = DEFAULT_CATEGORIES.map(c => ({ ...c }));
const cartao = createCartao({ bank: 'Banco Teste', limiteCents: 100000, fechamentoDia: 5, vencimentoDia: 12 }, { now: new Date(2026, 9, 1) });
const compra = (modo, parcelas = 4) => createExpense({ amountCents: 10000, categoryId: 'compras', date: '2026-11-08', accountId: cartao.id,
  forma: 'credito', parcelas, limiteModo: modo }, { categories: cats });

test('parcelas dividem o valor e a 1ª leva o centavo que sobra', () => {
  const p = parcelasDe(createExpense({ amountCents: 1000, categoryId: 'compras', date: '2026-01-31', forma: 'credito', parcelas: 3 }, { categories: cats }));
  assert.deepEqual(p.map(x => x.valorCents), [334, 333, 333]);
  assert.deepEqual(p.map(x => x.date), ['2026-01-31', '2026-02-28', '2026-03-31']);
});

test('R$ 100 em 4x "no limite": prende os R$ 100, a fatura só tem R$ 25', () => {
  const f = faturaDoCartao(cartao, [compra('total')], '2026-11-10');
  assert.equal(f.abertaCents, 2500);
  assert.equal(f.usadoCents, 10000);
  assert.equal(f.disponivelCents, 90000);
});

test('R$ 100 em 4x "dividido": só a parcela ocupa o limite', () => {
  const f = faturaDoCartao(cartao, [compra('parcela')], '2026-11-10');
  assert.equal(f.abertaCents, 2500);
  assert.equal(f.usadoCents, 2500);
  assert.equal(f.futurasCents, 7500);
});

test('mês seguinte: a parcela 1 fechou e a 2 abriu', () => {
  const f = faturaDoCartao(cartao, [compra('parcela')], '2026-12-08');
  assert.equal(f.fechadaCents, 2500);
  assert.equal(f.abertaCents, 2500);
});

test('parcelar só no crédito', () => {
  assert.throws(() => createExpense({ amountCents: 1000, categoryId: 'compras', forma: 'pix', parcelas: 2 }, { categories: cats }), /crédito/);
});

test('backup aceita gasto com forma e parcelas', () => {
  const r = validarBackup({ app: 'carteira-jf', version: 1, categories: cats, expenses: [compra('total')], accounts: [cartao] });
  assert.ok(r.ok, r.erros?.join(' '));
});

// ---- conversa (C.A.O.S. 1.15.0) ----
import { conversar } from '../js/caos/index.js';
import { createAccount } from '../js/engine.js';

const NOW = new Date(2026, 10, 12, 12).getTime();
const cart2 = createCartao({ bank: 'Outro Teste', limiteCents: 50000, fechamentoDia: 5, vencimentoDia: 12 });
const dadosConv = (accounts) => ({ expenses: [], incomes: [], categories: cats, accounts, compromissos: [], planos: [] });
const papo = (frases, d) => {
  let memory; let ultima;
  for (const f of frases) { const r = conversar(f, d, { memory, now: NOW, today: '2026-11-12' }); memory = r.memoria; ultima = r.fala; }
  return ultima;
};

test('conversa pergunta como pagou, na ordem, e monta o parcelado', () => {
  const d = dadosConv([cartao, cart2, createAccount({ bank: 'Banco Teste', balanceCents: 1000 })]);
  assert.match(papo(['gastei 100 na loja'], d).texto, /Pagou como/);
  assert.match(papo(['gastei 100 na loja', 'cartão'], d).texto, /crédito ou de débito/);
  assert.match(papo(['gastei 100 na loja', 'cartão', 'crédito'], d).texto, /À vista ou parcelado/);
  assert.match(papo(['gastei 100 na loja', 'crédito', '4x'], d).texto, /prende o valor todo/);
  assert.match(papo(['gastei 100 na loja', 'crédito', '4x', 'só a parcela'], d).texto, /Qual cartão/);
  const fim = papo(['gastei 100 na loja', 'crédito', '4x', 'só a parcela', 'Outro Teste · Cartão'], d);
  assert.deepEqual([fim.acao.forma, fim.acao.parcelas, fim.acao.limiteModo, fim.acao.accountId], ['credito', 4, 'parcela', cart2.id]);
});

test('pula o que a pessoa já disse e não pergunta nada sem conta cadastrada', () => {
  const d = dadosConv([cartao]);
  const r = papo(['comprei 300 de roupa no banco teste em 3x', 'não sei'], d);
  assert.deepEqual([r.acao.forma, r.acao.parcelas, r.acao.limiteModo, r.acao.accountId, r.acao.note], ['credito', 3, 'total', cartao.id, 'Roupa']);
  const sem = papo(['gastei 30 no mercado'], dadosConv([]));
  assert.equal(sem.acao?.tipo, 'registrar_gasto');
});

test('"cancela" no meio das perguntas não anota nada', () => {
  const r = papo(['gastei 20 no uber', 'cancela'], dadosConv([cartao]));
  assert.equal(r.acao, null);
});
