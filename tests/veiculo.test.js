// 2.3.5.4 (JF, 17/11): carro e moto viram pesquisa guiada (média, com a Tabela FIPE de referência) e curiosidade de
// recorde ("o carro mais caro do mundo") é respondida brincando, sem gastar IA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { entender, PASSOS_PESQUISA, CURIOSIDADE_RESPOSTAS, CAMINHO_PLANO } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const d = { expenses: [], incomes: [], accounts: [], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [] };
const now = Date.UTC(2026, 10, 17, 15);
const ent = t => entender(t, { categories: DEFAULT_CATEGORIES });

test('comprar ou trocar carro e moto abre o questionário de veículo', () => {
  for (const f of ['quero comprar um carro', 'quero trocar de carro', 'quero trocar de moto', 'quero comprar uma moto', 'quanto custa um onix 2020 usado', 'qual o melhor carro pra comprar']) {
    const r = ent(f);
    assert.equal(r.intent, 'pesquisa_compra', f);
    assert.equal(r.tipo, 'veiculo', f);
  }
  assert.equal(PASSOS_PESQUISA.veiculo.length % 5, 0);
  assert.match(CAMINHO_PLANO.veiculo, /FIPE/);
  const r = ent('quanto custa um onix 2020 usado');
  assert.equal(r.respostas.tipo, 'Carro usado');
  assert.equal(r.respostas.modelo, 'onix 2020');
});

test('custo de quem já tem o veículo e gasto anotado não viram compra', () => {
  assert.equal(ent('quanto custa o seguro do carro').intent, 'custo_medio');
  assert.equal(ent('gastei 200 de gasolina no carro').intent, 'registrar_gasto');
  assert.equal(ent('gasto muito com gasolina no carro').tipo, 'transporte');
});

test('pesquisa de veículo é média, não pesada (até carro usado)', () => {
  let r = conversar('quero comprar um carro usado', d, { now });
  assert.match(r.fala.texto, /carro ou moto|modelo/i, r.fala.texto);
  let mem = r.memoria;
  for (const resp of ['Onix 2020', 'Cidade', 'Financiado', 'até 60000']) {
    r = conversar(resp, d, { now, memory: mem }); mem = r.memoria;
  }
  assert.ok(r.fala.perguntaIA, 'não mandou pra IA');
  assert.match(r.fala.perguntaIA, /FIPE/);
  assert.equal(r.fala.nivelIA, 'media');
});

test('"o carro mais caro do mundo" é brincadeira, sem IA', () => {
  assert.equal(CURIOSIDADE_RESPOSTAS.length % 5, 0);
  for (const f of ['qual o carro mais caro do mundo', 'quem é o homem mais rico do mundo', 'quanto custa um jatinho']) {
    assert.equal(ent(f).intent, 'curiosidade_cara', f);
    const r = conversar(f, d, { now });
    assert.ok(!r.fala.perguntaIA, f);
    assert.ok(CURIOSIDADE_RESPOSTAS.some(c => r.fala.texto.includes(c.slice(0, 30))), r.fala.texto);
  }
});
