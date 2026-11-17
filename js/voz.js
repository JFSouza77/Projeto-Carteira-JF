// Voz do C.A.O.S. (speechSynthesis), portada do Perfil JF: escolhe a melhor voz pt-BR do aparelho,
// de preferência masculina, e limpa o texto pra voz não tropeçar (emoji, "R$", siglas).

// Vozes masculinas conhecidas (iPhone: Felipe, Eddy, Reed, Rocko; Windows: Daniel, Antonio…)
const MASC = /felipe|ant[oô]nio|daniel|ricardo|jorge|cristiano|donato|humberto|j[uú]lio|val[eé]rio|luciano|rodrigo|f[aá]bio|eddy|\breed\b|rocko|grandpa|masculin|\bmale\b/i;
// Vozes femininas conhecidas: perdem pontos na escolha automática
const FEM = /luciana|joana|catarina|francisca|thalita|maria|vit[oó]ria|let[ií]cia|raquel|\bflo\b|grandma|sandy|shelley|google portugu|female|feminin/i;

export const vozDisponivel = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function nota(v) {
  let s = 0;
  if (/^pt[-_]BR/i.test(v.lang)) s += 10;
  if (v.localService) s += 5;
  if (/natural|neural|premium|enhanced|aprimorad|google|online/i.test(v.name || '')) s += 4;
  if (MASC.test(v.name || '')) s += 6;
  else if (FEM.test(v.name || '')) s -= 8;
  return s;
}

function melhorVoz() {
  try {
    return speechSynthesis.getVoices().filter(v => /^pt/i.test(v.lang)).sort((a, b) => nota(b) - nota(a))[0] || null;
  } catch {
    return null;
  }
}

// Tom e velocidade por emoção (o Perfil faz igual com o humor da matriz)
const JEITO = {
  alegria: [1.08, 1.1], radiante: [1.1, 1.12], orgulho: [1.02, 1.05], preocupacao: [0.95, 0.97],
  protetor: [0.96, 0.97], tenso: [1.04, 0.95], irritacao: [1.05, 0.9], tedio: [0.88, 0.85],
  curiosidade: [1.02, 1.08], carinho: [0.95, 1.02], calmo: [1, 1],
  // emoções novas do núcleo (13/11, achado do Gemini): assustado fala um pouco mais rápido e agudo; enjoado e sem graça, mais baixo
  medo: [1.06, 1.08], nojo: [0.92, 0.9], vergonha: [0.94, 0.96],
};

