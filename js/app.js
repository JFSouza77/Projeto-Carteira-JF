// UI: liga a tela ao motor, à persistência e ao narrador.
// Só este arquivo (via db.js) grava dados. O C.A.O.S. só sugere; quem confirma é a pessoa.

import * as db from './db.js';
import {
  DEFAULT_CATEGORIES, INCOME_SOURCES, BANKS, formatBRL, parseAmount, parseSignedAmount, toISODate, monthKey,
  shiftMonth, monthLabel, createExpense, createIncome, createAccount, summarizeMonth, detectExpenseEvents,
  detectMonthClose, incomeIn, accountBalance, accountLabel, totalBalance, analyze,
  TIPOS_COMPROMISSO, createCompromisso, situacaoCompromissos, createPlano, analisarPlanejamento, sugerirCategoria,
} from './engine.js';
import { reagir, conversar, falaAvulsa, MOODS, DEFAULT_MOOD, CAOS_VERSAO, SUGESTOES, IDENTIDADE, memoriaInicial, emocaoDoMomento, rostoAvulso, nomeAlerta } from './caos/index.js';
import { extrairNome } from './caos/conversa.js';
import { falar, vozDisponivel, ditadoDisponivel, ouvir } from './voz.js';
import * as imagens from './imagens.js';
import * as ia from './ia.js';
import * as lembretes from './notificacoes.js';

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
const centsToInput = c => (c ? (c / 100).toFixed(2).replace('.', ',') : '');

const state = {
  categories: [],
  expenses: [],
  incomes: [],
  accounts: [],
  settings: { mood: DEFAULT_MOOD, voice: false, aiOn: false, aiUrl: '' },
  caosMemory: memoriaInicial(),
  viewMonth: monthKey(toISODate()),
  kind: 'gasto',
  selectedCategory: null,
  selectedSource: null,
  photo: null, // { id, url } da foto anexada no formulário
  chat: [],
  compromissos: [],
  planos: [],
  perfil: null, // { nome, apelido, tratamento, foco[] } (primeiro acesso)
  onboarding: null, // { passo, dados } enquanto o C.A.O.S. está conhecendo a pessoa
  catSugerida: false,
  mercado: null, // resumo do mercado vindo do servidor (guardado pra usar offline)
};

const dados = () => ({
  expenses: state.expenses, incomes: state.incomes, categories: state.categories, accounts: state.accounts,
  compromissos: state.compromissos, planos: state.planos, mercado: state.mercado,
});
const catById = id => state.categories.find(c => c.id === id);
const srcById = id => INCOME_SOURCES.find(s => s.id === id);

// ======================================================================
// Narrador
// ======================================================================

function guardarMemoria(memoria) {
  state.caosMemory = memoria;
  db.setMeta('caosMemory', memoria).catch(console.error);
}

// ---------- Rosto animado (sistema do Perfil JF) ----------

function setRosto(el, r) {
  if (!el || !r) return;
  el._rosto = r;
  el.dataset.emo = r.emo;
  el.dataset.fl = r.quadros.some(q => [...q].length > 11) ? '1' : '';
  el.style.setProperty('--emo-cor', r.cor);
  el.style.setProperty('--emo-bg', r.bg);
  el.textContent = r.quadros[0];
}

/** Pinta o rosto do momento no balão da tela inicial e no topo da conversa. */
function pintarRosto(rosto) {
  const r = rosto || emocaoDoMomento(state.caosMemory, state.settings.mood).rosto
    || rostoAvulso(undefined, { mood: state.settings.mood, memory: state.caosMemory });
  setRosto($('#caos-face'), r);
  setRosto($('#chat-face'), r);
  $('#caos').style.setProperty('--emo-cor', r.cor);
  $('#caos-mood').textContent = `· ${r.nome}`;
  $('#chat-mood').textContent = r.nome;
}

// Anima todos os rostos na tela: troca os quadros, balança de leve, treme quando bravo (como no Perfil)
const MENOS_MOVIMENTO = matchMedia('(prefers-reduced-motion: reduce)');
function animarRostos() {
  if (document.hidden) return;
  const t = performance.now();
  for (const el of document.querySelectorAll('.caos-face')) {
    const r = el._rosto;
    if (!r || !el.isConnected || el.offsetParent === null) continue;
    if (MENOS_MOVIMENTO.matches) { if (el.textContent !== r.quadros[0]) el.textContent = r.quadros[0]; continue; }
    const q = r.quadros[Math.floor(t / r.fr) % r.quadros.length];
    if (el.textContent !== q) el.textContent = q;
    const calmo = r.emo === 'calmo';
    el.style.setProperty('--emo-k', ((r.amp * (1 - Math.cos((t / r.per) * 2 * Math.PI))) / 2).toFixed(3));
    el.style.setProperty('--face-y', calmo ? '0px' : `${(-1.5 * Math.sin((t / 900) * 2 * Math.PI)).toFixed(2)}px`);
    el.style.setProperty('--face-r', r.emo === 'raiva' ? `${(2.5 * Math.sin(t / 45)).toFixed(2)}deg`
      : r.emo === 'deboche' ? `${(4 * Math.sin(t / 700)).toFixed(2)}deg` : '0deg');
  }
}
setInterval(animarRostos, 90);

function pintarOlho() {
  pintarRosto();
}

function narrate(events, { ignoreCooldown = false } = {}) {
  const memory = ignoreCooldown ? { ...state.caosMemory, lastAt: {} } : state.caosMemory;
  const { fala, memoria } = reagir(events, { mood: state.settings.mood, memory, now: Date.now(), perfil: state.perfil });
  // ignorar cooldown nesta fala não pode apagar os cooldowns dos outros eventos
  guardarMemoria({ ...memoria, lastAt: { ...state.caosMemory.lastAt, ...memoria.lastAt } });
  if (!fala) { pintarOlho(); return null; }
  pintarRosto(fala.rosto);
  const box = $('#caos');
  $('#caos-line').textContent = fala.texto;
  box.classList.toggle('alert', fala.alerta);
  box.classList.remove('pulse');
  void box.offsetWidth;
  box.classList.add('pulse');
  if (state.settings.voice) falar(fala.texto, fala.emocao);
  return fala;
}

// ======================================================================
// Navegação
// ======================================================================

const TELAS = ['inicio', 'lancar', 'mes', 'conversa', 'contas', 'ajustes'];

function irPara(tela) {
  const t = TELAS.includes(tela) ? tela : 'inicio';
  for (const el of document.querySelectorAll('.tela')) el.hidden = el.dataset.tela !== t;
  for (const a of document.querySelectorAll('.tabbar a')) {
    if (a.dataset.tab === t) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  if (t === 'conversa') {
    renderChat();
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 0);
  } else {
    window.scrollTo(0, 0);
  }
  if (t === 'contas') renderContas();
  if (t === 'mes') renderMes();
}

// ======================================================================
// Início
// ======================================================================

function barStyle(ratio) {
  const pct = Math.min(100, Math.round((ratio ?? 0) * 100));
  const color = ratio > 1 ? 'var(--danger)' : ratio >= 0.8 ? 'var(--warn)' : 'var(--ok)';
  return `width:${pct}%;background:${color}`;
}

const ICONE_ALERTA = {
  categoria_estourada: '🔴', orcamento_80: '🟡', ritmo_alto: '📈', mes_negativo: '⚠️', conta_negativa: '🏦',
  delivery_repetido: '🛵', sem_registro: '💤', compromisso_vence: '📅', compromisso_atrasado: '⏰', plano_do_mes: '🗓️',
  confira_banco: '🔎',
};

