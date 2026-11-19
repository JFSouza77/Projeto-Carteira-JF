// 2.3.5.7 (JF, 19/11, pela Dona Débora, que recebe a aposentadoria do marido): entradas de 13º, FGTS, aposentadoria
// e pensão, INSS, auxílios e benefícios, férias e PLR; pensão paga é conta do mês. "13º" nunca vira R$ 13.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES, INCOME_SOURCES, createIncome } from '../js/engine.js';

const d = { expenses: [], incomes: [], accounts: [], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [] };
const now = Date.UTC(2026, 10, 19, 15);
const acao = f => conversar(f, d, { now }).fala.acao || {};

test('fontes de entrada novas (10, regra do 0 ou 5)', () => {
  assert.equal(INCOME_SOURCES.length % 5, 0);
  for (const id of ['aposentadoria', 'beneficio', 'decimo', 'ferias', 'fgts']) {
    assert.ok(INCOME_SOURCES.some(s => s.id === id), id);
    assert.equal(createIncome({ amountCents: 1000, sourceId: id, date: '2026-11-19' }).sourceId, id);
  }
});

test('o Chat entende de onde veio, com o valor certo', () => {
  const casos = [
    ['recebi meu 13º de 2500', 'decimo', 250000], ['recebi a primeira parcela do 13 1200', 'decimo', 120000],
    ['recebi meu FGTS 3000', 'fgts', 300000], ['recebi a aposentadoria do meu marido 2100', 'aposentadoria', 210000],
    ['recebi a pensão 900', 'aposentadoria', 90000], ['recebi o INSS 1500', 'aposentadoria', 150000],
    ['recebi o auxílio transporte 200', 'beneficio', 20000], ['caiu o bolsa família 600', 'beneficio', 60000],
    ['recebi as férias 3500', 'ferias', 350000], ['recebi a PLR 2000', 'ferias', 200000],
    ['recebi o salário 3000', 'salario', 300000],
  ];
  for (const [f, fonte, v] of casos) {
    const a = acao(f);
    assert.equal(a.tipo, 'registrar_entrada', f);
    assert.equal(a.sourceId, fonte, f);
    assert.equal(a.amountCents, v, f);
    assert.ok(!/\d/.test(a.note || ''), `nota sem número: ${a.note}`);
  }
  assert.equal(acao('vou receber o 13º dia 20 2500').amountCents, 250000);
  assert.equal(acao('gastei 13 no mercado').amountCents, 1300);
});

test('pensão paga vai pra Contas', () => {
  const a = acao('paguei 600 de pensão alimentícia');
  assert.equal(a.tipo, 'registrar_gasto');
  assert.equal(a.categoryId, 'contas');
});
