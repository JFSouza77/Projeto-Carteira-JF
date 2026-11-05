import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { reagir, conversar, memoriaInicial, DEFAULT_MOOD, CAOS_VERSAO } from '../js/caos/index.js';
import { GERADORES, SUGESTOES } from '../js/caos/falas.js';
import { todosOsPedacos, gerarFala } from '../js/caos/gerador.js';
import { entender } from '../js/caos/conversa.js';
import { sentir, emocaoAtual, emocoesIniciais } from '../js/caos/emocoes.js';
import { congelar } from '../js/caos/espinha.js';
import { DEFAULT_CATEGORIES, createExpense, createIncome, createAccount } from '../js/engine.js';

// Dados inventados. Nunca use dados reais aqui.
const cats = DEFAULT_CATEGORIES.map(c => (c.id === 'lazer' ? { ...c, budgetCents: 10000 } : { ...c }));
const NOW = new Date(2026, 10, 18, 14, 0).getTime(); // 18/11/2026, 14h
const hoje = '2026-11-18';
const dados = () => {
  const now = new Date(NOW);
  return {
    categories: cats,
    expenses: [
      createExpense({ amountCents: 4590, categoryId: 'lazer', date: '2026-11-10', note: 'Cinema' }, { categories: cats, now }),
      createExpense({ amountCents: 7000, categoryId: 'lazer', date: '2026-11-15' }, { categories: cats, now }),
      createExpense({ amountCents: 3000, categoryId: 'delivery', date: '2026-11-16' }, { categories: cats, now }),
      createExpense({ amountCents: 20000, categoryId: 'mercado', date: '2026-10-05' }, { categories: cats, now }),
    ],
    incomes: [createIncome({ amountCents: 150000, sourceId: 'salario', date: '2026-11-05' }, { now })],
    accounts: [createAccount({ bank: 'Nubank', balanceCents: 50000 }, { now: new Date(NOW - 1) })],
  };
};

const SRC = new URL('../js/caos/', import.meta.url);

test('1ª lei: nenhum arquivo do narrador importa persistência nem toca em DOM/storage', () => {
  for (const f of readdirSync(SRC)) {
    const code = readFileSync(new URL(f, SRC), 'utf8').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(code, /db\.js|indexedDB|localStorage|sessionStorage|document\.|window\.|fetch\(/, f);
  }
});

test('1ª lei: o narrador recebe cópia congelada; os dados originais não mudam', () => {
  const d = dados();
  const antes = JSON.stringify(d);
  conversar('quanto gastei este mês?', d, { now: NOW, today: hoje });
  conversar('gastei 30 no mercado', d, { now: NOW, today: hoje });
  reagir([{ type: 'gasto_cadastrado', categoryName: 'Lazer', amountCents: 100 }], { now: NOW });
  assert.equal(JSON.stringify(d), antes);
  assert.throws(() => { 'use strict'; congelar(d).expenses.push(1); });
});

test('3ª lei: erro dentro do narrador vira silêncio, não exceção', () => {
  const ruim = { get type() { throw new Error('boom'); } };
  const out = reagir([ruim], { now: NOW });
  assert.equal(out.fala, null);
});

test('regra do 0 ou 5: toda lista de falas tem 5, 10, 15…', () => {
  for (const { g, slot, balde, lista } of todosOsPedacos(GERADORES)) {
    assert.equal(lista.length % 5, 0, `${g}.${slot}.${balde} tem ${lista.length}`);
  }
  assert.equal(SUGESTOES.length % 5, 0);
});

test('2ª lei: humor Suave nunca recebe pedaço do balde ácido', () => {
  const acidos = new Set(todosOsPedacos(GERADORES).filter(p => p.balde === 'humor_acido').flatMap(p => p.lista));
  let mem = memoriaInicial(NOW);
  const evs = Object.keys(GERADORES);
  for (let i = 0; i < 300; i++) {
    const type = evs[i % evs.length];
    const ev = { type, categoryName: 'Lazer', amountCents: 1000, pct: 90, leftCents: 100, overCents: 100, count: 3,
      days: 7, totalCents: 9000, monthName: 'outubro de 2026', month: `m${i}`, savedCents: 100, projectedCents: 1, perDayCents: 1,
      budgetCents: 1, incomeCents: 1, accountName: 'Nubank', balanceCents: -1, sourceId: 'salario' };
    const out = reagir([ev], { mood: 'suave', memory: mem, now: NOW + i * 86_400_000 });
    mem = out.memoria;
    if (out.fala) for (const a of acidos) assert.ok(!out.fala.texto.includes(a), `${type}: ${out.fala.texto}`);
  }
  assert.equal(DEFAULT_MOOD, 'suave');
});

test('nenhuma fala montada sai com {variavel} sobrando', () => {
  let mem = memoriaInicial(NOW);
  for (const mood of ['suave', 'normal', 'acido']) {
    for (let i = 0; i < 60; i++) {
      for (const type of ['orcamento_80', 'categoria_estourada', 'mes_verde', 'ritmo_alto', 'conta_negativa', 'entrada_cadastrada']) {
        const ev = { type, categoryName: 'Mercado', amountCents: 500, pct: 85, leftCents: 1500, overCents: 200, month: `x${i}`,
          monthName: 'outubro de 2026', savedCents: 100, projectedCents: 900, perDayCents: 30, budgetCents: 800,
          accountName: 'Inter', balanceCents: -500, sourceId: 'freela' };
        const out = reagir([ev], { mood, memory: mem, now: NOW + i * 864e5 });
        mem = out.memoria;
        if (out.fala) assert.doesNotMatch(out.fala.texto, /\{\w+\}/, out.fala.texto);
      }
    }
  }
});

test('anti-repetição: a mesma montagem não sai duas vezes seguidas', () => {
  let mem = {};
  const seen = [];
  for (let i = 0; i < 8; i++) {
    const r = gerarFala(GERADORES, 'categoria_estourada', { tags: new Set(['humor_normal']), vars: { categoria: 'Lazer', pct: 120, passou: 'R$ 20,00' } }, mem);
    mem = r.memoria;
    seen.push(r.texto);
  }
  for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1]);
});

