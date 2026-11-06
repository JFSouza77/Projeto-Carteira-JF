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
