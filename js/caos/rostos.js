// Rosto do C.A.O.S. (sistema do Perfil JF, C.A.O.S. 4.0, adaptado): rostos de texto animados, com
//  · nível pela intensidade da emoção (mais forte = rosto mais intenso);
//  · escada de rostos: do rosto atual ele só anda pra um vizinho, nunca pula de feliz pra bravo direto;
//  · anti-repetição: não repete o mesmo rosto em seguida (janela de 60% da lista, como no Perfil);
//  · mistura: duas emoções altas juntas às vezes mostram o rosto da mistura (nunca no Suave);
//  · humor Suave: sem raiva nem deboche, e tristeza/preocupação sempre no nível mais leve.
// Função pura: recebe e devolve a memória dos rostos.

import { EMOS, VIZINHOS, MISTURAS } from './rostos-dados.js';

// Emoção da Carteira → emoção de rosto do Perfil
const DA_EMOCAO = {
  calmo: 'calmo', alegria: 'festa', orgulho: 'orgulho', preocupacao: 'preocupado', irritacao: 'raiva',
  tedio: 'tedio', curiosidade: 'espiando', carinho: 'carinho', radiante: 'festa', protetor: 'carinho', tenso: 'raiva',
  // emoções novas do núcleo (13/11): sem rosto próprio ainda, usam o mais parecido do Perfil
  medo: 'preocupado', nojo: 'julgando', vergonha: 'recompondo',
};
// Mistura da Carteira → rosto de mistura do Perfil
const MISTURA_DA = { tenso: 'acuado' };

// Momentos com rosto próprio (o evento pede um rosto específico)
const DO_EVENTO = {
  pensando: 'pensando', piada: 'festa', entrada_cadastrada: 'alivio', mes_verde: 'orgulho', sem_registro: 'tedio',
  categoria_estourada: 'preocupado', conta_negativa: 'preocupado', mes_negativo: 'preocupado', nao_entendi: 'pensando',
  xingamento: 'julgando', elogio: 'carinho', identidade: 'orgulho', surpresa: 'surpresa',
};
// No Ácido, alguns momentos ganham rosto de zoeira
const DO_EVENTO_ACIDO = { categoria_estourada: 'deboche', delivery_repetido: 'julgando', xingamento: 'deboche', piada: 'deboche' };

const PROIBIDOS_SUAVE = new Set(['raiva', 'deboche', 'julgando']);

// Rosto combinando com a frase (06/11; no Perfil: caosEmocaoDoTexto, C.A.O.S. 4.4): a emoção sai do que ele
// está dizendo. A ordem importa: a primeira que bater manda. Sem nada marcante, fica com o evento/emoção.
const DO_TEXTO = [
  ['festa', /feliz anivers|parab[eé]ns|bateu a meta|conquist|comemor/i],
  ['preocupado', /estour|passou do limite|negativ|venceu|atrasad|apert|cuidado|aten[cç][aã]o|faltariam|n[aã]o cabe|acima do (limite|or[cç]amento)|ritmo (alto|forte)|no vermelho/i],
  ['deboche', /sobrancelha|fascinante|suspir|pode chorar|n[aã]o atire|escolha de vida/i],
  ['orgulho', /m[eê]s no verde|fechou no verde|no verde|bom controle|mandando bem|disciplina|economizou|organizad|cabe!|t[aá] indo bem|vit[oó]ria/i],
  ['carinho', /obrigad|valeu|prazer|que bom te|bem-vind|com carinho|t[oô] por aqui|tudo bem!|sem problema|tudo bem,|orgulho de voc/i],
  ['surpresa', /\buau\b|caramba|nossa!|de madrugada|a essa hora/i],
  ['pensando', /deixa eu (ver|pensar)|\bhmm\b|ainda n[aã]o sei|n[aã]o peguei|consultei|vou buscar|fiz as contas/i],
];

/** Emoção de rosto que a frase pede (ou null se a frase é neutra). */
export function emocaoDoTexto(texto) {
  const t = String(texto || '');
  for (const [e, re] of DO_TEXTO) if (re.test(t)) return e;
  return null;
}

const FAMILIA = {
  festa: 'bom', orgulho: 'bom', carinho: 'bom', alivio: 'bom',
  preocupado: 'ruim', triste: 'ruim', raiva: 'ruim', recompondo: 'ruim',
};

// Coerência: alerta nunca sai com cara de festa; piada nunca sai com cara de preocupação.
const NUNCA_NO_ALERTA = new Set(['festa', 'orgulho', 'carinho', 'alivio']);
const NUNCA_NA_PIADA = new Set(['preocupado', 'triste', 'raiva', 'recompondo', 'tedio']);
const LEVES_SUAVE = new Set(['triste', 'preocupado', 'recompondo']);

export function memoriaRostoInicial() {
  return { atual: 'calmo', ult: {} };
}

function vizinhos(e) {
  const a = new Set(VIZINHOS[e] || []);
  for (const [k, lista] of Object.entries(VIZINHOS)) if (lista.includes(e)) a.add(k);
  return a;
}

/** Escada: o próximo passo de `antes` em direção a `alvo` (busca em largura no mapa de vizinhos). */
export function escada(antes, alvo) {
  if (!antes || antes === alvo || !EMOS[antes] || vizinhos(antes).has(alvo)) return alvo;
  const veio = { [antes]: null };
  const fila = [antes];
  while (fila.length) {
    const x = fila.shift();
    if (x === alvo) break;
    for (const y of vizinhos(x)) if (!(y in veio)) { veio[y] = x; fila.push(y); }
  }
  if (!(alvo in veio)) return alvo;
  let passo = alvo;
  while (veio[passo] !== antes) passo = veio[passo];
  return passo;
}

