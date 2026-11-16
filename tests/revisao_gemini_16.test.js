// Revisão do Gemini (16/11), conferida pelo Wally no código: o que era bug de verdade e ficou corrigido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar, humorParaIA } from '../js/caos/index.js';
import { entender, corrigirDigitacao } from '../js/caos/conversa.js';
import { GERADORES } from '../js/caos/falas.js';
import { DEFAULT_CATEGORIES as C, createAccount, createExpense } from '../js/engine.js';

const now = Date.UTC(2026, 10, 16, 15);
const base = { incomes: [], budgets: {}, compromissos: [], planos: [], metas: [], categories: C };

test('corretor não troca palavra comum por palavra de dinheiro (gosto, gato, mesa, maio, parar, home)', () => {
  for (const [frase, certa] of [['eu gosto de voce', 'gosto'], ['gastei 80 com o gato', 'gato'], ['comprei uma mesa de 300', 'mesa'],
    ['quanto gastei em maio', 'maio'], ['quero parar de gastar', 'parar'], ['home office', 'home']]) {
    assert.ok(corrigirDigitacao(frase).split(' ').includes(certa), frase);
  }
  assert.equal(corrigirDigitacao('qunto gastie no mercdo'), 'quanto gastei no mercado', 'erro de verdade continua corrigido');
  assert.equal(entender('qual meu sado?', { categories: C }).intent, 'saldo', 'letra que faltou ainda é corrigida');
});

test('C6 não vira R$ 6; jades e VP; jogo vai pra Jogos; maluco como adjetivo não é apelido', () => {
  assert.notEqual(entender('ja paguei a fatura do c6', { categories: C }).valor, 600);
  assert.equal(entender('comprei 980 jades estelares por 75 reais', { categories: C }).valor, 7500);
  assert.equal(entender('quanto tá valendo 1000 VP?', { categories: C }).intent, 'moeda_jogo');
  assert.equal(entender('gastei 50 num jogo', { categories: C }).categoria?.id, 'jogos');
  assert.ok(!entender('gastei 80 igual um maluco no mercado', { categories: C }).apelido);
  assert.ok(entender('fala maluco, quanto gastei?', { categories: C }).apelido, 'chamando ele continua sendo apelido');
});

test('Ácido não some depois de umas falas (gerador)', () => {
  const g = createExpense({ amountCents: 45000, categoryId: 'lazer', date: '2026-11-16' }, { categories: C, id: 'g1' });
  const d = { ...base, expenses: [g], accounts: [] };
  const acid = [...GERADORES.resposta.abre.humor_acido, ...GERADORES.resposta.fecho.humor_acido, ...Object.values(GERADORES.cutucada.zoa).flat()];
  let m, n = 0, x = 3;
  const rng = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 60; i++) { const r = conversar('quanto gastei este mês?', d, { memory: m, mood: 'acido', now: now + i * 60_000, rng }); m = r.memoria; if (acid.some(a => `${r.fala.texto} ${r.fala.posTexto || ''}`.includes(a))) n++; }
  assert.ok(n >= 45, `só ${n} de 60 com zoeira`);
});

test('nome não entra no silêncio nem põe banco em minúscula; humor certo na IA', () => {
  const a = createAccount({ bank: 'Nubank', balanceCents: 10000 }, { id: 'n1' });
  const d = { ...base, expenses: [], accounts: [a] };
  const r = conversar('quanto tem no nubank?', d, { now, perfil: { apelido: 'JF' } });
  assert.doesNotMatch(r.fala.texto, /JF, nubank/);
  assert.equal(humorParaIA('acido', { tratamento: 'formal' }), 'suave');
  assert.equal(humorParaIA('acido', { aniversario: '2018-01-01' }, now), 'normal');
  assert.equal(humorParaIA('suave', { seloCriador: true }), 'acido');
  assert.equal(humorParaIA('normal', null), 'normal');
});

test('entrada prevista: dia de hoje é hoje, dia 31 vira o último, "na sexta" é a próxima', () => {
  const d = { ...base, expenses: [], accounts: [] };
  const data = f => conversar(f, d, { today: '2026-11-16', now }).fala.acao?.date;
  assert.equal(data('vou receber 500 dia 16'), '2026-11-16');
  assert.equal(data('vou receber 500 dia 31'), '2026-11-30');
  assert.equal(data('vou receber 500 na sexta'), '2026-11-20');
});

test('aperto sem palavrão fica no celular; corrigir valor, transferir e "só de Uber"', () => {
  for (const f of ['to liso', 'acabou meu dinheiro', 'esse mes ta osso']) assert.equal(entender(f, { categories: C }).intent, 'aperto', f);
  const a1 = createAccount({ bank: 'Inter', balanceCents: 100000 }, { id: 'a1' }), a2 = createAccount({ bank: 'C6 Bank', balanceCents: 5000 }, { id: 'a2' });
  const g1 = createExpense({ amountCents: 5000, categoryId: 'transporte', note: 'uber', date: '2026-11-16' }, { categories: C, id: 'g1', now: new Date('2026-11-16T10:00:00') });
  const g2 = createExpense({ amountCents: 20000, categoryId: 'transporte', note: 'gasolina', date: '2026-11-15' }, { categories: C, id: 'g2', now: new Date('2026-11-15T10:00:00') });
  const d = { ...base, expenses: [g2, g1], accounts: [a1, a2] };
  const fala = f => conversar(f, d, { today: '2026-11-16', now }).fala;
  assert.deepEqual(fala('errei, foi 45, não 50').acao, { tipo: 'editar_valor', expenseId: 'g1', amountCents: 4500 });
  assert.equal(fala('transferi 200 do inter pro c6').acao.tipo, 'transferir');
  assert.match(fala('quanto gastei de uber este mês?').texto, /Só de uber: R\$\s50,00/);
});
