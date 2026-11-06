// C.A.O.S. financeiro: a camada de narração. Junta espinha, emoções, gerador de falas e conversa.
// REGRA: o narrador NUNCA altera dados. Não importa db.js, não toca em DOM nem em storage.
// Recebe cópias congeladas e devolve { fala, memoria } novos; quem grava a memória é o app.

import { formatBRL, INCOME_SOURCES, daysInMonth, toISODate, idadeDe, faixaEtaria, ehAniversario } from '../engine.js';
import { congelar, protegido } from './espinha.js';
import { sentir, emocaoAtual, emocoesIniciais, intensidade, ROSTO } from './emocoes.js';
import { escolherRosto, memoriaRostoInicial } from './rostos.js';
import { gerarFala } from './gerador.js';
import { GERADORES, SUGESTOES } from './falas.js';
import { entender, responder } from './conversa.js';

// Sobe sempre que o C.A.O.S. for mexido (regra do JF).
export const CAOS_VERSAO = '1.8.0';

export const MOODS = Object.freeze({ suave: 'Suave', normal: 'Normal', acido: 'Ácido' });
export const DEFAULT_MOOD = 'suave';
export { SUGESTOES, ROSTO };
export { IDENTIDADE, resumoIdentidade } from './identidade.js';

// Prioridade: só uma fala por reação, a mais importante (para não virar spam).
const PRIORIDADE = {
  categoria_estourada: 50, compromisso_atrasado: 49, conta_negativa: 48, cartao_limite: 47, mes_negativo: 46, cartao_vence: 45, compromisso_vence: 44,
  orcamento_80: 40, mes_verde: 35, plano_do_mes: 25, confira_banco: 9,
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
  plano_do_mes: 24 * 3_600_000,
  cartao_limite: 12 * 3_600_000,
  cartao_vence: 12 * 3_600_000,
  confira_banco: 3 * 24 * 3_600_000,
};
const RADAR_COOLDOWN = 6 * 3_600_000;
const ALERTAS = new Set(['cartao_limite', 'cartao_vence', 'categoria_estourada', 'orcamento_80', 'delivery_repetido', 'ritmo_alto', 'mes_negativo', 'conta_negativa', 'compromisso_vence', 'compromisso_atrasado']);

export function memoriaInicial(now = Date.now()) {
  return { versao: CAOS_VERSAO, gerador: {}, emocoes: emocoesIniciais(now), lastAt: {}, lastMonthClosed: null, rosto: memoriaRostoInicial(), rostoUltimo: null, conversa: null };
}

function normalizarMem(m, now) {
  const base = memoriaInicial(now);
  if (!m || typeof m !== 'object') return base;
  return { ...base, ...m, gerador: m.gerador || {}, lastAt: m.lastAt || {}, emocoes: m.emocoes || base.emocoes, rosto: m.rosto || base.rosto };
}

function periodo(h) {
  return h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
}

