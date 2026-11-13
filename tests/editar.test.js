// Editar lançamento (13/11). Dados inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editarLancamento, createExpense, createIncome, DEFAULT_CATEGORIES, INCOME_SOURCES } from '../js/engine.js';

const cats = DEFAULT_CATEGORIES;

test('muda valor, descrição, data (e o mês junto) e categoria; guarda o createdAt', () => {
  const e = createExpense({ amountCents: 1000, categoryId: cats[0].id, date: '2026-10-31', note: 'x' }, { categories: cats });
  const n = editarLancamento(e, { amountCents: 2550, note: ' Padaria ', date: '2026-11-02', categoryId: cats[1].id }, { categories: cats, now: 5 });
  assert.equal(n.amountCents, 2550);
  assert.equal(n.note, 'Padaria');
  assert.equal(n.month, '2026-11');
  assert.equal(n.categoryId, cats[1].id);
  assert.equal(n.createdAt, e.createdAt);
  assert.equal(n.editadoEm, 5);
  assert.equal(e.amountCents, 1000, 'não mexe no original');
});

test('recusa valor e data inválidos e categoria que não existe', () => {
  const e = createExpense({ amountCents: 1000, categoryId: cats[0].id, date: '2026-11-01' }, { categories: cats });
  assert.throws(() => editarLancamento(e, { amountCents: 0 }, { categories: cats }));
  assert.throws(() => editarLancamento(e, { date: '2026-02-30' }, { categories: cats }));
  assert.throws(() => editarLancamento(e, { categoryId: 'nada' }, { categories: cats }));
});

test('conta rachada: descrição muda, valor não', () => {
  const e = { ...createExpense({ amountCents: 9000, categoryId: cats[0].id, date: '2026-11-01' }, { categories: cats }), racha: [{ id: 'p1', nome: 'Ana', valorCents: 3000 }] };
  assert.equal(editarLancamento(e, { note: 'Pizza' }, { categories: cats }).note, 'Pizza');
  assert.equal(editarLancamento(e, { amountCents: 9000 }, { categories: cats }).amountCents, 9000, 'mesmo valor passa');
  assert.throws(() => editarLancamento(e, { amountCents: 12000 }, { categories: cats }), /dividida/);
});

test('entrada: troca a fonte', () => {
  const i = createIncome({ amountCents: 5000, sourceId: INCOME_SOURCES[0].id, date: '2026-11-05' });
  assert.equal(editarLancamento(i, { sourceId: INCOME_SOURCES[1].id }, { kind: 'entrada' }).sourceId, INCOME_SOURCES[1].id);
  assert.throws(() => editarLancamento(i, { sourceId: 'x' }, { kind: 'entrada' }));
});
