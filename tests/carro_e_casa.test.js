// 2.2.0 (JF, 17/11): combustível no glossário, km por litro com aviso de mecânico e kWh da conta de luz, sem IA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entender, responder, lerConsumo, lerEnergia, APARELHOS } from '../js/caos/conversa.js';
import { GLOSSARIO } from '../js/caos/glossario.js';

const categories = [{ id: 'transporte', name: 'Transporte' }, { id: 'contas', name: 'Contas' }, { id: 'outros', name: 'Outros' }];
const fala = (f, dados = {}) => {
  const i = entender(f, { categories });
  return { i, r: responder(i, { categories, expenses: [], accounts: [], ...dados }, { today: '2026-11-17' }) };
};

test('glossário: combustíveis e energia, sempre em 0 ou 5', () => {
  assert.equal(GLOSSARIO.length % 5, 0);
  for (const [f, termo] of [['o que é gasolina aditivada?', 'Gasolina aditivada'], ['o que é a gasolina grid', 'Gasolina Grid'],
    ['o que é diesel s10?', 'Diesel'], ['aditivada vale a pena?', 'Gasolina aditivada'], ['o que é kwh', 'kWh (quilowatt-hora)']]) {
    const { i } = fala(f);
    assert.equal(i.intent, 'glossario', f);
    assert.equal(i.termo.termo, termo, f);
  }
});

test('km por litro: conta, custo por km e aviso de mecânico', () => {
  assert.deepEqual({ km: 400, litros: 40, preco: 620 }, (c => ({ km: c.km, litros: c.litros, preco: c.precoLitro }))(lerConsumo('rodei 400 km com 40 litros a 6,20 o litro')));
  const ok = fala('rodei 400 km com 40 litros a 6,20');
  assert.equal(ok.i.intent, 'consumo_carro');
  assert.match(ok.r.fato, /10 km por litro/);
  assert.match(ok.r.fato, /R\$\s0,62/);
  assert.doesNotMatch(ok.r.fato, /mecânico: pneu/);
  const ruim = fala('meu carro faz 6 km/l');
  assert.match(ruim.r.fato, /mecânico/);
});

test('km do mês soma os abastecimentos anotados', () => {
  const expenses = [{ id: 'a', date: '2026-11-05', amountCents: 25000, note: 'Posto gasolina', categoryId: 'transporte' },
    { id: 'b', date: '2026-11-12', amountCents: 20000, note: 'abasteci', categoryId: 'transporte' },
    { id: 'c', date: '2026-11-12', amountCents: 9000, note: 'pizza', categoryId: 'outros' }];
  const { r } = fala('rodei 1200 km esse mês', { expenses });
  assert.match(r.fato, /2 abastecimentos/);
  assert.match(r.fato, /R\$\s0,38/);
});

test('kWh: preço da conta, aparelho com tempo e sem confundir com gasto', () => {
  assert.equal(APARELHOS.length % 5, 0);
  assert.match(fala('minha conta de luz deu 250 com 300 kwh').r.fato, /R\$\s0,83 por kWh/);
  const ch = fala('quanto gasta um chuveiro 20 minutos por dia');
  assert.equal(ch.i.intent, 'energia');
  assert.match(ch.r.fato, /55 kWh/);
  assert.match(fala('um aparelho de 2000w 3 horas por dia a 0,92 o kwh').r.fato, /180 kWh.*R\$\s165,60/);
  assert.equal(lerEnergia('ar condicionado 9000 btus').w, 810);
  for (const f of ['paguei 250 na conta de luz', 'abasteci 200', 'gastei 50 no mercado']) assert.equal(fala(f).i.intent, 'registrar_gasto', f);
  assert.equal(fala('a gasolina vai subir?').i.intent, 'combustivel');
});
