// 2.1.9.1 (pedido do JF): Frentista, Pet Lover, Corretor, Turista e Chef existem, têm rostinho e aparecem no assunto certo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fonte = readFileSync(new URL('../js/avatar.js', import.meta.url), 'utf8');

test('os 5 avatares novos existem com emoção e rostinho', () => {
  for (const f of ['frentista', 'petlover', 'corretor', 'turista', 'chef']) {
    assert.match(fonte, new RegExp(`\\b${f}\\s*:`), `forma ${f} sumiu`);
    assert.ok((fonte.match(new RegExp(`\\b${f}\\s*:`, 'g')) || []).length >= 3, `${f} sem emoção ou rostinho`);
  }
});

test('assunto leva ao avatar certo', () => {
  const pares = { plano_pet: 'petlover', plano_moradia: 'corretor', plano_viagem: 'turista', combustivel: 'frentista', delivery_repetido: 'chef' };
  for (const [a, f] of Object.entries(pares)) assert.match(fonte, new RegExp(`${a}\\s*:\\s*'${f}'`), `${a} → ${f}`);
});

// 2.3.4.3 (JF): Farmacêutico, Faz-Tudo, Sacoleiro, Sortudo e Colega de Trabalho (55 → 60), e o GPS quando fica sem resposta
test('os 5 avatares da 2.3.4.3 existem e aparecem no assunto certo', async () => {
  const { FORMAS, formaPara } = await import('../js/avatar.js');
  assert.equal(Object.keys(FORMAS).length % 5, 0);
  for (const f of ['farmaceutico', 'faztudo', 'sacoleiro', 'sortudo', 'trabalhador']) {
    assert.ok(FORMAS[f], f);
    for (const a of FORMAS[f].acc) assert.match(fonte, new RegExp(`data-acc="${a}"`), `${f}: acessório ${a} sem desenho`);
  }
  const pares = { nao_entendi: 'recalculando', texto_longo: 'recalculando', ia_acordando: 'recalculando', cuidado_saude: 'farmaceutico',
    cuidado_pet: 'farmaceutico', faz_tudo: 'faztudo', compras_demais: 'sacoleiro', loteria: 'sortudo', trabalho: 'trabalhador' };
  for (const [a, f] of Object.entries(pares)) assert.equal(formaPara({ assunto: a }), f, a);
});

test('C.A.O.S. escolhe o avatar: farmácia pesando, conserto e compra demais', async () => {
  const { conversar } = await import('../js/caos/index.js');
  const { DEFAULT_CATEGORIES } = await import('../js/engine.js');
  const categories = DEFAULT_CATEGORIES.map(c => ({ ...c }));
  const hoje = new Date().toISOString().slice(0, 10);
  const conta = [{ id: 'c', tipo: 'corrente', name: 'Inter' }];
  const fala = (f, expenses = []) => conversar(f, { expenses, incomes: [], accounts: conta, categories }, { mood: 'suave', memory: null, now: Date.now(), perfil: { apelido: 'Ana' } }).fala;
  assert.equal(fala('gastei 80 na farmácia no pix', [{ id: 's', amountCents: 15000, categoryId: 'saude', note: 'Farmácia', date: hoje }]).intent, 'cuidado_saude');
  assert.equal(fala('paguei 300 no mecânico no pix').intent, 'faz_tudo');
  const compras = [1, 2, 3, 4].map(i => ({ id: `c${i}`, amountCents: 5000, categoryId: 'compras', note: 'Loja', date: hoje }));
  const r = fala('comprei uma blusa de 60 na shein no pix', compras);
  assert.equal(r.intent, 'compras_demais');
  assert.match(r.texto, /5ª compra|5 compras/);
});
