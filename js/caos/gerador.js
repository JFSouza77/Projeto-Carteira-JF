// Gerador de falas por gatilho (portado do Perfil JF, C.A.O.S. 1.7.5.1 e 4.4).
// Cada gatilho tem MOLDES ("{abre} {fato} {fecho}") e, para cada pedaço, BALDES: "geral" (serve sempre)
// e baldes de contexto (humor_acido, emo_preocupacao, periodo_noite, fimDoMes…). Cada pedaço é uma frase
// completa, então qualquer combinação fica certa.
//
// Como evita repetir (igual ao Perfil):
//  · guarda os pedaços usados por último em cada gatilho (memória do narrador, salva pelo app);
//  · não usa o mesmo balde de contexto duas vezes na mesma fala;
//  · não repete palavra forte (6+ letras) entre os pedaços;
//  · não repete nenhuma das últimas 12 falas inteiras do gatilho.
// Tato: fala acima do limite de letras é remontada (tenta até 10 vezes e fica com a melhor).
//
// Função pura: recebe a memória e devolve uma memória NOVA. Não toca em nada fora dela.

export const P_CONTEXTO = 0.7; // chance de escolher um pedaço do contexto em vez de um geral
export const ULTIMAS = 12;
export const MAX_LETRAS = 170;
const TENTATIVAS = 10;

const semAcento = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function placeholders(t) {
  return (String(t).match(/\{(\w+)\}/g) || []).map(x => x.slice(1, -1));
}

function palavrasFortes(t) {
  return new Set(semAcento(String(t).replace(/\{\w+\}/g, ' ')).split(/[^a-z]+/).filter(w => w.length >= 6));
}

export function preencher(t, vars) {
  return String(t).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)).replace(/\s+/g, ' ').trim();
}

function clonarMem(m) {
  return JSON.parse(JSON.stringify(m || {}));
}

function escolherSlot(g, slot, def, ctx, usados, ja, memG, rng) {
  const ms = memG[slot] || (memG[slot] = []);
  const ok = t => placeholders(t).every(k => ctx.vars[k] != null);
  const baldes = Object.keys(def).filter(k => k !== 'geral' && ctx.tags.has(k) && !usados.has(k));
  const ordem = [];
  if (baldes.length && rng() < P_CONTEXTO) {
    for (let i = baldes.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [baldes[i], baldes[j]] = [baldes[j], baldes[i]];
    }
    ordem.push(...baldes);
  }
  if (def.geral) ordem.push('geral');
  for (const repetir of [false, true]) {
    for (const b of ordem) {
      let lista = (def[b] || []).map((t, i) => ({ t, id: `${b}:${i}` })).filter(x => ok(x.t));
      if (!lista.length) continue;
      if (ja.size) {
        const sem = lista.filter(x => ![...palavrasFortes(x.t)].some(w => ja.has(w)));
        if (sem.length) lista = sem;
        else if (b !== 'geral' && !repetir) continue;
      }
      const livres = lista.filter(x => !ms.includes(x.id));
      if (!livres.length && b !== 'geral' && !repetir) continue;
      const pool = livres.length ? livres : lista;
      const x = pool[Math.floor(rng() * pool.length)];
      ms.push(x.id);
      const total = Object.values(def).reduce((s, l) => s + l.length, 0);
      const janela = Math.max(1, Math.min(40, Math.floor(total * 0.7)));
      while (ms.length > janela) ms.shift();
      if (b !== 'geral') usados.add(b);
      return x.t;
    }
  }
  return null;
}

/**
 * Monta uma fala.
 * @param {object} geradores  banco de geradores (dados)
 * @param {string} g          nome do gatilho
 * @param {{tags:Set<string>, vars:object}} ctx
 * @param {object} memoria    memória do gerador ({ [gatilho]: { [slot]: [ids], _ultimas: [...] } })
 * @returns {{ texto: string, memoria: object }}  texto "" quando não deu para montar
 */
export function gerarFala(geradores, g, ctx, memoria, { rng = Math.random, maxLetras = MAX_LETRAS } = {}) {
  const def = geradores[g];
  if (!def) return { texto: '', memoria };
  let melhor = null;
  let memFinal = memoria;
  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const mem = clonarMem(memoria);
    const memG = mem[g] || (mem[g] = {});
    const ultimas = memG._ultimas || (memG._ultimas = []);
    const moldes = def.moldes.filter(m => placeholders(m).every(s => def[s] || ctx.vars[s] != null));
    const molde = moldes[Math.floor(rng() * moldes.length)];
    const usados = new Set();
    const ja = new Set();
    const pedacos = {};
    let falhou = false;
    for (const slot of placeholders(molde)) {
      if (!def[slot]) continue; // é variável, não slot
      const t = escolherSlot(g, slot, def[slot], ctx, usados, ja, memG, rng);
      if (t == null) { falhou = true; break; }
      pedacos[slot] = preencher(t, ctx.vars);
      for (const w of palavrasFortes(t)) ja.add(w);
    }
    if (falhou) continue;
    const texto = preencher(preencher(molde, pedacos), ctx.vars);
    const repetida = ultimas.includes(texto);
    const nota = (texto.length > maxLetras ? 2 : 0) + (repetida ? 3 : 0);
    if (!melhor || nota < melhor.nota) {
      melhor = { texto, nota };
      ultimas.push(texto);
      while (ultimas.length > ULTIMAS) ultimas.shift();
      memFinal = mem;
    }
    if (nota === 0) break;
  }
  return { texto: melhor ? melhor.texto : '', memoria: memFinal };
}

/** Lista todos os pedaços de um banco (para os testes de contagem e de conteúdo). */
export function todosOsPedacos(geradores) {
  const out = [];
  for (const [g, def] of Object.entries(geradores)) {
    for (const [slot, baldes] of Object.entries(def)) {
      if (slot === 'moldes') continue;
      for (const [balde, lista] of Object.entries(baldes)) out.push({ g, slot, balde, lista });
    }
  }
  return out;
}
