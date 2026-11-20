// Pendência de 15/11 ("gasto de jogo: fazer a pergunta 'foi no crédito?' funcionar de verdade depois do registro"),
// conferida em 20/11: o "Pagou como?" (16/11) fecha o gasto de jogo no cartão. Este teste segura.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { DEFAULT_CATEGORIES, createCartao, createAccount } from '../js/engine.js';

test('jogo: "comprei 50 de robux" → "foi no crédito" → "à vista" vira gasto no cartão', () => {
  const now = new Date(2026, 10, 20, 12);
  const cartao = createCartao({ bank: 'Banco Teste', limiteCents: 300000, fechamentoDia: 25, vencimentoDia: 5 }, { now });
  const d = { expenses: [], incomes: [], accounts: [createAccount({ bank: 'Outro Banco', balanceCents: 100000 }, { now }), cartao], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [] };
  let r = conversar('comprei 50 de robux', d, { now: now.getTime() });
  assert.match(r.fala.texto, /Pagou como/);
  r = conversar('foi no crédito', d, { now: now.getTime(), memory: r.memoria });
  r = conversar('à vista', d, { now: now.getTime(), memory: r.memoria });
  assert.equal(r.fala.acao?.categoryId, 'jogos');
  assert.equal(r.fala.acao?.forma, 'credito');
  assert.equal(r.fala.acao?.accountId, cartao.id);
});

// 2.3.6.2 (ideia de 17/11): o que foi guardado a cada compra acompanha a data nova do gasto
test('transferenciasNaDataDoGasto: muda só a do gasto editado e o mês junto', async () => {
  const { transferenciasNaDataDoGasto } = await import('../js/engine.js');
  const lista = [{ id: 't1', autoDe: 'g1', date: '2026-11-10', month: '2026-11' }, { id: 't2', autoDe: 'g2', date: '2026-11-10', month: '2026-11' }, { id: 't3', date: '2026-11-10', month: '2026-11' }];
  const nova = transferenciasNaDataDoGasto(lista, 'g1', '2026-10-31');
  assert.deepEqual(nova.map(t => [t.id, t.date, t.month]), [['t1', '2026-10-31', '2026-10'], ['t2', '2026-11-10', '2026-11'], ['t3', '2026-11-10', '2026-11']]);
  assert.equal(transferenciasNaDataDoGasto(lista, 'g9', '2026-10-31'), lista, 'sem nada pra mudar, devolve a mesma lista');
});
