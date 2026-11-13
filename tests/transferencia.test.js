// Transferência entre contas (13/11, repaginada do AI Studio). Dados inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAccount, createCartao, createTransferencia, accountBalance, totalBalance, validarBackup, DEFAULT_CATEGORIES } from '../js/engine.js';

const t0 = new Date(2026, 10, 1);
const cc = createAccount({ bank: 'Banco A', balanceCents: 100000 }, { id: 'cc', now: t0 });
const poup = createAccount({ bank: 'Banco A', subtipo: 'poupanca', balanceCents: 0 }, { id: 'poup', now: t0 });
const cartao = createCartao({ bank: 'Banco A', limiteCents: 50000, fechamentoDia: 5, vencimentoDia: 12 }, { id: 'cart', now: t0 });

test('transferência tira de uma conta, põe na outra e não muda o total', () => {
  const t = createTransferencia({ deId: 'cc', paraId: 'poup', amountCents: 30000, date: '2026-11-10' }, { accounts: [cc, poup], now: new Date(2026, 10, 10) });
  assert.equal(accountBalance(cc, [], [], [t]), 70000);
  assert.equal(accountBalance(poup, [], [], [t]), 30000);
  assert.equal(totalBalance([cc, poup], [], [], [t]), 100000);
});

test('não transfere pra mesma conta nem pro cartão de crédito', () => {
  assert.throws(() => createTransferencia({ deId: 'cc', paraId: 'cc', amountCents: 100 }, { accounts: [cc] }), /diferentes/);
  assert.throws(() => createTransferencia({ deId: 'cc', paraId: 'cart', amountCents: 100 }, { accounts: [cc, cartao] }), /cartão/);
});

test('backup guarda e confere as transferências', () => {
  const t = createTransferencia({ deId: 'cc', paraId: 'poup', amountCents: 30000, date: '2026-11-10' }, { accounts: [cc, poup] });
  const ok = validarBackup({ app: 'carteira-jf', version: 1, categories: DEFAULT_CATEGORIES, expenses: [], accounts: [cc, poup], transferencias: [t] });
  assert.ok(ok.ok, ok.erros?.join(' '));
  assert.equal(ok.dados.transferencias.length, 1);
  // conta removida (13/11): a transferência pra ela continua no histórico e o backup ainda restaura
  const orfa = validarBackup({ app: 'carteira-jf', version: 1, categories: DEFAULT_CATEGORIES, expenses: [], accounts: [cc], transferencias: [{ ...t, paraId: 'nao-existe' }] });
  assert.equal(orfa.ok, true);
  const ruim = validarBackup({ app: 'carteira-jf', version: 1, categories: DEFAULT_CATEGORIES, expenses: [], accounts: [cc], transferencias: [{ ...t, paraId: '<b>' }] });
  assert.equal(ruim.ok, false);
});
