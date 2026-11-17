// 2.1.9.1 (pedido do JF): Frentista, Pet Lover, Corretor, Turista e Chef existem, têm rostinho e aparecem no assunto certo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fonte = readFileSync(new URL('../js/avatar.js', import.meta.url), 'utf8');

test('os 5 avatares novos existem com emoção e rostinho', () => {
  for (const f of ['frentista', 'petlover', 'corretor', 'turista', 'chef']) {
    assert.match(fonte, new RegExp(`\\b${f}\\s*:`), `forma ${f} sumiu`);
    assert.ok((fonte.match(new RegExp(`\\b${f}\\s*:`, 'g')) || []).length >= 3, `${f} sem emoção ou rostinho`);
  }
});

test('assunto leva ao avatar certo', () => {
  const pares = { plano_pet: 'petlover', plano_moradia: 'corretor', plano_viagem: 'turista', combustivel: 'frentista', delivery_repetido: 'chef' };
  for (const [a, f] of Object.entries(pares)) assert.match(fonte, new RegExp(`${a}\\s*:\\s*'${f}'`), `${a} → ${f}`);
});
