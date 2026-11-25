// 2.3.6.9 (JF, 25/11: "suspirando demais, parece cansado, pausa muito"; receita do Code do Perfil): a voz segue o Perfil
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoParaVoz, setVelocidade, velocidadeDaFala, ritmoDaVoz, EMOCAO_DA_VOZ } from '../js/voz.js';
import { VOZ_EMOCOES } from '../servidor/voz.js';

test('fala comum nunca abaixo de +10% e o dia a dia sem estilo que suspira', () => {
  setVelocidade(ritmoDaVoz({}));
  for (const e of ['calmo', 'protetor', 'preocupacao', 'tenso', 'carinho', 'alegria', 'tedio', 'curiosidade']) {
    assert.ok(velocidadeDaFala(e) >= 1.1, `${e}: ${velocidadeDaFala(e)}`);
    const estilo = VOZ_EMOCOES[EMOCAO_DA_VOZ[e]][2];
    assert.ok(!['softvoice', 'fearful', 'sad', 'whispering'].includes(estilo), `${e} → ${estilo}`);
  }
});

test('velocidade: normal 1,2, ajuste de 1,0 a 2,0, escolha antiga convertida', () => {
  assert.equal(ritmoDaVoz({}), 1.2);
  assert.equal(ritmoDaVoz({ vozVel: 1 }), 1.2);
  assert.equal(ritmoDaVoz({ vozVel: 0.6 }), 1);
  assert.equal(ritmoDaVoz({ vozRitmo: 1.5 }), 1.5);
  setVelocidade(0.5);
  assert.ok(velocidadeDaFala('tedio') >= 0.93);
});

test('reticências viram a marca de pausa, sem pausa dupla; risada sai como risada', () => {
  assert.equal(textoParaVoz('Hmm… deixa eu ver… pronto.'), 'Hmm ⏸ deixa eu ver ⏸ pronto.');
  assert.equal(textoParaVoz('Olha…'), 'Olha.');
  assert.equal(textoParaVoz('… oi'), 'oi');
  assert.equal(textoParaVoz('Boa…!'), 'Boa!');
  assert.equal(textoParaVoz('kkkk boa'), 'rá rá rá boa');
});

// 2.3.6.10 (JF: "a fala cortou bem no finalzinho"): o servidor aceita 400 letras; fala longa vai em pedaços
import { pedacosDaFala } from '../js/voz.js';
import { ajeitarRapaz } from '../js/caos/index.js';
test('fala longa vira pedaços de até 380 letras, cortando no fim da frase, sem perder nada', () => {
  const frase = 'O mês já tá negativo, gastou 2899 reais e 16 centavos contra 2550 reais de entrada. ';
  const t = textoParaVoz(frase.repeat(7)).trim();
  const p = pedacosDaFala(t);
  assert.ok(p.length >= 2);
  for (const x of p) { assert.ok(x.length <= 380, String(x.length)); assert.match(x, /\.$/); }
  assert.equal(p.join(' '), t);
  assert.deepEqual(pedacosDaFala('curta.'), ['curta.']);
});

test('"Rapaz…" com reticências e sem o nome logo depois', () => {
  assert.equal(ajeitarRapaz('Rapaz, JF, quer comida japonesa?', 'JF'), 'Rapaz… quer comida japonesa?');
  assert.equal(ajeitarRapaz('Rapaz, {nome}, olha isso', null), 'Rapaz… olha isso');
  assert.equal(ajeitarRapaz('Rapaziada boa', 'JF'), 'Rapaziada boa');
});
