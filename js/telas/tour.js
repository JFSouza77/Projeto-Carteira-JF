// Tutorial guiado, estilo jogo (JF, 17/11): "a tela escurece, acende só o que você precisa ver, e o C.A.O.S. vira
// guia turístico". Primeiro uma tela de boas-vindas ("Você é novo por aqui?") com 4 caminhos: tudo, só o básico, uma
// coisa só, ou pular. Depois, passo a passo: escurece tudo, acende o pedaço da vez com um anel piscando e o C.A.O.S.
// explica num balão grande, com Voltar, Próximo e Sair. Pensado pra quem é muito novo ou mais velho: letra grande,
// botões grandes, sem pressa (nada anda sozinho). "Menos movimento" tira as animações.
// Camada de UI: não grava dado nenhum da pessoa, só o "já viu o tutorial" nos ajustes.

import { $, esc, state } from '../estado.js';
import * as db from '../db.js';
import { criarAvatar } from '../avatar.js';
import { MENOS_MOVIMENTO } from '../app.js';
import { TEMAS_TOUR, montarRoteiro } from '../tour_passos.js';

let atual = null; // { passos, i, fim }
let avatarTour = null;
let avatarBoas = null;

const espera = ms => new Promise(r => setTimeout(r, ms));

async function marcarVisto() {
  state.settings.tourVisto = true;
  await db.setMeta('settings', state.settings).catch(() => {});
}

// ---------- Boas-vindas ----------

/**
 * Tela "Você é novo por aqui?". `depois` roda quando a pessoa termina ou pula (no 1º acesso, a conversa de
 * apresentação do C.A.O.S. começa depois do tutorial).
 */
export async function abrirBoasVindas({ depois = null, primeiraVez = false, desistirSe = null } = {}) {
  // espera a abertura (o C.A.O.S. com o slogan) sair da tela
  // (sem limite: na 1ª vez com o servidor, a abertura espera a pessoa escolher entrar, criar ou continuar sem conta)
  while (document.getElementById('abertura')) await espera(300);
  // quem entrou na conta num celular novo traz o perfil da nuvem: não é novo por aqui (17/11, revisão da madrugada)
  if (desistirSe?.()) return;
  fecharBoasVindas();
  const el = document.createElement('div');
  el.className = 'tour-boas';
  el.id = 'tour-boas';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'tour-boas-tit');
  el.innerHTML = `
    <div class="tour-boas-caixa">
      <span class="tour-boas-avatar" id="tour-boas-avatar" aria-hidden="true"></span>
      <h2 id="tour-boas-tit">${primeiraVez ? 'Olá! Você é novo por aqui?' : 'Quer que eu te mostre o app?'}</h2>
      <p>Eu sou o C.A.O.S., seu parceiro pras finanças. Posso te mostrar o app parte por parte, com calma. Como você prefere?</p>
      <div class="tour-boas-opcoes" id="tour-opcoes">
        <button type="button" class="primary" data-tour="completo">🧭 Me mostra tudo <small>10 passos, uns 2 minutos</small></button>
        <button type="button" class="ghost" data-tour="basico">⚡ Só o básico <small>5 passos rapidinhos</small></button>
        <button type="button" class="ghost" data-tour="temas">❓ Quero saber uma coisa só</button>
        <button type="button" class="link-btn" data-tour="pular">Pular, já sei mexer</button>
      </div>
      <div class="tour-boas-opcoes" id="tour-temas" hidden>
        ${TEMAS_TOUR.map(t => `<button type="button" class="ghost" data-tour="${esc(t.id)}">${esc(t.t)}</button>`).join('')}
        <button type="button" class="link-btn" data-tour="voltar">‹ Voltar</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  try { avatarBoas = criarAvatar($('#tour-boas-avatar'), { tamanho: 'grande', forma: 'guia' }); } catch { avatarBoas = null; }
  el.querySelector('[data-tour]')?.focus();
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-tour]');
    if (!b) return;
    const q = b.dataset.tour;
    if (q === 'temas' || q === 'voltar') {
      $('#tour-opcoes').hidden = q === 'temas';
      $('#tour-temas').hidden = q !== 'temas';
      el.querySelector(`#${q === 'temas' ? 'tour-temas' : 'tour-opcoes'} [data-tour]`)?.focus();
      avatarBoas?.mostrar(q === 'temas' ? 'curioso' : 'guia');
      return;
    }
    fecharBoasVindas();
    await marcarVisto();
    if (q === 'pular') { depois?.(); return; }
    comecarTour(q, { depois });
  });
}

function fecharBoasVindas() {
  avatarBoas?.destruir?.();
  avatarBoas = null;
  document.getElementById('tour-boas')?.remove();
}

// ---------- O passeio ----------

