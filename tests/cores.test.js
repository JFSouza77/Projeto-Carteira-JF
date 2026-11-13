// Cores por categoria e banco (13/11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corCategoria, corFonte, corForma, temaBanco } from '../js/cores.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

test('toda categoria padrão tem cor de variável do CSS', () => {
  for (const c of DEFAULT_CATEGORIES) assert.match(corCategoria(c.id), /^var\(--[a-z]+\)$/);
  assert.equal(corCategoria('nao-existe'), 'var(--cyan)');
  assert.equal(corFonte('salario'), 'var(--ok)');
  assert.equal(corForma('credito'), 'var(--violet)');
});

test('banco: cor, apoio e sigla', () => {
  assert.deepEqual(temaBanco('Nubank'), { cor: 'var(--violet)', apoio: 'var(--caos)', sigla: 'NU' });
  assert.equal(temaBanco('Banco do Brasil').sigla, 'BD');
  assert.equal(temaBanco('Banco do Brasil').cor, 'var(--accent)');
  assert.equal(temaBanco('Carteira').sigla, 'R$');
  assert.equal(temaBanco('Banestes').cor, 'var(--indigo)');
  assert.equal(temaBanco('').sigla, 'CO');
});
