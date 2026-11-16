// 16/11 (JF): "guardar a cada compra", como no Mercado Pago: R$ X saem da conta pro cofrinho a cada compra
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CATEGORIES as C, createAccount, createCartao, createExpense, editarConta, guardarACadaCompra, validarBackup } from '../js/engine.js';

const conta = createAccount({ bank: 'Mercado Pago', balanceCents: 10000 }, { id: 'mp1' });
const outra = createAccount({ bank: 'Inter', balanceCents: 50000 }, { id: 'in1' });
const cartao = createCartao({ bank: 'Mercado Pago', limiteCents: 100000, fechamentoDia: 5, vencimentoDia: 12 }, { id: 'mpk' });
const cartaoInter = createCartao({ bank: 'Inter', limiteCents: 100000, fechamentoDia: 5, vencimentoDia: 12 }, { id: 'ink' });
const base = createAccount({ bank: 'Mercado Pago', balanceCents: 0, subtipo: 'cofrinho' }, { id: 'cof1' });
const comRegra = quando => editarConta(base, { guardaCompra: { valorCents: 500, origemId: 'mp1', quando } }, { accounts: [conta, base] });
const gasto = (accountId, extra = {}) => createExpense({ amountCents: 5000, categoryId: 'restaurante', note: 'lanche', date: '2026-11-16', accountId, ...extra }, { categories: C, id: 'g1' });

test('compra no cartão do mesmo banco guarda R$ 5 tirando da conta', () => {
  const cof = comRegra('todas');
  const contas = [conta, outra, cartao, cartaoInter, cof];
  assert.deepEqual(guardarACadaCompra(gasto('mpk'), contas), [{ cofrinhoId: 'cof1', deId: 'mp1', amountCents: 500 }]);
  assert.deepEqual(guardarACadaCompra(gasto('mp1'), contas), [{ cofrinhoId: 'cof1', deId: 'mp1', amountCents: 500 }], 'débito/Pix da conta');
  assert.deepEqual(guardarACadaCompra(gasto('ink'), contas), [], 'cartão de outro banco');
  assert.deepEqual(guardarACadaCompra(gasto('in1'), contas), [], 'conta de outro banco');
  assert.deepEqual(guardarACadaCompra(gasto('mpk', { compromissoId: 'c1' }), contas), [], 'conta fixa não é compra');
});

test('só no crédito / só no débito, e sem saldo não guarda', () => {
  assert.deepEqual(guardarACadaCompra(gasto('mp1'), [conta, cartao, comRegra('credito')]), []);
  assert.equal(guardarACadaCompra(gasto('mpk'), [conta, cartao, comRegra('credito')]).length, 1);
  assert.deepEqual(guardarACadaCompra(gasto('mpk'), [conta, cartao, comRegra('debito')]), []);
  const pobre = { ...conta, balanceCents: 300 };
  assert.deepEqual(guardarACadaCompra(gasto('mpk'), [pobre, cartao, comRegra('todas')]), []);
});

test('regra vale só em cofrinho, valida o valor e passa no backup', () => {
  assert.throws(() => editarConta(base, { guardaCompra: { valorCents: 0, origemId: 'mp1' } }, { accounts: [conta, base] }), /Quanto guardar/);
  assert.throws(() => editarConta(base, { guardaCompra: { valorCents: 500, origemId: 'mpk' } }, { accounts: [conta, cartao, base] }), /de qual conta/);
  const virouCorrente = editarConta(comRegra('todas'), { subtipo: 'corrente' }, { accounts: [conta] });
  assert.equal(virouCorrente.guardaCompra, null);
  const backup = { versao: 1, app: 'carteira-jf', accounts: [conta, cartao, comRegra('credito')], expenses: [], incomes: [], categories: C };
  assert.doesNotThrow(() => validarBackup(backup));
});
