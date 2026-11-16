// 2.1.3.1 (GPT, 16/11: "medir antes de cortar crédito"): contador de uso da IA e voz sem símbolos
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contarUsoIA, descreverUsoIA, motivoDaIA } from '../js/ia.js';
import { textoParaVoz } from '../js/voz.js';

test('conta aparelho, memória e IA por motivo, e zera no mês novo', () => {
  let u = null;
  for (const t of ['local', 'local', 'local', 'memoria', 'papo', 'pesquisa', 'papo']) u = contarUsoIA(u, '2026-11', t);
  assert.equal(u.local, 3);
  assert.equal(u.memoria, 1);
  assert.equal(u.ia, 3);
  assert.deepEqual(u.motivos, { papo: 2, pesquisa: 1 });
  const novo = contarUsoIA(u, '2026-12', 'local');
  assert.equal(novo.local, 1);
  assert.equal(novo.ia, 0);
  assert.equal(u.local, 3, 'não mexe no objeto antigo');
});

test('descreve o uso em português simples', () => {
  let u = null;
  for (const t of ['local', 'local', 'local', 'papo']) u = contarUsoIA(u, '2026-11', t);
  const txt = descreverUsoIA(u, '2026-11');
  assert.match(txt, /3 respostas aqui no aparelho/);
  assert.match(txt, /1 com a IA online \(1 papo\)/);
  assert.match(txt, /75% sem gastar crédito/);
  assert.match(descreverUsoIA(u, '2026-12'), /ainda não teve conversa/);
});

test('motivo da IA vem do que o cérebro local entendeu', () => {
  assert.equal(motivoDaIA({ modoIA: 'pesquisa' }), 'pesquisa');
  assert.equal(motivoDaIA({ intent: 'papo_pessoal' }), 'papo');
  assert.equal(motivoDaIA({ perguntaIA: 'qual a cotação do Robux?' }), 'assunto');
  assert.equal(motivoDaIA({}), 'duvida');
});

test('a voz não lê ** nem {nome}', () => {
  const v = textoParaVoz('{nome}, você gastou **R$ 30,00** no mercado.');
  assert.ok(!v.includes('*'));
  assert.ok(!v.includes('{'));
  assert.match(v, /você gastou 30 reais/);
});
