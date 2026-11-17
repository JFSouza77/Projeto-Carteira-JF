// 2.3.0 (JF, 17/11): plantão, piso, salário mínimo, PIB, mesada, moedas novas e descrição do item comprado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entender, responder, descricaoDe } from '../js/caos/conversa.js';
import { MOEDAS } from '../js/mercado.js';

const categories = [{ id: 'compras', name: 'Compras' }, { id: 'outros', name: 'Outros' }];
const fala = (f, dados = {}) => {
  const i = entender(f, { categories });
  return { i, r: responder(i, { categories, expenses: [], incomes: [], accounts: [], ...dados }, { today: '2026-11-17' }) };
};

test('salário mínimo de 2026 e PIB com data', () => {
  assert.match(fala('qual o salário mínimo?').r.fato, /R\$ 1\.621/);
  const pib = fala('qual o pib do brasil');
  assert.equal(pib.i.intent, 'pib');
  assert.match(pib.r.fato, /12,7 trilhões.*2,3%.*IBGE/);
  assert.equal(fala('o que é pib').i.intent, 'glossario');
});

test('piso de profissão vai pra pesquisa; "piso" do banco continua do banco', () => {
  const p = fala('qual o piso de enfermeiro?');
  assert.equal(p.i.intent, 'piso_salarial');
  assert.equal(p.r.modoIA, 'pesquisa');
  assert.equal(fala('quanto ganha um professor').i.profissao, 'professor');
  assert.equal(fala('o que é piso salarial').i.intent, 'glossario');
  assert.equal(fala('meu piso no banestes é 2000').i.intent, 'definir_piso');
});

test('plantão vira extra e, quando são muitos, ele sugere descansar sem mandar', () => {
  const um = fala('recebi 800 de plantão');
  assert.equal(um.r.acao.sourceId, 'freela');
  assert.equal(um.r.acao.note, 'Plantão');
  assert.equal(um.r.dica, undefined);
  const incomes = ['2026-11-12', '2026-11-15'].map((date, k) => ({ id: `p${k}`, date, amountCents: 60000, sourceId: 'freela', note: 'Plantão' }));
  const muitos = fala('recebi 800 de plantão', { incomes });
  assert.match(muitos.r.dica, /3º plantão em 7 dias/);
  assert.match(muitos.r.dica, /quem decide é você/);
});

test('mesada: dicas de amigo, e "recebi de mesada" continua sendo entrada', () => {
  const m = fala('como peço mesada pros meus pais?');
  assert.equal(m.i.intent, 'pedir_mesada');
  assert.match(m.r.fato, /tudo bem/);
  assert.equal(fala('recebi 50 de mesada').i.intent, 'registrar_entrada');
});

test('moedas: 10 no total, com iene, dólar canadense e rublo ("rubra" também)', () => {
  assert.equal(Object.keys(MOEDAS).length % 5, 0);
  for (const [f, a] of [['quanto tá o iene?', 'JPY'], ['cotação do dólar canadense', 'CAD'], ['e a rubra?', 'RUB'], ['quanto ta o dolar', 'USD']]) {
    assert.equal(entender(f, { categories }).ativo, a, f);
  }
  const mercado = { atualizadoEm: new Date().toISOString(), moedas: { JPY: { nome: 'Iene', atual: 0.0352, dias: 1 } } };
  assert.match(fala('quanto tá o iene?', { mercado }).r.fato, /0,0352.*100 ienes = R\$\s3,52/);
});

test('descrição do item comprado (foto com legenda)', () => {
  assert.equal(descricaoDe('comprei esse tenis por 250'), 'tenis');
  assert.equal(descricaoDe('gastei 80 nessa camisa'), 'camisa');
  assert.equal(descricaoDe('gastei 30 no mercado'), 'mercado');
});
