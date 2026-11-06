// Aniversário e jeito de falar por idade (06/11). Datas inventadas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idadeDe, faixaEtaria, ehAniversario, lerAniversario } from '../js/engine.js';
import { contexto, falaAvulsa, memoriaInicial } from '../js/caos/index.js';
import { GERADORES } from '../js/caos/falas.js';

test('idade e faixa', () => {
  assert.equal(idadeDe('2000-11-06', '2026-11-06'), 26);
  assert.equal(idadeDe('2000-11-07', '2026-11-06'), 25);
  assert.equal(idadeDe(null, '2026-11-06'), null);
  assert.equal(idadeDe('2030-01-01', '2026-11-06'), null);
  assert.deepEqual([5, 12, 13, 17, 18, 25, 26, 70].map(faixaEtaria), ['crianca', 'crianca', 'adolescente', 'adolescente', 'jovem', 'jovem', 'adulto', 'adulto']);
});

test('lê a data do jeito que a pessoa escreve', () => {
  const hoje = '2026-11-06';
  assert.equal(lerAniversario('05/03/1998', hoje), '1998-03-05');
  assert.equal(lerAniversario('5-3-98', hoje), '1998-03-05');
  assert.equal(lerAniversario('1998-03-05', hoje), '1998-03-05');
  assert.equal(lerAniversario('nasci em 5 de março de 1998', hoje), '1998-03-05');
  assert.equal(lerAniversario('10/01/15', hoje), '2015-01-10');
  assert.equal(lerAniversario('31/02/2000', hoje), null);
  assert.equal(lerAniversario('01/01/2030', hoje), null);
  assert.equal(lerAniversario('sei lá', hoje), null);
});

test('aniversário no dia (29/02 vale em 28/02 fora do bissexto)', () => {
  assert.equal(ehAniversario('1998-11-06', '2026-11-06'), true);
  assert.equal(ehAniversario('1998-11-07', '2026-11-06'), false);
  assert.equal(ehAniversario('2004-02-29', '2027-02-28'), true);
  assert.equal(ehAniversario('2004-02-29', '2028-02-28'), false);
});

test('faixa vira balde de contexto; criança nunca recebe zoeira', () => {
  const now = new Date(2026, 10, 6, 10).getTime();
  const t = a => contexto({ humor: 'acido', emocao: 'calmo', now, perfil: { apelido: 'Fulano', aniversario: a } });
  assert.ok(t('2016-01-01').has('idade_crianca'));
  assert.ok(!t('2016-01-01').has('humor_acido'));
  assert.ok(t('2010-01-01').has('idade_adolescente'));
  assert.ok(t('2010-01-01').has('humor_acido'));
  assert.ok(t('2004-01-01').has('idade_jovem'));
  assert.ok(t('1980-01-01').has('idade_adulto'));
  assert.ok(t('1980-11-06').has('aniversario'));
  assert.ok(!t('1980-11-07').has('aniversario'));
});

test('baldes novos fecham em 0 ou 5, e criança no Ácido não ouve zoeira em mil montagens', () => {
  for (const [g, def] of Object.entries(GERADORES)) {
    for (const [slot, baldes] of Object.entries(def)) {
      if (slot === 'moldes') continue;
      for (const [b, l] of Object.entries(baldes)) assert.equal(l.length % 5, 0, `${g}.${slot}.${b}`);
    }
  }
  const zoeira = new Set(Object.values(GERADORES).flatMap(d => Object.entries(d).filter(([k]) => k !== 'moldes').flatMap(([, b]) => b.humor_acido || [])));
  let mem = memoriaInicial();
  const now = new Date(2026, 10, 6, 10).getTime();
  for (let i = 0; i < 1000; i++) {
    const r = falaAvulsa('resposta', { fato: 'Você gastou R$ 10,00.' }, { mood: 'acido', memory: mem, now, perfil: { apelido: 'Pequeno', aniversario: '2017-05-05' } });
    mem = r.memoria;
    for (const z of zoeira) assert.ok(!r.texto.includes(z), r.texto);
  }
});

