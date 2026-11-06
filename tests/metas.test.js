// Metas montadas junto (C.A.O.S. 1.8.0). Valores inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMeta, progressoMeta, guardarNaMeta, lerMesAlvo, validarBackup, DEFAULT_CATEGORIES } from '../js/engine.js';
import { entender, nomeDaMeta } from '../js/caos/conversa.js';
import { conversar, falaAvulsa, memoriaInicial } from '../js/caos/index.js';

const now = new Date(2026, 10, 6, 12);
const show = createMeta({ nome: 'Show', alvoCents: 60000, guardadoCents: 10000, ate: '2027-04' }, { now, id: 'meta-1' });

test('meta: progresso e quanto guardar por mês', () => {
  const p = progressoMeta(show, '2026-11-06');
  assert.equal(p.faltaCents, 50000);
  assert.equal(p.pct, 17);
  assert.equal(p.mesesRestantes, 6);
  assert.equal(p.porMesCents, 8334);
  assert.throws(() => createMeta({ nome: '', alvoCents: 100 }), /Pra que/);
  assert.throws(() => createMeta({ nome: 'X', alvoCents: 100, ate: '2020-01' }, { now }), /Até quando/);
});

test('guardar na meta e bater a meta (uma vez só)', () => {
  const a = guardarNaMeta(show, 20000, now);
  assert.equal(a.meta.guardadoCents, 30000);
  assert.equal(a.batidaAgora, false);
  const b = guardarNaMeta(a.meta, 30000, now);
  assert.equal(b.batidaAgora, true);
  assert.equal(progressoMeta(b.meta, '2026-11-06').batida, true);
  assert.equal(guardarNaMeta(b.meta, 100, now).batidaAgora, false);
});

test('prazo do jeito que a pessoa fala', () => {
  const h = '2026-11-06';
  assert.equal(lerMesAlvo('dezembro', h), '2026-12');
  assert.equal(lerMesAlvo('março', h), '2027-03');
  assert.equal(lerMesAlvo('em 6 meses', h), '2027-05');
  assert.equal(lerMesAlvo('em 1 ano', h), '2027-11');
  assert.equal(lerMesAlvo('04/2027', h), '2027-04');
  assert.equal(lerMesAlvo('01/2020', h), null);
});

test('conversa: montar meta, ver metas e guardar (proposta, nunca grava)', () => {
  assert.equal(entender('quero juntar dinheiro pra um show', {}).intent, 'meta_nova');
  assert.equal(nomeDaMeta('quero juntar dinheiro pra um show do coldplay'), 'Show do coldplay');
  const d = { expenses: [], incomes: [], categories: DEFAULT_CATEGORIES, accounts: [], compromissos: [], planos: [], metas: [show] };
  const nova = conversar('quero montar uma meta', d, { now: now.getTime(), today: '2026-11-06' });
  assert.ok(nova.fala.fluxoMeta);
  const lista = conversar('como estão minhas metas?', d, { now: now.getTime(), today: '2026-11-06' });
  assert.match(lista.fala.texto, /Show/);
  assert.match(lista.fala.texto, /83,34/);
  const g = conversar('guardei 50 na meta do show', d, { now: now.getTime(), today: '2026-11-06' });
  assert.deepEqual(g.fala.acao, { tipo: 'meta_guardar', metaId: 'meta-1', valorCents: 5000 });
  assert.equal(d.metas[0].guardadoCents, 10000); // 1ª lei: nada mudou
});

test('comemora meta batida, com o nome', () => {
  const r = falaAvulsa('meta_batida', { meta: 'Show', nome: 'Fulano' }, { memory: memoriaInicial(now.getTime()), now: now.getTime() });
  assert.match(r.texto, /Show/);
  assert.match(r.texto, /Fulano/);
});

test('backup leva as metas; meta estragada é recusada', () => {
  const b = { app: 'carteira-jf', categories: DEFAULT_CATEGORIES.map(c => ({ ...c })), expenses: [], metas: [{ ...show }] };
  const v = validarBackup(b);
  assert.equal(v.ok, true);
  assert.equal(v.dados.metas.length, 1);
  assert.equal(validarBackup({ ...b, metas: [{ ...show, alvoCents: -1 }] }).ok, false);
});
