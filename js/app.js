// UI: liga a tela ao motor, à persistência e ao narrador.

import * as db from './db.js';
import {
  DEFAULT_CATEGORIES, formatBRL, parseAmount, toISODate, monthKey, shiftMonth, monthLabel,
  createExpense, summarizeMonth, detectExpenseEvents, detectMonthClose,
} from './engine.js';
import { react, MOODS, DEFAULT_MOOD, emptyMemory } from './caos.js';

const $ = sel => document.querySelector(sel);

const state = {
  categories: [],
  expenses: [],
  settings: { mood: DEFAULT_MOOD, voice: false },
  caosMemory: emptyMemory(),
  viewMonth: monthKey(toISODate()),
  selectedCategory: null,
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const catById = id => state.categories.find(c => c.id === id);

// ---------- Narrador ----------

function narrate(events, { ignoreCooldown = false } = {}) {
  const memory = ignoreCooldown ? { ...state.caosMemory, lastAt: {} } : state.caosMemory;
  const { fala, memoria } = react(events, {
    mood: state.settings.mood,
    memory,
    now: Date.now(),
  });
  // ignorar cooldown nesta fala não pode apagar os cooldowns dos outros eventos
  state.caosMemory = { ...memoria, lastAt: { ...state.caosMemory.lastAt, ...memoria.lastAt } };
  db.setMeta('caosMemory', state.caosMemory).catch(console.error);
  if (!fala) return;
  const box = $('#caos');
  $('#caos-line').textContent = fala.texto;
  box.classList.toggle('alert', fala.alerta);
  box.classList.remove('pulse');
  void box.offsetWidth;
  box.classList.add('pulse');
  if (state.settings.voice) speak(fala.texto);
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR';
  const voice = speechSynthesis.getVoices().find(v => v.lang?.toLowerCase().startsWith('pt'));
  if (voice) u.voice = voice;
  u.rate = 1.05;
  speechSynthesis.speak(u);
}

// ---------- Render ----------

function render() {
  const s = summarizeMonth(state.expenses, state.categories, state.viewMonth);
  const isCurrent = state.viewMonth === monthKey(toISODate());

  const label = monthLabel(state.viewMonth);
  $('#month-label').textContent = label[0].toUpperCase() + label.slice(1);
  $('#next-month').disabled = isCurrent;
  $('#total').textContent = formatBRL(s.totalCents);

  const barWrap = $('#total-bar-wrap');
  if (s.budgetTotalCents > 0) {
    barWrap.hidden = false;
    setBar($('#total-bar'), s.ratio);
    const left = s.budgetTotalCents - s.budgetedSpentCents;
    const base = `Com limite: ${formatBRL(s.budgetedSpentCents)} de ${formatBRL(s.budgetTotalCents)}`;
    $('#total-sub').textContent = left >= 0 ? `${base} · restam ${formatBRL(left)}` : `${base} · ${formatBRL(-left)} acima`;
  } else {
    barWrap.hidden = true;
    $('#total-sub').textContent = 'Defina orçamentos para ver quanto ainda pode gastar.';
  }

  // Lista por categoria: só as que têm gasto ou orçamento
  const rows = s.rows.filter(r => r.spentCents > 0 || r.budgetCents > 0)
    .sort((a, b) => b.spentCents - a.spentCents);
  $('#cat-list').innerHTML = rows.length ? rows.map(r => `
    <li>
      <div class="cat-head">
        <span>${r.emoji} ${esc(r.name)}</span>
        <span class="num">${formatBRL(r.spentCents)}${r.budgetCents ? `<small> / ${formatBRL(r.budgetCents)}</small>` : ''}</span>
      </div>
      ${r.budgetCents ? `<div class="bar"><div class="bar-fill" style="${barStyle(r.ratio)}"></div></div>` : ''}
    </li>`).join('') : '<li class="muted">Sem gastos ainda.</li>';

  // Gastos do mês
  const list = state.expenses.filter(e => e.month === state.viewMonth)
    .sort((a, b) => (b.date.localeCompare(a.date)) || (b.createdAt - a.createdAt));
  $('#exp-empty').hidden = list.length > 0;
  $('#exp-list').innerHTML = list.map(e => {
    const c = catById(e.categoryId);
    const [, m, d] = e.date.split('-');
    return `
    <li>
      <span class="exp-emoji" aria-hidden="true">${c?.emoji ?? '📦'}</span>
      <span class="exp-main">
        <span>${esc(e.note || c?.name || e.categoryId)}</span>
        <small>${d}/${m}${e.note && c ? ` · ${esc(c.name)}` : ''}</small>
      </span>
      <span class="num">${formatBRL(e.amountCents)}</span>
      <button class="icon-btn del" data-del="${esc(e.id)}" aria-label="Apagar gasto">×</button>
    </li>`;
  }).join('');
}

function barStyle(ratio) {
  const pct = Math.min(100, Math.round((ratio ?? 0) * 100));
  const color = ratio > 1 ? 'var(--danger)' : ratio >= 0.8 ? 'var(--warn)' : 'var(--ok)';
  return `width:${pct}%;background:${color}`;
}
function setBar(el, ratio) { el.setAttribute('style', barStyle(ratio)); }

function renderChips() {
  $('#category-chips').innerHTML = state.categories.map(c => `
    <button type="button" class="chip" role="radio" aria-checked="${c.id === state.selectedCategory}" data-cat="${c.id}">
      ${c.emoji} ${esc(c.name)}
    </button>`).join('');
}

function renderBudgets() {
  $('#budget-list').innerHTML = state.categories.map(c => `
    <li>
      <label for="b-${c.id}">${c.emoji} ${esc(c.name)}</label>
      <span class="amount small"><span>R$</span>
        <input id="b-${c.id}" data-budget="${c.id}" type="text" inputmode="decimal" placeholder="sem limite"
          value="${c.budgetCents ? (c.budgetCents / 100).toFixed(2).replace('.', ',') : ''}">
      </span>
    </li>`).join('');
}

function renderSettings() {
  $('#mood-options').innerHTML = Object.entries(MOODS).map(([id, label]) => `
    <label><input type="radio" name="mood" value="${id}" ${state.settings.mood === id ? 'checked' : ''}><span>${label}</span></label>`).join('');
  $('#voice-toggle').checked = state.settings.voice;
  const voice = $('#voice-toggle').closest('label');
  voice.hidden = !('speechSynthesis' in window);
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2600);
}

