// Piso de segurança e salário (JF, 14/11): "no Banestes meu piso é R$ 2.000", "tive aumento?", "o extra da gasolina".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES, createAccount, createIncome, analyze, folgaDoPiso, dividirEntrePisos, editarConta, validarBackup } from '../js/engine.js';

const now = Date.UTC(2026, 10, 14, 17);
const ban = { ...createAccount({ bank: 'Banestes', balanceCents: 180000 }, { id: 'ban', now: new Date(2026, 10, 1) }), pisoCents: 200000 };
const c6 = { ...createAccount({ bank: 'C6 Bank', balanceCents: 320000 }, { id: 'c6', now: new Date(2026, 10, 1) }), pisoCents: 300000 };
const mp = createAccount({ bank: 'Mercado Pago', balanceCents: 300000 }, { id: 'mp', now: new Date(2026, 10, 13) });
const incomes = [
  createIncome({ amountCents: 500000, sourceId: 'salario', date: '2026-11-04', accountId: 'mp' }, { now: new Date(2026, 10, 14) }),
  createIncome({ amountCents: 20000, sourceId: 'freela', note: 'Extra da gasolina', date: '2026-11-10', accountId: 'mp' }, { now: new Date(2026, 10, 14) }),
  createIncome({ amountCents: 480000, sourceId: 'salario', date: '2026-10-04', accountId: 'mp' }, { now: new Date(2026, 9, 4) }),
];
const d = { expenses: [], incomes, accounts: [ban, c6, mp], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [], planos: [], metas: [] };
const fala = t => conversar(t, d, { now }).fala;

test('folga do piso e alerta perto/abaixo', () => {
  assert.deepEqual(folgaDoPiso(ban, 180000).abaixo, true);
  assert.equal(folgaDoPiso(c6, 320000).folgaCents, 20000);
  assert.equal(folgaDoPiso(mp, 300000), null);
  const tipos = analyze(d, '2026-11-14').map(a => `${a.type}:${a.accountId}`);
  assert.ok(tipos.includes('abaixo_do_piso:ban'));
  assert.ok(tipos.includes('perto_do_piso:c6'));
});

test('dividir: primeiro completa quem está abaixo do piso, o resto fica livre', () => {
  const r = dividirEntrePisos(500000, [{ id: 'ban', nome: 'Banestes', pisoCents: 200000, saldoCents: 180000 }, { id: 'mp', nome: 'MP', pisoCents: 0, saldoCents: 0 }]);
  assert.equal(r.passos[0].valorCents, 20000);
  assert.equal(r.livreCents, 480000);
});

test('piso entra no editar conta e no backup', () => {
  assert.equal(editarConta(mp, { pisoCents: 100000 }).pisoCents, 100000);
  assert.throws(() => editarConta(mp, { pisoCents: -5 }));
  const b = validarBackup({ app: 'carteira-jf', expenses: [], incomes: [], categories: DEFAULT_CATEGORIES, accounts: [{ ...mp, pisoCents: -1 }] });
  assert.equal(b.ok, false);
});

test('conversa: piso, folga e dividir salário', () => {
  const p = fala('meu piso no Mercado Pago é 1000');
  assert.deepEqual(p.acao, { tipo: 'definir_piso', accountId: 'mp', pisoCents: 100000 });
  assert.match(fala('quanto posso gastar no C6?').texto, /C6 Bank: dá pra gastar até R\$\s200,00/);
  assert.match(fala('me ajuda a dividir meu salário entre os bancos').texto, /R\$\s200,00 pro Banestes voltar ao piso/);
});

test('conversa: aumento, comparação e extras com descrição', () => {
  const c = fala('tive aumento?');
  assert.equal(c.intent, 'entradas_comparar');
  assert.match(c.texto, /mais R\$\s200,00 que o mês passado/);
  assert.match(c.texto, /Extra da gasolina/);
  assert.match(fala('recebi algum extra esse mês?').texto, /Extra da gasolina R\$\s200,00/);
  const e = fala('recebi 200 de extra da gasolina dia 10 no Mercado Pago');
  assert.equal(e.acao.note, 'Extra da gasolina');
  assert.equal(e.acao.accountId, 'mp');
  assert.equal(e.acao.date, '2026-11-10');
});
