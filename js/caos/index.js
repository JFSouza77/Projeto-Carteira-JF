// C.A.O.S. financeiro: a camada de narração. Junta espinha, emoções, gerador de falas e conversa.
// REGRA: o narrador NUNCA altera dados. Não importa db.js, não toca em DOM nem em storage.
// Recebe cópias congeladas e devolve { fala, memoria } novos; quem grava a memória é o app.

import { completarOfertas } from './ofertas.js';
import { formatBRL, INCOME_SOURCES, daysInMonth, toISODate, idadeDe, faixaEtaria, ehAniversario } from '../engine.js';
import { congelar, protegido } from './espinha.js';
import { NUCLEO } from './nucleo.js';
import { sentir, emocaoEstavel, emocoesIniciais, intensidade, ROSTO } from './emocoes.js';
import { escolherRosto, memoriaRostoInicial, rostoAnalista, rostoEspantado } from './rostos.js';
export { rostoEspantado };
import { gerarFala } from './gerador.js';
import { GERADORES, SUGESTOES } from './falas.js';
import { entender, responder, continuarPagamento, proximaPerguntaPagamento, seguirPagamento } from './conversa.js';

// Sobe sempre que o C.A.O.S. for mexido (regra do JF).
export const CAOS_VERSAO = '2.1.1'; // 2.1.1 (13/11): limite garantido (bancos que dão limite por investimento). 2.1.0: paciência. 2.0.9: palavrão

export const MOODS = Object.freeze({ suave: 'Suave', normal: 'Normal', acido: 'Ácido' });
export const DEFAULT_MOOD = 'suave';
export { SUGESTOES, ROSTO };
export { IDENTIDADE, resumoIdentidade } from './identidade.js';

// Prioridade: só uma fala por reação, a mais importante (para não virar spam).
const PRIORIDADE = {
  categoria_estourada: 50, compromisso_atrasado: 49, conta_negativa: 48, cartao_limite: 47, mes_negativo: 46, cartao_vence: 45, compromisso_vence: 44,
  orcamento_80: 40, mes_verde: 35, plano_do_mes: 25, confira_banco: 9, auditor_assinatura: 9, meta_ritmo: 6,
  ritmo_alto: 30, ofensiva_marco: 28, racha_cadastrada: 27, a_receber: 22, delivery_repetido: 20, entrada_cadastrada: 15, gasto_cadastrado: 10, sem_registro: 8, boas_vindas: 5,
};
// Dias especiais (núcleo): todos com a mesma prioridade (logo acima das boas-vindas) e uma vez por dia
for (const { id } of NUCLEO.dias.especiais) PRIORIDADE[`dia_${id}`] = 7;
// Cooldown por tipo (ms). Alertas de orçamento e conta não têm: são úteis.
const COOLDOWN = {
  gasto_cadastrado: 3 * 60_000,
  entrada_cadastrada: 60_000,
  delivery_repetido: 12 * 3_600_000,
  ritmo_alto: 24 * 3_600_000,
  sem_registro: 24 * 3_600_000,
  mes_negativo: 12 * 3_600_000,
  boas_vindas: 6 * 3_600_000,
  ...Object.fromEntries(NUCLEO.dias.especiais.map(({ id }) => [`dia_${id}`, 20 * 3_600_000])),
  plano_do_mes: 24 * 3_600_000,
  cartao_limite: 12 * 3_600_000,
  cartao_vence: 12 * 3_600_000,
  confira_banco: 3 * 24 * 3_600_000,
  meta_ritmo: 2 * 24 * 3_600_000, // a cada 2 dias, no máximo
  auditor_assinatura: 7 * 24 * 3_600_000, // uma vez na semana do começo do mês
  a_receber: 24 * 3_600_000,
};
const RADAR_COOLDOWN = 6 * 3_600_000;
const PACIENCIA_ZERA = 30 * 60_000; // xingamento de mais de meia hora atrás não conta pra escalada
const SILENCIO_MS = 3 * 60_000; // quanto tempo ele fica quietinho depois da última resposta
const LIMITES_INTERVALO = 6 * 60 * 60 * 1000; // "1 vez por conversa ou assunto" (núcleo 1.4.0)
const ALERTAS = new Set(['cartao_limite', 'cartao_vence', 'categoria_estourada', 'orcamento_80', 'delivery_repetido', 'ritmo_alto', 'mes_negativo', 'conta_negativa', 'compromisso_vence', 'compromisso_atrasado', 'a_receber']);

