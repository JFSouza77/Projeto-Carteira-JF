// UI: liga a tela ao motor, à persistência e ao narrador.
// Só este arquivo (via db.js) grava dados. O C.A.O.S. só sugere; quem confirma é a pessoa.

import { normalizarApelido } from './sincronia.js';
import { intensidade } from './caos/emocoes.js';
import * as db from './db.js';
import {
  DEFAULT_CATEGORIES, INCOME_SOURCES, BANKS, formatBRL, parseAmount, parseSignedAmount, toISODate, monthKey,
  shiftMonth, monthLabel, createExpense, createIncome, createAccount, summarizeMonth, detectExpenseEvents,
  detectMonthClose, incomeIn, accountBalance, accountLabel, totalBalance, analyze,
  TIPOS_COMPROMISSO, createCompromisso, situacaoCompromissos, createPlano, analisarPlanejamento, sugerirCategoria, validarBackup, lerAniversario, idadeDe, ehAniversario, createCartao, faturaDoCartao, createMeta, progressoMeta, guardarNaMeta, lerMesAlvo,
  TIPOS_INVESTIMENTO, createInvestimento, atualizarInvestimento, resumoInvestimentos,
  valorProprio, dividirIgual, juntarNomes, serieMensal, gastoPorDia, createTransferencia, TIPOS_CONTA, FORMAS_PAGAMENTO, agruparPorBanco, comReforco, aReceber, marcarRecebido, mensagemCobranca, calendarioOfensiva, editarLancamento, depoisDoSaldo, folgaDoPiso, diferencaDoSaldo, fatoDaSemana, podeGastar, resumoEntradas, progressoOrcamentoDiario, mascaraCentavos, valorForaDoComum, editarConta, rendimentoEstimado, raioXCartao, simularCompra, ofensiva, MARCOS_OFENSIVA,
} from './engine.js';
import { reagir, conversar, falaAvulsa, MOODS, DEFAULT_MOOD, CAOS_VERSAO, SUGESTOES, IDENTIDADE, memoriaInicial, emocaoDoMomento, rostoAvulso, rostoEspantado, rostoDaEmo, nomeAlerta, diaEspecial } from './caos/index.js';
import { extrairNome, textoMeta, calcularJuros } from './caos/conversa.js';
import { GLOSSARIO, ATUALIZADO_EM, GLOS_TEMAS, temaDoTermo } from './caos/glossario.js';
import { fraseDoPrint, resumoDoPrint } from './caos/ofertas.js';
import { corCategoria, corFonte, corForma, temaBanco } from './cores.js';
import { NUCLEO } from './caos/nucleo.js';
import { NOVIDADES, VERSAO_APP, temNovidade, partesDoItem } from './novidades.js';
import { falar, vozDisponivel, ditadoDisponivel, ouvir, pararDeOuvir, setVelocidade } from './voz.js';
import * as imagens from './imagens.js';
import * as ia from './ia.js';
import * as lembretes from './notificacoes.js';
import * as conta from './conta.js';
import { criarAvatar, formaPara, configurarAvatar, FORMAS, EMO_DA_FORMA } from './avatar.js';

import { $, esc, cap, centsToInput, SERVIDOR_PADRAO, state, dados, catById, srcById, definirRender } from './estado.js';
import { addMsg, confirmarAcao, enviarPergunta, fotoNoChat, ligarTeclado, processarFila, renderChat, tirarAnexo } from './telas/chat.js';
import { abrirEditarConta, acaoInvestimento, bancosAbertos, compraNoCartao, contasAbertas, informarCdi, marcarFaturaPaga, mostrarCamposConta, onAddAccount, onAddCartao, onAddInvestimento, onRemoveAccount, onTransferir, onUpdateAccount, opcoesDeConta, raioXAberto, renderContas, renderFormConta, renderInvestimentos, salvarConta } from './telas/contas.js';
import { guardarEmMeta, iniciarMeta, lancarCompromisso, marcarPlano, onAddCompromisso, onAddPlano, onSimular, prepararFormCompromisso, removerCompromisso, removerPlano, renderMes, renderMetas, salvarMetas } from './telas/mes.js';
import { exportarCSV, exportarPDF, filtroDeBusca, grafico, lancamentosDoMes, marcarSeg, renderGraficos, renderMeses, renderRitmo, renderRosca } from './telas/analise.js';
import { editar, lerFotoComIA, limparFoto, mostrarFoto, onDelete, onFoto, onSubmit, perguntarContaDoPix, previaParcelas, previaRacha, renderLancar, salvarEdicao, verFoto } from './telas/lancar.js';

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
export function avatarFala(ms) {
  clearTimeout(falaTimer);
  for (const k of ['caos', 'chat', 'painel']) avatares[k]?.falando(true);
  falaTimer = setTimeout(() => { for (const k of ['caos', 'chat', 'painel']) avatares[k]?.falando(false); }, ms);
}

// Bug do JF (13/11 à noite): o rostinho roxo do balão e o nome no topo ("deboche") não batiam com o avatar
// (humorista). Agora tudo segue a FORMA do avatar: o nome no topo, a etiqueta e a cor do balão.
const nomeForma = f => (FORMAS[f]?.nome || 'calmo').replace(/^[^A-Za-zÀ-ú]+/, '').toLowerCase();
export const formaDaMsg = m => (FORMAS[m.forma] ? m.forma : m.digitando ? 'pensando' : formaPara({ rosto: m.rosto, assunto: m.assunto }));

