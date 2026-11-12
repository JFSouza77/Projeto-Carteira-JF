// UI: liga a tela ao motor, à persistência e ao narrador.
// Só este arquivo (via db.js) grava dados. O C.A.O.S. só sugere; quem confirma é a pessoa.

import * as db from './db.js';
import {
  DEFAULT_CATEGORIES, INCOME_SOURCES, BANKS, formatBRL, parseAmount, parseSignedAmount, toISODate, monthKey,
  shiftMonth, monthLabel, createExpense, createIncome, createAccount, summarizeMonth, detectExpenseEvents,
  detectMonthClose, incomeIn, accountBalance, accountLabel, totalBalance, analyze,
  TIPOS_COMPROMISSO, createCompromisso, situacaoCompromissos, createPlano, analisarPlanejamento, sugerirCategoria, validarBackup, lerAniversario, idadeDe, ehAniversario, createCartao, faturaDoCartao, createMeta, progressoMeta, guardarNaMeta, lerMesAlvo,
  TIPOS_INVESTIMENTO, createInvestimento, atualizarInvestimento, resumoInvestimentos,
  valorProprio, dividirIgual, juntarNomes, TIPOS_CONTA, FORMAS_PAGAMENTO, agruparPorBanco, comReforco, aReceber, marcarRecebido, ofensiva, MARCOS_OFENSIVA,
} from './engine.js';
import { reagir, conversar, falaAvulsa, MOODS, DEFAULT_MOOD, CAOS_VERSAO, SUGESTOES, IDENTIDADE, memoriaInicial, emocaoDoMomento, rostoAvulso, nomeAlerta } from './caos/index.js';
import { extrairNome, textoMeta } from './caos/conversa.js';
import { NOVIDADES, VERSAO_APP, temNovidade, partesDoItem } from './novidades.js';
import { falar, vozDisponivel, ditadoDisponivel, ouvir, setVelocidade } from './voz.js';
import * as imagens from './imagens.js';
import * as ia from './ia.js';
import * as lembretes from './notificacoes.js';
import * as conta from './conta.js';

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
const centsToInput = c => (c ? (c / 100).toFixed(2).replace('.', ',') : '');

const state = {
  categories: [],
  expenses: [],
  incomes: [],
  accounts: [],
  settings: { mood: DEFAULT_MOOD, voice: false, aiOn: false, aiUrl: '', letra: 'normal', tema: 'auto', vozVel: 1, menosMov: null },
  caosMemory: memoriaInicial(),
  viewMonth: monthKey(toISODate()),
  kind: 'gasto',
  selectedCategory: null,
  forma: null, // pagou como (P8): dinheiro, pix, debito, credito
  selectedSource: null,
  photo: null, // { id, url } da foto anexada no formulário
  chat: [],
  compromissos: [],
  planos: [],
  perfil: null, // { nome, apelido, tratamento, foco[] } (primeiro acesso)
  metas: [], // meta/metas (1.8.0)
  investimentos: [], // meta/investimentos (app 1.8)
  metaFlow: null, // perguntas da meta nova em andamento
  onboarding: null, // { passo, dados } enquanto o C.A.O.S. está conhecendo a pessoa
  catSugerida: false,
  mercado: null, // resumo do mercado vindo do servidor (guardado pra usar offline)
};

const dados = () => ({
  expenses: state.expenses, incomes: state.incomes, categories: state.categories, accounts: state.accounts,
  compromissos: state.compromissos, planos: state.planos, mercado: state.mercado, metas: state.metas, investimentos: state.investimentos,
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
const MOV_APARELHO = matchMedia('(prefers-reduced-motion: reduce)');
// "Menos movimento": o que a pessoa escolheu em Ajustes; se nunca escolheu, segue o aparelho
const MENOS_MOVIMENTO = { get matches() { return state.settings.menosMov ?? MOV_APARELHO.matches; } };

/** Aplica letra, cores, velocidade da voz e menos movimento (Ajustes → Acessibilidade). */
function aplicarAcessibilidade() {
  const s = state.settings;
  const raiz = document.documentElement;
  raiz.dataset.letra = ['grande', 'maior'].includes(s.letra) ? s.letra : 'normal';
  if (s.tema === 'claro' || s.tema === 'escuro') raiz.dataset.theme = s.tema; else delete raiz.dataset.theme;
  raiz.classList.toggle('menos-mov', MENOS_MOVIMENTO.matches);
  setVelocidade(s.vozVel ?? 1);
}
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
// Ordem da barra de baixo (12/11: o Lançar, ação mais usada, fica no meio, grande). Arrastar pro lado anda nessa ordem; Ajustes fica fora (é a engrenagem).
// barra de baixo (JF, 12/11): C.A.O.S., Contas, Lançar (meio), Mês, Início por último
const ORDEM_ABAS = ['conversa', 'contas', 'lancar', 'mes', 'inicio'];
let telaAtual = 'inicio';

function irPara(tela, { lado = null } = {}) {
  const t = TELAS.includes(tela) ? tela : 'inicio';
  const de = ORDEM_ABAS.indexOf(telaAtual), para = ORDEM_ABAS.indexOf(t);
  if (!lado && de >= 0 && para >= 0 && de !== para) lado = para > de ? 'dir' : 'esq';
  telaAtual = t;
  for (const el of document.querySelectorAll('.tela')) {
    el.hidden = el.dataset.tela !== t;
    el.classList.remove('entra-dir', 'entra-esq');
    if (!el.hidden && lado) { void el.offsetWidth; el.classList.add(lado === 'dir' ? 'entra-dir' : 'entra-esq'); }
  }
  for (const a of document.querySelectorAll('.tabbar a')) {
    if (a.dataset.tab === t) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  $('#me-ajuda').hidden = t === 'conversa';
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

// Ícones de traço no lugar dos emojis (JF, 12/11: "mais limpo"). Os símbolos ficam no <svg> do index.html.
const ic = id => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
const CAT_COM_ICONE = new Set(['mercado', 'delivery', 'restaurante', 'transporte', 'moradia', 'contas', 'saude', 'lazer', 'streaming', 'compras', 'outros']);
const FONTE_COM_ICONE = new Set(['salario', 'freela', 'rendimento', 'presente', 'outros']);
/** Ícone da categoria: as que vêm com o app têm desenho próprio; a criada pela pessoa mantém o emoji dela. */
const icCat = c => (c && CAT_COM_ICONE.has(c.id) ? ic(`c-${c.id}`) : esc(c?.emoji ?? '') || ic('c-outros'));
const icFonte = f => (f && FONTE_COM_ICONE.has(f.id) ? ic(`e-${f.id}`) : ic('e-outros'));
const ICONE_FORMA = { dinheiro: 'f-dinheiro', pix: 'f-pix', debito: 'a-cartao', credito: 'a-cartao' };

const ICONE_ALERTA = {
  categoria_estourada: 'i-alerta', orcamento_80: 'i-alerta', ritmo_alto: 'e-rendimento', mes_negativo: 'i-alerta', conta_negativa: 'i-contas',
  delivery_repetido: 'c-delivery', sem_registro: 'i-relogio', compromisso_vence: 'i-mes', compromisso_atrasado: 'i-relogio', plano_do_mes: 'i-mes',
  confira_banco: 'i-lupa', cartao_limite: 'a-cartao', cartao_vence: 'a-cartao', a_receber: 'i-recibo',
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

  renderOfensiva();
  renderAReceber();

  // Alertas (só no mês atual)
  const alertas = isCurrent ? analyze(dados()) : [];
  $('#alerts-card').hidden = !alertas.length;
  $('#alert-list').innerHTML = alertas.map(a => `
    <li class="${a.severity}">${ic(ICONE_ALERTA[a.type] || 'i-alerta')}<span>${esc(cap(nomeAlerta(a)))}</span></li>`).join('');

  const rows = s.rows.filter(r => r.spentCents > 0 || r.budgetCents > 0).sort((a, b) => b.spentCents - a.spentCents);
  $('#cat-list').innerHTML = rows.length ? rows.map(r => `
    <li>
      <div class="cat-head">
        <span>${icCat(r)} ${esc(r.name)}</span>
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
        <span class="exp-emoji" aria-hidden="true">${icFonte(s2)}</span>
        <span class="exp-main"><span>${esc(x.note || s2?.name || 'Entrada')}</span>
          <small>${d}/${m} · entrada${conta ? ` · ${esc(accountLabel(conta))}` : ''}</small></span>
        <span class="num">+${formatBRL(x.amountCents)}</span>
        <button class="icon-btn del" data-del="${esc(x.id)}" data-kind="entrada" aria-label="Apagar entrada">×</button>
      </li>`;
    }
    const c = catById(x.categoryId);
    return `
    <li>
      <span class="exp-emoji" aria-hidden="true">${icCat(c)}</span>
      <span class="exp-main"><span>${esc(x.note || c?.name || x.categoryId)}</span>
        <small>${d}/${m}${x.note && c ? ` · ${esc(c.name)}` : ''}${conta ? ` · ${esc(accountLabel(conta))}` : ''}${x.forma && !conta ? ` · ${esc(FORMAS_PAGAMENTO[x.forma].slice(2).trim())}` : ''}${x.parcelas > 1 ? ` · ${x.parcelas}x de ${formatBRL(Math.floor(x.amountCents / x.parcelas))}` : ''}
        ${x.imageId ? `<button class="thumb-btn" data-photo="${esc(x.imageId)}" aria-label="Ver foto">${ic('i-foto')}</button>` : ''}</small></span>
      <span class="num">${x.racha ? `<span title="Sua parte">${formatBRL(valorProprio(x))}</span><small class="racha-tag">${ic('i-dividir')} de ${formatBRL(x.amountCents)}</small>` : formatBRL(x.amountCents)}</span>
      <button class="icon-btn del" data-del="${esc(x.id)}" data-kind="gasto" aria-label="Apagar gasto">×</button>
    </li>`;
  }).join('');
}

// ---------- Arrastar pro lado troca de aba (JF, 07/11) ----------
let ladoPendente = null;
const NAO_ARRASTA = 'input, textarea, select, dialog, .chips.scroll, .chat-bar, [data-sem-arrastar]';

function ligarArrastar() {
  let ini = null;
  document.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || document.querySelector('dialog[open]')) { ini = null; return; }
    const t = e.touches[0];
    // perto da borda é o gesto de "voltar" do iPhone/Android: não mexe
    if (t.clientX < 24 || t.clientX > window.innerWidth - 24 || e.target.closest(NAO_ARRASTA)) { ini = null; return; }
    ini = { x: t.clientX, y: t.clientY, em: Date.now() };
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!ini) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - ini.x, dy = t.clientY - ini.y, rapido = Date.now() - ini.em < 700;
    ini = null;
    if (!rapido || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
    const i = ORDEM_ABAS.indexOf(telaAtual);
    if (i < 0) return; // em Ajustes, arrastar não faz nada (volta pela seta ou pela barra)
    const j = dx < 0 ? i + 1 : i - 1; // dedo pra esquerda = próxima aba (a da direita na barra)
    if (j < 0 || j >= ORDEM_ABAS.length) return;
    ladoPendente = dx < 0 ? 'dir' : 'esq';
    location.hash = ORDEM_ABAS[j];
    setTimeout(() => { ladoPendente = null; }, 0);
  }, { passive: true });
}

