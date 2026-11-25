// 2.3.6.13 (JF, 25/11: "lembrando que eu parcelei… e se eu apaguei o chat? Parcelou o quê? Tem juros? De quanto?";
// "na hora de cadastrar uma conta também tem que ter o mercado parcelado, com o saldo")
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { jurosAoMes, lerPagamento, entender } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES, createCartao, accountLabel, BANKS } from '../js/engine.js';

const now = Date.UTC(2026, 10, 25, 15);
const base = expenses => ({ expenses, incomes: [], accounts: [], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [], planos: [] });
const geladeira = [
  { id: 'e1', amountCents: 231328, categoryId: 'moradia', note: 'Geladeira (à vista)', date: '2026-11-25', createdAt: 1, parcelas: 1, forma: 'pix' },
  { id: 'e2', amountCents: 26310, categoryId: 'moradia', note: 'Geladeira (parcelado)', date: '2026-11-25', createdAt: 2, parcelas: 3, forma: 'credito' },
];

test('"lembrando que eu parcelei" sem conversa antes: acha a geladeira nos lançamentos', () => {
  const d = base(geladeira);
  const r1 = conversar('lembrando que eu parcelei', d, { now }); // memória vazia = chat apagado
  assert.match(r1.fala.texto, /Achei: Geladeira/);
  assert.match(r1.fala.texto, /quando vence a 1ª/);
  const r2 = conversar('dia 30', d, { now, memory: r1.memoria });
  assert.match(r2.fala.texto, /teve juros/);
  const r3 = conversar('à vista era 2550', d, { now, memory: r2.memoria });
  assert.match(r3.fala.texto, /26,38 de juros/);
  assert.match(r3.fala.texto, /juro alto/);
  const a = r3.fala.acao;
  assert.equal(a.tipo, 'parcelar_lancamento');
  assert.equal(a.expenseId, 'e2');
  assert.deepEqual([a.parcelasConta.vezes, a.parcelasConta.valorCents, a.parcelasConta.dia, a.parcelasConta.inicioMes], [3, 8770, 30, '2026-11']);
});

test('compra anotada inteira: pergunta as parcelas e já vê os juros', () => {
  const d = base([{ id: 't1', amountCents: 300000, categoryId: 'compras', note: 'Tv', date: '2026-11-20', createdAt: 1 }]);
  const r1 = conversar('eu parcelei a tv', d, { now });
  assert.match(r1.fala.texto, /quantas vezes/);
  const r2 = conversar('10x de 330', d, { now, memory: r1.memoria });
  const r3 = conversar('dia 10', d, { now, memory: r2.memoria });
  assert.match(r3.fala.texto, /300,00 de juros/);
  assert.equal(r3.fala.acao.novoValorCents, 0);
});

test('sem compra recente: pergunta o que foi parcelado', () => {
  assert.match(conversar('parcelei o sofá', base([]), { now }).fala.texto, /Parcelou o quê/);
});

test('"comprei e parcelei" continua sendo compra nova', () => {
  assert.equal(entender('comprei uma tv e parcelei em 10x de 200', { categories: DEFAULT_CATEGORIES }).intent, 'registrar_gasto');
});

test('juros ao mês pela conta de banco', () => {
  assert.equal(jurosAoMes(300000, 10, 30000), 0);
  assert.ok(Math.abs(jurosAoMes(300000, 10, 33000) - 1.77) < 0.02);
});

test('crediário cadastrado em Contas: nome certo e "no Mercado Parcelado" cai nele', () => {
  const c = createCartao({ bank: 'Mercado Livre (Mercado Crédito)', limiteCents: 80000, fechamentoDia: 20, vencimentoDia: 30, modalidade: 'parcelado' }, { id: 'mc' });
  assert.match(accountLabel(c), /Crediário/);
  const pg = lerPagamento('3x de 87,70 no mercado parcelado', [{ id: 'mp', bank: 'Mercado Pago', tipo: 'conta' }, c]);
  assert.equal(pg.accountId, 'mc');
  assert.equal(pg.forma, 'credito');
  assert.ok(BANKS.includes('Shopee (SParcelado)'));
});
