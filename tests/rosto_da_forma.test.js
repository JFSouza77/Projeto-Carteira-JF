// 2.1.3.2 (JF, 16/11: "avatar pensador com rostinho tímido não dá"): o rostinho segue a forma do avatar
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMAS, EMO_DA_FORMA, KAOMOJI_DA_FORMA, formaPara, rostoDaForma } from '../js/avatar.js';
import { rostoDaEmo } from '../js/caos/rostos.js';

test('toda forma do avatar tem emoção e rostinho', () => {
  for (const f of Object.keys(FORMAS)) {
    assert.ok(EMO_DA_FORMA[f], `${f} sem emoção`);
    const r = rostoDaForma(f, null, 0);
    assert.ok(r.quadros.length >= 1, `${f} sem rostinho`);
  }
  for (const f of Object.keys(KAOMOJI_DA_FORMA)) assert.ok(FORMAS[f], `rostinho de forma que não existe: ${f}`);
});

test('pensador nunca sai com o rostinho de vergonha (caso do print do JF)', () => {
  const timido = rostoDaEmo('recompondo', 0);
  const forma = formaPara({ rosto: timido, assunto: 'como_funciona' });
  assert.equal(forma, 'pensando');
  const r = rostoDaForma(forma, timido, 0);
  assert.equal(r.emo, 'pensando');
  assert.notDeepEqual(r.quadros, timido.quadros);
});

test('a forma com rostinho próprio usa o dela; a da mesma emoção guarda o rosto da fala', () => {
  assert.deepEqual(rostoDaForma('sonolento', rostoDaEmo('tedio', 0)).quadros, [...KAOMOJI_DA_FORMA.sonolento]);
  const triste = rostoDaEmo('triste', 2);
  assert.equal(rostoDaForma('triste', triste), triste);
});
