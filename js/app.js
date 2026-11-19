// UI: liga a tela ao motor, à persistência e ao narrador.
// Só este arquivo (via db.js) grava dados. O C.A.O.S. só sugere; quem confirma é a pessoa.

import { normalizarApelido } from './sincronia.js';
import { intensidade } from './caos/emocoes.js';
import * as db from './db.js';
import {
  DEFAULT_CATEGORIES, INCOME_SOURCES, BANKS, formatBRL, parseAmount, parseSignedAmount, toISODate, monthKey,
  shiftMonth, monthLabel, createExpense, createIncome, createAccount, summarizeMonth, detectExpenseEvents,
  detectMonthClose, incomeIn, accountBalance, accountLabel, totalBalance, analyze,
  TIPOS_COMPROMISSO, createCompromisso, situacaoCompromissos, createPlano, analisarPlanejamento, sugerirCategoria, validarBackup, lerAniversario, idadeDe, faixaEtaria, ehAniversario, createCartao, faturaDoCartao, createMeta, progressoMeta, guardarNaMeta, lerMesAlvo,
  TIPOS_INVESTIMENTO, createInvestimento, atualizarInvestimento, resumoInvestimentos,
  valorProprio, dividirIgual, juntarNomes, serieMensal, gastoPorDia, createTransferencia, TIPOS_CONTA, FORMAS_PAGAMENTO, agruparPorBanco, comReforco, aReceber, marcarRecebido, mensagemCobranca, calendarioOfensiva, editarLancamento, depoisDoSaldo, folgaDoPiso, diferencaDoSaldo, fatoDaSemana, podeGastar, resumoEntradas, progressoOrcamentoDiario, mascaraCentavos, valorForaDoComum, editarConta, rendimentoEstimado, raioXCartao, simularCompra, ofensiva, MARCOS_OFENSIVA,
} from './engine.js';
import { reagir, conversar, falaAvulsa, MOODS, DEFAULT_MOOD, CAOS_VERSAO, SUGESTOES, IDENTIDADE, memoriaInicial, emocaoDoMomento, rostoAvulso, rostoEspantado, nomeAlerta, diaEspecial , comoChamar } from './caos/index.js';
import { extrairNome, textoMeta, calcularJuros, categoriaPeloNome } from './caos/conversa.js';
import { GLOSSARIO, ATUALIZADO_EM, GLOS_TEMAS, temaDoTermo } from './caos/glossario.js';
import { fraseDoPrint, resumoDoPrint } from './caos/ofertas.js';
import { corCategoria, corFonte, corForma, temaBanco } from './cores.js';
import { NUCLEO } from './caos/nucleo.js';
import { NOVIDADES, VERSAO_APP, temNovidade, partesDoItem } from './novidades.js';
import { calar, falar, vozDisponivel, ditadoDisponivel, ouvir, pararDeOuvir, setVelocidade, definirServidorDaVoz, definirOuvinteDaFala, destravarAudio, testarVoz } from './voz.js';
import * as imagens from './imagens.js';
import * as ia from './ia.js';
import * as lembretes from './notificacoes.js';
import * as conta from './conta.js';
import { criarAvatar, formaPara, configurarAvatar, FORMAS, rostoDaForma } from './avatar.js';
import { abrirBoasVindas } from './telas/tour.js';

import { $, esc, cap, centsToInput, SERVIDOR_PADRAO, state, dados, catById, srcById, definirRender } from './estado.js';
import { addMsg, confirmarAcao, enviarPergunta, fotoNoChat, ligarTeclado, processarFila, renderChat, tirarAnexo } from './telas/chat.js';
import { abrirEditarConta, acaoInvestimento, bancosAbertos, compraNoCartao, contasAbertas, informarCdi, marcarFaturaPaga, mostrarCamposConta, onAddAccount, onAddCartao, onAddInvestimento, onRemoveAccount, onTransferir, onUpdateAccount, opcoesDeConta, raioXAberto, renderContas, renderFormConta, renderInvestimentos, salvarConta } from './telas/contas.js';
import { guardarEmMeta, iniciarMeta, lancarCompromisso, marcarPlano, onAddCompromisso, onAddPlano, onSimular, prepararFormCompromisso, removerCompromisso, removerPlano, renderMes, renderMetas, salvarMetas } from './telas/mes.js';
import { exportarCSV, exportarPDF, filtroDeBusca, grafico, lancamentosDoMes, marcarSeg, renderGraficos, renderMeses, renderRitmo, renderRosca } from './telas/analise.js';
import { editar, lerFotoComIA, limparFoto, mostrarFoto, onDelete, onFoto, onSubmit, perguntarContaDoPix, previaParcelas, previaRacha, renderLancar, salvarEdicao, verFoto } from './telas/lancar.js';
import { abrirLimiteDiario, atalho, fecharGuia, guiar, hojeNaoGastei, mostrarEntradas, recebi, renderAReceber, renderComece, renderHoje, renderOfensiva, renderPainel, renderPodeGastar, renderResumoEntradas, renderUltimos, salvarLimiteDiario } from './telas/inicio.js';
import { ESTILO_DESC, FOCO_DESC, abrirNovidades, alternarAntigas, alternarEstudio, comecarDoZero, exportBackup, importBackup, montarInfoCaos, onBudgetChange, onRemindTime, onRemindToggle, renderAvisoNovidade, renderBudgets, renderCalculadora, renderGlossario, renderSettings, zerarSaldosDosBancos } from './telas/ajustes.js';

definirRender(render);

// ======================================================================
// Narrador
// ======================================================================

export function guardarMemoria(memoria) {
  state.caosMemory = memoria;
  db.setMeta('caosMemory', memoria).catch(console.error);
}

// ---------- Rosto animado (sistema do Perfil JF) ----------

export function setRosto(el, r) {
  if (!el || !r) return;
  el._rosto = r;
  el.dataset.emo = r.emo;
  el.dataset.fl = r.quadros.some(q => [...q].length > 11) ? '1' : '';
  el.style.setProperty('--emo-cor', r.cor);
  el.style.setProperty('--emo-bg', r.bg);
  el.textContent = r.quadros[0];
}

/** Pinta o rosto do momento no balão da tela inicial e no topo da conversa. */
// ---------- Avatares (JF, 13/11: "cadê os avatares?") ----------
// Um avatar por lugar (Início, topo da conversa, painel do computador, susto do valor). Se der erro, os rostinhos de
// texto continuam (3ª lei: problema no C.A.O.S. nunca trava o app).
export const avatares = {};
function ligarAvatares() {
  try {
    configurarAvatar({ menosMovimento: () => MENOS_MOVIMENTO.matches });
    for (const [nome, sel, tamanho] of [['caos', '#caos-avatar', 'pequeno'], ['chat', '#chat-avatar', 'pequeno'], ['painel', '#painel-avatar', 'medio'], ['espanto', '#espanto-avatar', 'pequeno']]) {
      const el = $(sel);
      if (el) avatares[nome] = criarAvatar(el, { tamanho });
    }
    document.body.classList.add('tem-avatar');
  } catch (e) {
    console.warn('avatar', e);
  }
}
// Palco (JF, 14/11: "quando clicar no avatar, ele expandir pra aparecer na tela, pra gente poder interagir").
// Tocar no avatar grande = cutucão: ele troca de forma e reage. Os botões mandam a pergunta pra conversa.
// JF, 14/11: pulava de forma sem lógica (zen → sonolento → anjinho…). Agora é uma escada: brinca, cansa, se estressa.
// Parou de cutucar uns 20 s, ele volta ao normal.
const CUTUCAO_ESCADA = [
  { ate: 3, balde: 'cutucar', formas: ['surpreso', 'feliz', 'envergonhado'] },
  { ate: 6, balde: 'cutucar_cansado', formas: ['desconfiado', 'decepcionado', 'desconfiado'] },
  { ate: Infinity, balde: 'cutucar_bravo', formas: ['bronca', 'perturbado'] },
];
const cutucoes = { n: 0, em: 0 };
let palcoTimer = null;
function ligarPalco() {
  const dlg = $('#palco-dialog');
  const btn = $('#chat-avatar-btn');
  if (!dlg || !btn) return;
  btn.addEventListener('click', () => {
    if (!avatares.palco) {
      try { avatares.palco = criarAvatar($('#palco-avatar'), { tamanho: 'grande' }); } catch (e) { console.warn('avatar', e); }
    }
    const forma = formaPara({ rosto: emocaoDoMomento(state.caosMemory, state.settings.mood).rosto });
    avatares.palco?.mostrar(forma, { imediato: true });
    $('#palco-forma').textContent = nomeForma(forma);
    $('#palco-fala').textContent = 'Me cutuca que eu reajo!';
    dlg.showModal();
  });
  $('#palco-avatar-btn').addEventListener('click', () => {
    const agora = Date.now();
    if (agora - cutucoes.em > 20_000) cutucoes.n = 0;
    cutucoes.n += 1; cutucoes.em = agora;
    const degrau = CUTUCAO_ESCADA.find(d => cutucoes.n <= d.ate);
    const forma = degrau.formas[(cutucoes.n - 1) % degrau.formas.length];
    avatares.palco?.mostrar(forma);
    $('#palco-forma').textContent = nomeForma(forma);
    const r = falaAvulsa(degrau.balde, {}, { mood: state.settings.mood, memory: state.caosMemory, perfil: state.perfil });
    if (r.texto) {
      guardarMemoria(r.memoria);
      $('#palco-fala').textContent = r.texto;
      avatares.palco?.falando(true);
      clearTimeout(palcoTimer);
      palcoTimer = setTimeout(() => avatares.palco?.falando(false), Math.min(2600, 600 + r.texto.length * 45));
      if (state.settings.voice) falar(r.texto);
    }
  });
  dlg.querySelector('.palco-acoes').addEventListener('click', e => {
    const b = e.target.closest('[data-pergunta]');
    if (!b) return;
    dlg.close();
    enviarPergunta(b.dataset.pergunta);
  });
  dlg.addEventListener('close', () => { clearTimeout(palcoTimer); avatares.palco?.falando(false); });
}

/** Mexe a boca dos avatares por um tempinho (enquanto ele "fala"). */
let falaTimer = null;
// 2.1.7 (JF, 17/11): com a voz ligada, a boca acompanha a fala de verdade (do começo ao fim, e com a voz natural, no
// volume de cada instante). O tempo fixo do avatarFala só vale com a voz desligada.
let falandoVoz = false;
const avataresQueFalam = () => ['caos', 'chat', 'painel', 'palco'].map(k => avatares[k]).filter(Boolean);
function ligarBocaNaVoz() {
  definirServidorDaVoz(() => (state.settings.aiOn && state.settings.aiUrl ? String(state.settings.aiUrl).replace(/\/+$/, '') : null));
  definirOuvinteDaFala({
    inicio: modo => {
      falandoVoz = true;
      clearTimeout(falaTimer);
      for (const a of avataresQueFalam()) a.falando(modo !== 'nuvem'); // voz do aparelho: a boca mexe no ritmo de sempre
    },
    nivel: x => { for (const a of avataresQueFalam()) a.nivel?.(x); },
    fim: () => {
      falandoVoz = false;
      for (const a of avataresQueFalam()) { a.falando(false); a.nivel?.(null); }
    },
  });
  // iPhone: o som da voz natural só sai depois de um toque na tela
  // (17/11, voz ainda robótica no iPhone: o destrave era só no 1º toque; agora é em todo toque, e no dedo saindo da tela)
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) document.addEventListener(ev, destravarAudio, { capture: true, passive: true });
}

export function avatarFala(ms) {
  if (falandoVoz) return;
  clearTimeout(falaTimer);
  for (const k of ['caos', 'chat', 'painel']) avatares[k]?.falando(true);
  falaTimer = setTimeout(() => { for (const k of ['caos', 'chat', 'painel']) avatares[k]?.falando(false); }, ms);
}

// Bug do JF (13/11 à noite): o rostinho roxo do balão e o nome no topo ("deboche") não batiam com o avatar
// (humorista). Agora tudo segue a FORMA do avatar: o nome no topo, a etiqueta e a cor do balão.
export const nomeForma = f => (FORMAS[f]?.nome || 'calmo').replace(/^[^A-Za-zÀ-ú]+/, '').toLowerCase();
export const formaDaMsg = m => (FORMAS[m.forma] ? m.forma : m.digitando ? 'pensando' : formaPara({ rosto: m.rosto, assunto: m.assunto }));

export function pintarRosto(rosto, assunto = null) {
  const r = rosto || emocaoDoMomento(state.caosMemory, state.settings.mood).rosto
    || rostoAvulso(undefined, { mood: state.settings.mood, memory: state.caosMemory });
  const forma = formaPara({ rosto: r, assunto });
  for (const k of ['caos', 'chat', 'painel']) avatares[k]?.mostrar(forma);
  // 2.1.3.2 (JF, 16/11): o rostinho segue o avatar (antes seguia a emoção e o avatar seguia o assunto: pensador + tímido)
  const rf = rostoDaForma(forma, r);
  setRosto($('#caos-face'), rf);
  setRosto($('#chat-face'), rf);
  setRosto($('#painel-face'), rf);
  $('#caos').style.setProperty('--emo-cor', rf.cor);
  if ($('#painel-mood')) $('#painel-mood').textContent = nomeForma(forma);
  $('#caos-mood').textContent = `· ${nomeForma(forma)}`;
  $('#chat-mood').textContent = nomeForma(forma);
}

// Anima todos os rostos na tela: troca os quadros, balança de leve, treme quando bravo (como no Perfil)
const MOV_APARELHO = matchMedia('(prefers-reduced-motion: reduce)');
// "Menos movimento": o que a pessoa escolheu em Ajustes; se nunca escolheu, segue o aparelho
export const MENOS_MOVIMENTO = { get matches() { return state.settings.menosMov ?? MOV_APARELHO.matches; } };

