// Conversa do JF em 16/11 (prints): "qual a cotação?" depois do Robux virava Ibovespa; "como está o dólar?" sem o dado
// respondia "Fiz as contas pra você: Esse dado não veio".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const mercado = {
  atualizadoEm: '2026-11-13T13:10:00Z', moedas: {},
  ibov: { nome: 'Ibovespa', atual: 172458, varDia: 0.66, var5: 2.35, media20: 181107, dias: 20, tendencia: 'queda' },
  selic: { valor: 13.75 }, ipca12: { valor: 4.63 },
};
const d = { expenses: [], incomes: [], accounts: [], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [], planos: [], metas: [], mercado };
const now = Date.UTC(2026, 10, 16, 12);
function papo(...frases) {
  let memory; const out = [];
  for (const t of frases) { const r = conversar(t, d, { memory, now }); memory = r.memoria; out.push(r.fala); }
  return out;
}

test('"qual a cotação?" depois do Robux segue no jogo e vai pra IA com o assunto junto', () => {
  const [, f] = papo('Quanto tá valendo 100 robux?!', 'Mas quanto tá valendo em relação ao real? Qual a cotação');
  assert.doesNotMatch(f.texto, /Ibovespa/);
  assert.equal(f.entendeu, false);
  assert.match(f.perguntaIA, /^Sobre Robux do Roblox: /);
});

test('sem jogo antes, "qual a cotação?" continua sendo mercado', () => {
  const [f] = papo('qual a cotação?');
  assert.match(f.texto, /Ibovespa/);
  assert.equal(f.perguntaIA, null);
});

test('depois do Robux, pergunta do dólar é do dólar', () => {
  const [, f] = papo('Quanto tá valendo 100 robux?', 'e o dólar, quanto tá?');
  assert.match(f.texto, /dólar/);
  assert.equal(f.perguntaIA, null);
});

test('dólar sem dado: diz a verdade, sem "Fiz as contas", e chama a IA online', () => {
  const [f] = papo('Como está o dólar?');
  assert.doesNotMatch(f.texto, /Fiz as contas|Esse dado/);
  assert.match(f.texto, /dólar não veio na última atualização/);
  assert.equal(f.entendeu, false);
});

test('dólar com dado continua respondendo aqui mesmo', () => {
  const comDolar = { ...d, mercado: { ...mercado, moedas: { USD: { nome: 'Dólar', atual: 5.4, varDia: 0.1, dias: 20, media20: 5.3, tendencia: 'alta' } } } };
  const r = conversar('Como está o dólar?', comDolar, { now });
  assert.match(r.fala.texto, /Dólar: R\$ 5,40/);
  assert.equal(r.fala.entendeu, true);
});