export function comecarTour(qual, { depois = null } = {}) {
  const passos = montarRoteiro(qual);
  if (!passos.length) return depois?.();
  fecharTour();
  const el = document.createElement('div');
  el.className = 'tour';
  el.id = 'tour';
  el.innerHTML = `
    <div class="tour-luz" id="tour-luz" aria-hidden="true"></div>
    <div class="tour-cartao" id="tour-cartao" role="dialog" aria-modal="true" aria-labelledby="tour-tit" aria-describedby="tour-txt">
      <div class="tour-topo"><span class="tour-avatar" id="tour-avatar" aria-hidden="true"></span>
        <div><p class="tour-passo" id="tour-passo"></p><h2 id="tour-tit"></h2></div></div>
      <p class="tour-txt" id="tour-txt" aria-live="polite"></p>
      <div class="tour-pontos" id="tour-pontos" aria-hidden="true"></div>
      <div class="tour-botoes">
        <button type="button" class="ghost" id="tour-voltar">‹ Voltar</button>
        <button type="button" class="primary" id="tour-proximo">Próximo ›</button>
      </div>
      <button type="button" class="link-btn tour-sair" id="tour-sair">Sair do tutorial</button>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('em-tour');
  try { avatarTour = criarAvatar($('#tour-avatar'), { tamanho: 'pequeno', forma: passos[0].forma }); } catch { avatarTour = null; }
  atual = { passos, i: 0, depois };
  $('#tour-proximo').addEventListener('click', () => irPasso(atual.i + 1, 1));
  $('#tour-voltar').addEventListener('click', () => irPasso(atual.i - 1, -1));
  $('#tour-sair').addEventListener('click', () => terminar(false));
  // tocar no pedaço aceso também avança (como no tutorial de jogo)
  $('#tour-luz').addEventListener('click', () => irPasso(atual.i + 1, 1));
  addEventListener('keydown', teclas);
  addEventListener('resize', posicionar);
  addEventListener('scroll', posicionar, true);
  irPasso(0);
}

function teclas(e) {
  if (!atual) return;
  if (e.key === 'Escape') terminar(false);
  else if (e.key === 'ArrowRight') irPasso(atual.i + 1, 1);
  else if (e.key === 'ArrowLeft') irPasso(atual.i - 1, -1);
}

async function irPasso(i, dir = 1) {
  if (!atual) return;
  if (i >= atual.passos.length) return terminar(true);
  if (i < 0) return;
  atual.i = i;
  const p = atual.passos[i];
  const cartao = $('#tour-cartao');
  cartao.classList.add('trocando');
  if (location.hash.slice(1) !== p.tela) location.hash = p.tela;
  await espera(MENOS_MOVIMENTO.matches ? 120 : 380);
  if (!atual) return;
  const visivel = sel => { const x = sel && document.querySelector(sel); return x && x.getClientRects().length ? x : null; };
  const alvoAlt = !visivel(p.alvo) && visivel(p.alvoAlt);
  const alvo = visivel(p.alvo) || alvoAlt;
  // pedaço que não existe ou está escondido (ex.: tela grande sem a barra de baixo): pula sem travar
  if (!alvo || !alvo.getClientRects().length) {
    return dir < 0 && i > 0 ? irPasso(i - 1, -1) : irPasso(i + 1, 1);
  }
  if (alvo.tagName === 'DETAILS') alvo.open = false; // fechado fica menor e cabe na tela
  alvo.scrollIntoView({ block: 'center', behavior: MENOS_MOVIMENTO.matches ? 'auto' : 'smooth' });
  await espera(MENOS_MOVIMENTO.matches ? 60 : 320);
  if (!atual) return;
  atual.alvo = alvo;
  $('#tour-passo').textContent = `Passo ${p.n} de ${p.de}`;
  $('#tour-tit').textContent = p.titulo;
  $('#tour-txt').textContent = alvoAlt && p.textoAlt ? p.textoAlt : p.texto;
  $('#tour-pontos').innerHTML = atual.passos.map((_, k) => `<i class="${k === i ? 'atual' : k < i ? 'feito' : ''}"></i>`).join('');
  $('#tour-voltar').hidden = i === 0;
  $('#tour-proximo').textContent = i === atual.passos.length - 1 ? 'Terminar ✓' : 'Próximo ›';
  avatarTour?.mostrar(p.forma);
  posicionar();
  cartao.classList.remove('trocando');
  $('#tour-proximo').focus({ preventScroll: true });
}

// acende o pedaço da vez e põe o balão do lado que tiver espaço (em cima ou embaixo)
function posicionar() {
  if (!atual?.alvo) return;
  const r = atual.alvo.getBoundingClientRect();
  const folga = 8;
  const luz = $('#tour-luz');
  const alto = Math.min(r.height + folga * 2, innerHeight * 0.6);
  Object.assign(luz.style, {
    left: `${Math.max(4, r.left - folga)}px`, top: `${Math.max(4, r.top - folga)}px`,
    width: `${Math.min(innerWidth - 8, r.width + folga * 2)}px`, height: `${alto}px`,
  });
  const cartao = $('#tour-cartao');
  const meio = r.top + Math.min(r.height, alto) / 2;
  cartao.classList.toggle('em-cima', meio > innerHeight * 0.5);
}

async function terminar(completo) {
  const depois = atual?.depois;
  fecharTour();
  if (location.hash.slice(1) !== 'inicio' && !depois) location.hash = 'inicio';
  if (completo && !depois) {
    const { toast } = await import('../app.js');
    toast('Pronto! Quando quiser rever, o tutorial fica em Ajustes e no botão de ajuda.');
  }
  depois?.();
}

export function fecharTour() {
  removeEventListener('keydown', teclas);
  removeEventListener('resize', posicionar);
  removeEventListener('scroll', posicionar, true);
  avatarTour?.destruir?.();
  avatarTour = null;
  atual = null;
  document.getElementById('tour')?.remove();
  document.body.classList.remove('em-tour');
}

export const tourAberto = () => !!atual;