export function textoParaVoz(t) {
  return String(t || '')
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    // 2.1.3.1 (GPT, 16/11): o negrito (**) e o {nome} que sobrar não podem ser lidos em voz alta
    .replace(/\*\*/g, '').replace(/\{nome\},?\s*/g, '')
    .replace(/C\.A\.O\.S\./g, 'Caos')
    .replace(/R\$\s?(\d[\d.]*)(?:,(\d{2}))?/g, (m, r, c) => `${r.replace(/\./g, '')} reais${c && c !== '00' ? ` e ${Number(c)} centavos` : ''}`)
    .replace(/(\d+)%/g, '$1 por cento')
    .replace(/\s*(?:\.{2,}|…)\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Velocidade escolhida em Ajustes → Acessibilidade (multiplica o jeito de cada emoção)
let VELOCIDADE = 1;
export function setVelocidade(v) {
  const n = Number(v);
  VELOCIDADE = Number.isFinite(n) ? Math.min(1.6, Math.max(0.6, n)) : 1;
}

// 2.1.5 (JF, 16/11: "ele não espera acabar a primeira fala antes de falar a segunda; tem que dar esse respiro"):
// falar() devolve uma promessa que termina quando a fala acaba (ou num tempo máximo, se o aparelho não avisar).
// O 2º balão espera ela. Com { emenda: true }, a fala entra na fila em vez de cortar a anterior.
//
// 2.1.7 (JF, 17/11: "vamos ligar a voz dele na Azure igual fiz no Perfil" + "seria muito legal se a boca dele
// mexesse quando a voz estivesse ligada"): primeiro tenta a voz natural do servidor (Microsoft Azure, igual ao Perfil);
// se o servidor não tiver voz, se não tiver internet, se demorar mais de 4 s ou falhar, fala com a voz do aparelho,
// sem a pessoa perceber. E avisa quem estiver ouvindo (o avatar): começou, o volume de cada instante (pra boca abrir
// na medida da fala) e acabou. Vai pro servidor só o texto da fala (o mesmo que aparece no balão).
let falaAtual = Promise.resolve();
export const falaTerminou = () => falaAtual;

let servidorDaVoz = () => null; // o app diz qual é o servidor (com a IA online ligada)
export function definirServidorDaVoz(fn) { servidorDaVoz = typeof fn === 'function' ? fn : () => null; }
let ouvinte = {}; // { inicio(modo), nivel(0..1), palavra(), fim() }
export function definirOuvinteDaFala(o) { ouvinte = o || {}; }
const avisar = (nome, ...a) => { try { ouvinte[nome]?.(...a); } catch { /* o avatar nunca derruba a voz */ } };

// emoção da Carteira → emoção da voz do servidor (tabela do Code, 05_Voz.md: nunca raiva nem fúria, firme e não bravo)
export const EMOCAO_DA_VOZ = Object.freeze({
  alegria: 'orgulho', radiante: 'festa', orgulho: 'orgulho', preocupacao: 'preocupado', protetor: 'carinho', tenso: 'preocupado',
  irritacao: 'desafio', tedio: 'tedio', curiosidade: 'pensando', carinho: 'carinho', calmo: 'calmo', medo: 'medo', nojo: 'nojo',
  vergonha: 'vergonha',
});

// AbortSignal.timeout não existe em iPhone mais antigo (iOS 15): sem ele, a voz natural desistia na hora (17/11)
function tempoLimite(ms) {
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms);
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

let corte = 0; // cada calar() muda o número: fala de antes não toca mais
let fonte = null; // o áudio da nuvem tocando agora

// estado da voz do servidor: "ligada" vale 10 min; "não deu" é conferido de novo em 1 min (como no Perfil)
let nuvem = { base: null, ok: null, em: 0 };
async function nuvemLigada(base) {
  const agora = Date.now();
  if (nuvem.base === base && nuvem.ok !== null && agora - nuvem.em < (nuvem.ok ? 600_000 : 60_000)) return nuvem.ok;
  let ok = false;
  try {
    const r = await fetch(`${base}/voz/estado`, { signal: tempoLimite(4000) });
    ok = r.ok && !!(await r.json()).ligada;
  } catch { ok = false; }
  nuvem = { base, ok, em: agora };
  return ok;
}

// as falas se repetem muito: guarda as últimas 50 no aparelho (não pede de novo)
const guardadas = new Map();
let ultimaVoz = '';
async function pedirAudio(base, t, emocao, vel, tom, limite = 5000) {
  const chave = `${emocao}|${vel}|${tom}|${t}`;
  if (guardadas.has(chave)) return guardadas.get(chave).slice(0);
  const r = await fetch(`${base}/voz`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: tempoLimite(limite),
    body: JSON.stringify({ t, r: vel, p: tom, e: EMOCAO_DA_VOZ[emocao] || 'calmo' }),
  });
  if (!r.ok || !/audio/.test(r.headers.get('content-type') || '')) {
    const j = await r.json().catch(() => ({}));
    throw Object.assign(new Error(`voz ${r.status}`), { status: r.status, detalhe: j });
  }
  ultimaVoz = r.headers.get('x-voz') || '';
  const buf = await r.arrayBuffer();
  guardadas.set(chave, buf.slice(0));
  if (guardadas.size > 50) guardadas.delete(guardadas.keys().next().value);
  return buf;
}

let ctx = null;
function audioCtx() {
  if (ctx) return ctx;
  const C = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!C) return null;
  try { ctx = new C(); } catch { ctx = null; }
  return ctx;
}
/** iPhone: o som só sai depois de um toque. O app chama isto no primeiro toque na tela. */
// 2.1.7.3: o app chama em TODO toque (o iPhone pede o destrave quando o dedo sai da tela, e trava de novo quando o app
// vai pro fundo); com o som já rodando, não faz nada
export function destravarAudio() {
  const c = audioCtx();
  if (!c || c.state === 'running') return;
  try {
    c.resume();
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b; s.connect(c.destination); s.start(0);
  } catch { /* sem som destravado, a voz do aparelho segura */ }
}

