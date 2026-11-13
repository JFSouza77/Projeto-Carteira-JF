// Analista de ofertas e porcentagem do C.A.O.S. (JF, 13/11). Dados inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerPorcentagem, textoPorcentagem, lerOfertas, completarOfertas, analisarOfertas, textoOfertas } from '../js/caos/ofertas.js';
import { conversar } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const n = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/%/g, ' porcento ').replace(/[^\w\s,.$-]/g, ' ').replace(/\s+/g, ' ').trim();

test('porcentagem: parte, desconto, acréscimo, de/por e quanto %', () => {
  assert.match(textoPorcentagem(lerPorcentagem(n('quanto é 15% de 3500'))), /R\$\s525,00/);
  assert.match(textoPorcentagem(lerPorcentagem(n('3500 com 10% de desconto'))), /R\$\s3\.150,00.*R\$\s350,00/);
  assert.match(textoPorcentagem(lerPorcentagem(n('3500 com 10% de juros'))), /R\$\s3\.850,00/);
  assert.match(textoPorcentagem(lerPorcentagem(n('de 3.500 por 2.800'))), /R\$\s700,00, ou 20%/);
  assert.match(textoPorcentagem(lerPorcentagem(n('quanto porcento é 700 de 3500'))), /20%/);
  assert.equal(lerPorcentagem(n('gastei 30 no mercado')), null);
});

test('ofertas: lê as lojas e os preços em qualquer ordem', () => {
  const r = lerOfertas(n('Quero comprar uma geladeira que custa R$ 3.500 no Mercado Livre, na Amazon tá 3.400 e na Shopee 2.100'));
  assert.equal(r.produto, 'geladeira');
  assert.deepEqual(r.ofertas.map(o => [o.loja, o.precoCents]), [['Mercado Livre', 350000], ['Amazon', 340000], ['Shopee', 210000]]);
  assert.equal(lerOfertas(n('geladeira 3500 no mercado livre')), null, 'uma loja só não é comparação');
});

test('ofertas: acha a melhor, avisa do preço bom demais e pergunta como vai pagar', () => {
  const r = lerOfertas(n('geladeira 3500 no mercado livre, 3400 na amazon e 2100 na shopee'));
  const a = analisarOfertas(r.ofertas);
  assert.equal(a.melhor.loja, 'Shopee');
  assert.equal(a.melhor.suspeita, true);
  assert.equal(a.melhorConfiavel.loja, 'Amazon');
  const t = textoOfertas(a, r.produto);
  assert.match(t, /bom demais/);
  assert.match(t, /como você vai pagar/i);
  assert.match(t, /cartão Amazon/);
  assert.match(t, /cupom/);
});

test('ofertas: frete, Pix e parcelas mudam a conta (e o juro escondido aparece)', () => {
  const r = lerOfertas(n('3500 no mercado livre e 3400 na amazon'));
  const c = completarOfertas(r.ofertas, n('mercado livre 5% no pix, amazon 10x de 380 e frete 50'));
  const a = analisarOfertas(c);
  const ml = a.linhas.find(l => l.loja === 'Mercado Livre'), amz = a.linhas.find(l => l.loja === 'Amazon');
  assert.equal(ml.custoCents, 332500);
  assert.equal(amz.freteCents, 5000);
  assert.equal(amz.parceladoCents, 385000);
  assert.equal(amz.jurosCents, 40000);
  assert.equal(a.melhor.loja, 'Mercado Livre');
  assert.match(textoOfertas(a), /R\$\s400,00 só de juros/);
});

test('na conversa: compara, completa com o pagamento e não vira lançamento', () => {
  const d = { expenses: [], incomes: [], categories: DEFAULT_CATEGORIES, accounts: [], compromissos: [], planos: [], metas: [] };
  const now = Date.now();
  let r = conversar('geladeira 3500 no mercado livre, 3400 na amazon e 2100 na shopee', d, { now });
  assert.equal(r.fala.acao ?? null, null);
  assert.match(r.fala.texto, /Comparei 3 ofertas/);
  r = conversar('amazon 10x sem juros e shopee frete 80', d, { now: now + 1000, memory: r.memoria });
  assert.match(r.fala.texto, /frete de R\$\s80,00/);
  assert.match(r.fala.texto, /10x sem juros/);
  assert.match(conversar('quanto é 15% de 3500', d, { now }).fala.texto, /R\$\s525,00/);
});

