// 2.3.5.10 (JF, 19/11, no posto): carro (GNV, óleo, lavagem), refrigerante pelo nome, sorvete e açaí, e lojas pelo
// nome (C&A, Renner, Youcom, Marisa, Avenida, Americanas…). O comprovante e o Lançar usam o mesmo mapa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entender, categoriaPeloNome } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const cat = t => entender(t, { categories: DEFAULT_CATEGORIES }).categoria?.id || null;

test('categoria pelo nome da loja ou do produto', () => {
  const casos = {
    transporte: ['gastei 80 de GNV', 'troca de óleo 150', 'lava jato 30', 'gastei 40 na lavagem do carro', 'etanol 100', 'pneu 400', 'mecânico 300'],
    mercado: ['guaraná 6', 'gastei 7 numa coca-cola', 'fanta 6', 'gastei 300 no carrefour'],
    restaurante: ['gastei 12 no sorvete', 'açaí 18', 'gastei 30 no picolé', 'sorveteria 25'],
    compras: ['gastei 500 na C&A', 'renner 200', 'gastei 150 na youcom', 'marisa 90', 'gastei 60 na avenida', 'americanas 45', 'riachuelo 120', 'casas bahia 900'],
  };
  for (const [id, frases] of Object.entries(casos)) for (const f of frases) assert.equal(cat(f), id, f);
  assert.equal(cat('gastei 20 dia 5'), null, '"dia 5" não é o mercado Dia');
  assert.equal(categoriaPeloNome('C&A Modas Ltda', DEFAULT_CATEGORIES), 'compras');
  assert.equal(categoriaPeloNome('Posto Ipiranga', DEFAULT_CATEGORIES), 'transporte');
  assert.equal(categoriaPeloNome('', DEFAULT_CATEGORIES), null);
});
