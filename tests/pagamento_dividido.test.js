// 2.3.6.8 (JF, 25/11, a geladeira: parte no saldo do Mercado Pago, parte em 3x no Mercado Parcelado): compra paga em
// duas partes vira dois lançamentos (antes a parte à vista virava um parcelado de 3x)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { pagamentoDividido } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const now = Date.UTC(2026, 10, 25, 15);
const contas = [{ id: 'mp', bank: 'Mercado Pago', tipo: 'conta' }, { id: 'nu', bank: 'Nubank', tipo: 'cartao' }];
const d = { expenses: [], incomes: [], accounts: contas, categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [],
  planos: [{ id: 'p1', nome: 'Geladeira', valorCents: 250000, categoryId: 'moradia', month: '2026-11', feito: false }] };

test('à vista no saldo + parcelado: dois lançamentos, total certo e o plano', () => {
  const f = conversar('Comprei a geladeira, 2313,28 no saldo do Mercado Pago e 3x de 87,70 no Mercado Parcelado', d, { now }).fala;
  assert.equal(f.acao.tipo, 'registrar_varios');
  assert.equal(f.acao.planoId, 'p1');
  const [a, b] = f.acao.itens;
  assert.deepEqual([a.amountCents, a.forma, a.accountId, a.parcelas, a.categoryId], [231328, 'pix', 'mp', 1, 'moradia']);
  assert.deepEqual([b.amountCents, b.forma, b.parcelas], [26310, 'credito', 3]);
  assert.match(f.texto, /2\.576,38 em duas partes/);
});

test('pix + parcelado no cartão pega o cartão', () => {
  const r = pagamentoDividido('2313,28 no pix e mais 3x de 87,70 no nubank', contas);
  assert.equal(r.parcelado.accountId, 'nu');
  assert.equal(r.vista.forma, 'pix');
});

test('parcelado comum não vira dois', () => {
  assert.equal(pagamentoDividido('gastei 300 em 3x de 100 no nubank', contas), null);
  assert.equal(pagamentoDividido('tenis 200 em 2x de 100', contas), null);
});
