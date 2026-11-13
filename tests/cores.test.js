// Cores por categoria e banco (13/11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corCategoria, corFonte, corForma, temaBanco } from '../js/cores.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

test('toda categoria padrão tem cor de variável do CSS', () => {
  for (const c of DEFAULT_CATEGORIES) assert.match(corCategoria(c.id), /^var\(--[a-z-]+\)$/);
  assert.equal(corCategoria('nao-existe'), 'var(--cyan)');
  assert.equal(corFonte('salario'), 'var(--ok)');
  assert.equal(corForma('credito'), 'var(--violet)');
});

test('banco: cores e siglas perto das do próprio banco', () => {
  assert.deepEqual(temaBanco('C6 Bank'), { fundo: '#1E1E1E', letra: '#FFFFFF', cor: '#8A8F98', apoio: '#C9CDD3', sigla: 'C6' });
  assert.equal(temaBanco('Nubank').fundo, '#820AD1');
  assert.equal(temaBanco('Nubank').sigla, 'nu');
  assert.equal(temaBanco('Itaú Cartões').fundo, '#EC7000');
  assert.equal(temaBanco('Banco do Brasil').sigla, 'BB');
  assert.equal(temaBanco('Inter').fundo, '#FF7A00');
  assert.equal(temaBanco('Carteira (dinheiro vivo)').sigla, 'R$');
  assert.equal(temaBanco('Banestes').fundo, '#00539F');
  // não confunde: "Banco Pan" não vira Santander nem Inter; "Interessante" não vira Inter
  assert.equal(temaBanco('Banco Pan').sigla, 'pan');
  assert.equal(temaBanco('Banco Genial').fundo, 'var(--indigo)');
  assert.equal(temaBanco('Banco Genial').sigla, 'BG');
  assert.equal(temaBanco('').sigla, 'CO');
});

test('todo banco da lista tem sigla curta e cor', async () => {
  const { BANKS } = await import('../js/engine.js');
  for (const b of BANKS) {
    const t = temaBanco(b);
    assert.ok(t.sigla.length >= 1 && t.sigla.length <= 4, b);
    assert.ok(t.fundo && t.letra && t.cor, b);
  }
});

test('cada categoria tem cor no escuro e no claro (paleta do Code, 13/11)', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');
  for (const c of DEFAULT_CATEGORIES) {
    const nome = corCategoria(c.id).slice(6, -1);
    assert.ok((css.match(new RegExp(`${nome}:\\s*#`, 'g')) || []).length >= 3, `${nome} falta em algum tema`);
  }
});