export function memoriaInicial(now = Date.now()) {
  return { versao: CAOS_VERSAO, gerador: {}, emocoes: emocoesIniciais(now), lastAt: {}, lastMonthClosed: null, rosto: memoriaRostoInicial(), rostoUltimo: null, conversa: null };
}

function normalizarMem(m, now) {
  const base = memoriaInicial(now);
  if (!m || typeof m !== 'object') return base;
  return { ...base, ...m, gerador: m.gerador || {}, lastAt: m.lastAt || {}, emocoes: m.emocoes || base.emocoes, rosto: m.rosto || base.rosto };
}

const NOMES_DO_CRIADOR = new Set(['joao fernando', 'jf', 'tgp', 'jf77', 'tgp77']);
/**
 * Criador só com a conta confirmada pelo servidor (achado do Code, 12/11; foi o bug "Nick Protegido" do Perfil 1.9.5):
 * qualquer um podia digitar "JF" no primeiro acesso e virar criador. O selo vem do login (lista no servidor).
 */
export function ehCriador(perfil) {
  return !!perfil && perfil.seloCriador === true;
}

/** Só o nome parece o do criador (sem conta): ele trata como qualquer pessoa, no máximo brinca. */
export function pareceCriador(perfil) {
  const n = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return !!perfil && [perfil.apelido, perfil.nome].some(x => NOMES_DO_CRIADOR.has(n(x)));
}

/**
 * Dia especial (núcleo único, 12/11): o calendário é o mesmo do Perfil (NUCLEO.dias); as falas são as da Carteira.
 * Prioridade do núcleo: aniversários, depois as datas especiais. Devolve o id (ex.: 'sexta13') ou null.
 */
export function diaEspecial(iso) {
  const d = new Date(`${iso}T12:00:00`);
  const md = iso.slice(5);
  const dt = NUCLEO.datas;
  const regras = [
    ['aniversarioCaos', md === dt.meuAniversario],
    ['aniversarioCriador', md === dt.aniversarioDoCriador],
    ['aniversarioCarteira', md === dt.aniversarioDaCarteira],
    ['aniversarioPerfil', md === dt.aniversarioDoPerfil],
    ['sexta13', d.getDay() === 5 && d.getDate() === 13],
    ['natal', md === '12-24' || md === '12-25'],
    ['anoNovo', md === '12-31' || md === '01-01'],
    ['halloween', md === '10-31'],
    ['criancas', md === '10-12'],
    ['namorados', md === '06-12'],
  ];
  return regras.find(([, sim]) => sim)?.[0] ?? null;
}

function periodo(h) {
  return h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
}

/** Etiquetas de contexto para o gerador (hora, dia, humor, emoção, quem é a pessoa). */
export function contexto({ humor, emocao, now = Date.now(), perfil }) {
  const d = new Date(now);
  const tags = new Set([`humor_${humor}`, `emo_${emocao}`, `periodo_${periodo(d.getHours())}`]);
  if (perfil?.apelido) tags.add('temNome');
  // o JF é reconhecido como criador (João Fernando, JF, TGP, JF77, TGP77), comparando sem acento e em minúsculas
  if (ehCriador(perfil)) {
    tags.add('criador');
    // o JF pediu (06/11): com ele o C.A.O.S. é ácido como no Perfil, em qualquer humor
    tags.add('humor_acido');
  }
  if (perfil?.tratamento === 'formal') {
    tags.add('tratamento_formal');
    tags.delete('humor_acido'); // formal: sem zoeira
  }
  // Idade (06/11): a faixa vira balde de contexto. Criança nunca recebe zoeira (2ª lei, com cuidado redobrado).
  const hoje = toISODate(d);
  const idade = idadeDe(perfil?.aniversario, hoje);
  if (idade != null) {
    const faixa = faixaEtaria(idade);
    tags.add(`idade_${faixa}`);
    if (faixa === 'crianca') tags.delete('humor_acido');
  }
  if (ehAniversario(perfil?.aniversario, hoje)) tags.add('aniversario');
  if (d.getDay() === 0 || d.getDay() === 6) tags.add('fimDeSemana');
  const dia = d.getDate();
  const total = daysInMonth(toISODate(d).slice(0, 7));
  if (dia <= 5) tags.add('inicioDoMes');
  if (dia >= total - 4) tags.add('fimDoMes');
  // misturas contam como as emoções de base para escolher pedaços
  if (emocao === 'protetor' || emocao === 'tenso') tags.add('emo_preocupacao');
  if (emocao === 'radiante') tags.add('emo_orgulho');
  return tags;
}

