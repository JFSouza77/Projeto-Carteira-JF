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
export function createExpense({ amountCents, categoryId, note = '', date }, { categories, now = new Date(), id } = {}) {
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
  return {
    month,
    totalCents,
    budgetTotalCents,
    ratio: budgetTotalCents > 0 ? totalCents / budgetTotalCents : null,
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
 * e o total ficou dentro dele. Usa os orçamentos atuais (o MVP não guarda histórico de orçamento).
 */
export function detectMonthClose({ expenses, categories, currentMonth }) {
  const prev = shiftMonth(currentMonth, -1);
  const s = summarizeMonth(expenses, categories, prev);
  if (s.count === 0 || s.budgetTotalCents === 0) return [];
  if (s.totalCents <= s.budgetTotalCents) {
    return [{
      type: 'mes_verde',
      month: prev,
      monthName: monthLabel(prev),
      totalCents: s.totalCents,
      budgetCents: s.budgetTotalCents,
      savedCents: s.budgetTotalCents - s.totalCents,
    }];
  }
  return [];
}