/** Aplica letra, cores, velocidade da voz e menos movimento (Ajustes → Acessibilidade). */
function aplicarAcessibilidade() {
  const s = state.settings;
  const raiz = document.documentElement;
  raiz.dataset.letra = ['grande', 'maior'].includes(s.letra) ? s.letra : 'normal';
  if (['claro', 'escuro', 'contraste'].includes(s.tema)) raiz.dataset.theme = s.tema; else delete raiz.dataset.theme;
  raiz.dataset.estilo = ['limpo', 'direto'].includes(s.estilo) ? s.estilo : 'atual';
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

export function narrate(events, { ignoreCooldown = false } = {}) {
  const memory = ignoreCooldown ? { ...state.caosMemory, lastAt: {} } : state.caosMemory;
  const { fala, memoria } = reagir(events, { mood: state.settings.mood, memory, now: Date.now(), perfil: state.perfil });
  // ignorar cooldown nesta fala não pode apagar os cooldowns dos outros eventos
  guardarMemoria({ ...memoria, lastAt: { ...state.caosMemory.lastAt, ...memoria.lastAt } });
  if (!fala) { pintarOlho(); return null; }
  pintarRosto(fala.rosto, fala.evento);
  avatarFala(Math.min(2600, 400 + fala.texto.length * 22));
  const box = $('#caos');
  $('#caos-line').textContent = fala.texto;
  if ($('#painel-obs')) $('#painel-obs').textContent = fala.texto;
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

const TELAS = ['inicio', 'lancar', 'mes', 'conversa', 'contas', 'ajustes', 'analise'];
// Ordem da barra de baixo (12/11: o Lançar, ação mais usada, fica no meio, grande). Arrastar pro lado anda nessa ordem; Ajustes fica fora (é a engrenagem).
// barra de baixo (JF, 12/11): C.A.O.S., Contas, Lançar (meio), Mês, Início por último
const ORDEM_ABAS = ['inicio', 'contas', 'lancar', 'mes', 'conversa']; // 15/11 (Anne): Início na ponta esquerda, Chat na direita
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
    if (a.dataset.tab === (t === 'analise' ? 'inicio' : t)) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  $('#me-ajuda').hidden = t === 'conversa';
  fecharAjudaMenu();
  posicionarMeAjuda();
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
// Estúdio & Professor (fase 2 da repaginada, 13/11): glossário, calculadora, leis e linha do tempo.
// Só leitura: os textos vêm do C.A.O.S. (glossário e núcleo); a conta vem do calcularJuros dele.
// ======================================================================


 // tema escolhido nos chips do glossário ('' = todos)

// ======================================================================
// Início
// ======================================================================

export function barStyle(ratio) {
  const pct = Math.min(100, Math.round((ratio ?? 0) * 100));
  const color = ratio > 1 ? 'var(--danger)' : ratio >= 0.8 ? 'var(--warn)' : 'var(--ok)';
  return `width:${pct}%;background:${color}`;
}

// Ícones de traço no lugar dos emojis (JF, 12/11: "mais limpo"). Os símbolos ficam no <svg> do index.html.
export const ic = id => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
const CAT_COM_ICONE = new Set(['mercado', 'delivery', 'restaurante', 'transporte', 'moradia', 'contas', 'saude', 'pet', 'lazer', 'apostas', 'jogos', 'streaming', 'compras', 'roupas', 'beleza', 'joias', 'presentes', 'utilidades', 'educacao', 'outros']);
const FONTE_COM_ICONE = new Set(['salario', 'aposentadoria', 'beneficio', 'decimo', 'ferias', 'fgts', 'freela', 'rendimento', 'presente', 'outros']);
/** Ícone da categoria: as que vêm com o app têm desenho próprio; a criada pela pessoa mantém o emoji dela. */
export const icCat = c => (c && CAT_COM_ICONE.has(c.id) ? ic(`c-${c.id}`) : esc(c?.emoji ?? '') || ic('c-outros'));
export const icFonte = f => (f && FONTE_COM_ICONE.has(f.id) ? ic(`e-${f.id}`) : ic('e-outros'));
export const ICONE_FORMA = { dinheiro: 'f-dinheiro', pix: 'f-pix', debito: 'a-cartao', credito: 'a-cartao' };

const ICONE_ALERTA = {
  categoria_estourada: 'i-alerta', orcamento_80: 'i-alerta', ritmo_alto: 'e-rendimento', mes_negativo: 'i-alerta', conta_negativa: 'i-contas',
  delivery_repetido: 'c-delivery', sem_registro: 'i-relogio', compromisso_vence: 'i-mes', compromisso_atrasado: 'i-relogio', plano_do_mes: 'i-mes',
  saldo_baixo: 'i-contas', confira_banco: 'i-lupa', auditor_assinatura: 'c-streaming', cartao_limite: 'a-cartao', cartao_vence: 'a-cartao', a_receber: 'i-recibo',
};

// ---------- Painel "C.A.O.S. ao vivo" e menu lateral (13/11, repaginada do AI Studio; só aparecem no computador) ----------

// ---------- Aba Entradas do Início (15/11, JF + Anne): o mesmo cartão do gasto, mostrando o que entrou ----------

// ---------- "Dá pra gastar R$ X até o dia do salário" (15/11, ideia do Code, ok do JF) ----------

// ---------- Orçamento diário ideal (V2 do AI Studio, 13/11): o limite mora no perfil, que sincroniza ----------

/** Atalhos do Início: abre o Lançar já no modo certo (transferência mora em Contas). */
/** Entradas (15/11, JF + Anne): o mesmo relatório dos gastos (tela de Análise), só que com as entradas do mês. */

/** Últimos lançamentos (JF, 13/11): no Lançar, pra conferir, corrigir ou apagar o que acabou de anotar. */

export function render() {
  renderHoje();
  renderUltimos();
  const s = summarizeMonth(state.expenses, state.categories, state.viewMonth);
  const isCurrent = state.viewMonth === monthKey(toISODate());

  $('#month-label').textContent = cap(monthLabel(state.viewMonth));
  $('#analise-mes').textContent = monthLabel(state.viewMonth);
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

  renderPodeGastar(isCurrent);
  renderResumoEntradas();
  const inc = incomeIn(state.incomes, state.viewMonth);
  $('#stat-in').textContent = formatBRL(inc);
  // o 3º quadrinho (Sobra/Déficit) agora depende da aba: fica no renderResumoEntradas (telas/inicio.js, 16/11)
  $('#stat-bank').textContent = state.accounts.length ? saldoTxt(totalBalance(state.accounts, state.expenses, state.incomes, state.transferencias)) : '—';
  renderComece();

  renderOfensiva();
  renderAReceber();

  // Alertas (só no mês atual)
  const alertas = isCurrent ? analyze(dados()) : [];
  // 2.3.4.1 (JF, 17/11): quem já tinha cadastro descobre a pergunta do trabalho por um aviso nos Alertas
  const p = state.perfil;
  const avisoTrabalho = isCurrent && p?.apelido && !p.pulou && !p.trabalho && !p.trabalhoDispensado
    && !(p.aniversario && faixaEtaria(idadeDe(p.aniversario, toISODate())) === 'crianca');
  const totalAvisos = alertas.length + (avisoTrabalho ? 1 : 0);
  $('#alerts-card').hidden = !totalAvisos;
  $('#alert-list').innerHTML = (avisoTrabalho ? `
    <li class="baixa novo-aviso">${ic('i-conversa')}<span><strong>Novidade:</strong> bora falar do seu trabalho? Me conta com o que você trabalha, que eu te conheço melhor e dou dicas do seu jeito.
      <span class="novo-aviso-botoes"><button type="button" class="ghost small" data-trabalho="sim">Contar pro C.A.O.S.</button><button type="button" class="link-btn" data-trabalho="nao">Agora não</button></span></span></li>` : '')
    + alertas.map(a => `
    <li class="${a.severity}">${ic(ICONE_ALERTA[a.type] || 'i-alerta')}<span>${esc(cap(nomeAlerta(a)))}</span></li>`).join('');
  // 2.3.2 (JF): os alertas recolhem com um toque; fechado, fica só o título com a quantidade
  $('#alertas-conta').textContent = totalAvisos ? `(${totalAvisos})` : '';
  aplicarRecolhidos();

  const rows = s.rows.filter(r => r.spentCents > 0 || r.budgetCents > 0).sort((a, b) => b.spentCents - a.spentCents);
  // Modo Entradas (15/11): com o filtro "Entradas", a Análise vira o relatório das entradas, no mesmo formato
  const modoEntradas = state.filtroTipo === 'entrada';
  $('#tela-analise').classList.toggle('modo-entradas', modoEntradas);
  $('#analise-nome').textContent = modoEntradas ? 'Entradas' : 'Análise';
  $('#cat-titulo').textContent = modoEntradas ? 'De onde veio' : 'Por categoria';
  if (modoEntradas) {
    const doMesE = state.incomes.filter(i => i.month === state.viewMonth);
    const totalE = doMesE.reduce((t, i) => t + i.amountCents, 0);
    const porFonte = INCOME_SOURCES.map(f => ({ ...f, total: doMesE.filter(i => (i.sourceId || 'outros') === f.id).reduce((t, i) => t + i.amountCents, 0) }))
      .filter(f => f.total > 0).sort((a, b) => b.total - a.total);
    $('#cat-list').innerHTML = porFonte.length ? porFonte.map(f => `
    <li>
      <div class="cat-head"><span class="cat-nome">${esc(f.emoji)} ${esc(f.name)}</span><span class="num">${formatBRL(f.total)}</span></div>
      <div class="bar"><div class="bar-fill" style="width:${Math.round((f.total / totalE) * 100)}%;background:var(--ok)"></div></div>
    </li>`).join('') : '<li class="muted">Nenhuma entrada neste mês. Quando receber, use o botão Lançar.</li>';
    $('#res-cat').textContent = totalE ? `Total · ${formatBRL(totalE)}` : 'sem entradas';
    $('#cat-rosca').hidden = true;
    $('#cat-list').hidden = false;
  } else {
  // toque na categoria: filtra o extrato (13/11, repaginada)
  $('#cat-list').innerHTML = rows.length ? rows.map(r => `
    <li class="cat-filtra${state.filtroCat === r.id ? ' ativa' : ''}" data-filtra-cat="${esc(r.id)}" role="button" tabindex="0" aria-label="Ver lançamentos de ${esc(r.name)}">
      <div class="cat-head">
        <span style="--cor-cat:${corCategoria(r.id)}" class="cat-nome">${icCat(r)} ${esc(r.name)}</span>
        <span class="num">${formatBRL(r.spentCents)}${r.budgetCents ? `<small> / ${formatBRL(r.budgetCents)}</small>` : ''}</span>
      </div>
      ${r.budgetCents ? `<div class="bar"><div class="bar-fill" style="${barStyle(r.ratio)}"></div></div>` : ''}
    </li>`).join('') : '<li class="muted">Sem gastos ainda.</li>';
  $('#res-cat').textContent = rows[0]?.spentCents ? `${rows[0].name} · ${formatBRL(rows[0].spentCents)}` : 'sem gastos';
  marcarSeg('catvista', grafico.cat);
  $('#cat-rosca').hidden = grafico.cat !== 'rosca';
  $('#cat-list').hidden = grafico.cat === 'rosca';
  if (grafico.cat === 'rosca') renderRosca(rows);
  }

  renderGraficos();
  renderPainel();

  // Busca (ideia do AI Studio, 13/11): com algo digitado, procura em todos os meses por nome, categoria ou valor
  const busca = ($('#busca')?.value || '').trim();
  const filtro = busca ? filtroDeBusca(busca) : null;
  const doMes = x => filtro ? filtro(x) : x.month === state.viewMonth;
  const lanc = [
    ...state.expenses.filter(doMes).map(e => ({ ...e, kind: 'gasto' })),
    ...state.incomes.filter(doMes).map(i => ({ ...i, kind: 'entrada' })),
    ...state.transferencias.filter(doMes).map(t => ({ ...t, kind: 'transf' })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .filter(x => (!state.filtroTipo || x.kind === state.filtroTipo) && (!state.filtroCat || x.categoryId === state.filtroCat))
    .slice(0, busca ? 100 : Infinity);
  state.extratoVisivel = lanc;
  for (const b of document.querySelectorAll('#filtro-tipo [data-tipo]')) b.setAttribute('aria-checked', String(b.dataset.tipo === (state.filtroTipo || '')));
  const catF = state.filtroCat && catById(state.filtroCat);
  $('#filtro-cat').hidden = !catF;
  if (catF) $('#filtro-cat').textContent = `${catF.name} ×`;
  $('#exp-titulo').textContent = busca ? `Busca: ${lanc.length} ${lanc.length === 1 ? 'lançamento' : 'lançamentos'}` : (state.filtroTipo === 'entrada' ? 'Entradas do mês' : 'Lançamentos do mês');
  $('#exp-empty').textContent = busca ? 'Nada encontrado. Tente outra palavra ou um valor, tipo 49,90.' : 'Nenhum lançamento neste mês.';
  $('#exp-empty').hidden = lanc.length > 0;
  $('#res-exp').textContent = `${lanc.length} ${lanc.length === 1 ? 'item' : 'itens'}`;
  $('#exp-list').innerHTML = lanc.map(x => {
    const [a, m, d] = x.date.split('-');
    const dataTxt = busca && x.month !== monthKey(toISODate()) ? `${d}/${m}/${a.slice(2)}` : `${d}/${m}`;
    const conta = x.accountId && state.accounts.find(a => a.id === x.accountId);
    if (x.kind === 'transf') {
      const de = state.accounts.find(a => a.id === x.deId), para = state.accounts.find(a => a.id === x.paraId);
      return `
      <li class="transf">
        <span class="exp-emoji" aria-hidden="true">${ic('i-transf')}</span>
        <span class="exp-main"><span>${esc(x.note || 'Transferência')}</span>
          <small>${dataTxt} · ${esc(de ? accountLabel(de) : '?')} → ${esc(para ? accountLabel(para) : '?')}</small></span>
        <span class="num muted">${formatBRL(x.amountCents)}</span>
        <button class="icon-btn del" data-del="${esc(x.id)}" data-kind="transf" aria-label="Apagar transferência">×</button>
      </li>`;
    }
    if (x.kind === 'entrada') {
      const s2 = srcById(x.sourceId);
      return `
      <li class="entrada">
        <span class="exp-emoji" aria-hidden="true">${icFonte(s2)}</span>
        <span class="exp-main"><span>${esc(x.note || s2?.name || 'Entrada')}</span>
          <small>${dataTxt} · entrada${conta ? ` · ${esc(accountLabel(conta))}` : ''}</small></span>
        <span class="num">+${formatBRL(x.amountCents)}</span>
        <button class="icon-btn edit" data-edit="${esc(x.id)}" data-kind="entrada" aria-label="Editar entrada">${ic('i-editar')}</button>
        <button class="icon-btn del" data-del="${esc(x.id)}" data-kind="entrada" aria-label="Apagar entrada">×</button>
      </li>`;
    }
    const c = catById(x.categoryId);
    return `
    <li>
      <span class="exp-emoji cat" style="--cor-cat:${corCategoria(c?.id)}" aria-hidden="true">${icCat(c)}</span>
      <span class="exp-main"><span>${esc(x.note || c?.name || x.categoryId)}</span>
        <small>${dataTxt}${x.note && c ? ` · ${esc(c.name)}` : ''}${conta ? ` · ${esc(accountLabel(conta))}` : ''}${x.forma && !conta ? ` · ${esc(FORMAS_PAGAMENTO[x.forma].slice(2).trim())}` : ''}${x.parcelas > 1 ? ` · ${x.parcelas}x de ${formatBRL(Math.floor(x.amountCents / x.parcelas))}` : ''}
        ${x.imageId ? `<button class="thumb-btn" data-photo="${esc(x.imageId)}" aria-label="Ver foto">${ic('i-foto')}</button>` : ''}</small></span>
      <span class="num">${x.racha ? `<span title="Sua parte">${formatBRL(valorProprio(x))}</span><small class="racha-tag">${ic('i-dividir')} de ${formatBRL(x.amountCents)}</small>` : formatBRL(x.amountCents)}</span>
      <button class="icon-btn edit" data-edit="${esc(x.id)}" data-kind="gasto" aria-label="Editar gasto">${ic('i-editar')}</button>
      <button class="icon-btn del" data-del="${esc(x.id)}" data-kind="gasto" aria-label="Apagar gasto">×</button>
    </li>`;
  }).join('');
}

// ---------- Arrastar pro lado troca de aba (JF, 07/11) ----------
let ladoPendente = null;
const NAO_ARRASTA = 'input, textarea, select, dialog, .chips.scroll, .chat-bar, .me-ajuda, .ajuda-menu, [data-sem-arrastar]';

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


/** Se o lançamento de agora acendeu o dia e bateu um marco (3, 7, 14, 30…), o C.A.O.S. comemora. */

/** Pergunta em qual conta o Pix do amigo caiu. Devolve o id, '' (sem conta) ou null (cancelou). */


// ---------- Transferência entre contas (13/11, repaginada) ----------


// ======================================================================
// Lançar (gasto ou entrada)
// ======================================================================


// ---------- Gráficos (13/11): SVG feito à mão, sem biblioteca e sem internet ----------

/** 6 meses: "Comparar" (entradas x gastos) ou "Saldo" (entradas − gastos, pra cima ou pra baixo do zero). */

/** Ritmo do mês: "Acumulado" (gasto somado x linha ideal) ou "Por dia" (gasto de cada dia x média ideal por dia). */

/** Rosca das categorias: cada fatia filtra o extrato ao tocar (mesma ação da lista). */

/** Exportar CSV (13/11, repaginada): o que está na lista agora, com ; e BOM (abre certinho no Excel e nas planilhas). */
/** Todos os lançamentos do mês que está na tela (gastos, entradas e transferências), do mais antigo pro mais novo. */

/** PDF do mês (V2 do AI Studio, 13/11): monta um resumo limpo e abre a impressão do navegador ("Salvar como PDF"). */

/** Filtro da busca: palavra no nome/categoria/fonte/conta, ou valor ("49,90", "50" acha 50,00 e 50,xx). */


/** Grava um gasto (do formulário ou de uma proposta do C.A.O.S. confirmada). Devolve os eventos. */

/** JF, 14/11: lançamento com data de antes do saldo informado já está dentro dele; avisa que o saldo não mudou. */

/** A IA lê a foto e PREENCHE o formulário. Nada é salvo até a pessoa tocar em Adicionar. */

/** Editar lançamento (13/11): janelinha com valor, data, descrição e categoria (ou fonte). */

// ======================================================================
// Conversa com o C.A.O.S.
// ======================================================================


 // pergunta → { texto, em }: some quando o app fecha

// ---------- Metas montadas junto (1.8.0) ----------
// O C.A.O.S. pergunta (pra quê, quanto, quanto já tem, até quando) e PROPÕE; a meta só é gravada no Confirmar (1ª lei).


// ---------- "Amanhã eu trago": perguntas que precisam do servidor ----------


/** Guarda uma pergunta que ele não soube responder (até 10, sem repetir). Devolve true se guardou. */

/** Responde o que ficou na fila, quando o servidor estiver ao alcance; entrega na conversa e no balão. */

/** "Explica esse print": a pessoa pediu, então a imagem vai pro servidor; sem conexão, fica na fila (a foto fica no aparelho). */

/** Print de oferta (13/11): a IA lê loja, preço, parcelas e frete; vira a mesma frase que a pessoa escreveria. */

// ======================================================================
// Contas
// ======================================================================


// ---------- Investimentos (app 1.8, ideia do Bruno Levanti) ----------


document.addEventListener('toggle', e => {
  const d = e.target;
  if (d.dataset?.contaDet) d.open ? contasAbertas.add(d.dataset.contaDet) : contasAbertas.delete(d.dataset.contaDet);
}, true);

// ---------- Raio-X do banco (JF, 13/11): toca no banco e vê o que é cada conta e de onde vem o limite do cartão ----------

/** Janelinha de editar conta: tipo, cartão que o cofrinho reforça, % do CDI e pra quem é. */

/** "Lançar compra neste cartão" (V2 do AI Studio, 13/11): abre o Lançar já no crédito e com o cartão escolhido. */

/** "Paguei a fatura" (12/11): a fatura fechada sai do limite usado. Só a pessoa marca; vencer não é pagar. */

/** <option>s de conta agrupadas por banco, em ordem alfabética, cada uma dizendo o que é (12/11). */

// ======================================================================
// Ajustes
// ======================================================================


const saveSettings = () => db.setMeta('settings', state.settings);

// ---------- Blocos e privacidade (14/11, teste da Anne: "rola sem fim, não sei por onde começar, e qualquer um que

export const saldoVisivel = () => !!state.settings.mostrarSaldos;
export const saldoTxt = c => (saldoVisivel() ? formatBRL(c) : 'R$ ••••');
export function pintarOlhos() {
  for (const b of document.querySelectorAll('[data-olho]')) {
    b.setAttribute('aria-pressed', String(saldoVisivel()));
    b.setAttribute('aria-label', saldoVisivel() ? 'Esconder saldos' : 'Mostrar saldos');
    b.querySelector('use')?.setAttribute('href', saldoVisivel() ? '#i-olho' : '#i-olho-fechado');
  }
}
function ligarBlocos() {
  // Blocos de foco (JF, 14/11, Mês e Contas): abriu um, os outros do mesmo painel somem até ele fechar
  for (const d of document.querySelectorAll('.painel-blocos > details')) {
    d.addEventListener('toggle', () => {
      const painel = d.parentElement;
      if (d.open) for (const o of painel.querySelectorAll(':scope > details[open]')) if (o !== d) o.open = false;
      painel.classList.toggle('focado', !!painel.querySelector(':scope > details[open]'));
      if (d.open) d.scrollIntoView({ behavior: MENOS_MOVIMENTO.matches ? 'auto' : 'smooth', block: 'nearest' });
    });
  }
  for (const d of document.querySelectorAll('details[data-bloco]:not(.tile-bloco)')) {
    const id = d.dataset.bloco;
    const guardado = state.settings.blocos?.[id];
    if (typeof guardado === 'boolean') d.open = guardado;
    d.addEventListener('toggle', () => {
      state.settings.blocos = { ...(state.settings.blocos || {}), [id]: d.open };
      saveSettings();
    });
  }
  document.addEventListener('click', e => {
    const olho = e.target.closest('[data-olho]');
    if (olho) {
      state.settings.mostrarSaldos = !saldoVisivel();
      saveSettings();
      pintarOlhos();
      render();
      renderContas();
      return;
    }
    const tile = e.target.closest('[data-abre]');
    if (tile) {
      const d = document.getElementById(tile.dataset.abre);
      if (d) { d.open = true; d.scrollIntoView({ behavior: MENOS_MOVIMENTO.matches ? 'auto' : 'smooth', block: 'start' }); }
    }
  });
  pintarOlhos();
}

/** "Comece por aqui" (Anne, 14/11 e 15/11): 5 passos; cada um leva até o lugar e explica num balão (o guia). */


// ======================================================================
// Mês: compromissos e planejamento (1.3.0)
// ======================================================================


/** Simulador "E se eu comprar?" (13/11): só leitura, não grava nada. */

// ======================================================================
// Primeiro acesso: o C.A.O.S. conhece a pessoa (1.3.0)
// ======================================================================

const FOCOS = ['Controlar o dia a dia', 'Sair do vermelho', 'Juntar dinheiro', 'Organizar contas e planos', 'Entender investimentos'];

export function renderPerfil() {
  const p = state.perfil;
  const idade = idadeDe(p?.aniversario, toISODate());
  $('#perfil-resumo').textContent = p?.apelido
    ? `O C.A.O.S. te chama de ${p.apelido}${p.nome && p.nome !== p.apelido ? ` (${p.nome})` : ''}, num jeito ${p.tratamento === 'formal' ? 'mais formal' : 'descontraído'}.${idade != null ? ` ${idade} anos.` : ''}${p.foco?.length ? ` Foco: ${p.foco.join(', ').toLowerCase()}.` : ''}${p.trabalho ? ` Trabalho: ${p.trabalho}${p.empresaRamo ? ` (${p.empresaRamo})` : ''}.` : ''}`
    : 'O C.A.O.S. ainda não te conhece.';
  $('#perfil-aniversario').value = p?.aniversario || '';
  $('#perfil-aniversario').max = toISODate();
  $('#perfil-chamar').value = comoChamar(p) || '';
  ajustarPelaIdade();
}

/**
 * 2.3.3 (JF): "o aplicativo se adapta de acordo com a sua idade". A faixa vai pro <html data-idade> (o CSS cuida do
 * resto): criança não vê cartão de crédito (a não ser que diga que já tem); 60+ ganha letra e botões maiores, uma vez
 * só e avisando (dá pra mudar em Ajustes).
 */
function ajustarPelaIdade() {
  const idade = idadeDe(state.perfil?.aniversario, toISODate());
  const faixa = idade == null ? null : faixaEtaria(idade);
  const raiz = document.documentElement;
  if (faixa) raiz.dataset.idade = faixa; else delete raiz.dataset.idade;
  raiz.dataset.cartao = state.settings.mostrarCartao || state.accounts.some(a => a.tipo === 'cartao') ? 'sim' : 'nao';
  $('#cartao-crianca').hidden = faixa !== 'crianca';
  $('#mostrar-cartao').checked = !!state.settings.mostrarCartao;
  if (faixa === 'senior' && !state.settings.idadeAjustada) {
    state.settings.idadeAjustada = true;
    if (!['grande', 'maior'].includes(state.settings.letra)) state.settings.letra = 'grande';
    saveSettings();
    aplicarAcessibilidade();
    toast('Deixei a letra e os botões maiores pra ficar mais fácil. Se preferir, dá pra mudar em Ajustes → Acessibilidade.');
  }
}

// ---------- Me ajuda: o C.A.O.S. guia (1.5) ----------
const AJUDAS = [
  'Como lanço um gasto?', 'Como registro meu cartão?', 'Como ponho orçamento?', 'Como adiciono uma conta?',
  'Como planejo o mês?', 'Como mando foto do comprovante?', 'Como ligo os lembretes?', 'Como faço backup?',
  'Como instalo o app?', 'Explica um print do banco', 'O que você pode fazer?',
];

// ---------- Botão "Me ajuda" (JF, 13/11) ----------
// Pedido do JF: um formato só (antes encolhia pro "?" ao rolar e voltava, e isso incomodava), dá pra arrastar pra
// qualquer canto (o app lembra onde ficou) e o toque abre um menuzinho de ajuda rápida. Não vai pro cabeçalho: o pedido
// do JF vem antes da sugestão do Code. No computador ele mora no menu lateral e não arrasta.
// cada item com uma cor e um ícone (JF, 13/11 à noite: "cada um de uma cor, mais intuitivo, sem exagero")
// 16/11 (JF): pra quem está começando, o "?" também leva direto pra adicionar conta, cartão, lançar e transferir
// (guia leva até o lugar e explica num balão, igual o passo a passo). As perguntas vão pro Chat.
const AJUDA_RAPIDA = [
  { guia: 'banco', t: 'Adicionar banco ou conta', ic: 'i-contas', cor: 'var(--ok)' },
  { guia: 'cartao', t: 'Adicionar cartão de crédito', ic: 'a-cartao', cor: 'var(--violet)' },
  { guia: 'gasto', t: 'Lançar um gasto', ic: 'i-gasto', cor: 'var(--warn)' },
  { guia: 'entrada', t: 'Lançar uma entrada', ic: 'i-entrada', cor: 'var(--accent)' },
  { guia: 'transferir', t: 'Transferir entre contas', ic: 'i-transf', cor: 'var(--cyan)' },
  { guia: 'conta', t: 'Criar meu login no app', ic: 'i-ajustes', cor: 'var(--indigo)' },
  { q: 'Quanto gastei este mês?', ic: 'i-lupa', cor: 'var(--cyan)' },
  { q: 'Como ponho orçamento?', ic: 'i-meta', cor: 'var(--warn)' },
  { q: 'O que você pode fazer?', ic: 'i-conversa', cor: 'var(--caos)' },
  { tour: true, t: 'Tutorial do app (passo a passo)', ic: 'i-livro', cor: 'var(--accent)' }, // 17/11 (JF): o C.A.O.S. guia turístico
];
const telaGrande = () => window.matchMedia('(min-width: 1024px)').matches;

function posicionarMeAjuda() {
  const b = $('#me-ajuda');
  const p = state.settings?.meAjudaPos;
  if (!p || telaGrande()) { b.style.left = b.style.top = b.style.right = b.style.bottom = ''; return; }
  // guarda em fração da tela, pra continuar no mesmo canto se o celular girar
  const w = b.offsetWidth || 120, h = b.offsetHeight || 44;
  const x = Math.min(Math.max(8, p.x * innerWidth), innerWidth - w - 8);
  // JF, 14/11: pode ir pra qualquer canto, mas nunca em cima da barra de baixo (Lançar, abas)
  const barra = $('.tabbar')?.getBoundingClientRect();
  const fundo = barra && barra.height ? Math.min(innerHeight, barra.top) : innerHeight;
  // JF, 16/11: nem em cima do cabeçalho e da barra do relógio (o limite era 8px da borda e ele foi parar no relógio)
  const cabecalho = [...document.querySelectorAll('.topbar')].map(t => t.getBoundingClientRect()).find(r => r.height > 0);
  const topo = Math.max(8, cabecalho ? cabecalho.bottom + 8 : 0, 56);
  let y = Math.min(Math.max(topo, p.y * innerHeight), fundo - h - 8);
  // 2.3.2.2 (JF: "o botão de ajuda cobrindo o Lançar pode dar problema"): a bola do Lançar sobe acima da barra; se o
  // botão cair em cima dela, ele sobe pra ficar logo acima
  const bola = document.querySelector('.tab-inicio-bola')?.getBoundingClientRect();
  if (bola && bola.width && x < bola.right + 8 && x + w > bola.left - 8 && y + h > bola.top - 8) y = Math.max(topo, bola.top - h - 12);
  Object.assign(b.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
}

// 2.3.2.2 (JF): o menu abre e fecha com animação, saindo do botão
let fechandoMenu = null;
function fecharAjudaMenu() {
  const m = $('#ajuda-menu'), b = $('#me-ajuda');
  b.setAttribute('aria-expanded', 'false');
  b.classList.remove('aberto');
  for (const x of m.querySelectorAll('.escolhido')) x.classList.remove('escolhido');
  if (m.hidden) return;
  if (MENOS_MOVIMENTO.matches) { m.hidden = true; return; }
  m.classList.remove('abrindo');
  m.classList.add('fechando');
  clearTimeout(fechandoMenu);
  fechandoMenu = setTimeout(() => { m.hidden = true; m.classList.remove('fechando'); }, 160);
}

function abrirAjudaMenu() {
  const b = $('#me-ajuda'), m = $('#ajuda-menu');
  clearTimeout(fechandoMenu);
  m.classList.remove('fechando');
  m.hidden = false;
  b.setAttribute('aria-expanded', 'true');
  b.classList.add('aberto');
  // abre pro lado que tem espaço: em cima se o botão está embaixo, e alinhado ao lado mais perto da borda
  const r = b.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
  const top = r.top > innerHeight / 2 ? r.top - mh - 8 : r.bottom + 8;
  const left = r.left + r.width / 2 > innerWidth / 2 ? r.right - mw : r.left;
  Object.assign(m.style, { top: `${Math.max(8, top)}px`, left: `${Math.min(Math.max(8, left), innerWidth - mw - 8)}px` });
  // a animação cresce a partir do canto onde está o botão
  m.style.transformOrigin = `${left > innerWidth / 2 - mw / 2 ? 'right' : 'left'} ${top < r.top ? 'bottom' : 'top'}`;
  m.classList.remove('abrindo'); void m.offsetWidth; m.classList.add('abrindo');
  m.querySelector('button')?.focus({ preventScroll: true });
}

function ligarMeAjuda() {
  const b = $('#me-ajuda'), m = $('#ajuda-menu');
  m.innerHTML = AJUDA_RAPIDA.map(a => a.tour
    ? `<button type="button" role="menuitem" data-tour-abrir style="--cor-item:${a.cor}">${ic(a.ic)}<span>${esc(a.t)}</span></button>`
    : a.guia
    ? `<button type="button" role="menuitem" data-guia="${a.guia}" data-ajuda style="--cor-item:${a.cor}">${ic(a.ic)}<span>${esc(a.t)}</span></button>`
    : `<button type="button" role="menuitem" data-q="${esc(a.q)}" style="--cor-item:${a.cor}">${ic(a.ic)}<span>${esc(a.q)}</span></button>`).join('')
    + `<button type="button" role="menuitem" data-q="" class="ajuda-tudo">${ic('i-livro')}<span>Ver toda a ajuda</span></button>`;
  // 2.3.2.2 (JF: "evitar os curiosos passeando sem rumo"): no toque, o 1º escolhe (fica aceso, com "toque de novo pra
  // abrir") e o 2º abre. Pelo teclado (Enter/espaço) abre direto. Fica na fase de captura pra segurar os outros cliques.
  m.insertAdjacentHTML('afterbegin', '<p class="ajuda-dica" aria-hidden="true">Toque pra escolher, toque de novo pra abrir</p>');
  m.addEventListener('click', e => {
    const it = e.target.closest('button');
    if (!it || e.detail === 0 || it.classList.contains('escolhido')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    for (const x of m.querySelectorAll('.escolhido')) x.classList.remove('escolhido');
    it.classList.add('escolhido');
  }, true);
  let ini = null, arrastou = false;
  b.addEventListener('pointerdown', e => {
    if (telaGrande() || e.button > 0) return;
    const r = b.getBoundingClientRect();
    ini = { x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top };
    arrastou = false;
    b.setPointerCapture(e.pointerId);
  });
  b.addEventListener('pointermove', e => {
    if (!ini) return;
    if (!arrastou && Math.hypot(e.clientX - ini.x, e.clientY - ini.y) < 8) return; // tremidinha do dedo é toque, não arrasto
    arrastou = true;
    fecharAjudaMenu();
    b.classList.add('arrastando');
    state.settings.meAjudaPos = { x: (e.clientX - ini.dx) / innerWidth, y: (e.clientY - ini.dy) / innerHeight };
    posicionarMeAjuda();
  });
  const soltar = () => {
    if (!ini) return;
    ini = null;
    b.classList.remove('arrastando');
    if (arrastou) saveSettings();
  };
  b.addEventListener('pointerup', soltar);
  b.addEventListener('pointercancel', soltar);
  b.addEventListener('click', e => {
    if (arrastou) { arrastou = false; e.preventDefault(); return; }
    if (m.hidden) abrirAjudaMenu(); else fecharAjudaMenu();
  });
  m.addEventListener('click', e => {
    if (e.target.closest('[data-guia]')) { fecharAjudaMenu(); return; } // o guia abre pelo clique geral de [data-guia]
    if (e.target.closest('[data-tour-abrir]')) { fecharAjudaMenu(); return; } // o tutorial abre pelo clique geral
    const q = e.target.closest('button[data-q]');
    if (!q) return;
    fecharAjudaMenu();
    if (!q.dataset.q) return meAjuda();
    location.hash = 'conversa';
    enviarPergunta(q.dataset.q);
  });
  document.addEventListener('pointerdown', e => { if (!m.hidden && !e.target.closest('.ajuda-menu, .me-ajuda')) fecharAjudaMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !m.hidden) { fecharAjudaMenu(); b.focus(); } });
  window.addEventListener('resize', posicionarMeAjuda);
  posicionarMeAjuda();
}

function meAjuda() {
  location.hash = 'conversa';
  const nome = comoChamar(state.perfil);
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
  state.transferencias = await db.getMeta('transferencias', []);
  const order = DEFAULT_CATEGORIES.map(c => c.id);
  Object.assign(state, {
    categories: cats.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)), expenses, incomes: incomes.filter(i => !i.prevista), previstas: incomes.filter(i => i.prevista),
    accounts: accounts.sort((a, b) => a.createdAt - b.createdAt), compromissos, planos, perfil: perfil || state.perfil, metas: metas || [],
  });
  // perfil chegou de outro aparelho no meio do primeiro acesso: encerra a apresentação (achado do Gemini, 12/11)
  if (perfil?.apelido && state.onboarding && !state.onboarding.unico) state.onboarding = null;
  renderLancar(); renderBudgets(); renderPerfil(); renderContas(); renderMes(); render(); renderChat();
}

function quandoFoi(ms) {
  if (!ms) return 'ainda não sincronizou';
  const d = new Date(ms);
  const hoje = toISODate() === toISODate(d);
  return `sincronizado ${hoje ? 'hoje' : d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

async function renderConta() {
  const c = await conta.contaAtual().catch(() => null);
  if (!!c !== state.temConta) { state.temConta = !!c; renderComece(); }
  ia.definirCriador(c?.token && state.perfil?.seloCriador ? c.token : null); // criador sem limite na IA (JF, 16/11)
  $('#conta-fora').hidden = !!c;
  $('#conta-dentro').hidden = !c;
  $('#conta-aviso-servidor').hidden = !!servidor();
  if (c) {
    $('#conta-nome').textContent = `Conectado como ${c.exibicao || c.apelido}`;
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

// campos: os do cartão de Ajustes (padrão) ou os da abertura (JF, 14/11: login direto na tela inicial)
async function entrarNaConta(criar, campos = { apelido: '#conta-apelido', senha: '#conta-senha', erro: '#conta-erro', entrar: '#conta-entrar', criar: '#conta-criar' }) {
  const err = $(campos.erro);
  err.hidden = true;
  const apelido = $(campos.apelido).value.trim();
  const senha = $(campos.senha).value;
  if (!servidor()) { err.textContent = 'Primeiro coloque o endereço do servidor do C.A.O.S. Finanças em "IA online e servidor".'; err.hidden = false; return false; }
  if (apelido.length < 2) { err.textContent = 'Escolha um apelido com pelo menos 2 letras.'; err.hidden = false; return false; }
  if (senha.length < 6) { err.textContent = 'A senha precisa ter pelo menos 6 letras ou números.'; err.hidden = false; return false; }
  // 2.3.5.5 (Dona Débora, 18/11: "botei o meu e-mail, que é o que eu faço em todo login, e não entra"): o apelido não
  // é e-mail; antes aparecia só "Apelido inválido."
  if (!normalizarApelido(apelido)) {
    err.textContent = apelido.includes('@')
      ? 'Aqui não vai o e-mail: o apelido é um nome curto que você inventa, tipo "debora" ou "maria.silva" (sem @ e sem espaço). Use o mesmo apelido em todos os aparelhos.'
      : 'O apelido só pode ter letras, números, ponto, traço ou sublinhado (sem espaço), de 2 a 30. Tipo "maria.silva".';
    err.hidden = false; return false;
  }
  // Troca de conta (achado do GPT, 12/11): os dados deste aparelho são de outra conta? Não manda sem perguntar.
  const dona = await conta.contaDona().catch(() => null);
  const temDados = state.expenses.length + state.incomes.length + state.accounts.length > 0;
  if (temDados && dona && dona !== (normalizarApelido(apelido) || apelido.trim().toLowerCase())) {
    const ok = confirm(`Os dados deste aparelho são da conta "${dona}". Se você entrar em "${apelido}", eles vão junto pra essa conta.\n\nQuer mesmo juntar?\n\n(Se não, toque em Cancelar, faça um backup e apague os dados em Ajustes antes de entrar.)`);
    if (!ok) return false;
  }
  const botoes = [$(campos.entrar), $(campos.criar)];
  const textos = botoes.map(b => b.textContent);
  let ok = false;
  botoes.forEach(b => { b.disabled = true; });
  (criar ? botoes[1] : botoes[0]).textContent = 'Protegendo…';
  try {
    const { exibicao: nome, criador } = await conta.entrar(servidor(), { apelido, senha, criar });
    $(campos.senha).value = '';
    ok = true;
    // selo de criador: só o servidor dá (lista de contas dele), nunca o nome digitado
    await marcarSelo(criador);
    toast(criar ? `Conta ${nome} criada! Agora seus aparelhos ficam juntos.` : `Bem-vindo de volta, ${nome}! Buscando seus dados…`);
    await sincronizarAgora({ avisar: !criar });
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  } finally {
    botoes.forEach((b, i) => { b.disabled = false; b.textContent = textos[i]; });
  }
  renderConta();
  return ok;
}

async function marcarSelo(criador) {
  if (!!state.perfil?.seloCriador === !!criador) return;
  const { seloCriador, ...resto } = state.perfil || {};
  state.perfil = criador ? { ...resto, seloCriador: true } : resto;
  await db.setMeta('perfil', state.perfil);
}

// ---------- Novidades (1.4) ----------


/** Quem já tinha cadastro sem data de aniversário: ele pergunta UMA vez na conversa. */
async function perguntarAniversarioUmaVez() {
  const p = state.perfil;
  if (!p || p.pulou || !p.apelido || p.aniversario || p.aniversarioPerguntado || state.onboarding) return;
  state.perfil = { ...p, aniversarioPerguntado: true };
  await db.setMeta('perfil', state.perfil);
  state.onboarding = { passo: 'aniversario', unico: true, dados: { apelido: p.apelido, foco: [] } };
  caosDiz('onb_aniversario', { nome: p.apelido }, ['Prefiro não dizer']);
}

// ---------- Como te chamo e quando te aviso (2.3.3, JF 17/11) ----------
// "O C.A.O.S. pergunta como a pessoa quer ser chamada: senhor, senhora, dona, seu, ou outro (até 'mestre supremo do
// universo'). Não é regra dele: cada um é chamado do jeito que quiser. E pergunta dos lembretes. Sem virar questionário:
// é educação e cuidado." Cada pergunta vem uma vez só, uma por vez.
function perguntarComoChamar(apelido, aniversario) {
  const idade = idadeDe(aniversario, toISODate());
  // pelo nome não dá pra saber se é Dona ou Seu: a pessoa escolhe
  const opcoes = idade != null && idade >= 40
    ? [apelido, `Dona ${apelido}`, `Seu ${apelido}`, 'Senhora', 'Senhor', 'Outro jeito']
    : [`${apelido} mesmo`, 'Outro jeito'];
  addMsg({ de: 'caos', texto: `${idade != null && idade >= 40 ? 'Com todo o respeito: ' : ''}como você prefere que eu te chame? Pode escolher aqui ou escrever do seu jeito.`, sugestoes: opcoes });
  if (state.settings.voice) falar('Como você prefere que eu te chame?');
}

/** O que a pessoa respondeu vira o jeito de chamar (null = o apelido mesmo). */
function escolhaDeChamar(t, apelido, livre) {
  const v = String(t || '').trim().replace(/^(me chama de|pode me chamar de|quero ser chamad[oa] de|me chame de)\s+/i, '').replace(/[.!]+$/, '').slice(0, 40);
  if (!livre && /^outro( jeito)?$/i.test(v)) return 'outro';
  if (!v || v.toLowerCase() === String(apelido).toLowerCase() || v.toLowerCase() === `${apelido} mesmo`.toLowerCase()) return null;
  return v[0].toUpperCase() + v.slice(1);
}

async function perguntarChamarUmaVez() {
  const p = state.perfil;
  if (!p || p.pulou || !p.apelido || p.chamarPerguntado || state.onboarding) return false;
  state.perfil = { ...p, chamarPerguntado: true };
  await db.setMeta('perfil', state.perfil);
  state.onboarding = { passo: 'chamar', unico: true, dados: { apelido: p.apelido, foco: [] } };
  perguntarComoChamar(p.apelido, p.aniversario);
  return true;
}

async function perguntarLembreteUmaVez() {
  const p = state.perfil;
  if (!p || p.pulou || !p.apelido || p.lembretePerguntado || state.onboarding) return false;
  const c = await lembretes.config().catch(() => null);
  state.perfil = { ...p, lembretePerguntado: true, lembreteEm: Date.now() };
  await db.setMeta('perfil', state.perfil);
  if (c?.ativo) return false;
  state.onboarding = { passo: 'lembrete', unico: true, dados: { foco: [] } };
  addMsg({ de: 'caos', texto: `${comoChamar(state.perfil)}, posso te avisar das contas pra vencer e do dinheiro pra receber? Que horário fica melhor pra você?`, sugestoes: ['De manhã (9h)', 'No almoço (12h)', 'À noite (20h30)', 'Agora não'] });
  return true;
}

// 2.3.4 (JF, 17/11): "o C.A.O.S. pode perguntar: você trabalha em quê? só pra te ajudar a organizar melhor".
// Uma vez só, numa abertura depois do lembrete, com educação e com "Prefiro não dizer". Fica só no aparelho.
const TRABALHOS = [
  ['CLT', /\b(clt|carteira assinada|registrad[oa]|empregad[oa]|funcionari[oa])\b/i, 'Com salário fixo fica mais fácil planejar: o 50/30/20 encaixa bem, e o 13º e as férias dão pra adiantar metas.'],
  ['Autônomo / freela', /\b(autonom\w*|freela\w*|bico|bicos|uber|motorista de app|diarista|prestador|conta propria)\b/i, 'Renda que varia pede um truque: nos meses bons, guarda a sobra pra cobrir os meses fracos. Me fala o que entra que eu te ajudo a achar a média.'],
  ['Tenho empresa', /\b(empresa|empresari[oa]|dono|dona|mei|negocio proprio|meu negocio|loja|comercio|empreend\w*)\b/i, null],
  ['Servidor público', /\b(servidor|servidora|concursad[oa]|funcionalismo|publico|publica)\b/i, 'Salário certinho é ótimo pra planejar. Só cuidado com o consignado: é fácil de pegar e a parcela sai antes de o dinheiro chegar.'],
  ['Aposentado(a)', /\b(aposentad[oa]|pensionista|inss)\b/i, 'Fica de olho em ligação ou mensagem oferecendo consignado ou "revisão do benefício": é o golpe mais comum com aposentados. Na dúvida, me pergunta.'],
  ['Estudante', /\b(estud\w*|faculdade|escola|universit\w*|estagi\w*)\b/i, 'Bora começar cedo! Mesmo pouquinho, guardar todo mês cria o hábito. Se tiver bolsa ou estágio, me fala o que entra que eu te ajudo a dividir.'],
];
// ordem de reconhecimento: "funcionária pública" é servidora, "dona de casa" não é dona de empresa
const DO_LAR = ['Do lar', /\b(dona de casa|do lar|cuido da casa|cuido dos filhos)\b/i, 'Cuidar da casa é trabalho, e dos grandes! Se tiver um dinheiro que entra (pensão, ajuda, um extra), me fala que eu te ajudo a organizar.'];
const ORDEM_TRABALHO = [DO_LAR, TRABALHOS[3], TRABALHOS[4], TRABALHOS[0], TRABALHOS[1], TRABALHOS[2], TRABALHOS[5]];
async function perguntarTrabalhoUmaVez({ pedido = false } = {}) {
  const p = state.perfil;
  if (!p || p.pulou || !p.apelido || (p.trabalhoPerguntado && !pedido) || state.onboarding) return false;
  const idade = idadeDe(p.aniversario, toISODate());
  state.perfil = { ...p, trabalhoPerguntado: true };
  await db.setMeta('perfil', state.perfil);
  if (idade != null && faixaEtaria(idade) === 'crianca') return false; // criança não ganha essa pergunta
  state.onboarding = { passo: 'trabalho', unico: true, dados: { foco: [] } };
  addMsg({ de: 'caos', texto: pedido ? `Bora! Me conta, ${comoChamar(state.perfil)}: você trabalha com quê? Deixa eu te conhecer um pouco melhor.` : `${comoChamar(state.perfil)}, posso te perguntar uma coisa, só pra te ajudar a organizar melhor? Você trabalha com quê?`, sugestoes: [...TRABALHOS.map(([n]) => n), 'Prefiro não dizer'], assunto: 'trabalho' });
  pintarRosto(null, 'trabalho'); // 2.3.4.3: o Colega de Trabalho
  return true;
}
async function responderTrabalho(t, o) {
  if (o.passo === 'empresa') {
    const ramo = String(t || '').trim().slice(0, 60);
    state.onboarding = null;
    state.perfil = { ...state.perfil, empresaRamo: /^(prefiro|nao|não|pular)/i.test(ramo) ? null : ramo };
    await db.setMeta('perfil', state.perfil);
    renderPerfil();
    addMsg({ de: 'caos', texto: 'Anotado! Uma dica de quem cuida de dinheiro: separa o dinheiro da empresa do seu (uma conta PJ pra ela e um pró-labore, um "salário", pra você). Aqui eu cuido do seu dinheiro pessoal; uma área só pra empresa está nos meus planos.', sugestoes: ['O que é conta PJ?', 'O que é MEI?', 'O que é fluxo de caixa?'] });
    return;
  }
  if (/prefiro|nao quero|não quero|agora nao|agora não|pular/i.test(t)) {
    state.onboarding = null;
    state.perfil = { ...state.perfil, trabalhoDispensado: true };
    await db.setMeta('perfil', state.perfil);
    render();
    addMsg({ de: 'caos', texto: 'Tudo bem, sem problema nenhum! Bora seguir.', sugestoes: SUGESTOES.slice(0, 6) });
    return;
  }
  const semAcento = String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const achado = ORDEM_TRABALHO.find(([, rx]) => rx.test(semAcento));
  const rotulo = achado ? achado[0] : String(t).trim().slice(0, 60);
  state.perfil = { ...state.perfil, trabalho: rotulo === 'Tenho empresa' ? 'Empresa própria' : rotulo };
  await db.setMeta('perfil', state.perfil);
  renderPerfil();
  render();
  if (achado?.[0] === 'Tenho empresa') {
    o.passo = 'empresa';
    addMsg({ de: 'caos', texto: 'Que massa! E a sua empresa é de quê?', sugestoes: ['Prefiro não dizer'] });
    return;
  }
  state.onboarding = null;
  addMsg({ de: 'caos', texto: `Valeu por contar! ${achado?.[2] || 'Me fala o que entra e o que sai que eu te ajudo a organizar do seu jeito.'}`, sugestoes: SUGESTOES.slice(0, 6) });
}

async function responderLembrete(t) {
  const hora = /manh|9h|9:00/i.test(t) ? '09:00' : /almo|12h|meio.?dia/i.test(t) ? '12:00' : /noite|20h|20:30|21h/i.test(t) ? '20:30' : (t.match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)?\b/) ? `${t.match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)?\b/)[1].padStart(2, '0')}:${t.match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)?\b/)[2] || '00'}` : null);
  if (!hora) {
    addMsg({ de: 'caos', texto: 'Tudo bem, sem lembrete por enquanto. Se mudar de ideia, é em Ajustes → Lembretes.', sugestoes: SUGESTOES.slice(0, 6) });
    return;
  }
  $('#remind-time').value = hora;
  const box = $('#remind-toggle');
  box.checked = true;
  await onRemindToggle({ target: box });
  addMsg({ de: 'caos', texto: box.checked
    ? `Combinado! Te aviso às ${hora.replace(':00', 'h').replace(':', 'h')}. Pra eu lembrar de uma conta, cadastra em 📅 Mês → Compromissos. Dá pra mudar o horário em Ajustes → Lembretes.`
    : `Quase: o celular não deixou eu mandar aviso (${$('#remind-status').textContent || 'permissão negada'}). Dá pra tentar de novo em Ajustes → Lembretes.`, sugestoes: SUGESTOES.slice(0, 6) });
}

/** No dia do aniversário, ele dá parabéns uma vez por ano. */
async function parabensSeForODia() {
  const p = state.perfil;
  const hoje = toISODate();
  if (!p?.aniversario || !ehAniversario(p.aniversario, hoje) || p.parabensAno === hoje.slice(0, 4)) return;
  state.perfil = { ...p, parabensAno: hoje.slice(0, 4) };
  await db.setMeta('perfil', state.perfil);
  caosDiz('aniversario', { nome: comoChamar(p) || 'pessoa querida' }, SUGESTOES.slice(0, 6));
  const ult = [...state.chat].reverse().find(m => m.de === 'caos');
  if (ult) $('#caos-line').textContent = ult.texto;
}

export function caosDiz(gatilho, vars, sugestoes) {
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

export async function onboardingResposta(t) {
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
      state.perfil = { nome: d.nome, apelido: d.apelido, chamarDe: d.chamarDe || null, chamarPerguntado: true, tratamento: d.tratamento, foco: d.foco, aniversario: d.aniversario || null, aniversarioPerguntado: true, criadoEm: Date.now() };
      state.onboarding = null;
      await db.setMeta('perfil', state.perfil);
      renderPerfil();
      const foco = d.foco.length ? d.foco.join(', ').toLowerCase() : 'cuidar da carteira no dia a dia';
      // quem quer juntar dinheiro já sai com a sugestão de montar a meta junto
      caosDiz('onb_fim', { nome: d.chamarDe || d.apelido, foco }, d.foco.includes('Juntar dinheiro') ? ['Quero montar uma meta', ...SUGESTOES.slice(0, 5)] : SUGESTOES.slice(0, 6));
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
      if (data) caosDiz('onb_aniversario_ok', { nome: comoChamar(state.perfil) }, SUGESTOES.slice(0, 6));
      else addMsg({ de: 'caos', texto: 'Tudo bem! Se mudar de ideia, é só ir em Ajustes → Seu perfil.', sugestoes: SUGESTOES.slice(0, 6) });
      return;
    }
    o.passo = 'chamar';
    perguntarComoChamar(d.apelido, d.aniversario);
  } else if (o.passo === 'chamar' || o.passo === 'chamar_outro') {
    const esc = escolhaDeChamar(t, d.apelido, o.passo === 'chamar_outro');
    if (esc === 'outro') { o.passo = 'chamar_outro'; addMsg({ de: 'caos', texto: 'Me fala como! Pode ser sério ou de brincadeira, tipo "Mestre Supremo do Universo". Eu respeito.' }); return; }
    d.chamarDe = esc;
    if (o.unico) {
      state.perfil = { ...state.perfil, chamarDe: esc, chamarPerguntado: true };
      state.onboarding = null;
      await db.setMeta('perfil', state.perfil);
      renderPerfil();
      addMsg({ de: 'caos', texto: `Combinado, ${esc || d.apelido}! Vou te chamar assim. Se quiser mudar, é só me dizer "me chama de…" ou ir em Ajustes → Seu perfil.`, sugestoes: SUGESTOES.slice(0, 6) });
      return;
    }
    o.passo = 'tratamento';
    caosDiz('onb_tratamento', { nome: esc || d.apelido }, ['Descontraído', 'Mais formal']);
  } else if (o.passo === 'trabalho' || o.passo === 'empresa') {
    await responderTrabalho(t, o);
  } else if (o.passo === 'lembrete') {
    state.onboarding = null;
    await responderLembrete(t);
  } else if (o.passo === 'tratamento') {
    d.tratamento = /formal/i.test(t) && !/descontra/i.test(t) ? 'formal' : 'descontraido';
    o.passo = 'ajuda';
    caosDiz('onb_ajuda', { nome: d.chamarDe || d.apelido }, sugestoesFoco());
  }
}

/** Lançar: o C.A.O.S. lembra a categoria pela descrição ("Uber" → Transporte). */
function sugerirPelaDescricao() {
  if (state.kind !== 'gasto') return;
  const aviso = $('#cat-sugestao');
  if (state.selectedCategory && !state.catSugerida) return;
  // 2.3.5.10 (JF): sem histórico, o nome da loja ou do produto ("C&A", "troca de óleo") já diz a categoria
  const porNome = categoriaPeloNome($('#note').value, state.categories);
  const s2 = sugerirCategoria($('#note').value, state.expenses) || (porNome && porNome !== 'outros' ? { categoryId: porNome } : null);
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

/** Notícias do dia (14/11): baixa no máximo a cada 2 horas e guarda pra mostrar offline. */
async function atualizarNoticias() {
  if (!state.settings.aiUrl || !navigator.onLine) return renderNoticias();
  const ultima = state.noticias?.baixadoEm || 0;
  if (Date.now() - ultima > 2 * 3_600_000) {
    try {
      const n = await ia.baixarNoticias(state.settings.aiUrl);
      if (Array.isArray(n?.itens) && n.itens.length) {
        state.noticias = { ...n, baixadoEm: Date.now() };
        await db.setMeta('noticias', state.noticias);
      }
    } catch { /* sem notícias ainda: fica o que já tinha */ }
  }
  renderNoticias();
}
function renderNoticias() {
  const n = state.noticias;
  const card = $('#noticias-card');
  if (!card) return;
  card.hidden = !n?.itens?.length;
  if (card.hidden) return;
  const quando = new Date(n.atualizadoEm);
  $('#res-noticias').textContent = `${n.itens.length} · ${quando.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  $('#noticias-lista').innerHTML = n.itens.map(x => `
    <li><b>${esc(x.titulo)}</b><p>${esc(x.resumo)}</p>${x.porque ? `<p class="noticia-porque">💡 ${esc(x.porque)}</p>` : ''}
      ${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.fonte || 'Fonte')} ↗</a>` : x.fonte ? `<small class="muted">${esc(x.fonte)}</small>` : ''}</li>`).join('');
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

export function toast(msg) {
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
  ligarMeAjuda();
  ligarArrastar();
  $('#caos').addEventListener('click', () => { location.hash = 'conversa'; });

  // Início
  $('#prev-month').addEventListener('click', () => { state.viewMonth = shiftMonth(state.viewMonth, -1); render(); });
  $('#next-month').addEventListener('click', () => { state.viewMonth = shiftMonth(state.viewMonth, 1); render(); });
  $('#ultimos-list').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit]');
    if (ed) return editar(ed.dataset.edit, ed.dataset.kind).catch(er => toast(er.message || 'Não deu.'));
    const b = e.target.closest('[data-del]');
    if (b) onDelete(b.dataset.del, b.dataset.kind);
  });
  $('#exp-list').addEventListener('click', e => {
    const f = e.target.closest('[data-photo]');
    if (f) return verFoto(f.dataset.photo);
    const ed = e.target.closest('[data-edit]');
    if (ed) return editar(ed.dataset.edit, ed.dataset.kind).catch(er => toast(er.message || 'Não deu.'));
    const b = e.target.closest('[data-del]');
    if (b) onDelete(b.dataset.del, b.dataset.kind);
  });

  $('#sem-gasto').addEventListener('click', hojeNaoGastei);
  // Máscara de dinheiro (JF, 13/11): os dois últimos números são centavos ("17835" vira 178,35), como nos apps de banco
  for (const id of ['#amount', '#hoje-limite', '#sim-valor', '#comp-valor', '#plan-valor', '#transf-valor', '#card-limite', '#card-usado', '#inv-aplicado', '#ed-valor', '#calc-valor']) {
    const el = $(id);
    if (!el) continue;
    el.setAttribute('inputmode', 'numeric');
    el.addEventListener('input', () => { el.value = mascaraCentavos(el.value); });
  }
  for (const id of ['#bank-balance', '#inv-atual']) { // saldo pode ser negativo: aceita o "-" na frente
    const el = $(id);
    if (el) el.addEventListener('input', () => { el.value = mascaraCentavos(el.value, { sinal: true }); });
  }
  for (const b of document.querySelectorAll('[data-atalho]')) b.addEventListener('click', () => atalho(b.dataset.atalho));
  for (const b of document.querySelectorAll('[data-resumo]')) b.addEventListener('click', () => { state.resumoModo = b.dataset.resumo; renderResumoEntradas(); });
  // 2.3.2 (JF): "clicou na área grande, aparecem os botõezinhos menores". Os detalhes começam fechados.
  const alternarDetalhes = () => { state.resumoAberto = !state.resumoAberto; aplicarRecolhidos(); };
  $('#resumo-mais').addEventListener('click', alternarDetalhes);
  $('#resumo-card').addEventListener('click', e => { if (e.target.closest('.big, .label')) alternarDetalhes(); });
  // 2.3.2.2 (JF): a Previsão do mês também recolhe
  const alternarPlano = () => { state.planAberto = !state.planAberto; aplicarRecolhidos(); };
  $('#plan-mais').addEventListener('click', alternarPlano);
  $('#plan-sobra').addEventListener('click', alternarPlano);
  $('#alertas-toggle').addEventListener('click', () => {
    state.settings.alertasFechado = !state.settings.alertasFechado;
    saveSettings();
    aplicarRecolhidos();
  });
  // Recebi (15/11): a prevista vira entrada de verdade, com a data de hoje (é quando o dinheiro caiu)
  $('#previstas-lista').addEventListener('click', async e => {
    const b = e.target.closest('[data-recebi]');
    if (!b) return;
    const p = state.previstas.find(x => x.id === b.dataset.recebi);
    if (!p) return;
    const hoje = toISODate();
    const dia = p.date < hoje ? p.date : hoje;
    const { prevista, ...resto } = p;
    const recebida = { ...resto, date: dia, month: monthKey(dia), createdAt: Date.now() };
    await db.put(db.STORES.incomes, recebida);
    state.previstas = state.previstas.filter(x => x.id !== p.id);
    state.incomes.push(recebida);
    render();
    const fala = narrate([{ type: 'entrada_cadastrada', amountCents: p.amountCents, sourceId: p.sourceId }], { ignoreCooldown: true });
    toast(fala ? fala.texto : `Recebido: ${formatBRL(p.amountCents)}.`);
  });
  // "do mês" abre o relatório: das entradas na aba Entradas, o normal na aba Gasto
  // passo a passo (15/11): qualquer [data-guia] leva até o lugar e abre o balão
  document.addEventListener('click', e => { const g = e.target.closest('[data-guia]'); if (g) guiar(g.dataset.guia, { ajuda: 'ajuda' in g.dataset }); });
  // tutorial guiado (17/11, JF): pelo botão de ajuda ou por Ajustes, a qualquer hora
  document.addEventListener('click', e => { if (e.target.closest('[data-tour-abrir]')) { fecharGuia(); abrirBoasVindas(); } });
  $('#guia-ok').addEventListener('click', fecharGuia);
  $('#guia-pular').addEventListener('click', async () => { state.settings.pulouConta = true; await db.setMeta('settings', state.settings); fecharGuia(); location.hash = 'inicio'; renderComece(); });
  // "não entrou nada" e "não gastei nada" (Anne, 15/11): pro mês não passar batido e o C.A.O.S. não achar que você esqueceu
  $('#dia-sem-gasto').addEventListener('click', hojeNaoGastei);
  $('#mes-sem-entrada').addEventListener('click', async () => {
    const mes = monthKey(toISODate());
    const meses = [...new Set([...(state.perfil?.mesesSemEntrada || []), mes])].sort().slice(-36);
    state.perfil = { ...(state.perfil || {}), mesesSemEntrada: meses };
    await db.setMeta('perfil', state.perfil);
    render();
    toast('Anotado: este mês não entrou nada. Sem problema, eu não vou achar que você esqueceu.');
  });
  $('#stat-mes-btn').addEventListener('click', () => {
    if ((state.resumoModo || 'gasto') === 'entrada') return mostrarEntradas();
    if (state.resumoModo === 'transf') { state.filtroTipo = 'transf'; state.filtroCat = null; location.hash = 'analise'; render(); return; }
    state.filtroTipo = null; state.filtroCat = null; location.hash = 'analise'; render();
  });
  $('#hoje-ajustar').addEventListener('click', () => abrirLimiteDiario());
  $('#hoje-chips').addEventListener('click', e => { const c = e.target.closest('[data-limite]'); if (c) $('#hoje-limite').value = centsToInput(Number(c.dataset.limite)); });
  $('#hoje-remover').addEventListener('click', () => salvarLimiteDiario(null));
  $('#hoje-form').addEventListener('submit', ev => {
    ev.preventDefault();
    const v = parseAmount($('#hoje-limite').value);
    if (!v) { $('#hoje-erro').textContent = 'Digite um valor, tipo 80,00.'; $('#hoje-erro').hidden = false; return; }
    salvarLimiteDiario(v).catch(er => toast(er.message || 'Não deu.'));
  });
  $('#editar-form').addEventListener('submit', salvarEdicao);
  $('#conta-form').addEventListener('submit', ev => { salvarConta(ev).catch(er => toast(er.message)); });
  $('#cd-tipo').addEventListener('change', mostrarCamposConta);
  $('#cd-outro').addEventListener('change', mostrarCamposConta);
  $('#cd-guarda').addEventListener('change', mostrarCamposConta); // 16/11: guardar a cada compra
  // 17/11 (JF: "a voz tá robótica ainda"): testa a voz natural e diz o motivo, se não der
  $('#voz-testar').addEventListener('click', async () => {
    $('#voz-status').textContent = 'Testando…';
    const r = await testarVoz();
    $('#voz-status').textContent = `${r.ok ? '✅' : '⚠️'} ${r.msg}`;
  });
  $('#estudio-btn').addEventListener('click', () => alternarEstudio());
  $('#glos-busca').addEventListener('input', renderGlossario);
  for (const id of ['#calc-valor', '#calc-taxa', '#calc-meses', '#calc-periodo']) $(id).addEventListener('input', renderCalculadora);
  montarInfoCaos();
  $('#sim-parcelas').innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1 === 1 ? 'À vista' : `${i + 1}x`}</option>`).join('');
  $('#sim-form').addEventListener('submit', onSimular);
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
  $('#category-select').addEventListener('change', e => {
    const v = e.target.value || null;
    if (state.kind === 'gasto') { state.selectedCategory = v; state.catSugerida = false; $('#cat-sugestao').hidden = true; }
    else state.selectedSource = v;
    renderLancar();
  });
  $('#forma-select').addEventListener('change', e => { state.forma = e.target.value || null; renderLancar(); });
  $('#category-chips').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    if (state.kind === 'gasto') { state.selectedCategory = b.dataset.cat; state.catSugerida = false; $('#cat-sugestao').hidden = true; }
    else state.selectedSource = b.dataset.cat;
    renderLancar();
  });
  // 2.3.5.8: o tipo do auxílio vai pra descrição ("Auxílio transporte", "Bolsa Família")
  $('#auxilio-tipos').addEventListener('click', e => {
    const b = e.target.closest('[data-aux]');
    if (!b) return;
    const x = b.dataset.aux;
    $('#note').value = x === 'Outro' ? '' : /^(Bolsa|BPC)/.test(x) ? x : `Auxílio ${x.toLowerCase()}`;
    $('#auxilio-tipos').querySelectorAll('[data-aux]').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
  });
  // valor rápido (V2 do AI Studio, 13/11): soma ao que já está digitado; Limpar zera
  $('#valor-rapido').addEventListener('click', e => {
    const b = e.target.closest('[data-somar]');
    if (!b) return;
    const soma = Number(b.dataset.somar);
    $('#amount').value = soma ? centsToInput((parseAmount($('#amount').value) || 0) + soma) : '';
    $('#amount').dispatchEvent(new Event('input', { bubbles: true }));
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
    if (state.fotoPendente) { const f = state.fotoPendente; tirarAnexo(); fotoNoChat(f, v.trim().slice(0, 300)); return; }
    enviarPergunta(v);
  });
  // campo do chat com várias linhas (15/11, JF): no celular o Enter quebra a linha e quem envia é o botão;
  // no computador, Enter envia e Shift+Enter quebra a linha. O campo cresce com o texto.
  const campo = $('#chat-input');
  const crescer = () => { campo.style.height = 'auto'; campo.style.height = `${Math.min(campo.scrollHeight, 150)}px`; };
  campo.addEventListener('input', crescer);
  campo.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && matchMedia('(pointer: fine)').matches) { e.preventDefault(); $('#chat-form').requestSubmit(); }
  });
  // 2.3.4.1 (JF): o aviso do trabalho nos Alertas
  $('#alert-list').addEventListener('click', async e => {
    const b = e.target.closest('[data-trabalho]');
    if (!b) return;
    if (b.dataset.trabalho === 'nao') {
      state.perfil = { ...state.perfil, trabalhoDispensado: true };
      await db.setMeta('perfil', state.perfil);
      render();
      return toast('Tudo bem! Se mudar de ideia, me conta no Chat.');
    }
    location.hash = '#conversa';
    await perguntarTrabalhoUmaVez({ pedido: true });
  });
  $('#chat-form').addEventListener('submit', () => setTimeout(crescer, 0));
  $('#chat-anexo-tirar').addEventListener('click', tirarAnexo);
  $('#chat-suggestions').addEventListener('click', e => {
    const ir = e.target.closest('[data-ir]');
    if (ir) { location.hash = ir.dataset.ir; return; } // atalho: só navega, não mexe em nada
    const b = e.target.closest('[data-sug]');
    if (b) enviarPergunta(b.dataset.sug);
  });
  $('#painel-perguntas').addEventListener('click', e => {
    const b = e.target.closest('[data-pergunta]');
    if (b) { location.hash = '#conversa'; enviarPergunta(b.dataset.pergunta); }
  });
  $('#painel-ocultar').addEventListener('click', () => { state.settings.painelOculto = true; saveSettings(); renderPainel(); });
  $('#painel-mostrar').addEventListener('click', () => { state.settings.painelOculto = false; saveSettings(); renderPainel(); });
  $('#filtro-tipo').addEventListener('click', e => {
    const b = e.target.closest('[data-tipo]');
    if (b) { state.filtroTipo = b.dataset.tipo || null; render(); }
  });
  $('#filtro-cat').addEventListener('click', () => { state.filtroCat = null; render(); });
  // a Análise aberta pelo Mês começa com todos os lançamentos (o atalho Entradas abre no modo entradas)
  $('#ir-analise').addEventListener('click', () => { state.filtroTipo = null; state.filtroCat = null; render(); });
  const filtrarCat = e => {
    const li = e.target.closest('[data-filtra-cat]');
    if (!li || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    state.filtroCat = state.filtroCat === li.dataset.filtraCat ? null : li.dataset.filtraCat;
    state.filtroTipo = state.filtroCat ? 'gasto' : state.filtroTipo;
    render();
    $('#exp-titulo').scrollIntoView({ behavior: MENOS_MOVIMENTO.matches ? 'auto' : 'smooth', block: 'start' });
  };
  $('#cat-list').addEventListener('click', filtrarCat);
  $('#cat-list').addEventListener('keydown', filtrarCat);
  $('#cat-rosca').addEventListener('click', filtrarCat);
  $('#cat-rosca').addEventListener('keydown', filtrarCat);
  // gráficos vivos: alternar o jeito de ver e tocar/passar o cursor pra ver o detalhe
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ritmo],[data-meses],[data-catvista]');
    if (!b) return;
    if (b.dataset.ritmo) { grafico.ritmo = b.dataset.ritmo; renderRitmo(); }
    else if (b.dataset.meses) { grafico.meses = b.dataset.meses; renderMeses(); }
    else { grafico.cat = b.dataset.catvista; render(); }
  });
  const escolherDia = e => { const a = e.target.closest('[data-dia]'); if (a && Number(a.dataset.dia) !== grafico.diaSel) { grafico.diaSel = Number(a.dataset.dia); renderRitmo(); } };
  const escolherMes = e => { const a = e.target.closest('[data-mes]'); if (a && a.dataset.mes !== grafico.mesSel) { grafico.mesSel = a.dataset.mes; renderMeses(); } };
  $('#grafico-ritmo').addEventListener('pointerover', escolherDia);
  $('#grafico-ritmo').addEventListener('click', escolherDia);
  $('#grafico-meses').addEventListener('pointerover', escolherMes);
  $('#grafico-meses').addEventListener('click', escolherMes);
  $('#exportar-csv').addEventListener('click', () => exportarCSV());
  $('#mes-csv').addEventListener('click', () => exportarCSV(lancamentosDoMes(), `caos-financas-${state.viewMonth}-completo.csv`));
  $('#mes-pdf').addEventListener('click', exportarPDF);
  $('#busca').addEventListener('input', () => { clearTimeout(state.buscaTimer); state.buscaTimer = setTimeout(render, 150); });
  $('#chat-log').addEventListener('click', e => {
    const b = e.target.closest('[data-acao]');
    if (b) confirmarAcao(Number(b.dataset.acao), b.dataset.ok === '1');
  });
  // 14/11 (JF: "a print vai sozinha, não dá pra pôr texto"): a foto fica anexada e vai junto com a legenda
  $('#chat-photo').addEventListener('change', e => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    state.fotoPendente = f;
    const img = $('#chat-anexo-img');
    if (img.src) URL.revokeObjectURL(img.src);
    img.src = URL.createObjectURL(f);
    $('#chat-anexo').hidden = false;
    $('#chat-input').placeholder = 'Legenda (opcional), ex.: "foi no cartão"';
    $('#chat-input').focus();
  });
  $('#chat-clear').addEventListener('click', async () => {
    for (const m of state.chat) if (m.imagemId && !state.expenses.some(x => x.imageId === m.imagemId)) await imagens.apagar(m.imagemId).catch(() => {});
    state.chat = [];
    db.setMeta('chat', []).catch(() => {});
    // 16/11 (JF: "tem a lixeira onde eu deleto tudo da minha memória"): além da conversa, ele esquece o que estava
    // no meio (questionário aberto, a última pergunta e a que ficou sem resposta)
    guardarMemoria({ ...state.caosMemory, aguardando: null, conversa: null, semResposta: null });
    renderChat();
  });
  // Microfone (bug do JF, 13/11): segundo toque para; falhou, explica o motivo e oferece o microfone do teclado
  $('#chat-mic').addEventListener('click', async () => {
    const b = $('#chat-mic');
    if (b.classList.contains('ouvindo')) return pararDeOuvir();
    b.classList.add('ouvindo');
    b.setAttribute('aria-label', 'Ouvindo… toque pra parar');
    toast('Pode falar, tô ouvindo…');
    try {
      enviarPergunta(await ouvir());
    } catch (e) {
      addMsg({ de: 'caos', texto: `${e.message} Plano B: toca no campo de mensagem e usa o microfone do próprio teclado (o 🎤 perto da barra de espaço). Ele escreve o que você falar e aí é só enviar.` });
      $('#chat-input')?.focus();
    } finally {
      b.classList.remove('ouvindo');
      b.setAttribute('aria-label', 'Falar');
    }
  });

  // Contas
  $('#account-form').addEventListener('submit', onAddAccount);
  $('#bank-subtipo').addEventListener('change', renderFormConta);
  $('#bank-select').addEventListener('change', renderFormConta);
  $('#card-form').addEventListener('submit', onAddCartao);
  $('#transf-form').addEventListener('submit', onTransferir);
  $('#inv-form').addEventListener('submit', onAddInvestimento);
  $('#inv-list').addEventListener('click', acaoInvestimento);
  $('#account-list').addEventListener('click', e => {
    const u = e.target.closest('[data-acc-update]');
    if (u) return onUpdateAccount(u.dataset.accUpdate);
    const fp = e.target.closest('[data-fatura-paga]');
    if (fp) return marcarFaturaPaga(fp.dataset.faturaPaga);
    const cc = e.target.closest('[data-compra-cartao]');
    if (cc) return compraNoCartao(cc.dataset.compraCartao);
    const rx = e.target.closest('[data-raiox]');
    if (rx) { const b = rx.dataset.raiox; raioXAberto.has(b) ? raioXAberto.delete(b) : raioXAberto.add(b); return renderContas(); }
    const ba = e.target.closest('[data-banco-abre]');
    if (ba) { const b = ba.dataset.bancoAbre; bancosAbertos.has(b) ? bancosAbertos.delete(b) : bancosAbertos.add(b); return renderContas(); }
    const ed = e.target.closest('[data-acc-edit]');
    if (ed) return abrirEditarConta(ed.dataset.accEdit);
    if (e.target.closest('[data-cdi]')) return informarCdi().catch(er => toast(er.message));
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
  $('#estilo-options').addEventListener('change', e => { state.settings.estilo = e.target.value; saveSettings(); aplicarAcessibilidade(); $('#estilo-desc').textContent = ESTILO_DESC[e.target.value]; });
  $('#voz-vel').addEventListener('input', e => {
    state.settings.vozVel = Number(e.target.value);
    $('#voz-vel-out').textContent = `${Number(e.target.value).toFixed(1).replace('.', ',')}×`;
    aplicarAcessibilidade();
  });
  $('#voz-vel').addEventListener('change', () => { saveSettings(); if (state.settings.voice) falar('Assim que eu vou falar.'); });
  $('#menos-mov').addEventListener('change', e => { state.settings.menosMov = e.target.checked; saveSettings(); aplicarAcessibilidade(); });
  // 2.3.1 (JF): foco da conversa
  for (const r of document.querySelectorAll('input[name="iafoco"]')) r.addEventListener('change', e => {
    state.settings.iaFoco = e.target.value;
    saveSettings();
    $('#iafoco-desc').textContent = FOCO_DESC[e.target.value];
  });
  $('#voice-toggle').addEventListener('change', e => {
    state.settings.voice = e.target.checked;
    saveSettings();
    if (e.target.checked) falar('Voz ativada. Agora eu falo.');
    else calar(); // 16/11 (limpeza): desligou a voz, ele para de falar na hora (o calar existia e ninguém chamava)
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
  $('#conta-entrar').addEventListener('click', () => entrarNaConta(false));
  $('#conta-criar').addEventListener('click', () => entrarNaConta(true));
  // trocar o nick (14/11, JF): só o nome que aparece; o login continua igual
  $('#conta-nick').addEventListener('click', async () => {
    const c = await conta.contaAtual().catch(() => null);
    const novo = prompt('Como seu nome aparece? (pra entrar, continua valendo o apelido da conta)', c?.exibicao || c?.apelido || '');
    if (novo == null) return;
    try { const n = await conta.trocarExibicao(novo); toast(`Pronto! Agora você aparece como ${n}.`); } catch (e) { toast(e.message); }
    renderConta();
  });
  $('#conta-sync').addEventListener('click', () => sincronizarAgora({ avisar: true }));
  // 2.3.5.6 (JF, 19/11): excluir conta. Pede apelido e senha (os campos de Entrar), confirma 2 vezes; os dados deste
  // aparelho ficam. Dentro da conta, o botão leva pra esses campos com o apelido já preenchido.
  $('#conta-apagar-esta').addEventListener('click', async () => {
    const c = await conta.contaAtual().catch(() => null);
    if (!confirm('Excluir sua conta? Primeiro você sai dela neste aparelho; depois digita a senha pra confirmar a exclusão.')) return;
    await conta.sair(servidor());
    await marcarSelo(false);
    renderConta();
    $('#conta-apelido').value = c?.apelido || '';
    $('#conta-senha').focus();
    toast('Digite a senha da conta e toque em "Excluir uma conta".');
  });
  $('#conta-apagar').addEventListener('click', async () => {
    const err = $('#conta-erro');
    err.hidden = true;
    const apelido = $('#conta-apelido').value.trim();
    const senha = $('#conta-senha').value;
    if (!servidor()) { err.textContent = 'Primeiro coloque o endereço do servidor do C.A.O.S. Finanças em "IA online e servidor".'; err.hidden = false; return; }
    if (!normalizarApelido(apelido) || senha.length < 6) {
      err.textContent = 'Pra excluir, escreva aqui em cima o apelido e a senha da conta que você quer excluir.';
      err.hidden = false; return;
    }
    if (!confirm(`Excluir a conta "${apelido}"? A cópia dela no servidor é apagada e não dá pra desfazer. O que está neste aparelho continua aqui.`)) return;
    if (!confirm('Tem certeza? Outros aparelhos que usam essa conta param de sincronizar.')) return;
    const b = $('#conta-apagar');
    b.disabled = true;
    try {
      await conta.apagarConta(servidor(), { apelido, senha });
      $('#conta-senha').value = '';
      $('#conta-apelido').value = '';
      toast(`Conta "${apelido}" excluída. Seus dados neste aparelho continuam aqui.`);
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    } finally {
      b.disabled = false;
      renderConta();
    }
  });
  $('#conta-sair').addEventListener('click', async () => {
    if (!confirm('Sair da conta neste aparelho? Seus dados continuam aqui e na conta; só param de sincronizar.')) return;
    await conta.sair(servidor());
    await marcarSelo(false);
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
  $('#perfil-chamar').addEventListener('change', async e => {
    const v = e.target.value.trim().slice(0, 40);
    if (!state.perfil?.apelido && !v) return;
    state.perfil = { ...(state.perfil || { nome: null, apelido: null, tratamento: 'descontraido', foco: [] }), chamarDe: v && v !== state.perfil?.apelido ? v : null, chamarPerguntado: true, ...(state.perfil?.apelido ? {} : { apelido: v, nome: v }) };
    await db.setMeta('perfil', state.perfil);
    renderPerfil();
    toast(v ? `Pronto: vou te chamar de ${v}.` : 'Volto a te chamar pelo apelido.');
  });
  $('#mostrar-cartao').addEventListener('change', e => { state.settings.mostrarCartao = e.target.checked; saveSettings(); ajustarPelaIdade(); });
  $('#note').addEventListener('input', sugerirPelaDescricao);

  $('#export-btn').addEventListener('click', exportBackup);
  // Recomeçar (JF, 16/11): zera os saldos (mantém os bancos) ou começa do zero (apaga lançamentos)
  $('#zerar-saldos').addEventListener('click', async () => {
    if (!(await zerarSaldosDosBancos())) return;
    render();
    toast('Saldos zerados. Agora é só atualizar o saldo de cada banco em Contas.');
    location.hash = 'contas';
  });
  $('#recomecar-tudo').addEventListener('click', async () => {
    if (!(await comecarDoZero())) return;
    render();
    toast('Pronto: começou do zero. Atualize o saldo de cada banco em Contas.');
    location.hash = 'contas';
  });
  $('#ir-recomecar').addEventListener('click', () => {
    location.hash = 'ajustes';
    setTimeout(() => { const c = $('#recomecar-card'); if (c) { c.open = true; c.scrollIntoView({ block: 'start' }); } }, 350);
  });
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
  comecarAbertura();
  ligarAvatares();
  ligarBocaNaVoz(); // 2.1.7: voz natural (Azure) e boca que mexe com a fala
  ligarPalco();
  ligarTeclado();
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
    Object.assign(state, { compromissos, planos, perfil: perfil || null, mercado: await db.getMeta('mercado'), metas: await db.getMeta('metas', []), investimentos: await db.getMeta('investimentos', []), transferencias: await db.getMeta('transferencias', []) });
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
    Object.assign(state, { expenses, incomes: incomes.filter(i => !i.prevista), previstas: incomes.filter(i => i.prevista), accounts: accounts.sort((a, b) => a.createdAt - b.createdAt) });
    if (settings) state.settings = { ...state.settings, ...settings };
    // escuro por padrão (JF + Code, 12/11): quem nunca escolheu tema ("do aparelho" de fábrica) passa pro escuro, uma vez só
    // quem já usava o app sem servidor ganha o servidor padrão uma vez (14/11); quem pôs outro endereço fica com o seu
    if (settings && !settings.servidorV) state.settings = { ...state.settings, aiUrl: (settings.aiUrl || '').trim() || SERVIDOR_PADRAO, servidorV: 1 };
    // IA online ligada de fábrica (Anne, 15/11: "não tem instrução de como ligar"); quem desligar depois fica desligado
    if (settings && !settings.iaV) state.settings = { ...state.settings, aiOn: true, iaV: 1 };
    if (settings && !settings.temaV) state.settings = { ...state.settings, tema: ['claro', 'contraste'].includes(settings.tema) ? settings.tema : 'escuro', temaV: 2 };
    aplicarAcessibilidade();
    posicionarMeAjuda(); // o lugar onde a pessoa deixou o "Me ajuda" vem das configurações
    if (memory) state.caosMemory = memory;
    // fotos da conversa antiga não voltam (o link da imagem é da sessão); o texto volta
    state.chat = Array.isArray(chat) ? chat.map(m => ({ ...m, texto: m.texto || (m.imagemId ? '📷 (foto)' : '') })) : [];
  } catch (e) {
    console.error(e);
    toast('Não consegui abrir o banco local. Os dados não serão salvos.');
  }

  ligarBlocos(); // depois das configurações: cada bloco abre do jeito que a pessoa deixou
  renderLancar();
  renderBudgets();
  await renderSettings();
  renderPerfil();
  state.novidadesVistas = await db.getMeta('novidadesVistas').catch(() => null);
  // Primeiro acesso não precisa de aviso: tudo é novidade. Marca a versão atual como vista.
  if (!state.perfil && !state.novidadesVistas) { state.novidadesVistas = VERSAO_APP; db.setMeta('novidadesVistas', VERSAO_APP).catch(() => {}); }
  renderAvisoNovidade();
  render();
  // ao abrir (JF, 13/11): começa no Início; só fica no Lançar se a pessoa estava lá. Não volta direto pra conversa.
  const abrirEm = location.hash.slice(1) === 'lancar' ? 'lancar' : 'inicio';
  if (location.hash.slice(1) !== abrirEm) history.replaceState(null, '', `#${abrirEm}`);
  irPara(abrirEm);
  // Primeiro acesso: o C.A.O.S. se apresenta e conhece a pessoa
  // 17/11 (JF): antes, a tela "Você é novo por aqui?" oferece o tutorial guiado; a apresentação vem depois dele
  if (!state.perfil && !state.settings.tourVisto) abrirBoasVindas({ primeiraVez: true, desistirSe: () => !!state.perfil, depois: () => { if (!state.perfil) iniciarOnboarding(); } });
  else if (!state.perfil) iniciarOnboarding();
  else { await parabensSeForODia(); await perguntarAniversarioUmaVez(); if (!state.onboarding) await perguntarChamarUmaVez(); }
  // 2.3.3: o lembrete fica pra outra abertura (uma pergunta por vez, sem questionário)
  if (!state.onboarding && state.perfil?.chamarPerguntado && !state.perfil?.lembretePerguntado && state.perfil?.criadoEm && Date.now() - state.perfil.criadoEm > 60_000) await perguntarLembreteUmaVez();
  // 2.3.4: a pergunta do trabalho fica pra outra abertura, depois da do lembrete (uma por vez)
  else if (!state.onboarding && state.perfil?.lembretePerguntado && !state.perfil?.trabalhoPerguntado && (!state.perfil?.lembreteEm || Date.now() - state.perfil.lembreteEm > 3_600_000)) await perguntarTrabalhoUmaVez();
  $('#install-hint').textContent = installHint();

  const today = toISODate();
  const closing = detectMonthClose({ expenses: state.expenses, categories: state.categories, currentMonth: monthKey(today) });
  // ao abrir, o C.A.O.S. olha o radar: o alerta mais grave entra na fila junto com as boas-vindas
  const radar = analyze(dados(), today).slice(0, 1).map(a => ({ ...a, radar: true }));
  const especial = diaEspecial(today) ? [{ type: `dia_${diaEspecial(today)}` }] : [];
  // dica de meta (13/11): a meta com prazo mais perto, com quanto guardar por mês
  const meta = state.metas.map(m => progressoMeta(m, today)).filter(m => !m.batida && m.porMesCents).sort((a, b) => a.mesesRestantes - b.mesesRestantes)[0];
  const dicaMeta = meta ? [{ type: 'meta_ritmo', metaNome: meta.nome, amountCents: meta.porMesCents, totalCents: meta.faltaCents, pct: meta.pct }] : [];
  // fato da semana (15/11, no lugar da ofensiva): só quando tem diferença de verdade, 1 vez por semana (cooldown)
  const fato = fatoDaSemana(state.expenses, state.categories, today);
  // frase do dia (JF, 17/11): de manhã, na 1ª abertura do dia, uma frase de quem entende de dinheiro (aviso vem antes)
  const hora = new Date().getHours();
  const fraseDia = hora >= 5 && hora < 12 ? [{ type: 'frase_do_dia' }] : [];
  narrate([...closing, ...radar, ...especial, ...dicaMeta, ...(fato ? [fato] : []), ...fraseDia, { type: 'boas_vindas' }]);
  if ($('#caos-line').textContent === 'Iniciando…') $('#caos-line').textContent = 'De olho nos seus gastos. Toque aqui pra conversar.';
  pintarOlho();

  await mostrarAbertura();

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
  state.noticias = await db.getMeta('noticias').catch(() => null);
  atualizarNoticias();
  window.addEventListener('online', () => atualizarMercado().then(processarFila));
  if ('serviceWorker' in navigator) {
    // atualização mais rápida (JF, 13/11: "tá demorando muito a att o app"): procura versão nova ao abrir e sempre
    // que o app volta pra frente.
    // 2.1.9.2 (JF, 17/11: "quando abro o app ele dá uma engasgada, pisca e recarrega"): antes a versão nova assumia
    // logo e o app recarregava na cara da pessoa. Agora ela fica esperando e a troca é feita quando a pessoa sai do
    // app (vai pra tela inicial ou troca de app): recarrega escondido e, na volta, já está na versão nova.
    const tinhaControle = !!navigator.serviceWorker.controller;
    let registro = null;
    const trocarSeEscondido = () => {
      if (document.visibilityState === 'hidden' && registro?.waiting) registro.waiting.postMessage('trocar');
    };
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
      registro = reg;
      reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
        else trocarSeEscondido();
      });
      addEventListener('pagehide', trocarSeEscondido);
    }).catch(err => console.warn('SW não registrado', err));
    let recarregou = false;
    let recarregarAoSair = false;
    const recarregar = () => { if (recarregou) return; recarregou = true; location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!tinhaControle || recarregou) return;
      // a troca chegou com o app na frente (mensagem atrasada): espera a pessoa sair pra não piscar
      if (document.visibilityState === 'visible') {
        if (!recarregarAoSair) {
          recarregarAoSair = true;
          document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') recarregar(); });
        }
        return;
      }
      recarregar();
    });
  }
}