function varsDoEvento(ev) {
  const r = v => (v != null ? formatBRL(v) : null);
  const fonte = ev.sourceId ? INCOME_SOURCES.find(s => s.id === ev.sourceId)?.name : null;
  return {
    categoria: ev.categoryName, valor: r(ev.amountCents ?? ev.valorCents), fonte, pct: ev.pct, resta: r(ev.leftCents),
    passou: r(ev.overCents), qtd: ev.count, dias: ev.days, total: r(ev.totalCents),
    mes: ev.monthName ? ev.monthName[0].toUpperCase() + ev.monthName.slice(1) : null,
    economia: r(ev.savedCents), previsto: r(ev.projectedCents), porDia: r(ev.perDayCents),
    orcamento: r(ev.budgetCents), entradas: r(ev.incomeCents), gastos: r(ev.totalCents),
    ano: r(ev.anoCents), quem: ev.quem, conta: ev.accountName ?? ev.nome, saldo: r(ev.balanceCents), dia: ev.dia, meta: ev.metaNome,
    quando: ev.type === 'compromisso_vence' || ev.type === 'cartao_vence'
      ? (ev.days === 0 ? 'hoje' : ev.days === 1 ? 'amanhã' : `em ${ev.days} dias (dia ${ev.dia})`) : null,
  };
}

function montar(gatilho, vars, { humor, emocao, mem, now, rng, perfil }) {
  const todas = { nome: perfil?.apelido || null, ...vars };
  const ctx = { tags: contexto({ humor, emocao, now, perfil }), vars: Object.fromEntries(Object.entries(todas).filter(([, v]) => v != null)) };
  const { texto, memoria } = gerarFala(GERADORES, gatilho, ctx, mem.gerador, { rng });
  return { texto, gerador: memoria };
}

function rostoDe(emocao) {
  return ROSTO[emocao] || ROSTO.calmo;
}

// Momentos fortes: o rosto vai direto, sem a escada (como no Perfil)
const ROSTO_LIVRE = new Set(['mes_verde', 'categoria_estourada', 'conta_negativa', 'piada', 'entrada_cadastrada']);

/** Rosto animado (sistema do Perfil) para o momento; devolve a memória nova. */
function rostoPara(mem, { emocao, evento, humor, now, rng, direto = false, texto = null, alerta = false }) {
  const { rosto, memoria } = escolherRosto({
    emocao, evento, humor, rng, intensidade: intensidade(mem.emocoes, emocao, now), texto, alerta,
    // reação direta a algo que a pessoa falou: rosto na hora; mudança de humor espontânea: pela escada
    memoria: mem.rosto, livre: direto || ROSTO_LIVRE.has(evento),
  });
  return { rosto, mem: { ...mem, rosto: memoria, rostoUltimo: rosto } };
}

/**
 * Reage a eventos do motor (gasto cadastrado, alertas, boas-vindas…).
 * @returns {{ fala: null | { texto, evento, alerta, emocao, rosto }, memoria }}
 */
