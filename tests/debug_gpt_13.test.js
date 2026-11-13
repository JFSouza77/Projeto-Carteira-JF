// Achados do GPT de 13/11 (debugs das 9h e 13h). Dados inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CATEGORIES, createAccount, createCartao, createExpense, createTransferencia, validarBackup, raioXCartao, comReforco, totalBalance } from '../js/engine.js';

const cats = DEFAULT_CATEGORIES.map(c => ({ ...c }));
const base = extra => ({ app: 'carteira-jf', version: 1, categories: cats, expenses: [], incomes: [], ...extra });

test('backup: CDI do perfil fora da faixa é recusado', () => {
  for (const cdi of [5000, -1, 0, '10']) assert.equal(validarBackup(base({ perfil: { cdiAnualPct: cdi } })).ok, false, String(cdi));
  assert.equal(validarBackup(base({ perfil: { cdiAnualPct: 10.65, cdiEm: Date.now() } })).ok, true);
  assert.equal(validarBackup(base({ perfil: {} })).ok, true);
});

test('backup: conta corrente ou cartão não podem "aumentar limite"; só cofrinho apontando pra cartão', () => {
  const cartao = createCartao({ bank: 'PicPay', limiteCents: 50000, fechamentoDia: 5, vencimentoDia: 12 });
  const corrente = { ...createAccount({ bank: 'PicPay', balanceCents: 100000 }), reforcaCartaoId: cartao.id };
  assert.equal(validarBackup(base({ accounts: [cartao, corrente] })).ok, false);
  const outraConta = createAccount({ bank: 'PicPay', balanceCents: 0 });
  const cofreErrado = { ...createAccount({ bank: 'PicPay', balanceCents: 1000, subtipo: 'cofrinho' }), reforcaCartaoId: outraConta.id };
  assert.equal(validarBackup(base({ accounts: [cartao, outraConta, cofreErrado] })).ok, false);
  // e mesmo que chegue assim, o cálculo só soma cofrinho
  assert.equal(raioXCartao(cartao, [cartao, corrente]).limiteTotalCents, 50000);
  assert.equal(comReforco(cartao, [cartao, corrente]).reforcoCents, undefined);
});

test('remover conta não trava a restauração: lançamento e cofrinho órfãos são aceitos (vínculo do cofrinho cai)', () => {
  const conta = createAccount({ bank: 'Inter', balanceCents: 0 });
  const gasto = createExpense({ amountCents: 1000, categoryId: 'mercado', date: '2026-11-10', accountId: conta.id }, { categories: cats });
  const cofre = { ...createAccount({ bank: 'PicPay', balanceCents: 5000, subtipo: 'cofrinho' }), reforcaCartaoId: 'cartao-removido' };
  const v = validarBackup(base({ expenses: [gasto], accounts: [cofre] })); // a conta do gasto e o cartão do cofrinho foram removidos
  assert.equal(v.ok, true, JSON.stringify(v.erros));
  assert.equal(v.dados.accounts[0].reforcaCartaoId, null);
  assert.equal(cofre.reforcaCartaoId, 'cartao-removido', 'não mexe no arquivo original');
});

test('dinheiro de outra pessoa não entra em transferência (não vira seu)', () => {
  const minha = createAccount({ bank: 'Nubank', balanceCents: 0 });
  const doAmigo = createAccount({ bank: 'PicPay', balanceCents: 100000, subtipo: 'cofrinho', paraQuem: 'Léo' });
  assert.throws(() => createTransferencia({ deId: doAmigo.id, paraId: minha.id, amountCents: 50000 }, { accounts: [minha, doAmigo] }), /Léo/);
  assert.throws(() => createTransferencia({ deId: minha.id, paraId: doAmigo.id, amountCents: 50000 }, { accounts: [minha, doAmigo] }), /Léo/);
  assert.equal(totalBalance([minha, doAmigo], [], [], []), 0);
});
