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
  // com conta cadastrada ele pergunta como pagou; aqui a pessoa já disse (dinheiro)
  const prop = conversar('gastei 30 no mercado em dinheiro', d, { now: NOW, today: hoje });
  assert.deepEqual({ ...prop.fala.acao }, { tipo: 'registrar_gasto', amountCents: 3000, categoryId: 'mercado', date: hoje, note: 'Mercado',
    forma: 'dinheiro', parcelas: 1, limiteModo: 'total' });
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

test('C.A.O.S. sabe quem é: identidade, sigla, criador, origem, limites, piada e tutorial', () => {
  const casos = {
    'Quem é você?!': 'identidade',
    'qual seu nome?': 'identidade',
    'você é uma IA?': 'identidade',
    'o que significa CAOS?': 'significado',
    'quem te criou?': 'criador',
    'de onde você veio?': 'origem',
    'como você funciona?': 'como_funciona',
    'o que você pode fazer?': 'limites',
    'você acessa meu banco?': 'limites',
    'conta uma piada': 'piada',
    'como faço pra adicionar uma conta?': 'tutorial',
    'como ponho orçamento?': 'tutorial',
    'me ensina a usar': 'tutorial',
    'pra que você serve?': 'ajuda',
    'como faço pra economizar?': 'dica',
  };
  for (const [frase, intent] of Object.entries(casos)) assert.equal(entender(frase, { categories: cats }).intent, intent, frase);
  assert.equal(entender('como faço pra adicionar uma conta?', { categories: cats }).tema, 'conta');
  assert.equal(entender('como lanço um gasto?', { categories: cats }).tema, 'gasto');

  const d = dados();
  const quem = conversar('Quem é você?!', d, { now: NOW, today: hoje });
  assert.ok(quem.fala.entendeu);
  assert.match(quem.fala.texto, /C\.A\.O\.S\./);
  let mem = memoriaInicial(NOW);
  const viu = new Set();
  for (let i = 0; i < 20; i++) {
    const r = conversar('o que significa caos?', d, { now: NOW + i, today: hoje, memory: mem });
    mem = r.memoria;
    viu.add(r.fala.texto);
    assert.match(r.fala.texto, /Central de Análises e Observações Sistêmicas/);
  }
  assert.ok(viu.size > 1, 'varia a resposta');
  assert.match(conversar('quem te criou?', d, { now: NOW, today: hoje }).fala.texto, /JF/);
  assert.match(conversar('de onde você veio?', d, { now: NOW, today: hoje }).fala.texto, /Perfil/);
  const func = conversar('como você funciona?', d, { now: NOW, today: hoje }).fala.texto;
  for (const parte of ['cérebro', 'sistema nervoso', 'braços', 'espinha']) assert.match(func, new RegExp(parte, 'i'));
  assert.match(conversar('o que você pode fazer?', d, { now: NOW, today: hoje }).fala.texto, /Não mexo em nada sozinho/);
  assert.match(conversar('como adiciono uma conta?', d, { now: NOW, today: hoje }).fala.texto, /Contas/);
});

test('entende "C.A.O.S." com pontinhos e o "não posso" fica com o sentido certo', () => {
  assert.equal(entender('O que significa C.A.O.S.?', { categories: cats }).intent, 'significado');
  const t = conversar('o que você pode fazer?', dados(), { now: NOW, today: hoje }).fala.texto;
  assert.match(t, /Não mexo em nada sozinho, não acesso seu banco/); // 13/11 à noite: fala resumida (JF)
  // privacidade (achado do GPT, 13/11): sem promessa absoluta; diz o que vai quando a IA online opcional está ligada
  assert.match(t, /lançamentos ficam no seu aparelho/);
  assert.match(t, /IA online \(é opcional\)/);
  assert.doesNotMatch(t, /não mando pra ninguém/);
});

import { escolherRosto, escada, EMOS } from '../js/caos/rostos.js';
import { VIZINHOS } from '../js/caos/rostos-dados.js';

