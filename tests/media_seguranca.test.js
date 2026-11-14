// Média de segurança dos bancos (JF, 14/11): só bancos com piso entram; quando estoura; de onde transferir; comprar pelo banco X.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES, createAccount, createExpense, analyze, resumoPisos, sugerirTransferencias } from '../js/engine.js';

const now = Date.UTC(2026, 10, 14, 17);
const ban = { ...createAccount({ bank: 'Banestes', balanceCents: 180000 }, { id: 'ban', now: new Date(2026, 10, 1) }), pisoCents: 200000 };
const c6 = { ...createAccount({ bank: 'C6 Bank', balanceCents: 400000 }, { id: 'c6', now: new Date(2026, 10, 1) }), pisoCents: 300000 };
const mp = createAccount({ bank: 'Mercado Pago', balanceCents: 300000 }, { id: 'mp', now: new Date(2026, 10, 1) });
const expenses = [createExpense({ amountCents: 14000, categoryId: 'mercado', date: '2026-11-10', accountId: 'c6' }, { now: new Date(2026, 10, 10) })];
const d = { expenses, incomes: [], accounts: [ban, c6, mp], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [], planos: [], metas: [] };
const fala = t => conversar(t, d, { now }).fala;

test('resumo: só bancos com piso, folga total e dias até estourar', () => {
  const r = resumoPisos(d.accounts, expenses, [], [], '2026-11-14');
  assert.deepEqual(r.comPiso.map(c => c.id), ['ban', 'c6']);
  assert.equal(r.pisoTotalCents, 500000);
  assert.equal(r.saldoTotalCents, 566000);
  assert.equal(r.folgaTotalCents, 66000);
  assert.equal(r.gastoDiaCents, 1000); // 140 em 14 dias
  assert.equal(r.diasAteEstourar, 66);
  assert.equal(r.status, 'ok');
});

test('transferência sugerida sai de quem tem folga pra quem está abaixo', () => {
  const r = resumoPisos(d.accounts, expenses, [], [], '2026-11-14');
  const t = sugerirTransferencias(r.contas);
  assert.equal(t.passos[0].para, 'Banestes');
  assert.equal(t.passos[0].valorCents, 20000);
  assert.equal(t.aindaFaltaCents, 0);
});

test('alerta geral quando a média estoura', () => {
  const c6baixo = { ...c6, balanceCents: 250000 };
  const tipos = analyze({ ...d, accounts: [ban, c6baixo, mp] }, '2026-11-14').map(a => a.type);
  assert.ok(tipos.includes('piso_geral_estourado'));
  assert.ok(!analyze(d, '2026-11-14').some(a => a.type.startsWith('piso_geral')));
});

test('conversa: média, de onde transferir e comprar pelo banco', () => {
  const m = fala('como tá minha média de segurança?');
  assert.equal(m.intent, 'media_seguranca');
  assert.match(m.texto, /Banestes e C6 Bank/);
  assert.match(m.texto, /acaba em 66 dias/);
  assert.match(m.texto, /passar R\$\s200,00 do (C6 Bank|Mercado Pago) pro Banestes/);
  assert.match(fala('qual banco tem folga?').texto, /pro Banestes/);
  assert.match(fala('posso comprar 300 pelo Banestes?').texto, /abaixo do piso/);
  assert.match(fala('posso comprar 300 pelo C6?').texto, /C6 Bank fica com R\$\s3\.560,00, ainda R\$\s560,00 acima do piso/);
});