test('cooldown: gasto cadastrado não vira spam; alerta passa', () => {
  const g = { type: 'gasto_cadastrado', categoryName: 'Mercado', amountCents: 1990 };
  const e = { type: 'categoria_estourada', categoryName: 'Lazer', pct: 120, overCents: 2000 };
  const a = reagir([g], { now: 0 });
  assert.ok(a.fala);
  assert.equal(reagir([g], { memory: a.memoria, now: 60_000 }).fala, null);
  assert.equal(reagir([g, e], { memory: a.memoria, now: 60_000 }).fala.evento, 'categoria_estourada');
});

test('mês verde só é anunciado uma vez', () => {
  const ev = { type: 'mes_verde', month: '2026-10', monthName: 'outubro de 2026', savedCents: 100 };
  const a = reagir([ev], { now: NOW });
  assert.ok(a.fala);
  assert.equal(reagir([ev], { memory: a.memoria, now: NOW + 1 }).fala, null);
});

test('emoções: estouro preocupa, mês verde orgulha, o tempo acalma', () => {
  let e = sentir(emocoesIniciais(0), 'categoria_estourada', 0);
  assert.equal(emocaoAtual(e, 'normal', 0), 'tenso');
  assert.equal(emocaoAtual(e, 'suave', 0), 'preocupacao'); // Suave: sem irritação
  e = sentir(emocoesIniciais(0), 'mes_verde', 0);
  assert.equal(emocaoAtual(e, 'normal', 0), 'radiante');
  assert.equal(emocaoAtual(e, 'normal', 48 * 3_600_000), 'calmo');
});

test('conversa entende as perguntas principais', () => {
  const casos = {
    'Quanto gastei este mês?': 'gasto_total',
    'quanto gastei com delivery essa semana': 'gasto_total',
    'Onde mais gastei?': 'maior_gasto',
    'Tive rendimentos?': 'entradas',
    'Qual meu saldo?': 'saldo',
    'Algum alerta?': 'alertas',
    'Quanto ainda posso gastar?': 'orcamento',
    'Vai dar até o fim do mês?': 'previsao',
    'Comparado ao mês passado?': 'comparar',
    'Me dá uma dica': 'dica',
    'gastei 25 no mercado': 'registrar_gasto',
    'paguei 120,50 de luz': 'registrar_gasto',
    'recebi 1500 de salário': 'registrar_entrada',
    'oi caos': 'saudacao',
    'valeu!': 'agradecimento',
    'como você está?': 'como_esta',
    'asdfgh': 'nao_entendi',
  };
  for (const [frase, intent] of Object.entries(casos)) {
    assert.equal(entender(frase, { categories: cats }).intent, intent, frase);
  }
  const r = entender('paguei 120,50 de luz', { categories: cats });
  assert.equal(r.valor, 12050);
  assert.equal(r.categoria.id, 'contas');
});

test('conversa responde com os números certos e PROPÕE registro (não grava)', () => {
  const d = dados();
  const total = conversar('quanto gastei este mês?', d, { now: NOW, today: hoje });
  assert.match(total.fala.texto, /145,90/);
  const ent = conversar('tive rendimentos?', d, { now: NOW, today: hoje });
  assert.match(ent.fala.texto, /1\.500,00/);
  const saldo = conversar('qual meu saldo no nubank?', d, { now: NOW, today: hoje });
  assert.match(saldo.fala.texto, /500,00/);
  const prop = conversar('gastei 30 no mercado', d, { now: NOW, today: hoje });
  assert.deepEqual({ ...prop.fala.acao }, { tipo: 'registrar_gasto', amountCents: 3000, categoryId: 'mercado', date: hoje, note: '' });
  assert.equal(d.expenses.length, 4);
  const alert = conversar('algum alerta?', d, { now: NOW, today: hoje });
  assert.match(alert.fala.texto, /Lazer/);
});

test('versão do C.A.O.S. existe', () => {
  assert.match(CAOS_VERSAO, /^\d+\.\d+\.\d+$/);
});

test('alerta do radar (ao abrir o app) não se repete a cada abertura', () => {
  const ev = { type: 'categoria_estourada', categoryName: 'Lazer', pct: 120, overCents: 2000, radar: true };
  const a = reagir([ev], { now: NOW });
  assert.ok(a.fala);
  assert.equal(reagir([ev], { memory: a.memoria, now: NOW + 3_600_000 }).fala, null);
  assert.ok(reagir([ev], { memory: a.memoria, now: NOW + 7 * 3_600_000 }).fala);
  // o mesmo alerta disparado por um gasto novo continua falando na hora
  assert.ok(reagir([{ ...ev, radar: false }], { memory: a.memoria, now: NOW + 60_000 }).fala);
});
