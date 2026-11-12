// Sugestões do Gemini e achados do JF na tarde de 06/11. Dados inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entender } from '../js/caos/conversa.js';
import { conversar, memoriaInicial, contexto } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES, createExpense, createCompromisso, forecastMonth, analyze } from '../js/engine.js';

const cats = DEFAULT_CATEGORIES.map(c => ({ ...c }));
const NOW = new Date(2026, 10, 20, 12).getTime();
const dados = () => ({ expenses: [], incomes: [], categories: cats, accounts: [], compromissos: [], planos: [] });

test('"quanto sobra do orçamento de mercado?" é orçamento, não "cabe no mês"', () => {
  assert.equal(entender('Quanto sobra do meu orçamento de mercado?', { categories: cats }).intent, 'orcamento');
  assert.equal(entender('cabe no mês?', { categories: cats }).intent, 'cabe');
  assert.equal(entender('quanto vai sobrar?', { categories: cats }).intent, 'cabe');
});

test('anotação curta sem verbo vira proposta de gasto: "uber 30", "50 no posto", "passei 40 no vr"', () => {
  for (const [q, cat] of [['uber 30', 'transporte'], ['50 no posto', 'transporte'], ['passei 40 no vr', 'restaurante'], ['comprei 30 na xopi', 'compras']]) {
    const r = entender(q, { categories: cats });
    assert.equal(r.intent, 'registrar_gasto', q);
    assert.equal(r.categoria?.id, cat, q);
  }
  assert.equal(entender('quanto gastei no cc?', { categories: cats }).intent, 'cartao');
  assert.notEqual(entender('quanto gastei em 30 dias?', { categories: cats }).intent, 'registrar_gasto');
});

test('memória: "e agora?" volta na pergunta que ficou sem resposta', () => {
  let mem = memoriaInicial(NOW);
  const a = conversar('blablabla xyz', dados(), { now: NOW, today: '2026-11-20', memory: mem });
  mem = a.memoria;
  assert.equal(mem.semResposta, 'blablabla xyz');
  const b = conversar('E agora?', dados(), { now: NOW + 1, today: '2026-11-20', memory: mem });
  assert.match(b.fala.texto, /blablabla xyz/);
  // sem pergunta pendente, ele pergunta o que a pessoa quer
  const c = conversar('E agora?', dados(), { now: NOW + 2, today: '2026-11-20', memory: memoriaInicial(NOW) });
  assert.equal(c.fala.entendeu, false);
  assert.doesNotMatch(c.fala.texto, /undefined|\{pergunta\}/);
});

test('"quanto ele te deve de salário?" é piada com o criador, não pergunta de entrada', () => {
  assert.equal(entender('Quanto ele te deve de salário?!', { categories: cats }).intent, 'salario_caos');
  assert.equal(entender('recebi 1500 de salário', { categories: cats }).intent, 'registrar_entrada');
  const r = conversar('quanto o JF te deve de salário?', dados(), { now: NOW, today: '2026-11-20' });
  assert.equal(r.fala.entendeu, true);
});

test('com o JF o C.A.O.S. é ácido (pedido dele); com os outros, o humor escolhido manda', () => {
  assert.ok(contexto({ humor: 'suave', emocao: 'calmo', now: NOW, perfil: { apelido: 'JF', seloCriador: true } }).has('humor_acido'));
  assert.ok(!contexto({ humor: 'suave', emocao: 'calmo', now: NOW, perfil: { apelido: 'Fulano' } }).has('humor_acido'));
  assert.ok(!contexto({ humor: 'suave', emocao: 'calmo', now: NOW, perfil: { apelido: 'JF' } }).has('humor_acido')); // só o nome não basta
});

test('previsão não conta conta fixa paga como ritmo diário', () => {
  const comp = createCompromisso({ nome: 'Aluguel', valorCents: 150000, tipo: 'conta', dia: 2, categoryId: 'moradia' }, { categories: cats, now: new Date(2026, 10, 1) });
  const g = [
    createExpense({ amountCents: 150000, categoryId: 'moradia', date: '2026-11-02', compromissoId: comp.id }, { categories: cats }),
    createExpense({ amountCents: 3000, categoryId: 'mercado', date: '2026-11-03' }, { categories: cats }),
  ];
  const f = forecastMonth(g, '2026-11', '2026-11-03');
  assert.equal(f.fixosCents, 150000);
  assert.equal(f.projectedCents, 150000 + 1000 * 30); // 30,00 em 3 dias = 10,00/dia
  // orçamento de moradia com o aluguel pago no dia 2 não dispara "ritmo alto"
  const comLimite = cats.map(c => (c.id === 'moradia' ? { ...c, budgetCents: 160000 } : c));
  const al = analyze({ expenses: g, categories: comLimite, compromissos: [comp] }, '2026-11-06');
  assert.ok(!al.some(a => a.type === 'ritmo_alto'));
});
