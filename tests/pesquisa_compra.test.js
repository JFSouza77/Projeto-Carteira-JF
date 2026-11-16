// JF, 16/11: "o C.A.O.S. ajuda a pesquisar viagem e produto, mas te orienta a chegar à resposta, não dá ela pronta"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { entender } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const d = { expenses: [], incomes: [], accounts: [], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [], planos: [], metas: [] };
const now = Date.UTC(2026, 10, 16, 18);
function papo(...frases) {
  let memory; const out = [];
  for (const t of frases) { const r = conversar(t, d, { memory, now }); memory = r.memoria; out.push(r.fala); }
  return out;
}

test('entende viagem e produto sem roubar outras intenções', () => {
  assert.equal(entender('quanto custaria uma viagem pros estados unidos?').intent, 'pesquisa_compra');
  assert.equal(entender('me ajuda a achar uma geladeira de 300 litros').intent, 'pesquisa_compra');
  assert.equal(entender('onde compro um celular barato').intent, 'pesquisa_compra');
  assert.equal(entender('posso comprar 300?').intent, 'cabe');
  assert.equal(entender('quero juntar pra viagem').intent, 'meta_nova');
  assert.equal(entender('gastei 30 no mercado').intent, 'registrar_gasto');
  assert.equal(entender('quanto custa 1000 robux?').intent, 'moeda_jogo');
});

test('pede o orçamento antes e, com ele, manda pra IA em modo pesquisa', () => {
  const [pergunta, pronta] = papo('me ajuda a achar uma geladeira de 300 litros', 'até 5000');
  assert.match(pergunta.texto, /orçamento/);
  assert.equal(pergunta.entendeu, true, 'perguntar o orçamento não gasta IA');
  assert.equal(pronta.entendeu, false);
  assert.equal(pronta.modoIA, 'pesquisa');
  assert.match(pronta.perguntaIA, /^Pesquisa de compra: uma geladeira de 300 litros\. Orçamento: R\$\s5\.000,00\./);
});

test('"sem orçamento" também segue; "deixa pra depois" cancela', () => {
  const [, semOrc] = papo('quanto custaria uma viagem pros estados unidos?', 'sem orçamento');
  assert.match(semOrc.perguntaIA, /^Pesquisa de viagem: .*Orçamento: não informado\./);
  const [, cancelou] = papo('quero comprar um tenis', 'deixa pra depois');
  assert.equal(cancelou.modoIA, null);
  assert.match(cancelou.texto, /fica pra depois/);
});

test('orçamento já na frase vai direto; sem IA, ele dá o caminho (lojas e o que conferir)', () => {
  const [f] = papo('pesquisa o preço da geladeira, orçamento até 5000');
  assert.equal(f.modoIA, 'pesquisa');
  assert.match(f.texto, /frete/);
  assert.match(f.texto, /IA online/);
});
