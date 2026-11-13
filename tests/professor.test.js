// Professor de finanças (C.A.O.S. 1.20.0, 13/11): glossário offline, explicação em camadas, calculadoras. Dados inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARIO, acharTermo } from '../js/caos/glossario.js';
import { lerCalculoJuros, calcularJuros, lerParcelamento } from '../js/caos/conversa.js';
import { conversar } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const d = { expenses: [], incomes: [], categories: DEFAULT_CATEGORIES, accounts: [], compromissos: [], planos: [] };
const NOW = new Date(2026, 10, 13, 12).getTime();
const papo = (frases, perfil = null) => {
  let memory; let f;
  for (const q of frases) { const r = conversar(q, d, { memory, now: NOW, today: '2026-11-13', perfil }); memory = r.memoria; f = r.fala; }
  return f;
};

test('glossário: 60 termos (0 ou 5), cada um com adulto, criança e camada a mais; sem recomendar produto', () => {
  assert.equal(GLOSSARIO.length % 5, 0);
  assert.ok(GLOSSARIO.length >= 60);
  const nomes = new Set();
  for (const g of GLOSSARIO) {
    assert.ok(g.adulto && g.crianca && g.mais && g.chaves.length, g.termo);
    assert.ok(!nomes.has(g.termo), `repetido: ${g.termo}`); nomes.add(g.termo);
    assert.doesNotMatch(`${g.adulto} ${g.mais}`, /(?<!não )\b(recomendo|compre|invista em)\b/i, g.termo);
  }
});

test('acha o termo mais específico e não confunde palavra comum', () => {
  assert.equal(acharTermo('o que é juros compostos')?.termo, 'Juros compostos');
  assert.equal(acharTermo('o que é juros')?.termo, 'Juros');
  assert.equal(acharTermo('vou ir no mercado'), null);
});

test('explica em camadas e com contexto ("meu pai falou de…"); regra de governo vem com data', () => {
  const a = papo(['o que é juros compostos?']);
  assert.match(a.texto, /juros sobre juros/i);
  const b = papo(['o que é juros compostos?', 'me explica melhor']);
  assert.match(b.texto, /1\.126,83/);
  const c = papo(['meu pai falou de selic']);
  assert.match(c.texto, /seu pai falou de selic/i);
  assert.match(c.texto, /novembro de 2026/);
});

test('criança recebe a explicação simples', () => {
  const f = papo(['o que é juros?'], { apelido: 'Bia', aniversario: '2017-03-01' });
  assert.match(f.texto, /aluguel do dinheiro/);
});

test('calculadora de juros: simples, composto, taxa ao ano', () => {
  const c = lerCalculoJuros('juros compostos de 1000 a 1 porcento ao mes por 12 meses');
  assert.equal(calcularJuros(c).finalCents, 112683);
  const s = lerCalculoJuros('juros simples de 2000 a 2 porcento por 6 meses');
  assert.equal(calcularJuros(s).finalCents, 224000);
  const a = lerCalculoJuros('quanto rende 5000 a 12 porcento ao ano por 2 anos');
  assert.equal(calcularJuros(a).finalCents, 627200);
  assert.match(papo(['juros compostos de 1000 a 1% ao mês por 12 meses']).texto, /1\.126,83/);
});

test('vale a pena parcelar: mostra o juro escondido e explica sem números', () => {
  assert.deepEqual(lerParcelamento('3000 a vista ou 10x de 330'), { vista: 300000, n: 10, parcela: 33000 });
  assert.match(papo(['3000 a vista ou 10x de 330, vale a pena parcelar?']).texto, /300,00 a mais/);
  assert.match(papo(['vale a pena parcelar?']).texto, /Coxinha/);
});

test('registro com porcentagem não quebra', () => {
  assert.equal(papo(['gastei 30 no mercado']).acao.amountCents, 3000);
});