import { lerOfertaUnica, fraseDoPrint, perguntasDeCompra } from '../js/caos/ofertas.js';
import { BANKS } from '../js/engine.js';
import { temaBanco } from '../js/cores.js';

test('cartão da loja e cupom entram na conta (cartão Mercado Pago vale pro Mercado Livre)', () => {
  const r = lerOfertas(n('3500 no mercado livre e 3400 na amazon'));
  const c = completarOfertas(r.ofertas, n('cartão do mercado pago 10% e amazon cupom 100'));
  const a = analisarOfertas(c);
  const ml = a.linhas.find(l => l.loja === 'Mercado Livre'), amz = a.linhas.find(l => l.loja === 'Amazon');
  assert.equal(ml.cartaoPct, 10);
  assert.equal(ml.custoCents, 315000);
  assert.equal(ml.jeito, 'cartao_loja');
  assert.equal(amz.custoCents, 330000);
  assert.equal(a.melhor.loja, 'Mercado Livre');
  assert.match(textoOfertas(a), /no cartão da loja \(o melhor jeito aqui\)/);
});

test('loja nova no meio da conversa entra na comparação', () => {
  const r = lerOfertas(n('3500 no mercado livre e 3400 na amazon'));
  const c = completarOfertas(r.ofertas, n('e na magalu ta 3300'));
  assert.deepEqual(c.map(o => o.loja), ['Mercado Livre', 'Amazon', 'Magalu']);
});

test('oferta de uma loja só: guarda e pergunta (outra loja, cupom, cartão da loja)', () => {
  const u = lerOfertaUnica(n('achei a geladeira por 3.500 no mercado livre, tá bom?'));
  assert.equal(u.ofertas[0].precoCents, 350000);
  const q = perguntasDeCompra(['Mercado Livre']);
  assert.match(q, /Já olhou/);
  assert.match(q, /cartão Mercado Pago/);
  const d = { expenses: [], incomes: [], categories: DEFAULT_CATEGORIES, accounts: [], compromissos: [], planos: [], metas: [] };
  const now = Date.now();
  let c = conversar('achei a geladeira por 3.500 no mercado livre, tá bom?', d, { now });
  assert.match(c.fala.texto, /Anotei/);
  assert.equal(c.fala.rosto.emo, 'analista');
  c = conversar('na amazon ta 3400', d, { now: now + 1000, memory: c.memoria });
  assert.match(c.fala.texto, /Comparei 2 ofertas/);
});

test('print: a leitura da IA vira a mesma frase e entra na comparação aberta', () => {
  const frase = fraseDoPrint({ produto: 'Geladeira', ofertas: [{ loja: 'Amazon', preco_centavos: 340000, parcelas: 10, parcela_centavos: 34000, sem_juros: true, frete_centavos: 0, frete_gratis: true, desconto_pix_pct: 0 }] });
  assert.match(frase, /3400,00 na amazon 10x de 340,00 sem juros frete gratis/);
  assert.equal(fraseDoPrint({ ofertas: [] }), null);
  const d = { expenses: [], incomes: [], categories: DEFAULT_CATEGORIES, accounts: [], compromissos: [], planos: [], metas: [] };
  const now = Date.now();
  let c = conversar('achei a geladeira por 3500 no mercado livre', d, { now });
  c = conversar('mandar print', d, { now: now + 500, memory: c.memoria });
  assert.equal(c.fala.modoFoto, 'ofertas');
  c = conversar(frase, d, { now: now + 1000, memory: c.memoria });
  assert.match(c.fala.texto, /Comparei 2 ofertas/);
  assert.match(c.fala.texto, /10x sem juros/);
});

test('cartões de loja na lista de bancos (múltiplo de 5) com cor própria', () => {
  assert.ok(BANKS.includes('Cartão Amazon'));
  assert.equal(BANKS.length % 5, 0);
  assert.equal(temaBanco('Cartão Amazon').letra, '#FF9900');
});
