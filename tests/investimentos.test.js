// Investimentos (06/11, ideia do Bruno Levanti). Valores inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInvestimento, atualizarInvestimento, resumoInvestimentos, validarBackup, DEFAULT_CATEGORIES } from '../js/engine.js';
import { entender } from '../js/caos/conversa.js';
import { conversar } from '../js/caos/index.js';

const now = new Date(2026, 10, 6, 12);
const cdb = createInvestimento({ nome: 'CDB de teste', tipo: 'cdb', instituicao: 'Banco X', aplicadoCents: 100000, atualCents: 105000 }, { now, id: 'i1' });
const acao = createInvestimento({ nome: 'Ações de teste', tipo: 'acoes', aplicadoCents: 50000, atualCents: 45000 }, { now, id: 'i2' });

test('cria, atualiza e resume investimentos', () => {
  assert.equal(createInvestimento({ nome: 'Poupança', tipo: 'poupanca', aplicadoCents: 1000 }).atualCents, 1000);
  assert.throws(() => createInvestimento({ nome: '', aplicadoCents: 1000 }), /nome/);
  assert.throws(() => createInvestimento({ nome: 'X', tipo: 'loteria', aplicadoCents: 1000 }), /tipo/);
  const r = resumoInvestimentos([cdb, acao]);
  assert.equal(r.atualCents, 150000);
  assert.equal(r.aplicadoCents, 150000);
  assert.equal(r.ganhoCents, 0);
  assert.equal(r.porTipo[0].tipo, 'cdb');
  assert.equal(r.porTipo[0].pct, 70);
  const mais = atualizarInvestimento(cdb, { atualCents: 125000, aporteCents: 20000 });
  assert.equal(mais.aplicadoCents, 120000);
  assert.equal(cdb.aplicadoCents, 100000); // não mexe no original
});

test('C.A.O.S. responde "como estão meus investimentos?" sem recomendar nada', () => {
  assert.equal(entender('como estão meus investimentos?', {}).intent, 'meus_investimentos');
  assert.equal(entender('quanto eu tenho investido?', {}).intent, 'meus_investimentos');
  assert.equal(entender('vale a pena investir em bitcoin?', {}).intent, 'investir');
  const d = { expenses: [], incomes: [], categories: DEFAULT_CATEGORIES, accounts: [], compromissos: [], planos: [], investimentos: [cdb, acao] };
  const r = conversar('como estão meus investimentos?', d, { now: now.getTime(), today: '2026-11-06' });
  assert.match(r.fala.texto, /1\.500,00/);
  assert.match(r.fala.texto, /não recomendo/);
});

test('backup leva investimentos; investimento estragado é recusado', () => {
  const b = { app: 'carteira-jf', categories: DEFAULT_CATEGORIES.map(c => ({ ...c })), expenses: [], investimentos: [{ ...cdb }] };
  assert.equal(validarBackup(b).ok, true);
  assert.equal(validarBackup({ ...b, investimentos: [{ ...cdb, tipo: '<x>' }] }).ok, false);
});
