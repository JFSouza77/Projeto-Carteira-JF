// Motor: regras, cálculos e detecção de eventos.
// Funções puras: sem DOM, sem IndexedDB. Quem grava é o app.js via db.js.

export const DEFAULT_CATEGORIES = Object.freeze([
  { id: 'mercado', name: 'Mercado', emoji: '🛒', budgetCents: 0 },
  { id: 'delivery', name: 'Delivery', emoji: '🛵', budgetCents: 0 },
  { id: 'restaurante', name: 'Restaurante', emoji: '🍽️', budgetCents: 0 },
  { id: 'transporte', name: 'Transporte', emoji: '🚗', budgetCents: 0 },
  { id: 'moradia', name: 'Moradia', emoji: '🏠', budgetCents: 0 },
  { id: 'contas', name: 'Contas', emoji: '💡', budgetCents: 0 },
  { id: 'saude', name: 'Saúde', emoji: '💊', budgetCents: 0 },
  { id: 'lazer', name: 'Lazer', emoji: '🎮', budgetCents: 0 },
  { id: 'compras', name: 'Compras', emoji: '🛍️', budgetCents: 0 },
  { id: 'outros', name: 'Outros', emoji: '📦', budgetCents: 0 },
].map(c => Object.freeze(c)));

export const ALERT_RATIO = 0.8;
export const DELIVERY_WINDOW_DAYS = 7;
export const DELIVERY_REPEAT_COUNT = 3;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Centavos -> "R$ 12,50" */
export function formatBRL(cents) {
  return brl.format((cents || 0) / 100);
}

/**
 * Texto digitado -> centavos inteiros. Aceita "12", "12,5", "12,50", "1.234,56", "R$ 9,90", "12.50".
 * Retorna null se inválido ou <= 0.
 */
export function parseAmount(input) {
  if (typeof input === 'number') return Number.isFinite(input) && input > 0 ? Math.round(input * 100) : null;
  if (typeof input !== 'string') return null;
  let s = input.replace(/R\$|\s/gi, '');
  if (!/^[\d.,]+$/.test(s)) return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) {
    s = s.replace(/\./g, ''); // "1.234" = mil e pouco, não 1,234
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

const pad = n => String(n).padStart(2, '0');

/** Data local -> "YYYY-MM-DD" */
export function toISODate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function monthKey(isoDate) {
  return isoDate.slice(0, 7);
}

/** "2026-01" + -1 -> "2025-12" */
export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro',
  'outubro', 'novembro', 'dezembro'];

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

function isValidISODate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Valida e monta um gasto novo. Lança Error com mensagem para o usuário se algo estiver errado. */
export function createExpense({ amountCents, categoryId, note = '', date, accountId = null, imageId = null, compromissoId = null }, { categories, now = new Date(), id } = {}) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error('Valor inválido.');
  if (amountCents > 100_000_000_00) throw new Error('Valor alto demais. Confere aí.');
  if (categories && !categories.some(c => c.id === categoryId)) throw new Error('Escolha uma categoria.');
  const day = date || toISODate(now);
  if (!isValidISODate(day)) throw new Error('Data inválida.');
  return {
    id: id || newId(),
    amountCents,
    categoryId,
    note: String(note).trim().slice(0, 120),
    date: day,
    month: monthKey(day),
    accountId: accountId || null,
    imageId: imageId || null,
    compromissoId: compromissoId || null,
    createdAt: now.getTime(),
  };
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Soma dos gastos de uma categoria num mês. */
export function spentIn(expenses, month, categoryId) {
  let total = 0;
  for (const e of expenses) {
    if (e.month === month && (categoryId === undefined || e.categoryId === categoryId)) total += e.amountCents;
  }
  return total;
}

/**
 * Resumo do mês: total, orçamento total e linha por categoria.
 * ratio = gasto/orçamento (null quando a categoria não tem orçamento).
 */
