// Simulador "E se eu comprar?" (13/11). Dados inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simularCompra } from '../js/engine.js';

test('sem entrada nem orçamento: sem base', () => {
  assert.equal(simularCompra({ valorCents: 10000 }, { sobraCents: null }).situacao, 'sem_base');
});

test('cabe com folga, aperta e não cabe', () => {
  const base = { sobraCents: 100000, baseCents: 300000 };
  assert.equal(simularCompra({ valorCents: 20000 }, base).situacao, 'folga');
  const ap = simularCompra({ valorCents: 80000 }, base);
  assert.equal(ap.situacao, 'aperta');
  assert.equal(ap.sobraDepoisCents, 20000);
  const nc = simularCompra({ valorCents: 250000 }, base);
  assert.equal(nc.situacao, 'nao_cabe');
  assert.equal(nc.faltaCents, 150000);
  assert.equal(nc.parcelasQueCabem, 3);
});

test('parcelado: só a primeira parcela pesa no mês', () => {
  const r = simularCompra({ valorCents: 120000, parcelas: 10 }, { sobraCents: 50000, baseCents: 300000 });
  assert.equal(r.parcelaCents, 12000);
  assert.equal(r.sobraDepoisCents, 38000);
  assert.equal(r.situacao, 'folga');
});

test('sobra já negativa: não cabe e não sugere parcelas', () => {
  const r = simularCompra({ valorCents: 5000 }, { sobraCents: -1000, baseCents: 300000 });
  assert.equal(r.situacao, 'nao_cabe');
  assert.equal(r.parcelasQueCabem, null);
});

test('calendário da ofensiva: 28 dias, hoje por último, marca anotado e sem gasto', async () => {
  const { calendarioOfensiva } = await import('../js/engine.js');
  const hoje = '2026-11-13';
  const criado = new Date(2026, 10, 12, 10).getTime();
  const cal = calendarioOfensiva({ expenses: [{ createdAt: criado }], incomes: [], diasSemGasto: ['2026-11-10'] }, hoje);
  assert.equal(cal.length, 28);
  assert.equal(cal[27].data, hoje);
  assert.equal(cal[27].hoje, true);
  assert.equal(cal[0].data, '2026-10-17');
  assert.equal(cal.find(c => c.data === '2026-11-12').anotado, true);
  const s = cal.find(c => c.data === '2026-11-10');
  assert.equal(s.anotado && s.semGasto, true);
  assert.equal(cal.find(c => c.data === '2026-11-11').anotado, false);
});
