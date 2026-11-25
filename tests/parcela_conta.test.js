// 2.3.6.12 (JF, 25/11: "vai que eu esqueça que a 1ª parcela da geladeira vence dia 30. Como o caos vai me lembrar?"):
// parcelado fora do cartão vira conta a pagar com fim, e ele pergunta quando vence a 1ª
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { lerVencimento } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES, createCompromisso, ocorreNoMes, parcelaDoMes, situacaoCompromissos } from '../js/engine.js';

const now = Date.UTC(2026, 10, 25, 15);
const d = { expenses: [], incomes: [], accounts: [{ id: 'mp', bank: 'Mercado Pago', tipo: 'conta' }], categories: DEFAULT_CATEGORIES,
  budgets: {}, compromissos: [], planos: [{ id: 'p1', nome: 'Geladeira', valorCents: 250000, categoryId: 'moradia', month: '2026-11', feito: false }] };
const frase = 'Comprei a geladeira, 2313,28 no saldo do Mercado Pago e 3x de 87,70 no Mercado Parcelado';

test('pergunta quando vence a 1ª parcela e monta as contas a pagar', () => {
  const r1 = conversar(frase, d, { now });
  assert.match(r1.fala.texto, /quando vence a 1ª/);
  assert.equal(r1.fala.acao, null);
  const a = conversar('dia 30', d, { now, memory: r1.memoria }).fala.acao;
  assert.equal(a.tipo, 'registrar_varios');
  assert.equal(a.itens.length, 1);
  assert.equal(a.itens[0].amountCents, 231328);
  assert.deepEqual([a.parcelasConta.valorCents, a.parcelasConta.vezes, a.parcelasConta.dia, a.parcelasConta.inicioMes], [8770, 3, 30, '2026-11']);
  assert.equal(a.planoId, 'p1');
});

test('gasto novo no meio da pergunta não vira o dia', () => {
  const r1 = conversar(frase, d, { now });
  const f = conversar('gastei 30 no mercado', d, { now, memory: r1.memoria }).fala;
  assert.equal(f.acao?.parcelasConta, undefined);
});

test('lerVencimento: dia que já passou vai pro mês que vem; dd/mm e mês por extenso', () => {
  assert.deepEqual(lerVencimento('dia 30', '2026-11-25'), { dia: 30, inicioMes: '2026-11' });
  assert.deepEqual(lerVencimento('dia 10', '2026-11-25'), { dia: 10, inicioMes: '2026-12' });
  assert.deepEqual(lerVencimento('05/01', '2026-11-25'), { dia: 5, inicioMes: '2027-01' });
  assert.deepEqual(lerVencimento('dia 5 de dezembro', '2026-11-25'), { dia: 5, inicioMes: '2026-12' });
});

test('conta com fim: 3 parcelas e acabou, com lembrete de vencimento', () => {
  const c = createCompromisso({ nome: 'Geladeira (parcelado)', valorCents: 8770, categoryId: 'moradia', dia: 30, inicioMes: '2026-11', vezes: 3 });
  assert.deepEqual(['2026-11', '2026-12', '2027-01', '2027-02'].map(m => ocorreNoMes(c, m)), [true, true, true, false]);
  assert.equal(parcelaDoMes(c, '2027-01'), 3);
  const s = situacaoCompromissos([c], [], '2026-11-25')[0];
  assert.equal(s.status, 'aberto');
  assert.equal(s.diasParaVencer, 5);
});
