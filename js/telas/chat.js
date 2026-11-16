// Tela do Chat (16/11, corte do app.js): mensagens, pergunta pro C.A.O.S. e pra IA online, fila do "amanhã eu trago",
// confirmar o que ele propôs, foto e print no chat. Mudou só de arquivo, o jeito de funcionar é o mesmo.
// Quem grava continua sendo a UI (via db.js), depois do Confirmar da pessoa.

import { $, catById, dados, esc, renderizar, state } from '../estado.js';
import { EMO_DA_FORMA, FORMAS, formaPara } from '../avatar.js';
import { IDENTIDADE, SUGESTOES, conversar, humorParaIA, emocaoDoMomento, rostoAvulso, rostoDaEmo } from '../caos/index.js';
import { accountLabel, createTransferencia, depoisDoSaldo, marcarRecebido, editarConta, editarLancamento, formatBRL, sugerirCategoria, toISODate } from '../engine.js';
import * as conta from '../conta.js';
import { lerPagamento, seguirPagamento } from '../caos/conversa.js';
import * as db from '../db.js';
import { falar } from '../voz.js';
import { fraseDoPrint, resumoDoPrint } from '../caos/ofertas.js';
import * as ia from '../ia.js';
import * as imagens from '../imagens.js';
import { MENOS_MOVIMENTO, avatarFala, formaDaMsg, guardarMemoria, ic, narrate, onboardingResposta, pintarRosto, renderPerfil, setRosto } from '../app.js';
import { registrarEntrada, registrarGasto } from './lancar.js';
import { guardarEmMeta, iniciarMeta, metaResposta, renderMes, salvarMetas } from './mes.js';
import { renderContas } from './contas.js';

// A IA online não recebe o nome da pessoa (privacidade): ela escreve {nome} e o app troca aqui, no aparelho (JF, 16/11)
export function trocarNome(texto, nome) {
  const t = String(texto ?? '');
  if (!t.includes('{nome}')) return t;
  if (nome) return t.replaceAll('{nome}', nome);
  return t.replace(/,\s*\{nome\}/g, '').replace(/\{nome\}\s*,\s*/g, '').replace(/\{nome\}/g, '').replace(/\s{2,}/g, ' ').trim();
}