// ---------- Ofensiva e A receber (07/11) ----------

function ofensivaAgora() {
  return ofensiva({ expenses: state.expenses, incomes: state.incomes, diasSemGasto: state.perfil?.diasSemGasto || [] }, toISODate());
}

function renderOfensiva() {
  const o = ofensivaAgora();
  const dia = n => `${n} ${n === 1 ? 'dia seguido' : 'dias seguidos'}`;
  $('#ofensiva-card').classList.toggle('apagada', !o.dias);
  $('#ofensiva-dias').textContent = o.dias ? dia(o.dias) : 'Ofensiva zerada';
  $('#ofensiva-sub').textContent = o.dias
    ? (o.hojeFeito ? `Hoje já está garantido. Recorde: ${o.recorde}.` : 'Anote hoje pra não perder o foguinho!')
    : (o.recorde ? `Seu recorde é ${o.recorde}. Anote hoje pra recomeçar.` : 'Anote um gasto hoje pra acender o foguinho.');
  $('#sem-gasto').hidden = o.hojeFeito;
}

/** Se o lançamento de agora acendeu o dia e bateu um marco (3, 7, 14, 30…), o C.A.O.S. comemora. */
function eventoOfensiva(antes) {
  const depois = ofensivaAgora();
  if (!antes.hojeFeito && depois.hojeFeito && MARCOS_OFENSIVA.includes(depois.dias)) return [{ type: 'ofensiva_marco', days: depois.dias }];
  return [];
}

async function hojeNaoGastei() {
  const antes = ofensivaAgora();
  const hoje = toISODate();
  const dias = [...new Set([...(state.perfil?.diasSemGasto || []), hoje])].sort().slice(-400);
  state.perfil = { ...(state.perfil || {}), diasSemGasto: dias };
  await db.setMeta('perfil', state.perfil);
  render();
  const fala = narrate(eventoOfensiva(antes));
  toast(fala ? fala.texto : 'Anotado: hoje sem gastos. O foguinho continua aceso.');
}

function renderAReceber() {
  const r = aReceber(state.expenses);
  $('#receber-card').hidden = !r.itens.length;
  if (!r.itens.length) return;
  $('#receber-total').textContent = `· ${formatBRL(r.totalCents)}`;
  $('#receber-list').innerHTML = r.itens.map(x => {
    const [, m, d] = x.date.split('-');
    return `<li><span class="exp-main"><span>${esc(x.nome)}</span><small>${d}/${m}${x.note ? ` · ${esc(x.note)}` : ''}</small></span>
      <span class="num">${formatBRL(x.valorCents)}</span>
      <button type="button" class="ghost small" data-recebi="${esc(x.expenseId)}" data-pessoa="${esc(x.pessoaId)}" aria-label="Recebi de ${esc(x.nome)}">✓ Recebi</button></li>`;
  }).join('');
}

async function recebi(expenseId, pessoaId) {
  const e = state.expenses.find(x => x.id === expenseId);
  if (!e) return;
  const novo = marcarRecebido(e, pessoaId);
  await db.put(db.STORES.expenses, novo);
  state.expenses = state.expenses.map(x => (x.id === expenseId ? novo : x));
  const p = novo.racha.find(x => x.id === pessoaId);
  const conta = e.accountId && state.accounts.find(a => a.id === e.accountId && a.tipo !== 'cartao');
  render();
  toast(`Recebido: ${formatBRL(p.valorCents)} de ${p.nome}.${conta ? ` Voltou pro saldo de ${accountLabel(conta)}.` : ''}`);
}

function nomesDoRacha() {
  return $('#racha-nomes').value.split(/[,;\n]| e /).map(n => n.trim()).filter(Boolean);
}

function previaRacha() {
  const nomes = nomesDoRacha();
  const total = parseAmount($('#amount').value);
  if (!nomes.length || !total) { $('#racha-previa').textContent = 'Digite o valor total que você pagou e os nomes. A conta é dividida por igual.'; return; }
  try {
    const partes = dividirIgual(total, nomes);
    const minha = total - partes.reduce((t, p) => t + p.valorCents, 0);
    $('#racha-previa').textContent = `${partes.length + 1} pessoas: cada amigo te paga ${formatBRL(partes[0].valorCents)}. No seu orçamento entra só a sua parte, ${formatBRL(minha)}.`;
  } catch (er) {
    $('#racha-previa').textContent = er.message;
  }
}

// ======================================================================
// Lançar (gasto ou entrada)
// ======================================================================

function renderLancar() {
  const gasto = state.kind === 'gasto';
  const opcoes = gasto ? state.categories : INCOME_SOURCES;
  const sel = gasto ? state.selectedCategory : state.selectedSource;
  $('#category-chips').setAttribute('aria-label', gasto ? 'Categoria' : 'De onde veio');
  $('#racha-box').hidden = !gasto;
  $('#category-chips').innerHTML = opcoes.map(c => `
    <button type="button" class="chip" role="radio" aria-checked="${c.id === sel}" data-cat="${esc(c.id)}">${gasto ? icCat(c) : icFonte(c)} ${esc(c.name)}</button>`).join('');
  $('#submit-btn').textContent = gasto ? 'Adicionar gasto' : 'Adicionar entrada';
  // Pagou como? (P8): a forma escolhe que contas aparecem e o que mais perguntar
  const forma = gasto ? state.forma : null;
  $('#forma-field').hidden = !gasto;
  $('#forma-chips').innerHTML = Object.entries(FORMAS_PAGAMENTO).map(([id, nome]) =>
    `<button type="button" class="chip" role="radio" aria-checked="${id === forma}" data-forma="${id}">${ic(ICONE_FORMA[id])} ${esc(nome.replace(/^\S+\s/, ''))}</button>`).join('');
  const filtro = !gasto ? a => a.tipo !== 'cartao' // entrada não cai no cartão de crédito
    : forma === 'credito' ? a => a.tipo === 'cartao'
    : forma ? a => a.tipo !== 'cartao' : () => true;
  const cabem = state.accounts.filter(filtro);
  $('#account-field').hidden = cabem.length === 0;
  $('#account-label').textContent = forma === 'credito' ? 'Qual cartão?' : forma === 'pix' || forma === 'debito' ? 'De qual banco saiu?'
    : forma === 'dinheiro' ? 'Saiu de onde? (se quiser)' : 'Conta';
  const atual = $('#account-select').value;
  $('#account-select').innerHTML = opcoesDeConta(filtro);
  if (cabem.some(a => a.id === atual)) $('#account-select').value = atual;
  else if (forma === 'credito' && cabem.length === 1) $('#account-select').value = cabem[0].id;
  $('#parcelas-box').hidden = forma !== 'credito';
  if (!$('#parcelas-select').options.length) {
    $('#parcelas-select').innerHTML = '<option value="1">À vista (1x)</option>' +
      Array.from({ length: 23 }, (_, i) => `<option value="${i + 2}">Parcelado em ${i + 2}x</option>`).join('');
  }
  previaParcelas();
  $('#photo-ai').hidden = !(state.photo && state.settings.aiOn);
}

