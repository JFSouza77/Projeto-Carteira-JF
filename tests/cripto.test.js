// Sincronização de ponta a ponta (07/11): a senha não sai do aparelho e o servidor só vê dado embaralhado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derivarChaves, cifrar, decifrar, cifrarMudancas, decifrarMudancas, estaCifrado } from '../js/cripto.js';
import { recCifrado, ACESSO_RE, mesclar, mudancasDesde } from '../js/sincronia.js';

const gasto = { id: 'g1', amountCents: 4550, categoryId: 'restaurante', note: 'pizza com a galera', date: '2026-11-07', month: '2026-11' };

test('mesma senha e apelido dão a mesma chave em qualquer aparelho; senha de acesso não é a senha', async () => {
  const a = await derivarChaves('Fulano.Teste', 'senha-de-mentira');
  const b = await derivarChaves('fulano.teste', 'senha-de-mentira');
  assert.equal(a.acesso, b.acesso);
  assert.match(a.acesso, ACESSO_RE);
  assert.ok(!a.acesso.includes('senha-de-mentira'));
  const bloco = await cifrar(a.chave, 'expenses', 'g1', gasto);
  assert.deepEqual(await decifrar(b.chave, 'expenses', 'g1', bloco), gasto);
  const outra = await derivarChaves('fulano.teste', 'outra-senha');
  assert.notEqual(outra.acesso, a.acesso);
  await assert.rejects(decifrar(outra.chave, 'expenses', 'g1', bloco), /senha/);
});

test('o bloco embaralhado não mostra nada e o servidor aceita só ele', async () => {
  const { chave } = await derivarChaves('fulano', 'senha-de-mentira');
  const bloco = await cifrar(chave, 'expenses', 'g1', gasto);
  assert.ok(estaCifrado(bloco) && recCifrado(bloco));
  const texto = JSON.stringify(bloco);
  for (const vaza of ['pizza', '4550', 'restaurante', '2026-11-07']) assert.ok(!texto.includes(vaza), `vazou ${vaza}`);
  assert.equal(recCifrado(gasto), false);
  assert.equal(recCifrado(null), true);
  // duas vezes o mesmo dado dão blocos diferentes (iv aleatório)
  assert.notEqual((await cifrar(chave, 'expenses', 'g1', gasto)).d, bloco.d);
});

test('o servidor não consegue trocar um registro de lugar nem mexer numa letra', async () => {
  const { chave } = await derivarChaves('fulano', 'senha-de-mentira');
  const bloco = await cifrar(chave, 'expenses', 'g1', gasto);
  await assert.rejects(decifrar(chave, 'expenses', 'g2', bloco));
  await assert.rejects(decifrar(chave, 'incomes', 'g1', bloco));
  const bytes = Buffer.from(bloco.d, 'base64');
  bytes[bytes.length - 1] ^= 1;
  await assert.rejects(decifrar(chave, 'expenses', 'g1', { v: 1, d: bytes.toString('base64') }));
  await assert.rejects(decifrar(chave, 'expenses', 'g1', gasto), /sem criptografia/);
});

test('ida e volta de uma lista de mudanças passando pelo "servidor"', async () => {
  const cel = await derivarChaves('fulano', 'senha-de-mentira');
  const pc = await derivarChaves('fulano', 'senha-de-mentira');
  const lista = [{ store: 'expenses', id: 'g1', em: 1000, rec: gasto }, { store: 'expenses', id: 'g2', em: 1001, rec: null }];
  const subida = await cifrarMudancas(cel.chave, lista);
  const { estado } = mesclar(null, subida);
  const descida = await decifrarMudancas(pc.chave, mudancasDesde(estado, 0));
  assert.equal(descida.ruins, 0);
  assert.deepEqual(descida.ok.sort((a, b) => a.id.localeCompare(b.id)), lista);
  const intruso = await derivarChaves('fulano', 'chute-errado');
  assert.equal((await decifrarMudancas(intruso.chave, mudancasDesde(estado, 0))).ruins, 1);
});
