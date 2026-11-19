// 2.3.5.5 (Dona Débora, 18/11): passando a lista do caderno pro Chat, "depois de uns 6 ou 8 ele não entendeu mais".
// Ela mandava o gasto seguinte sem responder o "Pagou como?"/"Foi em quê?", e o gasto novo virava resposta da pergunta
// velha (valor trocado). Data "03/11" virava R$ 3,00 ou R$ 11,00. E "quero zerar tudo" não tinha caminho.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversar } from '../js/caos/index.js';
import { entender } from '../js/caos/conversa.js';
import { DEFAULT_CATEGORIES } from '../js/engine.js';

const d = { expenses: [], incomes: [], accounts: [{ id: 'a1', name: 'Banco Teste', type: 'conta', balanceCents: 0 }], categories: DEFAULT_CATEGORIES, budgets: {}, compromissos: [] };
const now = Date.UTC(2026, 10, 18, 23);
const ent = t => entender(t, { categories: DEFAULT_CATEGORIES });

test('gasto novo completo não vira resposta da pergunta pendente', () => {
  let r = conversar('Drogasil 32,50', d, { now }); // Saúde, pergunta como pagou
  r = conversar('conta de luz 120', d, { now, memory: r.memoria });
  assert.match(r.fala.texto, /R\$\s120,00/, r.fala.texto);
  assert.match(r.fala.texto, /R\$\s32,50 ainda não foi anotado/, r.fala.texto);
  r = conversar('Supermercado Carone 230,45 Pix', d, { now, memory: r.memoria });
  assert.match(r.fala.texto, /R\$\s230,45/, r.fala.texto);
  assert.equal(r.fala.acao?.amountCents, 23045);
  assert.equal(r.fala.acao?.categoryId, 'mercado');
});

test('a resposta de verdade ainda completa a pergunta pendente', () => {
  let r = conversar('quermesse 50', d, { now }); // 2.3.5.12: cabeleireiro agora tem categoria (Cuidados pessoais)
  assert.match(r.fala.texto, /Foi em quê/);
  r = conversar('beleza', d, { now, memory: r.memoria });
  assert.match(r.fala.texto, /R\$\s50,00.*Pagou como/, r.fala.texto);
  r = conversar('Pix', d, { now, memory: r.memoria });
  assert.equal(r.fala.acao?.amountCents, 5000, r.fala.texto);
  r = conversar('padaria 12', d, { now });
  r = conversar('Pix', d, { now, memory: r.memoria });
  assert.equal(r.fala.acao?.amountCents, 1200, r.fala.texto);
});

test('data dd/mm não vira valor; farmácia pelo nome', () => {
  assert.equal(ent('dia 03/11 Pix 150 aluguel').valor, 15000);
  assert.equal(ent('03/11 farmácia 45').valor, 4500);
  assert.equal(ent('03/11/2026 mercado 80').valor, 8000);
  assert.equal(ent('Drogasil 32,50').categoria?.id, 'saude');
});

test('"quero zerar tudo" leva ao Recomeçar, sem apagar nada daqui', () => {
  for (const f of ['quero zerar tudo', 'quero apagar tudo e começar de novo', 'como faço pra começar do zero?']) {
    const r = conversar(f, d, { now });
    assert.equal(r.fala.acao?.tipo, 'abrir_recomecar', f);
    assert.match(r.fala.texto, /Começar do zero/);
  }
  assert.equal(ent('apaga o gasto de 50').intent, 'apagar_lancamento');
});
