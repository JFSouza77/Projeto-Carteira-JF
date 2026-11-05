// C.A.O.S. financeiro: a camada de narração. Junta espinha, emoções, gerador de falas e conversa.
// REGRA: o narrador NUNCA altera dados. Não importa db.js, não toca em DOM nem em storage.
// Recebe cópias congeladas e devolve { fala, memoria } novos; quem grava a memória é o app.

import { formatBRL, INCOME_SOURCES, daysInMonth, toISODate } from '../engine.js';
import { congelar, protegido } from './espinha.js';
import { sentir, emocaoAtual, emocoesIniciais, intensidade, ROSTO } from './emocoes.js';
import { escolherRosto, memoriaRostoInicial } from './rostos.js';
import { gerarFala } from './gerador.js';
import { GERADORES, SUGESTOES } from './falas.js';
import { entender, responder } from './conversa.js';

// Sobe sempre que o C.A.O.S. for mexido (regra do JF).
export const CAOS_VERSAO = '1.2.0';

export const MOODS = Object.freeze({ suave: 'Suave', normal: 'Normal', acido: 'Ácido' });
export const DEFAULT_MOOD = 'suave';
export { SUGESTOES, ROSTO };
export { IDENTIDADE, resumoIdentidade } from './identidade.js';

// Prioridade: só uma fala por reação, a mais importante (para não virar spam).
const PRIORIDADE = {
  categoria_estourada: 50, conta_negativa: 48, mes_negativo: 46, orcamento_80: 40, mes_verde: 35,
  ritmo_alto: 30, delivery_repetido: 20, entrada_cadastrada: 15, gasto_cadastrado: 10, sem_registro: 8, boas_vindas: 5,
};
// Cooldown por tipo (ms). Alertas de orçamento e conta não têm: são úteis.
const COOLDOWN = {
  gasto_cadastrado: 3 * 60_000,
  entrada_cadastrada: 60_000,
  delivery_repetido: 12 * 3_600_000,
  ritmo_alto: 24 * 3_600_000,
  sem_registro: 24 * 3_600_000,
  mes_negativo: 12 * 3_600_000,
  boas_vindas: 6 * 3_600_000,
};
const RADAR_COOLDOWN = 6 * 3_600_000;
const ALERTAS = new Set(['categoria_estourada', 'orcamento_80', 'delivery_repetido', 'ritmo_alto', 'mes_negativo', 'conta_negativa']);

export function memoriaInicial(now = Date.now()) {
  return { versao: CAOS_VERSAO, gerador: {}, emocoes: emocoesIniciais(now), lastAt: {}, lastMonthClosed: null, rosto: memoriaRostoInicial(), rostoUltimo: null };
}

function normalizarMem(m, now) {
  const base = memoriaInicial(now);
  if (!m || typeof m !== 'object') return base;
  return { ...base, ...m, gerador: m.gerador || {}, lastAt: m.lastAt || {}, emocoes: m.emocoes || base.emocoes, rosto: m.rosto || base.rosto };
}

function periodo(h) {
  return h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
}

/** Etiquetas de contexto para o gerador (hora, dia, humor, emoção). */
export function contexto({ humor, emocao, now = Date.now() }) {
  const d = new Date(now);
  const tags = new Set([`humor_${humor}`, `emo_${emocao}`, `periodo_${periodo(d.getHours())}`]);
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
    categoria: ev.categoryName, valor: r(ev.amountCents), fonte, pct: ev.pct, resta: r(ev.leftCents),
    passou: r(ev.overCents), qtd: ev.count, dias: ev.days, total: r(ev.totalCents),
    mes: ev.monthName ? ev.monthName[0].toUpperCase() + ev.monthName.slice(1) : null,
    economia: r(ev.savedCents), previsto: r(ev.projectedCents), porDia: r(ev.perDayCents),
    orcamento: r(ev.budgetCents), entradas: r(ev.incomeCents), gastos: r(ev.totalCents),
    conta: ev.accountName, saldo: r(ev.balanceCents),
  };
}

function montar(gatilho, vars, { humor, emocao, mem, now, rng }) {
  const ctx = { tags: contexto({ humor, emocao, now }), vars: Object.fromEntries(Object.entries(vars).filter(([, v]) => v != null)) };
  const { texto, memoria } = gerarFala(GERADORES, gatilho, ctx, mem.gerador, { rng });
  return { texto, gerador: memoria };
}

function rostoDe(emocao) {
  return ROSTO[emocao] || ROSTO.calmo;
}

// Momentos fortes: o rosto vai direto, sem a escada (como no Perfil)
const ROSTO_LIVRE = new Set(['mes_verde', 'categoria_estourada', 'conta_negativa', 'piada', 'entrada_cadastrada']);

/** Rosto animado (sistema do Perfil) para o momento; devolve a memória nova. */
function rostoPara(mem, { emocao, evento, humor, now, rng, direto = false }) {
  const { rosto, memoria } = escolherRosto({
    emocao, evento, humor, rng, intensidade: intensidade(mem.emocoes, emocao, now),
    // reação direta a algo que a pessoa falou: rosto na hora; mudança de humor espontânea: pela escada
    memoria: mem.rosto, livre: direto || ROSTO_LIVRE.has(evento),
  });
  return { rosto, mem: { ...mem, rosto: memoria, rostoUltimo: rosto } };
}

