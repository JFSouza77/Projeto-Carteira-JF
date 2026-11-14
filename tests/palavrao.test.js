// Palavrão (JF, 13/11 à noite): o C.A.O.S. entende, inclusive abreviado ("krlh", "pqp", "vsf"), mas responde sem
// palavrão. Xingar ele vira "xingamento"; desabafo no meio de um pedido não atrapalha o pedido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { lerPalavroes } from '../js/caos/conversa.js';
import { GERADORES } from '../js/caos/falas.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const d = { expenses: [], incomes: [], accounts: [], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [], planos: [], metas: [] };
const now = Date.UTC(2026, 10, 13, 23);
const fala = t => conversar(t, d, { now }).fala;
const PALAVRAO = /\b(caralho|porra|merda|bosta|foda|puta|cu|krlh|pqp|vsf|fdp)\b/i;

test('xingar o C.A.O.S. é xingamento, abreviado ou não', () => {
  for (const t of ['vsf caos', 'fdp', 'você é um lixo', 'caos de merda', 'cala a boca', 'vai se ferrar', 'VTNC']) assert.equal(fala(t).intent, 'xingamento', t);
});

test('desabafo no meio do pedido: entende o pedido e reage curto', () => {
  const g = fala('krlh gastei 500 no mercado');
  assert.equal(g.intent, 'registrar_gasto');
  assert.equal(g.acao.amountCents, 50000);
  assert.equal(fala('pqp quanto gastei esse mês?').intent, 'gasto_total');
  assert.equal(fala('que merda, onde mais gastei?').intent, 'maior_gasto'); // antes virava xingamento
});

test('palavrão sozinho é desabafo, e ele nunca responde com palavrão', () => {
  for (const t of ['krlh', 'porra', 'puta que pariu', 'mds']) assert.equal(fala(t).intent, 'desabafo', t);
  for (const t of ['krlh', 'vsf caos', 'porra gastei 50 no mercado', 'fdp']) assert.doesNotMatch(fala(t).texto, PALAVRAO, t);
  for (const g of ['desabafo', 'desabafo_curto', 'xingamento']) {
    for (const lista of Object.values(GERADORES[g].inteira)) for (const f of lista) assert.doesNotMatch(f, PALAVRAO, f);
    assert.equal(GERADORES[g].inteira.geral.length % 5, 0);
  }
});

test('lerPalavroes separa o palavrão do resto', () => {
  assert.deepEqual(lerPalavroes('krlh gastei 50'), { limpo: 'gastei 50', palavrao: true, ofensa: false, apelido: false });
  assert.equal(lerPalavroes('quanto gastei').palavrao, false);
  assert.equal(lerPalavroes('fds vou viajar').palavrao, false);
});

// JF, 14/11: "corno, quem te criou?" — ele só leu o "corno" e esqueceu a pergunta. Apelido de amigo (corno,
// vagabundo…) é tratamento, não xingamento; e xingamento junto com pergunta tem a pergunta respondida.
test('apelido de amigo não é xingamento, e a pergunta junto é respondida', () => {
  assert.equal(fala('Corno, quem te criou?!').intent, 'criador');
  assert.match(fala('Corno, quem te criou?!').texto, /JF/);
  assert.equal(fala('vagabundo, quanto gastei este mês?').intent, 'gasto_total');
  for (const t of ['e ai corno', 'fala vagabundo', 'corno']) assert.equal(fala(t).intent, 'apelido', t);
});

test('xingou e perguntou: responde a pergunta (e a paciência conta)', () => {
  const r = conversar('burro, quanto gastei?', d, { now });
  assert.equal(r.fala.intent, 'gasto_total');
  assert.equal(r.memoria.paciencia.n, 1);
  for (const t of ['cala a boca', 'vsf caos', 'seu lixo']) assert.equal(fala(t).intent, 'xingamento', t);
});

test('glossário: todo termo tem tema, e todo tema tem termo', async () => {
  const { GLOSSARIO, GLOS_TEMAS, temaDoTermo } = await import('../js/caos/glossario.js');
  const ids = new Set(GLOS_TEMAS.map(t => t.id));
  const usados = new Set(GLOSSARIO.map(temaDoTermo));
  for (const u of usados) assert.ok(ids.has(u), u);
  for (const id of ids) assert.ok(usados.has(id), `tema vazio: ${id}`);
  assert.equal(temaDoTermo(GLOSSARIO.find(g => g.termo === 'Bolsa Família')), 'governo');
  assert.equal(temaDoTermo(GLOSSARIO.find(g => g.termo === 'Fatura')), 'cartao');
});
