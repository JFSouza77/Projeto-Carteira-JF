// 2.3.6 (JF, 19/11: "categoria utilidades, marcas de roupa, de relógio, de celular… farmácias, distribuidora, os
// próximos gastos são da feira, imposto de renda"): é refinamento pra cada gasto cair no lugar certo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { entender } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const ent = t => entender(t, { categories: DEFAULT_CATEGORIES });
const d = { expenses: [], incomes: [], accounts: [], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [] };
const now = Date.UTC(2026, 10, 19, 15);

test('20 categorias (regra do 0 ou 5), com as 5 novas', () => {
  assert.equal(DEFAULT_CATEGORIES.length % 5, 0);
  for (const id of ['roupas', 'beleza', 'joias', 'presentes', 'utilidades']) assert.ok(DEFAULT_CATEGORIES.some(c => c.id === id), id);
});

test('lojas, marcas, farmácias e utilidades pelo nome', () => {
  const casos = {
    utilidades: ['chaveiro 15', 'fiz uma chave extra 15', 'papelaria 30', 'gastei 80 na loja de 1,99', 'material de construção 350', 'havan 120', 'assistência técnica 200', 'gastei 20 na lojinha'],
    roupas: ['nike 400', 'comprei um tênis 300', 'gastei 500 na C&A'],
    beleza: ['fiz a unha 50', 'fui no barbeiro 40', 'perfume 180'],
    joias: ['comprei um relógio casio de 300', 'comprei um brinco 40'],
    presentes: ['comprei presente pra minha mãe 100'],
    saude: ['droga lider 30', 'fui na droga raia 40', 'drogazil 25', 'rede farma 18'],
    mercado: ['distribuidora 60', 'bh supermercados 210'],
    compras: ['comprei um celular de 1500', 'comprei uma tv de 2500'],
    contas: ['paguei 50 da conta do celular'],
  };
  for (const [id, frases] of Object.entries(casos)) for (const f of frases) assert.equal(ent(f).categoria?.id, id, f);
  assert.equal(ent('comprei um iphone 16 pro max de 256gb por 8000').valor, 800000);
  assert.equal(ent('comprei um galaxy s24 ultra de 5000').valor, 500000);
  assert.equal(ent('que droga, gastei 50 no mercado').categoria?.id, 'mercado');
});

test('modo lista: "os próximos gastos são da feira" até "pronto"', () => {
  let r = conversar('os próximos gastos são da feira', d, { now });
  assert.match(r.fala.texto, /vão todos pra Mercado/);
  r = conversar('tomate 8', d, { now, memory: r.memoria });
  assert.equal(r.fala.acao?.categoryId, 'mercado');
  r = conversar('pronto', d, { now, memory: r.memoria });
  assert.match(r.fala.texto, /Parei de colocar tudo em Mercado/);
  r = conversar('uber 20', d, { now, memory: r.memoria });
  assert.equal(r.fala.acao?.categoryId, 'transporte');
  assert.equal(ent('acabou meu dinheiro').intent, 'aperto');
});

test('imposto de renda: estima com a IA e avisa que é estimativa', () => {
  for (const f of ['quanto vou pagar de imposto de renda?', 'ganho 6000 quanto pago de imposto de renda?', 'preciso declarar imposto de renda?']) {
    const r = conversar(f, d, { now });
    assert.equal(r.fala.intent, 'imposto_renda', f);
    assert.ok(r.fala.perguntaIA && /estimativa/.test(r.fala.perguntaIA));
    assert.match(r.fala.texto, /Não confie 100%/);
  }
  assert.equal(ent('o que é imposto de renda?').intent, 'glossario');
});
