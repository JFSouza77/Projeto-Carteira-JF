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
  { id: 'streaming', name: 'Streaming', emoji: '📺', budgetCents: 0 },
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
// Como pagou (P8, vistoria do JF 12/11): dinheiro, Pix, débito ou crédito (à vista ou parcelado)
export const FORMAS_PAGAMENTO = Object.freeze({ dinheiro: '💵 Dinheiro', pix: '⚡ Pix', debito: '💳 Débito', credito: '💳 Crédito' });
// parcelado no crédito: "total" = o banco prende o valor todo no limite e solta a cada parcela paga;
// "parcela" = só a parcela do mês ocupa o limite
export const MODOS_LIMITE = Object.freeze({ total: 'Prende o valor todo no limite', parcela: 'Só a parcela do mês ocupa o limite' });

export function createExpense({ amountCents, categoryId, note = '', date, accountId = null, imageId = null, compromissoId = null, forma = null, parcelas = 1, limiteModo = 'total' }, { categories, now = new Date(), id } = {}) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error('Valor inválido.');
  if (forma != null && !FORMAS_PAGAMENTO[forma]) throw new Error('Como você pagou?');
  if (!(Number.isInteger(parcelas) && parcelas >= 1 && parcelas <= 24)) throw new Error('Parcelas: de 1 a 24.');
  if (parcelas > 1 && forma !== 'credito') throw new Error('Só dá pra parcelar no crédito.');
  if (!MODOS_LIMITE[limiteModo]) throw new Error('Como o parcelado ocupa o limite?');
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
    forma: forma || null,
    parcelas,
    limiteModo: parcelas > 1 ? limiteModo : 'total',
    createdAt: now.getTime(),
  };
}

/** Parcelas de um gasto: [{ k, date, valorCents }]. A 1ª leva o centavo que sobra da divisão. */
export function parcelasDe(e) {
  const n = e.parcelas > 1 ? e.parcelas : 1;
  const base = Math.floor(e.amountCents / n);
  return Array.from({ length: n }, (_, k) => {
    const mes = shiftMonth(e.date.slice(0, 7), k);
    return { k, date: k ? diaDoMes(mes, Number(e.date.slice(8, 10))) : e.date, valorCents: k ? base : e.amountCents - base * (n - 1) };
  });
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- Rachadinha (07/11): conta dividida com amigos ----------
// O gasto guarda o total (é o que saiu da conta ou do cartão) e `racha`: [{ id, nome, valorCents, recebidoEm }].
// No orçamento, nas categorias e na previsão conta só a MINHA parte; o resto é "a receber".
export const RACHA_MAX_PESSOAS = 20;

/** Quanto do gasto é meu de verdade (total menos a parte dos amigos). */
export function valorProprio(e) {
  if (!e || !Array.isArray(e.racha) || !e.racha.length) return e?.amountCents ?? 0;
  const dos = e.racha.reduce((s, p) => s + (p.valorCents || 0), 0);
  return Math.max(0, e.amountCents - dos);
}

/**
 * Divide um total igualmente entre mim e os nomes. Cada amigo paga a parte inteira em centavos; a sobra do
 * arredondamento fica comigo. Ex.: R$ 182,00 entre mim e 3 amigos → cada um R$ 45,50.
 */
export function dividirIgual(totalCents, nomes, { now = Date.now() } = {}) {
  const lista = (nomes || []).map(n => String(n).trim().slice(0, 40)).filter(Boolean);
  if (!Number.isInteger(totalCents) || totalCents <= 0) throw new Error('Valor inválido.');
  if (!lista.length) throw new Error('Diga com quem você vai dividir.');
  if (lista.length > RACHA_MAX_PESSOAS) throw new Error(`Dá pra dividir com até ${RACHA_MAX_PESSOAS} pessoas.`);
  const parte = Math.floor(totalCents / (lista.length + 1));
  if (parte <= 0) throw new Error('Valor pequeno demais pra dividir.');
  return lista.map((nome, i) => ({ id: `r${now.toString(36)}${i}`, nome, valorCents: parte, recebidoEm: null }));
}

/** "Ana", "Ana e Bia", "Ana, Bia e Caio", "Ana, Bia, Caio e mais gente". */
export function juntarNomes(nomes) {
  const l = [...new Set(nomes)];
  if (l.length > 3) return `${l.slice(0, 3).join(', ')} e mais gente`;
  return l.length <= 1 ? (l[0] || '') : `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}`;
}

/** Tudo que ainda falta receber, do mais antigo pro mais novo. */
export function aReceber(expenses) {
  const itens = [];
  for (const e of expenses) {
    if (!Array.isArray(e.racha)) continue;
    for (const p of e.racha) {
      if (!p.recebidoEm) itens.push({ expenseId: e.id, pessoaId: p.id, nome: p.nome, valorCents: p.valorCents, date: e.date, note: e.note || '', categoryId: e.categoryId });
    }
  }
  itens.sort((a, b) => a.date.localeCompare(b.date));
  return { itens, totalCents: itens.reduce((s, x) => s + x.valorCents, 0) };
}

/** Marca a parte de um amigo como recebida. Devolve uma cópia nova do gasto. */
export function marcarRecebido(expense, pessoaId, now = Date.now()) {
  if (!Array.isArray(expense.racha) || !expense.racha.some(p => p.id === pessoaId)) throw new Error('Não achei essa parte.');
  return { ...expense, racha: expense.racha.map(p => (p.id === pessoaId ? { ...p, recebidoEm: now } : p)) };
}

// ---------- Ofensiva (07/11): dias seguidos anotando ----------
const diaLocal = ms => toISODate(new Date(ms));
function diaAnterior(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d - 1));
}

