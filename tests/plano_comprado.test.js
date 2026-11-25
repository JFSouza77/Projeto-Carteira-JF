// 2.3.6.5 (JF, 24/11: "comprei minha geladeira" estava nos planos do mês com teto de R$ 2.500 e o C.A.O.S. só perguntou
// "Quanto foi o gasto em Moradia?"): compra que bate com um plano ainda não feito é reconhecida
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const now = Date.UTC(2026, 10, 24, 15);
const base = () => ({ expenses: [], incomes: [], accounts: [], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [],
  planos: [{ id: 'p1', nome: 'Geladeira', valorCents: 250000, categoryId: 'moradia', month: '2026-11', feito: false }] });

test('"comprei minha geladeira" sem valor: comemora o plano e propõe o teto', () => {
  const r = conversar('Comprei minha geladeira', base(), { now });
  assert.match(r.fala.texto, /geladeira que estava nos seus planos/);
  assert.match(r.fala.texto, /2\.500,00/);
  assert.equal(r.fala.acao?.amountCents, 250000);
  assert.equal(r.fala.acao?.planoId, 'p1');
  assert.equal(r.fala.acao?.categoryId, 'moradia');
});

test('com valor: liga ao plano e compara com o teto', () => {
  const r = conversar('comprei a geladeira por 2300', base(), { now });
  assert.equal(r.fala.acao?.planoId, 'p1');
  assert.equal(r.fala.acao?.amountCents, 230000);
  assert.match(r.fala.texto, /200,00 abaixo do teto/);
});

test('plano já feito ou sem relação não atrapalha', () => {
  const d = base(); d.planos[0].feito = true;
  assert.equal(conversar('comprei minha geladeira', d, { now }).fala.acao?.planoId, undefined);
  assert.equal(conversar('comprei pão por 10', base(), { now }).fala.acao?.planoId, undefined);
});

test('"foi 2300" depois da pergunta continua ligado ao plano', () => {
  const d = base();
  const r1 = conversar('Comprei minha geladeira', d, { now });
  const r2 = conversar('foi 2300', d, { now, memory: r1.memoria });
  assert.equal(r2.fala.acao?.amountCents, 230000);
  assert.equal(r2.fala.acao?.planoId, 'p1');
});

// 2.3.6.7 (JF, 25/11): plano de outro mês, meta ou "plano que se repete" também contam
test('geladeira planejada pra dezembro, numa meta ou em plano que se repete', () => {
  const sem = { ...base(), planos: [] };
  const dez = { ...base(), planos: [{ ...base().planos[0], month: '2026-12' }] };
  assert.equal(conversar('Finalmente comprei minha geladeira', dez, { now }).fala.acao?.planoId, 'p1');
  const meta = { ...sem, metas: [{ id: 'm1', nome: 'Geladeira nova', alvoCents: 250000, guardadoCents: 0, conquistadaEm: null }] };
  const r = conversar('Finalmente comprei minha geladeira', meta, { now }).fala;
  assert.match(r.texto, /nos seus planos/);
  assert.equal(r.acao?.amountCents, 250000);
  assert.equal(r.acao?.planoId, undefined);
  const comp = { ...sem, compromissos: [{ id: 'c1', nome: 'Geladeira', tipo: 'plano', valorCents: 250000, categoryId: 'moradia' }] };
  assert.equal(conversar('comprei minha geladeira', comp, { now }).fala.acao?.amountCents, 250000);
});