function previaParcelas() {
  const n = Number($('#parcelas-select').value) || 1;
  $('#limite-modo-field').hidden = n < 2;
  const v = parseAmount($('#amount').value);
  if (n < 2 || !v) { $('#parcelas-previa').textContent = ''; return; }
  const parcela = Math.floor(v / n);
  const total = document.querySelector('input[name="limite-modo"]:checked')?.value !== 'parcela';
  $('#parcelas-previa').textContent = `${n}x de ${formatBRL(parcela)}. ` + (total
    ? `Agora o limite fica ${formatBRL(v)} menor e volta ${formatBRL(parcela)} a cada fatura paga.`
    : `Só ${formatBRL(parcela)} por mês ocupa o limite.`);
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
async function registrarGasto({ amountCents, categoryId, note, date, accountId, imageId, compromissoId, rachaNomes = null, forma = null, parcelas = 1, limiteModo = 'total' }) {
  const ofAntes = ofensivaAgora();
  // escolheu um cartão sem dizer a forma: é crédito
  if (!forma && accountId && state.accounts.find(a => a.id === accountId)?.tipo === 'cartao') forma = 'credito';
  const expense = createExpense({ amountCents, categoryId, note, date, accountId, imageId, compromissoId, forma, parcelas, limiteModo }, { categories: state.categories });
  if (rachaNomes?.length) expense.racha = dividirIgual(amountCents, rachaNomes);
  const conta = accountId && state.accounts.find(a => a.id === accountId);
  const cartao = conta?.tipo === 'cartao';
  const antes = conta ? (cartao ? faturaDoCartao(comReforco(conta, state.accounts, state.expenses, state.incomes), state.expenses, toISODate()).pct : accountBalance(conta, state.expenses, state.incomes)) : null;
  await db.put(db.STORES.expenses, expense);
  state.expenses.push(expense);
  const events = detectExpenseEvents({ expenses: state.expenses, categories: state.categories, newExpense: expense });
  if (conta && cartao) {
    // passou de 80% ou de 100% do limite com esta compra: o C.A.O.S. avisa na hora
    const f = faturaDoCartao(comReforco(conta, state.accounts, state.expenses, state.incomes), state.expenses, toISODate());
    if ((antes < 80 && f.pct >= 80) || (antes < 100 && f.pct >= 100)) {
      events.push({ type: 'cartao_limite', accountName: f.nome, pct: f.pct, amountCents: f.usadoCents, leftCents: f.disponivelCents, budgetCents: f.limiteCents });
    }
  } else if (conta) {
    const depois = accountBalance(conta, state.expenses, state.incomes);
    if (antes >= 0 && depois < 0) events.push({ type: 'conta_negativa', accountName: accountLabel(conta), balanceCents: depois });
  }
  if (expense.racha) {
    const nomes = expense.racha.map(p => p.nome);
    events.push({ type: 'racha_cadastrada', amountCents: valorProprio(expense), totalCents: expense.amountCents - valorProprio(expense), count: nomes.length,
      quem: juntarNomes(nomes) });
  }
  events.push(...eventoOfensiva(ofAntes));
  state.viewMonth = expense.month;
  render();
  return events;
}

async function registrarEntrada({ amountCents, sourceId, note, date, accountId }) {
  const ofAntes = ofensivaAgora();
  const income = createIncome({ amountCents, sourceId, note, date, accountId });
  await db.put(db.STORES.incomes, income);
  state.incomes.push(income);
  state.viewMonth = income.month;
  render();
  return [{ type: 'entrada_cadastrada', amountCents, sourceId }, ...eventoOfensiva(ofAntes)];
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
      const rachaNomes = $('#racha-box').open ? nomesDoRacha() : null;
      if ($('#racha-box').open && !rachaNomes.length) throw new Error('Escreva o nome de quem vai te pagar, ou feche o "Dividir com amigos".');
      const forma = state.forma;
      const parcelas = forma === 'credito' ? Number($('#parcelas-select').value) || 1 : 1;
      const limiteModo = document.querySelector('input[name="limite-modo"]:checked')?.value || 'total';
      if (forma === 'credito' && !base.accountId && state.accounts.some(a => a.tipo === 'cartao')) throw new Error('Qual cartão? Escolha ali em cima.');
      events = await registrarGasto({ ...base, categoryId: state.selectedCategory, imageId: state.photo?.id, rachaNomes, forma, parcelas, limiteModo });
      $('#parcelas-select').value = '1';
      await limparFoto({ apagar: false });
      $('#racha-nomes').value = '';
      $('#racha-box').open = false;
      previaRacha();
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
    btn.textContent = 'Lendo…';
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
    btn.innerHTML = `${ic('i-ia')} Ler com IA`;
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
    log.innerHTML = `<li class="msg caos-msg"><span class="who">C.A.O.S.</span>Oi! Sou o C.A.O.S., a ${esc(IDENTIDADE.sigla)}: ${esc(IDENTIDADE.slogan.charAt(0).toLowerCase() + IDENTIDADE.slogan.slice(1))} Pergunta sobre gastos, entradas, saldo, orçamento ou alertas, manda "gastei 30 no mercado" ou uma foto de comprovante. Se quiser saber mais de mim, pergunta "quem é você?".</li>`;
  } else {
    log.innerHTML = state.chat.map((m, i) => {
      if (m.de === 'eu') {
        return `<li class="msg eu">${m.url ? `<img src="${esc(m.url)}" alt="Foto enviada">` : ''}${esc(m.texto || '')}</li>`;
      }
      const acao = m.acao && !m.acaoFeita
        ? `<div class="acao"><button class="sim" data-acao="${i}" data-ok="1">${ic('i-ok')} Confirmar</button><button class="nao" data-acao="${i}" data-ok="0">Cancelar</button></div>`
        : '';
      if (m.digitando) return `<li class="msg caos-msg pensando digitando" aria-label="C.A.O.S. está digitando"><span class="who" aria-label="C.A.O.S."><span class="caos-face mini" data-msg="${i}" aria-hidden="true"></span></span><span class="pontos" aria-hidden="true"><i></i><i></i><i></i></span> digitando</li>`;
      return `<li class="msg caos-msg ${m.temp ? 'pensando' : ''}"><span class="who" aria-label="C.A.O.S.${m.ia ? ' com IA' : ''}"><span class="caos-face mini" data-msg="${i}" aria-hidden="true"></span>${m.ia ? '<span class="tag-ia">IA</span>' : ''}</span>${esc(m.texto)}${acao}</li>`;
    }).join('');
    for (const el of log.querySelectorAll('[data-msg]')) {
      const r = state.chat[Number(el.dataset.msg)]?.rosto;
      if (r) setRosto(el, r); else el.replaceWith(Object.assign(document.createElement('span'), { className: 'nome-caos', textContent: 'C.A.O.S.' }));
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
  if (state.metaFlow) return metaResposta(t);
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
      const guardou = fala.palpite ? false : await guardarPergunta(t);
      addMsg({ de: 'caos', texto: `${fala.texto}${guardou ? ' A IA online não respondeu agora, mas guardei sua pergunta e trago a resposta depois.' : ` (A IA online não respondeu: ${e.message})`}`, sugestoes: fala.sugestoes, rosto: fala.rosto });
      pintarRosto(fala.rosto);
      return;
    }
  }
  if (!fala.entendeu && !fala.palpite && await guardarPergunta(t)) {
    // Fila geral (1.6.0): o que ele não sabe vai pro servidor quando der; a resposta volta na conversa.
    fala.texto = 'Ainda não sei responder isso, mas guardei sua pergunta. Quando eu tiver conexão com o servidor do C.A.O.S. Finanças, eu trago a resposta aqui.';
  }
  await respiro(fala.texto);
  addMsg({ de: 'caos', texto: fala.texto, sugestoes: fala.sugestoes, acao: fala.acao, rosto: fala.rosto });
  pintarRosto(fala.rosto);
  if (state.settings.voice) falar(fala.texto, fala.emocao);
  if (fala.filaIA) await perguntaPraDepois(fala.filaIA);
  if (fala.fluxoMeta) iniciarMeta(fala.fluxoMeta.nome, { jaFalou: true });
  if (fala.modoFoto) state.modoFoto = { tipo: fala.modoFoto, duvida: t, ate: Date.now() + 10 * 60_000 };
}

// ---------- Metas montadas junto (1.8.0) ----------
// O C.A.O.S. pergunta (pra quê, quanto, quanto já tem, até quando) e PROPÕE; a meta só é gravada no Confirmar (1ª lei).

function iniciarMeta(nome = null, { jaFalou = false } = {}) {
  state.metaFlow = { passo: nome ? 'quanto' : 'pra_que', dados: { nome } };
  if (location.hash.slice(1) !== 'conversa') location.hash = 'conversa';
  if (nome) caosDiz('meta_quanto', { meta: nome }, ['Cancelar']);
  else if (!jaFalou) caosDiz('meta_pra_que', {}, ['Reserva de emergência', 'Uma viagem', 'Um show', 'Cancelar']);
  else {
    const ult = [...state.chat].reverse().find(m => m.de === 'caos');
    if (ult) { ult.sugestoes = ['Reserva de emergência', 'Uma viagem', 'Um show', 'Cancelar']; renderChat(); }
  }
}

async function metaResposta(t) {
  const f = state.metaFlow;
  const d = f.dados;
  addMsg({ de: 'eu', texto: t });
  if (/^(cancela|cancelar|deixa|esquece|depois)/i.test(t)) {
    state.metaFlow = null;
    addMsg({ de: 'caos', texto: 'Sem problema, deixei pra lá. Quando quiser, é só falar "quero montar uma meta".', sugestoes: SUGESTOES.slice(0, 5) });
    return;
  }
  if (f.passo === 'pra_que') {
    d.nome = t.replace(/^(pra|para)\s+(um|uma|o|a)?\s*/i, '').trim().slice(0, 60);
    d.nome = d.nome ? d.nome[0].toUpperCase() + d.nome.slice(1) : 'Minha meta';
    f.passo = 'quanto';
    caosDiz('meta_quanto', { meta: d.nome }, ['Cancelar']);
  } else if (f.passo === 'quanto') {
    const v = parseAmount(t.replace(/[a-z]/gi, ' '));
    if (!v) return addMsg({ de: 'caos', texto: 'Não peguei o valor. Manda só o número, tipo 600 ou 1.500,00.', sugestoes: ['Cancelar'] });
    d.alvoCents = v;
    f.passo = 'tem';
    caosDiz('meta_tem', {}, ['0', 'Cancelar']);
  } else if (f.passo === 'tem') {
    const v = /^\s*(0|zero|nada|nenhum)/i.test(t) ? 0 : parseAmount(t.replace(/[a-z]/gi, ' '));
    if (v == null) return addMsg({ de: 'caos', texto: 'Manda só o número que já tem guardado (ou 0).', sugestoes: ['0', 'Cancelar'] });
    d.guardadoCents = Math.min(v, d.alvoCents);
    f.passo = 'ate';
    caosDiz('meta_ate', {}, ['Em 6 meses', 'Fim do ano', 'Em 1 ano', 'Sem prazo']);
  } else if (f.passo === 'ate') {
    const semPrazo = /sem prazo|nao sei|não sei|tanto faz/i.test(t);
    const ate = semPrazo ? null : lerMesAlvo(t, toISODate());
    if (!ate && !semPrazo) return addMsg({ de: 'caos', texto: 'Não entendi o prazo. Pode ser "dezembro", "em 6 meses", "04/2027" ou "sem prazo".', sugestoes: ['Em 6 meses', 'Fim do ano', 'Sem prazo'] });
    state.metaFlow = null;
    try {
      const meta = createMeta({ nome: d.nome, alvoCents: d.alvoCents, guardadoCents: d.guardadoCents, ate });
      const p = progressoMeta(meta, toISODate());
      addMsg({ de: 'caos', texto: `Montei assim: ${textoMeta(p)} Posso salvar essa meta?`, acao: { tipo: 'criar_meta', meta } });
    } catch (e) {
      addMsg({ de: 'caos', texto: `Não consegui montar: ${e.message}`, sugestoes: ['Quero montar uma meta'] });
    }
  }
}

async function salvarMetas(lista) {
  state.metas = lista;
  await db.setMeta('metas', lista);
  renderMetas();
}

