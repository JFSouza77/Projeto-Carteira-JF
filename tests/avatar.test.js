// Avatares (13/11, pedido do JF): a forma vem do assunto da fala ou, sem assunto, do rosto/emoção.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formaPara, FORMAS } from '../js/avatar.js';
import { readFileSync } from 'node:fs';

test('formaPara: o assunto manda, depois o rosto, e nunca devolve forma que não existe', () => {
  assert.equal(formaPara({ assunto: 'piada' }), 'humorista');
  assert.equal(formaPara({ assunto: 'cartao_vence' }), 'lembrete');
  assert.equal(formaPara({ assunto: 'categoria_estourada' }), 'bronca');
  assert.equal(formaPara({ rosto: { emo: 'tedio', nome: 'entediado' } }), 'sonolento');
  assert.equal(formaPara({ rosto: { emo: 'raiva', nome: 'acuado' } }), 'medo'); // mistura usa o nome
  assert.equal(formaPara({ rosto: { emo: 'espantado' } }), 'surpreso');
  assert.equal(formaPara({}), 'calmo');
  assert.equal(formaPara({ assunto: 'nao_existe', rosto: { emo: 'nada' } }), 'calmo');
});

test('toda forma que o app pode pedir existe no avatar', () => {
  const fonte = readFileSync(new URL('../js/avatar.js', import.meta.url), 'utf8');
  const pedidas = [...fonte.matchAll(/:\s*'([a-z]+)'/g)].map(m => m[1]).filter(n => /^(calmo|pensando|detetive|desconfiado|tentado|perturbado|envergonhado|sonolento|preocupado|triste|orgulhoso|feliz|parceiro|surpreso|anjinho|medo|humorista|professor|vidente|simulador|contador|cobrador|treinador|amigao|bronca|alerta|recalculando|lembrete|nojinho|investidor|rico)$/.test(n));
  for (const n of new Set(pedidas)) assert.ok(FORMAS[n], `forma ${n} não existe`);
  for (const n of ['anjinho', 'contador', 'professor', 'feliz', 'surpreso']) assert.ok(FORMAS[n]); // abertura e susto
});

test('toda forma do POR_ASSUNTO existe (o balão e o topo usam a mesma forma do avatar)', async () => {
  const fonte = readFileSync(new URL('../js/avatar.js', import.meta.url), 'utf8');
  const bloco = fonte.slice(fonte.indexOf('const POR_ASSUNTO'), fonte.indexOf('});', fonte.indexOf('const POR_ASSUNTO')));
  for (const [, f] of bloco.matchAll(/:\s*'([a-zA-Z]+)'/g)) assert.ok(FORMAS[f], f);
  assert.equal(formaPara({ assunto: 'limite_investido' }), 'banqueiro');
});
