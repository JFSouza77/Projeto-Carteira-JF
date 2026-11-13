// Revisão de 13/11 à noite (JF): falas mais curtas e naturais, mais piadas, glossário conferido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { GERADORES } from '../js/caos/falas.js';
import { GLOSSARIO } from '../js/caos/glossario.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const d = { expenses: [], incomes: [], accounts: [], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [], planos: [], metas: [] };
const now = Date.UTC(2026, 10, 13, 22);
const fala = t => conversar(t, d, { now }).fala;

test('as falas de apresentação ficaram curtas (o JF achou a de "o que você pode fazer" enorme)', () => {
  for (const p of ['o que você pode fazer?', 'como você funciona?', 'me ajuda', 'qual sua história?', 'vale a pena parcelar?']) {
    assert.ok(fala(p).texto.length <= 400, `${p}: ${fala(p).texto.length} letras`);
  }
});

test('entende o jeito comum de perguntar', () => {
  assert.equal(fala('tudo bem?').intent, 'como_esta');
  assert.equal(fala('como vai fechar o mês?').intent, 'previsao');
  assert.equal(fala('e os meus dados?').intent, 'privacidade');
  assert.match(fala('e os meus dados?').texto, /IA online/);
  assert.equal(fala('o que é limite do cartão?').intent, 'glossario');
  assert.equal(fala('quanto tá minha fatura?').intent, 'cartao');
});

test('repertório maior e sempre de 5 em 5', () => {
  assert.ok(GERADORES.piada.inteira.geral.length >= 50);
  for (const g of ['agradecimento', 'elogio', 'xingamento', 'nao_entendi', 'retomar_nao', 'lembrete_limites']) {
    assert.ok(GERADORES[g].inteira.geral.length >= 10, g);
    assert.equal(GERADORES[g].inteira.geral.length % 5, 0, g);
  }
  assert.equal(GLOSSARIO.length % 5, 0);
  assert.ok(GLOSSARIO.length >= 70);
  // regra que muda com o tempo sempre manda conferir no canal oficial
  for (const g of GLOSSARIO.filter(x => x.governo)) assert.match(g.mais, /confir|site|app/i, g.termo);
});

test('limite garantido (JF, 13/11): sabe quais bancos dão limite por investimento, com data e "confira"', () => {
  const f = fala('quais bancos aumentam o limite se eu investir?');
  assert.equal(f.intent, 'limite_investido');
  for (const b of ['C6', 'Inter', 'Nubank', 'PicPay']) assert.match(f.texto, new RegExp(b));
  assert.match(f.texto, /novembro de 2026/);
  assert.match(f.texto, /confira/);
  assert.ok(f.texto.length <= 450);
  assert.equal(fala('o que é limite garantido?').intent, 'glossario');
  assert.equal(GLOSSARIO.length, 75);
});