// ---------- Ações ----------

async function onSubmit(ev) {
  ev.preventDefault();
  const err = $('#form-error');
  err.hidden = true;
  try {
    const amountCents = parseAmount($('#amount').value);
    if (!amountCents) throw new Error('Digite um valor, tipo 25,90.');
    if (!state.selectedCategory) throw new Error('Escolha uma categoria.');
    const expense = createExpense(
      { amountCents, categoryId: state.selectedCategory, note: $('#note').value, date: $('#date').value },
      { categories: state.categories },
    );
    await db.put(db.STORES.expenses, expense);
    state.expenses.push(expense);
    const events = detectExpenseEvents({ expenses: state.expenses, categories: state.categories, newExpense: expense });

    $('#amount').value = '';
    $('#note').value = '';
    state.viewMonth = expense.month;
    render();
    narrate(events);
    $('#amount').focus();
  } catch (e) {
    err.textContent = e.message || 'Não deu para salvar.';
    err.hidden = false;
  }
}

async function onDelete(id) {
  const e = state.expenses.find(x => x.id === id);
  if (!e || !confirm(`Apagar ${formatBRL(e.amountCents)}${e.note ? ` (${e.note})` : ''}?`)) return;
  await db.remove(db.STORES.expenses, id);
  state.expenses = state.expenses.filter(x => x.id !== id);
  render();
  toast('Gasto apagado.');
}

async function onBudgetChange(input) {
  const cat = catById(input.dataset.budget);
  if (!cat) return;
  const raw = input.value.trim();
  const cents = raw === '' ? 0 : parseAmount(raw);
  if (cents === null) { toast('Valor de orçamento inválido.'); input.value = ''; return; }
  const updated = { ...cat, budgetCents: cents };
  await db.put(db.STORES.categories, updated);
  state.categories = state.categories.map(c => (c.id === cat.id ? updated : c));
  input.value = cents ? (cents / 100).toFixed(2).replace('.', ',') : '';
  render();
  toast(cents ? `Orçamento de ${cat.name}: ${formatBRL(cents)}` : `${cat.name} sem limite.`);
}