// toca o MP3 e mede o volume enquanto toca (é isso que mexe a boca do avatar no ritmo da fala)
async function tocar(buf, minha) {
  const c = audioCtx();
  if (!c) throw new Error('sem áudio');
  // iPhone: depois de ir pro fundo, o áudio fica "interrupted" (não só "suspended"); tenta voltar antes de tocar
  if (c.state !== 'running') { await c.resume().catch(() => {}); if (c.state !== 'running') throw new Error('áudio travado'); }
  const dados = await c.decodeAudioData(buf);
  if (minha !== corte) return;
  const s = c.createBufferSource();
  s.buffer = dados;
  const an = c.createAnalyser();
  an.fftSize = 512;
  s.connect(an); an.connect(c.destination);
  fonte = s;
  const amostra = new Uint8Array(an.fftSize);
  let raf = 0;
  const medir = () => {
    an.getByteTimeDomainData(amostra);
    let soma = 0;
    for (const v of amostra) { const x = (v - 128) / 128; soma += x * x; }
    avisar('nivel', Math.min(1, Math.sqrt(soma / amostra.length) * 4));
    raf = requestAnimationFrame(medir);
  };
  await new Promise(fim => {
    s.onended = () => { cancelAnimationFrame(raf); if (fonte === s) fonte = null; fim(); };
    avisar('inicio', 'nuvem');
    s.start(0);
    raf = requestAnimationFrame(medir);
  });
}

function falarNoAparelho(t, emocao, minha) {
  if (!vozDisponivel() || minha !== corte) return Promise.resolve();
  return new Promise(fim => {
    try {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = 'pt-BR';
      const v = melhorVoz();
      if (v) u.voice = v;
      const [vel, tom] = JEITO[emocao] || JEITO.calmo;
      // sem voz masculina no aparelho, ele fala um pouco mais grave (como no Perfil)
      u.pitch = Math.max(0.4, Math.min(2, (v && !MASC.test(v.name || '') ? 0.8 : 1) * tom));
      u.rate = Math.min(2, Math.max(0.5, vel * VELOCIDADE));
      const acabou = () => { clearTimeout(tempo); fim(); };
      const tempo = setTimeout(acabou, Math.min(30_000, 1500 + t.length * 90 / u.rate));
      u.onboundary = () => avisar('palavra'); // cada palavra: a boca dá uma abridinha
      u.onend = u.onerror = acabou;
      speechSynthesis.speak(u);
      // 17/11 (JF: "os avatares não estão mexendo a boca"): no app instalado no iPhone o aviso de "começou" (onstart)
      // nem sempre chega; a boca começa junto com o pedido de fala, sem depender dele
      avisar('inicio', 'aparelho');
    } catch { fim(); }
  });
}

async function falarAgora(t, emocao, minha) {
  const base = servidorDaVoz();
  const [vel, tom] = JEITO[emocao] || JEITO.calmo;
  try {
    if (base && (typeof navigator === 'undefined' || navigator.onLine !== false) && await nuvemLigada(base)) {
      try {
        const buf = await pedirAudio(base, t, emocao, Math.round(vel * VELOCIDADE * 20) / 20, Math.round(tom * 20) / 20);
        if (minha !== corte) return;
        await tocar(buf, minha);
        return;
      } catch { /* demorou, falhou ou o som está travado: a voz do aparelho fala */ }
    }
    if (minha === corte) await falarNoAparelho(t, emocao, minha);
  } finally {
    if (minha === corte) avisar('fim');
  }
}

export function falar(texto, emocao = 'calmo', { emenda = false } = {}) {
  const t = textoParaVoz(texto);
  if (!t || (!vozDisponivel() && !servidorDaVoz())) return Promise.resolve();
  if (!emenda) calar();
  const minha = corte;
  const antes = emenda ? falaAtual : Promise.resolve();
  falaAtual = antes.then(() => (minha === corte ? falarAgora(t, emocao, minha) : null)).catch(() => {});
  return falaAtual;
}

