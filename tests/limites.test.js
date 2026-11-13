// Núcleo 1.4.0 (13/11/2026, Wally e Code com o aval do JF): o C.A.O.S. é uma "IA de bolso". Em pergunta de decisão
// ele ajuda e termina com o lembrete de que quem decide é a pessoa, no máximo 1 vez por assunto (pra não ficar chato).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { NUCLEO } from '../js/caos/nucleo.js';
import { IDENTIDADE, textoPodeNaoPode } from '../js/caos/identidade.js';
import { GERADORES } from '../js/caos/falas.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const d = { expenses: [], incomes: [], accounts: [], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [] };
const now = Date.UTC(2026, 10, 13, 15);
const LEMBRETES = GERADORES.lembrete_limites.inteira.geral;
const temLembrete = t => LEMBRETES.some(l => t.includes(l));

test('núcleo 1.4.0: IA de bolso, limites e jeito de ajudar', () => {
  assert.equal(NUCLEO.versao, '1.4.0');
  assert.match(IDENTIDADE.oQueSou.curto, /IA de bolso/);
  assert.ok(IDENTIDADE.oQueSou.porProjeto.carteira);
  assert.ok(IDENTIDADE.limites.frequencia);
  assert.match(textoPodeNaoPode(), /IA de bolso.*não sou consultor financeiro/is);
});

test('lembrete de limites: aparece na decisão de compra e não repete no mesmo assunto', () => {
  const p = 'vale a pena parcelar? 3000 a vista ou 10x de 330';
  const r1 = conversar(p, d, { now });
  assert.ok(temLembrete(r1.fala.texto), r1.fala.texto);
  const r2 = conversar(p, d, { now: now + 60_000, memory: r1.memoria });
  assert.ok(!temLembrete(r2.fala.texto), 'repetiu o lembrete logo em seguida');
  const r3 = conversar(p, d, { now: now + 7 * 3600_000, memory: r2.memoria });
  assert.ok(temLembrete(r3.fala.texto), 'depois de umas horas pode lembrar de novo');
});

test('lembrete de limites não entra em conta simples', () => {
  const r = conversar('quanto gastei este mês?', d, { now });
  assert.ok(!temLembrete(r.fala.texto));
});
