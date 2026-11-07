// Ofensiva (dias seguidos anotando) e Rachadinha (conta dividida com amigos), 07/11.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ofensiva, dividirIgual, valorProprio, aReceber, marcarRecebido, spentIn, summarizeMonth, accountBalance, analyze,
  validarBackup, DEFAULT_CATEGORIES, MARCOS_OFENSIVA, sumInRange,
} from '../js/engine.js';
import { entender, responder } from '../js/caos/conversa.js';
import { reagir } from '../js/caos/index.js';

const ms = (dia, h = 12) => new Date(2026, 10, dia, h).getTime();
const gasto = (over = {}) => ({ id: 'g1', amountCents: 18200, categoryId: 'restaurante', note: 'pizza', date: '2026-11-05', month: '2026-11', accountId: null, imageId: null, compromissoId: null, createdAt: ms(5), ...over });

test('ofensiva: conta dias seguidos até hoje (ou ontem) e guarda o recorde', () => {
  const ex = [5, 6, 7].map(d => gasto({ id: `g${d}`, createdAt: ms(d) }));
  assert.deepEqual(ofensiva({ expenses: ex }, '2026-11-07'), { dias: 3, hojeFeito: true, recorde: 3 });
  // ontem ainda vale: a ofensiva só zera se passar um dia inteiro
  assert.deepEqual(ofensiva({ expenses: ex }, '2026-11-08'), { dias: 3, hojeFeito: false, recorde: 3 });
  assert.equal(ofensiva({ expenses: ex }, '2026-11-09').dias, 0);
  assert.equal(ofensiva({ expenses: ex }, '2026-11-09').recorde, 3);
});

test('ofensiva: "hoje não gastei nada" conta e atravessa a virada do mês', () => {
  const ex = [gasto({ createdAt: new Date(2026, 9, 31, 20).getTime() })];
  const o = ofensiva({ expenses: ex, diasSemGasto: ['2026-11-01', '2026-11-02'] }, '2026-11-02');
  assert.equal(o.dias, 3);
  assert.ok(MARCOS_OFENSIVA.includes(3) && MARCOS_OFENSIVA.includes(7) && MARCOS_OFENSIVA.includes(30));
});

test('rachadinha: divide igual, a sobra do arredondamento fica comigo', () => {
  const r = dividirIgual(18200, ['Ana', 'Bia', 'Caio'], { now: 1 });
  assert.deepEqual(r.map(p => p.valorCents), [4550, 4550, 4550]);
  assert.equal(valorProprio(gasto({ racha: r })), 4550);
  const r2 = dividirIgual(1000, ['Ana', 'Bia'], { now: 1 });
  assert.deepEqual(r2.map(p => p.valorCents), [333, 333]);
  assert.equal(valorProprio(gasto({ amountCents: 1000, racha: r2 })), 334);
  assert.throws(() => dividirIgual(1000, []), /com quem/);
});

test('rachadinha: orçamento, categoria e conversa contam só a minha parte', () => {
  const ex = [gasto({ racha: dividirIgual(18200, ['Ana', 'Bia', 'Caio'], { now: 1 }) }), gasto({ id: 'g2', amountCents: 3000 })];
  assert.equal(spentIn(ex, '2026-11', 'restaurante'), 4550 + 3000);
  const cats = DEFAULT_CATEGORIES.map(c => (c.id === 'restaurante' ? { ...c, budgetCents: 10000 } : c));
  assert.equal(summarizeMonth(ex, cats, '2026-11').totalCents, 7550);
  assert.equal(sumInRange(ex, { from: '2026-11-01', to: '2026-11-30' }).totalCents, 7550);
});

test('rachadinha: o total sai da conta; o Pix do amigo volta pro saldo', () => {
  const conta = { id: 'c1', balanceCents: 100000, balanceAt: ms(1) };
  let e = gasto({ accountId: 'c1', racha: dividirIgual(18200, ['Ana', 'Bia', 'Caio'], { now: 1 }) });
  assert.equal(accountBalance(conta, [e], []), 100000 - 18200);
  e = marcarRecebido(e, e.racha[0].id, ms(6));
  assert.equal(accountBalance(conta, [e], []), 100000 - 18200 + 4550);
  const pend = aReceber([e]);
  assert.equal(pend.itens.length, 2);
  assert.equal(pend.totalCents, 9100);
});

test('rachadinha: lembrete de cobrança depois de 3 dias', () => {
  const e = gasto({ racha: dividirIgual(18200, ['Ana', 'Bia'], { now: 1 }) });
  const cats = DEFAULT_CATEGORIES;
  assert.ok(!analyze({ expenses: [e], categories: cats }, '2026-11-06').some(a => a.type === 'a_receber'));
  const a = analyze({ expenses: [e], categories: cats }, '2026-11-08').find(x => x.type === 'a_receber');
  assert.ok(a);
  assert.equal(a.quem, 'Ana e Bia');
});

test('backup: aceita rachadinha certa e recusa a mexida', () => {
  const base = { app: 'carteira-jf', categories: DEFAULT_CATEGORIES, incomes: [], accounts: [] };
  const ok = validarBackup({ ...base, expenses: [gasto({ racha: [{ id: 'r1', nome: 'Ana', valorCents: 4550, recebidoEm: null }] })] });
  assert.equal(ok.ok, true, ok.erros.join('; '));
  const demais = validarBackup({ ...base, expenses: [gasto({ racha: [{ id: 'r1', nome: 'Ana', valorCents: 99999, recebidoEm: null }] })] });
  assert.equal(demais.ok, false);
  const nomeRuim = validarBackup({ ...base, expenses: [gasto({ racha: [{ id: 'r1', nome: '', valorCents: 100 }] })] });
  assert.equal(nomeRuim.ok, false);
  const dias = validarBackup({ ...base, expenses: [], perfil: { diasSemGasto: ['2026-11-01', 'ontem'] } });
  assert.equal(dias.ok, false);
});

test('conversa: "quem me deve?" e "qual minha ofensiva?"', () => {
  assert.equal(entender('quem me deve?', {}).intent, 'a_receber');
  assert.equal(entender('quanto tenho a receber', {}).intent, 'a_receber');
  assert.equal(entender('qual minha ofensiva', {}).intent, 'ofensiva');
  assert.equal(entender('como divido uma conta com amigos?', {}).tema, 'racha');
  const e = gasto({ racha: dividirIgual(18200, ['Ana', 'Bia', 'Caio'], { now: 1 }) });
  const r = responder(entender('quem me deve?', {}), { expenses: [e] }, { today: '2026-11-07' });
  assert.match(r.fato, /R\$\s?136,50/);
  assert.match(r.fato, /Ana/);
  const o = responder(entender('qual minha ofensiva', {}), { expenses: [e] }, { today: '2026-11-05' });
  assert.match(o.fato, /1 dia/);
});

test('C.A.O.S. comemora marco da ofensiva e confirma a rachadinha, sem travar', () => {
  for (const ev of [{ type: 'ofensiva_marco', days: 7 }, { type: 'racha_cadastrada', amountCents: 4550, totalCents: 13650, count: 3, quem: 'Ana, Bia, Caio' }, { type: 'a_receber', totalCents: 9100, count: 2, quem: 'Ana e Bia' }]) {
    for (const mood of ['suave', 'normal', 'acido']) {
      const { fala } = reagir([ev], { mood, now: ms(7), rng: () => 0.3 });
      assert.ok(fala && fala.texto, `${ev.type}/${mood} sem fala`);
      assert.ok(!/\{\w+\}/.test(fala.texto), `${ev.type}/${mood} sobrou variável: ${fala.texto}`);
    }
  }
});
