// 2.3.6.6 (JF, 24/11: "saldo baixo" aparecia com R$ 10.748,61 nas contas): conta parada em R$ 0 não avisa, e com
// dinheiro nas outras contas (R$ 500 ou mais) o aviso não aparece
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, createAccount, DEFAULT_CATEGORIES } from '../js/engine.js';

const conta = (bank, cents, id) => createAccount({ bank, balanceCents: cents }, { id, now: new Date(2026, 10, 1) });
const alerta = accounts => analyze({ expenses: [], incomes: [], categories: DEFAULT_CATEGORIES, accounts }, '2026-11-24').find(a => a.type === 'saldo_baixo');

test('conta baixa com dinheiro nas outras não vira aviso', () => {
  assert.equal(alerta([conta('Inter', 3200, 'in'), conta('Nubank', 1071661, 'nu')]), undefined);
});

test('conta parada em R$ 0 não vira aviso', () => {
  assert.equal(alerta([conta('Inter', 0, 'in')]), undefined);
});

test('pouco dinheiro em tudo continua avisando', () => {
  assert.match(alerta([conta('Inter', 3200, 'in'), conta('Nubank', 20000, 'nu')])?.accountName || '', /Inter/);
});