function reagirBruto(eventos, { mood = DEFAULT_MOOD, memory, now = Date.now(), rng = Math.random, perfil = null } = {}) {
  const humor = MOODS[mood] ? mood : DEFAULT_MOOD;
  let mem = normalizarMem(memory, now);
  const evs = congelar(eventos || []);

  // Todo evento mexe nas emoções (mesmo os que não viram fala)
  let emocoes = mem.emocoes;
  for (const ev of evs) emocoes = sentir(emocoes, ev.type, now);
  mem = { ...mem, emocoes };

  const candidatos = evs
    .filter(ev => GERADORES[ev.type])
    .filter(ev => !(ev.type === 'mes_verde' && mem.lastMonthClosed === ev.month))
    .filter(ev => {
      // alerta vindo do radar (ao abrir o app) não se repete toda hora: no máximo 1 vez a cada 6 h
      const chave = ev.radar ? `radar:${ev.type}` : ev.type;
      const cd = ev.radar ? Math.max(COOLDOWN[ev.type] || 0, RADAR_COOLDOWN) : COOLDOWN[ev.type];
      const last = mem.lastAt[chave];
      return !cd || last == null || now - last >= cd;
    })
    .sort((a, b) => (PRIORIDADE[b.type] || 0) - (PRIORIDADE[a.type] || 0));

  if (!candidatos.length) return { fala: null, memoria: mem };
  const ev = candidatos[0];
  const est = emocaoEstavel(mem.emocoes, humor, now, mem.estab);
  mem = { ...mem, estab: est.estab };
  const emocao = est.emocao;
  const { texto, gerador } = montar(ev.type, varsDoEvento(ev), { humor, emocao, mem, now, rng, perfil });
  if (!texto) return { fala: null, memoria: mem };
  const r = rostoPara(mem, { emocao, evento: ev.type, humor, now, rng, texto, alerta: ALERTAS.has(ev.type) });
  const memoria = {
    ...r.mem, gerador,
    lastAt: { ...mem.lastAt, [ev.radar ? `radar:${ev.type}` : ev.type]: now },
    lastMonthClosed: ev.type === 'mes_verde' ? ev.month : mem.lastMonthClosed,
  };
  return { fala: { texto, evento: ev.type, alerta: ALERTAS.has(ev.type), emocao, rosto: r.rosto }, memoria };
}

const EVENTO_DA_INTENCAO = { elogio: 'elogio', xingamento: 'xingamento', desabafo: 'pergunta', agradecimento: 'agradecimento', piada: 'piada', identidade: 'carinho_conversa', nao_entendi: 'nao_entendi' };

/**
 * Conversa: responde a uma mensagem da pessoa com os números do motor.
 * @returns {{ fala: { texto, emocao, rosto, sugestoes, acao?, entendeu }, memoria }}
 */
