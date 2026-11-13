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

// ---- emoções (núcleo, 13/11) ----
import { EMOCOES, sentir, emocaoAtual, emocoesIniciais, decair } from '../js/caos/emocoes.js';

test('as 10 emoções são as do núcleo', () => {
  assert.deepEqual([...EMOCOES], kit.emocoes.lista);
});

test('memória antiga (preocupacao, irritacao, orgulho) vira o nome oficial', () => {
  const velha = { v: { preocupacao: 6, irritacao: 2, orgulho: 5, alegria: 1, tedio: 0, curiosidade: 0, carinho: 0 }, at: 0 };
  const e = decair(velha, 0);
  assert.equal(e.v.ansiedade, 6);
  assert.equal(e.v.raiva, 2);
  assert.equal(e.v.alegria, 5);
  assert.equal(e.v.preocupacao, undefined);
  assert.equal(emocaoAtual(velha, 'normal', 0), 'preocupacao'); // o nome que aparece não mudou
});

test('emoções novas aparecem e o filtro de apoio segura a tristeza', () => {
  let sem = emocoesIniciais(0);
  for (let i = 0; i < 3; i++) sem = sentir(sem, 'nao_entendi', 0); // três "não entendi" seguidos: fica sem graça
  assert.equal(emocaoAtual(sem, 'normal', 0), 'vergonha');
  const medo = sentir(sentir(emocoesIniciais(0), 'cartao_limite', 0), 'conta_negativa', 0);
  assert.ok(['preocupacao', 'medo', 'protetor'].includes(emocaoAtual(medo, 'normal', 0)));
  let triste = emocoesIniciais(0);
  for (let i = 0; i < 3; i++) triste = sentir(triste, 'xingamento', 0);
  assert.notEqual(emocaoAtual(triste, 'suave', 0), 'tristeza'); // tristeza nunca aparece crua
  assert.notEqual(emocaoAtual(triste, 'suave', 0), 'irritacao'); // Suave: sem raiva
});

test('núcleo 1.3.0: toda lei tem o sentido geral e a frase da Carteira', async () => {
  const { NUCLEO } = await import('../js/caos/nucleo.js');
  assert.equal(NUCLEO.leis.length, 3);
  for (const l of NUCLEO.leis) {
    assert.ok(typeof l.lei === 'string' && l.lei.length > 5, 'falta o sentido geral');
    assert.ok(typeof l.carteira === 'string' && l.carteira.length > 5, `falta a frase da Carteira em: ${l.lei}`);
  }
});
