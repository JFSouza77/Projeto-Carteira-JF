// 2.3.0.1 (JF, 17/11): "ele entende mega-sena, raspadinha (não o sorvete), quina, mega da virada... essas fezinhas".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entender, responder } from '../js/caos/conversa.js';

const categories = [{ id: 'lazer', name: 'Lazer' }, { id: 'jogos', name: 'Jogos' }, { id: 'restaurante', name: 'Restaurante' }, { id: 'outros', name: 'Outros' }];
const expenses = [{ id: 'a', date: '2026-11-03', amountCents: 3000, note: 'Mega-Sena', categoryId: 'lazer' }, { id: 'b', date: '2026-11-10', amountCents: 1500, note: 'Raspadinha', categoryId: 'lazer' }];
const fala = f => { const i = entender(f, { categories }); return { i, r: responder(i, { categories, expenses, accounts: [] }, { today: '2026-11-18' }) }; };

test('aposta vira gasto em Lazer, com o nome do jogo', () => {
  for (const [f, nome] of [['joguei 6 na mega sena', 'Mega-Sena'], ['fiz uma fezinha de 20 na quina', 'Quina'], ['comprei uma raspadinha de 5', 'Raspadinha'], ['joguei 10 no bolão da mega da virada', 'Bolão da Mega da Virada']]) {
    const { i, r } = fala(f);
    assert.equal(i.intent, 'registrar_gasto', f);
    assert.equal(r.acao.categoryId, 'lazer', f);
    assert.equal(r.acao.note, nome, f);
  }
  assert.match(fala('joguei 6 na mega sena').r.dica, /fezinha do mês vai a R\$\s51,00/);
});

test('raspadinha de fruta é sorvete; Roblox continua em Jogos', () => {
  assert.equal(fala('raspadinha de morango 12').r.acao.categoryId, 'restaurante');
  assert.equal(fala('joguei 50 no roblox').r.acao.categoryId, 'jogos');
});

test('chance de verdade, sem IA; prêmio e sorteio vão pra pesquisa', () => {
  const c = fala('quais as chances de ganhar na mega?');
  assert.equal(c.i.pede, 'chance');
  assert.match(c.r.fato, /1 em 50\.063\.860/);
  assert.match(fala('vale a pena jogar na lotofacil?').r.fato, /1 em 3\.268\.760/);
  assert.match(fala('e a mega da virada, qual a chance?').r.fato, /mesma chance/);
  const p = fala('quanto tá o prêmio da mega da virada?');
  assert.equal(p.r.modoIA, 'pesquisa');
});

test('quanto gastei com fezinha e glossário', () => {
  assert.match(fala('quanto gastei com fezinha?').r.fato, /2 fezinhas, somando R\$\s45,00/);
  assert.equal(fala('o que é bolão').i.intent, 'glossario');
  assert.equal(fala('o que é raspadinha').i.termo.termo, 'Raspadinha');
});
