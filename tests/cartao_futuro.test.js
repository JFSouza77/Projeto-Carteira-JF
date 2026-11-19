// 2.3.5.9 (André, amigo do JF, 19/11): "limite, quanto já gastou e quanto tá agendado pros meses seguintes".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES, createCartao, createExpense, faturasFuturas } from '../js/engine.js';

const now = new Date(2026, 10, 19, 12);
const c = createCartao({ bank: 'Banco Teste', limiteCents: 300000, fechamentoDia: 25, vencimentoDia: 5 }, { now });
const e1 = createExpense({ amountCents: 90000, categoryId: 'compras', note: 'Tênis', date: '2026-11-19', accountId: c.id, forma: 'credito', parcelas: 3 }, { categories: DEFAULT_CATEGORIES, now });
const e2 = createExpense({ amountCents: 15000, categoryId: 'mercado', date: '2026-11-18', accountId: c.id, forma: 'credito' }, { categories: DEFAULT_CATEGORIES, now });
const d = { expenses: [e1, e2], incomes: [], accounts: [c], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [] };
const fala = t => conversar(t, d, { now: now.getTime() }).fala.texto;

test('próximas faturas mês a mês (pelo vencimento), sem a aberta', () => {
  const p = faturasFuturas(c, [e1, e2], '2026-11-19');
  assert.deepEqual(p.map(x => [x.mes, x.valorCents]), [['2027-01', 30000], ['2027-02', 30000]]);
});

test('Chat: limite, agendado, mês pedido e parcelados', () => {
  assert.match(fala('como está meu cartão?'), /R\$\s1\.050,00 de R\$\s3\.000,00.*Já agendado em parcelas: R\$\s300,00 na fatura que vence em janeiro/);
  assert.match(fala('quanto tenho de limite?'), /sobram R\$\s1\.950,00/);
  assert.match(fala('quanto vem na fatura de dezembro?'), /vence em dezembro é a aberta: R\$\s450,00/);
  assert.match(fala('quanto vem na fatura de janeiro?'), /vence em janeiro, já tem R\$\s300,00/);
  assert.match(fala('o que tenho parcelado?'), /Tênis \(R\$\s900,00 em 3x\): faltam 2 de R\$\s300,00.*R\$\s600,00/);
});