// "Testar a voz" (Ajustes, 17/11): fala uma frase pela voz natural e diz em português o que aconteceu
const NOME_VOZ = { mai: 'a voz MAI (a mais natural)', padrao: 'a voz grátis da Microsoft' };
export async function testarVoz() {
  destravarAudio();
  const base = servidorDaVoz();
  if (!base) return { ok: false, msg: 'A voz natural precisa da IA online ligada (aqui embaixo, em IA online e servidor).' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, msg: 'Sem internet agora: ele fala com a voz do celular.' };
  nuvem = { base: null, ok: null, em: 0 }; // confere de novo, sem lembrar do resultado de antes
  let estado;
  try {
    const r = await fetch(`${base}/voz/estado`, { signal: tempoLimite(6000) });
    estado = await r.json();
    if (!r.ok) return { ok: false, msg: `O servidor respondeu ${r.status}: ${estado.erro || 'sem detalhe'}.` };
  } catch (e) { return { ok: false, msg: `Não consegui falar com o servidor (${e.name === 'AbortError' || e.name === 'TimeoutError' ? 'demorou demais' : e.message}).` }; }
  if (!estado.ligada) return { ok: false, msg: 'O servidor ainda não tem a voz: faltam as chaves da Azure (ou o deploy depois de colocar as chaves).' };
  try {
    calar();
    const buf = await pedirAudio(base, 'Oi! Essa é a minha voz natural. Gostou?', 'alegria', 1, 1, 15000);
    const quem = ultimaVoz.replace(/^(nova|guardada):?/, '') || '';
    await tocar(buf, corte);
    avisar('fim');
    return { ok: true, msg: `Funcionando: ${NOME_VOZ[quem] || 'voz natural'}${/guardada/.test(ultimaVoz) ? ' (fala guardada)' : ''}. Vozes no servidor: ${(estado.vozes || []).map(v => NOME_VOZ[v] || v).join(' e ')}.` };
  } catch (e) {
    avisar('fim');
    const d = e.detalhe || {};
    if (e.status === 502) return { ok: false, msg: `A Microsoft recusou (erro ${d.status || '?'}). ${d.status === 401 || d.status === 403 ? 'Chave ou região errada nos segredos.' : 'Confira as chaves e a região.'}` };
    if (e.status === 429) return { ok: false, msg: d.erro === 'teto' ? 'Chegou no teto de letras do mês: até virar o mês, ele fala com a voz do celular.' : 'Muitas falas seguidas: espera um pouquinho.' };
    if (e.status) return { ok: false, msg: `O servidor respondeu ${e.status}: ${d.erro || 'sem detalhe'}.` };
    if (/travado/.test(e.message)) return { ok: false, msg: 'O som do celular está travado: toque na tela e tente de novo (e confira se o iPhone não está no silencioso).' };
    return { ok: false, msg: `Não deu: ${e.name === 'AbortError' || e.name === 'TimeoutError' ? 'a voz demorou demais' : e.message}.` };
  }
}

export function calar() {
  corte++;
  try { if (vozDisponivel()) speechSynthesis.cancel(); } catch {}
  try { fonte?.stop(); } catch {}
  fonte = null;
  avisar('fim');
}

/** Ditado (falar com o C.A.O.S.): usa o reconhecimento de voz do navegador, quando existe. */
export function ditadoDisponivel() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Bug do JF (13/11): o microfone "não fazia nada". No app instalado no iPhone o reconhecimento às vezes termina sem
// resultado e sem erro, e a promessa ficava parada pra sempre. Agora toda saída vira resposta: o texto, ou um erro com
// motivo claro (e o app oferece o plano B: o microfone do próprio teclado).
const MOTIVO = {
  'not-allowed': 'O microfone está bloqueado pra este app. Libera em Ajustes do celular → Safari (ou o navegador) → Microfone.',
  'service-not-allowed': 'O ditado está desligado no celular. No iPhone: Ajustes → Geral → Teclado → Ativar Ditado.',
  'audio-capture': 'Não achei microfone funcionando no aparelho.',
  'network': 'O ditado do navegador precisa de internet e ela falhou.',
  'no-speech': 'Não ouvi nada. Fala logo depois de tocar no microfone.',
  'aborted': 'Parei de ouvir.',
};
let atual = null;

/** Para de ouvir (segundo toque no microfone). */
export function pararDeOuvir() {
  try { atual?.stop(); } catch {}
}

export function ouvir({ limiteMs = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return reject(new Error('Ditado não disponível neste navegador.'));
    let r, acabou = false, texto = '';
    const fim = (erro) => {
      if (acabou) return;
      acabou = true;
      clearTimeout(relogio);
      atual = null;
      if (texto) resolve(texto);
      else reject(Object.assign(new Error(erro || 'Não consegui ouvir.'), { semResultado: true }));
    };
    try {
      r = new R();
      r.lang = 'pt-BR';
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.continuous = false;
      r.onresult = e => { texto = (e.results?.[0]?.[0]?.transcript || '').trim(); if (texto) fim(); };
      r.onerror = e => fim(MOTIVO[e.error] || `Não consegui ouvir (${e.error || 'erro desconhecido'}).`);
      r.onnomatch = () => fim('Não entendi o áudio. Tenta de novo, mais devagar.');
      r.onend = () => fim(texto ? null : 'O navegador parou de ouvir sem me passar o que você disse.');
      atual = r;
      r.start();
    } catch (e) {
      return fim(`Não consegui ligar o microfone (${e.message || e}).`);
    }
    const relogio = setTimeout(() => { try { r.stop(); } catch {} fim('Demorou demais e eu parei de ouvir.'); }, limiteMs);
  });
}
