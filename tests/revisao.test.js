// Revisão do ChatGPT (06/11/2026): backup e pagamento parcial. Dados inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CATEGORIES, createExpense, createIncome, createAccount, createCompromisso, createPlano,
  situacaoCompromissos, analisarPlanejamento, analyze, validarBackup,
} from '../js/engine.js';

const cats = DEFAULT_CATEGORIES.map(c => ({ ...c }));
const now = new Date(2026, 10, 5, 12);
const conta = createAccount({ bank: 'Nubank', nickname: 'Teste', balanceCents: 100000 }, { now, id: 'conta-1' });
const fatura = createCompromisso({ nome: 'Fatura de teste', valorCents: 50000, tipo: 'fatura', dia: 20, inicioMes: '2026-11' }, { now, id: 'comp-1', categories: cats });
const backupBom = () => ({
  app: 'carteira-jf', version: 3,
  categories: cats.map(c => ({ ...c })),
  expenses: [createExpense({ amountCents: 1234, categoryId: 'mercado', date: '2026-11-03', accountId: 'conta-1' }, { categories: cats, now, id: 'g-1' })],
  incomes: [createIncome({ amountCents: 300000, sourceId: 'salario', date: '2026-11-01' }, { now, id: 'e-1' })],
  accounts: [{ ...conta }],
  compromissos: [{ ...fatura }],
  planos: [createPlano({ nome: 'Tênis', valorCents: 20000, categoryId: 'compras', month: '2026-11' }, { now, id: 'p-1' })],
  perfil: { nome: 'Fulano', apelido: 'Fu', tratamento: 'descontraido', foco: ['Guardar dinheiro'] },
});

test('backup certo passa e volta com cópias', () => {
  const b = backupBom();
  const v = validarBackup(b);
  assert.equal(v.ok, true, v.erros.join(' | '));
  assert.equal(v.dados.expenses.length, 1);
  assert.notEqual(v.dados.expenses[0], b.expenses[0]);
});

test('backup com código escondido no id ou no emoji da categoria é recusado', () => {
  for (const mexer of [
    b => { b.categories[0].id = '"><img src=x onerror=alert(1)>'; },
    b => { b.categories[0].emoji = '<img src=x onerror=alert(1)>'; },
    b => { b.categories[0].emoji = '"onmouseover="x'; },
    b => { b.categories[0].name = 42; },
  ]) {
    const b = backupBom();
    mexer(b);
    assert.equal(validarBackup(b).ok, false);
    assert.equal(validarBackup(b).dados, null);
  }
});

test('backup com gasto inválido é recusado (valor, data, mês, categoria, conta, compromisso)', () => {
  for (const mexer of [
    e => { e.amountCents = 0; },
    e => { e.amountCents = -5000; },
    e => { e.amountCents = 12.5; },
    e => { e.date = '2026-02-30'; e.month = '2026-02'; },
    e => { e.month = '2026-10'; },
    e => { e.categoryId = 'nao-existe'; },
    e => { e.compromissoId = 'comp-fantasma'; },
    e => { e.id = '<b>'; },
  ]) {
    const b = backupBom();
    mexer(b.expenses[0]);
    assert.equal(validarBackup(b).ok, false, JSON.stringify(b.expenses[0]));
  }
});

test('backup com entrada, conta, compromisso, plano ou perfil estragados é recusado', () => {
  for (const mexer of [
    b => { b.incomes[0].amountCents = -1; },
    b => { b.incomes[0].sourceId = 'loteria'; },
    b => { b.accounts[0].balanceCents = '100'; },
    b => { b.compromissos[0].tipo = 'xss'; },
    b => { b.compromissos[0].categoryId = 'nao-existe'; },
    b => { b.planos[0].valorCents = 0; },
    b => { b.planos[0].month = '2026-13'; },
    b => { b.perfil = { apelido: 99 }; },
    b => { b.expenses.push({ ...b.expenses[0] }); }, // id repetido
    b => { b.categories = []; },
    b => { b.expenses = 'nada'; },
  ]) {
    const b = backupBom();
    mexer(b);
    assert.equal(validarBackup(b).ok, false);
  }
  for (const lixo of [null, 42, [], 'texto', { app: 'outro-app' }]) assert.equal(validarBackup(lixo).ok, false);
});