export function summarizeMonth(expenses, categories, month) {
  const rows = categories.map(c => {
    const spentCents = spentIn(expenses, month, c.id);
    const budgetCents = c.budgetCents || 0;
    return {
      id: c.id, name: c.name, emoji: c.emoji, spentCents, budgetCents,
      ratio: budgetCents > 0 ? spentCents / budgetCents : null,
    };
  });
  const totalCents = rows.reduce((s, r) => s + r.spentCents, 0);
  const budgetTotalCents = rows.reduce((s, r) => s + r.budgetCents, 0);
  // Só o que foi gasto em categorias com limite entra na comparação com o orçamento.
  const budgetedSpentCents = rows.reduce((s, r) => s + (r.budgetCents > 0 ? r.spentCents : 0), 0);
  return {
    month,
    totalCents,
    budgetTotalCents,
    budgetedSpentCents,
    ratio: budgetTotalCents > 0 ? budgetedSpentCents / budgetTotalCents : null,
    count: expenses.filter(e => e.month === month).length,
    rows,
  };
}

function daysBetween(isoA, isoB) {
  const [a, b] = [isoA, isoB].map(s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); });
  return Math.round((b - a) / 86_400_000);
}

/**
 * Eventos disparados por um gasto recém-cadastrado.
 * `expenses` já inclui `newExpense`. Retorna lista de eventos (só leitura para o narrador).
 */
export function detectExpenseEvents({ expenses, categories, newExpense }) {
  const cat = categories.find(c => c.id === newExpense.categoryId);
  const events = [{
    type: 'gasto_cadastrado',
    categoryId: newExpense.categoryId,
    categoryName: cat?.name ?? newExpense.categoryId,
    amountCents: newExpense.amountCents,
  }];

  const budget = cat?.budgetCents || 0;
  if (budget > 0) {
    const after = spentIn(expenses, newExpense.month, newExpense.categoryId);
    const before = after - newExpense.amountCents;
    const base = {
      categoryId: cat.id, categoryName: cat.name, spentCents: after, budgetCents: budget,
      pct: Math.round((after / budget) * 100),
    };
    if (before <= budget && after > budget) {
      events.push({ type: 'categoria_estourada', ...base, overCents: after - budget });
    } else if (before < budget * ALERT_RATIO && after >= budget * ALERT_RATIO) {
      events.push({ type: 'orcamento_80', ...base, leftCents: budget - after });
    }
  }

  if (newExpense.categoryId === 'delivery') {
    const recent = expenses.filter(e => {
      if (e.categoryId !== 'delivery') return false;
      const diff = daysBetween(e.date, newExpense.date);
      return diff >= 0 && diff < DELIVERY_WINDOW_DAYS;
    });
    if (recent.length >= DELIVERY_REPEAT_COUNT) {
      events.push({
        type: 'delivery_repetido',
        count: recent.length,
        days: DELIVERY_WINDOW_DAYS,
        totalCents: recent.reduce((s, e) => s + e.amountCents, 0),
      });
    }
  }
  return events;
}

/**
 * Evento de fechamento do mês anterior: dispara "mes_verde" se o mês passado teve gastos, havia orçamento
 * e o gasto nas categorias com limite ficou dentro dele. Usa os orçamentos atuais (o MVP não guarda histórico de orçamento).
 */
export function detectMonthClose({ expenses, categories, currentMonth }) {
  const prev = shiftMonth(currentMonth, -1);
  const s = summarizeMonth(expenses, categories, prev);
  if (s.count === 0 || s.budgetTotalCents === 0) return [];
  if (s.budgetedSpentCents <= s.budgetTotalCents) {
    return [{
      type: 'mes_verde',
      month: prev,
      monthName: monthLabel(prev),
      totalCents: s.budgetedSpentCents,
      budgetCents: s.budgetTotalCents,
      savedCents: s.budgetTotalCents - s.budgetedSpentCents,
    }];
  }
  return [];
}

// ======================================================================
// Entradas (rendimentos), contas bancárias, consultas e alertas
// ======================================================================

