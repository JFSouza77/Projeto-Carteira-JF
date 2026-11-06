// Cérebro que interpreta (C.A.O.S. 1.6.0). Dados inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entender, corrigirDigitacao } from '../js/caos/conversa.js';
import { conversar, memoriaInicial } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES, createExpense } from '../js/engine.js';

const cats = DEFAULT_CATEGORIES.map(c => ({ ...c }));
const NOW = new Date(2026, 10, 20, 12).getTime();
const hoje = '2026-11-20';
const g = (v, c, d) => createExpense({ amountCents: v, categoryId: c, date: d }, { categories: cats });
const dados = () => ({
  expenses: [g(5000, 'mercado', '2026-11-03'), g(3000, 'mercado', '2026-10-10'), g(2500, 'delivery', '2026-11-18')],
  incomes: [], categories: cats, accounts: [], compromissos: [], planos: [],
});

test('corrige erro de digitação sem estragar palavra certa', () => {
  assert.equal(corrigirDigitacao('qunto gastie no mercdo'), 'quanto gastei no mercado');
  assert.equal(corrigirDigitacao('conta uma piada'), 'conta uma piada');
  assert.equal(corrigirDigitacao('posso comprar algo'), 'posso comprar algo');
  assert.equal(entender('qunto gastie no mercdo?', { categories: cats }).intent, 'gasto_total');
  assert.equal(entender('qual meu sado?', { categories: cats }).intent, 'saldo');
});

test('continua a conversa: "e no mês passado?", "e em delivery?"', () => {
  let mem = memoriaInicial(NOW);
  const a = conversar('quanto gastei no mercado?', dados(), { now: NOW, today: hoje, memory: mem });
  assert.match(a.fala.texto, /50,00/);
  const b = conversar('e no mês passado?', dados(), { now: NOW + 1, today: hoje, memory: a.memoria });
  assert.match(b.fala.texto, /30,00/);
  const c = conversar('e em delivery?', dados(), { now: NOW + 2, today: hoje, memory: b.memoria });
  assert.match(c.fala.texto, /Delivery|delivery/);
  assert.equal(c.fala.entendeu, true);
});

test('sem certeza: melhor palpite e pergunta de volta, em vez de "não entendi"', () => {
  const r = conversar('me fala aí das minhas despesas', dados(), { now: NOW, today: hoje });
  assert.match(r.fala.texto, /Acho que você quis saber/);
  assert.equal(r.fala.palpite, true);
  assert.equal(r.fala.entendeu, false); // com IA online, o app pergunta pra ela antes de usar o palpite
  const nada = conversar('blablabla xyz', dados(), { now: NOW, today: hoje });
  assert.equal(nada.fala.entendeu, false);
  assert.equal(nada.fala.palpite, false);
});

test('Me ajuda: cada opção leva ao passo a passo certo', () => {
  const casos = {
    'Como lanço um gasto?': 'gasto', 'Como registro meu cartão?': 'cartao', 'Como ponho orçamento?': 'orcamento',
    'Como adiciono uma conta?': 'conta', 'Como planejo o mês?': 'mes', 'Como mando foto do comprovante?': 'foto',
    'Como ligo os lembretes?': 'lembrete', 'Como faço backup?': 'backup', 'Como instalo o app?': 'instalar',
    'quero anotar um gasto': 'gasto', 'quero registrar meu cartão': 'cartao',
  };
  for (const [frase, tema] of Object.entries(casos)) {
    const r = entender(frase, { categories: cats });
    assert.equal(r.intent, 'tutorial', frase);
    assert.equal(r.tema, tema, frase);
  }
});

test('"explica o print do banco" pede a foto e marca o modo explicar (sem mandar nada sozinho)', () => {
  const r = conversar('não entendi o que o banco falou nessa tela', dados(), { now: NOW, today: hoje });
  assert.equal(r.fala.modoFoto, 'explicar');
  assert.match(r.fala.texto, /📎/);
  assert.equal(r.fala.filaIA, null);
});

// ---------- O que o JF achou de manhã (06/11) ----------
import { expandirGirias } from '../js/caos/conversa.js';
import { BANKS } from '../js/engine.js';

test('abreviações e gírias: "vc", "cê", "tbm", "q", "hj", "qnto"…', () => {
  assert.equal(expandirGirias('de onde vc veio'), 'de onde voce veio');
  assert.equal(entender('De onde vc veio??', { categories: cats }).intent, 'origem');
  assert.equal(entender('qnto eu gastei hj?', { categories: cats }).intent, 'gasto_total');
  assert.equal(entender('o q vc pode fazer?', { categories: cats }).intent, 'limites');
  assert.equal(entender('cê tem piada?', { categories: cats }).intent, 'piada');
});

test('"O que vc acha do JF?" tem resposta (e é diferente quando quem pergunta é o JF)', () => {
  const r = conversar('O que vc acha do JF?', dados(), { now: NOW, today: hoje });
  assert.equal(r.fala.entendeu, true);
  assert.match(r.fala.texto, /JF|criador|Perfil|fale bem/i);
  const jf = conversar('O que você acha do JF?', dados(), { now: NOW, today: hoje, perfil: { apelido: 'JF' }, rng: () => 0 });
  assert.equal(jf.fala.entendeu, true);
});

test('"o que você pode fazer?" não sai com rosto preocupado', () => {
  for (let i = 0; i < 50; i++) {
    const r = conversar('O que você pode fazer?', dados(), { now: NOW + i, today: hoje, mood: ['suave', 'normal', 'acido'][i % 3] });
    assert.notEqual(r.fala.rosto.emo, 'preocupado');
  }
});

test('pergunta avulsa demais: na 5ª seguida ele chama de volta pros números', () => {
  let mem = memoriaInicial(NOW);
  const qs = ['quem é você?', 'conta uma piada', 'de onde você veio?', 'você é legal demais', 'como você está?'];
  let ultima;
  for (const [i, q] of qs.entries()) {
    ultima = conversar(q, dados(), { now: NOW + i, today: hoje, memory: mem, mood: 'acido', rng: () => 0 });
    mem = ultima.memoria;
  }
  assert.equal(mem.avulsas, 5);
  assert.match(ultima.fala.texto, /finanças|gastos|mês|dinheiro|números/);
  const volta = conversar('quanto gastei este mês?', dados(), { now: NOW + 9, today: hoje, memory: mem });
  assert.equal(volta.memoria.avulsas, 0);
});

test('bancos em ordem alfabética, com Itaú Cartões; "dinheiro vivo" e "Outro" no fim', () => {
  const meio = BANKS.slice(0, -2);
  assert.deepEqual(meio, [...meio].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  assert.deepEqual(BANKS.slice(-2), ['Carteira (dinheiro vivo)', 'Outro']);
  for (const b of ['Itaú Cartões', 'Bradesco', 'Sicredi', 'Banco do Brasil']) assert.ok(BANKS.includes(b), b);
});

test('streaming tem categoria própria e "fala mal do JF" é entendido', async () => {
  const { DEFAULT_CATEGORIES: CATS } = await import('../js/engine.js');
  assert.ok(CATS.some(c => c.id === 'streaming'));
  for (const q of ['gastei 30 na netflix', 'paguei 40 do disney plus', 'gastei 25 no hbo max']) {
    assert.equal(entender(q, { categories: CATS }).categoria?.id, 'streaming', q);
  }
  assert.equal(entender('fala mal do JF', { categories: CATS }).intent, 'sobre_jf');
});
