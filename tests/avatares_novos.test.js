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
  assert.equal(fala('gastei 80 na farmácia no pix', [{ id: 's', amountCents: 15000, categoryId: 'saude', note: 'Farmácia', date: hoje }]).avatar, 'cuidado_saude');
  assert.equal(fala('paguei 300 no mecânico no pix').avatar, 'faz_tudo');
  const compras = [1, 2, 3, 4].map(i => ({ id: `c${i}`, amountCents: 5000, categoryId: 'compras', note: 'Loja', date: hoje }));
  const r = fala('comprei uma blusa de 60 na shein no pix', compras);
  assert.equal(r.avatar, 'compras_demais');
  assert.match(r.texto, /5ª compra|5 compras/);
});

// 2.3.4.4 (JF): Estudante, Cinéfilo, Cara do TI, Feirante e Salva-Vidas (60 → 65), e o tema escolhe o profissional
test('os 5 avatares da 2.3.4.4 e o tema da conversa', async () => {
  const { FORMAS, formaPara } = await import('../js/avatar.js');
  assert.equal(Object.keys(FORMAS).length, 65);
  for (const f of ['estudante', 'cinefilo', 'ti', 'feirante', 'salvavidas']) {
    for (const a of FORMAS[f].acc) assert.match(fonte, new RegExp(`data-acc="${a}"`), `${f}: acessório ${a} sem desenho`);
  }
  assert.ok(FORMAS.faztudo.acc.includes('furadeira'));
  const { conversar } = await import('../js/caos/index.js');
  const { DEFAULT_CATEGORIES } = await import('../js/engine.js');
  const categories = DEFAULT_CATEGORIES.map(c => ({ ...c }));
  const fala = f => conversar(f, { expenses: [], incomes: [], accounts: [{ id: 'c', tipo: 'corrente', name: 'Inter' }], categories }, { mood: 'suave', memory: null, now: Date.now(), perfil: { apelido: 'Ana' } }).fala;
  const casos = { 'paguei 900 da mensalidade da faculdade no pix': 'estudante', 'gastei 60 no cinema no pix': 'cinefilo',
    'quanto custa em média uma memória ram de 16gb?': 'plano_ram', 'gastei 250 no mercado no pix': 'feirante', 'paguei 150 no encanador no pix': 'faz_tudo',
    'como saio das dívidas?': 'sair_dividas' };
  for (const [f, a] of Object.entries(casos)) assert.equal(fala(f).avatar || fala(f).intent, a, f);
  assert.equal(formaPara({ assunto: 'sair_dividas' }), 'salvavidas');
  assert.equal(formaPara({ assunto: 'energia' }), 'faztudo');
});

// 2.3.4.5 (JF): preço de tecnologia e lazer (teatro, museu, show, jogo) vão pra IA pesquisar, com o avatar certo
test('tecnologia e lazer: pesquisa na IA e nada "sem rota"', async () => {
  const { conversar } = await import('../js/caos/index.js');
  const { DEFAULT_CATEGORIES } = await import('../js/engine.js');
  const categories = DEFAULT_CATEGORIES.map(c => ({ ...c }));
  const fala = f => conversar(f, { expenses: [], incomes: [], accounts: [{ id: 'c', tipo: 'corrente', name: 'Inter' }], categories }, { mood: 'suave', memory: null, now: Date.now(), perfil: { apelido: 'Ana' } }).fala;
  // 2.3.4.6: tecnologia agora passa por um questionário de compatibilidade antes da IA (RAM, peça, aparelho)
  const esperado = { 'qual o preço de um iPhone 15?': 'plano_tech', 'quanto tá uma memória ram de 16gb?': 'plano_ram', 'quanto custa uma placa de vídeo?': 'plano_peca',
    'quanto custa um notebook bom?': 'plano_tech', 'vale a pena comprar um celular novo?': 'plano_tech' };
  for (const [f, plano] of Object.entries(esperado)) {
    const r = fala(f);
    assert.equal(r.intent, plano, f);
    assert.doesNotMatch(r.texto, /Detran/);
  }
  const venda = fala('quero vender meu celular, quanto vale?');
  assert.ok(venda.perguntaIA && venda.pesada && venda.avatar === 'ti');
  for (const f of ['quero ir no teatro', 'qual o teatro mais próximo?', 'quero ir no museu', 'tem alguma peça de teatro boa?', 'quero ir num stand up', 'quanto custa um ingresso de jogo de futebol?', 'quanto é o ingresso pro teatro?']) {
    assert.equal(fala(f).intent, 'plano_lazer', f);
  }
  assert.equal(fala('quanto gasta de luz um notebook ligado 8 horas por dia?').intent, 'energia');
});

// 2.3.4.6 (JF): memória RAM pergunta o que decide a compatibilidade; link vira conferência de preço; as duas são "pesadas"
test('RAM: questionário de compatibilidade, e o "não sei" vai pra IA explicar', async () => {
  const { conversar } = await import('../js/caos/index.js');
  const d = { expenses: [], incomes: [], accounts: [], categories: [] };
  let mem = null; let r;
  const passos = [];
  for (const f of ['quanto tá uma memória ram de 16gb?', 'Notebook', 'Não sei', 'Não sei', 'até 400']) {
    r = conversar(f, d, { mood: 'suave', memory: mem, now: Date.now(), perfil: { apelido: 'Ana' } });
    mem = r.memoria; passos.push(r.fala.texto);
  }
  assert.match(passos[0], /notebook ou computador de mesa/i);
  assert.match(passos[1], /DDR3, DDR4 ou DDR5/);
  assert.match(passos[2], /frequência/);
  assert.ok(r.fala.pesada);
  assert.match(r.fala.perguntaIA, /Notebook/);
  assert.match(r.fala.perguntaIA, /não sabe: tipo, frequência/);
  assert.match(r.fala.caminho, /DDR3, DDR4 ou DDR5/);
  // já veio tudo: vai direto
  const direto = conversar('quero comprar memória ram ddr4 3200 16gb pro notebook', d, { mood: 'suave', memory: null, now: Date.now(), perfil: { apelido: 'Ana' } }).fala;
  assert.ok(direto.perguntaIA && direto.pesada);
});

test('link de loja: confere o preço (pesquisa pesada), e a lista de "já usei hoje" fecha em 5', async () => {
  const { conversar } = await import('../js/caos/index.js');
  const { PESADA_ESGOTADA, PESADA_USADA } = await import('../js/caos/conversa.js');
  const r = conversar('esse preço tá bom? https://www.loja.com.br/produto/notebook-xyz', { expenses: [], incomes: [], categories: [] }, { mood: 'suave', memory: null, now: Date.now(), perfil: { apelido: 'Ana' } }).fala;
  assert.equal(r.intent, 'conferir_link');
  assert.ok(r.pesada);
  assert.match(r.perguntaIA, /https:\/\/www\.loja\.com\.br/);
  assert.equal(PESADA_ESGOTADA.length % 5, 0);
  for (const x of [...PESADA_ESGOTADA, PESADA_USADA]) assert.match(x, /ChatGPT/);
});