/**
 * Dias seguidos em que a pessoa usou o app pra anotar (gasto ou entrada criados naquele dia, ou "hoje não gastei").
 * A ofensiva continua viva se o último dia foi hoje ou ontem. Devolve { dias, hojeFeito, recorde }.
 */
export function ofensiva({ expenses = [], incomes = [], diasSemGasto = [] }, today = toISODate()) {
  const dias = new Set();
  for (const x of [...expenses, ...incomes]) if (Number.isFinite(x.createdAt)) dias.add(diaLocal(x.createdAt));
  for (const d of diasSemGasto) if (isValidISODate(d)) dias.add(d);
  const hojeFeito = dias.has(today);
  let cursor = hojeFeito ? today : diaAnterior(today);
  let atual = 0;
  while (dias.has(cursor)) { atual++; cursor = diaAnterior(cursor); }
  // recorde: maior sequência em todo o histórico
  let recorde = 0;
  for (const d of dias) {
    if (dias.has(diaAnterior(d))) continue; // só começa a contar no primeiro dia de cada sequência
    let n = 0, c = d;
    while (dias.has(c)) { n++; const [y, m, dd] = c.split('-').map(Number); c = toISODate(new Date(y, m - 1, dd + 1)); }
    if (n > recorde) recorde = n;
  }
  return { dias: atual, hojeFeito, recorde: Math.max(recorde, atual) };
}

export const MARCOS_OFENSIVA = Object.freeze([3, 7, 14, 30, 60, 100, 200, 365]);