/**
 * Reage a eventos do motor (gasto cadastrado, alertas, boas-vindas…).
 * @returns {{ fala: null | { texto, evento, alerta, emocao, rosto }, memoria }}
 */
function reagirBruto(eventos, { mood = DEFAULT_MOOD, memory, now = Date.now(), rng = Math.random } = {}) {
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
  const emocao = emocaoAtual(mem.emocoes, humor, now);
  const { texto, gerador } = montar(ev.type, varsDoEvento(ev), { humor, emocao, mem, now, rng });
  if (!texto) return { fala: null, memoria: mem };
  const r = rostoPara(mem, { emocao, evento: ev.type, humor, now, rng });
  const memoria = {
    ...r.mem, gerador,
    lastAt: { ...mem.lastAt, [ev.radar ? `radar:${ev.type}` : ev.type]: now },
    lastMonthClosed: ev.type === 'mes_verde' ? ev.month : mem.lastMonthClosed,
  };
  return { fala: { texto, evento: ev.type, alerta: ALERTAS.has(ev.type), emocao, rosto: r.rosto }, memoria };
}

const EVENTO_DA_INTENCAO = { elogio: 'elogio', xingamento: 'xingamento', agradecimento: 'agradecimento', piada: 'piada', identidade: 'carinho_conversa' };

/**
 * Conversa: responde a uma mensagem da pessoa com os números do motor.
 * @returns {{ fala: { texto, emocao, rosto, sugestoes, acao?, entendeu }, memoria }}
 */
function conversarBruto(texto, dados, { mood = DEFAULT_MOOD, memory, now = Date.now(), rng = Math.random, today } = {}) {
  const humor = MOODS[mood] ? mood : DEFAULT_MOOD;
  let mem = normalizarMem(memory, now);
  const d = congelar(dados);
  const intencao = entender(texto, d);
  mem = { ...mem, emocoes: sentir(mem.emocoes, EVENTO_DA_INTENCAO[intencao.intent] || 'pergunta', now) };
  const emocao = emocaoAtual(mem.emocoes, humor, now);
  const resp = responder(intencao, d, { today: today || toISODate(new Date(now)), emocao: rostoDe(emocao).nome });

  let fato = resp.fato;
  if (resp.alertas && resp.alertas.length) {
    // o principal alerta vira fala completa do gerador; os outros viram lista curta
    const principal = montar(resp.alertas[0].type, varsDoEvento(resp.alertas[0]), { humor, emocao, mem, now, rng });
    mem = { ...mem, gerador: principal.gerador };
    fato = `${fato} ${principal.texto}`;
    if (resp.alertas.length > 1) fato += ` Também: ${resp.alertas.slice(1).map(nomeAlerta).join(', ')}.`;
  }

  let saida;
  if (fato) {
    const r = montar('resposta', { fato }, { humor, emocao, mem, now, rng });
    saida = r.texto || fato;
    mem = { ...mem, gerador: r.gerador };
  } else {
    const r = montar(resp.gatilho || 'nao_entendi', resp.vars || {}, { humor, emocao, mem, now, rng });
    saida = r.texto;
    mem = { ...mem, gerador: r.gerador };
  }

  const EVENTO_ROSTO = { piada: 'piada', identidade: 'identidade', significado: 'identidade', criador: 'identidade', origem: 'identidade',
    nao_entendi: 'nao_entendi', xingamento: 'xingamento', elogio: 'elogio', como_funciona: 'pensando', limites: 'pensando' };
  const r = rostoPara(mem, { emocao, evento: EVENTO_ROSTO[intencao.intent], humor, now, rng, direto: !!EVENTO_ROSTO[intencao.intent] });
  mem = r.mem;
  return {
    fala: {
      texto: saida || 'Hmm.',
      emocao, rosto: r.rosto,
      sugestoes: resp.sugestoes || (intencao.intent === 'nao_entendi' ? SUGESTOES.slice(0, 5) : []),
      acao: resp.acao || null,
      entendeu: intencao.intent !== 'nao_entendi',
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
    default: return a.type;
  }
}

export function emocaoDoMomento(memory, mood = DEFAULT_MOOD, now = Date.now()) {
  const m = normalizarMem(memory, now);
  const e = emocaoAtual(m.emocoes, MOODS[mood] ? mood : DEFAULT_MOOD, now);
  return { emocao: e, aparencia: rostoDe(e), rosto: m.rostoUltimo };
}

/** Rosto pra um momento sem fala (ex.: "pensando" enquanto a IA online responde). Não muda a memória. */
export function rostoAvulso(evento, { mood = DEFAULT_MOOD, memory, now = Date.now(), rng = Math.random } = {}) {
  const m = normalizarMem(memory, now);
  return escolherRosto({ emocao: 'calmo', evento, humor: MOODS[mood] ? mood : DEFAULT_MOOD, memoria: m.rosto, rng, livre: true }).rosto;
}

// 3ª lei: erro dentro do narrador vira silêncio, nunca trava o app.
export const reagir = protegido('reagir', reagirBruto, (ev, o = {}) => ({ fala: null, memoria: o.memory ?? memoriaInicial() }));
export const conversar = protegido('conversar', conversarBruto, (t, d, o = {}) => ({
  fala: { texto: 'Deu um curto aqui dentro. Tenta de novo?', emocao: 'calmo', rosto: null, sugestoes: SUGESTOES.slice(0, 3), acao: null, entendeu: false },
  memoria: o.memory ?? memoriaInicial(),
}));
export { nomeAlerta };