function conversarBruto(texto, dados, { mood = DEFAULT_MOOD, memory, now = Date.now(), rng = Math.random, today, perfil = null } = {}) {
  const humor = MOODS[mood] ? mood : DEFAULT_MOOD;
  let mem = normalizarMem(memory, now);
  const d = congelar(dados);
  let intencao = entender(texto, { ...d, anterior: mem.conversa || null });
  // Paciência (JF, 13/11 à noite): xingou o C.A.O.S.? Ele escala aos poucos: calmo → firme → "vai pescar, filho" →
  // última resposta e fica quietinho uns minutos. Quando a pessoa volta, ele pergunta se passou a raiva.
  // Pedido de desculpa encerra na hora. No humor Suave a escalada é séria, sem zoeira (2ª lei).
  const pac = { n: 0, em: 0, silencioAte: 0, emburrou: false, ...(mem.paciencia || {}) };
  const txp = String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const desculpa = /\b(desculpa|desculpe|foi mal|perdao|me perdoa|sorry|nao foi por mal)\b/.test(txp);
  let assunto = null; // o que manda no avatar e no balde de fala (xingamento_2, silencio…)
  let passouRaiva = false;
  if (pac.n && now - pac.em > PACIENCIA_ZERA && !pac.emburrou) { pac.n = 0; }
  if (desculpa && (pac.n || pac.emburrou)) {
    intencao = { ...intencao, intent: 'xingamento', palpite: false };
    assunto = 'desculpa_aceita';
    Object.assign(pac, { n: 0, silencioAte: 0, emburrou: false });
  } else if (intencao.intent === 'xingamento') {
    pac.n += 1; pac.em = now;
    const forte = humor !== 'suave';
    if (pac.emburrou || pac.n >= 5) {
      assunto = forte ? 'xingamento_fim_forte' : 'xingamento_fim';
      Object.assign(pac, { silencioAte: now + SILENCIO_MS, emburrou: true });
    } else if (pac.n === 4) assunto = forte ? 'xingamento_3_forte' : 'xingamento_3';
    else if (pac.n >= 2) assunto = 'xingamento_2';
  } else if (pac.emburrou && now < pac.silencioAte) {
    intencao = { ...intencao, intent: 'xingamento', palpite: false };
    assunto = 'silencio';
  } else if (pac.emburrou) {
    passouRaiva = true;
    Object.assign(pac, { n: 0, silencioAte: 0, emburrou: false });
  }
  mem = { ...mem, paciencia: pac };
  // Esperando um valor (12/11): perguntou "quanto foi?" e a pessoa respondeu só o número
  const espera = mem.aguardando && now - (mem.aguardando.em || 0) < 15 * 60_000 ? mem.aguardando : null;
  if (espera?.tipo === 'valor_gasto' && intencao.valor && String(texto).trim().split(/\s+/).length <= 5
    && ['nao_entendi', 'registrar_gasto', 'gasto_sem_valor', 'cabe'].includes(intencao.intent)) {
    intencao = { ...intencao, intent: 'registrar_gasto', t: espera.t, categoria: intencao.categoria || espera.categoria, palpite: false };
  }
  // "esqueci de lançar" (12/11, achado do GPT): a resposta seguinte completa o rascunho, sem perguntar tudo de novo.
  // Pergunta ou pedido diferente não completa nada (o rascunho só cai fora).
  const tx = String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const cancela = /^(cancela|cancelar|deixa|deixa pra (la|depois)|esquece|nao quero|depois)\b/.test(tx);
  if (espera && ['esqueci', 'valor_gasto', 'desc_gasto', 'ofertas'].includes(espera.tipo) && cancela) {
    intencao = { ...intencao, intent: 'pagamento_resposta', resposta: { fato: 'Tranquilo, não anotei nada. Quando lembrar, é só me falar.', cru: true, sugestoes: [] }, palpite: false };
  } else if (espera?.tipo === 'esqueci' && ['nao_entendi', 'registrar_gasto', 'gasto_sem_valor'].includes(intencao.intent) && !/\?/.test(tx)) {
    const t2 = /^(gastei|paguei|comprei)\b/.test(intencao.t) ? intencao.t : `gastei ${intencao.t}`;
    // só o valor ("79,90"), sem dizer em quê (achado do GPT, 13/11): não inventa "Outros"; guarda o valor e pergunta
    const soValor = intencao.valor && !intencao.categoria && !/[a-z]{3,}/.test(tx.replace(/\b(r\$|reais|real|conto|pila|gastei|paguei|comprei|foi|uns?|umas?)\b/g, ''));
    if (soValor) {
      intencao = { ...intencao, intent: 'pagamento_resposta', palpite: false, resposta: {
        fato: `Guardei os ${formatBRL(intencao.valor)} aqui no rascunho. Foi em quê? Tipo "mercado", "uber" ou "farmácia". Se foi outro dia, junta a data: "farmácia ontem".`,
        cru: true, sugestoes: ['Mercado', 'Delivery', 'Transporte', 'Deixa pra depois'], aguardar: { tipo: 'desc_gasto', valor: intencao.valor } } };
    } else if (intencao.valor) intencao = { ...intencao, t: t2, intent: 'registrar_gasto', palpite: false };
    else if (intencao.categoria || intencao.intent !== 'nao_entendi') intencao = { ...intencao, t: t2, intent: 'gasto_sem_valor', palpite: false };
  } else if (espera?.tipo === 'desc_gasto' && !/\?/.test(tx)) {
    // resposta do "foi em quê?": junta com o valor guardado e vira a proposta (a pessoa ainda confirma)
    const reais = (espera.valor / 100).toFixed(2).replace('.', ',');
    const junto = entender(`gastei ${reais} ${texto}`, { ...d, anterior: null });
    if (junto.valor) intencao = { ...junto, intent: 'registrar_gasto', palpite: false };
  }
  // ofertas (13/11): "amazon 10x sem juros, shopee frete 80" completa a comparação que está aberta
  if (espera?.tipo === 'ofertas' && !cancela && intencao.intent !== 'comparar_ofertas') {
    const novas = completarOfertas(espera.ofertas, tx.replace(/%/g, ' porcento '));
    if (novas) intencao = { ...intencao, intent: 'comparar_ofertas', ofertas: novas, produto: espera.produto, palpite: false };
  }
  if (espera?.tipo === 'pagamento') {
    const resposta = continuarPagamento(espera.acao, texto, d);
    if (resposta) intencao = { ...intencao, intent: 'pagamento_resposta', resposta, palpite: false };
  }
  mem = { ...mem, aguardando: null };
  // Memória (06/11): "e agora?", "já sabe responder?" voltam na última pergunta que ficou sem resposta
  let retomada = null;
  if (intencao.intent === 'retomar' && mem.semResposta) {
    const de_novo = entender(mem.semResposta, { ...d, anterior: null });
    if (de_novo.intent !== 'nao_entendi' && !de_novo.palpite && de_novo.intent !== 'retomar') { intencao = de_novo; retomada = mem.semResposta; }
  }
  mem = { ...mem, emocoes: sentir(mem.emocoes, EVENTO_DA_INTENCAO[intencao.intent] || 'pergunta', now) };
  const est = emocaoEstavel(mem.emocoes, humor, now, mem.estab);
  mem = { ...mem, estab: est.estab };
  const emocao = est.emocao;
  let resp = responder(intencao, { ...d, anterior: mem.conversa || null }, { today: today || toISODate(new Date(now)), emocao: rostoDe(emocao).nome, perfil, now });
  if (assunto) resp = { gatilho: assunto, sugestoes: assunto === 'silencio' ? ['Desculpa'] : [] };
  // gasto novo: pergunta como pagou antes de propor (pula o que a pessoa já disse)
  if (resp.pagamento && resp.acao) {
    const q = proximaPerguntaPagamento(resp.acao, d.accounts || []);
    if (q) resp = { ...resp, ...seguirPagamento(resp.acao, d), acao: null, fato: `Anotando ${formatBRL(resp.acao.amountCents)}. ${q.texto}`, gatilho: null };
    else resp = { ...resp, acao: seguirPagamento(resp.acao, d).acao };
  }
  if (resp.aguardar) mem = { ...mem, aguardando: { ...resp.aguardar, em: now } };
  // "manda o print" no meio de uma comparação: a comparação continua aberta pro print entrar nela
  if (intencao.intent === 'ofertas_print' && espera?.tipo === 'ofertas') mem = { ...mem, aguardando: { ...espera, em: now } };

  let fato = resp.fato;
  if (retomada && fato) fato = `Sobre aquela sua pergunta ("${retomada}"): ${fato}`;
  // Melhor palpite (1.6.0): responde o que achou que era e pergunta de volta, em vez de "não entendi"
  if (intencao.palpite && fato) fato = `Acho que você quis saber isto: ${fato} Se não for, me pergunta de outro jeito.`;
  // 2.0.5 (núcleo 1.4.0, "limites"): em pergunta de decisão (investir, parcelar, qual comprar) ele ajuda e termina com
  // o lembrete de que é IA de bolso e quem decide é a pessoa. No máximo 1 vez por assunto a cada 6 h, pra não virar
  // robô pedindo desculpa (cuidado pedido pelo Code). O mercado usa o mesmo controle com as falas dele.
  const tema = resp.aviso ? 'investimento' : resp.decisao || null;
  if (tema && fato && !(now - ((mem.limites || {})[tema] || 0) < LIMITES_INTERVALO)) {
    const av = montar(resp.aviso ? 'aviso_mercado' : 'lembrete_limites', {}, { humor, emocao, mem, now, rng, perfil });
    mem = { ...mem, gerador: av.gerador, limites: { ...(mem.limites || {}), [tema]: now } };
    fato = `${fato} ${av.texto}`;
  }
  if (resp.alertas && resp.alertas.length) {
    // o principal alerta vira fala completa do gerador; os outros viram lista curta
    const principal = montar(resp.alertas[0].type, varsDoEvento(resp.alertas[0]), { humor, emocao, mem, now, rng, perfil });
    mem = { ...mem, gerador: principal.gerador };
    fato = `${fato} ${principal.texto}`;
    if (resp.alertas.length > 1) fato += ` Também: ${resp.alertas.slice(1).map(nomeAlerta).join(', ')}.`;
  }

  let saida;
  if (fato && resp.cru) {
    saida = fato; // pergunta direta (ex.: "quanto foi?"), sem embrulho
  } else if (fato) {
    const r = montar('resposta', { fato }, { humor, emocao, mem, now, rng, perfil });
    saida = r.texto || fato;
    mem = { ...mem, gerador: r.gerador };
  } else {
    const varsR = intencao.intent === 'retomar' ? { pergunta: mem.semResposta ? `"${mem.semResposta}"` : null } : {};
    const gat = intencao.intent === 'retomar' ? (mem.semResposta ? 'retomar_nao' : 'retomar_vazio') : (resp.gatilho || 'nao_entendi');
    const r = montar(gat, { ...(resp.vars || {}), ...Object.fromEntries(Object.entries(varsR).filter(([, v]) => v != null)) }, { humor, emocao, mem, now, rng, perfil });
    saida = r.texto;
    mem = { ...mem, gerador: r.gerador };
  }

  if (resp.dica && saida) saida = `${saida} ${resp.dica}`;
  // 2.0.9 (JF, 13/11): desabafo com palavrão no meio de um pedido ("krlh, gastei 500"): uma reação curta antes, sem
  // palavrão, e o pedido segue normal
  if (intencao.palavrao && !['xingamento', 'desabafo'].includes(intencao.intent) && saida) {
    const dz = montar('desabafo_curto', {}, { humor, emocao, mem, now, rng, perfil });
    if (dz.texto) { saida = `${dz.texto} ${saida}`; mem = { ...mem, gerador: dz.gerador }; }
  }
  if (passouRaiva) {
    const pr = montar('passou_raiva', {}, { humor, emocao, mem, now, rng, perfil });
    mem = { ...mem, gerador: pr.gerador };
    saida = ['nao_entendi', 'como_esta', 'saudacao', 'retomar'].includes(intencao.intent) || !saida ? pr.texto : `${pr.texto} ${saida}`;
    assunto = 'passou_raiva';
  }
  // Papo avulso demais seguido (06/11): na 5ª pergunta fora do dinheiro, ele chama de volta (sem bronca no Suave)
  const AVULSAS = new Set(['piada', 'identidade', 'significado', 'criador', 'origem', 'como_funciona', 'limites', 'elogio', 'xingamento', 'desabafo', 'como_esta', 'nao_entendi', 'sobre_jf', 'saudacao', 'agradecimento']);
  const avulsas = AVULSAS.has(intencao.intent) ? (mem.avulsas || 0) + 1 : 0;
  mem = { ...mem, avulsas };
  if (avulsas >= 5 && avulsas % 5 === 0 && saida && !assunto) { // na escalada da paciência, nada de "adoro conversar"
    const pd = montar('papo_demais', {}, { humor, emocao, mem, now, rng, perfil });
    if (pd.texto) { saida = `${saida} ${pd.texto}`; mem = { ...mem, gerador: pd.gerador }; }
  }

  const EVENTO_ROSTO = { piada: 'piada', identidade: 'identidade', significado: 'identidade', criador: 'identidade', origem: 'identidade',
    nao_entendi: 'nao_entendi', xingamento: 'xingamento', elogio: 'elogio', como_funciona: 'pensando', limites: 'pensando', sobre_jf: 'elogio' };
  const temAlerta = !!(resp.alertas && resp.alertas.some(a => ALERTAS.has(a.type)));
  // quando a pergunta já pede um rosto próprio (quem é você, o que pode fazer…), a frase não troca ele
  // ("o que você pode fazer?" saía preocupado por causa da palavra "aperta")
  const r = rostoPara(mem, { emocao, evento: EVENTO_ROSTO[intencao.intent], humor, now, rng, direto: !!EVENTO_ROSTO[intencao.intent], texto: EVENTO_ROSTO[intencao.intent] ? null : saida, alerta: temAlerta });
  mem = r.mem;
  // modo analista (13/11): ofertas e porcentagem ganham o rosto de óculos de analista
  if (['comparar_ofertas', 'oferta_unica', 'porcentagem', 'ofertas_print'].includes(intencao.intent)) {
    r.rosto = rostoAnalista(rng);
    mem = { ...mem, rostoUltimo: r.rosto };
  }
  // guarda a pergunta que ficou sem resposta (pra "e agora?"); some quando ela é respondida
  if (intencao.intent === 'nao_entendi') mem = { ...mem, semResposta: String(texto).trim().slice(0, 160) };
  else if (retomada) mem = { ...mem, semResposta: null };
  // lembra a última pergunta pra entender a próxima ("e no mês passado?")
  if (!['nao_entendi', 'retomar', 'explicar_melhor', 'gasto_sem_valor', 'pagamento_resposta'].includes(intencao.intent)) {
    mem = { ...mem, conversa: { intent: intencao.intent, categoryId: intencao.categoria?.id || null, periodo: intencao.periodo || 'mes', termo: intencao.termo?.termo || null } };
  }
  return {
    fala: {
      texto: saida || 'Hmm.',
      emocao, rosto: r.rosto,
      sugestoes: resp.sugestoes || (intencao.intent === 'nao_entendi' ? SUGESTOES.slice(0, 5) : []),
      acao: resp.acao || null,
      fluxoMeta: resp.fluxoMeta || null,
      modoFoto: resp.modoFoto || null, // a próxima foto é pra explicar (não pra lançar) // "quero juntar pra…": o app conduz as perguntas e propõe a meta
      filaIA: resp.filaIA || null, // pergunta que precisa do servidor: o app responde agora ou guarda na fila
      entendeu: intencao.intent !== 'nao_entendi' && !intencao.palpite && !(intencao.intent === 'retomar' && !retomada),
      palpite: !!intencao.palpite,
      intent: assunto || intencao.intent, // 2.0.8: o assunto da conversa (o app escolhe a forma do avatar com ele)
    },
    memoria: mem,
  };
}

