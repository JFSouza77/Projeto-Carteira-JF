// Núcleo único do C.A.O.S. (JF, 12/11): a cópia da Carteira tem que ser igual à do kit do Perfil.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NUCLEO } from '../js/caos/nucleo.js';
import { IDENTIDADE } from '../js/caos/identidade.js';
import { diaEspecial, reagir, CAOS_VERSAO } from '../js/caos/index.js';
import { GERADORES } from '../js/caos/falas.js';

const kit = JSON.parse(readFileSync(new URL('../docs/Do_Perfil/CAOS_Anatomia/caos_nucleo.json', import.meta.url), 'utf8'));

test('nucleo.js é cópia fiel do núcleo do kit (rode: node ferramentas/gerar_nucleo.js)', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(NUCLEO)), kit);
});

test('identidade lê nome, sigla, criador e vida do núcleo', () => {
  assert.equal(IDENTIDADE.nome, kit.identidade.nome);
  assert.equal(IDENTIDADE.sigla, kit.identidade.sigla);
  assert.equal(IDENTIDADE.criador, kit.identidade.criador);
  assert.equal(IDENTIDADE.nucleo, kit.versao);
  assert.equal(IDENTIDADE.vida[0].data, '2026-09-20');
  assert.ok(CAOS_VERSAO);
});

test('todo dia especial do núcleo tem 5 falas e é reconhecido no calendário', () => {
  const ids = kit.dias.especiais.map(d => d.id);
  for (const id of ids) assert.equal(GERADORES[`dia_${id}`]?.fala.geral.length, 5, id);
  const casos = { '2026-09-20': 'aniversarioCaos', '2027-01-02': 'aniversarioCriador', '2026-11-05': 'aniversarioCarteira',
    '2026-09-06': 'aniversarioPerfil', '2026-11-13': 'sexta13', '2026-12-25': 'natal', '2026-12-31': 'anoNovo',
    '2026-10-31': 'halloween', '2026-10-12': 'criancas', '2026-06-12': 'namorados', '2026-11-14': null };
  for (const [iso, id] of Object.entries(casos)) {
    assert.equal(diaEspecial(iso), id, iso);
    if (id) assert.ok(ids.includes(id), id);
  }
});

test('aniversário do JF: com o selo ele fala direto com o criador', () => {
  const now = new Date(2027, 0, 2, 9).getTime();
  let algum = false;
  for (let i = 0; i < 20 && !algum; i++) {
    const r = reagir([{ type: 'dia_aniversarioCriador' }], { now, rng: Math.random, perfil: { apelido: 'JF', seloCriador: true } });
    algum = /JF|criador/.test(r.fala.texto);
  }
  assert.ok(algum);
});
