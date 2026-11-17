// 17/11 (JF): "análise de preço de gasolina, se vai subir ou descer, se estou pagando caro"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { entender } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES as C } from '../js/engine.js';

const d = { expenses: [], incomes: [], accounts: [], categories: C, compromissos: [], planos: [], metas: [] };
const intent = f => entender(f, { categories: C }).intent;

test('pergunta de preço e de rumo vai pra IA pesquisar; anotar e economizar continuam como eram', () => {
  for (const f of ['como tá o petróleo?', 'a gasolina vai subir?', 'tem previsão de aumento da gasolina?', 'qual o preço da gasolina em vitória?', 'etanol ou gasolina?']) assert.equal(intent(f), 'combustivel', f);
  const r = conversar('paguei 6,29 no litro da gasolina, tá caro?', d, { today: '2026-11-17' }).fala;
  assert.equal(r.modoIA, 'pesquisa');
  assert.match(r.perguntaIA, /R\$\s6,29 o litro/);
  assert.equal(r.acao, null, 'não anota gasto');
  assert.equal(intent('abasteci 200 reais no posto'), 'registrar_gasto');
  assert.equal(intent('gastei 150 de gasolina'), 'registrar_gasto');
  assert.equal(intent('quanto gastei de gasolina?'), 'gasto_total');
  assert.equal(intent('gasto muito com gasolina'), 'pesquisa_compra');
});

test('etanol ou gasolina com os dois preços: a conta dos 70% sai aqui, sem IA', () => {
  const r = conversar('etanol 4,10 gasolina 6,20, qual compensa?', d, { today: '2026-11-17' }).fala;
  assert.ok(r.entendeu);
  assert.match(r.texto, /66%/);
  assert.match(r.texto, /etanol compensa/);
  assert.match(conversar('alcool 4,90 e gasolina 6,00', d, { today: '2026-11-17' }).fala.texto, /gasolina compensa/);
});