function render() {
  const s = summarizeMonth(state.expenses, state.categories, state.viewMonth);
  const isCurrent = state.viewMonth === monthKey(toISODate());

  $('#month-label').textContent = cap(monthLabel(state.viewMonth));
  $('#next-month').disabled = isCurrent;
  $('#total').textContent = formatBRL(s.totalCents);

  const barWrap = $('#total-bar-wrap');
  if (s.budgetTotalCents > 0) {
    barWrap.hidden = false;
    $('#total-bar').setAttribute('style', barStyle(s.ratio));
    const left = s.budgetTotalCents - s.budgetedSpentCents;
    const base = `Com limite: ${formatBRL(s.budgetedSpentCents)} de ${formatBRL(s.budgetTotalCents)}`;
    $('#total-sub').textContent = left >= 0 ? `${base} · restam ${formatBRL(left)}` : `${base} · ${formatBRL(-left)} acima`;
  } else {
    barWrap.hidden = true;
    $('#total-sub').textContent = 'Defina orçamentos em Ajustes para ver quanto ainda pode gastar.';
  }

  const inc = incomeIn(state.incomes, state.viewMonth);
  const net = inc - s.totalCents;
  $('#stat-in').textContent = formatBRL(inc);
  $('#stat-net').textContent = formatBRL(net);
  $('#stat-net').className = `num ${net < 0 ? 'bad' : net > 0 ? 'ok' : ''}`;
  $('#stat-bank').textContent = state.accounts.length ? formatBRL(totalBalance(state.accounts, state.expenses, state.incomes)) : '—';

  // Alertas (só no mês atual)
  const alertas = isCurrent ? analyze(dados()) : [];
  $('#alerts-card').hidden = !alertas.length;
  $('#alert-list').innerHTML = alertas.map(a => `
    <li class="${a.severity}"><span aria-hidden="true">${ICONE_ALERTA[a.type] || '⚠️'}</span><span>${esc(cap(nomeAlerta(a)))}</span></li>`).join('');

  const rows = s.rows.filter(r => r.spentCents > 0 || r.budgetCents > 0).sort((a, b) => b.spentCents - a.spentCents);
  $('#cat-list').innerHTML = rows.length ? rows.map(r => `
    <li>
      <div class="cat-head">
        <span>${r.emoji} ${esc(r.name)}</span>
        <span class="num">${formatBRL(r.spentCents)}${r.budgetCents ? `<small> / ${formatBRL(r.budgetCents)}</small>` : ''}</span>
      </div>
      ${r.budgetCents ? `<div class="bar"><div class="bar-fill" style="${barStyle(r.ratio)}"></div></div>` : ''}
    </li>`).join('') : '<li class="muted">Sem gastos ainda.</li>';

  const lanc = [
    ...state.expenses.filter(e => e.month === state.viewMonth).map(e => ({ ...e, kind: 'gasto' })),
    ...state.incomes.filter(i => i.month === state.viewMonth).map(i => ({ ...i, kind: 'entrada' })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  $('#exp-empty').hidden = lanc.length > 0;
  $('#exp-list').innerHTML = lanc.map(x => {
    const [, m, d] = x.date.split('-');
    const conta = x.accountId && state.accounts.find(a => a.id === x.accountId);
    if (x.kind === 'entrada') {
      const s2 = srcById(x.sourceId);
      return `
      <li class="entrada">
        <span class="exp-emoji" aria-hidden="true">${s2?.emoji ?? '💰'}</span>
        <span class="exp-main"><span>${esc(x.note || s2?.name || 'Entrada')}</span>
          <small>${d}/${m} · entrada${conta ? ` · ${esc(accountLabel(conta))}` : ''}</small></span>
        <span class="num">+${formatBRL(x.amountCents)}</span>
        <button class="icon-btn del" data-del="${esc(x.id)}" data-kind="entrada" aria-label="Apagar entrada">×</button>
      </li>`;
    }
    const c = catById(x.categoryId);
    return `
    <li>
      <span class="exp-emoji" aria-hidden="true">${c?.emoji ?? '📦'}</span>
      <span class="exp-main"><span>${esc(x.note || c?.name || x.categoryId)}</span>
        <small>${d}/${m}${x.note && c ? ` · ${esc(c.name)}` : ''}${conta ? ` · ${esc(accountLabel(conta))}` : ''}
        ${x.imageId ? `<button class="thumb-btn" data-photo="${esc(x.imageId)}" aria-label="Ver foto">📷</button>` : ''}</small></span>
      <span class="num">${formatBRL(x.amountCents)}</span>
      <button class="icon-btn del" data-del="${esc(x.id)}" data-kind="gasto" aria-label="Apagar gasto">×</button>
    </li>`;
  }).join('');
}

// ======================================================================
// Lançar (gasto ou entrada)
// ======================================================================

function renderLancar() {
  const gasto = state.kind === 'gasto';
  const opcoes = gasto ? state.categories : INCOME_SOURCES;
  const sel = gasto ? state.selectedCategory : state.selectedSource;
  $('#category-chips').setAttribute('aria-label', gasto ? 'Categoria' : 'De onde veio');
  $('#category-chips').innerHTML = opcoes.map(c => `
    <button type="button" class="chip" role="radio" aria-checked="${c.id === sel}" data-cat="${c.id}">${c.emoji} ${esc(c.name)}</button>`).join('');
  $('#submit-btn').textContent = gasto ? 'Adicionar gasto' : 'Adicionar entrada';
  $('#account-field').hidden = state.accounts.length === 0;
  const atual = $('#account-select').value;
  $('#account-select').innerHTML = '<option value="">Sem conta</option>'
    + state.accounts.map(a => `<option value="${esc(a.id)}">${esc(accountLabel(a))}</option>`).join('');
  if (state.accounts.some(a => a.id === atual)) $('#account-select').value = atual;
  $('#photo-ai').hidden = !(state.photo && state.settings.aiOn);
}

function mostrarFoto() {
  const p = state.photo;
  $('#photo-preview').hidden = !p;
  if (p) $('#photo-img').src = p.url;
  $('#photo-ai').hidden = !(p && state.settings.aiOn);
}

async function limparFoto({ apagar }) {
  if (state.photo) {
    URL.revokeObjectURL(state.photo.url);
    if (apagar) await imagens.apagar(state.photo.id).catch(() => {});
  }
  state.photo = null;
  $('#photo-input').value = '';
  mostrarFoto();
}

/** Grava um gasto (do formulário ou de uma proposta do C.A.O.S. confirmada). Devolve os eventos. */
async function registrarGasto({ amountCents, categoryId, note, date, accountId, imageId, compromissoId }) {
  const expense = createExpense({ amountCents, categoryId, note, date, accountId, imageId, compromissoId }, { categories: state.categories });
  const conta = accountId && state.accounts.find(a => a.id === accountId);
  const antes = conta ? accountBalance(conta, state.expenses, state.incomes) : null;
  await db.put(db.STORES.expenses, expense);
  state.expenses.push(expense);
  const events = detectExpenseEvents({ expenses: state.expenses, categories: state.categories, newExpense: expense });
  if (conta) {
    const depois = accountBalance(conta, state.expenses, state.incomes);
    if (antes >= 0 && depois < 0) events.push({ type: 'conta_negativa', accountName: accountLabel(conta), balanceCents: depois });
  }
  state.viewMonth = expense.month;
  render();
  return events;
}

async function registrarEntrada({ amountCents, sourceId, note, date, accountId }) {
  const income = createIncome({ amountCents, sourceId, note, date, accountId });
  await db.put(db.STORES.incomes, income);
  state.incomes.push(income);
  state.viewMonth = income.month;
  render();
  return [{ type: 'entrada_cadastrada', amountCents, sourceId }];
}

async function onSubmit(ev) {
  ev.preventDefault();
  const err = $('#form-error');
  err.hidden = true;
  try {
    const amountCents = parseAmount($('#amount').value);
    if (!amountCents) throw new Error('Digite um valor, tipo 25,90.');
    const base = { amountCents, note: $('#note').value, date: $('#date').value, accountId: $('#account-select').value || null };
    let events;
    if (state.kind === 'gasto') {
      if (!state.selectedCategory) throw new Error('Escolha uma categoria.');
      events = await registrarGasto({ ...base, categoryId: state.selectedCategory, imageId: state.photo?.id });
      await limparFoto({ apagar: false });
    } else {
      if (!state.selectedSource) throw new Error('Escolha de onde veio o dinheiro.');
      events = await registrarEntrada({ ...base, sourceId: state.selectedSource });
      await limparFoto({ apagar: true });
    }
    $('#amount').value = '';
    $('#note').value = '';
    state.catSugerida = false;
    state.selectedCategory = null; // o próximo lançamento começa livre pra o C.A.O.S. sugerir pela descrição
    $('#cat-sugestao').hidden = true;
    renderLancar();
    const fala = narrate(events);
    toast(fala ? fala.texto : 'Salvo!');
  } catch (e) {
    err.textContent = e.message || 'Não deu para salvar.';
    err.hidden = false;
  }
}

async function onFoto(arquivo) {
  try {
    await limparFoto({ apagar: true });
    const img = await imagens.guardar(arquivo, 'comprovante');
    state.photo = { id: img.id, url: URL.createObjectURL(img.blob) };
    mostrarFoto();
    if (state.settings.aiOn) toast('Foto anexada. Toque em "Ler com IA" para preencher sozinho.');
  } catch (e) {
    toast(e.message || 'Não deu para anexar a foto.');
  }
}

/** A IA lê a foto e PREENCHE o formulário. Nada é salvo até a pessoa tocar em Adicionar. */
async function lerFotoComIA() {
  const btn = $('#photo-ai');
  try {
    btn.disabled = true;
    btn.textContent = '⏳ Lendo…';
    const img = await imagens.pegar(state.photo.id);
    const r = await ia.lerImagem(state.settings.aiUrl, { base64: await imagens.paraBase64(img.blob), categorias: state.categories });
    if (r.valor_centavos > 0) $('#amount').value = centsToInput(r.valor_centavos);
    if (/^\d{4}-\d{2}-\d{2}$/.test(r.data || '')) $('#date').value = r.data;
    if (r.estabelecimento && !$('#note').value) $('#note').value = r.estabelecimento.slice(0, 120);
    if (r.categoria && catById(r.categoria)) {
      state.kind = 'gasto';
      document.querySelector('input[name="kind"][value="gasto"]').checked = true;
      state.selectedCategory = r.categoria;
    }
    renderLancar();
    toast(r.confianca === 'baixa' ? 'Li, mas com pouca certeza. Confere os campos!' : 'Pronto! Confere e toca em Adicionar.');
  } catch (e) {
    toast(e.message || 'Não consegui ler a foto.');
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Ler com IA';
  }
}

async function onDelete(id, kind) {
  const lista = kind === 'entrada' ? state.incomes : state.expenses;
  const x = lista.find(i => i.id === id);
  if (!x || !confirm(`Apagar ${formatBRL(x.amountCents)}${x.note ? ` (${x.note})` : ''}?`)) return;
  await db.remove(kind === 'entrada' ? db.STORES.incomes : db.STORES.expenses, id);
  if (x.imageId) await imagens.apagar(x.imageId).catch(() => {});
  if (kind === 'entrada') state.incomes = state.incomes.filter(i => i.id !== id);
  else state.expenses = state.expenses.filter(i => i.id !== id);
  render();
  toast(kind === 'entrada' ? 'Entrada apagada.' : 'Gasto apagado.');
}

async function verFoto(id) {
  const img = await imagens.pegar(id);
  if (!img) return toast('Foto não encontrada.');
  const url = URL.createObjectURL(img.blob);
  $('#photo-dialog-img').src = url;
  const dlg = $('#photo-dialog');
  dlg.showModal();
  dlg.addEventListener('close', () => URL.revokeObjectURL(url), { once: true });
}

// ======================================================================
// Conversa com o C.A.O.S.
// ======================================================================

function addMsg(msg) {
  if (msg.de === 'caos' && !msg.rosto) {
    msg.rosto = msg.temp
      ? rostoAvulso('pensando', { mood: state.settings.mood, memory: state.caosMemory })
      : emocaoDoMomento(state.caosMemory, state.settings.mood).rosto
        || rostoAvulso(undefined, { mood: state.settings.mood, memory: state.caosMemory });
  }
  state.chat.push(msg);
  if (state.chat.length > 60) state.chat.splice(0, state.chat.length - 60);
  db.setMeta('chat', state.chat.filter(m => !m.temp).map(({ url, ...m }) => m)).catch(() => {});
  renderChat();
}

function renderChat() {
  const log = $('#chat-log');
  if (!state.chat.length) {
    log.innerHTML = `<li class="msg caos-msg"><span class="who">C.A.O.S.</span>Oi! Sou o C.A.O.S., a ${esc(IDENTIDADE.sigla)}. Pergunta sobre gastos, entradas, saldo, orçamento ou alertas, manda "gastei 30 no mercado" ou uma foto de comprovante. Se quiser saber mais de mim, pergunta "quem é você?".</li>`;
  } else {
    log.innerHTML = state.chat.map((m, i) => {
      if (m.de === 'eu') {
        return `<li class="msg eu">${m.url ? `<img src="${esc(m.url)}" alt="Foto enviada">` : ''}${esc(m.texto || '')}</li>`;
      }
      const acao = m.acao && !m.acaoFeita
        ? `<div class="acao"><button class="sim" data-acao="${i}" data-ok="1">✔ Confirmar</button><button class="nao" data-acao="${i}" data-ok="0">Cancelar</button></div>`
        : '';
      return `<li class="msg caos-msg ${m.temp ? 'pensando' : ''}"><span class="who"><span class="caos-face mini" data-msg="${i}" aria-hidden="true"></span>C.A.O.S.${m.ia ? ' · IA' : ''}</span>${esc(m.texto)}${acao}</li>`;
    }).join('');
    for (const el of log.querySelectorAll('[data-msg]')) {
      const r = state.chat[Number(el.dataset.msg)]?.rosto;
      if (r) setRosto(el, r); else el.remove();
    }
  }
  const ult = [...state.chat].reverse().find(m => m.de === 'caos');
  const sug = ult?.sugestoes?.length ? ult.sugestoes : SUGESTOES.slice(0, 6);
  $('#chat-suggestions').innerHTML = sug.map(s => `<button type="button" class="chip" data-sug="${esc(s)}">${esc(s)}</button>`).join('');
  if (!$('#tela-conversa').hidden) window.scrollTo(0, document.body.scrollHeight);
}

async function enviarPergunta(texto) {
  const t = String(texto || '').trim();
  if (!t) return;
  if (state.onboarding) return onboardingResposta(t);
  addMsg({ de: 'eu', texto: t });
  const { fala, memoria } = conversar(t, dados(), { mood: state.settings.mood, memory: state.caosMemory, now: Date.now(), perfil: state.perfil });
  guardarMemoria(memoria);
  pintarRosto(fala.rosto);

  if (!fala.entendeu && state.settings.aiOn && state.settings.aiUrl) {
    const pensando = rostoAvulso('pensando', { mood: state.settings.mood, memory: state.caosMemory });
    pintarRosto(pensando);
    addMsg({ de: 'caos', texto: 'Deixa eu pensar com a IA…', temp: true, rosto: pensando });
    try {
      const resposta = await ia.perguntar(state.settings.aiUrl, { pergunta: t, humor: state.settings.mood, dados: dados() });
      state.chat = state.chat.filter(m => !m.temp);
      addMsg({ de: 'caos', texto: resposta, ia: true, sugestoes: SUGESTOES.slice(0, 5), rosto: fala.rosto });
      pintarRosto(fala.rosto);
      if (state.settings.voice) falar(resposta);
      return;
    } catch (e) {
      state.chat = state.chat.filter(m => !m.temp);
      addMsg({ de: 'caos', texto: `${fala.texto} (A IA online não respondeu: ${e.message})`, sugestoes: fala.sugestoes, rosto: fala.rosto });
      pintarRosto(fala.rosto);
      return;
    }
  }
  addMsg({ de: 'caos', texto: fala.texto, sugestoes: fala.sugestoes, acao: fala.acao, rosto: fala.rosto });
  if (state.settings.voice) falar(fala.texto, fala.emocao);
  if (fala.filaIA) await perguntaPraDepois(fala.filaIA);
}

// ---------- "Amanhã eu trago": perguntas que precisam do servidor ----------

async function perguntaPraDepois(item) {
  const pronto = state.settings.aiOn && state.settings.aiUrl && navigator.onLine;
  if (pronto) {
    const pensando = rostoAvulso('pensando', { mood: state.settings.mood, memory: state.caosMemory });
    addMsg({ de: 'caos', texto: 'Vou buscar a comparação com a IA…', temp: true, rosto: pensando });
    try {
      const texto = await ia.perguntarBancos(state.settings.aiUrl, { bancos: item.bancos, cdi: state.mercado?.cdi?.valor });
      state.chat = state.chat.filter(m => !m.temp);
      addMsg({ de: 'caos', ia: true, texto });
      return;
    } catch {
      state.chat = state.chat.filter(m => !m.temp);
    }
  }
  const fila = (await db.getMeta('fila', [])).filter(x => x.tipo !== item.tipo);
  fila.push({ ...item, id: crypto.randomUUID?.() || String(Date.now()), criadoEm: Date.now() });
  await db.setMeta('fila', fila);
  addMsg({ de: 'caos', texto: 'Hoje eu não consigo trazer a comparação certinha, mas guardei sua pergunta. Assim que eu tiver conexão com o servidor da Carteira, eu trago a resposta aqui. 😉' });
}

/** Responde o que ficou na fila, quando o servidor estiver ao alcance; entrega na conversa e no balão. */
async function processarFila() {
  if (!(state.settings.aiOn && state.settings.aiUrl && navigator.onLine)) return;
  const fila = await db.getMeta('fila', []);
  if (!fila.length) return;
  const resta = [];
  for (const item of fila) {
    try {
      if (item.tipo !== 'bancos') continue;
      const texto = await ia.perguntarBancos(state.settings.aiUrl, { bancos: item.bancos, cdi: state.mercado?.cdi?.valor });
      addMsg({ de: 'caos', ia: true, texto: `Lembra que você perguntou qual banco rende mais? Trouxe: ${texto}` });
      $('#caos-line').textContent = 'Trouxe a resposta que eu fiquei devendo. Toca aqui pra ver.';
    } catch {
      resta.push(item);
    }
  }
  await db.setMeta('fila', resta);
}

async function confirmarAcao(i, ok) {
  const m = state.chat[i];
  if (!m?.acao || m.acaoFeita) return;
  m.acaoFeita = true;
  if (!ok) {
    addMsg({ de: 'caos', texto: 'Cancelado. Nada foi anotado.' });
    return;
  }
  try {
    const a = m.acao;
    if (a.tipo === 'mudar_apelido') {
      state.perfil = { ...(state.perfil || {}), apelido: a.apelido, nome: state.perfil?.nome || a.apelido };
      await db.setMeta('perfil', state.perfil);
      renderPerfil();
      addMsg({ de: 'caos', texto: `Fechado! A partir de agora te chamo de ${a.apelido}.` });
      return;
    }
    const events = a.tipo === 'registrar_entrada'
      ? await registrarEntrada({ amountCents: a.amountCents, sourceId: a.sourceId, note: a.note, date: a.date })
      : await registrarGasto({ amountCents: a.amountCents, categoryId: a.categoryId, note: a.note, date: a.date, imageId: a.imageId, compromissoId: a.compromissoId, accountId: a.accountId });
    if (a.compromissoId) renderMes();
    const fala = narrate(events, { ignoreCooldown: true });
    addMsg({ de: 'caos', texto: fala ? fala.texto : 'Anotado!', rosto: fala?.rosto });
    if (state.settings.voice && fala) falar(fala.texto, fala.emocao);
  } catch (e) {
    m.acaoFeita = false;
    addMsg({ de: 'caos', texto: `Não consegui anotar: ${e.message}` });
  }
}

async function fotoNoChat(arquivo) {
  try {
    const img = await imagens.guardar(arquivo, 'chat');
    addMsg({ de: 'eu', texto: '', url: URL.createObjectURL(img.blob), imagemId: img.id });
    if (!(state.settings.aiOn && state.settings.aiUrl)) {
      addMsg({ de: 'caos', texto: 'Guardei a foto. Pra eu ler o valor sozinho, ative a IA online em Ajustes. Ou me diz: "gastei 30 no mercado".' });
      return;
    }
    addMsg({ de: 'caos', texto: 'Lendo a foto com a IA…', temp: true });
    const r = await ia.lerImagem(state.settings.aiUrl, { base64: await imagens.paraBase64(img.blob), categorias: state.categories });
    state.chat = state.chat.filter(m => !m.temp);
    const cat = catById(r.categoria) || catById('outros');
    if (r.valor_centavos > 0) {
      addMsg({
        de: 'caos', ia: true,
        texto: `${r.resumo || 'Li o comprovante.'} Anotar ${formatBRL(r.valor_centavos)} em ${cat.name}${r.estabelecimento ? ` (${r.estabelecimento})` : ''}?${r.confianca === 'baixa' ? ' Li com pouca certeza, confere o valor.' : ''}`,
        acao: { tipo: 'registrar_gasto', amountCents: r.valor_centavos, categoryId: cat.id, date: /^\d{4}-\d{2}-\d{2}$/.test(r.data || '') ? r.data : toISODate(), note: (r.estabelecimento || '').slice(0, 120), imageId: img.id },
      });
    } else {
      addMsg({ de: 'caos', ia: true, texto: r.resumo || 'Não achei um valor nessa imagem.' });
    }
  } catch (e) {
    state.chat = state.chat.filter(m => !m.temp);
    addMsg({ de: 'caos', texto: e.message || 'Não consegui ler a foto.' });
  }
}

// ======================================================================
// Contas
// ======================================================================

function renderContas() {
  $('#bank-total').textContent = formatBRL(totalBalance(state.accounts, state.expenses, state.incomes));
  $('#account-list').innerHTML = state.accounts.map(a => {
    const bal = accountBalance(a, state.expenses, state.incomes);
    const desde = new Date(a.balanceAt).toLocaleDateString('pt-BR');
    return `
    <li>
      <div class="account-head"><strong>🏦 ${esc(accountLabel(a))}</strong><span class="num ${bal < 0 ? 'bad' : ''}">${formatBRL(bal)}</span></div>
      <small class="muted">Saldo informado ${formatBRL(a.balanceCents)} em ${desde}${bal !== a.balanceCents ? ', mais os lançamentos desde então' : ''}.</small>
      <div class="account-actions">
        <button class="ghost" data-acc-update="${esc(a.id)}">Atualizar saldo</button>
        <button class="ghost" data-acc-del="${esc(a.id)}">Remover</button>
      </div>
    </li>`;
  }).join('');
  if (!$('#bank-select').options.length) {
    $('#bank-select').innerHTML = BANKS.map(b => `<option>${esc(b)}</option>`).join('');
  }
}

async function onAddAccount(ev) {
  ev.preventDefault();
  const err = $('#account-error');
  err.hidden = true;
  try {
    const bal = parseSignedAmount($('#bank-balance').value);
    if (bal == null) throw new Error('Digite o saldo atual (pode ser 0).');
    const acc = createAccount({ bank: $('#bank-select').value, nickname: $('#bank-nick').value, balanceCents: bal });
    await db.put(db.STORES.accounts, acc);
    state.accounts.push(acc);
    $('#bank-nick').value = '';
    $('#bank-balance').value = '';
    renderContas();
    renderLancar();
    render();
    toast(`${accountLabel(acc)} adicionada.`);
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
}

async function onUpdateAccount(id) {
  const a = state.accounts.find(x => x.id === id);
  if (!a) return;
  const atual = accountBalance(a, state.expenses, state.incomes);
  const r = prompt(`Saldo atual de ${accountLabel(a)} (como está no app do banco):`, centsToInput(atual) || '0');
  if (r == null) return;
  const bal = parseSignedAmount(r);
  if (bal == null) return toast('Valor inválido.');
  const upd = { ...a, balanceCents: bal, balanceAt: Date.now() };
  await db.put(db.STORES.accounts, upd);
  state.accounts = state.accounts.map(x => (x.id === id ? upd : x));
  renderContas();
  render();
  toast('Saldo atualizado.');
}

async function onRemoveAccount(id) {
  const a = state.accounts.find(x => x.id === id);
  if (!a || !confirm(`Remover ${accountLabel(a)}? Os lançamentos continuam, só deixam de contar no saldo.`)) return;
  await db.remove(db.STORES.accounts, id);
  state.accounts = state.accounts.filter(x => x.id !== id);
  renderContas();
  renderLancar();
  render();
}

// ======================================================================
// Ajustes
// ======================================================================

function renderBudgets() {
  $('#budget-list').innerHTML = state.categories.map(c => `
    <li>
      <label for="b-${c.id}">${c.emoji} ${esc(c.name)}</label>
      <span class="amount small"><span>R$</span>
        <input id="b-${c.id}" data-budget="${c.id}" type="text" inputmode="decimal" placeholder="sem limite" value="${centsToInput(c.budgetCents)}">
      </span>
    </li>`).join('');
}

async function renderSettings() {
  prepararFormCompromisso();
  $('#mood-options').innerHTML = Object.entries(MOODS).map(([id, label]) => `
    <label><input type="radio" name="mood" value="${id}" ${state.settings.mood === id ? 'checked' : ''}><span>${label}</span></label>`).join('');
  $('#voice-toggle').checked = state.settings.voice;
  $('#voice-toggle').closest('label').hidden = !vozDisponivel();
  $('#caos-version').textContent = `${IDENTIDADE.nome} ${CAOS_VERSAO} · ${IDENTIDADE.sigla}. Criado por ${IDENTIDADE.criador}, veio do ${IDENTIDADE.origem}.`;
  $('#ai-toggle').checked = state.settings.aiOn;
  $('#ai-url').value = state.settings.aiUrl;
  $('#chat-mic').hidden = !ditadoDisponivel();
  const lem = await lembretes.config().catch(() => ({}));
  $('#remind-toggle').checked = !!lem.ativo;
  $('#remind-time').value = lem.hora || '20:30';
  $('#remind-status').textContent = lem.ativo ? lembretes.descreverModo(lem.modo) : 'Desligado.';
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
  input.value = centsToInput(cents);
  render();
  toast(cents ? `Orçamento de ${cat.name}: ${formatBRL(cents)}` : `${cat.name} sem limite.`);
}

const saveSettings = () => db.setMeta('settings', state.settings);

async function onRemindToggle(e) {
  const box = e.target;
  try {
    const c = box.checked
      ? await lembretes.ativar({ hora: $('#remind-time').value || '20:30', servidor: state.settings.aiOn ? state.settings.aiUrl : '' })
      : await lembretes.desativar({ servidor: state.settings.aiUrl });
    $('#remind-status').textContent = c.ativo ? lembretes.descreverModo(c.modo) : 'Desligado.';
  } catch (err) {
    box.checked = false;
    $('#remind-status').textContent = err.message;
  }
}

async function onRemindTime() {
  const c = await lembretes.config();
  if (!c.ativo) return db.setMeta('lembrete', { ...c, hora: $('#remind-time').value });
  // inscreve de novo com o horário novo
  try {
    const n = await lembretes.ativar({ hora: $('#remind-time').value, servidor: state.settings.aiOn ? state.settings.aiUrl : '' });
    $('#remind-status').textContent = lembretes.descreverModo(n.modo);
    toast(`Lembrete às ${n.hora}.`);
  } catch (err) {
    $('#remind-status').textContent = err.message;
  }
}

function exportBackup() {
  const data = {
    app: 'carteira-jf', version: 3, exportedAt: new Date().toISOString(),
    categories: state.categories, expenses: state.expenses, incomes: state.incomes, accounts: state.accounts,
    compromissos: state.compromissos, planos: state.planos, perfil: state.perfil,
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
    const okE = data.expenses.every(e => e && typeof e.id === 'string' && Number.isInteger(e.amountCents)
      && typeof e.date === 'string' && typeof e.month === 'string' && typeof e.categoryId === 'string');
    const incomes = Array.isArray(data.incomes) ? data.incomes : [];
    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    const okI = incomes.every(i => i && typeof i.id === 'string' && Number.isInteger(i.amountCents) && typeof i.month === 'string');
    const okA = accounts.every(a => a && typeof a.id === 'string' && Number.isInteger(a.balanceCents));
    const compromissos = Array.isArray(data.compromissos) ? data.compromissos : [];
    const planos = Array.isArray(data.planos) ? data.planos : [];
    const okC = compromissos.every(c => c && typeof c.id === 'string' && Number.isInteger(c.valorCents) && /^\d{4}-\d{2}$/.test(c.inicioMes) && Number.isInteger(c.cadaMeses));
    const okP = planos.every(p => p && typeof p.id === 'string' && Number.isInteger(p.valorCents) && typeof p.month === 'string');
    if (!okE || !okI || !okA || !okC || !okP) throw new Error('Backup com dados inválidos.');
    if (!confirm(`Substituir os dados atuais por ${data.expenses.length} gastos, ${incomes.length} entradas, ${accounts.length} contas e ${compromissos.length} compromissos do backup?`)) return;
    await db.replaceAll({ expenses: data.expenses, categories: data.categories, incomes, accounts, compromissos, planos });
    Object.assign(state, { expenses: data.expenses, categories: data.categories, incomes, accounts, compromissos, planos });
    if (data.perfil && typeof data.perfil === 'object') { state.perfil = data.perfil; await db.setMeta('perfil', data.perfil); renderPerfil(); }
    renderLancar();
    renderBudgets();
    render();
    toast('Backup restaurado.');
  } catch (e) {
    toast(e.message || 'Não deu para importar.');
  }
}

// ======================================================================
// Mês: compromissos e planejamento (1.3.0)
// ======================================================================

const nomeMes = k => cap(monthLabel(k));

function prepararFormCompromisso() {
  $('#comp-tipo').innerHTML = Object.entries(TIPOS_COMPROMISSO).map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join('');
  const hoje = monthKey(toISODate());
  $('#comp-inicio').innerHTML = [0, 1, 2, 3].map(i => {
    const k = shiftMonth(hoje, i);
    return `<option value="${k}">${i === 0 ? 'este mês' : i === 1 ? 'mês que vem' : nomeMes(k)}</option>`;
  }).join('');
  $('#comp-cat').innerHTML = state.categories.map(c => `<option value="${c.id}" ${c.id === 'contas' ? 'selected' : ''}>${c.emoji} ${esc(c.name)}</option>`).join('');
  $('#comp-conta-field').hidden = !state.accounts.length;
  $('#comp-conta').innerHTML = '<option value="">Sem conta</option>' + state.accounts.map(a => `<option value="${esc(a.id)}">${esc(accountLabel(a))}</option>`).join('');
}

function textoStatus(c) {
  if (!c.noMes) return `próxima vez: ${nomeMes(c.proximaVez).toLowerCase()}`;
  if (c.status === 'pago') return `✔ pago este mês (${formatBRL(c.pagoCents)})`;
  if (c.status === 'atrasado') return `⏰ venceu dia ${c.diaNoMes}`;
  if (c.status === 'pendente') return 'é deste mês';
  return c.diasParaVencer === 0 ? 'vence hoje' : c.diasParaVencer === 1 ? 'vence amanhã' : `vence dia ${c.diaNoMes} (em ${c.diasParaVencer} dias)`;
}

function renderMes() {
  const hoje = toISODate();
  const a = analisarPlanejamento(dados(), hoje);
  $('#mes-titulo').textContent = `Planejamento · ${nomeMes(a.month)}`;
  const el = $('#plan-sobra');
  if (a.sobraCents == null) {
    el.textContent = '—';
    el.className = 'big';
  } else {
    el.textContent = formatBRL(a.sobraCents);
    el.className = `big ${a.sobraCents < 0 ? 'bad' : 'ok'}`;
  }
  const linhas = [
    [a.baseTipo === 'orcamento' ? 'Orçamento do mês' : 'Entradas do mês', a.baseTipo ? formatBRL(a.baseCents) : 'lance suas entradas'],
    ['Já saiu', `− ${formatBRL(a.gastosCents)}`],
    ['Compromissos a pagar', `− ${formatBRL(a.compPendentesCents)}`],
    ['Planos a fazer', `− ${formatBRL(a.planosPendentesCents)}`],
  ];
  $('#plan-linhas').innerHTML = linhas.map(([k, v]) => `<li><span>${esc(k)}</span><span>${esc(v)}</span></li>`).join('');
  // a análise do C.A.O.S. (só leitura: não muda a memória dele)
  const { fala } = conversar('cabe no mês?', dados(), { mood: state.settings.mood, memory: state.caosMemory, perfil: state.perfil });
  $('#plan-caos').textContent = `🤖 ${fala.texto}`;

  const sit = situacaoCompromissos(state.compromissos, state.expenses, hoje);
  $('#comp-list').innerHTML = sit.length ? sit.map(c => {
    const cat = catById(c.categoryId);
    const rep = c.cadaMeses === 1 ? 'todo mês' : c.cadaMeses === 12 ? 'todo ano' : `a cada ${c.cadaMeses} meses`;
    return `
    <li class="${c.status}">
      <span class="comp-info"><span>${cat?.emoji ?? '📌'} ${esc(c.nome)}</span>
        <small>${esc(TIPOS_COMPROMISSO[c.tipo])} · ${rep}${c.dia ? ` · dia ${c.dia}` : ''} · ${esc(textoStatus(c))}</small></span>
      <span class="num">${formatBRL(c.valorCents)}</span>
      <span class="comp-acoes">
        ${c.noMes && c.status !== 'pago' ? `<button class="lancar" data-comp-lancar="${esc(c.id)}">Paguei · lançar</button>` : ''}
        <button data-comp-del="${esc(c.id)}">Remover</button>
      </span>
    </li>`;
  }).join('') : '<li class="muted">Nenhum compromisso ainda. Adicione contas fixas, faturas e assinaturas.</li>';

  $('#plan-list').innerHTML = a.planos.length ? a.planos.map(p => `
    <li class="${p.feito ? 'feito' : ''}">
      <label class="plan-info"><input type="checkbox" data-plan-feito="${esc(p.id)}" ${p.feito ? 'checked' : ''}><span>${esc(p.nome)}</span></label>
      <span class="num">${formatBRL(p.valorCents)} <button class="icon-btn del" data-plan-del="${esc(p.id)}" aria-label="Remover plano">×</button></span>
    </li>`).join('') : '<li class="muted">Nada planejado ainda. O que você quer comprar ou gastar este mês?</li>';
}

async function onAddCompromisso(ev) {
  ev.preventDefault();
  const err = $('#comp-error');
  err.hidden = true;
  try {
    const valor = $('#comp-valor').value.trim() ? parseAmount($('#comp-valor').value) : 0;
    if (valor == null) throw new Error('Valor inválido.');
    const c = createCompromisso({
      nome: $('#comp-nome').value, valorCents: valor, tipo: $('#comp-tipo').value, categoryId: $('#comp-cat').value,
      dia: $('#comp-dia').value || null, cadaMeses: Number($('#comp-cada').value), inicioMes: $('#comp-inicio').value,
      accountId: $('#comp-conta').value || null,
    }, { categories: state.categories });
    await db.put(db.STORES.compromissos, c);
    state.compromissos.push(c);
    $('#comp-form').reset();
    prepararFormCompromisso();
    renderMes();
    render();
    toast(`${c.nome} salvo. Eu lembro quando chegar a hora.`);
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
}

async function lancarCompromisso(id) {
  const c = state.compromissos.find(x => x.id === id);
  if (!c) return;
  let valor = c.valorCents;
  const r = prompt(`Quanto foi ${c.nome}? (confira o valor)`, (valor / 100).toFixed(2).replace('.', ','));
  if (r == null) return;
  valor = parseAmount(r);
  if (!valor) return toast('Valor inválido.');
  const events = await registrarGasto({ amountCents: valor, categoryId: c.categoryId, note: c.nome, date: toISODate(), accountId: c.accountId, compromissoId: c.id });
  const fala = narrate(events, { ignoreCooldown: true });
  renderMes();
  toast(fala ? fala.texto : `${c.nome} lançado.`);
}

async function removerCompromisso(id) {
  const c = state.compromissos.find(x => x.id === id);
  if (!c || !confirm(`Remover o compromisso ${c.nome}? Os lançamentos já feitos continuam.`)) return;
  await db.remove(db.STORES.compromissos, id);
  state.compromissos = state.compromissos.filter(x => x.id !== id);
  renderMes();
  render();
}

async function onAddPlano(ev) {
  ev.preventDefault();
  const err = $('#plan-error');
  err.hidden = true;
  try {
    const nome = $('#plan-nome').value;
    const sug = sugerirCategoria(nome, state.expenses);
    const p = createPlano({ nome, valorCents: parseAmount($('#plan-valor').value) || 0, categoryId: sug?.categoryId || 'outros' });
    await db.put(db.STORES.planos, p);
    state.planos.push(p);
    $('#plan-nome').value = '';
    $('#plan-valor').value = '';
    renderMes();
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
}

async function marcarPlano(id, feito) {
  const p = state.planos.find(x => x.id === id);
  if (!p) return;
  if (feito && confirm(`Lançar ${formatBRL(p.valorCents)} de ${p.nome} como gasto agora?`)) {
    const events = await registrarGasto({ amountCents: p.valorCents, categoryId: p.categoryId, note: p.nome, date: toISODate() });
    narrate(events);
  }
  const upd = { ...p, feito };
  await db.put(db.STORES.planos, upd);
  state.planos = state.planos.map(x => (x.id === id ? upd : x));
  renderMes();
}

async function removerPlano(id) {
  const p = state.planos.find(x => x.id === id);
  if (!p || !confirm(`Remover o plano ${p.nome}?`)) return;
  await db.remove(db.STORES.planos, id);
  state.planos = state.planos.filter(x => x.id !== id);
  renderMes();
}

// ======================================================================
// Primeiro acesso: o C.A.O.S. conhece a pessoa (1.3.0)
// ======================================================================

const FOCOS = ['Controlar o dia a dia', 'Sair do vermelho', 'Juntar dinheiro', 'Organizar contas e planos', 'Entender investimentos'];

function renderPerfil() {
  const p = state.perfil;
  $('#perfil-resumo').textContent = p?.apelido
    ? `O C.A.O.S. te chama de ${p.apelido}${p.nome && p.nome !== p.apelido ? ` (${p.nome})` : ''}, num jeito ${p.tratamento === 'formal' ? 'mais formal' : 'descontraído'}.${p.foco?.length ? ` Foco: ${p.foco.join(', ').toLowerCase()}.` : ''}`
    : 'O C.A.O.S. ainda não te conhece.';
}

function caosDiz(gatilho, vars, sugestoes) {
  const r = falaAvulsa(gatilho, vars, { mood: state.settings.mood, memory: state.caosMemory, perfil: state.perfil });
  guardarMemoria(r.memoria);
  const rosto = rostoAvulso(gatilho === 'onb_fim' ? 'identidade' : 'surpresa', { mood: state.settings.mood, memory: state.caosMemory });
  pintarRosto(rosto);
  addMsg({ de: 'caos', texto: r.texto, sugestoes, rosto });
  if (state.settings.voice) falar(r.texto);
}

function iniciarOnboarding() {
  state.onboarding = { passo: 'nome', dados: { foco: [] } };
  if (location.hash.slice(1) !== 'conversa') location.hash = 'conversa';
  caosDiz('onb_nome', {}, ['Pular por enquanto']);
}

function sugestoesFoco() {
  const f = state.onboarding.dados.foco;
  return [...FOCOS.map(x => (f.includes(x) ? `✓ ${x}` : x)), 'Pronto'];
}

async function onboardingResposta(t) {
  const o = state.onboarding;
  const d = o.dados;
  if (/^pular/i.test(t)) {
    addMsg({ de: 'eu', texto: t });
    state.perfil = { nome: null, apelido: null, tratamento: 'descontraido', foco: [], pulou: true, criadoEm: Date.now() };
    state.onboarding = null;
    await db.setMeta('perfil', state.perfil);
    renderPerfil();
    addMsg({ de: 'caos', texto: 'Sem problema! Quando quiser se apresentar, é só ir em Ajustes → Seu perfil. Bora cuidar da carteira?' });
    return;
  }
  if (o.passo === 'ajuda') {
    const limpo = t.replace(/^✓\s*/, '');
    if (/^pronto$/i.test(limpo)) {
      addMsg({ de: 'eu', texto: d.foco.length ? d.foco.join(', ') : 'Pronto' });
      state.perfil = { nome: d.nome, apelido: d.apelido, tratamento: d.tratamento, foco: d.foco, criadoEm: Date.now() };
      state.onboarding = null;
      await db.setMeta('perfil', state.perfil);
      renderPerfil();
      const foco = d.foco.length ? d.foco.join(', ').toLowerCase() : 'cuidar da carteira no dia a dia';
      caosDiz('onb_fim', { nome: d.apelido, foco }, SUGESTOES.slice(0, 6));
      return;
    }
    if (FOCOS.includes(limpo)) d.foco = d.foco.includes(limpo) ? d.foco.filter(x => x !== limpo) : [...d.foco, limpo];
    else if (limpo) d.foco = [...d.foco, limpo.slice(0, 40)];
    // atualiza só as opções (marca o que foi escolhido), sem nova fala
    const ult = [...state.chat].reverse().find(m => m.de === 'caos');
    if (ult) ult.sugestoes = sugestoesFoco();
    renderChat();
    return;
  }
  addMsg({ de: 'eu', texto: t });
  if (o.passo === 'nome') {
    const nome = extrairNome(t);
    if (!nome) return caosDiz('onb_nome', {}, ['Pular por enquanto']);
    d.nome = nome;
    o.passo = 'apelido';
    const primeiro = nome.split(' ')[0];
    caosDiz('onb_apelido', { nome: primeiro }, [...new Set([primeiro, nome])]);
  } else if (o.passo === 'apelido') {
    d.apelido = extrairNome(t) || d.nome.split(' ')[0];
    o.passo = 'tratamento';
    caosDiz('onb_tratamento', { nome: d.apelido }, ['Descontraído', 'Mais formal']);
  } else if (o.passo === 'tratamento') {
    d.tratamento = /formal/i.test(t) && !/descontra/i.test(t) ? 'formal' : 'descontraido';
    o.passo = 'ajuda';
    caosDiz('onb_ajuda', { nome: d.apelido }, sugestoesFoco());
  }
}

/** Lançar: o C.A.O.S. lembra a categoria pela descrição ("Uber" → Transporte). */
function sugerirPelaDescricao() {
  if (state.kind !== 'gasto') return;
  const aviso = $('#cat-sugestao');
  if (state.selectedCategory && !state.catSugerida) return;
  const s2 = sugerirCategoria($('#note').value, state.expenses);
  if (!s2) {
    if (state.catSugerida) { state.selectedCategory = null; state.catSugerida = false; renderLancar(); }
    aviso.hidden = true;
    return;
  }
  const cat = catById(s2.categoryId);
  if (!cat) return;
  state.selectedCategory = cat.id;
  state.catSugerida = true;
  renderLancar();
  aviso.textContent = `🤖 Lembrei: isso costuma ser ${cat.emoji} ${cat.name}. Se não for, é só tocar em outra.`;
  aviso.hidden = false;
}

/** Mercado: o servidor atualiza todo dia útil às 10h; o app baixa quando tem internet e guarda pra usar offline. */
async function atualizarMercado() {
  if (!state.settings.aiUrl || !navigator.onLine) return;
  try {
    const m = await ia.baixarMercado(state.settings.aiUrl);
    if (m?.atualizadoEm && m.atualizadoEm !== state.mercado?.atualizadoEm) {
      state.mercado = m;
      await db.setMeta('mercado', m);
    }
  } catch { /* sem servidor ou sem dado ainda: o C.A.O.S. usa o último guardado */ }
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 3200);
}

// ======================================================================
// Inicialização
// ======================================================================

function bind() {
  window.addEventListener('hashchange', () => irPara(location.hash.slice(1)));
  $('#caos').addEventListener('click', () => { location.hash = 'conversa'; });

  // Início
  $('#prev-month').addEventListener('click', () => { state.viewMonth = shiftMonth(state.viewMonth, -1); render(); });
  $('#next-month').addEventListener('click', () => { state.viewMonth = shiftMonth(state.viewMonth, 1); render(); });
  $('#exp-list').addEventListener('click', e => {
    const f = e.target.closest('[data-photo]');
    if (f) return verFoto(f.dataset.photo);
    const b = e.target.closest('[data-del]');
    if (b) onDelete(b.dataset.del, b.dataset.kind);
  });

  // Lançar
  $('#entry-form').addEventListener('submit', onSubmit);
  for (const r of document.querySelectorAll('input[name="kind"]')) {
    r.addEventListener('change', e => { state.kind = e.target.value; renderLancar(); });
  }
  $('#category-chips').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    if (state.kind === 'gasto') { state.selectedCategory = b.dataset.cat; state.catSugerida = false; $('#cat-sugestao').hidden = true; }
    else state.selectedSource = b.dataset.cat;
    renderLancar();
  });
  $('#photo-input').addEventListener('change', e => { const f = e.target.files?.[0]; if (f) onFoto(f); });
  $('#photo-remove').addEventListener('click', () => limparFoto({ apagar: true }));
  $('#photo-ai').addEventListener('click', lerFotoComIA);

  // Conversa
  $('#chat-form').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('#chat-input').value;
    $('#chat-input').value = '';
    enviarPergunta(v);
  });
  $('#chat-suggestions').addEventListener('click', e => {
    const b = e.target.closest('[data-sug]');
    if (b) enviarPergunta(b.dataset.sug);
  });
  $('#chat-log').addEventListener('click', e => {
    const b = e.target.closest('[data-acao]');
    if (b) confirmarAcao(Number(b.dataset.acao), b.dataset.ok === '1');
  });
  $('#chat-photo').addEventListener('change', e => { const f = e.target.files?.[0]; if (f) fotoNoChat(f); e.target.value = ''; });
  $('#chat-clear').addEventListener('click', async () => {
    for (const m of state.chat) if (m.imagemId && !state.expenses.some(x => x.imageId === m.imagemId)) await imagens.apagar(m.imagemId).catch(() => {});
    state.chat = [];
    db.setMeta('chat', []).catch(() => {});
    renderChat();
  });
  $('#chat-mic').addEventListener('click', async () => {
    const b = $('#chat-mic');
    b.classList.add('ouvindo');
    try {
      enviarPergunta(await ouvir());
    } catch (e) {
      toast(e.message);
    } finally {
      b.classList.remove('ouvindo');
    }
  });

  // Contas
  $('#account-form').addEventListener('submit', onAddAccount);
  $('#account-list').addEventListener('click', e => {
    const u = e.target.closest('[data-acc-update]');
    if (u) return onUpdateAccount(u.dataset.accUpdate);
    const d = e.target.closest('[data-acc-del]');
    if (d) onRemoveAccount(d.dataset.accDel);
  });

  // Ajustes
  $('#budget-list').addEventListener('change', e => { if (e.target.matches('[data-budget]')) onBudgetChange(e.target); });
  $('#mood-options').addEventListener('change', e => {
    state.settings.mood = e.target.value;
    saveSettings();
    const fala = narrate([{ type: 'boas_vindas' }], { ignoreCooldown: true });
    if (fala) toast(fala.texto);
  });
  $('#voice-toggle').addEventListener('change', e => {
    state.settings.voice = e.target.checked;
    saveSettings();
    if (e.target.checked) falar('Voz ativada. Agora eu falo.');
  });
  $('#remind-toggle').addEventListener('change', onRemindToggle);
  $('#remind-time').addEventListener('change', onRemindTime);
  $('#remind-test').addEventListener('click', async () => {
    try { await lembretes.testar(); } catch (e) { toast(e.message); }
  });
  $('#ai-toggle').addEventListener('change', e => {
    state.settings.aiOn = e.target.checked;
    saveSettings();
    mostrarFoto();
  });
  $('#ai-url').addEventListener('change', e => {
    state.settings.aiUrl = e.target.value.trim();
    saveSettings();
  });
  $('#ai-test').addEventListener('click', async () => {
    $('#ai-status').textContent = 'Testando…';
    try {
      const r = await ia.saude($('#ai-url').value.trim());
      $('#ai-status').textContent = `✔ Conectado.${r.ia ? '' : ' (IA sem chave configurada)'}${r.push ? '' : ' (lembretes sem chave)'}`;
    } catch (e) {
      $('#ai-status').textContent = `✖ ${e.message}`;
    }
  });
  // Mês
  $('#comp-form').addEventListener('submit', onAddCompromisso);
  $('#comp-list').addEventListener('click', e => {
    const l = e.target.closest('[data-comp-lancar]');
    if (l) return lancarCompromisso(l.dataset.compLancar);
    const d = e.target.closest('[data-comp-del]');
    if (d) removerCompromisso(d.dataset.compDel);
  });
  $('#plan-form').addEventListener('submit', onAddPlano);
  $('#plan-list').addEventListener('change', e => {
    const c = e.target.closest('[data-plan-feito]');
    if (c) marcarPlano(c.dataset.planFeito, c.checked);
  });
  $('#plan-list').addEventListener('click', e => {
    const d = e.target.closest('[data-plan-del]');
    if (d) removerPlano(d.dataset.planDel);
  });
  $('#perfil-refazer').addEventListener('click', () => iniciarOnboarding());
  $('#note').addEventListener('input', sugerirPelaDescricao);

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
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    ? 'Para instalar: Compartilhar → Adicionar à Tela de Início. Instalado, o iPhone guarda os dados com mais segurança e libera os lembretes.'
    : 'Para instalar: menu do navegador → Instalar app / Adicionar à tela inicial.';
}