/** 2.3.2 (JF): aplica o "recolhido" do cartão de resumo (detalhes) e dos alertas. */
function aplicarRecolhidos() {
  const aberto = !!state.resumoAberto;
  $('#resumo-card').classList.toggle('detalhes-abertos', aberto);
  $('#resumo-mais').setAttribute('aria-expanded', String(aberto));
  $('#resumo-mais').firstChild.textContent = aberto ? 'Esconder detalhes ' : 'Ver detalhes ';
  const planAberto = !!state.planAberto;
  $('#plan-resumo').classList.toggle('detalhes-abertos', planAberto);
  $('#plan-mais').setAttribute('aria-expanded', String(planAberto));
  $('#plan-mais').firstChild.textContent = planAberto ? 'Esconder detalhes ' : 'Ver detalhes ';
  const fechado = !!state.settings.alertasFechado;
  $('#alerts-card').classList.toggle('fechado', fechado);
  $('#alertas-toggle').setAttribute('aria-expanded', String(!fechado));
}

// ---------- Abertura (JF, 13/11) ----------
// "Um respiro curto; nada de abrir seco." Primeiro era ~1 s; o JF pediu uns 5 s pra dar tempo de ler (13/11 à noite).
// O avatar passeia por algumas formas, cada uma com uma frase do que ele faz. Tocar em qualquer lugar pula.
// Com servidor ligado e sem conta, oferece "Entrar" (e "Continuar sem conta" é lembrado).
const ABERTURA_MS = 5000;
const ABERTURA_PASSOS = [
  ['anjinho', 'Oi! Eu sou o C.A.O.S., seu parceiro financeiro.'],
  ['contador', 'Anoto seus gastos e faço as contas.'],
  ['professor', 'Te dou dicas quando o mês aperta.'],
  ['feliz', 'E comemoro junto quando você manda bem!'],
];
let aberturaFechada = false;
function fecharAbertura() {
  const ab = $('#abertura');
  if (!ab || aberturaFechada) return;
  aberturaFechada = true;
  ab.classList.add('saindo');
  setTimeout(() => { ab.remove(); avatares.abertura?.destruir(); }, 400);
}
// JF, 16/11: "aparece a tela antiga (o anjinho no meio), troca pra atualizada (o verdinho), dá um glitch e volta".
// Antes a abertura começava no passeio do avatar (anjinho no meio da tela) e só depois de ler os dados trocava pra tela
// de entrar (confiante, cartão embaixo). Agora o app lembra qual foi a da última vez e já abre nela; o conteúdo só
// aparece com o modo decidido (classe .pronta).
const lerModoAbertura = () => { try { return localStorage.getItem('carteira-abertura'); } catch { return null; } };
const gravarModoAbertura = m => { try { localStorage.setItem('carteira-abertura', m); } catch { /* sem storage: tudo bem */ } };
let passeioLigado = false;
function passeioDaAbertura(ab) {
  if (passeioLigado) return;
  passeioLigado = true;
  const dica = $('#abertura-dica');
  ABERTURA_PASSOS.forEach(([forma, frase], i) => setTimeout(() => {
    if (aberturaFechada || ab.classList.contains('esperando')) return;
    avatares.abertura?.mostrar(forma);
    if (dica) dica.textContent = frase;
  }, i * (ABERTURA_MS / ABERTURA_PASSOS.length)));
}
function comecarAbertura() {
  const ab = $('#abertura');
  if (!ab) return;
  const entrar = lerModoAbertura() === 'entrar';
  if (entrar) ab.classList.add('esperando');
  try {
    configurarAvatar({ menosMovimento: () => MENOS_MOVIMENTO.matches });
    avatares.abertura = criarAvatar($('#abertura-avatar'), { tamanho: 'grande', forma: entrar ? 'confiante' : ABERTURA_PASSOS[0][0] });
  } catch (e) { console.warn('avatar', e); }
  if (!entrar) passeioDaAbertura(ab);
  else $('.abertura-pula')?.remove();
  ab.classList.add('pronta');
  ab.addEventListener('click', e => { if (!ab.classList.contains('esperando') && !e.target.closest('button')) fecharAbertura(); });
}