/** Etiquetas de contexto para o gerador (hora, dia, humor, emoção, quem é a pessoa). */
export function contexto({ humor, emocao, now = Date.now(), perfil }) {
  const d = new Date(now);
  const tags = new Set([`humor_${humor}`, `emo_${emocao}`, `periodo_${periodo(d.getHours())}`]);
  if (perfil?.apelido) tags.add('temNome');
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
    conta: ev.accountName ?? ev.nome, saldo: r(ev.balanceCents), dia: ev.dia, meta: ev.metaNome,
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
  const emocao = emocaoAtual(mem.emocoes, humor, now);
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

const EVENTO_DA_INTENCAO = { elogio: 'elogio', xingamento: 'xingamento', agradecimento: 'agradecimento', piada: 'piada', identidade: 'carinho_conversa' };

/**
 * Conversa: responde a uma mensagem da pessoa com os números do motor.
 * @returns {{ fala: { texto, emocao, rosto, sugestoes, acao?, entendeu }, memoria }}
 */
function conversarBruto(texto, dados, { mood = DEFAULT_MOOD, memory, now = Date.now(), rng = Math.random, today, perfil = null } = {}) {
  const humor = MOODS[mood] ? mood : DEFAULT_MOOD;
  let mem = normalizarMem(memory, now);
  const d = congelar(dados);
  const intencao = entender(texto, { ...d, anterior: mem.conversa || null });
  mem = { ...mem, emocoes: sentir(mem.emocoes, EVENTO_DA_INTENCAO[intencao.intent] || 'pergunta', now) };
  const emocao = emocaoAtual(mem.emocoes, humor, now);
  const resp = responder(intencao, d, { today: today || toISODate(new Date(now)), emocao: rostoDe(emocao).nome, perfil, now });

  let fato = resp.fato;
  // Melhor palpite (1.6.0): responde o que achou que era e pergunta de volta, em vez de "não entendi"
  if (intencao.palpite && fato) fato = `Acho que você quis saber isto: ${fato} Se não for, me pergunta de outro jeito.`;
  if (resp.aviso && fato) {
    // mercado: sempre com o lembrete de que é apoio, não recomendação
    const av = montar('aviso_mercado', {}, { humor, emocao, mem, now, rng, perfil });
    mem = { ...mem, gerador: av.gerador };
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
  if (fato) {
    const r = montar('resposta', { fato }, { humor, emocao, mem, now, rng, perfil });
    saida = r.texto || fato;
    mem = { ...mem, gerador: r.gerador };
  } else {
    const r = montar(resp.gatilho || 'nao_entendi', resp.vars || {}, { humor, emocao, mem, now, rng, perfil });
    saida = r.texto;
    mem = { ...mem, gerador: r.gerador };
  }

  const EVENTO_ROSTO = { piada: 'piada', identidade: 'identidade', significado: 'identidade', criador: 'identidade', origem: 'identidade',
    nao_entendi: 'nao_entendi', xingamento: 'xingamento', elogio: 'elogio', como_funciona: 'pensando', limites: 'pensando' };
  const temAlerta = !!(resp.alertas && resp.alertas.some(a => ALERTAS.has(a.type)));
  const r = rostoPara(mem, { emocao, evento: EVENTO_ROSTO[intencao.intent], humor, now, rng, direto: !!EVENTO_ROSTO[intencao.intent], texto: saida, alerta: temAlerta });
  mem = r.mem;
  // lembra a última pergunta pra entender a próxima ("e no mês passado?")
  if (intencao.intent !== 'nao_entendi') {
    mem = { ...mem, conversa: { intent: intencao.intent, categoryId: intencao.categoria?.id || null, periodo: intencao.periodo || 'mes' } };
  }
  return {
    fala: {
      texto: saida || 'Hmm.',
      emocao, rosto: r.rosto,
      sugestoes: resp.sugestoes || (intencao.intent === 'nao_entendi' ? SUGESTOES.slice(0, 5) : []),
      acao: resp.acao || null,
      fluxoMeta: resp.fluxoMeta || null, // "quero juntar pra…": o app conduz as perguntas e propõe a meta
      filaIA: resp.filaIA || null, // pergunta que precisa do servidor: o app responde agora ou guarda na fila
      entendeu: intencao.intent !== 'nao_entendi' && !intencao.palpite,
      palpite: !!intencao.palpite,
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
    case 'cartao_limite': return `${a.accountName} com ${a.pct}% do limite`;
    case 'cartao_vence': return `fatura do ${a.accountName} vence ${a.days === 0 ? 'hoje' : a.days === 1 ? 'amanhã' : `em ${a.days} dias`}`;
    default: return a.type;
  }
}

export function emocaoDoMomento(memory, mood = DEFAULT_MOOD, now = Date.now()) {
  const m = normalizarMem(memory, now);
  const e = emocaoAtual(m.emocoes, MOODS[mood] ? mood : DEFAULT_MOOD, now);
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
  const emocao = emocaoAtual(mem.emocoes, humor, now);
  const r = montar(gatilho, vars, { humor, emocao, mem, now, rng, perfil });
  return { texto: r.texto, memoria: { ...mem, gerador: r.gerador } };
}, (g, v, o = {}) => ({ texto: '', memoria: o.memory ?? memoriaInicial() }));