function nomeAlerta(a) {
  switch (a.type) {
    case 'categoria_estourada': return `${a.categoryName} estourada`;
    case 'orcamento_80': return `${a.categoryName} em ${a.pct}%`;
    case 'ritmo_alto': return 'ritmo acima do orçamento';
    case 'mes_negativo': return 'saindo mais do que entrando';
    case 'conta_negativa': return `${a.accountName} no negativo`;
    case 'delivery_repetido': return `${a.count} deliveries na semana`;
    case 'sem_registro': return `${a.days} dias sem anotar`;
    case 'compromisso_vence': return `${a.nome} vence ${a.days === 0 ? 'hoje' : a.days === 1 ? 'amanhã' : `em ${a.days} dias`}`;
    case 'compromisso_atrasado': return `${a.nome} venceu dia ${a.dia}`;
    case 'plano_do_mes': return `este mês tem ${a.nome}`;
    case 'confira_banco': return `conferir o saldo de ${a.accountName}`;
    case 'a_receber': return `${formatBRL(a.totalCents)} a receber`;
    case 'cartao_limite': return `${a.accountName} com ${a.pct}% do limite`;
    case 'auditor_assinatura': return `${a.nome} ainda vale a pena?`;
    case 'cartao_vence': return `fatura do ${a.accountName} vence ${a.days === 0 ? 'hoje' : a.days === 1 ? 'amanhã' : `em ${a.days} dias`}`;
    default: return a.type;
  }
}

