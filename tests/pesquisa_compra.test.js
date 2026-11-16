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

test('questionário sem IA, uma pergunta por vez; no fim vai pra IA com tudo junto', () => {
  const f = papo('me ajuda a achar uma geladeira de 300 litros', 'frost free, inox', 'casa com 4 pessoas', 'tanto faz', 'este mês', 'até 5000');
  assert.match(f[0].texto, /Me ajuda a te ajudar/);
  for (const x of f.slice(0, 5)) { assert.equal(x.entendeu, true, 'pergunta do questionário não gasta IA'); assert.equal(x.modoIA, null); }
  assert.ok(f[0].sugestoes.includes('Pular'));
  const fim = f[5];
  assert.equal(fim.entendeu, false);
  assert.equal(fim.modoIA, 'pesquisa');
  assert.match(fim.perguntaIA, /^Pesquisa de compra: uma geladeira de 300 litros\. Detalhes: frost free, inox\. Pra quê: casa com 4 pessoas\. Precisa pra: este mês\. Orçamento: R\$\s5\.000,00\.$/);
});

test('viagem: pergunta de onde, quando e quem, o que pesquisar e região; "Pular" deixa de fora', () => {
  const f = papo('quanto custaria uma viagem pra porto seguro?', 'vitoria', 'janeiro, 7 dias, 2 pessoas', 'Os dois', 'perto de coroa vermelha', 'sem orçamento');
  assert.match(f[1].texto, /Quando/);
  assert.match(f[5].perguntaIA, /^Pesquisa de viagem: .*porto seguro\. Saindo de: vitoria\. Quando e quem: janeiro, 7 dias, 2 pessoas\. Pesquisar: Os dois\. Região ou tipo de hotel: perto de coroa vermelha\. Orçamento: não informado\.$/);
  const g = papo('quanto custaria uma viagem pra porto seguro?', 'Pular', 'Pular', 'Pular', 'Pular', 'até 3000');
  assert.match(g[5].perguntaIA, /^Pesquisa de viagem: .*\. Orçamento: R\$\s3\.000,00\.$/);
});

test('"não" responde a pergunta (marca) sem cancelar; "cancelar" cancela; pergunta nova sai do questionário', () => {
  const f = papo('quero comprar um tenis', 'corrida', 'treino', 'não');
  assert.match(f[3].texto, /Precisa pra quando/);
  const c = papo('quero comprar um tenis', 'Cancelar');
  assert.match(c[1].texto, /fica pra depois/);
  const s = papo('quero comprar um tenis', 'quanto gastei este mês?');
  assert.match(s[1].texto, /gastou|gasto/i);
});

test('orçamento já na frase não é perguntado de novo; sem IA, ele dá o caminho (lojas e o que conferir)', () => {
  const f = papo('pesquisa o preço da geladeira, orçamento até 5000', 'Pular', 'Pular', 'Pular', 'Pular');
  assert.equal(f[4].modoIA, 'pesquisa', 'pulou o orçamento, que já veio na frase');
  assert.match(f[4].texto, /frete/);
  assert.match(f[4].texto, /IA online/);
});

// JF, 16/11: "o mesmo vale pra pet, aluguel, gasolina, onde economizar: ele orienta, não dá a resposta pronta"
test('planos guiados: pet, moradia, transporte e economizar, sem roubar registro nem consulta', () => {
  const tipo = f => entender(f).tipo;
  assert.equal(tipo('pretendo adotar um pet, quanto custa?'), 'pet');
  assert.equal(tipo('quanto custa cuidar de um pincher'), 'pet');
  assert.equal(tipo('acho que meu aluguel está muito caro, me ajuda a calcular'), 'moradia');
  assert.equal(tipo('gasto muito com gasolina'), 'transporte');
  assert.equal(tipo('onde posso economizar?'), 'economizar');
  assert.equal(entender('gastei 50 de gasolina').intent, 'registrar_gasto');
  assert.equal(entender('quanto gastei com gasolina?').intent, 'gasto_total');
  assert.equal(entender('comprei ração 100').intent, 'registrar_gasto');
});

test('pet: 5 perguntas sem IA e o plano vai pra IA com tudo', () => {
  const f = papo('quanto custa cuidar de um pincher?', 'cachorro pequeno, pinscher', 'Adotar', 'Tudo', 'vitoria', 'até 300');
  for (const x of f.slice(0, 5)) assert.equal(x.modoIA, null);
  assert.match(f[5].perguntaIA, /^Plano de pet: .*Bicho e porte: cachorro pequeno, pinscher\. Adotar ou comprar: Adotar\. Entra na conta: Tudo\. Cidade: vitoria\. Dá pra separar por mês: R\$\s300,00\.$/);
});

test('moradia e transporte avisam da privacidade antes de pedir bairro; economizar não tem orçamento', () => {
  const [m] = papo('acho que meu aluguel está muito caro');
  assert.match(m.texto, /fica só no seu celular/);
  assert.match(m.texto, /lixeira/);
  const [t] = papo('gasto muito com gasolina');
  assert.match(t.texto, /sem endereço/);
  const e = papo('onde posso economizar?', '300', 'Reserva', 'internet e celular', 'Nada', '3 meses');
  assert.match(e[5].perguntaIA, /^Plano pra economizar: .*Prazo: 3 meses\.$/);
  assert.doesNotMatch(e[5].perguntaIA, /Orçamento/);
});

test('todo questionário tem 5 perguntas (regra do 0 ou 5) e o orçamento, quando tem, é a última', async () => {
  const { PASSOS_PESQUISA } = await import('../js/caos/conversa.js');
  for (const [k, passos] of Object.entries(PASSOS_PESQUISA)) {
    assert.equal(passos.length, 5, k);
    const i = passos.findIndex(p => p.id === 'orcamento');
    assert.ok(i === -1 || i === passos.length - 1, k);
  }
});
