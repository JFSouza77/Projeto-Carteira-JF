// C.A.O.S. 1.14.0: pergunta o valor que faltou e "me explica melhor". Dados inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entender } from '../js/caos/conversa.js';
import { conversar } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES, createExpense, createIncome } from '../js/engine.js';

const cats = DEFAULT_CATEGORIES.map(c => ({ ...c }));
const NOW = new Date(2026, 10, 12, 12).getTime();
const hoje = '2026-11-12';
const dados = (comRenda = false) => ({
  expenses: [createExpense({ amountCents: 40000, categoryId: 'mercado', date: '2026-11-05' }, { categories: cats })],
  incomes: comRenda ? [createIncome({ amountCents: 300000, sourceId: 'salario', date: '2026-11-05' })] : [],
  categories: cats, accounts: [], compromissos: [],
  planos: [{ id: 'p1', nome: 'Geladeira', valorCents: 250000, month: '2026-11', feito: false }],
});
const papo = (frases, d) => {
  let memory; const saidas = [];
  for (const f of frases) { const r = conversar(f, d, { memory, now: NOW, today: hoje }); memory = r.memoria; saidas.push(r.fala); }
  return saidas;
};

test('gasto sem valor vira pergunta, e o número seguinte vira proposta', () => {
  assert.equal(entender('gastei não sei quanto de internet').intent, 'gasto_sem_valor');
  assert.notEqual(entender('quanto gastei no mercado?').intent, 'gasto_sem_valor');
  const [p, r] = papo(['gastei não sei quanto de internet', '79,90'], dados());
  assert.match(p.texto, /^Bora anotar! Quanto foi/);
  assert.equal(r.acao?.tipo, 'registrar_gasto');
  assert.equal(r.acao.amountCents, 7990);
  assert.match(r.texto, /Contas fixas/); // dica de conta de todo mês
});

test('número solto sem pergunta antes não vira gasto', () => {
  const [r] = papo(['79,90'], dados());
  assert.notEqual(r.acao?.tipo, 'registrar_gasto');
});

test('"me explica melhor" refaz o cabe no mês em passos', () => {
  const [, e] = papo(['cabe no mês?', 'me explica melhor'], dados(true));
  assert.match(e.texto, /Vou por partes/);
  assert.match(e.texto, /3\.000,00/);
  assert.match(e.texto, /400,00/);
  assert.match(e.texto, /2\.500,00/);
});

test('"não entendi" sem conversa antes pede o assunto', () => {
  const [e] = papo(['não entendi'], dados());
  assert.match(e.texto, /me diz o quê|Qual parte/);
});

// ---- P9 (C.A.O.S. 1.19.0): esqueci de lançar, data no registro, previsão com o que ainda vai cair, auditor ----
import { dataDoTexto } from '../js/caos/conversa.js';
import { createCompromisso, analyze, forecastMonth } from '../js/engine.js';

test('data do lançamento atrasado: ontem, anteontem, dia N (mês anterior se ainda não chegou)', () => {
  assert.equal(dataDoTexto('gastei 50 ontem', '2026-11-13'), '2026-11-12');
  assert.equal(dataDoTexto('gastei 50 anteontem', '2026-11-01'), '2026-10-30');
  assert.equal(dataDoTexto('paguei 120 de luz dia 10', '2026-11-13'), '2026-11-10');
  assert.equal(dataDoTexto('dia 20 gastei 35', '2026-11-13'), '2026-10-20');
  assert.equal(dataDoTexto('gastei 35', '2026-11-13'), '2026-11-13');
});

test('"esqueci de lançar" pergunta quanto, em quê e quando; o registro sai com a data e sem "dia" na descrição', () => {
  const [p, r] = papo(['esqueci de lançar uma coisa', 'paguei 120 de luz dia 10'], dados());
  assert.match(p.texto, /quanto foi, em quê e quando/);
  assert.equal(r.acao.date, '2026-11-10');
  assert.equal(r.acao.amountCents, 12000);
  assert.doesNotMatch(r.acao.note, /dia/i);
  assert.match(r.texto, /data de 10\/11/);
});

test('previsão já conta a assinatura que ainda vai cair; auditor pergunta no começo do mês', () => {
  const comp = createCompromisso({ nome: 'Streaming Teste', valorCents: 3990, tipo: 'assinatura', dia: 20, categoryId: 'streaming' }, { categories: cats, now: new Date(2026, 10, 1) });
  const f = forecastMonth([], '2026-11', '2026-11-13', [comp]);
  assert.equal(f.pendentesCents, 3990);
  assert.equal(f.projectedCents, 3990);
  const al = analyze({ expenses: [], categories: cats, compromissos: [comp] }, '2026-11-03').find(a => a.type === 'auditor_assinatura');
  assert.equal(al?.anoCents, 47880);
  assert.ok(!analyze({ expenses: [], categories: cats, compromissos: [comp] }, '2026-11-15').some(a => a.type === 'auditor_assinatura'));
});
