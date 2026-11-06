import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOVIDADES, VERSAO_APP, temNovidade, partesDoItem } from '../js/novidades.js';

test('novidades seguem as regras do log (pra quem usa)', () => {
  const vistas = new Set();
  for (const n of NOVIDADES) {
    assert.ok(!vistas.has(n.v), `versão repetida ${n.v}`); vistas.add(n.v);
    assert.ok(n.itens.length <= 7 && n.qol.length <= 7, n.v);
    assert.ok(n.t.length <= 110, `frase da ${n.v} longa demais`);
    assert.match(n.data, /^\d{2}\/\d{2}\/\d{4}$/);
    for (const item of [...n.itens, ...n.qol]) {
      const p = partesDoItem(item);
      assert.ok(p.titulo && p.titulo.length <= 34, `item sem título curto: ${item}`);
      assert.doesNotMatch(item, /\b(c[oó]digo|commit|teste[s]?|Wally|Claude|ChatGPT|bug|merge|refator)/i, `bastidores: ${item}`);
      assert.doesNotMatch(item, /\bPR\b/, `bastidores: ${item}`);
    }
  }
  assert.equal(VERSAO_APP, NOVIDADES[0].v);
});

test('aviso de novidade só quando a versão mudou', () => {
  assert.equal(temNovidade(null), true);
  assert.equal(temNovidade('1.3'), true);
  assert.equal(temNovidade(VERSAO_APP), false);
});