function renderMetas() {
  const el = $('#meta-list');
  if (!el) return;
  const hoje = toISODate();
  el.innerHTML = state.metas.map(m => {
    const p = progressoMeta(m, hoje);
    return `<li>
      <div class="account-head"><strong>${ic(p.batida ? 'i-trofeu' : 'i-meta')} ${esc(m.nome)}</strong><span class="num">${p.pct}%</span></div>
      <div class="limite-bar" role="img" aria-label="${p.pct}% da meta"><i style="width:${p.pct}%"></i></div>
      <small class="muted">${esc(p.batida ? `Meta batida! ${formatBRL(m.alvoCents)} guardados.` : textoMeta(p))}</small>
      <div class="account-actions">
        ${p.batida ? '' : `<button class="ghost" data-meta-guardar="${esc(m.id)}">＋ Guardar</button>`}
        <button class="ghost" data-meta-del="${esc(m.id)}">Remover</button>
      </div>
    </li>`;
  }).join('') || '<li class="muted small">Nenhuma meta ainda. Monta uma com o C.A.O.S.!</li>';
}

async function guardarEmMeta(id, valorCents) {
  const m = state.metas.find(x => x.id === id);
  if (!m) return;
  const { meta, batidaAgora } = guardarNaMeta(m, valorCents);
  await salvarMetas(state.metas.map(x => (x.id === id ? meta : x)));
  const p = progressoMeta(meta, toISODate());
  if (batidaAgora) {
    caosDiz('meta_batida', { meta: meta.nome, nome: state.perfil?.apelido || 'você' }, ['Quero montar uma meta']);
    $('#caos-line').textContent = `Meta ${meta.nome} batida! 🎉`;
  } else {
    caosDiz('meta_guardou', { meta: meta.nome, valor: formatBRL(valorCents), pct: p.pct, resta: formatBRL(p.faltaCents) });
  }
}

// Respiro antes da resposta (pedido do JF, 06/11): instantâneo demais "dá medo e quebra a imersão".
// 0,6 a 1,8 s conforme o tamanho da resposta; com "menos movimento", espera curta e sem animação. Não trava nada.
const tempoDePensar = (texto, menosMovimento = false) =>
  menosMovimento ? 300 : Math.round(Math.min(1800, Math.max(600, 450 + String(texto || '').length * 9)));

async function respiro(texto) {
  const id = `d${Date.now()}${Math.random()}`;
  const pensando = rostoAvulso('pensando', { mood: state.settings.mood, memory: state.caosMemory });
  pintarRosto(pensando);
  addMsg({ de: 'caos', texto: 'digitando…', temp: id, digitando: true, rosto: pensando });
  await new Promise(r => setTimeout(r, tempoDePensar(texto, MENOS_MOVIMENTO.matches)));
  state.chat = state.chat.filter(m => m.temp !== id);
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
  addMsg({ de: 'caos', texto: 'Hoje eu não consigo trazer a comparação certinha, mas guardei sua pergunta. Assim que eu tiver conexão com o servidor do C.A.O.S. Finanças, eu trago a resposta aqui. 😉' });
}

/** Guarda uma pergunta que ele não soube responder (até 10, sem repetir). Devolve true se guardou. */
async function guardarPergunta(pergunta) {
  try {
    const fila = await db.getMeta('fila', []);
    const p = String(pergunta).trim().slice(0, 300);
    if (!p || fila.some(x => x.tipo === 'pergunta' && x.pergunta.toLowerCase() === p.toLowerCase())) return true;
    const perguntas = fila.filter(x => x.tipo === 'pergunta');
    if (perguntas.length >= 10) return false;
    fila.push({ tipo: 'pergunta', pergunta: p, id: crypto.randomUUID?.() || String(Date.now()), criadoEm: Date.now() });
    await db.setMeta('fila', fila);
    return true;
  } catch {
    return false;
  }
}