export function addMsg(msg) {
  if (msg.texto) msg.texto = trocarNome(msg.texto, state.perfil?.apelido);
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

export function renderChat() {
  const log = $('#chat-log');
  if (!state.chat.length) {
    log.innerHTML = `<li class="msg caos-msg"><span class="who">C.A.O.S.</span>Oi! Sou o C.A.O.S. ${esc(IDENTIDADE.slogan)} Me pergunta dos seus gastos, manda "gastei 30 no mercado" ou a foto de um comprovante.</li>`;
  } else {
    log.innerHTML = state.chat.map((m, i) => {
      if (m.de === 'eu') {
        return `<li class="msg eu">${m.url ? `<img src="${esc(m.url)}" alt="Foto enviada">` : ''}${esc(m.texto || '')}</li>`;
      }
      const acao = m.acao && !m.acaoFeita
        ? `<div class="acao"><button class="sim" data-acao="${i}" data-ok="1">${ic('i-ok')} Confirmar</button><button class="nao" data-acao="${i}" data-ok="0">Cancelar</button></div>`
        : '';
      const f = formaDaMsg(m), fcor = FORMAS[f]?.cor || 'var(--caos)';
      if (m.digitando) return `<li class="msg caos-msg pensando digitando" style="--msg-cor:${fcor}" aria-label="C.A.O.S. está digitando"><span class="who" aria-hidden="true"><span class="caos-face mini" data-msg="${i}"></span></span><span class="pontos" aria-hidden="true"><i></i><i></i><i></i></span> digitando</li>`;
      return `<li class="msg caos-msg ${m.temp ? 'pensando' : ''}" style="--msg-cor:${fcor}"><span class="who" aria-label="C.A.O.S.${m.ia ? ' com IA' : ''}"><span class="caos-face mini" data-msg="${i}" aria-hidden="true"></span>${m.ia ? '<span class="tag-ia">IA</span>' : ''}</span>${textoDaMsg(m.texto)}${acao}</li>`;
    }).join('');
    // rostinho no balão (JF, 13/11 à noite: "emoji quebra a lógica; os rostinhos é que dão a característica dele").
    // Combina com o avatar: o rosto da própria fala, se já bate com a forma; senão, o rostinho da forma. Mesma cor.
    for (const el of log.querySelectorAll('[data-msg]')) {
      const i = Number(el.dataset.msg), m = state.chat[i];
      if (!m) continue;
      const f = formaDaMsg(m);
      const r = m.rosto?.quadros && formaPara({ rosto: m.rosto }) === f ? m.rosto : rostoDaEmo(EMO_DA_FORMA[f] || 'calmo', i);
      setRosto(el, r);
      if (FORMAS[f]) el.style.setProperty('--emo-cor', FORMAS[f].cor);
    }
  }
  const ult = [...state.chat].reverse().find(m => m.de === 'caos');
  const sug = ult?.sugestoes?.length ? ult.sugestoes : SUGESTOES.slice(0, 6);
  // atalhos pras outras abas (ideia do AI Studio, 13/11): só levam até lá, nunca fazem nada sozinhos
  const ATALHOS = [['#lancar', 'i-lancar', 'Lançar'], ['#contas', 'i-contas', 'Contas'], ['#mes', 'i-mes', 'Mês']];
  $('#chat-suggestions').innerHTML = sug.map(s => `<button type="button" class="chip" data-sug="${esc(s)}">${esc(s)}</button>`).join('')
    + (state.onboarding || state.metaFlow ? [] : ATALHOS).map(([h, i, t]) => `<button type="button" class="chip atalho" data-ir="${h}" aria-label="Ir para ${t}">${ic(i)} ${t}</button>`).join('');
  if (!$('#tela-conversa').hidden) window.scrollTo(0, document.body.scrollHeight);
}

export const IA_POR_DIA = 20;

export const iaRecentes = new Map();

export async function usoDaIAHoje() {
  const u = await db.getMeta('iaUso', null).catch(() => null);
  return u && u.dia === toISODate() ? u : { dia: toISODate(), n: 0 };
}

export async function enviarPergunta(texto, { doPrint = false } = {}) {
  const t = String(texto || '').trim();
  if (!t) return;
  if (state.onboarding) return onboardingResposta(t);
  if (state.metaFlow) return metaResposta(t);
  if (!doPrint) addMsg({ de: 'eu', texto: t });
  const { fala, memoria } = conversar(t, dados(), { mood: state.settings.mood, memory: state.caosMemory, now: Date.now(), perfil: state.perfil });
  guardarMemoria(memoria);
  pintarRosto(fala.rosto, fala.intent);

  // Travas de crédito no aparelho (15/11, JF: "IA de bolso, sem abusar"): a mesma pergunta na última meia hora usa a
  // resposta guardada; e cada aparelho manda no máximo IA_POR_DIA perguntas por dia pra IA (o servidor tem os dele).
  // revisão do Gemini (16/11): a chave do cache e a fila usam o texto que vai pra IA (com o assunto junto) e o humor
  const textoIA = fala.perguntaIA || t;
  const humorIA = humorParaIA(state.settings.mood, state.perfil);
  const chaveIA = `${humorIA}|${textoIA.toLowerCase().replace(/\s+/g, ' ').trim()}`;
  const repetida = iaRecentes.get(chaveIA);
  if (!fala.entendeu && repetida && Date.now() - repetida.em < 30 * 60_000) {
    addMsg({ de: 'caos', texto: repetida.texto, ia: true, sugestoes: SUGESTOES.slice(0, 5), rosto: fala.rosto });
    return;
  }
  const usoIA = await usoDaIAHoje();
  // o criador não tem limite no aparelho (JF, 16/11: "quem tá pagando sou eu"); o servidor também libera pelo selo da conta
  const iaCansada = !fala.entendeu && state.settings.aiOn && state.settings.aiUrl && usoIA.n >= IA_POR_DIA && !state.perfil?.seloCriador;
  if (iaCansada) {
    fala.texto = `Por hoje a minha IA online já respondeu ${IA_POR_DIA} perguntas: sou uma IA de bolso e economizo pra não pesar no bolso de ninguém. Amanhã eu volto com tudo! Enquanto isso, pergunta dos seus gastos que eu respondo aqui mesmo.`;
  } else if (!fala.entendeu && state.settings.aiOn && state.settings.aiUrl) {
    const pensando = rostoAvulso('pensando', { mood: state.settings.mood, memory: state.caosMemory });
    pintarRosto(pensando);
    addMsg({ de: 'caos', texto: 'Deixa eu pensar com a IA…', temp: true, rosto: pensando });
    try {
      const resposta = await ia.perguntar(state.settings.aiUrl, { pergunta: textoIA, humor: humorIA, dados: dados(), modo: fala.modoIA, semBusca: fala.intent === 'papo_pessoal', emocao: fala.emocao });
      await db.setMeta('iaUso', { dia: toISODate(), n: usoIA.n + 1 });
      iaRecentes.set(chaveIA, { texto: resposta, em: Date.now() });
      state.chat = state.chat.filter(m => !m.temp);
      addMsg({ de: 'caos', texto: resposta, ia: true, sugestoes: SUGESTOES.slice(0, 5), rosto: fala.rosto });
      pintarRosto(fala.rosto);
      if (state.settings.voice) falar(trocarNome(resposta, state.perfil?.apelido).replace(/\*\*/g, ''));
      return;
    } catch (e) {
      state.chat = state.chat.filter(m => !m.temp);
      const guardou = fala.palpite ? false : await guardarPergunta(textoIA);
      addMsg({ de: 'caos', texto: `${fala.texto}${guardou ? ' A IA online não respondeu agora, mas guardei sua pergunta e trago a resposta depois.' : ` (A IA online não respondeu: ${e.message})`}`, sugestoes: fala.sugestoes, rosto: fala.rosto });
      pintarRosto(fala.rosto);
      return;
    }
  }
  if (!iaCansada && !fala.entendeu && !fala.palpite && await guardarPergunta(textoIA)) {
    // Fila geral (1.6.0): o que ele não sabe vai pro servidor quando der; a resposta volta na conversa.
    fala.texto = 'Ainda não sei responder isso, mas guardei sua pergunta. Quando eu tiver conexão com o servidor do C.A.O.S. Finanças, eu trago a resposta aqui.';
  }
  await respiro(fala.texto);
  addMsg({ de: 'caos', texto: fala.texto, sugestoes: fala.sugestoes, acao: fala.acao, rosto: fala.rosto, assunto: fala.intent });
  pintarRosto(fala.rosto, fala.intent);
  avatarFala(Math.min(2600, 400 + fala.texto.length * 22));
  if (state.settings.voice) falar(fala.texto, fala.emocao);
  // 2º balão (JF, 16/11): "digitando…" de novo e o "ah, e…" logo depois, como amigo no WhatsApp
  if (fala.posTexto) {
    await respiro(fala.posTexto);
    addMsg({ de: 'caos', texto: fala.posTexto, rosto: fala.rosto, assunto: fala.intent });
    avatarFala(Math.min(2000, 400 + fala.posTexto.length * 22));
    if (state.settings.voice) falar(fala.posTexto, fala.emocao);
  }
  if (fala.filaIA) await perguntaPraDepois(fala.filaIA);
  if (fala.fluxoMeta) iniciarMeta(fala.fluxoMeta.nome, { jaFalou: true });
  if (fala.modoFoto) state.modoFoto = { tipo: fala.modoFoto, duvida: t, ate: Date.now() + 10 * 60_000 };
}

// Respiro antes da resposta (pedido do JF, 06/11): instantâneo demais "dá medo e quebra a imersão".
// 0,6 a 1,8 s conforme o tamanho da resposta; com "menos movimento", espera curta e sem animação. Não trava nada.
export const tempoDePensar = (texto, menosMovimento = false) =>
  menosMovimento ? 300 : Math.round(Math.min(1800, Math.max(600, 450 + String(texto || '').length * 9)));

export async function respiro(texto) {
  const id = `d${Date.now()}${Math.random()}`;
  const pensando = rostoAvulso('pensando', { mood: state.settings.mood, memory: state.caosMemory });
  pintarRosto(pensando);
  addMsg({ de: 'caos', texto: 'digitando…', temp: id, digitando: true, rosto: pensando });
  const espera = tempoDePensar(texto, MENOS_MOVIMENTO.matches);
  avatarFala(espera);
  await new Promise(r => setTimeout(r, espera));
  state.chat = state.chat.filter(m => m.temp !== id);
}

export async function perguntaPraDepois(item) {
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

export async function guardarPergunta(pergunta) {
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

export async function processarFila() {
  if (!(state.settings.aiOn && state.settings.aiUrl && navigator.onLine)) return;
  const fila = await db.getMeta('fila', []);
  if (!fila.length) return;
  const resta = [];
  for (const item of fila) {
    try {
      if (item.tipo === 'pergunta') {
        const texto = await ia.perguntar(state.settings.aiUrl, { pergunta: item.pergunta, humor: humorParaIA(state.settings.mood, state.perfil), dados: dados() });
        const nome = state.perfil?.apelido;
        addMsg({ de: 'caos', ia: true, texto: `Ei${nome ? `, ${nome}` : ''}, sabe aquela sua pergunta? "${item.pergunta}" Agora eu consigo responder: ${texto}` });
        $('#caos-line').textContent = 'Lembra daquela pergunta? Agora eu sei responder. Toca aqui pra ver.';
        continue;
      }
      if (item.tipo === 'explicar') {
        const img = await imagens.pegar(item.imagemId);
        if (!img) continue; // a foto foi apagada: tira da fila
        const texto = await ia.explicarImagem(state.settings.aiUrl, { base64: await imagens.paraBase64(img.blob), duvida: item.duvida, humor: humorParaIA(state.settings.mood, state.perfil) });
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

export async function confirmarAcao(i, ok) {
  const m = state.chat[i];
  if (!m?.acao || m.acaoFeita) return;
  m.acaoFeita = true;
  if (!ok) {
    addMsg({ de: 'caos', texto: 'Cancelado. Nada foi anotado.' });
    return;
  }
  try {
    const a = m.acao;
    // sem conta cadastrada, gasto e entrada esperam (Anne, 15/11): primeiro a conta
    if (['registrar_gasto', 'registrar_entrada', 'registrar_varios'].includes(a.tipo) && !state.accounts.some(x => x.tipo !== 'cartao')) {
      m.acaoFeita = false;
      addMsg({ de: 'caos', texto: 'Antes de anotar, cadastra uma conta (o banco e o saldo, nada de senha). Toca em Contas aqui embaixo, ou no passo 2 do "Comece por aqui", que eu te levo.' });
      return;
    }
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
    if (a.tipo === 'definir_piso') {
      const conta = state.accounts.find(x => x.id === a.accountId);
      if (!conta) { addMsg({ de: 'caos', texto: 'Não achei mais essa conta.' }); return; }
      const novo = editarConta(conta, { pisoCents: a.pisoCents }, { accounts: state.accounts });
      await db.put(db.STORES.accounts, novo);
      state.accounts = state.accounts.map(x => (x.id === novo.id ? novo : x));
      renderContas(); renderizar();
      addMsg({ de: 'caos', texto: `Piso de ${accountLabel(novo)} salvo: ${formatBRL(a.pisoCents)}. Quando o saldo chegar perto, eu aviso.` });
      return;
    }
    if (a.tipo === 'editar_data') {
      // "esse gasto foi na quarta" (14/11): o C.A.O.S. propõe, a pessoa confirma, o app grava
      const x = state.expenses.find(e => e.id === a.expenseId);
      if (!x) { addMsg({ de: 'caos', texto: 'Não achei mais esse gasto. Ele foi apagado?' }); return; }
      const novo = editarLancamento(x, { amountCents: x.amountCents, note: x.note, date: a.date, categoryId: x.categoryId }, { kind: 'gasto', categories: state.categories });
      await db.put(db.STORES.expenses, novo);
      state.expenses = state.expenses.map(e => (e.id === x.id ? novo : e));
      renderizar();
      addMsg({ de: 'caos', texto: `Pronto: agora está no dia ${Number(a.date.slice(8, 10))}/${Number(a.date.slice(5, 7))}.` });
      return;
    }
    if (a.tipo === 'editar_valor') {
      // "errei, foi 45, não 50" (revisão do Gemini, 16/11): o C.A.O.S. propõe, a pessoa confirma, o app grava
      const x = state.expenses.find(e => e.id === a.expenseId);
      if (!x) { addMsg({ de: 'caos', texto: 'Não achei mais esse gasto. Ele foi apagado?' }); return; }
      const novo = editarLancamento(x, { amountCents: a.amountCents, note: x.note, date: x.date, categoryId: x.categoryId }, { kind: 'gasto', categories: state.categories });
      await db.put(db.STORES.expenses, novo);
      state.expenses = state.expenses.map(e => (e.id === x.id ? novo : e));
      renderizar();
      addMsg({ de: 'caos', texto: `Pronto: agora está ${formatBRL(a.amountCents)}.` });
      return;
    }
    if (a.tipo === 'fatura_paga') {
      // "já paguei a fatura do C6" (16/11): mesma baixa do botão em Contas
      const cartao = state.accounts.find(x => x.id === a.cartaoId);
      if (!cartao) { addMsg({ de: 'caos', texto: 'Não achei mais esse cartão.' }); return; }
      const novo = { ...cartao, faturaPagaAte: a.ate };
      await db.put(db.STORES.accounts, novo);
      state.accounts = state.accounts.map(x => (x.id === novo.id ? novo : x));
      renderizar();
      addMsg({ de: 'caos', texto: `Fatura do ${accountLabel(novo)} paga. Limite de volta!` });
      return;
    }
    if (a.tipo === 'racha_recebido') {
      // "o João me pagou" (16/11): dá baixa na parte dele da rachadinha
      const x = state.expenses.find(e => e.id === a.expenseId);
      if (!x) { addMsg({ de: 'caos', texto: 'Não achei mais essa conta dividida.' }); return; }
      const novo = marcarRecebido(x, a.pessoaId);
      await db.put(db.STORES.expenses, novo);
      state.expenses = state.expenses.map(e => (e.id === x.id ? novo : e));
      renderizar();
      addMsg({ de: 'caos', texto: `Anotado: ${a.nome} te pagou ${formatBRL(a.valorCents)}.` });
      return;
    }
    if (a.tipo === 'transferir') {
      // "transferi 200 do Inter pro C6" (revisão do Gemini, 16/11): mesma gravação da tela de Contas
      const t = createTransferencia({ deId: a.deId, paraId: a.paraId, amountCents: a.amountCents, date: a.date }, { accounts: state.accounts });
      state.transferencias = [...state.transferencias, t];
      await db.setMeta('transferencias', state.transferencias);
      renderizar();
      addMsg({ de: 'caos', texto: `Transferência anotada: ${formatBRL(a.amountCents)}. Os saldos das duas contas já mudaram.` });
      return;
    }
    if (a.tipo === 'registrar_varios') {
      let eventos = [];
      // revisão do Gemini (16/11): junta os eventos de todos (antes só o último contava e um estouro do 1º sumia)
      for (const x of a.itens) eventos.push(...(await registrarGasto({ ...x, imageId: a.imageId })));
      const total = a.itens.reduce((t, x) => t + x.amountCents, 0);
      const fala = narrate(eventos, { ignoreCooldown: true });
      addMsg({ de: 'caos', texto: `Anotei os ${a.itens.length} pagamentos (${formatBRL(total)}).${fala ? ` ${fala.texto}` : ''}`, rosto: fala?.rosto });
      return;
    }
    const events = a.tipo === 'registrar_entrada'
      ? await registrarEntrada({ amountCents: a.amountCents, sourceId: a.sourceId, note: a.note, date: a.date, accountId: a.accountId || null, prevista: !!a.prevista })
      : await registrarGasto({ amountCents: a.amountCents, categoryId: a.categoryId, note: a.note, date: a.date, imageId: a.imageId, compromissoId: a.compromissoId, accountId: a.accountId,
          forma: a.forma || null, parcelas: a.parcelas || 1, limiteModo: a.limiteModo || 'total' });
    if (a.compromissoId) renderMes();
    const fala = narrate(events, { ignoreCooldown: true });
    addMsg({ de: 'caos', texto: fala ? fala.texto : 'Anotado!', rosto: fala?.rosto });
    // JF, 14/11: lançamento com data de antes do saldo informado já está dentro dele; o C.A.O.S. explica
    const conta = a.accountId && state.accounts.find(x => x.id === a.accountId && x.tipo !== 'cartao');
    if (conta && a.date && !depoisDoSaldo({ date: a.date, createdAt: Date.now() }, conta)) {
      addMsg({ de: 'caos', texto: `Só lembrando: como isso foi dia ${Number(a.date.slice(8, 10))}/${Number(a.date.slice(5, 7))}, antes do saldo de ${accountLabel(conta)} que você informou, o valor já está dentro dele. Anotei pra conta do mês, mas o saldo do banco não mudou.` });
    }
    if (state.settings.voice && fala) falar(fala.texto, fala.emocao);
  } catch (e) {
    m.acaoFeita = false;
    addMsg({ de: 'caos', texto: `Não consegui anotar: ${e.message}` });
  }
}

export async function explicarPrint(img, duvida) {
  const pronto = state.settings.aiOn && state.settings.aiUrl && navigator.onLine;
  if (pronto) {
    await respiro('Deixa eu olhar com calma o que o banco quis dizer.');
    addMsg({ de: 'caos', texto: 'Olhando o print com a IA…', temp: true, rosto: rostoAvulso('pensando', { mood: state.settings.mood, memory: state.caosMemory }) });
    try {
      const texto = await ia.explicarImagem(state.settings.aiUrl, { base64: await imagens.paraBase64(img.blob), duvida, humor: humorParaIA(state.settings.mood, state.perfil) });
      state.chat = state.chat.filter(m => !m.temp);
      addMsg({ de: 'caos', ia: true, texto });
      if (state.settings.voice) falar(trocarNome(texto, state.perfil?.apelido).replace(/\*\*/g, ''));
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

// Negrito simples (14/11: a IA às vezes manda **R$ 238,58** e os asteriscos apareciam). Escapa antes, então é seguro.
export const textoDaMsg = t => esc(t || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*\*/g, '');

// Teclado do iPhone (14/11, JF: "as barras descem junto com a tela"): quando o teclado fecha, o iPhone às vezes deixa
// as barras de baixo no meio da tela. O app percebe o teclado, esconde a barra de abas enquanto ele está aberto e,
// quando fecha, dá um "empurrãozinho" na rolagem pra ele recalcular o lugar das barras.
export function ligarTeclado() {
  const vv = window.visualViewport;
  if (!vv) return;
  let aberto = false;
  const conferir = () => {
    const agora = innerHeight - vv.height > 140;
    if (agora === aberto) return;
    aberto = agora;
    document.body.classList.toggle('teclado', aberto);
    if (!aberto) requestAnimationFrame(() => { window.scrollTo(window.scrollX, window.scrollY + 1); window.scrollTo(window.scrollX, window.scrollY - 1); });
  };
  vv.addEventListener('resize', conferir);
  document.addEventListener('focusout', () => setTimeout(() => {
    conferir();
    if (!document.activeElement?.matches?.('input, textarea, select')) window.scrollTo(window.scrollX, window.scrollY);
  }, 60));
}

export function tirarAnexo() {
  state.fotoPendente = null;
  $('#chat-anexo').hidden = true;
  const img = $('#chat-anexo-img');
  if (img.src) { URL.revokeObjectURL(img.src); img.removeAttribute('src'); }
  $('#chat-input').placeholder = 'Pergunte ao C.A.O.S.…';
}

export async function fotoNoChat(arquivo, legenda = '') {
  try {
    const img = await imagens.guardar(arquivo, 'chat');
    addMsg({ de: 'eu', texto: legenda, url: URL.createObjectURL(img.blob), imagemId: img.id });
    // a legenda também diz o que fazer (14/11): "explica esse print", "qual oferta é melhor?"
    const pedeExplicar = /\b(explica|explique|o que (e|é|significa)|nao entendi|não entendi|que cobranca|que cobrança)\b/i.test(legenda);
    const pedeOferta = /\b(oferta|ofertas|compar|qual (e |é )?(melhor|mais barat)|vale a pena)\b/i.test(legenda);
    const explicar = pedeExplicar ? { duvida: legenda } : state.modoFoto?.tipo === 'explicar' && state.modoFoto.ate > Date.now() ? state.modoFoto : null;
    // print de oferta (13/11): quando o C.A.O.S. pediu o print ou tem uma comparação aberta
    const ofertas = pedeOferta || (state.modoFoto?.tipo === 'ofertas' && state.modoFoto.ate > Date.now()) || state.caosMemory?.aguardando?.tipo === 'ofertas';
    state.modoFoto = null;
    if (explicar) return explicarPrint(img, explicar.duvida);
    if (ofertas) return lerPrintDeOferta(img);
    if (!(state.settings.aiOn && state.settings.aiUrl)) {
      addMsg({ de: 'caos', texto: 'Guardei a foto. Pra eu ler o valor sozinho, ative a IA online em Ajustes. Ou me diz: "gastei 30 no mercado".' });
      return;
    }
    addMsg({ de: 'caos', texto: 'Lendo a foto com a IA…', temp: true });
    const r = await ia.lerImagem(state.settings.aiUrl, { base64: await imagens.paraBase64(img.blob), categorias: state.categories, legenda });
    state.chat = state.chat.filter(m => !m.temp);
    const cat = catById(r.categoria) || catById('outros');
    // vários pagamentos no mesmo print (14/11, JF: "leu os 5 e só lançou 1"): um Confirmar lança todos
    const itens = Array.isArray(r.itens) ? r.itens.filter(x => x.valor_centavos > 0) : [];
    if (itens.length > 1) {
      const hoje = toISODate();
      const lista = itens.map(x => {
        const c = catById(x.categoria) || catById(sugerirCategoria(x.estabelecimento, state.expenses)?.categoryId) || catById('outros');
        return { amountCents: x.valor_centavos, categoryId: c.id, date: /^\d{4}-\d{2}-\d{2}$/.test(x.data || '') ? x.data : hoje, note: (x.estabelecimento || '').slice(0, 120) };
      });
      const total = lista.reduce((t, x) => t + x.amountCents, 0);
      const linhas = lista.map((x, i) => `${i + 1}. ${x.note || 'Sem nome'}: ${formatBRL(x.amountCents)} em ${catById(x.categoryId).name} (${x.date.slice(8)}/${x.date.slice(5, 7)})`).join('\n');
      addMsg({
        de: 'caos', ia: true,
        texto: `Achei ${lista.length} pagamentos, total ${formatBRL(total)}:\n${linhas}\nAnoto todos?${r.confianca === 'baixa' ? ' Li com pouca certeza, confere os valores.' : ''} Se algum sair errado, dá pra corrigir no lápis depois.`,
        acao: { tipo: 'registrar_varios', itens: lista, imageId: img.id },
      });
      return;
    }
    if (r.valor_centavos > 0) {
      const leitura = `${r.resumo || 'Li o comprovante.'} ${formatBRL(r.valor_centavos)} em ${cat.name}${r.estabelecimento ? ` (${r.estabelecimento})` : ''}.${r.confianca === 'baixa' ? ' Li com pouca certeza, confere o valor.' : ''}`;
      const base = { tipo: 'registrar_gasto', amountCents: r.valor_centavos, categoryId: cat.id, date: /^\d{4}-\d{2}-\d{2}$/.test(r.data || '') ? r.data : toISODate(), note: (r.estabelecimento || '').slice(0, 120), imageId: img.id };
      // revisão do Gemini (16/11): com conta cadastrada, a foto também pergunta "pagou como?" e de qual conta (a legenda
      // já pode dizer: "pix do inter"), senão o gasto entrava sem conta e não mexia no saldo nem na fatura
      const acao = { ...base, ...lerPagamento(legenda || '', state.accounts) };
      const segue = state.accounts.length ? seguirPagamento(acao, dados()) : { acao: base };
      if (segue.aguardar) {
        guardarMemoria({ ...state.caosMemory, aguardando: { ...segue.aguardar, em: Date.now() } });
        addMsg({ de: 'caos', ia: true, texto: `${leitura} ${segue.fato}`, sugestoes: segue.sugestoes });
      } else {
        addMsg({ de: 'caos', ia: true, texto: `${leitura} Anoto?`, acao: segue.acao });
      }
    } else {
      addMsg({ de: 'caos', ia: true, texto: r.resumo || 'Não achei um valor nessa imagem.' });
    }
  } catch (e) {
    state.chat = state.chat.filter(m => !m.temp);
    addMsg({ de: 'caos', texto: e.message || 'Não consegui ler a foto.' });
  }
}

export async function lerPrintDeOferta(img) {
  if (!(state.settings.aiOn && state.settings.aiUrl)) {
    addMsg({ de: 'caos', texto: 'Pra eu ler o print sozinho, preciso da IA online (Ajustes → IA online). Enquanto isso, me escreve: "geladeira 3500 no mercado livre e 3400 na amazon".' });
    return;
  }
  addMsg({ de: 'caos', texto: 'Lendo a oferta do print…', temp: true, rosto: rostoAvulso('pensando', { mood: state.settings.mood, memory: state.caosMemory }) });
  try {
    const lido = await ia.lerOfertas(state.settings.aiUrl, { base64: await imagens.paraBase64(img.blob) });
    state.chat = state.chat.filter(m => !m.temp);
    const frase = fraseDoPrint(lido);
    if (!frase) return addMsg({ de: 'caos', ia: true, texto: 'Não achei preço de loja nesse print. Manda um print que mostre o preço e o nome da loja, ou me escreve os valores.' });
    addMsg({ de: 'caos', ia: true, texto: resumoDoPrint(lido) });
    await enviarPergunta(frase, { doPrint: true });
  } catch (e) {
    state.chat = state.chat.filter(m => !m.temp);
    addMsg({ de: 'caos', texto: e.message || 'Não consegui ler o print.' });
  }
}