test('pagamento parcial não quita o compromisso e reserva o que falta', () => {
  const pagar = (valor, id) => createExpense({ amountCents: valor, categoryId: 'contas', date: '2026-11-04', compromissoId: 'comp-1' }, { categories: cats, now, id });
  const parcial = [pagar(20000, 'x1')];
  const s = situacaoCompromissos([fatura], parcial, '2026-11-05')[0];
  assert.equal(s.status, 'aberto');
  assert.equal(s.parcial, true);
  assert.equal(s.pagoCents, 20000);
  assert.equal(s.faltaCents, 30000);

  const incomes = [createIncome({ amountCents: 100000, sourceId: 'salario', date: '2026-11-01' }, { now, id: 'r1' })];
  const a = analisarPlanejamento({ expenses: parcial, incomes, categories: cats, compromissos: [fatura] }, '2026-11-05');
  assert.equal(a.compPendentesCents, 30000);
  assert.equal(a.sobraCents, 100000 - 20000 - 30000); // 500 de fatura no total, nunca menos

  // dois pagamentos que somam o valor: quitado
  const dois = [...parcial, pagar(30000, 'x2')];
  assert.equal(situacaoCompromissos([fatura], dois, '2026-11-05')[0].status, 'pago');
  // tirando um deles, volta a faltar
  assert.equal(situacaoCompromissos([fatura], dois.filter(e => e.id !== 'x2'), '2026-11-05')[0].faltaCents, 30000);
  // pagou a mais: quitado, sem reserva negativa
  const mais = [pagar(60000, 'x3')];
  const am = analisarPlanejamento({ expenses: mais, incomes, categories: cats, compromissos: [fatura] }, '2026-11-05');
  assert.equal(am.compPendentesCents, 0);
  assert.equal(situacaoCompromissos([fatura], mais, '2026-11-05')[0].faltaCents, 0);
});

test('alerta de vencimento de compromisso parcial avisa só o que falta', () => {
  const parcial = [createExpense({ amountCents: 20000, categoryId: 'contas', date: '2026-11-04', compromissoId: 'comp-1' }, { categories: cats, now, id: 'y1' })];
  const al = analyze({ expenses: parcial, categories: cats, compromissos: [fatura], accounts: [], incomes: [] }, '2026-11-18');
  const a = al.find(x => x.type === 'compromisso_vence');
  assert.ok(a);
  assert.equal(a.valorCents, 30000);
});

// ---------- O que o JF achou testando (05/11 à noite) ----------
import { entender, responder } from '../js/caos/conversa.js';
import { BANKS, accountLabel } from '../js/engine.js';

test('ele entende "guardado no total" e "o que mais tenho planejado"', () => {
  const casos = {
    'Quanto eu tenho guardado no total?!': 'saldo',
    'quanto poupei?': 'saldo',
    'quanto tem nas contas': 'saldo',
    'O que mais eu tenho planejado para esse mês?!': 'planos',
    'o que tenho programado pro mes': 'planos',
    'quanto tenho pra pagar?': 'pagar',
    'quanto gastei este mês?': 'gasto_total',
    'como guardar dinheiro?': 'dica',
  };
  for (const [frase, intent] of Object.entries(casos)) assert.equal(entender(frase, { categories: cats }).intent, intent, frase);
});

test('"o que mais tenho planejado" traz planos e compromissos que faltam', () => {
  const planos = [createPlano({ nome: 'Tênis', valorCents: 20000, categoryId: 'compras', month: '2026-11' }, { now, id: 'p-9' })];
  const r = responder(entender('O que mais eu tenho planejado para esse mês?!', { categories: cats }),
    { expenses: [], incomes: [], categories: cats, accounts: [], compromissos: [fatura], planos }, { today: '2026-11-05' });
  assert.match(r.fato, /Tênis/);
  assert.match(r.fato, /Fatura de teste/);
});

test('banco "Outro" mostra só o apelido; lista de bancos em múltiplo de 5 com os que faltavam', () => {
  assert.equal(accountLabel({ bank: 'Outro', nickname: 'Cofrinho' }), 'Cofrinho');
  assert.equal(accountLabel({ bank: 'Outro', nickname: '' }), 'Outro banco');
  assert.equal(accountLabel({ bank: 'Nubank', nickname: 'Principal' }), 'Nubank · Principal');
  assert.equal(BANKS.length % 5, 0);
  for (const b of ['Banestes', 'BRB', 'Banco do Nordeste', 'Agibank', 'Will Bank']) assert.ok(BANKS.includes(b), b);
  assert.equal(new Set(BANKS).size, BANKS.length);
});
