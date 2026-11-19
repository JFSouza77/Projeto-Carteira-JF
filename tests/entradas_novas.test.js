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

// 2.3.5.8 (JF): auxílio sem dizer qual → ele pergunta; o tipo vira a descrição. Glossário com os termos de renda.
test('"recebi o auxílio 300" pergunta qual, e a resposta vira a descrição', () => {
  let r = conversar('recebi o auxílio 300', d, { now });
  assert.match(r.fala.texto, /Qual é/);
  assert.ok(!r.fala.acao, 'não propõe antes de saber qual');
  r = conversar('Transporte', d, { now, memory: r.memoria });
  assert.equal(r.fala.acao?.sourceId, 'beneficio');
  assert.equal(r.fala.acao?.note, 'Auxílio transporte');
  assert.equal(r.fala.acao?.amountCents, 30000);
  assert.equal(acao('recebi o vale refeição 600').note, 'Vale-refeição');
  assert.equal(acao('caiu o bolsa família 600').note, 'Bolsa Família');
  assert.equal(acao('recebi o bônus de aniversário da empresa 300').sourceId, 'ferias');
});

test('glossário: freela, PLR, pensão, aposentadoria, saque-aniversário, Banco Pan, vales e auxílio-moradia', () => {
  for (const f of ['o que é PLR?', 'o que é saque aniversário?', 'o que é o banco pan?', 'o que é freela?', 'o que é pensão alimentícia?',
    'o que é aposentadoria?', 'o que é vale refeição?', 'o que é auxílio moradia?', 'o que é pensão por morte?', 'o que é vale transporte?']) {
    assert.equal(conversar(f, d, { now }).fala.intent, 'glossario', f);
  }
});
