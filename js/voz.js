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
};

export function textoParaVoz(t) {
  return String(t || '')
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .replace(/C\.A\.O\.S\./g, 'Caos')
    .replace(/R\$\s?([\d.]+),(\d{2})/g, (m, r, c) => `${r.replace(/\./g, '')} reais${c !== '00' ? ` e ${Number(c)} centavos` : ''}`)
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

export function falar(texto, emocao = 'calmo') {
  if (!vozDisponivel()) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(textoParaVoz(texto));
    u.lang = 'pt-BR';
    const v = melhorVoz();
    if (v) u.voice = v;
    const [vel, tom] = JEITO[emocao] || JEITO.calmo;
    // sem voz masculina no aparelho, ele fala um pouco mais grave (como no Perfil)
    u.pitch = Math.max(0.4, Math.min(2, (v && !MASC.test(v.name || '') ? 0.8 : 1) * tom));
    u.rate = Math.min(2, Math.max(0.5, vel * VELOCIDADE));
    speechSynthesis.speak(u);
  } catch {}
}

export function calar() {
  try { if (vozDisponivel()) speechSynthesis.cancel(); } catch {}
}

/** Ditado (falar com o C.A.O.S.): usa o reconhecimento de voz do navegador, quando existe. */
export function ditadoDisponivel() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function ouvir() {
  return new Promise((resolve, reject) => {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return reject(new Error('Ditado não disponível neste navegador.'));
    const r = new R();
    r.lang = 'pt-BR';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = e => resolve(e.results[0][0].transcript);
    r.onerror = e => reject(new Error(e.error === 'not-allowed' ? 'Permissão do microfone negada.' : 'Não consegui ouvir.'));
    r.onnomatch = () => reject(new Error('Não entendi o áudio.'));
    r.start();
  });
}