test('rostos: os dados vieram do Perfil completos (todo vizinho existe, todo rosto tem quadros)', () => {
  for (const [k, e] of Object.entries(EMOS)) {
    assert.ok(e.niv.length >= 1 && e.cor && e.fr > 0, k);
    for (const nivel of e.niv) for (const q of nivel) assert.ok(Array.isArray(q) && q.length >= 1 && q.every(x => typeof x === 'string' && x.length), k);
  }
  for (const [k, l] of Object.entries(VIZINHOS)) for (const v of l) assert.ok(EMOS[v], `${k} → ${v}`);
});

test('rostos: escada não pula de festa pra raiva direto', () => {
  const passo = escada('festa', 'raiva');
  assert.notEqual(passo, 'raiva');
  assert.ok(EMOS[passo]);
  assert.equal(escada('calmo', 'pensando'), 'pensando'); // vizinho: vai direto
});

test('rostos: humor Suave nunca mostra raiva, deboche ou julgando', () => {
  let mem;
  for (let i = 0; i < 200; i++) {
    for (const [emocao, evento] of [['irritacao'], ['tenso'], ['calmo', 'xingamento'], ['calmo', 'categoria_estourada'], ['calmo', 'piada']]) {
      const r = escolherRosto({ emocao, evento, humor: 'suave', intensidade: 1, memoria: mem, livre: true });
      mem = r.memoria;
      assert.ok(!['raiva', 'deboche', 'julgando'].includes(r.rosto.emo), `${emocao}/${evento} → ${r.rosto.emo}`);
      assert.ok(!r.rosto.mistura);
    }
  }
});

test('rostos: Ácido zoa no estouro; intensidade sobe o nível; não repete em seguida', () => {
  assert.equal(escolherRosto({ evento: 'categoria_estourada', humor: 'acido', livre: true }).rosto.emo, 'deboche');
  const leve = escolherRosto({ emocao: 'orgulho', intensidade: 0, livre: true, rng: () => 0 }).rosto.quadros;
  const forte = escolherRosto({ emocao: 'orgulho', intensidade: 1, livre: true, rng: () => 0 }).rosto.quadros;
  assert.ok(EMOS.orgulho.niv[0].some(q => q === leve) || JSON.stringify(EMOS.orgulho.niv[0]).includes(JSON.stringify(leve)));
  assert.ok(JSON.stringify(EMOS.orgulho.niv[EMOS.orgulho.niv.length - 1]).includes(JSON.stringify(forte)));
  let mem;
  let ant = null;
  for (let i = 0; i < 30; i++) {
    const r = escolherRosto({ emocao: 'calmo', intensidade: 0, memoria: mem, livre: true });
    mem = r.memoria;
    const q = JSON.stringify(r.rosto.quadros);
    assert.notEqual(q, ant);
    ant = q;
  }
});

test('fala do C.A.O.S. vem com rosto animado (quadros e cor)', () => {
  const a = reagir([{ type: 'mes_verde', month: '2026-10', monthName: 'outubro de 2026', savedCents: 100 }], { now: NOW });
  assert.equal(a.fala.rosto.emo, 'orgulho');
  assert.ok(a.fala.rosto.quadros.length >= 1 && a.fala.rosto.cor);
  const p = conversar('conta uma piada', dados(), { now: NOW, today: hoje });
  assert.equal(p.fala.rosto.emo, 'festa');
});

test('na conversa, reação direta muda o rosto na hora (sem ficar um passo atrasado)', () => {
  let mem = memoriaInicial(NOW);
  const d = dados();
  const p = conversar('conta uma piada', d, { now: NOW, today: hoje, memory: mem, mood: 'normal' });
  const x = conversar('você é burro', d, { now: NOW + 1, today: hoje, memory: p.memoria, mood: 'normal' });
  assert.equal(x.fala.rosto.emo, 'julgando');
  const q = conversar('quem é você?', d, { now: NOW + 2, today: hoje, memory: x.memoria, mood: 'normal' });
  assert.equal(q.fala.rosto.emo, 'orgulho');
});

import { createCompromisso, createPlano, createIncome as criarEntrada } from '../js/engine.js';
import { extrairNome, descricaoDe } from '../js/caos/conversa.js';
import { falaAvulsa } from '../js/caos/index.js';

