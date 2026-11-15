// Moedas de jogo (JF, 15/11): o C.A.O.S. entende Robux, V-Bucks, Diamantes, VP… como um colega que entende de jogo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { MOEDAS_JOGOS, acharMoedaJogo, lerPacote } from '../js/caos/moedas_jogos.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const d = { expenses: [], incomes: [], accounts: [], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [], planos: [], metas: [] };
const fala = t => conversar(t, d, { now: Date.UTC(2026, 10, 15, 12) }).fala;

test('lista com quantidade terminando em 0 ou 5, cada jogo com moeda e onde comprar', () => {
  assert.equal(MOEDAS_JOGOS.length % 5, 0);
  for (const m of MOEDAS_JOGOS) assert.ok(m.jogo && m.moeda && m.onde && m.chaves.length, m.jogo);
  assert.equal(acharMoedaJogo('quanto custa robux').jogo, 'Roblox');
  assert.equal(acharMoedaJogo('diamante no free fire').jogo, 'Free Fire');
  assert.equal(acharMoedaJogo('lol kkk'), null);
});

test('qual a moeda e onde comprar: responde sem IA, com dica contra golpe', () => {
  const f = fala('qual a moeda do valorant?');
  assert.equal(f.entendeu, true);
  assert.match(f.texto, /Valorant Points/);
  assert.match(f.texto, /golpe/);
});

test('preço de hoje vai pra IA; pacote informado ele calcula o preço por 100', () => {
  assert.equal(fala('quanto tá valendo 1000 robux em reais?').entendeu, false);
  assert.deepEqual(lerPacote('pacote de 1000 robux por 50 reais'), { quantidade: 1000, reaisCents: 5000 });
  assert.match(fala('pacote de 1000 robux por 50 reais compensa?').texto, /R\$\s5,00 a cada 100/);
});

test('"comprei 800 robux por 40" anota R$ 40 em Jogos, não R$ 800', () => {
  const a = fala('comprei 800 robux por 40').acao;
  assert.equal(a.amountCents, 4000);
  assert.equal(a.categoryId, 'jogos');
  assert.equal(a.note, 'Robux');
});

test('categoria Jogos: gasto de jogo vai pra ela e ganha a dica de gift card × crédito; avatar Gamer', async () => {
  const f = fala('gastei 40 em robux');
  assert.equal(f.acao.categoryId, 'jogos');
  assert.match(f.texto, /gift card/);
  assert.equal(fala('gastei 30 no cinema').acao.categoryId, 'lazer');
  const { formaPara, FORMAS } = await import('../js/avatar.js');
  assert.ok(FORMAS.gamer.acc.includes('controle'));
  assert.equal(formaPara({ assunto: 'moeda_jogo' }), 'gamer');
});