export function emocaoDoMomento(memory, mood = DEFAULT_MOOD, now = Date.now()) {
  const m = normalizarMem(memory, now);
  const e = emocaoEstavel(m.emocoes, MOODS[mood] ? mood : DEFAULT_MOOD, now, m.estab).emocao; // só lê, não conta fala
  return { emocao: e, aparencia: rostoDe(e), rosto: m.rostoUltimo };
}

/** Rosto pra um momento sem fala (ex.: "pensando" enquanto a IA online responde). Não muda a memória. */
export function rostoAvulso(evento, { mood = DEFAULT_MOOD, memory, now = Date.now(), rng = Math.random, texto = null } = {}) {
  const m = normalizarMem(memory, now);
  return escolherRosto({ emocao: 'calmo', evento, humor: MOODS[mood] ? mood : DEFAULT_MOOD, memoria: m.rosto, rng, livre: true, texto }).rosto;
}

// 3ª lei: erro dentro do narrador vira silêncio, nunca trava o app.
export const reagir = protegido('reagir', reagirBruto, (ev, o = {}) => ({ fala: null, memoria: o.memory ?? memoriaInicial() }));
export const conversar = protegido('conversar', conversarBruto, (t, d, o = {}) => ({
  fala: { texto: 'Deu um curto aqui dentro. Tenta de novo?', emocao: 'calmo', rosto: null, sugestoes: SUGESTOES.slice(0, 3), acao: null, entendeu: false },
  memoria: o.memory ?? memoriaInicial(),
}));
export { nomeAlerta };

/** Fala avulsa de um gatilho (ex.: as perguntas do primeiro acesso). Devolve { texto, memoria }. */
export const falaAvulsa = protegido('falaAvulsa', (gatilho, vars = {}, { mood = DEFAULT_MOOD, memory, now = Date.now(), rng = Math.random, perfil = null } = {}) => {
  const humor = MOODS[mood] ? mood : DEFAULT_MOOD;
  const mem = normalizarMem(memory, now);
  const est = emocaoEstavel(mem.emocoes, humor, now, mem.estab);
  const emocao = est.emocao;
  const r = montar(gatilho, vars, { humor, emocao, mem, now, rng, perfil });
  return { texto: r.texto, memoria: { ...mem, estab: est.estab, gerador: r.gerador } };
}, (g, v, o = {}) => ({ texto: '', memoria: o.memory ?? memoriaInicial() }));