// JF, 14/11: "a tela inicial tem que ter entrar na conta ou cadastrar. Depois que a conta está pronta, é só clicar
// e entrar". E, no mesmo dia, "mais slim, como a entrada dos bancos" (C6, Banestes, Inter): o C.A.O.S. em cima e um
// cartão embaixo. Com conta: "Olá, JF", 3 atalhos e Entrar. Sem conta: Entrar / Criar conta (os campos só aparecem
// depois do toque) e Continuar sem conta.
// Dicas da tela de entrar (JF, 15/11: "está muito vazia; dicas pequenas e discretas de como funciona, pra brincar").
// Uma por vez, trocando a cada 4,5 s, até a abertura fechar.
const DICAS_ABERTURA = [
  '💬 Escreva "gastei 30 no mercado" no Chat e eu anoto.',
  '📸 Mande o print do Pix: eu leio o valor pra você.',
  '🛡️ Defina um piso em cada banco e eu aviso antes de chegar nele.',
  '💰 No Início eu mostro quanto dá pra gastar até o salário.',
  '🔒 Seus dados ficam no seu celular. Com conta, vão embaralhados.',
  '🤝 Dividiu a conta com amigos? Eu lembro quem falta pagar.',
  '📅 Contas fixas e faturas: eu lembro antes de vencer.',
  '🧮 Pergunte "quanto é 15% de 200?" que eu faço a conta.',
  '📖 Não sabe o que é CDI? Tem um glossário no Chat.',
  '😊 Eu tenho humor: suave, normal ou ácido. Você escolhe em Ajustes.',
];
function girarDicasDaAbertura(ab) {
  const el = $('#abertura-dica');
  if (!el) return;
  let i = Math.floor(Math.random() * DICAS_ABERTURA.length);
  const trocar = () => {
    el.style.opacity = '0';
    setTimeout(() => { el.textContent = DICAS_ABERTURA[i++ % DICAS_ABERTURA.length]; el.style.opacity = '1'; }, 300);
  };
  trocar();
  const t = setInterval(() => (document.body.contains(ab) && !ab.classList.contains('saindo') ? trocar() : clearInterval(t)), 4500);
}

