// JF, 16/11: "pode fazer os 2 balões e a emoção na IA, e os itens que ficaram pra depois"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { GERADORES } from '../js/caos/falas.js';
import { DEFAULT_CATEGORIES as C, createAccount, createCartao, createExpense, createCompromisso, dividirIgual } from '../js/engine.js';

const now = Date.UTC(2026, 10, 16, 15);
const k = createCartao({ bank: 'C6 Bank', limiteCents: 100000, fechamentoDia: 5, vencimentoDia: 12, usadoCents: 30000 }, { id: 'k1', now: new Date('2026-10-20T10:00:00') });
const a = createAccount({ bank: 'Inter', balanceCents: 100000 }, { id: 'a1' });
const g = { ...createExpense({ amountCents: 9000, categoryId: 'restaurante', note: 'pizza', date: '2026-11-10' }, { categories: C, id: 'g1' }), racha: dividirIgual(9000, ['Joao', 'Ana']) };
const comp = createCompromisso({ nome: 'Aluguel', valorCents: 120000, dia: 10, categoryId: 'moradia', inicioMes: '2026-11' }, { id: 'c1' });
const d = { expenses: [g], incomes: [], accounts: [k, a], categories: C, budgets: {}, compromissos: [comp], planos: [], metas: [] };
const fala = f => conversar(f, d, { today: '2026-11-16', now }).fala;

test('dar baixa: fatura paga, amigo que pagou e conta fixa paga (sempre com Confirmar)', () => {
  assert.deepEqual(fala('já paguei a fatura do c6').acao, { tipo: 'fatura_paga', cartaoId: 'k1', ate: '2026-11-05', valorCents: 30000 });
  const r = fala('o joao me pagou').acao;
  assert.equal(r.tipo, 'racha_recebido');
  assert.equal(r.nome, 'Joao');
  const al = fala('paguei o aluguel').acao;
  assert.equal(al.compromissoId, 'c1');
  assert.equal(al.amountCents, 120000);
  assert.match(fala('o pedro me pagou').texto, /Quem foi\? Tá me devendo: Joao, Ana/);
});

test('2 balões: no Ácido a cutucada vem separada; no Suave às vezes um "ah, e…"; nunca zoeira no Suave', () => {
  const cut = new Set(Object.values(GERADORES.cutucada.zoa).flat());
  const emenda = new Set(GERADORES.emenda.fala.geral);
  let m, acido = 0;
  for (let i = 0; i < 30; i++) { const r = conversar('quanto gastei este mês?', d, { memory: m, mood: 'acido', now: now + i * 60_000 }); m = r.memoria; if (r.fala.posTexto && cut.has(r.fala.posTexto)) acido++; assert.ok(!r.fala.texto.includes(r.fala.posTexto || '§')); }
  assert.ok(acido >= 10, `cutucada em 2º balão: ${acido}`);
  m = undefined; let suave = 0;
  for (let i = 0; i < 40; i++) {
    const r = conversar('quanto gastei este mês?', d, { memory: m, mood: 'suave', now: now + i * 60_000 }); m = r.memoria;
    if (r.fala.posTexto) { assert.ok(emenda.has(r.fala.posTexto), r.fala.posTexto); suave++; }
  }
  assert.ok(suave >= 3 && suave <= 25, `"ah, e…" no Suave: ${suave}`);
  assert.equal(GERADORES.emenda.fala.geral.length % 5, 0);
});

test('nome na frente: "Você" vira "você" (acento no fim da palavra)', () => {
  let m, achou = false;
  for (let i = 0; i < 4; i++) { const r = conversar('quanto gastei este mês?', d, { memory: m, mood: 'suave', now: now + i * 60_000, perfil: { apelido: 'Teste' } }); m = r.memoria; if (/^Teste, você gastou/.test(r.fala.texto)) achou = true; assert.doesNotMatch(r.fala.texto, /Teste, Você/); }
  assert.ok(achou);
});