export const INCOME_SOURCES = Object.freeze([
  { id: 'salario', name: 'Salário', emoji: '💼' },
  { id: 'freela', name: 'Freela / extra', emoji: '🛠️' },
  { id: 'rendimento', name: 'Rendimentos', emoji: '📈' },
  { id: 'presente', name: 'Presente / Pix recebido', emoji: '🎁' },
  { id: 'outros', name: 'Outros', emoji: '💰' },
].map(s => Object.freeze(s)));

// Bancos mais usados no Brasil. Só o nome: o app não se conecta ao banco, o saldo é você que informa.
export const BANKS = Object.freeze([
  'Nubank', 'Itaú', 'Bradesco', 'Banco do Brasil', 'Caixa', 'Santander', 'Inter', 'C6 Bank', 'PicPay',
  'Mercado Pago', 'PagBank', 'BTG Pactual', 'XP', 'Sicoob', 'Sicredi', 'Neon', 'Next', 'Banrisul',
  'Carteira (dinheiro vivo)', 'Outro',
]);

/** Valida e monta uma entrada (rendimento). */
export function createIncome({ amountCents, sourceId, note = '', date, accountId = null }, { now = new Date(), id } = {}) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error('Valor inválido.');
  if (amountCents > 100_000_000_00) throw new Error('Valor alto demais. Confere aí.');
  if (!INCOME_SOURCES.some(s => s.id === sourceId)) throw new Error('Escolha de onde veio o dinheiro.');
  const day = date || toISODate(now);
  if (!isValidISODate(day)) throw new Error('Data inválida.');
  return {
    id: id || newId(), amountCents, sourceId, note: String(note).trim().slice(0, 120),
    date: day, month: monthKey(day), accountId: accountId || null, createdAt: now.getTime(),
  };
}

/** Valida e monta uma conta. O saldo informado vale a partir de `balanceAt`. */
export function createAccount({ bank, nickname = '', balanceCents }, { now = new Date(), id } = {}) {
  const b = String(bank || '').trim();
  if (!b) throw new Error('Escolha o banco.');
  if (!Number.isInteger(balanceCents)) throw new Error('Saldo inválido.');
  return {
    id: id || newId(), bank: b.slice(0, 40), nickname: String(nickname).trim().slice(0, 30),
    balanceCents, balanceAt: now.getTime(), createdAt: now.getTime(),
  };
}

/** Saldo em reais aceitando negativo: "-50", "1.200,00". */
export function parseSignedAmount(input) {
  const s = String(input ?? '').trim();
  if (s === '' ) return null;
  if (/^0+([.,]0+)?$/.test(s.replace(/R\$|\s/gi, ''))) return 0;
  const neg = /^-/.test(s.replace(/R\$|\s/gi, ''));
  const v = parseAmount(s.replace('-', ''));
  return v == null ? null : neg ? -v : v;
}

export function accountLabel(a) {
  return a.nickname ? `${a.bank} · ${a.nickname}` : a.bank;
}

/**
 * Saldo estimado da conta: o saldo que a pessoa informou + entradas − gastos lançados nessa conta DEPOIS disso.
 * O motor nunca muda o saldo guardado; quem atualiza é a pessoa ("Atualizar saldo").
 */
export function accountBalance(account, expenses, incomes) {
  let v = account.balanceCents;
  for (const i of incomes) if (i.accountId === account.id && i.createdAt > account.balanceAt) v += i.amountCents;
  for (const e of expenses) if (e.accountId === account.id && e.createdAt > account.balanceAt) v -= e.amountCents;
  return v;
}

export function totalBalance(accounts, expenses, incomes) {
  return accounts.reduce((s, a) => s + accountBalance(a, expenses, incomes), 0);
}

export function incomeIn(incomes, month, sourceId) {
  let t = 0;
  for (const i of incomes) if (i.month === month && (sourceId === undefined || i.sourceId === sourceId)) t += i.amountCents;
  return t;
}

