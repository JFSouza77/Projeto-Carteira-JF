// 2.3.1 (JF, 17/11): foco da conversa. "Só finanças" segura o que não é de dinheiro; desabafo ganha acolhimento.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assuntoDeDinheiro, perguntaDePesquisaGeral, respostaAcordando, respostaForaDoFoco, respostaPapoLivre } from '../js/caos/conversa.js';
import { conversar } from '../js/caos/index.js';

test('o que não é de dinheiro fica de fora do foco', () => {
  for (const f of ['Quais são os produtores do filme dos vingadores?', 'qual a distância entre Espírito Santo e São Paulo', 'qual a capital da frança', 'me conta quem ganhou o jogo', 'quanto tempo leva de ES pra SP']) {
    assert.equal(assuntoDeDinheiro(f), false, f);
  }
});

test('o que é de dinheiro passa', () => {
  for (const f of ['quanto custa um ingresso de cinema?', 'quanto faturou o filme dos vingadores', 'vale a pena comprar um carro elétrico?', 'como funciona o cartão de crédito', 'quanto rende 1000 na poupança', 'minha conta de luz veio alta']) {
    assert.equal(assuntoDeDinheiro(f), true, f);
  }
});

test('resposta fora do foco: amigável, e desabafo ganha acolhimento com o CVV', () => {
  const r = respostaForaDoFoco('qual a capital da frança', () => 0);
  assert.match(r, /Google/);
  const d = respostaForaDoFoco('Meu namorado me traiu com a Jurema');
  assert.match(d, /sinto muito/i);
  assert.match(d, /188/);
  assert.doesNotMatch(d, /Google/);
});

// 2.3.3.4 (JF, 17/11): Papo livre com freio
test('papo livre: pesquisa geral indica outro chat; conversa e dinheiro passam', () => {
  for (const f of ['qual filme está em cartaz atualmente?', 'quais são os times de futebol brasileiros?', 'qual é a capital da Austrália?', 'me conta a história da segunda guerra', 'traduz bom dia em inglês', 'quem descobriu o Brasil?']) {
    assert.equal(perguntaDePesquisaGeral(f), true, f);
  }
  for (const f of ['como você está hoje?', 'tô meio triste, terminei o namoro', 'quanto custa o ingresso do cinema?', 'qual o melhor cartão de crédito?', 'você gosta de ser um robô?', 'qual sua comida favorita?']) {
    assert.equal(perguntaDePesquisaGeral(f), false, f);
  }
  for (let i = 0; i < 5; i++) {
    const r = respostaPapoLivre(() => i / 5);
    assert.match(r, /ChatGPT/); assert.match(r, /Claude/);
  }
});

// 2.3.3.5 (Dona Débora): "como faço pra investir?" tinha caído no passeio geral pelas abas
test('como investir tem resposta de verdade, sem indicar produto', () => {
  const d = { expenses: [], incomes: [], accounts: [], budgets: {}, goals: [], cards: [], investimentos: [] };
  for (const f of ['como faço pra investir?', 'Investimento...', 'quero começar a investir', 'qual o melhor investimento?', 'como adiciono um investimento?']) {
    const { fala } = conversar(f, d, { mood: 'suave', memory: null, now: Date.now(), perfil: { apelido: 'Ana' } });
    assert.equal(fala.intent, 'como_investir', f);
    assert.match(fala.texto, /reserva de emergência/);
    assert.match(fala.texto, /Investimentos/);
    assert.match(fala.texto, /não indico/);
  }
});

test('IA que não respondeu: fala leve de "acordando", com o jeito de resolver', () => {
  for (let i = 0; i < 5; i++) assert.match(respostaAcordando(() => i / 5), /(reinici|fecha e abre|abre o app)/);
});

