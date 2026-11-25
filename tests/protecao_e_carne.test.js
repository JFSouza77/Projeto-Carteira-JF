// 2.3.6.11 (JF, 25/11): plano de saúde pelo nome, seguros, plano funerário e carnê/crediário de loja no lugar certo
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entender } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const cat = t => entender(t, { categories: DEFAULT_CATEGORIES }).categoria?.id || null;

test('plano de saúde, seguro, funerário e carnê', () => {
  const casos = {
    saude: ['paguei 450 da unimed', 'unimed senior 600', 'banescaixa 300', 'hapvida 250', 'plano odontológico 40'],
    contas: ['seguro de vida 60', 'plano funerário 40', 'parcela do carnê 120', 'prestação da loja 150'],
    transporte: ['seguro do carro 180', 'seguro da moto 90'],
    mercado: ['carne 45 no açougue', 'comprei carne 50'],
  };
  for (const [id, frases] of Object.entries(casos)) for (const f of frases) assert.equal(cat(f), id, f);
});