/**
 * Escolhe o rosto.
 * @param {object} o  { emocao (da Carteira), evento?, humor, intensidade 0..1, memoria, rng, livre? }
 *   livre = pula a escada (momentos fortes, como no Perfil: mês verde, estouro)
 * @returns {{ rosto: {emo, nome, cor, bg, fr, per, amp, quadros, mistura}, memoria }}
 */
export function escolherRosto({ emocao = 'calmo', evento, humor = 'suave', intensidade = 0.3, memoria, rng = Math.random, livre = false, texto = null, alerta = false } = {}) {
  const mem = { atual: memoria?.atual || 'calmo', ult: { ...(memoria?.ult || {}) } };
  const doEvento = (humor === 'acido' && DO_EVENTO_ACIDO[evento]) || DO_EVENTO[evento] || null;
  let doTexto = emocaoDoTexto(texto);
  // o evento tem rosto próprio e a frase vai no mesmo sentido (ex.: mês verde + "parabéns"): fica o do evento
  if (doTexto && doEvento && FAMILIA[doTexto] && FAMILIA[doTexto] === FAMILIA[doEvento]) doTexto = null;
  let alvo = doTexto || doEvento || DA_EMOCAO[emocao] || 'calmo';
  if (alerta && NUNCA_NO_ALERTA.has(alvo)) alvo = 'preocupado';
  if (evento === 'piada' && NUNCA_NA_PIADA.has(alvo)) alvo = humor === 'acido' ? 'deboche' : 'festa';
  if (doTexto || alerta || evento === 'piada') livre = true; // a frase manda: o rosto vai direto
  if (humor === 'suave' && PROIBIDOS_SUAVE.has(alvo)) alvo = alvo === 'raiva' ? 'preocupado' : 'pensando';
  if (!EMOS[alvo]) alvo = 'calmo';

  // Mistura (como no Perfil: só fora do Suave, e só às vezes)
  const mist = MISTURA_DA[emocao];
  if (mist && humor !== 'suave' && MISTURAS[mist] && !evento && !doTexto && !alerta && rng() < 0.55) {
    const lista = MISTURAS[mist];
    const chave = `mist:${mist}`;
    const usados = mem.ult[chave] || [];
    const livres = lista.map((_, i) => i).filter(i => !usados.includes(i));
    const i = livres[Math.floor(rng() * livres.length)] ?? 0;
    mem.ult[chave] = [...usados, i].slice(-(lista.length - 1));
    const E = EMOS.raiva;
    return { rosto: { emo: 'raiva', nome: mist, cor: E.cor, bg: E.bg, fr: E.fr, per: E.per, amp: E.amp, quadros: lista[i], mistura: true }, memoria: { ...mem, atual: 'raiva' } };
  }

  const emo = livre ? alvo : escada(mem.atual, alvo);
  const E = EMOS[emo];
  const N = E.niv.length;
  let nivel = Math.round(Math.max(0, Math.min(1, intensidade)) * (N - 1));
  if (humor === 'suave' && LEVES_SUAVE.has(emo)) nivel = 0;
  const lista = E.niv[nivel];
  const chave = `${emo}:${nivel}`;
  const usados = mem.ult[chave] || [];
  const janela = Math.min(lista.length - 1, Math.ceil(lista.length * 0.6));
  const livres = lista.map((_, i) => i).filter(i => !usados.includes(i));
  const i = livres[Math.floor(rng() * livres.length)] ?? 0;
  mem.ult[chave] = [...usados, i].slice(-Math.max(0, janela));
  return {
    rosto: { emo, nome: E.nome, cor: E.cor, bg: E.bg, fr: E.fr, per: E.per, amp: E.amp, quadros: lista[i], mistura: false },
    memoria: { ...mem, atual: emo },
  };
}

export { EMOS };

// Modo analista (JF, 13/11): quando ele compara ofertas e faz conta de porcentagem, ganha um rosto próprio de "óculos
// de analista". Não é uma emoção (as 10 do núcleo continuam iguais): é o rosto do modo de trabalho, só da Carteira.
export const ROSTO_ANALISTA = Object.freeze([
  Object.freeze(['(⌐■_■)', '(⌐■_■)🔍', '(⌐■_■)', '(•_•)🔍']),
  Object.freeze(['(⌐■_■)💲', '(⌐■_■)', '(⌐■_■)🧮', '(⌐■_■)']),
  Object.freeze(['(⌐□_□)', '(⌐□_□)🔍', '(⌐□_□)', '(⌐□_□)📊']),
  Object.freeze(['(¬‿¬)🔍', '(⌐■_■)', '(¬‿¬)🏷️', '(⌐■_■)']),
  Object.freeze(['(⌐■‿■)', '(⌐■‿■)✔', '(⌐■_■)', '(⌐■_■)🔍']),
]);

export function rostoAnalista(rng = Math.random) {
  const quadros = ROSTO_ANALISTA[Math.floor(rng() * ROSTO_ANALISTA.length)] || ROSTO_ANALISTA[0];
  return { emo: 'analista', nome: 'analista', cor: '#3ad4ff', bg: 'rgba(8,34,46,0.96)', fr: 900, per: 2600, amp: 0.3, quadros, mistura: false };
}
