// Cofrinhos por dentro (JF, 13/11): rendimento em % do CDI, dinheiro guardado pra outra pessoa e raio-X do limite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAccount, createCartao, editarConta, rendimentoEstimado, raioXCartao, totalBalance, comReforco, validarBackup, DEFAULT_CATEGORIES } from '../js/engine.js';

const cartao = createCartao({ bank: 'PicPay', limiteCents: 50000, fechamentoDia: 5, vencimentoDia: 12 });
const cofre = createAccount({ bank: 'PicPay', nickname: 'Reserva', balanceCents: 300000, subtipo: 'cofrinho', reforcaCartaoId: cartao.id, rendeCdiPct: 102 });
const amigo = createAccount({ bank: 'PicPay', nickname: 'Do Léo', balanceCents: 80000, subtipo: 'cofrinho', paraQuem: 'Léo' });
const conta = createAccount({ bank: 'PicPay', balanceCents: 10000 });

test('raio-X do limite: o que é do cartão e o que vem de cada cofrinho', () => {
  const r = raioXCartao(cartao, [cartao, cofre, amigo, conta], [], [], []);
  assert.equal(r.limiteCartaoCents, 50000);
  assert.equal(r.doCofrinhoCents, 300000);
  assert.equal(r.limiteTotalCents, 350000);
  assert.deepEqual(r.cofrinhos.map(c => c.id), [cofre.id]);
  assert.equal(comReforco(cartao, [cartao, cofre], [], [], []).reforcoCents, 300000);
});

test('dinheiro guardado pra outra pessoa não entra no seu saldo total', () => {
  assert.equal(totalBalance([cartao, cofre, amigo, conta], [], [], []), 310000);
});

test('rendimento estimado: 102% do CDI', () => {
  const r = rendimentoEstimado(300000, 102, 10);
  assert.equal(r.taxaAnualPct, 10.2);
  assert.equal(r.anoCents, 30600);
  assert.ok(r.mesCents > 2400 && r.mesCents < 2500, String(r.mesCents)); // juros compostos: um pouco menos que 1/12
  assert.equal(rendimentoEstimado(300000, null, 10), null);
  assert.equal(rendimentoEstimado(300000, 102, null), null);
});

test('editar conta: muda tipo, cartão, rendimento e pra quem; não mexe no saldo', () => {
  const contas = [cartao, conta];
  const n = editarConta(conta, { subtipo: 'cofrinho', reforcaCartaoId: cartao.id, rendeCdiPct: '100', paraQuem: ' Ana ', nickname: 'Caixinha' }, { accounts: contas });
  assert.equal(n.subtipo, 'cofrinho');
  assert.equal(n.reforcaCartaoId, cartao.id);
  assert.equal(n.rendeCdiPct, 100);
  assert.equal(n.paraQuem, 'Ana');
  assert.equal(n.balanceCents, conta.balanceCents);
  assert.equal(n.balanceAt, conta.balanceAt);
  // virou corrente: deixa de reforçar o cartão
  assert.equal(editarConta(n, { subtipo: 'corrente' }, { accounts: contas }).reforcaCartaoId, null);
  assert.throws(() => editarConta(conta, { rendeCdiPct: 900 }, { accounts: contas }), /CDI/);
  assert.throws(() => editarConta(conta, { reforcaCartaoId: 'nao-existe' }, { accounts: contas }), /cartão/);
  assert.throws(() => editarConta(cartao, { nickname: 'x' }), /cartão/);
});

test('backup aceita os campos novos e recusa rendimento absurdo', () => {
  const base = { app: 'carteira-jf', expenses: [], incomes: [], categories: DEFAULT_CATEGORIES.map(c => ({ ...c })), accounts: [cartao, cofre, amigo] };
  assert.ok(validarBackup(base).ok, JSON.stringify(validarBackup(base).erros));
  const ruim = { ...base, accounts: [{ ...cofre, rendeCdiPct: 5000 }] };
  assert.equal(validarBackup(ruim).ok, false);
});