test('primeiro acesso: tira o nome da resposta e chama a pessoa pelo nome', () => {
  assert.equal(extrairNome('meu nome é joão fernando'), 'João Fernando');
  assert.equal(extrairNome('Sou a Ana.'), 'Ana');
  assert.equal(extrairNome('oi, me chamo Beto'), 'Beto');
  assert.equal(extrairNome('Caio'), 'Caio');
  const perfil = { nome: 'João', apelido: 'JF', tratamento: 'descontraido' };
  const r = falaAvulsa('onb_apelido', { nome: 'João' }, { now: NOW });
  assert.match(r.texto, /João/);
  let viuNome = false;
  let mem = memoriaInicial(NOW);
  for (let i = 0; i < 20 && !viuNome; i++) {
    const o = reagir([{ type: 'boas_vindas' }], { now: NOW + i * 7 * 3_600_000, memory: mem, perfil });
    mem = o.memoria;
    if (o.fala && /JF/.test(o.fala.texto)) viuNome = true;
  }
  assert.ok(viuNome, 'boas-vindas chama pelo nome');
  assert.match(conversar('qual é o meu nome?', dados(), { now: NOW, today: hoje, perfil }).fala.texto, /JF/);
  assert.deepEqual({ ...conversar('me chama de chefe', dados(), { now: NOW, today: hoje, perfil }).fala.acao }, { tipo: 'mudar_apelido', apelido: 'Chefe' });
});

test('formal: sem zoeira mesmo no humor Ácido', () => {
  const acidos = new Set(todosOsPedacos(GERADORES).filter(p => p.balde === 'humor_acido').flatMap(p => p.lista));
  let mem = memoriaInicial(NOW);
  for (let i = 0; i < 40; i++) {
    const o = reagir([{ type: 'categoria_estourada', categoryName: 'Lazer', pct: 120, overCents: 100 }], { mood: 'acido', memory: mem, now: NOW + i, perfil: { apelido: 'Ana', tratamento: 'formal' } });
    mem = o.memoria;
    for (const a of acidos) assert.ok(!o.fala.texto.includes(a), o.fala.texto);
  }
});

test('conversa: o que tenho pra pagar, planos e "cabe no mês?"', () => {
  const d = dados();
  d.compromissos = [createCompromisso({ nome: 'Fatura', valorCents: 50000, tipo: 'fatura', dia: 20, categoryId: 'contas' }, { categories: cats, now: new Date(NOW) })];
  d.planos = [createPlano({ nome: 'Tênis', valorCents: 30000, month: '2026-11' })];
  const pagar = conversar('o que tenho pra pagar?', d, { now: NOW, today: hoje });
  assert.match(pagar.fala.texto, /Fatura/);
  assert.equal(pagar.fala.acao.compromissoId, d.compromissos[0].id);
  assert.match(conversar('o que planejei pro mês?', d, { now: NOW, today: hoje }).fala.texto, /Tênis/);
  // entradas 1500 − gastos 145,90 − fatura 500 − tênis 300 = 554,10
  assert.match(conversar('cabe no mês?', d, { now: NOW, today: hoje }).fala.texto, /554,10/);
  assert.match(conversar('posso comprar algo de 600?', d, { now: NOW, today: hoje }).fala.texto, /Apertado/);
  assert.match(conversar('posso comprar algo de 200?', d, { now: NOW, today: hoje }).fala.texto, /Cabe!/);
});

test('aprende categoria na conversa: "gastei 30 no uber" vai pra Transporte pelo histórico', () => {
  const d = dados();
  d.expenses = [...d.expenses, createExpense({ amountCents: 2000, categoryId: 'transporte', note: 'Uber', date: '2026-11-10' }, { categories: cats })];
  assert.equal(descricaoDe('gastei 30 no uber'), 'uber');
  const o = conversar('gastei 30 no uber em dinheiro', d, { now: NOW, today: hoje });
  assert.equal(o.fala.acao.categoryId, 'transporte');
  assert.equal(o.fala.acao.note, 'Uber');
});

