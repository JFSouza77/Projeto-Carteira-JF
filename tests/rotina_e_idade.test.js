// 2.3.3 (JF, 17/11): me pagaram / vaquinha, jeitos de poupar e o app que se ajusta à idade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES, faixaEtaria } from '../js/engine.js';

const d = { categories: DEFAULT_CATEGORIES, expenses: [], incomes: [{ id: 'i', date: '2026-11-05', amountCents: 200000, sourceId: 'salario' }], accounts: [], compromissos: [], planos: [], metas: [] };
const now = Date.UTC(2026, 10, 17, 15);
const papo = (frases, perfil = { apelido: 'Ana', aniversario: '1990-01-01' }) => {
  let memory = null;
  return frases.map(f => { const r = conversar(f, d, { memory, now, perfil }); memory = r.memoria; return r.fala; });
};

test('comi fora mas pagaram pra mim: oferece dia sem gasto e conhece a rotina', () => {
  const [a, b, c] = papo(['me chamaram pra almoçar e pagaram tudo pra mim', 'fui comer pizza com a galera e eles pagaram pra mim', 'ontem almocei com meus pais e não paguei nada']);
  assert.equal(a.intent, 'pagaram_pra_mim');
  assert.deepEqual(a.acao, { tipo: 'dia_sem_gasto', date: '2026-11-17' });
  assert.match(b.texto, /Amigo bom/);
  assert.equal(c.acao.date, '2026-11-16');
  assert.match(c.texto, /3ª vez este mês/);
  assert.equal(papo(['o João me pagou os 30'])[0].intent, 'racha_pago');
});

test('vaquinha: pergunta a parte e anota só a parte', () => {
  const [a, b] = papo(['fizemos uma vaquinha pro presente da Bia', 'minha parte na vaquinha foi 40']);
  assert.equal(a.intent, 'vaquinha_parte');
  assert.equal(b.acao.amountCents, 4000);
  assert.equal(b.acao.note, 'Vaquinha (minha parte)');
});

test('jeitos de poupar: adulto com a conta da entrada; criança com os 3 cofrinhos', () => {
  const a = papo(['quais os métodos de poupar dinheiro?'])[0];
  assert.equal(a.intent, 'metodos_poupar');
  assert.match(a.texto, /50\/30\/20/);
  assert.match(a.texto, /R\$\s400,00 pra guardar/);
  const k = papo(['como faço pra começar a guardar dinheiro'], { apelido: 'Bia', aniversario: '2016-05-05' })[0];
  assert.match(k.texto, /3 cofrinhos/);
});

test('faixas de idade: maduro (50 a 59) e senior (60+)', () => {
  assert.equal(faixaEtaria(49), 'adulto');
  assert.equal(faixaEtaria(55), 'maduro');
  assert.equal(faixaEtaria(65), 'senior');
});
