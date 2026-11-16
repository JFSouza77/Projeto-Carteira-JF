// 2.1.4 (JF, 16/11): efeito formiguinha, pergunta curiosa depois do gasto e tangentes de TDAH sem internet
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar, curiosidadeDoGasto, reagir } from '../js/caos/index.js';
import { GERADORES } from '../js/caos/falas.js';
import { PERGUNTAS, tipoDaResposta } from '../js/caos/curiosidade.js';
import { DEFAULT_CATEGORIES as C, createExpense, detectExpenseEvents, formiguinhas } from '../js/engine.js';

const now = Date.UTC(2026, 10, 16, 15);
const gasto = (v, cat = 'restaurante', dia = 10, extra = {}) => createExpense({ amountCents: v, categoryId: cat, note: 'x', date: `2026-11-${String(dia).padStart(2, '0')}`, ...extra }, { categories: C });

test('formiguinha: soma só os gastinhos de até R$ 30 e avisa no 10º', () => {
  const lista = [];
  for (let i = 0; i < 9; i++) lista.push(gasto(1200));
  lista.push(gasto(25000, 'compras'));
  lista.push(gasto(2900, 'restaurante', 11, { compromissoId: 'c1' })); // conta fixa não conta
  const f = formiguinhas(lista, '2026-11');
  assert.equal(f.count, 9);
  assert.equal(f.totalCents, 10800);
  const decimo = gasto(1500, 'delivery');
  const evs = detectExpenseEvents({ expenses: [...lista, decimo], categories: C, newExpense: decimo });
  const ev = evs.find(e => e.type === 'formiguinha');
  assert.ok(ev, 'aviso no 10º gastinho');
  assert.equal(ev.count, 10);
  assert.equal(ev.totalCents, 12300);
  const onze = gasto(1000);
  assert.ok(!detectExpenseEvents({ expenses: [...lista, decimo, onze], categories: C, newExpense: onze }).some(e => e.type === 'formiguinha'));
});

test('formiguinha: a fala traz o número e a pergunta responde sem internet', () => {
  const { fala } = reagir([{ type: 'formiguinha', count: 10, totalCents: 12300, pct: 30 }], { now, rng: () => 0.1 });
  assert.match(fala.texto, /R\$\s123,00/);
  const exp = [gasto(1200), gasto(1500, 'delivery'), gasto(900)];
  const r = conversar('quais meus gastinhos?', { expenses: exp, incomes: [], accounts: [], categories: C, compromissos: [], planos: [], metas: [] }, { today: '2026-11-16', now });
  assert.match(r.fala.texto, /3 gastinhos/);
  assert.match(r.fala.texto, /R\$\s36,00/);
  assert.ok(r.fala.entendeu);
  for (const parte of ['abre', 'fato', 'fecho']) for (const lista of Object.values(GERADORES.formiguinha[parte])) assert.equal(lista.length % 5, 0);
});

test('pergunta curiosa: às vezes, nunca em conta fixa, e a resposta vira reação sem gravar dado', () => {
  assert.equal(curiosidadeDoGasto({ categoryId: 'moradia', amountCents: 100000 }, { now, rng: () => 0 }).fala, null);
  assert.equal(curiosidadeDoGasto({ categoryId: 'lazer', amountCents: 5000, compromissoId: 'c1' }, { now, rng: () => 0 }).fala, null);
  assert.equal(curiosidadeDoGasto({ categoryId: 'lazer', amountCents: 5000 }, { now, rng: () => 0.9 }).fala, null, 'chance');
  const c = curiosidadeDoGasto({ categoryId: 'delivery', amountCents: 5000 }, { now, rng: () => 0 });
  assert.ok(c.fala.texto.endsWith('?'));
  assert.ok(c.fala.sugestoes.length >= 2);
  // logo depois, não pergunta de novo
  assert.equal(curiosidadeDoGasto({ categoryId: 'lazer', amountCents: 5000 }, { memory: c.memoria, now: now + 60_000, rng: () => 0 }).fala, null);
  const d = { expenses: [], incomes: [], accounts: [], categories: C, compromissos: [], planos: [], metas: [] };
  let m = c.memoria;
  const r1 = conversar('Bateu a vontade', d, { memory: m, today: '2026-11-16', now: now + 60_000 });
  assert.equal(r1.fala.acao, null);
  assert.equal(r1.memoria.curiosidade.impulsos, 1);
  m = curiosidadeDoGasto({ categoryId: 'compras', amountCents: 8000 }, { memory: r1.memoria, now: now + 4 * 3_600_000, rng: () => 0 }).memoria;
  const r2 = conversar('foi impulso', d, { memory: m, today: '2026-11-16', now: now + 4 * 3_600_000 + 1000 });
  assert.match(r2.fala.texto, /2º impulso/);
  assert.match(r2.fala.texto, /R\$\s130,00/);
});

test('pergunta curiosa: as respostas dos botões são entendidas', () => {
  for (const lista of Object.values(PERGUNTAS)) {
    assert.equal(lista.length % 5, 0);
    for (const p of lista) for (const s of p.sugestoes) {
      const tx = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      assert.ok(tipoDaResposta(tx), `botão sem leitura: ${s}`);
    }
  }
});

test('tangente de TDAH: sai às vezes num 2º balão, no máximo 1 a cada 30 min, e nunca em alerta', () => {
  const t = GERADORES.tangente;
  for (const parte of ['abre', 'curiosidade', 'volta']) assert.equal(t[parte].geral.length % 5, 0);
  const d = { expenses: [gasto(5000)], incomes: [], accounts: [], categories: C, compromissos: [], planos: [], metas: [] };
  const finais = t.volta.geral;
  let m, tang = 0, ultima = -Infinity;
  for (let i = 0; i < 120; i++) {
    const quando = now + i * 5 * 60_000;
    const r = conversar('quanto gastei este mês?', d, { memory: m, mood: 'suave', now: quando, today: '2026-11-16' });
    m = r.memoria;
    if (r.fala.posTexto && finais.some(f => r.fala.posTexto.endsWith(f))) {
      assert.ok(quando - ultima >= 30 * 60_000, 'intervalo');
      ultima = quando; tang++;
    }
  }
  assert.ok(tang >= 2, `tangentes: ${tang}`);
});

test('nome na frente: a 1ª palavra vira minúscula, menos banco e sigla (saía "Teste, Anotando")', () => {
  const d = { expenses: [], incomes: [], accounts: [{ id: 'n1', bank: 'Nubank', balanceCents: 1000, balanceAt: now }], categories: C, compromissos: [], planos: [], metas: [] };
  let m, viu = false;
  for (let i = 0; i < 12; i++) {
    const r = conversar('gastei 50 no mercado', d, { memory: m, now: now + i * 3_600_000, today: '2026-11-16', perfil: { apelido: 'Teste' } });
    m = { ...r.memoria, aguardando: null };
    assert.doesNotMatch(r.fala.texto, /Teste, [A-ZÀ-Ú][a-zà-ú]/, r.fala.texto);
    if (/^Teste, /.test(r.fala.texto)) viu = true;
  }
  assert.ok(viu);
});