test('radar novo fala com o nome dos compromissos', () => {
  const o = reagir([{ type: 'compromisso_vence', nome: 'Fatura do cartão', valorCents: 80000, dia: 7, days: 2 }], { now: NOW });
  assert.match(o.fala.texto, /Fatura do cartão/);
  assert.match(o.fala.texto, /em 2 dias|dia 7/);
  assert.doesNotMatch(o.fala.texto, /\{\w+\}/);
  const b = reagir([{ type: 'confira_banco', accountName: 'Nubank', days: 9 }], { now: NOW });
  assert.match(b.fala.texto, /Nubank/);
});

import { analyze, createAccount as criarConta } from '../js/engine.js';

test('todo alerta que o radar gera vira fala (nenhum fica mudo)', () => {
  const c = cats.map(x => (x.id === 'lazer' ? { ...x, budgetCents: 1000 } : x.id === 'mercado' ? { ...x, budgetCents: 10000 } : x));
  const now = new Date(2026, 10, 18, 12);
  const ex = [
    createExpense({ amountCents: 5000, categoryId: 'lazer', date: '2026-11-10' }, { categories: c, now }),
    createExpense({ amountCents: 8500, categoryId: 'mercado', date: '2026-11-11' }, { categories: c, now }),
    ...[12, 14, 15].map(dd => createExpense({ amountCents: 3000, categoryId: 'delivery', date: `2026-11-${dd}` }, { categories: c, now })),
  ];
  const acc = criarConta({ bank: 'Inter', balanceCents: 100 }, { now: new Date(2026, 10, 1) });
  const d = {
    expenses: ex.map(e => ({ ...e, accountId: acc.id })), categories: c, accounts: [acc],
    incomes: [criarEntrada({ amountCents: 1000, sourceId: 'freela', date: '2026-11-02' }, { now })],
    compromissos: [
      createCompromisso({ nome: 'Fatura', valorCents: 1000, tipo: 'fatura', dia: 19, categoryId: 'contas' }, { categories: c, now: new Date(2026, 10, 1) }),
      createCompromisso({ nome: 'Luz', valorCents: 1000, dia: 2, categoryId: 'contas' }, { categories: c, now: new Date(2026, 10, 1) }),
      createCompromisso({ nome: 'Japonesa', valorCents: 1000, tipo: 'plano', categoryId: 'restaurante', cadaMeses: 2, inicioMes: '2026-11' }, { categories: c }),
    ],
  };
  const alertas = analyze(d, '2026-11-18');
  const tipos = new Set(alertas.map(a => a.type));
  for (const t of ['categoria_estourada', 'orcamento_80', 'mes_negativo', 'conta_negativa', 'delivery_repetido', 'compromisso_vence', 'compromisso_atrasado', 'plano_do_mes', 'confira_banco']) {
    assert.ok(tipos.has(t), `radar deveria gerar ${t}`);
  }
  for (const mood of ['suave', 'normal', 'acido']) {
    for (const a of alertas) {
      const o = reagir([a], { mood, now: NOW });
      assert.ok(o.fala && o.fala.texto, `${a.type} ficou mudo (${mood})`);
      assert.doesNotMatch(o.fala.texto, /\{\w+\}/, o.fala.texto);
    }
  }
});

