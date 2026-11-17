// 2.3.1.1 (JF, 17/11): pergunta de custo curta (IA) que termina em "é plano seu?", e "tô gastando demais com X".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entender, responder } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const categories = DEFAULT_CATEGORIES;
const expenses = [
  ...[3, 5, 8, 10, 12].map(d => ({ id: `c${d}`, date: `2026-11-${String(d).padStart(2, '0')}`, amountCents: 750, note: 'Cafezinho padaria', categoryId: 'restaurante' })),
  { id: 'a1', date: '2026-11-14', amountCents: 4200, note: 'Almoço', categoryId: 'restaurante' },
  { id: 'i1', date: '2026-11-15', amountCents: 5500, note: 'iFood', categoryId: 'delivery' }];
const fala = f => { const i = entender(f, { categories }); return { i, r: responder(i, { categories, expenses, accounts: [], incomes: [] }, { today: '2026-11-17' }) }; };

test('gastando demais com cafezinho olha os lançamentos (e "padaria" não vira Mercado)', () => {
  const { i, r } = fala('acho que tô gastando demais com cafezinho na padaria');
  assert.equal(i.intent, 'gasto_demais');
  assert.match(r.fato, /5 vezes com cafezinho, somando R\$\s37,50/);
  assert.match(r.fato, /cortar pela metade/);
  const fora = fala('tô almoçando muito fora');
  assert.equal(fora.i.intent, 'gasto_demais');
  assert.match(fora.r.fato, /de delivery/);
});

test('pergunta de custo vai curta pra IA e oferece juntar', () => {
  for (const f of ['quanto custa emplacar um carro?', 'em média quanto tá custando tirar carteira de motorista?', 'quanto custa uma bicicleta elétrica?', 'vou fazer uma viagem, o que costuma ser mais barato, hotel ou pousada?']) {
    const { i, r } = fala(f);
    assert.equal(i.intent, 'custo_medio', f);
    assert.equal(r.modoIA, 'pesquisa', f);
    assert.match(r.perguntaIA, /CURTO/, f);
  }
  assert.match(fala('quanto custa emplacar um carro?').r.fato, /Detran/);
  assert.match(fala('o que costuma ser mais barato, hotel ou pousada?').r.fato, /pousada/);
  assert.ok(fala('quanto custa uma bicicleta elétrica?').r.sugestoes.some(x => /juntar pra bicicleta/.test(x)));
  assert.equal(fala('quero juntar pra bicicleta eletrica').i.intent, 'meta_nova');
  assert.equal(fala('só curiosidade').i.intent, 'so_curiosidade');
});

test('o que já funcionava continua no lugar', () => {
  assert.equal(fala('quanto tá um ingresso pro cinemark?').i.intent, 'pesquisa_compra');
  assert.equal(fala('quanto custa 800 robux').i.intent, 'moeda_jogo');
  assert.equal(fala('quanto gasta um chuveiro 20 minutos por dia').i.intent, 'energia');
  assert.equal(fala('como funcionam as multas de trânsito?').i.intent, 'glossario');
  assert.equal(fala('gastei 30 no mercado').i.intent, 'registrar_gasto');
});
