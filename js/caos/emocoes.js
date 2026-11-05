// Console de emoções do C.A.O.S. (ideia do Perfil JF, C.A.O.S. 4.x, simplificada para a carteira).
// Sete emoções de 0 a 10. Cada evento mexe nelas; com o tempo (horas reais) tudo volta devagar ao calmo.
// A mais alta (acima do limiar) vira a emoção do momento; duas altas juntas viram uma MISTURA.
// No humor Suave a irritação aparece como preocupação (2ª lei).

export const EMOCOES = Object.freeze(['alegria', 'orgulho', 'preocupacao', 'irritacao', 'tedio', 'curiosidade', 'carinho']);

export const ROSTO = Object.freeze({
  calmo: { emoji: '🙂', cor: '#ff3d7f', nome: 'calmo' },
  alegria: { emoji: '😄', cor: '#ffd23f', nome: 'animado' },
  orgulho: { emoji: '😎', cor: '#3ddc97', nome: 'orgulhoso' },
  preocupacao: { emoji: '😟', cor: '#ffb020', nome: 'preocupado' },
  irritacao: { emoji: '😤', cor: '#ff4d4d', nome: 'irritado' },
  tedio: { emoji: '😑', cor: '#8b95a7', nome: 'entediado' },
  curiosidade: { emoji: '🧐', cor: '#5ab0ff', nome: 'curioso' },
  carinho: { emoji: '🥰', cor: '#ff7ac6', nome: 'carinhoso' },
  radiante: { emoji: '🤩', cor: '#c6f432', nome: 'radiante' },
  protetor: { emoji: '🫡', cor: '#ffb020', nome: 'protetor' },
  tenso: { emoji: '😬', cor: '#ff7a3d', nome: 'tenso' },
});

// Misturas: duas emoções altas ao mesmo tempo
const MISTURAS = [
  [['alegria', 'orgulho'], 'radiante'],
  [['preocupacao', 'carinho'], 'protetor'],
  [['preocupacao', 'irritacao'], 'tenso'],
];

const LIMIAR = 3.8;
const LIMIAR_MISTURA = LIMIAR * 0.7; // como no Perfil: a mistura começa em 70% do limiar
const MEIA_VIDA_H = 8; // em 8 horas a emoção cai pela metade

// Quanto cada evento mexe em cada emoção
const EFEITO = {
  boas_vindas: { carinho: 1.5, curiosidade: 0.5 },
  gasto_cadastrado: { curiosidade: 0.8, tedio: -0.5 },
  entrada_cadastrada: { alegria: 2.5, orgulho: 0.5 },
  orcamento_80: { preocupacao: 4 },
  categoria_estourada: { preocupacao: 4.5, irritacao: 3, alegria: -1.5 },
  delivery_repetido: { irritacao: 1.5, preocupacao: 1 },
  mes_verde: { orgulho: 4.5, alegria: 3, preocupacao: -2 },
  ritmo_alto: { preocupacao: 2 },
  mes_negativo: { preocupacao: 3, carinho: 1 },
  conta_negativa: { preocupacao: 3.5, carinho: 1.5 },
  sem_registro: { tedio: 2.5, carinho: 0.5 },
  pergunta: { curiosidade: 1, tedio: -1 },
  elogio: { carinho: 2.5, alegria: 1.5 },
  xingamento: { irritacao: 2.5, carinho: -1 },
  agradecimento: { carinho: 2, alegria: 0.5 },
};

export function emocoesIniciais(now = Date.now()) {
  return { v: Object.fromEntries(EMOCOES.map(e => [e, 0])), at: now };
}

const limpar = x => (Number.isFinite(x) ? Math.max(0, Math.min(10, x)) : 0); // saneamento (como na espinha do Perfil)

/** Avança o tempo: tudo decai para o calmo. */
export function decair(estado, now = Date.now()) {
  const e = estado && estado.v ? estado : emocoesIniciais(now);
  const horas = Math.max(0, (now - (e.at ?? now)) / 3_600_000);
  const fator = Math.pow(0.5, horas / MEIA_VIDA_H);
  return { v: Object.fromEntries(EMOCOES.map(k => [k, limpar((e.v[k] || 0) * fator)])), at: now };
}

/** Aplica um evento (depois de decair até agora). Devolve um estado NOVO. */
export function sentir(estado, tipoEvento, now = Date.now()) {
  const e = decair(estado, now);
  const efeito = EFEITO[tipoEvento];
  if (!efeito) return e;
  const v = { ...e.v };
  for (const [k, d] of Object.entries(efeito)) v[k] = limpar(v[k] + d);
  return { v, at: now };
}

/** Emoção do momento: mistura, a mais alta, ou calmo. */
export function emocaoAtual(estado, humor = 'suave', now = Date.now()) {
  const e = decair(estado, now);
  const v = { ...e.v };
  if (humor === 'suave') {
    v.preocupacao = Math.max(v.preocupacao, v.irritacao);
    v.irritacao = 0;
  }
  for (const [[a, b], nome] of MISTURAS) {
    if (v[a] >= LIMIAR_MISTURA && v[b] >= LIMIAR_MISTURA) return nome;
  }
  let top = 'calmo', max = LIMIAR;
  for (const k of EMOCOES) if (v[k] > max) { max = v[k]; top = k; }
  return top;
}
