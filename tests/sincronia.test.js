// Regras de sincronização (06/11): as mesmas do app e do servidor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mesclar, mudancasDesde, mudancasValidas, estadoVazio, normalizarApelido } from '../js/sincronia.js';

test('quem mudou por último ganha; empate fica o que já estava; versão só sobe se algo entrou', () => {
  let { estado, aceitas } = mesclar(estadoVazio(), [{ store: 'expenses', id: 'a', em: 10, rec: { id: 'a', v: 1 } }]);
  assert.equal(aceitas, 1); assert.equal(estado.versao, 1);
  ({ estado, aceitas } = mesclar(estado, [{ store: 'expenses', id: 'a', em: 5, rec: { id: 'a', v: 0 } }]));
  assert.equal(aceitas, 0); assert.equal(estado.versao, 1);
  ({ estado, aceitas } = mesclar(estado, [{ store: 'expenses', id: 'a', em: 10, rec: { id: 'a', v: 9 } }]));
  assert.equal(aceitas, 0);
  ({ estado } = mesclar(estado, [{ store: 'expenses', id: 'a', em: 20, rec: null }]));
  assert.equal(estado.versao, 2);
  assert.deepEqual(mudancasDesde(estado, 1), [{ store: 'expenses', id: 'a', em: 20, rec: null }]);
  assert.deepEqual(mudancasDesde(estado, 2), []);
});

test('não muda o estado recebido (função pura) e recusa lixo', () => {
  const e0 = estadoVazio();
  mesclar(e0, [{ store: 'expenses', id: 'a', em: 1, rec: {} }]);
  assert.equal(e0.versao, 0);
  assert.deepEqual(Object.keys(e0.registros), []);
  assert.equal(mudancasValidas([{ store: 'x', id: 'a', em: 1, rec: {} }, { store: 'expenses', id: 'a/b', em: 1, rec: {} },
    { store: 'expenses', id: 'a', em: -1, rec: {} }, { store: 'expenses', id: 'a', em: 1, rec: [] }, null]).length, 0);
});

test('apelido da conta', () => {
  assert.equal(normalizarApelido('  Maria.Silva '), 'maria.silva');
  assert.equal(normalizarApelido('João'), 'joao');
  assert.equal(normalizarApelido('ab'), null);
  assert.equal(normalizarApelido('<b>oi</b>'), null);
});
