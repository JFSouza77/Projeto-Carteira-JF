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

test('rosto espantado: 5 jogos de 4 quadros, reação e não emoção', async () => {
  const { ROSTO_ESPANTADO, rostoEspantado } = await import('../js/caos/rostos.js');
  assert.equal(ROSTO_ESPANTADO.length % 5, 0);
  for (const q of ROSTO_ESPANTADO) assert.equal(q.length, 4);
  const r = rostoEspantado(() => 0);
  assert.equal(r.nome, 'espantado');
  assert.ok(!Object.keys(NUCLEO.emocoes || {}).includes('espantado'));
});

test('estabilizador: o rosto fica 3 falas, só troca com 2 pontos de vantagem e sai abaixo de 2,2', async () => {
  const { emocaoEstavel } = await import('../js/caos/emocoes.js');
  const now = Date.UTC(2026, 10, 13, 12);
  const est = (v) => ({ v: { alegria: 0, tristeza: 0, raiva: 0, medo: 0, nojo: 0, ansiedade: 0, tedio: 0, vergonha: 0, curiosidade: 0, carinho: 0, ...v }, em: now });
  let r = emocaoEstavel(est({ alegria: 5 }), 'suave', now, null);
  assert.equal(r.emocao, 'alegria');
  // curiosidade passa um pouquinho na frente: ainda é alegria (nem 3 falas, nem 2 pontos)
  r = emocaoEstavel(est({ alegria: 5, curiosidade: 5.5 }), 'suave', now, r.estab);
  assert.equal(r.emocao, 'alegria');
  r = emocaoEstavel(est({ alegria: 5, curiosidade: 5.5 }), 'suave', now, r.estab);
  r = emocaoEstavel(est({ alegria: 5, curiosidade: 5.5 }), 'suave', now, r.estab);
  assert.equal(r.emocao, 'alegria', 'depois das 3 falas, meio ponto de vantagem não basta');
  r = emocaoEstavel(est({ alegria: 5, curiosidade: 7.5 }), 'suave', now, r.estab);
  assert.equal(r.emocao, 'curiosidade', '2 pontos na frente troca');
  // caiu abaixo do limiar (3,8) mas acima de 2,2: segura
  r = emocaoEstavel(est({ curiosidade: 3 }), 'suave', now, { atual: 'curiosidade', falas: 5 });
  assert.equal(r.emocao, 'curiosidade');
  r = emocaoEstavel(est({ curiosidade: 2 }), 'suave', now, { atual: 'curiosidade', falas: 5 });
  assert.equal(r.emocao, 'calmo');
});