async function mostrarAbertura() {
  const ab = $('#abertura');
  if (!ab) return;
  const n = NOVIDADES[0];
  $('#abertura-versao').textContent = `Versão ${VERSAO_APP}${n.nome ? ` · ${n.nome}` : ''}`;
  const temConta = await conta.contaAtual().catch(() => null);
  if (state.onboarding || (!temConta && !servidor())) {
    gravarModoAbertura('passeio');
    ab.classList.remove('esperando');
    passeioDaAbertura(ab);
    setTimeout(fecharAbertura, Math.max(0, ABERTURA_MS - performance.now()));
    return;
  }
  gravarModoAbertura('entrar');
  ab.classList.add('esperando');
  girarDicasDaAbertura(ab);
  avatares.abertura?.mostrar('confiante'); // JF, 14/11: "menos bobão" que o festeiro na tela de entrar
  $('.abertura-pula')?.remove();
  $('#abertura-login').hidden = false;
  if (temConta) {
    const nome = temConta.exibicao || temConta.apelido;
    $('#abertura-ola').textContent = `Olá, ${nome}`;
    $('#abertura-atalhos').hidden = false;
    $('#abertura-criar').hidden = true;
    $('#abertura-entrar').textContent = 'Entrar';
    $('#abertura-pular').textContent = 'Trocar de conta';
    $('#abertura-entrar').addEventListener('click', fecharAbertura, { once: true });
    $('#abertura-atalhos').addEventListener('click', e => {
      const b = e.target.closest('[data-ir]');
      if (!b) return;
      location.hash = b.dataset.ir;
      fecharAbertura();
    });
    $('#abertura-pular').addEventListener('click', () => {
      fecharAbertura();
      location.hash = 'ajustes';
      setTimeout(() => { const c = $('#conta-card'); if (c) { c.open = true; c.scrollIntoView({ block: 'start' }); } }, 350);
    }, { once: true });
    return;
  }
  $('#abertura-ola').textContent = 'Olá! Entre ou crie sua conta.';
  const campos = { apelido: '#ab-apelido', senha: '#ab-senha', erro: '#ab-erro', entrar: '#abertura-entrar', criar: '#abertura-criar' };
  // 1º toque só abre os campos (tela limpa); com os campos abertos, o botão faz a ação
  const ir = async criar => {
    const form = $('#abertura-form');
    if (form.hidden) {
      form.hidden = false;
      ab.classList.add('com-campos');
      $('#ab-senha').autocomplete = criar ? 'new-password' : 'current-password';
      $('#ab-apelido').focus();
      return;
    }
    if (await entrarNaConta(criar, campos)) fecharAbertura();
  };
  $('#abertura-entrar').addEventListener('click', () => ir(false));
  $('#abertura-criar').addEventListener('click', () => ir(true));
  $('#ab-senha').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ir(false); } });
  $('#abertura-pular').addEventListener('click', () => {
    state.settings.aberturaSemConta = true;
    saveSettings();
    fecharAbertura();
  }, { once: true });
}

init();
