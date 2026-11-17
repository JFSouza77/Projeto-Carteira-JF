// 2.3.1 (JF, 17/11): foco da conversa. "Só finanças" segura o que não é de dinheiro; desabafo ganha acolhimento.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assuntoDeDinheiro, perguntaDePesquisaGeral, respostaForaDoFoco, respostaPapoLivre } from '../js/caos/conversa.js';

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
