// 2.3.5.9 (André, amigo do JF, 19/11: "ele calcula CDI? a conta rende todo dia, atualiza sozinho?"): estimativa pelo
// CDI, por mês e por dia útil, sem mexer no saldo. E "2 mil" vale R$ 2.000 (antes virava R$ 2,00).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { entender } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES, createAccount } from '../js/engine.js';

const conta = createAccount({ bank: 'Banco Teste', balanceCents: 500000, rendeCdiPct: 100 }, { now: new Date(2026, 10, 1) });
const d = { expenses: [], incomes: [], accounts: [conta], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [], mercado: { cdi: { valor: 14.9 } } };
const now = Date.UTC(2026, 10, 19, 15);
const ent = t => entender(t, { categories: DEFAULT_CATEGORIES });

test('"quanto rende minha conta?" estima pelo CDI e não mexe no saldo', () => {
  const r = conversar('quanto rende minha conta?', d, { now });
  assert.equal(r.fala.intent, 'rende_conta');
  assert.match(r.fala.texto, /Banco Teste \(100% do CDI\): uns R\$\s58,\d\d por mês/);
  assert.match(r.fala.texto, /não mexo no seu saldo sozinho/);
  assert.ok(!r.fala.acao);
  const r2 = conversar('quanto rende 10 mil a 110% do CDI', d, { now });
  assert.match(r2.fala.texto, /R\$\s10\.000,00 a 110% do CDI/);
  const semCdi = conversar('quanto rende minha conta?', { ...d, mercado: null }, { now });
  assert.match(semCdi.fala.texto, /Só me falta o CDI/);
});

test('"mil" no valor', () => {
  assert.equal(ent('gastei 2 mil no aluguel').valor, 200000);
  assert.equal(ent('recebi 1,5 mil de salário').valor, 150000);
  assert.equal(ent('gastei 3 mil e 500 no carro').valor, 350000);
  assert.equal(ent('recebi 2.500 de salário').valor, 250000);
});
