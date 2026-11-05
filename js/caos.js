// C.A.O.S. financeiro: camada de narração.
// REGRA: o narrador NUNCA altera dados. Não importa db.js, não toca em DOM nem em storage.
// Recebe eventos (só leitura) e a própria memória, e devolve { fala, memoria } novos.

import { formatBRL } from './engine.js';

export const MOODS = Object.freeze({
  suave: 'Suave',
  normal: 'Normal',
  acido: 'Ácido',
});
export const DEFAULT_MOOD = 'suave';

// Maior prioridade fala primeiro. Só uma fala por reação, para não virar spam.
const PRIORITY = {
  categoria_estourada: 50,
  orcamento_80: 40,
  mes_verde: 30,
  delivery_repetido: 20,
  gasto_cadastrado: 10,
  boas_vindas: 5,
};

// Cooldown por tipo de evento (ms). Alertas de orçamento não têm cooldown: são úteis.
const COOLDOWN = {
  gasto_cadastrado: 3 * 60_000,
  delivery_repetido: 12 * 3_600_000,
  boas_vindas: 6 * 3_600_000,
};

const NO_REPEAT = 3; // quantas falas recentes evitar por evento

// Placeholders: {categoria} {valor} {pct} {resta} {passou} {qtd} {dias} {total} {mes} {economia}
export const LINES = {
  boas_vindas: {
    suave: [
      'Sistema online. Bora anotar os gastos de hoje?',
      'Oi. Eu cuido dos comentários, você cuida dos números.',
      'C.A.O.S. de plantão. Cada gasto anotado é um susto a menos no fim do mês.',
    ],
    normal: [
      'C.A.O.S. ativo. Mostre-me suas escolhas financeiras.',
      'Voltou. Vamos ver o estrago de hoje.',
      'Sistema iniciado. Os números não mentem, eu às vezes exagero.',
    ],
    acido: [
      'Ah, você. Veio confessar quanto gastou?',
      'Inicializando julgamento financeiro... pronto.',
      'Bem-vindo de volta ao tribunal da carteira.',
    ],
  },
  gasto_cadastrado: {
    suave: [
      'Anotado: {valor} em {categoria}.',
      '{valor} em {categoria}, registrado. Bom controle.',
      'Gasto salvo. Quem anota sabe para onde o dinheiro vai.',
      'Registrado. {categoria} recebeu {valor}.',
    ],
    normal: [
      '{valor} em {categoria}. Arquivado no meu banco de memórias.',
      'Mais {valor} para {categoria}. Seguimos monitorando.',
      'Registrado. O motor somou, eu só comento.',
      '{categoria}: +{valor}. Os gráficos sentiram.',
    ],
    acido: [
      '{valor} em {categoria}. Fascinante. Continue.',
      'Lá se foram {valor}. {categoria} agradece a doação.',
      'Anotado. Não vou fingir que não vi.',
      '{valor}? Em {categoria}? Interessante escolha de vida.',
    ],
  },
  orcamento_80: {
    suave: [
      '{categoria} chegou a {pct}% do orçamento. Ainda restam {resta}, vai com calma.',
      'Aviso amigo: {pct}% de {categoria} já foi. Sobram {resta} para o resto do mês.',
      '{categoria} está em {pct}%. Dá para segurar com os {resta} que restam.',
    ],
    normal: [
      'Alerta: {categoria} em {pct}%. Restam {resta}. Planeje o próximo passo.',
      '{pct}% de {categoria} consumido. Sobram {resta}. Os sensores estão atentos.',
      '{categoria} entrou na zona amarela: {pct}%. Ainda tem {resta}.',
    ],
    acido: [
      '{categoria} em {pct}%. Sobraram {resta}. Usa com sabedoria, se ainda tiver alguma.',
      '{pct}% de {categoria}. Só {resta} separando você do vermelho.',
      'Zona amarela em {categoria}: {pct}%. Os {resta} restantes estão nervosos.',
    ],
  },
  categoria_estourada: {
    suave: [
      '{categoria} passou do orçamento em {passou}. Tudo bem, dá para compensar em outra categoria.',
      'O orçamento de {categoria} estourou ({pct}%). Que tal pausar essa categoria até o mês virar?',
      '{categoria} ficou {passou} acima do planejado. Vale revisar esse limite ou segurar os próximos gastos.',
    ],
    normal: [
      'Orçamento de {categoria} rompido: {pct}%, {passou} acima. Hora de frear.',
      '{categoria} estourou em {passou}. Recomendo congelar essa categoria por enquanto.',
      'Limite de {categoria} ultrapassado ({pct}%). O motor registrou, eu estou só avisando.',
    ],
    acido: [
      'Parabéns, {categoria} estourou: {passou} acima. Era um limite, não uma meta.',
      '{categoria} em {pct}%. O orçamento pediu socorro e ninguém ouviu.',
      'Estourou {categoria} por {passou}. Vou fingir surpresa.',
    ],
  },
  delivery_repetido: {
    suave: [
      '{qtd} deliveries em {dias} dias, {total} no total. Que tal cozinhar algo simples amanhã?',
      'Já são {qtd} pedidos de delivery nesta semana ({total}). Uma marmita resolveria uns dois.',
      'Delivery {qtd}x em {dias} dias. Sem julgamento, só o número: {total}.',
    ],
    normal: [
      '{qtd} deliveries em {dias} dias. {total}. O fogão está se sentindo esquecido.',
      'Padrão detectado: {qtd} pedidos em {dias} dias, {total}. Considere cozinhar.',
      'Delivery em modo maratona: {qtd} pedidos, {total}.',
    ],
    acido: [
      '{qtd} deliveries em {dias} dias. O motoboy já sabe seu nome do meio. {total}.',
      '{total} em delivery esta semana. Sua cozinha virou depósito?',
      'De novo? {qtd} pedidos em {dias} dias. O app de comida te ama. Eu, menos.',
    ],
  },
  mes_verde: {
    suave: [
      '{mes} fechou no verde! Sobraram {economia} do orçamento. Mandou bem.',
      'Mês fechado dentro do orçamento: {economia} de folga em {mes}. Que tal guardar uma parte?',
      '{mes} terminou com {economia} sobrando. Esse é o caminho.',
    ],
    normal: [
      '{mes}: verde. {economia} abaixo do orçamento. Registrando como vitória.',
      'Relatório de {mes}: dentro do limite, sobra de {economia}. Aprovado.',
      '{mes} fechou com {economia} de sobra. Os sensores estão orgulhosos.',
    ],
    acido: [
      '{mes} fechou no verde com {economia} de sobra. Quem é você e o que fez com o dono da carteira?',
      'Sobraram {economia} em {mes}. Vou anotar, porque ninguém vai acreditar.',
      '{mes} no verde. Não se acostume, mas parabéns. Sério.',
    ],
  },
};