/** Soma dos gastos de uma categoria num mês (só a minha parte, se a conta foi rachada). */
export function spentIn(expenses, month, categoryId) {
  let total = 0;
  for (const e of expenses) {
    if (e.month === month && (categoryId === undefined || e.categoryId === categoryId)) total += valorProprio(e);
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
    const before = after - valorProprio(newExpense);
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
        totalCents: recent.reduce((s, e) => s + valorProprio(e), 0),
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
const BANCOS_AZ = [
  'Nubank', 'Itaú', 'Itaú Cartões', 'Bradesco', 'Banco do Brasil', 'Caixa', 'Santander', 'Inter', 'C6 Bank', 'PicPay',
  'Mercado Pago', 'PagBank', 'BTG Pactual', 'XP', 'Sicoob', 'Sicredi', 'Neon', 'Next', 'Banrisul', 'Banestes', 'BRB',
  'Banco do Nordeste', 'Agibank', 'Will Bank', 'Original', 'Safra', 'Banco Pan', 'Digio', 'Cora', 'BV', 'Mercantil',
  'Sofisa Direto', 'Nomad',
  // 07/11 (lista de bancos e cartões da Carteira da Apple, trazida pelo JF): só os nomes que a pessoa conhece
  'Banco BMG', 'Banco Genial', 'HSBC', 'Porto Bank', 'RappiBank', 'RecargaPay', 'NG Cash', 'Creditas', 'Conta Simples',
  'Hotmart', 'Revolut', 'Wise', 'DollarApp', 'Ailos', 'Cresol', 'Unicred', 'Sisprime', 'Woop (Sicredi)', 'Credsystem',
  'VerdeCard', 'Sem Parar', 'ByBit', 'Crypto.com', 'Foxbit',
  // cartões de benefício (vale-refeição e vale-alimentação)
  'Alelo', 'VR Benefícios', 'Sodexo (Pluxee)', 'Ticket (Edenred)', 'Swile', 'Caju',
].sort((a, b) => a.localeCompare(b, 'pt-BR'));
// Em ordem alfabética (pedido do JF, 06/11) pra achar fácil; "dinheiro vivo" e "Outro" sempre no fim.
export const BANKS = Object.freeze([...BANCOS_AZ, 'Carteira (dinheiro vivo)', 'Outro']);

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
// Tipos de conta (12/11, vistoria do JF): o que mora dentro de um banco. Cartão de crédito é `tipo: 'cartao'`.
export const TIPOS_CONTA = Object.freeze({ corrente: 'Conta corrente', poupanca: 'Poupança', cofrinho: 'Cofrinho' });

export function createAccount({ bank, nickname = '', balanceCents, subtipo = 'corrente', reforcaCartaoId = null }, { now = new Date(), id } = {}) {
  const b = String(bank || '').trim();
  if (!b) throw new Error('Escolha o banco.');
  if (!Number.isInteger(balanceCents)) throw new Error('Saldo inválido.');
  if (!TIPOS_CONTA[subtipo]) throw new Error('Escolha o tipo da conta.');
  return {
    id: id || newId(), bank: b.slice(0, 40), nickname: String(nickname).trim().slice(0, 30), subtipo,
    // cofrinho que aumenta o limite do cartão (PicPay, Inter…): o valor guardado soma no limite desse cartão
    reforcaCartaoId: subtipo === 'cofrinho' && reforcaCartaoId ? reforcaCartaoId : null,
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

const semAcento = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Nome da conta pra mostrar em qualquer lista. Sempre diz o que é (12/11: "C6 Bank" aparecia duas vezes, conta e
 * cartão): "C6 Bank · Cartão", "Banestes · Poupança", "PicPay · Cofrinho · Viagem". Conta corrente sem apelido fica só
 * o banco. Banco "Outro" com apelido mostra só o apelido (06/11).
 */
export function accountLabel(a) {
  const tipo = a.tipo === 'cartao' ? 'Cartão' : a.subtipo && a.subtipo !== 'corrente' ? TIPOS_CONTA[a.subtipo] : null;
  const apelido = a.nickname && semAcento(a.nickname) !== semAcento(tipo) ? a.nickname : '';
  if (a.bank === 'Outro') return [apelido || 'Outro banco', tipo].filter(Boolean).join(' · ');
  return [a.bank, tipo, apelido].filter(Boolean).join(' · ');
}

const ORDEM_TIPO = { corrente: 0, poupanca: 1, cofrinho: 2, cartao: 3 };
/**
 * Contas agrupadas por banco, em ordem alfabética (12/11): [{ bank, contas }]. Dentro do banco: conta corrente,
 * poupança, cofrinho e cartão. "Carteira (dinheiro vivo)" e "Outro" ficam no fim.
 */
export function agruparPorBanco(accounts) {
  const fim = b => (/dinheiro vivo/i.test(b) ? 1 : b === 'Outro' ? 2 : 0);
  const grupos = new Map();
  for (const a of accounts) {
    if (!grupos.has(a.bank)) grupos.set(a.bank, []);
    grupos.get(a.bank).push(a);
  }
  return [...grupos].map(([bank, contas]) => ({
    bank,
    contas: contas.sort((x, y) => (ORDEM_TIPO[x.tipo === 'cartao' ? 'cartao' : x.subtipo || 'corrente'] - ORDEM_TIPO[y.tipo === 'cartao' ? 'cartao' : y.subtipo || 'corrente'])
      || accountLabel(x).localeCompare(accountLabel(y), 'pt-BR')),
  })).sort((a, b) => fim(a.bank) - fim(b.bank) || a.bank.localeCompare(b.bank, 'pt-BR'));
}

/** Cartão com o reforço dos cofrinhos ligados a ele (o valor guardado aumenta o limite). */
export function comReforco(cartao, accounts = [], expenses = [], incomes = []) {
  if (!cartao || cartao.tipo !== 'cartao') return cartao;
  const reforcoCents = accounts.filter(a => a.reforcaCartaoId === cartao.id && a.tipo !== 'cartao')
    .reduce((t, a) => t + Math.max(0, accountBalance(a, expenses, incomes)), 0);
  return reforcoCents ? { ...cartao, reforcoCents } : cartao;
}

/**
 * Saldo estimado da conta: o saldo que a pessoa informou + entradas − gastos lançados nessa conta DEPOIS disso.
 * O motor nunca muda o saldo guardado; quem atualiza é a pessoa ("Atualizar saldo").
 */
export function accountBalance(account, expenses, incomes) {
  let v = account.balanceCents;
  for (const i of incomes) if (i.accountId === account.id && i.createdAt > account.balanceAt) v += i.amountCents;
  for (const e of expenses) {
    if (e.accountId !== account.id) continue;
    if (e.createdAt > account.balanceAt) v -= e.amountCents;
    // parte da rachadinha recebida depois do saldo informado: o dinheiro voltou pra essa conta
    if (Array.isArray(e.racha)) for (const p of e.racha) if (p.recebidoEm && p.recebidoEm > account.balanceAt) v += p.valorCents;
  }
  return v;
}

export function totalBalance(accounts, expenses, incomes) {
  // cartão de crédito não é dinheiro guardado: fica fora do saldo total
  return accounts.filter(a => a.tipo !== 'cartao').reduce((s, a) => s + accountBalance(a, expenses, incomes), 0);
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
  for (const x of list) if (x.date >= from && x.date <= to && filter(x)) { t += valorProprio(x); n++; }
  return { totalCents: t, count: n };
}

/** Previsão do mês no ritmo atual (só faz sentido para o mês corrente). */
export function forecastMonth(expenses, month, today = toISODate()) {
  const spent = spentIn(expenses, month);
  const total = daysInMonth(month);
  const day = monthKey(today) === month ? Number(today.slice(8, 10)) : total;
  // Conta fixa paga (lançada a partir de um compromisso) não vira "ritmo": no começo do mês, aluguel e contas
  // fariam a média diária parecer enorme (sugestão do Gemini, 06/11). Projeção = fixos + variáveis por dia × dias.
  const fixos = expenses.filter(e => e.month === month && e.compromissoId).reduce((s, e) => s + valorProprio(e), 0);
  const variaveis = spent - fixos;
  const perDay = day > 0 ? variaveis / day : 0;
  return { spentCents: spent, fixosCents: fixos, perDayCents: Math.round(perDay), projectedCents: Math.round(fixos + perDay * total), day, daysTotal: total };
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
  const comLimite = new Set(categories.filter(c => c.budgetCents > 0).map(c => c.id));
  const fixosBud = expenses.filter(e => e.month === month && e.compromissoId && comLimite.has(e.categoryId)).reduce((t, e) => t + valorProprio(e), 0);
  const perDayBud = f.day > 0 ? (s.budgetedSpentCents - fixosBud) / f.day : 0;
  const projBud = Math.round(fixosBud + perDayBud * f.daysTotal);
  if (s.budgetTotalCents > 0 && f.day >= 5 && projBud > s.budgetTotalCents && s.budgetedSpentCents <= s.budgetTotalCents) {
    out.push({ type: 'ritmo_alto', severity: 'media', projectedCents: projBud, budgetCents: s.budgetTotalCents,
      perDayCents: Math.round(perDayBud), overCents: projBud - s.budgetTotalCents });
  }

  // Rachadinha: parte de amigo pendente há 3 dias ou mais vira lembrete de cobrança
  const pendentes = aReceber(expenses).itens.filter(x => daysBetween(x.date, today) >= 3);
  if (pendentes.length) {
    const nomes = [...new Set(pendentes.map(x => x.nome))];
    out.push({ type: 'a_receber', severity: 'baixa', count: pendentes.length, totalCents: pendentes.reduce((t, x) => t + x.valorCents, 0),
      quem: juntarNomes(nomes) });
  }

  const inc = incomeIn(incomes, month);
  if (inc > 0 && s.totalCents > inc) {
    out.push({ type: 'mes_negativo', severity: 'alta', incomeCents: inc, totalCents: s.totalCents, overCents: s.totalCents - inc });
  }

  for (const f of accounts.filter(a => a.tipo === 'cartao').map(a => faturaDoCartao(comReforco(a, accounts, expenses, incomes), expenses, today))) {
    if (f.pct >= 100) out.push({ type: 'cartao_limite', severity: 'alta', accountId: f.id, accountName: f.nome, pct: f.pct, amountCents: f.usadoCents, leftCents: f.disponivelCents, budgetCents: f.limiteCents });
    else if (f.pct >= 80) out.push({ type: 'cartao_limite', severity: 'media', accountId: f.id, accountName: f.nome, pct: f.pct, amountCents: f.usadoCents, leftCents: f.disponivelCents, budgetCents: f.limiteCents });
    if (f.fechadaCents > 0 && f.diasParaVencer >= 0 && f.diasParaVencer <= 3) {
      out.push({ type: 'cartao_vence', severity: f.diasParaVencer <= 1 ? 'alta' : 'media', accountId: f.id, accountName: f.nome, amountCents: f.fechadaCents, days: f.diasParaVencer, dia: Number(f.vencimento.slice(8)) });
    }
  }

  for (const a of accounts.filter(x => x.tipo !== 'cartao')) {
    const bal = accountBalance(a, expenses, incomes);
    if (bal < 0) out.push({ type: 'conta_negativa', severity: 'alta', accountId: a.id, accountName: accountLabel(a), balanceCents: bal });
  }

  const recentDelivery = expenses.filter(e => e.categoryId === 'delivery' && daysBetween(e.date, today) >= 0
    && daysBetween(e.date, today) < DELIVERY_WINDOW_DAYS);
  if (recentDelivery.length >= DELIVERY_REPEAT_COUNT) {
    out.push({ type: 'delivery_repetido', severity: 'baixa', count: recentDelivery.length, days: DELIVERY_WINDOW_DAYS,
      totalCents: recentDelivery.reduce((t, e) => t + valorProprio(e), 0) });
  }

  if (expenses.length > 0) {
    const last = expenses.reduce((mx, e) => (e.date > mx ? e.date : mx), '0000-00-00');
    const gap = daysBetween(last, today);
    if (gap >= 3) out.push({ type: 'sem_registro', severity: 'baixa', days: gap });
  }

  for (const c of situacaoCompromissos(compromissos, expenses, today)) {
    if (c.status === 'atrasado') {
      out.push({ type: 'compromisso_atrasado', severity: 'alta', compromissoId: c.id, nome: c.nome, valorCents: c.faltaCents || c.valorCents, dia: c.diaNoMes, days: -c.diasParaVencer });
    } else if (c.status === 'aberto' && c.diasParaVencer <= 3) {
      out.push({ type: 'compromisso_vence', severity: c.diasParaVencer <= 1 ? 'alta' : 'media', compromissoId: c.id, nome: c.nome, valorCents: c.faltaCents || c.valorCents, dia: c.diaNoMes, days: c.diasParaVencer });
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

/** Situação de cada compromisso no mês: pago (lançamentos ligados cobrem o valor), vence em X dias, atrasado, ou não é deste mês. Pagamento parcial: `parcial` e `faltaCents`. */
export function situacaoCompromissos(compromissos, expenses, today = toISODate()) {
  const month = monthKey(today);
  const hoje = Number(today.slice(8, 10));
  return compromissos.filter(c => c.ativo).map(c => {
    const noMes = ocorreNoMes(c, month);
    const pagos = expenses.filter(e => e.compromissoId === c.id && e.month === month);
    const pagoCents = pagos.reduce((s, e) => s + e.amountCents, 0);
    const dia = diaNoMes(c, month);
    let status = 'fora';
    // Pago só quando o total lançado cobre o valor (revisão 06/11). Pagou um pedaço: continua aberto, com o que falta.
    const quitado = pagos.length > 0 && pagoCents >= c.valorCents;
    if (noMes) status = quitado ? 'pago' : dia == null ? 'pendente' : dia < hoje ? 'atrasado' : 'aberto';
    const faltaCents = noMes && !quitado ? Math.max(0, c.valorCents - pagoCents) : 0;
    return {
      ...c, noMes, status, pagoCents, faltaCents, parcial: noMes && !quitado && pagoCents > 0, diaNoMes: dia,
      diasParaVencer: noMes && dia != null ? dia - hoje : null,
      proximaVez: proximaOcorrencia(c, noMes && quitado ? shiftMonth(month, 1) : month),
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
  const compPendentesCents = compPendentes.reduce((s, c) => s + c.faltaCents, 0); // só o que falta pagar
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

// ---------- Backup: validar ANTES de gravar (revisão 06/11) ----------
// Mesmas regras do motor. Se qualquer coisa estiver errada, nada é gravado.

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const CAT_ID_RE = /^[a-z0-9_-]{1,30}$/;
const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const VALOR_MAX = 100_000_000_00;
const texto = (v, max, min = 0) => typeof v === 'string' && v.trim().length >= min && v.length <= max;
const textoOuNada = (v, max) => v == null || texto(v, max);
const centavos = (v, min) => Number.isInteger(v) && v >= min && v <= VALOR_MAX;
const LIMITE_ITENS = 50_000;
// Rachadinha no backup: lista curta de amigos com nome, valor e (opcional) quando pagou; a soma não passa do total.
function rachaOk(e) {
  if (e.racha == null) return true;
  if (!Array.isArray(e.racha) || !e.racha.length || e.racha.length > RACHA_MAX_PESSOAS) return false;
  const ok = e.racha.every(p => p && typeof p === 'object' && ID_RE.test(p.id ?? '') && texto(p.nome, 40, 1)
    && centavos(p.valorCents, 1) && (p.recebidoEm == null || (Number.isFinite(p.recebidoEm) && p.recebidoEm > 0)));
  return ok && e.racha.reduce((t, p) => t + p.valorCents, 0) <= e.amountCents;
}

/**
 * Confere um backup inteiro. Devolve { ok, erros, dados }.
 * `dados` só vem quando ok: listas prontas para gravar (categories, expenses, incomes, accounts, compromissos, planos, perfil).
 */
export function validarBackup(bruto) {
  const erros = [];
  const erro = msg => { if (erros.length < 5) erros.push(msg); };
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto) || bruto.app !== 'carteira-jf') {
    return { ok: false, erros: ['Esse arquivo não parece um backup do C.A.O.S. Finanças.'], dados: null };
  }
  const lista = (nome, obrigatoria) => {
    const v = bruto[nome];
    if (v == null && !obrigatoria) return [];
    if (!Array.isArray(v)) { erro(`A parte "${nome}" do backup está estragada.`); return []; }
    if (v.length > LIMITE_ITENS) { erro(`A parte "${nome}" do backup é grande demais.`); return []; }
    return v;
  };
  const categories = lista('categories', true);
  const expenses = lista('expenses', true);
  const incomes = lista('incomes', false);
  const accounts = lista('accounts', false);
  const compromissos = lista('compromissos', false);
  const planos = lista('planos', false);
  const metas = lista('metas', false);
  const investimentos = lista('investimentos', false);
  const obj = o => o && typeof o === 'object' && !Array.isArray(o);
  const unicos = (itens, nome) => {
    const ids = new Set();
    for (const o of itens) {
      if (ids.has(o.id)) { erro(`Tem ${nome} repetido no backup.`); break; }
      ids.add(o.id);
    }
    return ids;
  };

  if (!categories.length) erro('O backup não tem categorias.');
  categories.forEach((c, i) => {
    if (!obj(c) || !CAT_ID_RE.test(c.id ?? '') || !texto(c.name, 30, 1) || !texto(c.emoji ?? '', 8) || /[<>"'&`]/.test(c.emoji ?? '')
      || !centavos(c.budgetCents ?? 0, 0)) erro(`Categoria ${i + 1} do backup está com dado inválido.`);
  });
  const catIds = unicos(categories.filter(obj), 'categoria');

  accounts.forEach((a, i) => {
    if (!obj(a) || !ID_RE.test(a.id ?? '') || !texto(a.bank, 40, 1) || !textoOuNada(a.nickname, 30)
      || !Number.isInteger(a.balanceCents) || Math.abs(a.balanceCents) > VALOR_MAX
      || !(a.tipo == null || a.tipo === 'cartao')
      || !(a.subtipo == null || TIPOS_CONTA[a.subtipo]) || !(a.reforcaCartaoId == null || ID_RE.test(a.reforcaCartaoId))
      || (a.tipo === 'cartao' && (!centavos(a.limiteCents, 1) || !centavos(a.usadoInicialCents ?? 0, 0)
        || ![a.fechamentoDia, a.vencimentoDia].every(d => Number.isInteger(d) && d >= 1 && d <= 31)))) erro(`Conta ${i + 1} do backup está com dado inválido.`);
  });
  const contaIds = unicos(accounts.filter(obj), 'conta');
  const contaOk = id => id == null || contaIds.has(id);

  compromissos.forEach((c, i) => {
    const dia = c?.dia;
    if (!obj(c) || !ID_RE.test(c.id ?? '') || !texto(c.nome, 60, 1) || !centavos(c.valorCents, 0) || !TIPOS_COMPROMISSO[c.tipo]
      || !catIds.has(c.categoryId) || !(dia == null || (Number.isInteger(dia) && dia >= 1 && dia <= 31))
      || !(Number.isInteger(c.cadaMeses) && c.cadaMeses >= 1 && c.cadaMeses <= 24) || !MES_RE.test(c.inicioMes ?? '')
      || !contaOk(c.accountId) || typeof (c.ativo ?? true) !== 'boolean') erro(`Compromisso ${i + 1} do backup está com dado inválido.`);
  });
  const compIds = unicos(compromissos.filter(obj), 'compromisso');

  expenses.forEach((e, i) => {
    if (!obj(e) || !ID_RE.test(e.id ?? '') || !centavos(e.amountCents, 1) || !isValidISODate(e.date ?? '') || e.month !== monthKey(e.date)
      || !catIds.has(e.categoryId) || !textoOuNada(e.note, 120) || !contaOk(e.accountId)
      || !(e.compromissoId == null || compIds.has(e.compromissoId)) || !(e.imageId == null || ID_RE.test(e.imageId))
      || !rachaOk(e) || !(e.forma == null || FORMAS_PAGAMENTO[e.forma])
      || !(e.parcelas == null || (Number.isInteger(e.parcelas) && e.parcelas >= 1 && e.parcelas <= 24))
      || !(e.limiteModo == null || MODOS_LIMITE[e.limiteModo])) {
      erro(`Gasto ${i + 1} do backup está com dado inválido (valor, data ou categoria).`);
    }
  });
  unicos(expenses.filter(obj), 'gasto');

  incomes.forEach((r, i) => {
    if (!obj(r) || !ID_RE.test(r.id ?? '') || !centavos(r.amountCents, 1) || !isValidISODate(r.date ?? '') || r.month !== monthKey(r.date)
      || !INCOME_SOURCES.some(s => s.id === r.sourceId) || !textoOuNada(r.note, 120) || !contaOk(r.accountId)) {
      erro(`Entrada ${i + 1} do backup está com dado inválido.`);
    }
  });
  unicos(incomes.filter(obj), 'entrada');

  planos.forEach((p, i) => {
    if (!obj(p) || !ID_RE.test(p.id ?? '') || !texto(p.nome, 60, 1) || !centavos(p.valorCents, 1) || !catIds.has(p.categoryId)
      || !MES_RE.test(p.month ?? '') || typeof (p.feito ?? false) !== 'boolean') erro(`Plano ${i + 1} do backup está com dado inválido.`);
  });
  unicos(planos.filter(obj), 'plano');

  metas.forEach((m, i) => {
    if (!obj(m) || !ID_RE.test(m.id ?? '') || !texto(m.nome, 60, 1) || !centavos(m.alvoCents, 1) || !centavos(m.guardadoCents ?? 0, 0)
      || !(m.ate == null || MES_RE.test(m.ate))) erro(`Meta ${i + 1} do backup está com dado inválido.`);
  });
  unicos(metas.filter(obj), 'meta');
  investimentos.forEach((v, i) => {
    if (!obj(v) || !ID_RE.test(v.id ?? '') || !texto(v.nome, 60, 1) || !TIPOS_INVESTIMENTO[v.tipo] || !textoOuNada(v.instituicao, 40)
      || !centavos(v.aplicadoCents, 1) || !centavos(v.atualCents, 0)) erro(`Investimento ${i + 1} do backup está com dado inválido.`);
  });
  unicos(investimentos.filter(obj), 'investimento');

  let perfil = null;
  if (bruto.perfil != null) {
    const p = bruto.perfil;
    if (!obj(p) || !textoOuNada(p.nome, 40) || !textoOuNada(p.apelido, 40) || !['descontraido', 'formal', undefined].includes(p.tratamento)
      || !(p.foco == null || (Array.isArray(p.foco) && p.foco.length <= 10 && p.foco.every(f => texto(f, 40))))
      || !(p.aniversario == null || isValidISODate(p.aniversario))
      || !(p.diasSemGasto == null || (Array.isArray(p.diasSemGasto) && p.diasSemGasto.length <= 400 && p.diasSemGasto.every(isValidISODate)))) erro('O perfil do backup está com dado inválido.');
    else perfil = { ...p };
  }

  if (erros.length) return { ok: false, erros, dados: null };
  const copia = l => l.map(o => ({ ...o }));
  return {
    ok: true, erros: [],
    dados: {
      categories: copia(categories), expenses: copia(expenses), incomes: copia(incomes), accounts: copia(accounts),
      compromissos: copia(compromissos), planos: copia(planos), metas: copia(metas), investimentos: copia(investimentos), perfil,
    },
  };
}

// ---------- Aniversário e idade (06/11) ----------

/** Idade completa em anos numa data (YYYY-MM-DD), ou null se não tiver aniversário. */
export function idadeDe(aniversario, today = toISODate()) {
  if (!aniversario || !isValidISODate(aniversario) || aniversario > today) return null;
  const [ya, ma, da] = aniversario.split('-').map(Number);
  const [yt, mt, dt] = today.split('-').map(Number);
  return yt - ya - (mt < ma || (mt === ma && dt < da) ? 1 : 0);
}

/** Faixa do jeito de falar: até 12 · 13 a 17 · 18 a 25 · adulto. */
export function faixaEtaria(idade) {
  if (idade == null) return null;
  return idade <= 12 ? 'crianca' : idade <= 17 ? 'adolescente' : idade <= 25 ? 'jovem' : 'adulto';
}

/** Hoje é aniversário? (29/02 comemora em 28/02 nos anos que não são bissextos) */
export function ehAniversario(aniversario, today = toISODate()) {
  if (!aniversario || !isValidISODate(aniversario)) return false;
  const md = aniversario.slice(5);
  const hoje = today.slice(5);
  if (md === hoje) return true;
  return md === '02-29' && hoje === '02-28' && !isValidISODate(`${today.slice(0, 4)}-02-29`);
}

const MESES_NOMES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Data de aniversário digitada → "YYYY-MM-DD" ou null. Aceita 05/03/1998, 5-3-98, 1998-03-05, "5 de março de 1998". */
export function lerAniversario(texto, today = toISODate()) {
  const t = String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  let d, m, y;
  let r = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (r) [, y, m, d] = r.map(Number);
  else if ((r = t.match(/(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{2,4})/))) [, d, m, y] = r.map(Number);
  else if ((r = t.match(/(\d{1,2})\s*(?:de\s+)?([a-z]+)\s*(?:de\s+)?(\d{2,4})/))) {
    d = Number(r[1]); m = MESES_NOMES.findIndex(n => n.startsWith(r[2].slice(0, 3))) + 1; y = Number(r[3]);
    if (!m) return null;
  } else return null;
  if (y < 100) {
    const ano = Number(today.slice(0, 4));
    y += 2000;
    if (y > ano) y -= 100;
  }
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (!isValidISODate(iso) || iso > today || y < Number(today.slice(0, 4)) - 120) return null;
  return iso;
}

// ---------- Cartão de crédito (06/11) ----------
// O cartão fica junto das contas (tipo "cartao"): limite, dia de fechamento e de vencimento. O gasto lançado "no
// cartão" (accountId) entra na fatura aberta. O app não acessa o cartão: o que já estava usado a pessoa informa.

export function createCartao({ bank, nickname = '', limiteCents, fechamentoDia, vencimentoDia, usadoCents = 0 }, { now = new Date(), id } = {}) {
  const b = String(bank || '').trim();
  if (!b) throw new Error('Escolha o banco do cartão.');
  if (!Number.isInteger(limiteCents) || limiteCents <= 0) throw new Error('Qual o limite do cartão?');
  const f = Number(fechamentoDia);
  const v = Number(vencimentoDia);
  if (!(Number.isInteger(f) && f >= 1 && f <= 31)) throw new Error('Dia de fechamento entre 1 e 31.');
  if (!(Number.isInteger(v) && v >= 1 && v <= 31)) throw new Error('Dia de vencimento entre 1 e 31.');
  if (!Number.isInteger(usadoCents) || usadoCents < 0) throw new Error('Valor já usado inválido.');
  return {
    id: id || newId(), tipo: 'cartao', bank: b.slice(0, 40), nickname: String(nickname).trim().slice(0, 30),
    balanceCents: 0, usadoInicialCents: usadoCents, limiteCents, fechamentoDia: f, vencimentoDia: v,
    balanceAt: now.getTime(), createdAt: now.getTime(),
  };
}

/** Data (YYYY-MM-DD) do dia `dia` no mês `month`, ajustando pro último dia (31 em fevereiro = 28/29). */
function diaDoMes(month, dia) {
  return `${month}-${String(Math.min(dia, daysInMonth(month))).padStart(2, '0')}`;
}

/**
 * Situação do cartão numa data: fatura aberta (compras depois do último fechamento), fatura fechada (a que vai vencer),
 * quanto do limite já foi e quando fecha e vence.
 */
export function faturaDoCartao(cartao, expenses, today = toISODate()) {
  const mes = monthKey(today);
  const fechaEsteMes = diaDoMes(mes, cartao.fechamentoDia);
  const ultimoFech = today > fechaEsteMes ? fechaEsteMes : diaDoMes(shiftMonth(mes, -1), cartao.fechamentoDia);
  const penultFech = diaDoMes(shiftMonth(ultimoFech.slice(0, 7), -1), cartao.fechamentoDia);
  const proxFech = diaDoMes(shiftMonth(ultimoFech.slice(0, 7), 1), cartao.fechamentoDia);
  // vencimento da fatura fechada: o primeiro dia de vencimento depois do fechamento
  const vencNoMes = diaDoMes(ultimoFech.slice(0, 7), cartao.vencimentoDia);
  const vencimento = vencNoMes > ultimoFech ? vencNoMes : diaDoMes(shiftMonth(ultimoFech.slice(0, 7), 1), cartao.vencimentoDia);
  // parcelado (P8): cada parcela cai na fatura do mês dela
  const doCartao = expenses.filter(e => e.accountId === cartao.id)
    .flatMap(e => parcelasDe(e).map(p => ({ date: p.date, amountCents: p.valorCents, modo: e.limiteModo || 'total' })));
  const soma = (de, ate, lista = doCartao) => lista.filter(e => e.date > de && e.date <= ate).reduce((s, e) => s + e.amountCents, 0);
  const criadoEm = toISODate(new Date(cartao.balanceAt || cartao.createdAt || Date.now()));
  const inicial = cartao.usadoInicialCents || 0;
  // o "já usado" informado entra na fatura do ciclo em que o cartão foi cadastrado
  const abertaCents = soma(ultimoFech, proxFech) + (criadoEm > ultimoFech ? inicial : 0);
  // parcelas das próximas faturas: no modo "total" elas continuam presas no limite
  const futurasCents = soma(proxFech, '9999-12-31');
  const presoFuturoCents = soma(proxFech, '9999-12-31', doCartao.filter(e => e.modo === 'total'));
  const fechadaCents = soma(penultFech, ultimoFech) + (criadoEm > penultFech && criadoEm <= ultimoFech ? inicial : 0);
  const pagaJa = today > vencimento; // depois do vencimento, a fechada já foi (ou devia ter sido) paga
  const usadoCents = abertaCents + (pagaJa ? 0 : fechadaCents) + presoFuturoCents;
  const limiteCents = (cartao.limiteCents || 0) + (cartao.reforcoCents || 0);
  return {
    id: cartao.id, nome: accountLabel(cartao), limiteCents, reforcoCents: cartao.reforcoCents || 0, usadoCents, disponivelCents: limiteCents - usadoCents,
    pct: limiteCents ? Math.round((usadoCents / limiteCents) * 100) : 0,
    abertaCents, fechadaCents: pagaJa ? 0 : fechadaCents, futurasCents, presoFuturoCents, fechamento: proxFech, ultimoFechamento: ultimoFech, vencimento,
    diasParaFechar: daysBetween(today, proxFech), diasParaVencer: daysBetween(today, vencimento),
  };
}

// ---------- Metas (06/11) ----------
// Meta = pra quê, quanto custa, quanto já tem, até quando. Fica em meta/metas (só no aparelho).

export function createMeta({ nome, alvoCents, guardadoCents = 0, ate }, { now = new Date(), id } = {}) {
  const n = String(nome || '').trim();
  if (!n) throw new Error('Pra que é a meta?');
  if (!Number.isInteger(alvoCents) || alvoCents <= 0 || alvoCents > 100_000_000_00) throw new Error('Quanto custa a meta?');
  if (!Number.isInteger(guardadoCents) || guardadoCents < 0) throw new Error('Valor já guardado inválido.');
  const hoje = monthKey(toISODate(now));
  if (ate != null && !(/^\d{4}-(0[1-9]|1[0-2])$/.test(ate) && ate >= hoje)) throw new Error('Até quando? (um mês de agora em diante)');
  return { id: id || newId(), nome: n.slice(0, 60), alvoCents, guardadoCents, ate: ate || null, criadaEm: now.getTime(), conquistadaEm: null };
}

/** Progresso: quanto falta, quantos meses sobram e quanto guardar por mês pra chegar lá. */
export function progressoMeta(meta, today = toISODate()) {
  const falta = Math.max(0, meta.alvoCents - meta.guardadoCents);
  const pct = Math.min(100, Math.round((meta.guardadoCents / meta.alvoCents) * 100));
  const meses = meta.ate ? Math.max(1, monthsBetween(monthKey(today), meta.ate) + 1) : null;
  return {
    ...meta, faltaCents: falta, pct, batida: falta === 0, mesesRestantes: meses,
    porMesCents: meses ? Math.ceil(falta / meses) : null,
  };
}

/** "Guardei X na meta": devolve a meta nova (não grava nada) e se ela acabou de ser batida. */
export function guardarNaMeta(meta, valorCents, now = new Date()) {
  if (!Number.isInteger(valorCents) || valorCents === 0) throw new Error('Valor inválido.');
  const guardado = Math.max(0, meta.guardadoCents + valorCents);
  const nova = { ...meta, guardadoCents: guardado };
  const batidaAgora = !meta.conquistadaEm && guardado >= meta.alvoCents;
  if (batidaAgora) nova.conquistadaEm = now.getTime();
  return { meta: nova, batidaAgora };
}

/** Lê "dezembro", "12/2026", "em 6 meses", "até o fim do ano" → "YYYY-MM" (ou null). */
export function lerMesAlvo(texto, today = toISODate()) {
  const t = String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const mes = monthKey(today);
  let r = t.match(/(\d{1,2})\s*\/\s*(\d{2,4})/);
  if (r) {
    let y = Number(r[2]); if (y < 100) y += 2000;
    const k = `${y}-${String(Number(r[1])).padStart(2, '0')}`;
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(k) && k >= mes ? k : null;
  }
  r = t.match(/(?:em|daqui a|daqui)\s+(\d{1,2})\s+mes/);
  if (r) return shiftMonth(mes, Number(r[1]));
  r = t.match(/(?:em|daqui a)\s+(\d{1,2})\s+ano/);
  if (r) return shiftMonth(mes, Number(r[1]) * 12);
  if (/fim do ano|final do ano|natal|dezembro/.test(t) && !/\d{4}/.test(t)) return `${mes.slice(0, 4)}-12` >= mes ? `${mes.slice(0, 4)}-12` : null;
  const NOMES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const i = NOMES.findIndex(n => t.includes(n));
  if (i >= 0) {
    const ano = (t.match(/\b(20\d{2})\b/) || [])[1];
    let k = `${ano || mes.slice(0, 4)}-${String(i + 1).padStart(2, '0')}`;
    if (!ano && k < mes) k = `${Number(mes.slice(0, 4)) + 1}-${String(i + 1).padStart(2, '0')}`;
    return k >= mes ? k : null;
  }
  return null;
}

// ---------- Investimentos (06/11, ideia do Bruno Levanti) ----------
// A pessoa cadastra o que tem e atualiza o valor de vez em quando (o app não acessa corretora nem banco).

export const TIPOS_INVESTIMENTO = Object.freeze({
  cdb: 'CDB / LCI / LCA', tesouro: 'Tesouro Direto', poupanca: 'Poupança', acoes: 'Ações', fii: 'Fundos imobiliários',
  fundo: 'Fundos de investimento', cripto: 'Criptomoedas', previdencia: 'Previdência', caixinha: 'Caixinha / conta que rende', outro: 'Outro',
});

export function createInvestimento({ nome, tipo = 'outro', instituicao = '', aplicadoCents, atualCents }, { now = new Date(), id } = {}) {
  const n = String(nome || '').trim();
  if (!n) throw new Error('Dá um nome pro investimento (ex.: CDB do Nubank).');
  if (!TIPOS_INVESTIMENTO[tipo]) throw new Error('Escolha o tipo.');
  if (!Number.isInteger(aplicadoCents) || aplicadoCents <= 0 || aplicadoCents > 100_000_000_00) throw new Error('Quanto você aplicou?');
  const atual = atualCents == null ? aplicadoCents : atualCents;
  if (!Number.isInteger(atual) || atual < 0 || atual > 100_000_000_00) throw new Error('Quanto está valendo agora?');
  return {
    id: id || newId(), nome: n.slice(0, 60), tipo, instituicao: String(instituicao).trim().slice(0, 40),
    aplicadoCents, atualCents: atual, valorEm: now.getTime(), criadoEm: now.getTime(),
  };
}

/** Novo valor de um investimento (a pessoa confere no app do banco e atualiza). Não grava nada. */
export function atualizarInvestimento(inv, { atualCents, aporteCents = 0 }, now = new Date()) {
  if (!Number.isInteger(atualCents) || atualCents < 0) throw new Error('Valor inválido.');
  if (!Number.isInteger(aporteCents) || aporteCents < 0) throw new Error('Valor do aporte inválido.');
  return { ...inv, atualCents, aplicadoCents: inv.aplicadoCents + aporteCents, valorEm: now.getTime() };
}

/** Total aplicado, quanto vale agora, quanto rendeu e a fatia de cada tipo. */
export function resumoInvestimentos(lista = []) {
  const aplicado = lista.reduce((s, i) => s + i.aplicadoCents, 0);
  const atual = lista.reduce((s, i) => s + i.atualCents, 0);
  const porTipo = {};
  for (const i of lista) porTipo[i.tipo] = (porTipo[i.tipo] || 0) + i.atualCents;
  return {
    quantidade: lista.length, aplicadoCents: aplicado, atualCents: atual, ganhoCents: atual - aplicado,
    rendimentoPct: aplicado ? Math.round(((atual - aplicado) / aplicado) * 1000) / 10 : 0,
    porTipo: Object.entries(porTipo).map(([tipo, cents]) => ({ tipo, nome: TIPOS_INVESTIMENTO[tipo], cents, pct: atual ? Math.round((cents / atual) * 100) : 0 }))
      .sort((a, b) => b.cents - a.cents),
  };
}
