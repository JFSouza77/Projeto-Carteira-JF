// 17/11 (JF): tutorial guiado estilo jogo, com o C.A.O.S. de guia turístico
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PASSOS_TOUR, ROTEIROS, TEMAS_TOUR, montarRoteiro } from '../js/tour_passos.js';
import { FORMAS } from '../js/avatar.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('roteiros fecham em 0 ou 5 e todo passo existe', () => {
  assert.equal(ROTEIROS.completo.length, 10);
  assert.equal(ROTEIROS.basico.length, 5);
  assert.equal(TEMAS_TOUR.length % 5, 0);
  for (const ids of [...Object.values(ROTEIROS), ...TEMAS_TOUR.map(t => t.passos)]) for (const id of ids) assert.ok(PASSOS_TOUR[id], id);
});

test('cada passo tem tela, um alvo que existe na página, avatar e texto curto o bastante', () => {
  for (const [id, p] of Object.entries(PASSOS_TOUR)) {
    assert.ok(['inicio', 'lancar', 'contas', 'mes', 'conversa'].includes(p.tela), id);
    assert.ok(FORMAS[p.forma], `${id}: forma ${p.forma}`);
    const sel = p.alvo.match(/[#.]([\w-]+)/)[1];
    assert.ok(html.includes(`id="${sel}"`) || html.includes(`class="${sel}`) || html.includes(` ${sel}"`), `${id}: alvo ${p.alvo}`);
    assert.ok(p.texto.length <= 220, `${id}: texto longo`);
  }
});

test('montarRoteiro numera os passos ("Passo 2 de 5")', () => {
  const r = montarRoteiro('basico');
  assert.equal(r.length, 5);
  assert.deepEqual([r[1].n, r[1].de], [2, 5]);
  assert.equal(montarRoteiro('anotar').length, 2);
  assert.deepEqual(montarRoteiro('nada'), []);
});