export function daysInMonth(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** Período por nome: hoje, ontem, semana (últimos 7 dias), mes, mes_passado, ano. Datas ISO, inclusivas. */
export function periodRange(name, today = toISODate()) {
  const [y, m, d] = today.split('-').map(Number);
  const iso = dt => toISODate(dt);
  switch (name) {
    case 'hoje': return { from: today, to: today, label: 'hoje' };
    case 'ontem': { const o = iso(new Date(y, m - 1, d - 1)); return { from: o, to: o, label: 'ontem' }; }
    case 'semana': return { from: iso(new Date(y, m - 1, d - 6)), to: today, label: 'nos últimos 7 dias' };
    case 'mes_passado': {
      const k = shiftMonth(monthKey(today), -1);
      return { from: `${k}-01`, to: `${k}-${String(daysInMonth(k)).padStart(2, '0')}`, label: 'no mês passado', month: k };
    }
    case 'ano': return { from: `${y}-01-01`, to: today, label: `em ${y}` };
    default: return { from: `${monthKey(today)}-01`, to: today, label: 'neste mês', month: monthKey(today) };
  }
}

export function sumInRange(list, { from, to }, filter = () => true) {
  let t = 0, n = 0;
  for (const x of list) if (x.date >= from && x.date <= to && filter(x)) { t += x.amountCents; n++; }
  return { totalCents: t, count: n };
}

/** Previsão do mês no ritmo atual (só faz sentido para o mês corrente). */
export function forecastMonth(expenses, month, today = toISODate()) {
  const spent = spentIn(expenses, month);
  const total = daysInMonth(month);
  const day = monthKey(today) === month ? Number(today.slice(8, 10)) : total;
  const perDay = day > 0 ? spent / day : 0;
  return { spentCents: spent, perDayCents: Math.round(perDay), projectedCents: Math.round(perDay * total), day, daysTotal: total };
}

const SEVERITY = { alta: 3, media: 2, baixa: 1 };

/**
 * Alertas do momento (o "radar" do C.A.O.S.). Só leitura: devolve uma lista ordenada por gravidade.
 * Cada alerta tem type, severity e os números que o narrador precisa para falar.
 */
export function analyze({ expenses, incomes = [], categories, accounts = [], compromissos = [] }, today = toISODate()) {
  const month = monthKey(today);
  const s = summarizeMonth(expenses, categories, month);
  const out = [];

  for (const r of s.rows) {
    if (!r.budgetCents) continue;
    if (r.spentCents > r.budgetCents) {
      out.push({ type: 'categoria_estourada', severity: 'alta', categoryId: r.id, categoryName: r.name,
        spentCents: r.spentCents, budgetCents: r.budgetCents, overCents: r.spentCents - r.budgetCents,
        pct: Math.round(r.ratio * 100) });
    } else if (r.ratio >= ALERT_RATIO) {
      out.push({ type: 'orcamento_80', severity: 'media', categoryId: r.id, categoryName: r.name,
        spentCents: r.spentCents, budgetCents: r.budgetCents, leftCents: r.budgetCents - r.spentCents,
        pct: Math.round(r.ratio * 100) });
    }
  }

  // Ritmo: projeta só o gasto das categorias COM limite contra o orçamento (as sem limite não entram)
  const f = forecastMonth(expenses, month, today);
  const perDayBud = f.day > 0 ? s.budgetedSpentCents / f.day : 0;
  const projBud = Math.round(perDayBud * f.daysTotal);
  if (s.budgetTotalCents > 0 && f.day >= 5 && projBud > s.budgetTotalCents && s.budgetedSpentCents <= s.budgetTotalCents) {
    out.push({ type: 'ritmo_alto', severity: 'media', projectedCents: projBud, budgetCents: s.budgetTotalCents,
      perDayCents: Math.round(perDayBud), overCents: projBud - s.budgetTotalCents });
  }

  const inc = incomeIn(incomes, month);
  if (inc > 0 && s.totalCents > inc) {
    out.push({ type: 'mes_negativo', severity: 'alta', incomeCents: inc, totalCents: s.totalCents, overCents: s.totalCents - inc });
  }

  for (const a of accounts) {
    const bal = accountBalance(a, expenses, incomes);
    if (bal < 0) out.push({ type: 'conta_negativa', severity: 'alta', accountId: a.id, accountName: accountLabel(a), balanceCents: bal });
  }

  const recentDelivery = expenses.filter(e => e.categoryId === 'delivery' && daysBetween(e.date, today) >= 0
    && daysBetween(e.date, today) < DELIVERY_WINDOW_DAYS);
  if (recentDelivery.length >= DELIVERY_REPEAT_COUNT) {
    out.push({ type: 'delivery_repetido', severity: 'baixa', count: recentDelivery.length, days: DELIVERY_WINDOW_DAYS,
      totalCents: recentDelivery.reduce((t, e) => t + e.amountCents, 0) });
  }

  if (expenses.length > 0) {
    const last = expenses.reduce((mx, e) => (e.date > mx ? e.date : mx), '0000-00-00');
    const gap = daysBetween(last, today);
    if (gap >= 3) out.push({ type: 'sem_registro', severity: 'baixa', days: gap });
  }

  for (const c of situacaoCompromissos(compromissos, expenses, today)) {
    if (c.status === 'atrasado') {
      out.push({ type: 'compromisso_atrasado', severity: 'alta', compromissoId: c.id, nome: c.nome, valorCents: c.valorCents, dia: c.diaNoMes, days: -c.diasParaVencer });
    } else if (c.status === 'aberto' && c.diasParaVencer <= 3) {
      out.push({ type: 'compromisso_vence', severity: c.diasParaVencer <= 1 ? 'alta' : 'media', compromissoId: c.id, nome: c.nome, valorCents: c.valorCents, dia: c.diaNoMes, days: c.diasParaVencer });
    } else if (c.status === 'pendente' && c.tipo === 'plano') {
      out.push({ type: 'plano_do_mes', severity: 'baixa', compromissoId: c.id, nome: c.nome, valorCents: c.valorCents });
    }
  }

  // "Confere seu banco": saldo informado há 7 dias ou mais (eu não consigo ver o banco, só lembrar)
  const velha = accounts.filter(a => (Date.parse(`${today}T12:00:00`) - a.balanceAt) / 86_400_000 >= 7);
  if (velha.length) {
    const dias = Math.floor(Math.max(...velha.map(a => (Date.parse(`${today}T12:00:00`) - a.balanceAt) / 86_400_000)));
    out.push({ type: 'confira_banco', severity: 'baixa', accountName: velha.map(accountLabel).join(', '), days: dias });
  }

  return out.sort((a, b) => SEVERITY[b.severity] - SEVERITY[a.severity]);
}

/** Categorias ordenadas pelo gasto num intervalo. */
export function topCategories(expenses, categories, range) {
  return categories
    .map(c => ({ ...c, ...sumInRange(expenses, range, e => e.categoryId === c.id) }))
    .filter(c => c.totalCents > 0)
    .sort((a, b) => b.totalCents - a.totalCents);
}

export { daysBetween };

// ======================================================================
// Compromissos (contas fixas, faturas, assinaturas, planos a cada N meses),
// planos do mês e o "C.A.O.S. aprende categorias" (05/11/2026)
// ======================================================================

export const TIPOS_COMPROMISSO = Object.freeze({
  conta: 'Conta fixa', fatura: 'Fatura de cartão', assinatura: 'Assinatura', plano: 'Plano que se repete',
});

/** Meses entre duas chaves "YYYY-MM" (b − a). */
export function monthsBetween(a, b) {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

/**
 * Compromisso: algo que se repete. `inicioMes` é o primeiro mês em que acontece; depois, a cada `cadaMeses`.
 * Ex. do JF: comida japonesa a cada 2 meses; comeram em outubro → inicioMes = dezembro (próxima vez), cadaMeses = 2.
 * `dia` = dia do vencimento (1–31), opcional pra planos.
 */
export function createCompromisso({ nome, valorCents = 0, tipo = 'conta', categoryId = 'contas', dia = null, cadaMeses = 1, inicioMes, accountId = null },
  { now = new Date(), id, categories } = {}) {
  const n = String(nome || '').trim();
  if (!n) throw new Error('Dá um nome pro compromisso.');
  if (!TIPOS_COMPROMISSO[tipo]) throw new Error('Tipo inválido.');
  if (!Number.isInteger(valorCents) || valorCents < 0) throw new Error('Valor inválido.');
  if (categories && !categories.some(c => c.id === categoryId)) throw new Error('Escolha uma categoria.');
  const d = dia == null || dia === '' ? null : Number(dia);
  if (d != null && !(Number.isInteger(d) && d >= 1 && d <= 31)) throw new Error('Dia do vencimento entre 1 e 31.');
  if (tipo !== 'plano' && d == null) throw new Error('Qual o dia do vencimento?');
  const cada = Number(cadaMeses);
  if (!(Number.isInteger(cada) && cada >= 1 && cada <= 24)) throw new Error('Repetição inválida.');
  const inicio = inicioMes || monthKey(toISODate(now));
  if (!/^\d{4}-\d{2}$/.test(inicio)) throw new Error('Mês inválido.');
  return {
    id: id || newId(), nome: n.slice(0, 60), valorCents, tipo, categoryId, dia: d, cadaMeses: cada, inicioMes: inicio,
    accountId: accountId || null, ativo: true, createdAt: now.getTime(),
  };
}

export function ocorreNoMes(c, month) {
  if (!c.ativo) return false;
  const diff = monthsBetween(c.inicioMes, month);
  return diff >= 0 && diff % c.cadaMeses === 0;
}

/** Próximo mês (a partir de `month`, inclusive) em que o compromisso acontece. */
export function proximaOcorrencia(c, month) {
  const diff = monthsBetween(c.inicioMes, month);
  if (diff <= 0) return c.inicioMes;
  const resto = diff % c.cadaMeses;
  return resto === 0 ? month : shiftMonth(month, c.cadaMeses - resto);
}

/** Dia efetivo no mês (dia 31 em fevereiro vira o último dia). */
export function diaNoMes(c, month) {
  return c.dia == null ? null : Math.min(c.dia, daysInMonth(month));
}

/** Situação de cada compromisso no mês: pago (tem lançamento ligado), vence em X dias, atrasado, ou não é deste mês. */
export function situacaoCompromissos(compromissos, expenses, today = toISODate()) {
  const month = monthKey(today);
  const hoje = Number(today.slice(8, 10));
  return compromissos.filter(c => c.ativo).map(c => {
    const noMes = ocorreNoMes(c, month);
    const pagos = expenses.filter(e => e.compromissoId === c.id && e.month === month);
    const pagoCents = pagos.reduce((s, e) => s + e.amountCents, 0);
    const dia = diaNoMes(c, month);
    let status = 'fora';
    if (noMes) status = pagos.length ? 'pago' : dia == null ? 'pendente' : dia < hoje ? 'atrasado' : 'aberto';
    return {
      ...c, noMes, status, pagoCents, diaNoMes: dia,
      diasParaVencer: noMes && dia != null ? dia - hoje : null,
      proximaVez: proximaOcorrencia(c, noMes && pagos.length ? shiftMonth(month, 1) : month),
    };
  }).sort((a, b) => (a.noMes === b.noMes ? (a.diaNoMes ?? 99) - (b.diaNoMes ?? 99) : a.noMes ? -1 : 1));
}

/** Plano do mês: algo que a pessoa planejou comprar/gastar neste mês. */
export function createPlano({ nome, valorCents, categoryId = 'outros', month }, { now = new Date(), id } = {}) {
  const n = String(nome || '').trim();
  if (!n) throw new Error('O que você planejou?');
  if (!Number.isInteger(valorCents) || valorCents <= 0) throw new Error('Quanto vai custar?');
  return { id: id || newId(), nome: n.slice(0, 60), valorCents, categoryId, month: month || monthKey(toISODate(now)), feito: false, createdAt: now.getTime() };
}

/**
 * Análise do mês planejado: entradas, o que já saiu, compromissos e planos que faltam, e a sobra prevista.
 * Se faltar dinheiro, sugere o que adiar (os maiores planos ainda não feitos, até cobrir a diferença).
 */
export function analisarPlanejamento({ expenses, incomes = [], categories, compromissos = [], planos = [] }, today = toISODate()) {
  const month = monthKey(today);
  const entradas = incomeIn(incomes, month);
  const gastos = spentIn(expenses, month);
  const sit = situacaoCompromissos(compromissos, expenses, today).filter(c => c.noMes);
  const compPendentes = sit.filter(c => c.status !== 'pago');
  const compPendentesCents = compPendentes.reduce((s, c) => s + c.valorCents, 0);
  const planosMes = planos.filter(p => p.month === month);
  const planosPendentes = planosMes.filter(p => !p.feito);
  const planosPendentesCents = planosPendentes.reduce((s, p) => s + p.valorCents, 0);
  const s = summarizeMonth(expenses, categories, month);
  const base = entradas > 0 ? entradas : s.budgetTotalCents;
  const baseTipo = entradas > 0 ? 'entradas' : s.budgetTotalCents > 0 ? 'orcamento' : null;
  const comprometido = gastos + compPendentesCents + planosPendentesCents;
  const sobraCents = baseTipo ? base - comprometido : null;
  const adiar = [];
  if (sobraCents != null && sobraCents < 0) {
    let falta = -sobraCents;
    for (const p of [...planosPendentes].sort((a, b) => b.valorCents - a.valorCents)) {
      if (falta <= 0) break;
      adiar.push(p);
      falta -= p.valorCents;
    }
  }
  return {
    month, entradasCents: entradas, gastosCents: gastos, baseCents: base, baseTipo,
    compromissos: sit, compPendentesCents, planos: planosMes, planosPendentesCents, comprometidoCents: comprometido,
    sobraCents, adiar,
  };
}

/** "Cabe no mês?" para uma compra de `valorCents`. */
export function cabeNoMes(dados, valorCents, today = toISODate()) {
  const a = analisarPlanejamento(dados, today);
  if (a.sobraCents == null) return { ...a, valorCents, cabe: null, sobraDepois: null };
  return { ...a, valorCents, cabe: a.sobraCents - valorCents >= 0, sobraDepois: a.sobraCents - valorCents };
}

// ---------- C.A.O.S. aprende categorias ----------

const PALAVRAS_VAZIAS = new Set(['de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'com', 'o', 'a', 'os', 'as',
  'um', 'uma', 'pra', 'para', 'pro', 'e', 'reais', 'real', 'r']);

export function palavrasDe(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .split(/[^a-z0-9]+/).filter(w => w.length >= 2 && !PALAVRAS_VAZIAS.has(w) && !/^\d+$/.test(w));
}

/**
 * Sugere a categoria pela descrição, com base no que a pessoa já lançou antes.
 * Mesma descrição vale mais; palavra em comum vale menos. Devolve null se não tiver base.
 */
export function sugerirCategoria(texto, expenses) {
  const alvo = palavrasDe(texto);
  if (!alvo.length) return null;
  const chave = alvo.join(' ');
  const votos = {};
  for (const e of expenses) {
    if (!e.note) continue;
    const p = palavrasDe(e.note);
    if (!p.length) continue;
    let peso = 0;
    if (p.join(' ') === chave) peso = 3;
    else if (p.some(w => alvo.includes(w))) peso = 1;
    if (peso) votos[e.categoryId] = (votos[e.categoryId] || 0) + peso;
  }
  const melhor = Object.entries(votos).sort((a, b) => b[1] - a[1])[0];
  return melhor && melhor[1] >= 1 ? { categoryId: melhor[0], votos: melhor[1] } : null;
}