test('parabéns no dia, com o nome', () => {
  const r = falaAvulsa('aniversario', { nome: 'Fulano' }, { mood: 'suave', memory: memoriaInicial(), now: new Date(2026, 10, 6, 10).getTime(), perfil: { apelido: 'Fulano', aniversario: '1990-11-06' } });
  assert.match(r.texto, /Fulano/);
  assert.match(r.texto, /anivers|Parab/i);
});

// ---------- Rosto combinando com a frase (1.5.0) ----------
import { reagir, conversar } from '../js/caos/index.js';
import { emocaoDoTexto, escolherRosto } from '../js/caos/rostos.js';
import { DEFAULT_CATEGORIES, createExpense } from '../js/engine.js';

test('a frase escolhe o rosto', () => {
  assert.equal(emocaoDoTexto('Feliz aniversário, Fulano!'), 'festa');
  assert.equal(emocaoDoTexto('Mercado estourou o limite em R$ 50,00.'), 'preocupado');
  assert.equal(emocaoDoTexto('Anotado: R$ 10,00 em Mercado. Bom controle.'), 'orgulho');
  assert.equal(emocaoDoTexto('Saldo estimado total: R$ 150,00.'), null);
  assert.equal(escolherRosto({ texto: 'Feliz aniversário!', humor: 'suave' }).rosto.emo, 'festa');
});

test('alerta nunca sai com rosto de festa; piada nunca sai com rosto preocupado (mil vezes cada)', () => {
  const cats = DEFAULT_CATEGORIES.map(c => ({ ...c, budgetCents: c.id === 'mercado' ? 10000 : 0 }));
  const festivos = new Set(['festa', 'orgulho', 'carinho', 'alivio']);
  const tristes = new Set(['preocupado', 'triste', 'raiva', 'recompondo', 'tedio']);
  const tipos = ['categoria_estourada', 'orcamento_80', 'conta_negativa', 'mes_negativo', 'ritmo_alto', 'compromisso_atrasado'];
  let mem;
  let t0 = new Date(2026, 10, 6, 10).getTime();
  for (let i = 0; i < 1000; i++) {
    const mood = ['suave', 'normal', 'acido'][i % 3];
    const type = tipos[i % tipos.length];
    const ev = { type, categoryName: 'Mercado', amountCents: 1000, pct: 90, leftCents: 100, overCents: 500, accountName: 'Conta', balanceCents: -100, totalCents: 9000, incomeCents: 5000, projectedCents: 20000, budgetCents: 10000, nome: 'Luz', valorCents: 9000, dia: 3, days: 2, monthName: 'novembro' };
    const r = reagir([ev], { mood, memory: mem, now: t0 + i * 86_400_000 });
    if (!r.fala) continue;
    mem = r.memoria;
    assert.ok(!festivos.has(r.fala.rosto.emo), `${type} (${mood}) saiu ${r.fala.rosto.emo}: ${r.fala.texto}`);
  }
  mem = undefined;
  const dados = { expenses: [createExpense({ amountCents: 1000, categoryId: 'mercado', date: '2026-11-05' }, { categories: cats })], incomes: [], categories: cats, accounts: [], compromissos: [], planos: [] };
  for (let i = 0; i < 1000; i++) {
    const mood = ['suave', 'normal', 'acido'][i % 3];
    const r = conversar('me conta uma piada', dados, { mood, memory: mem, now: t0 + i * 60_000, today: '2026-11-06' });
    mem = r.memoria;
    assert.ok(!tristes.has(r.fala.rosto.emo), `piada (${mood}) saiu ${r.fala.rosto.emo}: ${r.fala.texto}`);
  }
});

test('reconhece o JF como criador (sem acento, minúsculas) e só ele', async () => {
  const { ehCriador } = await import('../js/caos/index.js');
  assert.equal(ehCriador({ apelido: 'JF' }), true);
  assert.equal(ehCriador({ nome: 'João Fernando', apelido: 'Jão' }), true);
  assert.equal(ehCriador({ apelido: 'tgp77' }), true);
  assert.equal(ehCriador({ apelido: 'Fulano' }), false);
  const now = new Date(2026, 10, 6, 10).getTime();
  assert.ok(contexto({ humor: 'suave', emocao: 'calmo', now, perfil: { apelido: 'JF' } }).has('criador'));
});
