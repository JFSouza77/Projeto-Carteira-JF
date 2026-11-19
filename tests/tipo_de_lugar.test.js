// 2.3.6.1 (JF, 19/11: "nem todo supermercado é de marca grande: Supermercado Ovelha, do Jajá… importa a categoria,
// não o nome"; "Droga Mil, E-Farma, Farmic"; remédio manipulado ou controlado entra com alerta)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { entender, categoriaPeloNome } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const cat = t => entender(t, { categories: DEFAULT_CATEGORIES }).categoria?.id || null;

test('o tipo do lugar decide a categoria, mesmo sem marca conhecida', () => {
  const casos = {
    mercado: ['supermercado ovelha 80', 'gastei 120 no supermercado do jajá', 'mercadinho da esquina 30', 'multishow 200', 'rede show 150', 'bh atacadista 300', 'atacadão 400', 'panificadora sao jose 20'],
    saude: ['fui na droga mil 25', 'drogamil 25', 'efarma 60', 'farmic 70', 'remédio manipulado 90'],
    utilidades: ['ferragens do ze 40'],
    compras: ['mercado livre 100'],
  };
  for (const [id, frases] of Object.entries(casos)) for (const f of frases) assert.equal(cat(f), id, f);
  assert.equal(cat('paguei 50 no mercado pago'), null, 'Mercado Pago é jeito de pagar');
  assert.equal(cat('que droga, gastei 50 no mercado'), 'mercado');
  assert.equal(categoriaPeloNome('SUPERMERCADO OVELHA LTDA', DEFAULT_CATEGORIES), 'mercado');
  assert.equal(categoriaPeloNome('Farmácia de Manipulação Vida', DEFAULT_CATEGORIES), 'saude');
});

test('remédio manipulado ou controlado: Saúde com alerta', () => {
  const d = { expenses: [], incomes: [], accounts: [], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [] };
  const r = conversar('paguei 150 no remédio controlado', d, { now: Date.UTC(2026, 10, 19, 15) });
  assert.equal(r.fala.acao?.categoryId, 'saude');
  assert.match(r.fala.texto, /remédio controlado.*precisa de receita/);
});
