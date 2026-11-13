// Orçamento diário ideal (13/11). Dados inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progressoOrcamentoDiario } from '../js/engine.js';

const g = (amountCents, date, extra = {}) => ({ amountCents, date, month: date.slice(0, 7), categoryId: 'mercado', ...extra });
const hoje = '2026-11-13';

test('sem limite', () => {
  const r = progressoOrcamentoDiario([g(1000, hoje)], null, hoje);
  assert.equal(r.status, 'sem_limite');
  assert.equal(r.gastoHojeCents, 1000);
});

test('ok, atenção e estourado; só conta hoje', () => {
  const lista = [g(3000, hoje), g(9999, '2026-11-12')];
  assert.equal(progressoOrcamentoDiario(lista, 10000, hoje).status, 'ok');
  assert.equal(progressoOrcamentoDiario([g(8000, hoje)], 10000, hoje).status, 'atencao');
  const e = progressoOrcamentoDiario([g(12500, hoje)], 10000, hoje);
  assert.equal(e.status, 'estourado');
  assert.equal(e.excedidoCents, 2500);
  assert.equal(e.barPct, 100);
  assert.equal(e.restanteCents, 0);
});

test('conta rachada conta só a minha parte', () => {
  const r = progressoOrcamentoDiario([g(9000, hoje, { racha: [{ id: 'a', nome: 'Ana', valorCents: 6000 }] })], 10000, hoje);
  assert.equal(r.gastoHojeCents, 3000);
});