/** Fotos de comprovante que ficaram órfãs (anexadas e nunca salvas) há mais de 1 dia. */
async function limparFotosOrfas() {
  try {
    const usadas = new Set(state.expenses.map(e => e.imageId).filter(Boolean));
    for (const m of state.chat) if (m.imagemId) usadas.add(m.imagemId);
    const todas = await db.getAll(db.STORES.images);
    for (const img of todas) {
      if (!usadas.has(img.id) && Date.now() - img.createdAt > 86_400_000) await db.remove(db.STORES.images, img.id);
    }
  } catch {}
}

async function init() {
  bind();
  $('#date').value = toISODate();
  try {
    const [cats, expenses, incomes, accounts, settings, memory, chat, compromissos, planos, perfil] = await Promise.all([
      db.getAll(db.STORES.categories),
      db.getAll(db.STORES.expenses),
      db.getAll(db.STORES.incomes),
      db.getAll(db.STORES.accounts),
      db.getMeta('settings'),
      db.getMeta('caosMemory'),
      db.getMeta('chat', []),
      db.getAll(db.STORES.compromissos),
      db.getAll(db.STORES.planos),
      db.getMeta('perfil'),
    ]);
    Object.assign(state, { compromissos, planos, perfil: perfil || null, mercado: await db.getMeta('mercado') });
    if (cats.length === 0) {
      state.categories = DEFAULT_CATEGORIES.map(c => ({ ...c }));
      await db.putMany(db.STORES.categories, state.categories);
    } else {
      const order = DEFAULT_CATEGORIES.map(c => c.id);
      state.categories = cats.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }
    Object.assign(state, { expenses, incomes, accounts: accounts.sort((a, b) => a.createdAt - b.createdAt) });
    if (settings) state.settings = { ...state.settings, ...settings };
    if (memory) state.caosMemory = memory;
    // fotos da conversa antiga não voltam (o link da imagem é da sessão); o texto volta
    state.chat = Array.isArray(chat) ? chat.map(m => ({ ...m, texto: m.texto || (m.imagemId ? '📷 (foto)' : '') })) : [];
  } catch (e) {
    console.error(e);
    toast('Não consegui abrir o banco local. Os dados não serão salvos.');
  }

  renderLancar();
  renderBudgets();
  await renderSettings();
  renderPerfil();
  render();
  irPara(location.hash.slice(1));
  // Primeiro acesso: o C.A.O.S. se apresenta e conhece a pessoa
  if (!state.perfil) iniciarOnboarding();
  $('#install-hint').textContent = installHint();

  const today = toISODate();
  const closing = detectMonthClose({ expenses: state.expenses, categories: state.categories, currentMonth: monthKey(today) });
  // ao abrir, o C.A.O.S. olha o radar: o alerta mais grave entra na fila junto com as boas-vindas
  const radar = analyze(dados(), today).slice(0, 1).map(a => ({ ...a, radar: true }));
  narrate([...closing, ...radar, { type: 'boas_vindas' }]);
  if ($('#caos-line').textContent === 'Iniciando…') $('#caos-line').textContent = 'De olho nos seus gastos. Toque aqui pra conversar.';
  pintarOlho();

  db.requestPersistence();
  limparFotosOrfas();
  atualizarMercado().then(processarFila);
  window.addEventListener('online', () => atualizarMercado().then(processarFila));
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW não registrado', err));
  }
}

init();