test('mercado: responde com base de cálculo, data do dado e aviso; sem dado explica de onde vem', () => {
  const d = dados();
  assert.match(conversar('como está o dólar?', d, { now: NOW, today: hoje }).fala.texto, /servidor do C\.A\.O\.S\. Finanças/);
  d.mercado = {
    atualizadoEm: new Date(NOW - 3_600_000).toISOString(),
    moedas: { USD: { nome: 'Dólar', atual: 5.48, varDia: 0.42, var5: 2.1, media20: 5.3, dias: 21, tendencia: 'alta' } },
    ibov: { nome: 'Ibovespa', atual: 132000, varDia: -0.8, var5: -2.3, media20: 135000, dias: 30, tendencia: 'queda' },
    selic: { valor: 10.75 }, cdi: { valor: 10.65 }, ipca12: { valor: 4.2 },
  };
  const dolar = conversar('como está o dólar?', d, { now: NOW, today: hoje }).fala.texto;
  assert.match(dolar, /5,48/);
  assert.match(dolar, /\+0,42% no dia/);
  assert.match(dolar, /média dos últimos 20 dias/);
  assert.match(dolar, /em alta/);
  assert.match(dolar, /Atualizado/);
  assert.match(dolar, /apoio|recomendação|garant|certeza|consultor|errar/i);
  assert.match(conversar('a bolsa tende a subir?', d, { now: NOW, today: hoje }).fala.texto, /132\.000 pontos.*em queda/);
  const inv = conversar('vale a pena investir em dólar?', d, { now: NOW, today: hoje }).fala.texto;
  assert.match(inv, /CDI está em 10,65%/);
  assert.match(inv, /reserva de emergência/);
  assert.match(conversar('qual a selic?', d, { now: NOW, today: hoje }).fala.texto, /10,75%.*juro real.*6,55%/);
  assert.match(conversar('como está o mercado?', d, { now: NOW, today: hoje }).fala.texto, /Dólar.*Ibovespa.*Selic/);
  const velho = { ...d, mercado: { ...d.mercado, atualizadoEm: new Date(NOW - 6 * 86_400_000).toISOString() } };
  assert.match(conversar('como está o dólar?', velho, { now: NOW, today: hoje }).fala.texto, /desatualizado/);
});

test('bancos: ajuda na hora com a conta do CDI e pede o servidor pra comparação (fila)', () => {
  const d = dados();
  d.accounts = [...d.accounts, criarConta({ bank: 'PicPay', balanceCents: 100000 }, { now: new Date(NOW - 1) })];
  d.mercado = { atualizadoEm: new Date(NOW).toISOString(), moedas: {}, cdi: { valor: 12 } };
  const o = conversar('qual desses bancos rende mais?', d, { now: NOW, today: hoje });
  assert.match(o.fala.texto, /entre Nubank e PicPay/);
  assert.match(o.fala.texto, /CDI está em 12% ao ano/);
  assert.match(o.fala.texto, /% do CDI/);
  assert.deepEqual([...o.fala.filaIA.bancos], ['Nubank', 'PicPay']);
  assert.equal(entender('onde eu deixo meu dinheiro?', { categories: cats }).intent, 'bancos');
  assert.equal(entender('tive rendimentos?', { categories: cats }).intent, 'entradas', 'não confunde com entradas');
});

test('todas as 5 frases de aviso do mercado deixam claro que não é recomendação garantida', () => {
  for (const f of GERADORES.aviso_mercado.inteira.geral) assert.match(f, /recomendação|garant|consultor|errar|profissional/i, f);
});

test('"esqueci de lançar" + só o valor: pergunta "em quê?" antes de propor; depois junta (achado do GPT, 13/11)', () => {
  const d = dados();
  let r = conversar('esqueci de lançar um gasto', d, { now: NOW, today: hoje });
  r = conversar('79,90', d, { now: NOW + 1000, today: hoje, memory: r.memoria });
  assert.equal(r.fala.acao, null, 'não pode propor sem saber em quê');
  assert.match(r.fala.texto, /Foi em quê/);
  r = conversar('farmácia ontem', d, { now: NOW + 2000, today: hoje, memory: r.memoria });
  // com contas cadastradas ele ainda pergunta "como pagou?": a proposta fica guardada no rascunho até lá
  const acao = r.fala.acao || r.memoria.aguardando?.acao;
  assert.equal(acao?.tipo, 'registrar_gasto');
  assert.equal(acao.amountCents, 7990);
  assert.notEqual(acao.categoryId, 'outros');
  assert.notEqual(acao.date, hoje, 'ontem é ontem');
  // e dá pra desistir no meio
  let c = conversar('esqueci de lançar', d, { now: NOW, today: hoje });
  c = conversar('50', d, { now: NOW + 1000, today: hoje, memory: c.memoria });
  c = conversar('deixa pra depois', d, { now: NOW + 2000, today: hoje, memory: c.memoria });
  assert.equal(c.fala.acao, null);
  assert.match(c.fala.texto, /não anotei nada/);
});
