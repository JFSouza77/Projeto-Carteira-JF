import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOVIDADES, VERSAO_APP, temNovidade, partesDoItem, numeroDaVersao } from '../js/novidades.js';

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
  assert.equal(VERSAO_APP, numeroDaVersao(NOVIDADES[0]));
  for (const n of NOVIDADES) if (n.ate) assert.ok(n.ate.startsWith(n.v.split(' ')[0] + '.'), `${n.v}: o ate (${n.ate}) tem que ser um ajuste dela`);
});

test('campo ate: o app mostra o número do último ajuste', () => {
  assert.equal(numeroDaVersao({ v: '2.1.1 Alfa' }), '2.1.1 Alfa');
  assert.equal(numeroDaVersao({ v: '2.1.1 Alfa', ate: '2.1.1.2' }), '2.1.1.2 Alfa');
  assert.equal(numeroDaVersao({ v: '2.2', ate: '2.2.1' }), '2.2.1');
});

// Code do Perfil, 16/11: cada item explica de verdade (o que é, onde fica, como usa) e nada de título repetido
// nas 3 versões mais novas (se a mesma coisa volta melhorada, o título diz o que mudou)
test('novidades recentes explicam e não repetem título', () => {
  const titulos = new Map();
  for (const n of NOVIDADES.slice(0, 3)) {
    for (const item of n.itens) {
      const p = partesDoItem(item);
      assert.ok((p.texto || '').length >= 40, `item curto demais (explique onde fica e como usa): ${item}`);
    }
    for (const item of [...n.itens, ...n.qol]) {
      const t = partesDoItem(item).titulo.toLowerCase();
      assert.ok(!titulos.has(t), `título repetido "${t}" em ${titulos.get(t)} e ${n.v}`);
      titulos.set(t, n.v);
    }
  }
});

test('aviso de novidade só quando a versão mudou', () => {
  assert.equal(temNovidade(null), true);
  assert.equal(temNovidade('1.3'), true);
  assert.equal(temNovidade(VERSAO_APP), false);
});