function fill(template, ev) {
  const vars = {
    categoria: ev.categoryName,
    valor: ev.amountCents != null ? formatBRL(ev.amountCents) : '',
    pct: ev.pct,
    resta: ev.leftCents != null ? formatBRL(ev.leftCents) : '',
    passou: ev.overCents != null ? formatBRL(ev.overCents) : '',
    qtd: ev.count,
    dias: ev.days,
    total: ev.totalCents != null ? formatBRL(ev.totalCents) : '',
    mes: ev.monthName ? ev.monthName[0].toUpperCase() + ev.monthName.slice(1) : '',
    economia: ev.savedCents != null ? formatBRL(ev.savedCents) : '',
  };
  return template.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}

export function emptyMemory() {
  return { recent: {}, lastAt: {}, lastMonthClosed: null };
}

/**
 * Escolhe a fala para um lote de eventos.
 * @returns {{ fala: null | { texto: string, evento: string, alerta: boolean }, memoria: object }}
 */
export function react(events, { mood = DEFAULT_MOOD, memory, now = Date.now(), rng = Math.random } = {}) {
  const mem = memory ?? emptyMemory();
  const tone = LINES.gasto_cadastrado[mood] ? mood : DEFAULT_MOOD;

  const candidates = (events || [])
    .filter(ev => LINES[ev.type])
    .filter(ev => !(ev.type === 'mes_verde' && mem.lastMonthClosed === ev.month))
    .filter(ev => {
      const cd = COOLDOWN[ev.type];
      const last = mem.lastAt?.[ev.type];
      return !cd || last == null || now - last >= cd;
    })
    .sort((a, b) => PRIORITY[b.type] - PRIORITY[a.type]);

  if (candidates.length === 0) return { fala: null, memoria: mem };

  const ev = candidates[0];
  const bank = LINES[ev.type][tone];
  const recent = mem.recent?.[ev.type] ?? [];
  const avoid = recent.slice(-Math.min(NO_REPEAT, bank.length - 1));
  const options = bank.map((_, i) => i).filter(i => !avoid.includes(i));
  const idx = options[Math.floor(rng() * options.length)] ?? 0;

  const memoria = {
    recent: { ...mem.recent, [ev.type]: [...recent, idx].slice(-NO_REPEAT) },
    lastAt: { ...mem.lastAt, [ev.type]: now },
    lastMonthClosed: ev.type === 'mes_verde' ? ev.month : mem.lastMonthClosed,
  };

  return {
    fala: {
      texto: fill(bank[idx], ev),
      evento: ev.type,
      alerta: ev.type === 'categoria_estourada' || ev.type === 'orcamento_80' || ev.type === 'delivery_repetido',
    },
    memoria,
  };
}