/** Responde o que ficou na fila, quando o servidor estiver ao alcance; entrega na conversa e no balão. */
async function processarFila() {
  if (!(state.settings.aiOn && state.settings.aiUrl && navigator.onLine)) return;
  const fila = await db.getMeta('fila', []);
  if (!fila.length) return;
  const resta = [];
  for (const item of fila) {
    try {
      if (item.tipo === 'pergunta') {
        const texto = await ia.perguntar(state.settings.aiUrl, { pergunta: item.pergunta, humor: state.settings.mood, dados: dados() });
        const nome = state.perfil?.apelido;
        addMsg({ de: 'caos', ia: true, texto: `Ei${nome ? `, ${nome}` : ''}, sabe aquela sua pergunta? "${item.pergunta}" Agora eu consigo responder: ${texto}` });
        $('#caos-line').textContent = 'Lembra daquela pergunta? Agora eu sei responder. Toca aqui pra ver.';
        continue;
      }
      if (item.tipo === 'explicar') {
        const img = await imagens.pegar(item.imagemId);
        if (!img) continue; // a foto foi apagada: tira da fila
        const texto = await ia.explicarImagem(state.settings.aiUrl, { base64: await imagens.paraBase64(img.blob), duvida: item.duvida, humor: state.settings.mood });
        const nome = state.perfil?.apelido;
        addMsg({ de: 'caos', ia: true, texto: `Ei${nome ? `, ${nome}` : ''}, sabe aquele print do banco que você me mandou? Agora eu consigo explicar: ${texto}` });
        $('#caos-line').textContent = 'Expliquei aquele print do banco. Toca aqui pra ver.';
        continue;
      }
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
    if (a.tipo === 'criar_meta') {
      await salvarMetas([...state.metas, a.meta]);
      addMsg({ de: 'caos', texto: `Meta ${a.meta.nome} salva! Ela fica na aba 📅 Mês. Quando guardar dinheiro, me fala "guardei 50 na meta ${a.meta.nome}" que eu somo.` });
      return;
    }
    if (a.tipo === 'meta_guardar') {
      await guardarEmMeta(a.metaId, a.valorCents);
      return;
    }
    if (a.tipo === 'mudar_apelido') {
      state.perfil = { ...(state.perfil || {}), apelido: a.apelido, nome: state.perfil?.nome || a.apelido };
      await db.setMeta('perfil', state.perfil);
      renderPerfil();
      addMsg({ de: 'caos', texto: `Fechado! A partir de agora te chamo de ${a.apelido}.` });
      return;
    }
    const events = a.tipo === 'registrar_entrada'
      ? await registrarEntrada({ amountCents: a.amountCents, sourceId: a.sourceId, note: a.note, date: a.date })
      : await registrarGasto({ amountCents: a.amountCents, categoryId: a.categoryId, note: a.note, date: a.date, imageId: a.imageId, compromissoId: a.compromissoId, accountId: a.accountId,
          forma: a.forma || null, parcelas: a.parcelas || 1, limiteModo: a.limiteModo || 'total' });
    if (a.compromissoId) renderMes();
    const fala = narrate(events, { ignoreCooldown: true });
    addMsg({ de: 'caos', texto: fala ? fala.texto : 'Anotado!', rosto: fala?.rosto });
    if (state.settings.voice && fala) falar(fala.texto, fala.emocao);
  } catch (e) {
    m.acaoFeita = false;
    addMsg({ de: 'caos', texto: `Não consegui anotar: ${e.message}` });
  }
}

/** "Explica esse print": a pessoa pediu, então a imagem vai pro servidor; sem conexão, fica na fila (a foto fica no aparelho). */
async function explicarPrint(img, duvida) {
  const pronto = state.settings.aiOn && state.settings.aiUrl && navigator.onLine;
  if (pronto) {
    await respiro('Deixa eu olhar com calma o que o banco quis dizer.');
    addMsg({ de: 'caos', texto: 'Olhando o print com a IA…', temp: true, rosto: rostoAvulso('pensando', { mood: state.settings.mood, memory: state.caosMemory }) });
    try {
      const texto = await ia.explicarImagem(state.settings.aiUrl, { base64: await imagens.paraBase64(img.blob), duvida, humor: state.settings.mood });
      state.chat = state.chat.filter(m => !m.temp);
      addMsg({ de: 'caos', ia: true, texto });
      if (state.settings.voice) falar(texto);
      return;
    } catch {
      state.chat = state.chat.filter(m => !m.temp);
    }
  }
  const fila = await db.getMeta('fila', []);
  fila.push({ tipo: 'explicar', imagemId: img.id, duvida: String(duvida || '').slice(0, 300), id: crypto.randomUUID?.() || String(Date.now()), criadoEm: Date.now() });
  await db.setMeta('fila', fila);
  addMsg({ de: 'caos', texto: 'Agora eu não consigo falar com o servidor do C.A.O.S. Finanças, mas guardei o print aqui no aparelho. Assim que tiver conexão, eu explico e te aviso.' });
}

async function fotoNoChat(arquivo) {
  try {
    const img = await imagens.guardar(arquivo, 'chat');
    addMsg({ de: 'eu', texto: '', url: URL.createObjectURL(img.blob), imagemId: img.id });
    const explicar = state.modoFoto?.tipo === 'explicar' && state.modoFoto.ate > Date.now() ? state.modoFoto : null;
    state.modoFoto = null;
    if (explicar) return explicarPrint(img, explicar.duvida);
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
  renderInvestimentos();
  $('#bank-total').textContent = formatBRL(totalBalance(state.accounts, state.expenses, state.incomes));
  $('#account-list').innerHTML = agruparPorBanco(state.accounts).map(g => {
    const dinheiro = g.contas.filter(a => a.tipo !== 'cartao').reduce((t, a) => t + accountBalance(a, state.expenses, state.incomes), 0);
    const temDinheiro = g.contas.some(a => a.tipo !== 'cartao');
    return `
    <li class="banco-grupo">
      <div class="banco-head"><strong>${esc(g.bank === 'Outro' ? 'Outros' : g.bank)}</strong>${temDinheiro && g.contas.length > 1 ? `<span class="num muted">${formatBRL(dinheiro)} no total</span>` : ''}</div>
      <ul class="banco-partes">${g.contas.map(a => (a.tipo === 'cartao' ? itemCartao(a) : itemConta(a))).join('')}</ul>
    </li>`;
  }).join('');
  if (!$('#bank-select').options.length) {
    $('#bank-select').innerHTML = BANKS.map(b => `<option>${esc(b)}</option>`).join('');
    $('#card-bank').innerHTML = BANKS.filter(b => !/dinheiro vivo/.test(b)).map(b => `<option>${esc(b)}</option>`).join('');
  }
  renderFormConta();
}

// ---------- Investimentos (app 1.8, ideia do Bruno Levanti) ----------

function renderInvestimentos() {
  const lista = state.investimentos || [];
  const r = resumoInvestimentos(lista);
  const el = $('#inv-resumo');
  el.hidden = !lista.length;
  if (lista.length) {
    const cls = r.ganhoCents >= 0 ? 'ganho' : 'perda';
    el.innerHTML = `<p class="label">Total investido hoje</p><p class="big">${formatBRL(r.atualCents)}</p>
      <p class="small">Você aplicou ${formatBRL(r.aplicadoCents)} · <span class="${cls}">${r.ganhoCents >= 0 ? '+' : '−'}${formatBRL(Math.abs(r.ganhoCents))} (${r.rendimentoPct.toLocaleString('pt-BR')}%)</span></p>`;
  }
  const dia = ms => new Date(ms).toLocaleDateString('pt-BR');
  $('#inv-list').innerHTML = lista.map(i => {
    const g = i.atualCents - i.aplicadoCents;
    return `<li>
      <div class="account-head"><strong>${ic('e-rendimento')} ${esc(i.nome)}</strong><span class="num">${formatBRL(i.atualCents)}</span></div>
      <small class="muted">${esc(TIPOS_INVESTIMENTO[i.tipo] || 'Outro')}${i.instituicao ? ` · ${esc(i.instituicao)}` : ''} · aplicou ${formatBRL(i.aplicadoCents)} · <span class="${g >= 0 ? 'ganho' : 'perda'}">${g >= 0 ? '+' : '−'}${formatBRL(Math.abs(g))}</span> · valor de ${dia(i.valorEm)}</small>
      <div class="account-actions">
        <button class="ghost" data-inv-atualizar="${esc(i.id)}">Atualizar valor</button>
        <button class="ghost" data-inv-aporte="${esc(i.id)}">＋ Coloquei mais</button>
        <button class="ghost" data-inv-del="${esc(i.id)}">Remover</button>
      </div>
    </li>`;
  }).join('');
  if (!$('#inv-tipo').options.length) $('#inv-tipo').innerHTML = Object.entries(TIPOS_INVESTIMENTO).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
}

async function salvarInvestimentos(lista) {
  state.investimentos = lista;
  await db.setMeta('investimentos', lista);
  renderInvestimentos();
}

async function onAddInvestimento(ev) {
  ev.preventDefault();
  const err = $('#inv-error');
  err.hidden = true;
  try {
    const aplicado = parseAmount($('#inv-aplicado').value);
    const atualTxt = $('#inv-atual').value.trim();
    const atual = atualTxt ? parseSignedAmount(atualTxt) : null;
    const inv = createInvestimento({ nome: $('#inv-nome').value, tipo: $('#inv-tipo').value, instituicao: $('#inv-inst').value, aplicadoCents: aplicado, atualCents: atual });
    await salvarInvestimentos([...(state.investimentos || []), inv]);
    for (const id of ['#inv-nome', '#inv-inst', '#inv-aplicado', '#inv-atual']) $(id).value = '';
    toast(`${inv.nome} adicionado. Pergunte pro C.A.O.S.: "como estão meus investimentos?"`);
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
}

async function acaoInvestimento(e) {
  const b = e.target.closest('[data-inv-atualizar],[data-inv-aporte],[data-inv-del]');
  if (!b) return;
  const id = b.dataset.invAtualizar || b.dataset.invAporte || b.dataset.invDel;
  const inv = state.investimentos.find(x => x.id === id);
  if (!inv) return;
  try {
    if (b.dataset.invDel) {
      if (!confirm(`Remover ${inv.nome} da lista? (Não mexe em nada no banco.)`)) return;
      return salvarInvestimentos(state.investimentos.filter(x => x.id !== id));
    }
    if (b.dataset.invAtualizar) {
      const r = prompt(`Quanto ${inv.nome} vale hoje? (olhe no app do banco)`, (inv.atualCents / 100).toFixed(2).replace('.', ','));
      if (r == null) return;
      const v = parseSignedAmount(r);
      if (v == null || v < 0) return toast('Valor inválido.');
      await salvarInvestimentos(state.investimentos.map(x => (x.id === id ? atualizarInvestimento(x, { atualCents: v }) : x)));
      return toast('Valor atualizado.');
    }
    const r = prompt(`Quanto você colocou a mais em ${inv.nome}?`);
    if (r == null) return;
    const v = parseAmount(r);
    if (!v) return toast('Valor inválido.');
    await salvarInvestimentos(state.investimentos.map(x => (x.id === id ? atualizarInvestimento(x, { atualCents: x.atualCents + v, aporteCents: v }) : x)));
    toast(`Aporte de ${formatBRL(v)} anotado.`);
  } catch (err) {
    toast(err.message);
  }
}

function itemConta(a) {
  const bal = accountBalance(a, state.expenses, state.incomes);
  const desde = new Date(a.balanceAt).toLocaleDateString('pt-BR');
  const reforca = a.reforcaCartaoId && state.accounts.find(c => c.id === a.reforcaCartaoId);
  return `
    <li>
      <div class="account-head"><strong>${iconeConta(a)} ${esc(accountLabel(a))}</strong><span class="num ${bal < 0 ? 'bad' : ''}">${formatBRL(bal)}</span></div>
      <small class="muted">Saldo informado ${formatBRL(a.balanceCents)} em ${desde}${bal !== a.balanceCents ? ', mais os lançamentos desde então' : ''}.${reforca ? ` Aumenta o limite do ${esc(accountLabel(reforca))}.` : ''}</small>
      <div class="account-actions">
        <button class="ghost" data-acc-update="${esc(a.id)}">Atualizar saldo</button>
        <button class="ghost" data-acc-del="${esc(a.id)}">Remover</button>
      </div>
    </li>`;
}

function itemCartao(a) {
  const f = faturaDoCartao(comReforco(a, state.accounts, state.expenses, state.incomes), state.expenses, toISODate());
  const cls = f.pct >= 100 ? 'cheio' : f.pct >= 80 ? 'alto' : '';
  const dia = iso => `${iso.slice(8)}/${iso.slice(5, 7)}`;
  return `
    <li>
      <div class="account-head"><strong>${ic('a-cartao')} ${esc(accountLabel(a))}</strong><span class="num ${f.pct >= 100 ? 'bad' : ''}">${formatBRL(f.disponivelCents)} livre</span></div>${f.reforcoCents ? `<small class="muted">Limite ${formatBRL(a.limiteCents)} + ${formatBRL(f.reforcoCents)} do cofrinho.</small>` : ''}
      <div class="limite-bar ${cls}" role="img" aria-label="${f.pct}% do limite usado"><i style="width:${Math.min(100, Math.max(0, f.pct))}%"></i></div>
      <small class="muted">Usado ${formatBRL(f.usadoCents)} de ${formatBRL(f.limiteCents)} (${f.pct}%). Fatura aberta ${formatBRL(f.abertaCents)}, fecha ${dia(f.fechamento)}.${f.fechadaCents ? ` Fatura fechada ${formatBRL(f.fechadaCents)} vence ${dia(f.vencimento)}.` : ''}${f.futurasCents ? ` Parcelas das próximas faturas: ${formatBRL(f.futurasCents)}${f.presoFuturoCents ? ` (${formatBRL(f.presoFuturoCents)} preso no limite)` : ''}.` : ''}</small>
      <div class="account-actions">
        <button class="ghost" data-acc-del="${esc(a.id)}">Remover</button>
      </div>
    </li>`;
}

async function onAddCartao(ev) {
  ev.preventDefault();
  const err = $('#card-error');
  err.hidden = true;
  try {
    const limite = parseAmount($('#card-limite').value);
    if (!limite) throw new Error('Qual o limite do cartão?');
    const usado = $('#card-usado').value.trim() ? parseSignedAmount($('#card-usado').value) : 0;
    if (usado == null || usado < 0) throw new Error('O valor já usado está estranho.');
    const c = createCartao({ bank: $('#card-bank').value, nickname: $('#card-nick').value, limiteCents: limite, fechamentoDia: Number($('#card-fecha').value), vencimentoDia: Number($('#card-vence').value), usadoCents: usado });
    await db.put(db.STORES.accounts, c);
    state.accounts.push(c);
    for (const id of ['#card-nick', '#card-limite', '#card-fecha', '#card-vence', '#card-usado']) $(id).value = '';
    renderContas();
    renderLancar();
    render();
    toast(`Cartão ${accountLabel(c)} adicionado. Ao lançar, escolha ele em "Conta".`);
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
}

const ICONE_CONTA = { corrente: 'i-contas', poupanca: 'a-poupanca', cofrinho: 'e-outros', cartao: 'a-cartao' };
const iconeConta = a => ic(ICONE_CONTA[a.tipo === 'cartao' ? 'cartao' : a.subtipo || 'corrente']);

/** <option>s de conta agrupadas por banco, em ordem alfabética, cada uma dizendo o que é (12/11). */
function opcoesDeConta(filtro = () => true) {
  return '<option value="">Sem conta</option>' + agruparPorBanco(state.accounts.filter(filtro)).map(g =>
    `<optgroup label="${esc(g.bank)}">${g.contas.map(a => `<option value="${esc(a.id)}">${esc(accountLabel(a))}</option>`).join('')}</optgroup>`).join('');
}

function renderFormConta() {
  const cofrinho = $('#bank-subtipo').value === 'cofrinho';
  const cartoes = state.accounts.filter(a => a.tipo === 'cartao');
  $('#bank-reforco-field').hidden = !cofrinho || !cartoes.length;
  $('#bank-reforco-cartao').innerHTML = cartoes.map(a => `<option value="${esc(a.id)}">${esc(accountLabel(a))}</option>`).join('');
  const doBanco = cartoes.find(a => a.bank === $('#bank-select').value);
  if (doBanco) $('#bank-reforco-cartao').value = doBanco.id;
}

async function onAddAccount(ev) {
  ev.preventDefault();
  const err = $('#account-error');
  err.hidden = true;
  try {
    const bal = parseSignedAmount($('#bank-balance').value);
    if (bal == null) throw new Error('Digite o saldo atual (pode ser 0).');
    const subtipo = $('#bank-subtipo').value;
    const reforcaCartaoId = subtipo === 'cofrinho' && $('#bank-reforco').checked ? $('#bank-reforco-cartao').value || null : null;
    const acc = createAccount({ bank: $('#bank-select').value, nickname: $('#bank-nick').value, balanceCents: bal, subtipo, reforcaCartaoId });
    await db.put(db.STORES.accounts, acc);
    state.accounts.push(acc);
    $('#bank-nick').value = '';
    $('#bank-balance').value = '';
    $('#bank-subtipo').value = 'corrente';
    $('#bank-reforco').checked = false;
    renderFormConta();
    renderContas();
    renderLancar();
    render();
    toast(`Pronto, anotei: ${accountLabel(acc)}.`);
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
      <label for="b-${esc(c.id)}">${icCat(c)} ${esc(c.name)}</label>
      <span class="amount small"><span>R$</span>
        <input id="b-${esc(c.id)}" data-budget="${esc(c.id)}" type="text" inputmode="decimal" placeholder="sem limite" value="${centsToInput(c.budgetCents)}">
      </span>
    </li>`).join('');
}

async function renderSettings() {
  prepararFormCompromisso();
  $('#mood-options').innerHTML = Object.entries(MOODS).map(([id, label]) => `
    <label><input type="radio" name="mood" value="${id}" ${state.settings.mood === id ? 'checked' : ''}><span>${label}</span></label>`).join('');
  $('#voice-toggle').checked = state.settings.voice;
  for (const r of document.querySelectorAll('input[name="letra"]')) r.checked = r.value === (state.settings.letra || 'normal');
  for (const r of document.querySelectorAll('input[name="tema"]')) r.checked = r.value === (state.settings.tema || 'auto');
  $('#voz-vel').value = state.settings.vozVel ?? 1;
  $('#voz-vel-out').textContent = `${Number(state.settings.vozVel ?? 1).toFixed(1).replace('.', ',')}×`;
  $('#menos-mov').checked = MENOS_MOVIMENTO.matches;
  $('#voice-toggle').closest('label').hidden = !vozDisponivel();
  $('#caos-version').textContent = `${IDENTIDADE.nome} ${CAOS_VERSAO} · ${IDENTIDADE.sigla}. ${IDENTIDADE.slogan} Criado por ${IDENTIDADE.criador}, veio do ${IDENTIDADE.origem}.`;
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
    compromissos: state.compromissos, planos: state.planos, perfil: state.perfil, metas: state.metas, investimentos: state.investimentos,
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
    if (file.size > 20 * 1024 * 1024) throw new Error('Arquivo grande demais para ser um backup.');
    let bruto;
    try { bruto = JSON.parse(await file.text()); } catch { throw new Error('Esse arquivo não parece um backup do C.A.O.S. Finanças.'); }
    // Valida TUDO antes de perguntar e antes de gravar: se algo estiver errado, nada muda.
    const v = validarBackup(bruto);
    if (!v.ok) throw new Error(`Não importei: ${v.erros[0]}`);
    const d = v.dados;
    if (!confirm(`Substituir os dados atuais por ${d.expenses.length} gastos, ${d.incomes.length} entradas, ${d.accounts.length} contas e ${d.compromissos.length} compromissos do backup?`)) return;
    await db.replaceAll({ expenses: d.expenses, categories: d.categories, incomes: d.incomes, accounts: d.accounts, compromissos: d.compromissos, planos: d.planos });
    Object.assign(state, { expenses: d.expenses, categories: d.categories, incomes: d.incomes, accounts: d.accounts, compromissos: d.compromissos, planos: d.planos });
    if (d.perfil) { state.perfil = d.perfil; await db.setMeta('perfil', d.perfil); renderPerfil(); }
    await salvarMetas(d.metas);
    await salvarInvestimentos(d.investimentos);
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
  $('#comp-cat').innerHTML = state.categories.map(c => `<option value="${esc(c.id)}" ${c.id === 'contas' ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  $('#comp-conta-field').hidden = !state.accounts.length;
  $('#comp-conta').innerHTML = opcoesDeConta();
}

function textoStatus(c) {
  if (!c.noMes) return `próxima vez: ${nomeMes(c.proximaVez).toLowerCase()}`;
  if (c.status === 'pago') return `pago este mês (${formatBRL(c.pagoCents)})`;
  const parcial = c.parcial ? ` · pagou ${formatBRL(c.pagoCents)}, falta ${formatBRL(c.faltaCents)}` : '';
  if (c.status === 'atrasado') return `venceu dia ${c.diaNoMes}${parcial}`;
  if (c.parcial) return `${c.diaNoMes ? `vence dia ${c.diaNoMes}` : 'é deste mês'}${parcial}`;
  if (c.status === 'pendente') return 'é deste mês';
  return c.diasParaVencer === 0 ? 'vence hoje' : c.diasParaVencer === 1 ? 'vence amanhã' : `vence dia ${c.diaNoMes} (em ${c.diasParaVencer} dias)`;
}

function renderMes() {
  renderMetas();
  const hoje = toISODate();
  const a = analisarPlanejamento(dados(), hoje);
  $('#mes-titulo').textContent = `Planejamento · ${nomeMes(a.month)}`;
  const el = $('#plan-sobra');
  if (a.sobraCents == null) {
    // sem entrada nem orçamento: frase no lugar do "—" gigante (revisão do Code, 12/11)
    el.textContent = 'Lance sua entrada pra eu calcular';
    el.className = 'big vazio';
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
  $('#plan-caos').textContent = fala.texto;

  const sit = situacaoCompromissos(state.compromissos, state.expenses, hoje);
  $('#comp-list').innerHTML = sit.length ? sit.map(c => {
    const cat = catById(c.categoryId);
    const rep = c.cadaMeses === 1 ? 'todo mês' : c.cadaMeses === 12 ? 'todo ano' : `a cada ${c.cadaMeses} meses`;
    return `
    <li class="${c.status}">
      <span class="comp-info"><span>${icCat(cat)} ${esc(c.nome)}</span>
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
    toast(`Pronto, anotei: ${c.nome}. Eu lembro quando chegar a hora.`);
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
}

async function lancarCompromisso(id) {
  const c = state.compromissos.find(x => x.id === id);
  if (!c) return;
  const sit = situacaoCompromissos([c], state.expenses, toISODate())[0];
  let valor = sit?.faltaCents || c.valorCents;
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
  if (feito) {
    // Cancelou? Nada muda: o plano continua pendente e nenhum gasto é gravado (revisão 06/11).
    if (!confirm(`Lançar ${formatBRL(p.valorCents)} de ${p.nome} como gasto agora?`)) { renderMes(); return; }
    try {
      const events = await registrarGasto({ amountCents: p.valorCents, categoryId: p.categoryId, note: p.nome, date: toISODate() });
      narrate(events);
    } catch (e) {
      toast(e.message || 'Não deu pra lançar. O plano continua pendente.');
      renderMes();
      return;
    }
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
  const idade = idadeDe(p?.aniversario, toISODate());
  $('#perfil-resumo').textContent = p?.apelido
    ? `O C.A.O.S. te chama de ${p.apelido}${p.nome && p.nome !== p.apelido ? ` (${p.nome})` : ''}, num jeito ${p.tratamento === 'formal' ? 'mais formal' : 'descontraído'}.${idade != null ? ` ${idade} anos.` : ''}${p.foco?.length ? ` Foco: ${p.foco.join(', ').toLowerCase()}.` : ''}`
    : 'O C.A.O.S. ainda não te conhece.';
  $('#perfil-aniversario').value = p?.aniversario || '';
  $('#perfil-aniversario').max = toISODate();
}

// ---------- Me ajuda: o C.A.O.S. guia (1.5) ----------
const AJUDAS = [
  'Como lanço um gasto?', 'Como registro meu cartão?', 'Como ponho orçamento?', 'Como adiciono uma conta?',
  'Como planejo o mês?', 'Como mando foto do comprovante?', 'Como ligo os lembretes?', 'Como faço backup?',
  'Como instalo o app?', 'Explica um print do banco', 'O que você pode fazer?',
];

function meAjuda() {
  location.hash = 'conversa';
  const nome = state.perfil?.apelido;
  addMsg({ de: 'caos', texto: `${nome ? `${nome}, ` : ''}tô aqui pra ajudar! Toca no que você quer fazer, ou escreve com suas palavras ("quero anotar um gasto", "como funciona o cartão"…).`, sugestoes: AJUDAS, rosto: rostoAvulso('elogio', { mood: state.settings.mood, memory: state.caosMemory }) });
}

// ---------- Conta e sincronização (06/11) ----------

let syncRodando = false;
let syncTimer = null;
const servidor = () => (state.settings.aiUrl || '').trim();

/** Relê tudo do banco e redesenha (quando chegam mudanças de outro aparelho). */
async function recarregarDoBanco() {
  const [cats, expenses, incomes, accounts, compromissos, planos, perfil, metas] = await Promise.all([
    db.getAll(db.STORES.categories), db.getAll(db.STORES.expenses), db.getAll(db.STORES.incomes), db.getAll(db.STORES.accounts),
    db.getAll(db.STORES.compromissos), db.getAll(db.STORES.planos), db.getMeta('perfil'), db.getMeta('metas', []),
  ]);
  state.investimentos = await db.getMeta('investimentos', []);
  const order = DEFAULT_CATEGORIES.map(c => c.id);
  Object.assign(state, {
    categories: cats.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)), expenses, incomes,
    accounts: accounts.sort((a, b) => a.createdAt - b.createdAt), compromissos, planos, perfil: perfil || state.perfil, metas: metas || [],
  });
  renderLancar(); renderBudgets(); renderPerfil(); renderContas(); renderMes(); render();
}

function quandoFoi(ms) {
  if (!ms) return 'ainda não sincronizou';
  const d = new Date(ms);
  const hoje = toISODate() === toISODate(d);
  return `sincronizado ${hoje ? 'hoje' : d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

async function renderConta() {
  const c = await conta.contaAtual().catch(() => null);
  $('#conta-fora').hidden = !!c;
  $('#conta-dentro').hidden = !c;
  $('#conta-aviso-servidor').hidden = !!servidor();
  if (c) {
    $('#conta-nome').textContent = `Conectado como ${c.apelido}`;
    const pend = (await db.pegarPendentes().catch(() => [])).length;
    $('#conta-status').textContent = `${cap(quandoFoi(c.ultimaSync))}.${pend ? ` ${pend} ${pend === 1 ? 'mudança espera' : 'mudanças esperam'} a internet.` : ''}`;
  }
}

/** Manda e recebe mudanças. Silenciosa (não incomoda sem internet); `avisar` mostra o resultado. */
async function sincronizarAgora({ avisar = false } = {}) {
  if (syncRodando || !servidor()) return;
  const c = await conta.contaAtual().catch(() => null);
  if (!c) return;
  if (!navigator.onLine) { if (avisar) toast('Sem internet agora. Eu guardo e mando quando voltar.'); return; }
  syncRodando = true;
  try {
    const r = await conta.sincronizar(servidor());
    if (r.recebidas) await recarregarDoBanco();
    if (r.ruins) toast(`${r.ruins} ${r.ruins === 1 ? 'dado da nuvem não abriu' : 'dados da nuvem não abriram'} com essa senha. Se você trocou de senha em outro aparelho, entre de novo com a senha nova.`);
    else if (avisar) toast(r.recebidas ? `Pronto! Chegaram ${r.recebidas} ${r.recebidas === 1 ? 'mudança' : 'mudanças'} dos outros aparelhos.` : 'Tudo em dia com a sua conta.');
  } catch (e) {
    if (avisar) toast(e.message || 'Não deu pra sincronizar agora.');
  } finally {
    syncRodando = false;
    renderConta();
  }
}

function sincronizarLogo() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => sincronizarAgora(), 3000);
}

async function entrarNaConta(criar) {
  const err = $('#conta-erro');
  err.hidden = true;
  const apelido = $('#conta-apelido').value.trim();
  const senha = $('#conta-senha').value;
  if (!servidor()) { err.textContent = 'Primeiro coloque o endereço do servidor do C.A.O.S. Finanças em "IA online e servidor".'; err.hidden = false; return; }
  if (apelido.length < 3) { err.textContent = 'Escolha um apelido com pelo menos 3 letras.'; err.hidden = false; return; }
  if (senha.length < 6) { err.textContent = 'A senha precisa ter pelo menos 6 letras ou números.'; err.hidden = false; return; }
  const botoes = [$('#conta-entrar'), $('#conta-criar')];
  const textos = botoes.map(b => b.textContent);
  botoes.forEach(b => { b.disabled = true; });
  (criar ? botoes[1] : botoes[0]).textContent = 'Protegendo…';
  try {
    const nome = await conta.entrar(servidor(), { apelido, senha, criar });
    $('#conta-senha').value = '';
    toast(criar ? `Conta ${nome} criada! Agora seus aparelhos ficam juntos.` : `Bem-vindo de volta, ${nome}! Buscando seus dados…`);
    await sincronizarAgora({ avisar: !criar });
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  } finally {
    botoes.forEach((b, i) => { b.disabled = false; b.textContent = textos[i]; });
  }
  renderConta();
}

// ---------- Novidades (1.4) ----------

function itemNovidade(item) {
  const p = partesDoItem(item);
  if (!p.titulo) return `<li class="nov-solto">${esc(p.texto)}</li>`;
  const texto = p.texto.charAt(0).toUpperCase() + p.texto.slice(1);
  return `<li><details class="nov-drop"><summary class="nov-tag">${esc(p.icone)} ${esc(p.titulo)}</summary>`
    + `<div class="nov-drop-txt">${esc(texto)}</div></details></li>`;
}

function versaoNovidade(n, i) {
  return `<details class="nov-item"${i === 0 ? ' open' : ''}><summary>`
    + `<span class="nov-v">Versão ${esc(n.v)}</span>`
    + (n.nome ? `<span class="nov-nome">${esc(n.nome)}</span>` : '')
    + (n.data ? `<span class="nov-data">${esc(n.data)}</span>` : '')
    + `<span class="nov-t">${esc(n.t)}</span></summary>`
    + (n.itens.length ? `<ul>${n.itens.map(itemNovidade).join('')}</ul>` : '')
    + (n.qol.length ? `<div class="nov-qol">Ajustes e correções</div><ul>${n.qol.map(itemNovidade).join('')}</ul>` : '')
    + `</details>`;
}

const NOV_A_MOSTRA = 3;
function renderNovidades() {
  const antigas = NOVIDADES.length - NOV_A_MOSTRA;
  $('#novidades-lista').innerHTML =
    `<div class="nov-ic" aria-hidden="true">🆕</div><p class="nov-sub">O que mudou nas últimas versões. Toque num item pra ver a explicação.</p>`
    + NOVIDADES.slice(0, NOV_A_MOSTRA).map(versaoNovidade).join('')
    + (antigas > 0
      ? `<button type="button" class="ghost nov-antigas" id="novidades-antigas" aria-expanded="false">Ver versões antigas (${antigas})</button>`
        + `<div id="novidades-antigas-lista" class="nov-antigas-lista" hidden>${NOVIDADES.slice(NOV_A_MOSTRA).map((n, i) => versaoNovidade(n, i + NOV_A_MOSTRA)).join('')}</div>`
      : '');
}

function alternarAntigas(b) {
  const l = $('#novidades-antigas-lista'), abrir = l.hidden;
  l.hidden = !abrir;
  b.setAttribute('aria-expanded', String(abrir));
  b.textContent = abrir ? 'Esconder versões antigas' : `Ver versões antigas (${NOVIDADES.length - NOV_A_MOSTRA})`;
}

async function abrirNovidades() {
  renderNovidades();
  const dlg = $('#novidades-dialog');
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  state.novidadesVistas = VERSAO_APP;
  $('#novidade-aviso').hidden = true;
  await db.setMeta('novidadesVistas', VERSAO_APP).catch(() => {});
}

function renderAvisoNovidade() {
  $('#novidade-aviso').hidden = !temNovidade(state.novidadesVistas);
  $('#novidades-versao').textContent = `Versão ${VERSAO_APP} · o que mudou no app`;
}

/** Quem já tinha cadastro sem data de aniversário: ele pergunta UMA vez na conversa. */
async function perguntarAniversarioUmaVez() {
  const p = state.perfil;
  if (!p || p.pulou || !p.apelido || p.aniversario || p.aniversarioPerguntado || state.onboarding) return;
  state.perfil = { ...p, aniversarioPerguntado: true };
  await db.setMeta('perfil', state.perfil);
  state.onboarding = { passo: 'aniversario', unico: true, dados: { apelido: p.apelido, foco: [] } };
  caosDiz('onb_aniversario', { nome: p.apelido }, ['Prefiro não dizer']);
}

/** No dia do aniversário, ele dá parabéns uma vez por ano. */
async function parabensSeForODia() {
  const p = state.perfil;
  const hoje = toISODate();
  if (!p?.aniversario || !ehAniversario(p.aniversario, hoje) || p.parabensAno === hoje.slice(0, 4)) return;
  state.perfil = { ...p, parabensAno: hoje.slice(0, 4) };
  await db.setMeta('perfil', state.perfil);
  caosDiz('aniversario', { nome: p.apelido || 'pessoa querida' }, SUGESTOES.slice(0, 6));
  const ult = [...state.chat].reverse().find(m => m.de === 'caos');
  if (ult) $('#caos-line').textContent = ult.texto;
}

function caosDiz(gatilho, vars, sugestoes) {
  const r = falaAvulsa(gatilho, vars, { mood: state.settings.mood, memory: state.caosMemory, perfil: state.perfil });
  guardarMemoria(r.memoria);
  const rosto = rostoAvulso(gatilho === 'onb_fim' ? 'identidade' : ['aniversario', 'meta_batida'].includes(gatilho) ? 'piada' : gatilho === 'meta_guardou' ? 'elogio' : 'surpresa', { mood: state.settings.mood, memory: state.caosMemory, texto: r.texto });
  pintarRosto(rosto);
  addMsg({ de: 'caos', texto: r.texto, sugestoes, rosto });
  if (state.settings.voice) falar(r.texto);
}

function iniciarOnboarding() {
  state.onboarding = { passo: 'nome', dados: { foco: [] } };
  if (location.hash.slice(1) !== 'conversa') location.hash = 'conversa';
  caosDiz('onb_nome', {}, ['Pular por enquanto', 'Já tenho conta']);
}

function sugestoesFoco() {
  const f = state.onboarding.dados.foco;
  return [...FOCOS.map(x => (f.includes(x) ? `✓ ${x}` : x)), 'Pronto'];
}

async function onboardingResposta(t) {
  const o = state.onboarding;
  const d = o.dados;
  if (/^j[aá] tenho conta/i.test(t)) {
    // conta em outro aparelho: vai pro login; o perfil vem junto com os dados
    addMsg({ de: 'eu', texto: t });
    state.onboarding = null;
    addMsg({ de: 'caos', texto: 'Boa! Entra na sua conta em Ajustes → Sua conta, que eu trago tudo do outro aparelho.' });
    location.hash = 'ajustes';
    setTimeout(() => { $('#conta-card').open = true; $('#conta-apelido').focus(); }, 300);
    return;
  }
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
      state.perfil = { nome: d.nome, apelido: d.apelido, tratamento: d.tratamento, foco: d.foco, aniversario: d.aniversario || null, aniversarioPerguntado: true, criadoEm: Date.now() };
      state.onboarding = null;
      await db.setMeta('perfil', state.perfil);
      renderPerfil();
      const foco = d.foco.length ? d.foco.join(', ').toLowerCase() : 'cuidar da carteira no dia a dia';
      // quem quer juntar dinheiro já sai com a sugestão de montar a meta junto
      caosDiz('onb_fim', { nome: d.apelido, foco }, d.foco.includes('Juntar dinheiro') ? ['Quero montar uma meta', ...SUGESTOES.slice(0, 5)] : SUGESTOES.slice(0, 6));
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
    const partes = nome.split(' ').filter(Boolean);
    if (partes.length === 1) {
      // um nome só ("JF", "Gu") já é o jeito de chamar: não pergunta apelido de apelido (JF, 06/11)
      d.apelido = nome;
      o.passo = 'aniversario';
      caosDiz('onb_aniversario', { nome }, ['Prefiro não dizer']);
      return;
    }
    o.passo = 'apelido';
    // nome completo ("Gustavo Lima"): sugere o primeiro nome, as iniciais e um apelido curto
    const primeiro = partes[0];
    const iniciais = partes.map(p => p[0]).join('').toUpperCase();
    const curto = primeiro.length > 4 ? primeiro.slice(0, 2) : null;
    caosDiz('onb_apelido', { nome: primeiro }, [...new Set([primeiro, iniciais, curto].filter(Boolean))]);
  } else if (o.passo === 'apelido') {
    d.apelido = extrairNome(t) || d.nome.split(' ')[0];
    o.passo = 'aniversario';
    caosDiz('onb_aniversario', { nome: d.apelido }, ['Prefiro não dizer']);
  } else if (o.passo === 'aniversario') {
    const nao = /(prefiro n|nao quero|não quero|pular|depois|n[aã]o digo)/i.test(t);
    const data = nao ? null : lerAniversario(t);
    if (!data && !nao && !o.tentouData) {
      o.tentouData = true;
      addMsg({ de: 'caos', texto: 'Não peguei a data. Manda no jeito dia/mês/ano, tipo 05/03/1998. Ou toca em "Prefiro não dizer".', sugestoes: ['Prefiro não dizer'] });
      return;
    }
    d.aniversario = data || null;
    if (o.unico) {
      // quem já tinha cadastro: só faltava a data (pergunta uma vez só)
      state.perfil = { ...state.perfil, aniversario: d.aniversario, aniversarioPerguntado: true };
      state.onboarding = null;
      await db.setMeta('perfil', state.perfil);
      renderPerfil();
      if (data) caosDiz('onb_aniversario_ok', { nome: state.perfil.apelido }, SUGESTOES.slice(0, 6));
      else addMsg({ de: 'caos', texto: 'Tudo bem! Se mudar de ideia, é só ir em Ajustes → Seu perfil.', sugestoes: SUGESTOES.slice(0, 6) });
      return;
    }
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
  aviso.textContent = `Lembrei: isso costuma ser ${cat.name}. Se não for, é só tocar em outra.`;
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
  // aviso no visual do app (12/11): rostinho do C.A.O.S. + texto
  t.innerHTML = `<span class="toast-face" aria-hidden="true">(•‿•)</span><span>${esc(msg)}</span>`;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 3200);
}

// ======================================================================
// Inicialização
// ======================================================================

function bind() {
  window.addEventListener('hashchange', () => irPara(location.hash.slice(1), { lado: ladoPendente }));
  // "Me ajuda" encolhe pra "?" enquanto a pessoa rola a tela (pra não tampar o que ela está lendo)
  let rolando = null;
  window.addEventListener('scroll', () => {
    $('#me-ajuda').classList.add('mini');
    clearTimeout(rolando);
    rolando = setTimeout(() => $('#me-ajuda').classList.remove('mini'), 1400);
  }, { passive: true });
  ligarArrastar();
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

  $('#sem-gasto').addEventListener('click', hojeNaoGastei);
  $('#receber-list').addEventListener('click', e => {
    const b = e.target.closest('[data-recebi]');
    if (b) recebi(b.dataset.recebi, b.dataset.pessoa).catch(er => toast(er.message || 'Não deu.'));
  });

  // Lançar
  $('#entry-form').addEventListener('submit', onSubmit);
  $('#racha-nomes').addEventListener('input', previaRacha);
  $('#amount').addEventListener('input', previaRacha);
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
  $('#forma-chips').addEventListener('click', e => {
    const b = e.target.closest('[data-forma]');
    if (!b) return;
    state.forma = state.forma === b.dataset.forma ? null : b.dataset.forma; // tocar de novo desmarca
    renderLancar();
  });
  $('#parcelas-select').addEventListener('change', previaParcelas);
  $('#amount').addEventListener('input', previaParcelas);
  for (const r of document.querySelectorAll('input[name="limite-modo"]')) r.addEventListener('change', previaParcelas);
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
  $('#bank-subtipo').addEventListener('change', renderFormConta);
  $('#bank-select').addEventListener('change', renderFormConta);
  $('#card-form').addEventListener('submit', onAddCartao);
  $('#inv-form').addEventListener('submit', onAddInvestimento);
  $('#inv-list').addEventListener('click', acaoInvestimento);
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
  $('#letra-options').addEventListener('change', e => { state.settings.letra = e.target.value; saveSettings(); aplicarAcessibilidade(); });
  $('#tema-options').addEventListener('change', e => { state.settings.tema = e.target.value; saveSettings(); aplicarAcessibilidade(); });
  $('#voz-vel').addEventListener('input', e => {
    state.settings.vozVel = Number(e.target.value);
    $('#voz-vel-out').textContent = `${Number(e.target.value).toFixed(1).replace('.', ',')}×`;
    aplicarAcessibilidade();
  });
  $('#voz-vel').addEventListener('change', () => { saveSettings(); if (state.settings.voice) falar('Assim que eu vou falar.'); });
  $('#menos-mov').addEventListener('change', e => { state.settings.menosMov = e.target.checked; saveSettings(); aplicarAcessibilidade(); });
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
  $('#novidade-aviso').addEventListener('click', abrirNovidades);
  $('#me-ajuda').addEventListener('click', meAjuda);
  $('#conta-entrar').addEventListener('click', () => entrarNaConta(false));
  $('#conta-criar').addEventListener('click', () => entrarNaConta(true));
  $('#conta-sync').addEventListener('click', () => sincronizarAgora({ avisar: true }));
  $('#conta-sair').addEventListener('click', async () => {
    if (!confirm('Sair da conta neste aparelho? Seus dados continuam aqui e na conta; só param de sincronizar.')) return;
    await conta.sair(servidor());
    toast('Você saiu da conta neste aparelho.');
    renderConta();
  });
  $('#meta-nova').addEventListener('click', () => { if (!state.onboarding) iniciarMeta(); });
  $('#meta-list').addEventListener('click', async e => {
    const g = e.target.closest('[data-meta-guardar]');
    const del = e.target.closest('[data-meta-del]');
    if (g) {
      const r = prompt('Quanto você guardou pra essa meta?');
      if (r == null) return;
      const v = parseAmount(r);
      if (!v) return toast('Valor inválido.');
      await guardarEmMeta(g.dataset.metaGuardar, v);
    } else if (del) {
      const m = state.metas.find(x => x.id === del.dataset.metaDel);
      if (m && confirm(`Remover a meta ${m.nome}?`)) await salvarMetas(state.metas.filter(x => x.id !== m.id));
    }
  });
  $('#novidades-abrir').addEventListener('click', abrirNovidades);
  $('#novidades-lista').addEventListener('click', e => { const b = e.target.closest('#novidades-antigas'); if (b) alternarAntigas(b); });
  $('#perfil-aniversario').addEventListener('change', async e => {
    const v = e.target.value;
    if (v && !lerAniversario(v)) { toast('Data inválida.'); renderPerfil(); return; }
    state.perfil = { ...(state.perfil || { nome: null, apelido: null, tratamento: 'descontraido', foco: [] }), aniversario: v || null, aniversarioPerguntado: true };
    await db.setMeta('perfil', state.perfil);
    renderPerfil();
    toast(v ? 'Pronto, anotei seu aniversário.' : 'Aniversário apagado.');
  });
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
    for (const f of await db.getMeta('fila', [])) if (f.imagemId) usadas.add(f.imagemId); // print esperando explicação
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
    Object.assign(state, { compromissos, planos, perfil: perfil || null, mercado: await db.getMeta('mercado'), metas: await db.getMeta('metas', []), investimentos: await db.getMeta('investimentos', []) });
    if (cats.length === 0) {
      state.categories = DEFAULT_CATEGORIES.map(c => ({ ...c }));
      await db.putMany(db.STORES.categories, state.categories, { padrao: true });
    } else {
      // categoria nova do app (ex.: Streaming, 06/11) entra pra quem já usava, sem mexer nas que a pessoa tem
      const faltam = DEFAULT_CATEGORIES.filter(d => !cats.some(c => c.id === d.id)).map(c => ({ ...c }));
      if (faltam.length) { await db.putMany(db.STORES.categories, faltam, { padrao: true }); cats.push(...faltam); }
      const order = DEFAULT_CATEGORIES.map(c => c.id);
      state.categories = cats.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }
    Object.assign(state, { expenses, incomes, accounts: accounts.sort((a, b) => a.createdAt - b.createdAt) });
    if (settings) state.settings = { ...state.settings, ...settings };
    aplicarAcessibilidade();
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
  state.novidadesVistas = await db.getMeta('novidadesVistas').catch(() => null);
  // Primeiro acesso não precisa de aviso: tudo é novidade. Marca a versão atual como vista.
  if (!state.perfil && !state.novidadesVistas) { state.novidadesVistas = VERSAO_APP; db.setMeta('novidadesVistas', VERSAO_APP).catch(() => {}); }
  renderAvisoNovidade();
  render();
  irPara(location.hash.slice(1));
  // Primeiro acesso: o C.A.O.S. se apresenta e conhece a pessoa
  if (!state.perfil) iniciarOnboarding();
  else { await parabensSeForODia(); await perguntarAniversarioUmaVez(); }
  $('#install-hint').textContent = installHint();

  const today = toISODate();
  const closing = detectMonthClose({ expenses: state.expenses, categories: state.categories, currentMonth: monthKey(today) });
  // ao abrir, o C.A.O.S. olha o radar: o alerta mais grave entra na fila junto com as boas-vindas
  const radar = analyze(dados(), today).slice(0, 1).map(a => ({ ...a, radar: true }));
  narrate([...closing, ...radar, { type: 'boas_vindas' }]);
  if ($('#caos-line').textContent === 'Iniciando…') $('#caos-line').textContent = 'De olho nos seus gastos. Toque aqui pra conversar.';
  pintarOlho();

  // Conta: liga o registro de mudanças, sincroniza ao abrir, quando a internet volta, ao voltar pro app e a cada minuto
  if (await conta.contaAtual().catch(() => null)) db.setRastrear(true);
  db.setAoMarcar(sincronizarLogo);
  renderConta();
  sincronizarAgora();
  window.addEventListener('online', () => sincronizarAgora());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sincronizarAgora(); });
  setInterval(() => { if (!document.hidden) sincronizarAgora(); }, 60_000);

  db.requestPersistence();
  limparFotosOrfas();
  atualizarMercado().then(processarFila);
  window.addEventListener('online', () => atualizarMercado().then(processarFila));
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW não registrado', err));
  }
}

init();