async function saveSettings() {
  await db.setMeta('settings', state.settings);
}

function exportBackup() {
  const data = {
    app: 'carteira-jf', version: 1, exportedAt: new Date().toISOString(),
    categories: state.categories, expenses: state.expenses,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `carteira-backup-${toISODate()}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data?.app !== 'carteira-jf' || !Array.isArray(data.expenses) || !Array.isArray(data.categories)) {
      throw new Error('Arquivo não parece um backup da Carteira JF.');
    }
    const ok = data.expenses.every(e => e && typeof e.id === 'string' && Number.isInteger(e.amountCents)
      && typeof e.date === 'string' && typeof e.month === 'string' && typeof e.categoryId === 'string');
    if (!ok) throw new Error('Backup com gastos inválidos.');
    if (!confirm(`Substituir os dados atuais por ${data.expenses.length} gastos do backup?`)) return;
    await db.replaceAll({ expenses: data.expenses, categories: data.categories });
    state.expenses = data.expenses;
    state.categories = data.categories;
    renderChips();
    renderBudgets();
    render();
    toast('Backup restaurado.');
  } catch (e) {
    toast(e.message || 'Não deu para importar.');
  }
}

// ---------- Inicialização ----------

function bind() {
  $('#expense-form').addEventListener('submit', onSubmit);
  $('#category-chips').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    state.selectedCategory = b.dataset.cat;
    renderChips();
  });
  $('#exp-list').addEventListener('click', e => {
    const b = e.target.closest('[data-del]');
    if (b) onDelete(b.dataset.del);
  });
  $('#budget-list').addEventListener('change', e => {
    if (e.target.matches('[data-budget]')) onBudgetChange(e.target);
  });
  $('#prev-month').addEventListener('click', () => { state.viewMonth = shiftMonth(state.viewMonth, -1); render(); });
  $('#next-month').addEventListener('click', () => { state.viewMonth = shiftMonth(state.viewMonth, 1); render(); });
  $('#mood-options').addEventListener('change', e => {
    state.settings.mood = e.target.value;
    saveSettings();
    narrate([{ type: 'boas_vindas' }], { ignoreCooldown: true });
  });
  $('#voice-toggle').addEventListener('change', e => {
    state.settings.voice = e.target.checked;
    saveSettings();
    if (e.target.checked) speak('Voz ativada.');
  });
  $('#export-btn').addEventListener('click', exportBackup);
  $('#import-input').addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (f) importBackup(f);
    e.target.value = '';
  });
}

function installHint() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) return '';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return ios
    ? 'Para instalar: Compartilhar → Adicionar à Tela de Início. Instalado, o iPhone guarda os dados com mais segurança.'
    : 'Para instalar: menu do navegador → Instalar app / Adicionar à tela inicial.';
}

async function init() {
  bind();
  $('#date').value = toISODate();
  try {
    const [cats, expenses, settings, memory] = await Promise.all([
      db.getAll(db.STORES.categories),
      db.getAll(db.STORES.expenses),
      db.getMeta('settings'),
      db.getMeta('caosMemory'),
    ]);
    if (cats.length === 0) {
      state.categories = DEFAULT_CATEGORIES.map(c => ({ ...c }));
      await db.putMany(db.STORES.categories, state.categories);
    } else {
      const order = DEFAULT_CATEGORIES.map(c => c.id);
      state.categories = cats.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }
    state.expenses = expenses;
    if (settings) state.settings = { ...state.settings, ...settings };
    if (memory) state.caosMemory = memory;
  } catch (e) {
    console.error(e);
    toast('Não consegui abrir o banco local. Os gastos não serão salvos.');
  }

  renderChips();
  renderBudgets();
  renderSettings();
  render();
  $('#install-hint').textContent = installHint();

  const closing = detectMonthClose({
    expenses: state.expenses, categories: state.categories, currentMonth: monthKey(toISODate()),
  });
  narrate([...closing, { type: 'boas_vindas' }]);
  if ($('#caos-line').textContent === 'Iniciando…') $('#caos-line').textContent = 'De olho nos seus gastos.';

  db.requestPersistence();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW não registrado', err));
  }
}

init();
