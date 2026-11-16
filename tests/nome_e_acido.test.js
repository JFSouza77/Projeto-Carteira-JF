// JF, 16/11: "ele não usa nosso nome" e "tá muito family friendly até no ácido; deram Rivotril pra minha IA?"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { GERADORES } from '../js/caos/falas.js';
import { DEFAULT_CATEGORIES, createExpense } from '../js/engine.js';

const g = createExpense({ amountCents: 4500, categoryId: 'lazer', note: 'cinema', date: '2026-11-16' }, { categories: DEFAULT_CATEGORIES, id: 'g1' });
const d = { expenses: [g], incomes: [], accounts: [], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [], planos: [], metas: [] };
const now = Date.UTC(2026, 10, 16, 15);
const cutucadas = new Set(Object.values(GERADORES.cutucada.zoa).flat());
function papo(n, { mood, perfil }, seed = 1) {
  let memory; const out = []; let x = seed;
  const rng = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) { const r = conversar('quanto gastei este mês?', d, { memory, now: now + i * 60_000, mood, perfil, rng }); memory = r.memoria; out.push(r.fala.texto); }
  return out;
}

test('chama a pessoa pelo nome, uma resposta sim e outra não', () => {
  const falas = papo(6, { mood: 'suave', perfil: { apelido: 'Anne', aniversarioPerguntado: true } });
  const comNome = falas.filter(t => t.includes('Anne'));
  assert.ok(comNome.length >= 3, falas.join('\n'));
  assert.ok(falas[0].startsWith('Anne, '), falas[0]);
});

test('sem apelido, nada de nome inventado', () => {
  for (const t of papo(4, { mood: 'suave', perfil: null })) assert.doesNotMatch(t, /^\w+, /);
});

test('Suave e Normal nunca recebem cutucada', () => {
  for (const mood of ['suave', 'normal']) {
    for (const t of papo(30, { mood, perfil: { apelido: 'Bia' } }, 7)) for (const c of cutucadas) assert.ok(!t.includes(c), t);
  }
});

test('no Ácido a cutucada aparece; com o criador também, mesmo no Suave', () => {
  const acido = papo(20, { mood: 'acido', perfil: { apelido: 'Gabriel' } }, 3);
  assert.ok(acido.some(t => [...cutucadas].some(c => t.includes(c))), acido.join('\n'));
  const criador = papo(20, { mood: 'suave', perfil: { apelido: 'JF', seloCriador: true } }, 5);
  assert.ok(criador.some(t => [...cutucadas].some(c => t.includes(c))), criador.join('\n'));
});

test('quem só digitou "JF" sem o selo não recebe as falas do criador', () => {
  const daCriador = GERADORES.cutucada.zoa.criador;
  for (const t of papo(30, { mood: 'acido', perfil: { apelido: 'JF' } }, 9)) for (const c of daCriador) assert.ok(!t.includes(c), t);
});
