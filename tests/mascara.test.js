// Máscara de dinheiro (JF, 13/11): "digitei 178,35 e saiu 17.835".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mascaraCentavos, parseAmount, parseSignedAmount } from '../js/engine.js';

test('os dois últimos números são os centavos, digitando número a número', () => {
  let campo = '';
  const vistos = [];
  for (const d of '17835') { campo = mascaraCentavos(campo + d); vistos.push(campo); }
  assert.deepEqual(vistos, ['0,01', '0,17', '1,78', '17,83', '178,35']);
  assert.equal(parseAmount(campo), 17835, 'R$ 178,35 em centavos (e não 17.835 reais)');
});

test('milhar, colar com vírgula, apagar e zeros à esquerda', () => {
  assert.equal(mascaraCentavos('123456'), '1.234,56');
  assert.equal(mascaraCentavos('178,35'), '178,35');
  assert.equal(mascaraCentavos('1.234,56'), '1.234,56');
  assert.equal(mascaraCentavos('0,0'), '');
  assert.equal(mascaraCentavos('00050'), '0,50');
  assert.equal(parseAmount(mascaraCentavos('123456')), 123456);
});

test('saldo com sinal de menos', () => {
  assert.equal(mascaraCentavos('-5000', { sinal: true }), '-50,00');
  assert.equal(mascaraCentavos('-', { sinal: true }), '-');
  assert.equal(parseSignedAmount(mascaraCentavos('-5000', { sinal: true })), -5000);
  assert.equal(mascaraCentavos('-5000'), '50,00', 'sem sinal liberado, o menos cai');
});