export function pintarRosto(rosto, assunto = null) {
  const r = rosto || emocaoDoMomento(state.caosMemory, state.settings.mood).rosto
    || rostoAvulso(undefined, { mood: state.settings.mood, memory: state.caosMemory });
  const forma = formaPara({ rosto: r, assunto });
  for (const k of ['caos', 'chat', 'painel']) avatares[k]?.mostrar(forma);
  setRosto($('#caos-face'), r);
  setRosto($('#chat-face'), r);
  setRosto($('#painel-face'), r);
  $('#caos').style.setProperty('--emo-cor', r.cor);
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

function alternarEstudio(ligar = $('#estudio').hidden) {
  $('#estudio').hidden = !ligar;
  $('#tela-conversa').classList.toggle('modo-estudio', ligar);
  $('#estudio-btn').setAttribute('aria-pressed', String(ligar));
  // dica do Code (13/11): deixar claro como voltar pra conversa
  $('#estudio-btn').innerHTML = ligar ? '← Conversa' : '<svg class="ico" aria-hidden="true"><use href="#i-livro"/></svg> Glossário';
  if (ligar) { renderEstudio(); window.scrollTo(0, 0); }
}

let estudioMontado = false;
function renderEstudio() {
  renderGlossario();
}

// 15/11 (Anne): leis e linha do tempo moram nos Ajustes ("Mais sobre o C.A.O.S."); a calculadora, em Contas
function montarInfoCaos() {
  if (!estudioMontado) {
    estudioMontado = true;
    // núcleo 1.3.0: cada lei tem o sentido geral e a frase de cada casa (aqui, a da Carteira)
    $('#leis').innerHTML = NUCLEO.leis.map(l => `<li><strong>${esc(String(l.lei || l).replace(/^\d+ª:\s*/, ''))}</strong>${l.carteira ? `<small>${esc(l.carteira)}</small>` : ''}</li>`).join('');
    const dataBR = iso => { const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`; };
    $('#linha-tempo').innerHTML = NUCLEO.vida.map(v => `<li><small>${dataBR(v.data)}</small>${esc(v.fato)}</li>`).join('');
  }
  renderCalculadora();
}

const semAcento = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

let glosTema = ''; // tema escolhido nos chips do glossário ('' = todos)
const GLOS_TEMA_DE = new Map(GLOSSARIO.map(g => [g, temaDoTermo(g)]));

function renderGlossario() {
  const q = semAcento($('#glos-busca').value.trim());
  const chips = $('#glos-temas');
  if (chips && !chips.childElementCount) {
    // 14/11 (JF: "mais lúdico, com coresinhas"): um chip colorido por tema, que filtra a lista
    chips.innerHTML = [{ id: '', nome: 'Todos', cor: 'outros' }, ...GLOS_TEMAS].map(t =>
      `<button type="button" class="glos-chip" data-tema="${t.id}" style="--tema:var(--cat-${t.cor})" aria-pressed="${t.id === glosTema}">${esc(t.nome)}</button>`).join('');
    chips.addEventListener('click', e => {
      const b = e.target.closest('.glos-chip');
      if (!b) return;
      glosTema = b.dataset.tema;
      chips.querySelectorAll('.glos-chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
      renderGlossario();
    });
  }
  const achados = GLOSSARIO.filter(g => (!glosTema || GLOS_TEMA_DE.get(g) === glosTema)
    && (!q || semAcento(g.termo).includes(q) || g.chaves.some(k => semAcento(k).includes(q)) || semAcento(g.adulto).includes(q)));
  $('#glos-total').textContent = q || glosTema ? `${achados.length} de ${GLOSSARIO.length} termos.` : `${GLOSSARIO.length} termos.`;
  const corDe = id => GLOS_TEMAS.find(t => t.id === id)?.cor || 'outros';
  $('#glos-lista').innerHTML = achados.length ? achados.map(g => {
    const tema = GLOS_TEMA_DE.get(g);
    return `
    <details style="--tema:var(--cat-${corDe(tema)})"><summary><span class="glos-bola" aria-hidden="true">${esc(g.termo[0])}</span>${esc(g.termo)}</summary>
      <div class="glos-corpo">
        <p>${esc(g.adulto)}</p>
        ${g.crianca ? `<p class="glos-crianca"><b>Bem simples:</b> ${esc(g.crianca)}</p>` : ''}
        <p class="mais">${esc(g.mais)}</p>
        ${g.governo ? `<p class="mais">Regra de ${esc(ATUALIZADO_EM)}: confira no canal oficial, porque muda com o tempo.</p>` : ''}
      </div>
    </details>`;
  }).join('') : '<p class="muted">Não achei esse termo. Tente outra palavra ou pergunte pro C.A.O.S. na conversa.</p>';
}

function renderCalculadora() {
  const valor = parseAmount($('#calc-valor').value) || 0;
  const pct = Math.max(0, Math.min(100, Number(String($('#calc-taxa').value).replace(',', '.')) || 0)) / 100;
  const meses = Number($('#calc-meses').value);
  const anual = $('#calc-periodo').value === 'ano';
  $('#calc-meses-txt').textContent = meses % 12 === 0 && meses >= 12 ? `${meses} meses (${meses / 12} ${meses === 12 ? 'ano' : 'anos'})` : `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  if (!valor) { $('#calc-res').innerHTML = '<p class="muted">Digite um valor.</p>'; return; }
  // mesma regra da conversa: ao ano vira mensal equivalente no composto e ÷12 no simples
  const s = calcularJuros({ tipo: 'simples', valor, taxa: anual ? pct / 12 : pct, meses });
  const c = calcularJuros({ tipo: 'compostos', valor, taxa: anual ? Math.pow(1 + pct, 1 / 12) - 1 : pct, meses });
  const dif = c.finalCents - s.finalCents;
  $('#calc-res').innerHTML = `
    <div><small>Juros simples</small><b>${formatBRL(s.finalCents)}</b><small>+ ${formatBRL(s.jurosCents)} de juros</small></div>
    <div><small>Juros compostos</small><b>${formatBRL(c.finalCents)}</b><small>+ ${formatBRL(c.jurosCents)} de juros</small></div>
    <p class="dif">${dif > 0 ? `A bola de neve dos compostos dá ${formatBRL(dif)} a mais. Ótimo quando você investe, perigoso quando você deve.` : 'Com esses números, as duas contas dão igual.'}</p>`;
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
export const ic = id => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
const CAT_COM_ICONE = new Set(['mercado', 'delivery', 'restaurante', 'transporte', 'moradia', 'contas', 'saude', 'lazer', 'jogos', 'streaming', 'compras', 'educacao', 'outros']);
const FONTE_COM_ICONE = new Set(['salario', 'freela', 'rendimento', 'presente', 'outros']);
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
const PERGUNTAS_PAINEL = ['Vai dar até o fim do mês?', 'Onde estou gastando mais?', 'O que tenho pra pagar?'];

function renderPainel() {
  if (!$('#painel-caos')) return;
  const oculto = !!state.settings.painelOculto;
  document.body.classList.toggle('sem-painel', oculto);
  $('#painel-mostrar').hidden = !oculto;
  const m = emocaoDoMomento(state.caosMemory, state.settings.mood);
  const r = m.rosto || m.aparencia;
  if (r?.quadros) setRosto($('#painel-face'), r);
  $('#painel-mood').textContent = nomeForma(formaPara({ rosto: r }));
  const pct = Math.round(intensidade(state.caosMemory?.emocoes, m.emocao) * 100);
  $('#painel-int').style.width = `${pct}%`;
  $('#painel-int-barra').setAttribute('aria-label', `Intensidade da emoção: ${pct}%`);
  $('#painel-int-txt').textContent = `Intensidade emocional: ${pct}%`;
  $('#painel-obs').textContent = $('#caos-line').textContent;
  const radar = analyze(dados(), toISODate()).slice(0, 3);
  $('#painel-radar').innerHTML = radar.length
    ? radar.map(a => `<li class="${esc(a.severity)}">${esc(cap(nomeAlerta(a)))}</li>`).join('')
    : '<li class="muted">Nada pedindo atenção agora.</li>';
  $('#painel-perguntas').innerHTML = PERGUNTAS_PAINEL.map(q => `<button type="button" class="chip" data-pergunta="${esc(q)}">${esc(q)}</button>`).join('');
  // menu lateral: saudação, saldo e foguinho
  $('#nav-ola').textContent = state.perfil?.apelido ? `Olá, ${state.perfil.apelido}` : 'Olá!';
  $('#nav-saldo').textContent = state.accounts.some(a => a.tipo !== 'cartao') ? formatBRL(totalBalance(state.accounts, state.expenses, state.incomes, state.transferencias)) : '—';
  $('#nav-fogo').textContent = ''; // 15/11: ofensiva fora da tela até ser repensada
}

// ---------- Aba Entradas do Início (15/11, JF + Anne): o mesmo cartão do gasto, mostrando o que entrou ----------
function renderResumoEntradas() {
  const modo = state.resumoModo || 'gasto';
  $('#resumo-card').dataset.modo = modo;
  $('#resumo-gasto').hidden = modo !== 'gasto';
  $('#resumo-entrada').hidden = modo !== 'entrada';
  $('#resumo-transf').hidden = modo !== 'transf';
  for (const b of document.querySelectorAll('[data-resumo]')) b.setAttribute('aria-pressed', String(b.dataset.resumo === modo));
  // fileira de baixo (rascunho do GPT): semana, mês e saldo; gasto em laranja, entrada em verde
  const hojeISO = toISODate();
  const [y, m, d] = hojeISO.split('-').map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // segunda = 0
  const iniSemana = toISODate(new Date(y, m - 1, d - dow));
  const lista = modo === 'entrada' ? state.incomes : modo === 'transf' ? state.transferencias : state.expenses;
  const semana = lista.filter(x => x.date >= iniSemana && x.date <= hojeISO).reduce((t, x) => t + x.amountCents, 0);
  const doMes = lista.filter(x => (x.month || monthKey(x.date)) === state.viewMonth).reduce((t, x) => t + x.amountCents, 0);
  const cor = modo === 'entrada' ? 'ok' : modo === 'transf' ? '' : 'warn';
  $('#stat-semana-tit').textContent = modo === 'entrada' ? 'Entradas' : modo === 'transf' ? 'Transferido' : 'Gastos';
  $('#stat-mes-tit').textContent = modo === 'entrada' ? 'Entradas do mês' : modo === 'transf' ? 'Transferido no mês' : 'Gastos do mês';
  // Transferências (Anne, 15/11): o que mudou de um banco pro outro no mês; transferir de verdade é em Contas
  const nome = id => { const c = state.accounts.find(a => a.id === id); return c ? accountLabel(c) : 'conta apagada'; };
  const tMes = state.transferencias.filter(t => (t.month || monthKey(t.date)) === state.viewMonth).sort((a, b) => b.date.localeCompare(a.date));
  $('#transf-total').textContent = formatBRL(tMes.reduce((t, x) => t + x.amountCents, 0));
  $('#transf-sub').textContent = tMes.length
    ? `${tMes.length} ${tMes.length === 1 ? 'transferência' : 'transferências'} neste mês. Dinheiro que só mudou de lugar: não é gasto nem entrada.`
    : 'Nenhuma transferência neste mês. Pra transferir, vá em Contas → Transferir entre contas.';
  $('#transf-lista').innerHTML = tMes.slice(0, 8).map(t => `<li><span>${t.date.slice(8, 10)}/${t.date.slice(5, 7)} · ${esc(nome(t.deId))} → ${esc(nome(t.paraId))}${t.note ? ` <small>${esc(t.note)}</small>` : ''}</span><span class="num">${formatBRL(t.amountCents)}</span></li>`).join('');
  $('#stat-semana').textContent = formatBRL(semana);
  $('#stat-mes').textContent = formatBRL(doMes);
  $('#stat-semana').className = `num ${cor}`;
  $('#stat-mes').className = `num ${cor}`;
  const r = resumoEntradas(state.incomes, state.expenses, state.viewMonth);
  $('#entrada-total').textContent = formatBRL(r.totalCents);
  const semEntrada = (state.perfil?.mesesSemEntrada || []).includes(state.viewMonth);
  $('#entrada-sub').textContent = !r.quantas && semEntrada ? 'Você marcou que este mês não entrou nada. Tudo certo, anotado.' : r.quantas ? `${r.quantas} ${r.quantas === 1 ? 'entrada' : 'entradas'} neste mês. Toque em "Entradas do mês" embaixo pra ver o relatório.` : 'Nenhuma entrada neste mês ainda. Quando receber, use o botão Lançar.';
  // previstas (15/11): o que ainda vai cair, do mais perto pro mais longe, com o botão Recebi
  const prev = [...state.previstas].sort((a, b) => a.date.localeCompare(b.date));
  $('#previstas-box').hidden = !prev.length;
  $('#previstas-lista').innerHTML = prev.map(p => `<li><span>${p.date.slice(8, 10)}/${p.date.slice(5, 7)} · ${esc(srcById(p.sourceId)?.name || 'Entrada')}${p.note ? ` <small>${esc(p.note)}</small>` : ''}</span>`
    + `<span class="num">${formatBRL(p.amountCents)}</span><button type="button" class="ghost small" data-recebi="${esc(p.id)}">Recebi</button></li>`).join('');
  const box = $('#falta-receber');
  const doMesPrev = prev.filter(p => p.date.slice(0, 7) === state.viewMonth);
  if (doMesPrev.length) { // com previsto, o "falta receber" usa o que você lançou, não o mês passado
    const tot = doMesPrev.reduce((t, p) => t + p.amountCents, 0);
    const ult = doMesPrev[doMesPrev.length - 1].date;
    box.hidden = false;
    $('#falta-titulo').textContent = 'Falta receber';
    $('#falta-valor').textContent = formatBRL(tot);
    $('#falta-ate').textContent = `até o dia ${Number(ult.slice(8, 10))}`;
    $('#falta-sub').textContent = `Já entrou ${formatBRL(r.totalCents)}; com o previsto, o mês fecha em ${formatBRL(r.totalCents + tot)} de entradas.`;
    return;
  }
  box.hidden = !r.passadoCents;
  if (!r.passadoCents) return;
  if (r.faltaCents) {
    $('#falta-titulo').textContent = 'Falta receber';
    $('#falta-valor').textContent = formatBRL(r.faltaCents);
    $('#falta-ate').textContent = 'pra igualar o mês passado';
    $('#falta-sub').textContent = `O mês passado entrou ${formatBRL(r.passadoCents)}; este já recebeu ${formatBRL(r.totalCents)}.`;
  } else {
    $('#falta-titulo').textContent = 'Acima do mês passado';
    $('#falta-valor').textContent = formatBRL(r.acimaCents);
    $('#falta-ate').textContent = `(o mês passado entrou ${formatBRL(r.passadoCents)})`;
    $('#falta-sub').textContent = r.acimaCents ? 'Já entrou mais do que no mês passado.' : 'Igualzinho ao mês passado.';
  }
  if (r.aReceberCents) $('#falta-sub').textContent += ` Fora isso, ${formatBRL(r.aReceberCents)} pra receber de amigos.`;
}

// ---------- "Dá pra gastar R$ X até o dia do salário" (15/11, ideia do Code, ok do JF) ----------
function renderPodeGastar(isCurrent) {
  const box = $('#pode-gastar');
  const p = isCurrent ? podeGastar(dados(), toISODate()) : null;
  box.hidden = !p;
  // sem orçamento, o "Defina orçamentos…" some quando já tem o número principal (menos texto na tela)
  $('#total-sub').hidden = !!p && $('#total-bar-wrap').hidden;
  if (!p) return;
  const [, mm, dd] = p.ate.split('-');
  const ate = p.diaSalario ? `até o salário (dia ${Number(dd)})` : 'até o fim do mês';
  $('#pode-valor').textContent = formatBRL(Math.max(0, p.sobraCents));
  $('#pode-valor').className = `num ${p.sobraCents > 0 ? 'ok' : 'bad'}`;
  $('#pode-ate').textContent = ate;
  $('#pode-dia').textContent = p.sobraCents > 0
    ? `≈ ${formatBRL(p.porDiaCents)} por dia nos próximos ${p.dias} ${p.dias === 1 ? 'dia' : 'dias'}`
    : `O mês já passou ${formatBRL(-p.sobraCents)} do que entrou, contando o que ainda vai sair.`;
  // previsto (15/11): o que ainda vai cair até lá entra só como aviso, não no número grande (dinheiro que não caiu não se gasta)
  const vem = state.previstas.filter(x => x.date <= p.ate);
  if (vem.length) {
    const tot = vem.reduce((t, x) => t + x.amountCents, 0);
    $('#pode-dia').textContent += ` · Com os ${formatBRL(tot)} que você vai receber, sobe pra ${formatBRL(Math.max(0, p.sobraCents) + tot)}.`;
  }
  box.dataset.mes = mm;
}

// ---------- Orçamento diário ideal (V2 do AI Studio, 13/11): o limite mora no perfil, que sincroniza ----------
function renderHoje() {
  const o = progressoOrcamentoDiario(state.expenses, state.perfil?.orcamentoDiarioCents, toISODate());
  const lanc = `${o.countHoje} ${o.countHoje === 1 ? 'gasto' : 'gastos'} hoje`;
  $('#hoje-gasto').textContent = formatBRL(o.gastoHojeCents);
  $('#res-hoje').textContent = o.limiteCents ? `${formatBRL(o.gastoHojeCents)} de ${formatBRL(o.limiteCents)}` : formatBRL(o.gastoHojeCents);
  $('#hoje-card').dataset.status = o.status;
  $('#hoje-ajustar').textContent = o.limiteCents ? 'Ajustar' : 'Definir limite';
  $('#hoje-remover').hidden = !o.limiteCents;
  $('#hoje-bar-wrap').hidden = !o.limiteCents;
  if (!o.limiteCents) {
    $('#hoje-de').textContent = '';
    $('#hoje-sub').textContent = `${lanc}. Defina um limite por dia pra eu te mostrar quanto ainda dá.`;
    return;
  }
  $('#hoje-de').textContent = `de ${formatBRL(o.limiteCents)}`;
  $('#hoje-bar').setAttribute('style', barStyle(o.gastoHojeCents / o.limiteCents));
  $('#hoje-sub').textContent = o.status === 'estourado'
    ? `${lanc} · passou ${formatBRL(o.excedidoCents)} do limite (${o.pct}%).`
    : `${lanc} · restam ${formatBRL(o.restanteCents)} (${o.pct}% usado).`;
}

function abrirLimiteDiario(abrir = $('#hoje-form').hidden) {
  $('#hoje-form').hidden = !abrir;
  $('#hoje-ajustar').setAttribute('aria-expanded', String(abrir));
  $('#hoje-erro').hidden = true;
  if (abrir) { $('#hoje-limite').value = centsToInput(state.perfil?.orcamentoDiarioCents || 0); $('#hoje-limite').focus(); }
}

async function salvarLimiteDiario(cents) {
  state.perfil = { ...(state.perfil || {}), orcamentoDiarioCents: cents || null };
  await db.setMeta('perfil', state.perfil);
  abrirLimiteDiario(false);
  renderHoje();
  toast(cents ? `Limite de hoje em diante: ${formatBRL(cents)} por dia.` : 'Limite diário removido.');
}

/** Atalhos do Início: abre o Lançar já no modo certo (transferência mora em Contas). */
/** Entradas (15/11, JF + Anne): o mesmo relatório dos gastos (tela de Análise), só que com as entradas do mês. */
function mostrarEntradas() {
  state.filtroTipo = 'entrada';
  state.filtroCat = null;
  location.hash = 'analise';
  render();
}

function atalho(tipo) {
  if (tipo === 'entradas') return mostrarEntradas(); // 15/11 (JF + Anne): mostra ali mesmo o que entrou no mês
  if (tipo === 'transf') {
    location.hash = 'contas';
    setTimeout(() => { const t = $('#transf-card'); t.open = true; t.scrollIntoView({ block: 'start' }); }, 50);
    return;
  }
  const r = document.querySelector(`input[name="kind"][value="${tipo}"]`);
  r.checked = true; state.kind = tipo;
  location.hash = 'lancar';
  renderLancar();
  setTimeout(() => $('#amount').focus(), 50);
}

/** Últimos lançamentos (JF, 13/11): no Lançar, pra conferir, corrigir ou apagar o que acabou de anotar. */
function renderUltimos() {
  const el = $('#ultimos-list');
  if (!el) return;
  const lista = [
    ...state.expenses.map(x => ({ ...x, kind: 'gasto' })),
    ...state.incomes.map(x => ({ ...x, kind: 'entrada' })),
  ].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
  $('#ultimos-card').hidden = !lista.length;
  $('#res-ultimos').textContent = lista.length ? `${lista.length} mais recentes` : '';
  el.innerHTML = lista.map(x => {
    const [, m, d] = x.date.split('-');
    const nome = x.kind === 'entrada' ? (x.note || srcById(x.sourceId)?.name || 'Entrada') : (x.note || catById(x.categoryId)?.name || 'Gasto');
    const ico = x.kind === 'entrada' ? icFonte(srcById(x.sourceId)) : icCat(catById(x.categoryId));
    return `<li class="${x.kind === 'entrada' ? 'entrada' : ''}">
      <span class="exp-emoji${x.kind === 'entrada' ? '' : ' cat'}" style="--cor-cat:${corCategoria(x.categoryId)}" aria-hidden="true">${ico}</span>
      <span class="exp-main"><span>${esc(nome)}</span><small>${d}/${m} · ${x.kind === 'entrada' ? 'entrada' : esc(catById(x.categoryId)?.name || '')}</small></span>
      <span class="num">${x.kind === 'entrada' ? '+' : ''}${formatBRL(x.amountCents)}</span>
      <button class="icon-btn edit" data-edit="${esc(x.id)}" data-kind="${x.kind}" aria-label="Editar">${ic('i-editar')}</button>
      <button class="icon-btn del" data-del="${esc(x.id)}" data-kind="${x.kind}" aria-label="Apagar">×</button>
    </li>`;
  }).join('');
}

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
  const net = inc - s.totalCents;
  $('#stat-in').textContent = formatBRL(inc);
  // 15/11 (JF + GPT): entrou mais que saiu, é "Sobra do mês" (verde); saiu mais que entrou, vira "Déficit do mês"
  // (laranja), com a diferença negativa entre gastos e entradas, e não o saldo das contas
  const deficit = net < 0;
  $('#stat-net-tit').textContent = deficit ? 'Déficit do mês' : 'Sobra do mês';
  $('#stat-net').textContent = formatBRL(Math.abs(net));
  $('#stat-net').className = `num ${deficit ? 'warn' : net > 0 ? 'ok' : ''}`;
  $('#stat-net-box').classList.toggle('deficit', deficit);
  $('#stat-net-box').classList.toggle('sobra', net > 0); // 15/11 (JF): a sobra também ganha o quadrinho, em verde
  $('#stat-bank').textContent = state.accounts.length ? saldoTxt(totalBalance(state.accounts, state.expenses, state.incomes, state.transferencias)) : '—';
  renderComece();

  renderOfensiva();
  renderAReceber();

  // Alertas (só no mês atual)
  const alertas = isCurrent ? analyze(dados()) : [];
  $('#alerts-card').hidden = !alertas.length;
  $('#alert-list').innerHTML = alertas.map(a => `
    <li class="${a.severity}">${ic(ICONE_ALERTA[a.type] || 'i-alerta')}<span>${esc(cap(nomeAlerta(a)))}</span></li>`).join('');

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

export function ofensivaAgora() {
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
  // calendário dos últimos 28 dias (13/11)
  const cal = calendarioOfensiva({ expenses: state.expenses, incomes: state.incomes, diasSemGasto: state.perfil?.diasSemGasto || [] }, toISODate());
  const feitos = cal.filter(c => c.anotado).length;
  $('#ofensiva-cal').setAttribute('aria-label', `Últimos 28 dias: anotou em ${feitos}.`);
  $('#ofensiva-cal').innerHTML = cal.map(c => {
    const [, m, d] = c.data.split('-');
    const tipo = c.semGasto ? 'sem' : c.anotado ? 'feito' : '';
    return `<li class="${tipo}${c.hoje ? ' hoje' : ''}" title="${d}/${m}${c.semGasto ? ': sem gastos' : c.anotado ? ': anotou' : ''}"><span>${Number(d)}</span></li>`;
  }).join('');
}

const OFENSIVA_DESLIGADA = true;
/** Se o lançamento de agora acendeu o dia e bateu um marco (3, 7, 14, 30…), o C.A.O.S. comemora. */
export function eventoOfensiva(antes) {
  if (OFENSIVA_DESLIGADA) return []; // 15/11 (Anne): sem comemoração vazia até a ofensiva ser repensada
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
      <a class="ghost small btn-link" href="https://wa.me/?text=${encodeURIComponent(mensagemCobranca(x))}" target="_blank" rel="noopener" aria-label="Cobrar ${esc(x.nome)} no WhatsApp">Cobrar</a>
      <button type="button" class="ghost small" data-recebi="${esc(x.expenseId)}" data-pessoa="${esc(x.pessoaId)}" aria-label="Recebi de ${esc(x.nome)}">✓ Recebi</button></li>`;
  }).join('');
}

/** Pergunta em qual conta o Pix do amigo caiu. Devolve o id, '' (sem conta) ou null (cancelou). */

async function recebi(expenseId, pessoaId) {
  const e = state.expenses.find(x => x.id === expenseId);
  if (!e) return;
  // rachadinha no cartão (13/11): o gasto foi no crédito, mas o Pix do amigo cai numa conta. Pergunta qual.
  const doGasto = e.accountId && state.accounts.find(a => a.id === e.accountId);
  let contaPix = null;
  if ((!doGasto || doGasto.tipo === 'cartao') && state.accounts.some(a => a.tipo !== 'cartao')) {
    const pessoa = e.racha.find(x => x.id === pessoaId);
    const escolha = await perguntarContaDoPix(pessoa.nome, pessoa.valorCents);
    if (escolha === null) return;
    contaPix = escolha || null;
  }
  const novo = marcarRecebido(e, pessoaId, Date.now(), contaPix);
  await db.put(db.STORES.expenses, novo);
  state.expenses = state.expenses.map(x => (x.id === expenseId ? novo : x));
  const p = novo.racha.find(x => x.id === pessoaId);
  const destino = p.contaId || e.accountId;
  const conta = destino && state.accounts.find(a => a.id === destino && a.tipo !== 'cartao');
  render();
  toast(`Recebido: ${formatBRL(p.valorCents)} de ${p.nome}.${conta ? ` Voltou pro saldo de ${accountLabel(conta)}.` : ''}`);
}

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
  for (const r of document.querySelectorAll('input[name="estilo"]')) r.checked = r.value === (state.settings.estilo || 'atual');
  $('#estilo-desc').textContent = ESTILO_DESC[state.settings.estilo || 'atual'];
  $('#voz-vel').value = state.settings.vozVel ?? 1;
  $('#voz-vel-out').textContent = `${Number(state.settings.vozVel ?? 1).toFixed(1).replace('.', ',')}×`;
  $('#menos-mov').checked = MENOS_MOVIMENTO.matches;
  $('#voice-toggle').closest('label').hidden = !vozDisponivel();
  $('#caos-version').textContent = `${IDENTIDADE.nome} ${CAOS_VERSAO} (núcleo ${IDENTIDADE.nucleo}) · ${IDENTIDADE.sigla}. ${IDENTIDADE.slogan} Criado por ${IDENTIDADE.criador}, veio do ${IDENTIDADE.origem}.`;
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

// ---------- Blocos e privacidade (14/11, teste da Anne: "rola sem fim, não sei por onde começar, e qualquer um que
// abrir vê meu saldo") ----------
// Cada seção grande vira um bloco que abre e fecha (<details data-bloco>); o app lembra do jeito que a pessoa deixou.
// Saldo das contas começa escondido (R$ ••••); o olhinho mostra.
// Estilo do app (Anne, 14/11): Atual (a cara C.A.O.S.), Limpo (sem brilho neon, menos cor) e Direto (só o essencial)
const ESTILO_DESC = {
  atual: 'A cara do C.A.O.S.: neon, cores por categoria e tudo à mão.',
  limpo: 'Sem brilho neon e com menos cor. Tudo continua lá, mais calmo.',
  direto: 'Só o que você precisa: resumo, lançar e a lista. Gráficos e extras somem do Início e do Mês.',
};
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
const GUIAS = {
  conta: { passo: 'Passo 1 de 5 · sua conta no app', hash: 'ajustes', abre: '#conta-card', foco: '#conta-card',
    texto: 'Aqui você cria seu login: escolha um apelido e uma senha. Com ele, seus dados aparecem no celular, no tablet e no computador, e sobem embaralhados com a sua senha (nem o servidor consegue ler). Prefere não criar? Pode pular: o app funciona só neste aparelho.' },
  banco: { passo: 'Passo 2 de 5 · seu banco', hash: 'contas', abre: '#add-conta-card', foco: '#add-conta-card',
    texto: 'Escolha o banco, o tipo de conta e coloque o saldo que aparece no app do banco. A gente nunca pede número de cartão, agência nem senha: só valores. O app não mexe no seu banco; o saldo é você que atualiza de vez em quando.' },
  entrada: { passo: 'Passo 3 de 5 · o que você recebe', kind: 'entrada', foco: '#entry-form',
    texto: 'Coloque quanto entrou (salário, freela, Pix) e em qual conta caiu. Se o dinheiro ainda vai cair, marque "Ainda vou receber". Se este mês não entrou nada, toque em "Este mês não entrou nada".' },
  gasto: { passo: 'Passo 4 de 5 · seu primeiro gasto', kind: 'gasto', foco: '#entry-form',
    texto: 'Valor, o que foi e como pagou. Mais rápido ainda: no Chat, escreva "gastei 30 no mercado" ou mande a foto do comprovante. Hoje não gastou nada? Toque em "Hoje não gastei nada".' },
  chat: { passo: 'Passo 5 de 5 · converse comigo', hash: 'conversa', foco: '#chat-form',
    texto: 'Aqui você fala comigo: "quanto gastei este mês?", "dá pra gastar quanto até o salário?", "vou receber 500 dia 20". A IA online já vem ligada pra perguntas mais livres. Se travar, toca no "?" que eu ajudo.' },
};

function guiar(id) {
  const g = GUIAS[id];
  if (!g) return;
  if (g.kind) atalhoLancar(g.kind); else location.hash = g.hash;
  setTimeout(() => {
    const d = g.abre && $(g.abre);
    if (d && 'open' in d) d.open = true;
    document.querySelectorAll('.guia-foco').forEach(e => e.classList.remove('guia-foco'));
    const alvo = $(g.foco);
    if (alvo) { alvo.classList.add('guia-foco'); alvo.scrollIntoView({ behavior: MENOS_MOVIMENTO.matches ? 'auto' : 'smooth', block: 'start' }); }
    $('#guia-passo').textContent = g.passo;
    $('#guia-texto').textContent = g.texto;
    $('#guia-pular').hidden = id !== 'conta';
    $('#guia').hidden = false;
  }, 120);
}
function fecharGuia() {
  $('#guia').hidden = true;
  document.querySelectorAll('.guia-foco').forEach(e => e.classList.remove('guia-foco'));
}
function atalhoLancar(tipo) {
  const r = document.querySelector(`input[name="kind"][value="${tipo}"]`);
  if (r) { r.checked = true; state.kind = tipo; }
  location.hash = 'lancar';
  renderLancar();
}

function renderComece() {
  const temBanco = state.accounts.some(a => a.tipo !== 'cartao');
  const passos = [
    { feito: !!state.temConta || !!state.settings.pulouConta, txt: 'Crie sua conta no app (ou pule)', ir: 'conta' },
    { feito: temBanco, txt: 'Cadastre a conta do seu banco', ir: 'banco' },
    { feito: state.incomes.length > 0 || state.previstas.length > 0 || (state.perfil?.mesesSemEntrada || []).length > 0, txt: 'Lance o que você recebe', ir: 'entrada' },
    { feito: state.expenses.length > 0 || (state.perfil?.diasSemGasto || []).length > 0, txt: 'Anote seu primeiro gasto', ir: 'gasto' },
    { feito: state.chat.some(m => m.de === 'eu'), txt: 'Converse com o C.A.O.S.', ir: 'chat' },
  ];
  const feitos = passos.filter(p => p.feito).length;
  $('#comece-card').hidden = feitos === passos.length;
  $('#comece-conta').textContent = `${feitos} de ${passos.length}`;
  $('#comece-lista').innerHTML = passos.map((p, i) => `
    <li class="${p.feito ? 'feito' : ''}">${p.feito
      ? `<span class="passo-n" aria-hidden="true">${ic('i-ok')}</span><span>${esc(p.txt)}</span>`
      : `<button type="button" data-guia="${p.ir}"><span class="passo-n" aria-hidden="true">${i + 1}</span><span>${esc(p.txt)}</span><span class="passo-seta" aria-hidden="true">›</span></button>`}</li>`).join('');
}

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
    compromissos: state.compromissos, planos: state.planos, perfil: state.perfil, metas: state.metas, investimentos: state.investimentos, transferencias: state.transferencias,
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
    // tudo numa gravação só (achado do GPT, 13/11): ou entra o backup inteiro, ou nada muda; a tela só troca depois
    await db.replaceAll({ expenses: d.expenses, categories: d.categories, incomes: d.incomes, accounts: d.accounts, compromissos: d.compromissos, planos: d.planos },
      { perfil: d.perfil, metas: d.metas, investimentos: d.investimentos, transferencias: d.transferencias || [] });
    Object.assign(state, { expenses: d.expenses, categories: d.categories, incomes: d.incomes, accounts: d.accounts, compromissos: d.compromissos, planos: d.planos,
      metas: d.metas, investimentos: d.investimentos, transferencias: d.transferencias || [] });
    // backup sem perfil (decisão do Wally, 13/11): mantém quem você é neste aparelho (nome, aniversário, selo)
    if (d.perfil) { state.perfil = d.perfil; renderPerfil(); }
    renderMetas(); renderInvestimentos();
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


/** Simulador "E se eu comprar?" (13/11): só leitura, não grava nada. */

// ======================================================================
// Primeiro acesso: o C.A.O.S. conhece a pessoa (1.3.0)
// ======================================================================

const FOCOS = ['Controlar o dia a dia', 'Sair do vermelho', 'Juntar dinheiro', 'Organizar contas e planos', 'Entender investimentos'];

export function renderPerfil() {
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

// ---------- Botão "Me ajuda" (JF, 13/11) ----------
// Pedido do JF: um formato só (antes encolhia pro "?" ao rolar e voltava, e isso incomodava), dá pra arrastar pra
// qualquer canto (o app lembra onde ficou) e o toque abre um menuzinho de ajuda rápida. Não vai pro cabeçalho: o pedido
// do JF vem antes da sugestão do Code. No computador ele mora no menu lateral e não arrasta.
// cada item com uma cor e um ícone (JF, 13/11 à noite: "cada um de uma cor, mais intuitivo, sem exagero")
const AJUDA_RAPIDA = [
  { q: 'Como lanço um gasto?', ic: 'i-gasto', cor: 'var(--accent)' },
  { q: 'Quanto gastei este mês?', ic: 'i-lupa', cor: 'var(--cyan)' },
  { q: 'Como ponho orçamento?', ic: 'i-meta', cor: 'var(--warn)' },
  { q: 'Como registro meu cartão?', ic: 'a-cartao', cor: 'var(--violet)' },
  { q: 'O que você pode fazer?', ic: 'i-conversa', cor: 'var(--caos)' },
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
  const y = Math.min(Math.max(topo, p.y * innerHeight), fundo - h - 8);
  Object.assign(b.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
}

function fecharAjudaMenu() { $('#ajuda-menu').hidden = true; $('#me-ajuda').setAttribute('aria-expanded', 'false'); }

function abrirAjudaMenu() {
  const b = $('#me-ajuda'), m = $('#ajuda-menu');
  m.hidden = false;
  b.setAttribute('aria-expanded', 'true');
  // abre pro lado que tem espaço: em cima se o botão está embaixo, e alinhado ao lado mais perto da borda
  const r = b.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
  const top = r.top > innerHeight / 2 ? r.top - mh - 8 : r.bottom + 8;
  const left = r.left + r.width / 2 > innerWidth / 2 ? r.right - mw : r.left;
  Object.assign(m.style, { top: `${Math.max(8, top)}px`, left: `${Math.min(Math.max(8, left), innerWidth - mw - 8)}px` });
  m.querySelector('button')?.focus();
}

function ligarMeAjuda() {
  const b = $('#me-ajuda'), m = $('#ajuda-menu');
  m.innerHTML = AJUDA_RAPIDA.map(a => `<button type="button" role="menuitem" data-q="${esc(a.q)}" style="--cor-item:${a.cor}">${ic(a.ic)}<span>${esc(a.q)}</span></button>`).join('')
    + `<button type="button" role="menuitem" data-q="" class="ajuda-tudo">${ic('i-livro')}<span>Ver toda a ajuda</span></button>`;
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
  document.addEventListener('click', e => { const g = e.target.closest('[data-guia]'); if (g) guiar(g.dataset.guia); });
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
  comecarAbertura();
  ligarAvatares();
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
  if (!state.perfil) iniciarOnboarding();
  else { await parabensSeForODia(); await perguntarAniversarioUmaVez(); }
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
  narrate([...closing, ...radar, ...especial, ...dicaMeta, ...(fato ? [fato] : []), { type: 'boas_vindas' }]);
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
    // que o app volta pra frente; quando a nova assume, recarrega sozinho (se a pessoa não estiver digitando)
    const tinhaControle = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
      reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(err => console.warn('SW não registrado', err));
    let recarregou = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!tinhaControle || recarregou) return;
      const digitando = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && document.activeElement.value;
      if (digitando) { toast('Tem versão nova do app: feche e abra de novo pra atualizar.'); return; }
      recarregou = true;
      location.reload();
    });
  }
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
function comecarAbertura() {
  const ab = $('#abertura');
  if (!ab) return;
  try {
    configurarAvatar({ menosMovimento: () => MENOS_MOVIMENTO.matches });
    avatares.abertura = criarAvatar($('#abertura-avatar'), { tamanho: 'grande', forma: ABERTURA_PASSOS[0][0] });
  } catch (e) { console.warn('avatar', e); }
  const dica = $('#abertura-dica');
  ABERTURA_PASSOS.forEach(([forma, frase], i) => setTimeout(() => {
    if (aberturaFechada || ab.classList.contains('esperando')) return;
    avatares.abertura?.mostrar(forma);
    if (dica) dica.textContent = frase;
  }, i * (ABERTURA_MS / ABERTURA_PASSOS.length)));
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
    setTimeout(fecharAbertura, Math.max(0, ABERTURA_MS - performance.now()));
    return;
  }
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
