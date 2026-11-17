// 2.1.5 (JF, 16/11): "quanto tá um ingresso no cinemark?", "pesquisa na internet…", "dá pra ir ao cinema esse mês?"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { entender } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES as C, analyze, createAccount, createCartao } from '../js/engine.js';

const now = Date.UTC(2026, 10, 16, 15);
const d = { expenses: [], incomes: [], accounts: [], categories: C, compromissos: [], planos: [], metas: [] };
const fala = (t, memory) => conversar(t, d, { memory, now, today: '2026-11-16', perfil: { apelido: 'JF' } });

test('preço de ingresso não vira "quanto gastei em Lazer": vai pra pesquisa na hora', () => {
  for (const f of ['Quanto tá um ingresso para o Cinemark?', 'Pesquisa pra mim Quanto tá um ingresso para o Cinemark?', 'Pesquisa na internet o preço de um ingresso no Cinema']) {
    const r = fala(f).fala;
    assert.equal(r.modoIA, 'pesquisa', f);
    assert.match(r.perguntaIA, /Plano de passeio/);
    assert.doesNotMatch(r.texto, /Nenhum gasto|300 litros|frost/);
  }
  assert.equal(entender('quanto gastei com cinema?', { categories: C }).intent, 'gasto_total');
});

test('pedido detalhado de cinema vai direto, com o que já foi dito e a pergunta "cabe no mês?"', () => {
  const r = fala('Caos. Esse mês eu quero ir ao cinema assistir um filme. Vê pra mim quais são os valores dos shoppings, estacionamento, cinemas mais baratos que eu possa ir aqui na Grande Vitória. Você me recomenda comprar pipoca ou não? Dá pra ir ao cinema esse mês?').fala;
  assert.equal(r.modoIA, 'pesquisa');
  assert.match(r.perguntaIA, /Cidade ou região: grande vitoria/);
  assert.match(r.perguntaIA, /Quando: esse mes/);
  assert.match(r.perguntaIA, /Além do ingresso: pipoca, estacionamento/);
  assert.match(r.perguntaIA, /cabe no mês/);
});

test('no meio do questionário, um pedido novo de pesquisa não vira resposta', () => {
  const a = fala('me ajuda a achar uma geladeira');
  assert.match(a.fala.texto, /300 litros/);
  const b = fala('Pesquisa na internet o preço de um ingresso no Cinema', a.memoria).fala;
  assert.equal(b.modoIA, 'pesquisa');
  assert.match(b.perguntaIA, /ingresso/);
  assert.doesNotMatch(b.texto, /pra quê/);
});

test('"conferir o saldo" junta por banco e deixa o cartão de fora', () => {
  const velho = Date.parse('2026-11-01T12:00:00');
  const contas = ['Banestes', 'Banestes', 'C6 Bank', 'Inter', 'PicPay'].map((bank, i) => ({ ...createAccount({ bank, balanceCents: 1000, nickname: i === 1 ? 'Poupança' : '' }, { id: `a${i}` }), balanceAt: velho }));
  const cartao = { ...createCartao({ bank: 'C6 Bank', limiteCents: 70000, fechamentoDia: 4, vencimentoDia: 12 }, { id: 'k1' }), balanceAt: velho };
  const a = analyze({ ...d, accounts: [...contas, cartao] }, '2026-11-16').find(x => x.type === 'confira_banco');
  assert.equal(a.count, 5);
  assert.equal(a.accountName, '5 contas (Banestes, C6 Bank, Inter e PicPay)');
});

test('17/11: pergunta de "qual o melhor" vira pesquisa na IA; do próprio dinheiro continua aqui', () => {
  const tipo = f => { const r = entender(f, { categories: C }); return `${r.intent}:${r.tipo || ''}:${r.direto ? 'direto' : ''}`; };
  assert.equal(tipo('Qual melhor Shopping pra curtir um cinema?!'), 'pesquisa_compra:lazer:direto');
  assert.equal(tipo('qual o melhor tipo de ração para o meu cachorro?'), 'pesquisa_compra:pet:direto');
  assert.equal(tipo('qual o melhor custo-benefício de celular até 1500?'), 'pesquisa_compra:tech:direto'); // 2.3.4.6: tecnologia tem plano próprio
  assert.equal(tipo('me recomenda um restaurante barato em vitória'), 'pesquisa_compra:lazer:direto');
  assert.equal(tipo('onde é mais barato comprar fralda?'), 'pesquisa_compra:produto:direto');
  assert.equal(entender('qual banco rende mais?', { categories: C }).intent, 'bancos');
  assert.equal(entender('qual a melhor forma de economizar?', { categories: C }).intent, 'dica');
  assert.equal(entender('quanto gastei em restaurante?', { categories: C }).intent, 'gasto_total');
  assert.notEqual(entender('qual o shopping mais legal da cidade pra passear?', { categories: C }).intent, 'gasto_total');
});