// 2.3.3.6 (JF, prometido pra Dona Débora): apagar pela conversa, sempre com o Confirmar da pessoa
test('apagar lançamento pela conversa: acha o certo e só propõe', () => {
  const d = { expenses: [{ id: 'g1', amountCents: 3000, note: 'Mercado', categoryId: 'mercado', date: '2026-11-14', createdAt: 3 }, { id: 'g2', amountCents: 5000, note: 'Farmácia', categoryId: 'saude', date: '2026-11-15', createdAt: 5 }],
    incomes: [{ id: 'e1', amountCents: 255000, sourceId: 'salario', date: '2026-11-04', createdAt: 4 }], accounts: [], categories: [{ id: 'mercado', name: 'Mercado' }, { id: 'saude', name: 'Saúde' }] };
  const fala = f => conversar(f, d, { mood: 'suave', memory: null, now: Date.now(), perfil: { apelido: 'Ana' } }).fala;
  const casos = { 'apaga a entrada que lancei errado': 'e1', 'lancei uma entrada errada': 'e1', 'remove o último gasto': 'g2', 'apaga o gasto de 30': 'g1', 'exclui o mercado': 'g1', 'apaga o salário': 'e1' };
  for (const [f, id] of Object.entries(casos)) {
    const r = fala(f);
    assert.equal(r.acao?.tipo, 'apagar_lancamento', f);
    assert.equal(r.acao.id, id, f);
    assert.match(r.texto, /Confirmar/);
  }
  assert.ok(!fala('apaga a luz').acao); // nome que não existe: não propõe nada
  assert.equal(fala('como apago um gasto?').intent, 'tutorial');
  assert.equal(fala('você consegue apagar um gasto?').intent, 'tutorial');
  assert.equal(fala('gastei 30 no mercado').intent, 'registrar_gasto');
});

// 2.3.4 (JF, num pet center): apostas, pet e cuidado com a saúde
test('apostas e pet: categoria certa e o aviso gentil', async () => {
  const { DEFAULT_CATEGORIES } = await import('../js/engine.js');
  const categories = DEFAULT_CATEGORIES.map(c => ({ ...c }));
  const hoje = new Date().toISOString().slice(0, 10);
  const conta = [{ id: 'c', tipo: 'corrente', name: 'Inter' }];
  const fala = (f, expenses = []) => conversar(f, { expenses, incomes: [], accounts: conta, categories }, { mood: 'suave', memory: null, now: Date.now(), perfil: { apelido: 'Ana' } }).fala;
  for (const [f, cat] of [['apostei 50 na bet no pix', 'apostas'], ['perdi 30 no tigrinho no pix', 'apostas'], ['joguei 10 no jogo do bicho no dinheiro', 'apostas'], ['gastei 40 no remédio do gato no pix', 'pet'], ['comprei ração 120 no pix', 'pet'], ['joguei 6 na mega no pix', 'lazer']]) {
    assert.equal(fala(f).acao?.categoryId, cat, f);
  }
  const apostou = [{ id: 'a', amountCents: 18000, categoryId: 'apostas', note: 'Bet', date: hoje }];
  assert.match(fala('apostei 50 na bet no pix', apostou).texto, /R\$\s230,00/);
  assert.doesNotMatch(fala('apostei 50 na bet no pix', apostou).texto, /vergonha|vício|viciad/i);
  const pet = [{ id: 'p', amountCents: 12000, categoryId: 'pet', note: 'Remédio do cachorro', date: hoje }];
  assert.match(fala('gastei 40 no remédio do gato no pix', pet).texto, /amiguinho|bichinho|ele/);
  const farmacia = [{ id: 's', amountCents: 15000, categoryId: 'saude', note: 'Farmácia', date: hoje }];
  assert.match(fala('gastei 80 na farmácia no pix', farmacia).texto, /(tá bem|está bem|esteja bem|como você está|tudo bem)/i);
});

test('banco sem mistério: Pix e cartão com passo a passo', () => {
  const fala = f => conversar(f, { expenses: [], incomes: [], categories: [] }, { mood: 'suave', memory: null, now: Date.now(), perfil: { apelido: 'Ana' } }).fala;
  assert.match(fala('como faço um pix?').texto, /QR Code/);
  assert.match(fala('como funciona o cartão de crédito?').texto, /fechamento/);
  for (const f of ['o que é conta corrente?', 'o que é linha de crédito?', 'o que é crédito consignado?', 'o que é bet?', 'o que é conta PJ?']) assert.equal(fala(f).intent, 'glossario', f);
});
