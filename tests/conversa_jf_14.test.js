// Conversa do JF em 14/11 (prints): hora virava valor, "não" caía na IA, gasto sem "gastei" não era entendido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { dataDoTexto } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES, createAccount, createExpense } from '../js/engine.js';

const inter = createAccount({ bank: 'Inter', balanceCents: 100000 }, { id: 'inter' });
const academia = createExpense({ amountCents: 8873, categoryId: 'saude', note: 'Power Fit', date: '2026-11-14' }, { categories: DEFAULT_CATEGORIES, id: 'pf' });
const d = { expenses: [academia], incomes: [], accounts: [inter], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [], planos: [], metas: [] };
const now = Date.UTC(2026, 10, 14, 17); // sábado
function papo(...frases) {
  let memory; const out = [];
  for (const t of frases) { const r = conversar(t, d, { memory, now }); memory = r.memoria; out.push(r.fala); }
  return out;
}

test('dia da semana vira a última data daquele dia', () => {
  assert.equal(dataDoTexto('foi na quarta-feira', '2026-11-14'), '2026-11-11');
  assert.equal(dataDoTexto('foi na quinta', '2026-11-14'), '2026-11-12');
  assert.equal(dataDoTexto('foi no sabado', '2026-11-14'), '2026-11-14');
});

test('"esse gasto foi na quarta 09:15" corrige a data do último gasto (e 09 não vira R$ 9)', () => {
  const [f] = papo('Esse gasto foi na quarta-feira 09:15 da manhã');
  assert.equal(f.intent, 'corrigir_data');
  assert.deepEqual(f.acao, { tipo: 'editar_data', expenseId: 'pf', date: '2026-11-11' });
  assert.doesNotMatch(f.texto, /9,00/);
});

test('hora não é valor: "gastei 30 no mercado às 10h" é R$ 30', () => {
  const [, f] = papo('gastei 30 no mercado às 10h', 'pix');
  assert.equal(f.acao.amountCents, 3000);
  assert.equal(f.acao.note, 'Mercado');
});

test('"Não" no "Pagou como?" cancela, sem ir pra IA', () => {
  const [, f] = papo('Gastei 41,70 no Hortifruti', 'Não');
  assert.equal(f.intent, 'pagamento_resposta');
  assert.match(f.texto, /não anotei/);
});

test('gasto sem "gastei", só com o jeito de pagar', () => {
  const [f] = papo("5,50 numa casquinha no McDonald's pelo débito do Inter");
  assert.equal(f.acao.amountCents, 550);
  assert.equal(f.acao.categoryId, 'restaurante');
  assert.equal(f.acao.forma, 'debito');
  assert.equal(f.acao.accountId, 'inter');
});

test('"7 reais no débito do Inter" pergunta em quê e junta a resposta', () => {
  const [a, b] = papo('7 reais no débito do Inter', 'cerveja');
  assert.match(a.texto, /Foi em quê/);
  assert.equal(b.acao.amountCents, 700);
  assert.equal(b.acao.categoryId, 'mercado');
  assert.equal(b.acao.forma, 'debito');
  assert.equal(b.acao.note, 'Cerveja');
});
