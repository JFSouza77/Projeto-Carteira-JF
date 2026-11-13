// Paciência do C.A.O.S. (JF, 13/11 à noite): xingou de novo e de novo, ele escala; no fim fica quietinho uns minutos e,
// quando a pessoa volta, pergunta se passou a raiva. Desculpa encerra. No Suave, a escalada é séria e sem zoeira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { GERADORES } from '../js/caos/falas.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const d = { expenses: [], incomes: [], accounts: [], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [], planos: [], metas: [] };
function conversa(mood, passos) {
  let mem, t = Date.UTC(2026, 10, 13, 22);
  return passos.map(([msg, min = 1]) => { t += min * 60_000; const r = conversar(msg, d, { mood, memory: mem, now: t }); mem = r.memoria; return r.fala; });
}
const XING = [['vsf caos'], ['seu inútil'], ['caos burro'], ['lixo'], ['fdp']];

test('escala: calmo, firme, firme, sério, última resposta', () => {
  const f = conversa('suave', XING).map(x => x.intent);
  assert.deepEqual(f, ['xingamento', 'xingamento_2', 'xingamento_2', 'xingamento_3', 'xingamento_fim']);
  const g = conversa('normal', XING).map(x => x.intent);
  assert.deepEqual(g.slice(3), ['xingamento_3_forte', 'xingamento_fim_forte']);
  assert.match(conversa('acido', XING)[3].texto, /pescar|volta|açaí/);
});

test('fica quietinho e depois pergunta se passou a raiva (e responde o que foi pedido)', () => {
  const f = conversa('suave', [...XING, ['quanto gastei?', 1], ['quanto gastei?', 4]]);
  assert.equal(f[5].intent, 'silencio');
  assert.ok(f[5].texto.length < 30);
  assert.equal(f[6].intent, 'passou_raiva');
  assert.match(f[6].texto, /gasto/i);
});

test('desculpa encerra na hora, e xingamento antigo não conta', () => {
  const f = conversa('suave', [...XING, ['desculpa', 1], ['quanto gastei?', 1]]);
  assert.equal(f[5].intent, 'desculpa_aceita');
  assert.equal(f[6].intent, 'gasto_total');
  const g = conversa('suave', [['vsf caos'], ['lixo', 45]]);
  assert.equal(g[1].intent, 'xingamento'); // 45 min depois volta ao começo
  assert.equal(conversa('suave', [['desculpa, quanto gastei?']])[0].intent, 'gasto_total'); // sem briga, desculpa é só educação
});

test('falas da paciência: de 5 em 5, sem palavrão, e o "vai pescar" fica fora do Suave', () => {
  for (const g of ['xingamento_2', 'xingamento_3', 'xingamento_3_forte', 'xingamento_fim', 'xingamento_fim_forte', 'silencio', 'passou_raiva', 'desculpa_aceita']) {
    const l = GERADORES[g].inteira.geral;
    assert.equal(l.length % 5, 0, g);
    for (const x of l) assert.doesNotMatch(x, /\b(caralho|porra|merda|foda|puta)\b/i);
  }
  for (const x of [...GERADORES.xingamento_3.inteira.geral, ...GERADORES.xingamento_fim.inteira.geral]) assert.doesNotMatch(x, /pescar|campeão|expulso/i);
  for (const f of conversa('suave', XING)) assert.doesNotMatch(f.texto, /pescar/);
});
