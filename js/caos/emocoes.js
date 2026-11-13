// Console de emoções do C.A.O.S. (ideia do Perfil JF, C.A.O.S. 4.x).
// Dez emoções de 0 a 10 (núcleo único). Cada evento mexe nelas; com o tempo (horas reais) tudo volta devagar ao calmo.
// A mais alta (acima do limiar) vira a emoção do momento; duas altas juntas viram uma MISTURA.
// No humor Suave a raiva aparece como preocupação (2ª lei); a tristeza aparece como cuidado (filtro de apoio).
import { NUCLEO } from './nucleo.js';

// Um C.A.O.S. só (núcleo 1.2.0, 13/11): as 10 emoções da lista oficial, iguais às do Perfil.
// Os nomes antigos da Carteira viram apelidos (preocupacao = ansiedade, irritacao = raiva, orgulho = alegria).
export const EMOCOES = Object.freeze([...NUCLEO.emocoes.lista]);
const APELIDOS = NUCLEO.emocoes.apelidos;

// O que ele MOSTRA (rosto, cor, falas) continua com os nomes da Carteira; o filtro de apoio decide (ver emocaoAtual).
export const ROSTO = Object.freeze({
  calmo: { emoji: '🙂', cor: '#ff3d7f', nome: 'calmo' },
  alegria: { emoji: '😄', cor: '#ffd23f', nome: 'animado' },
  orgulho: { emoji: '😎', cor: '#3ddc97', nome: 'orgulhoso' },
  preocupacao: { emoji: '😟', cor: '#ffb020', nome: 'preocupado' },
  irritacao: { emoji: '😤', cor: '#ff4d4d', nome: 'irritado' },
  tedio: { emoji: '😑', cor: '#8b95a7', nome: 'entediado' },
  curiosidade: { emoji: '🧐', cor: '#5ab0ff', nome: 'curioso' },
  carinho: { emoji: '🥰', cor: '#ff7ac6', nome: 'carinhoso' },
  medo: { emoji: '😨', cor: '#a78bfa', nome: 'assustado' },
  nojo: { emoji: '🤢', cor: '#84cc16', nome: 'enjoado' },
  vergonha: { emoji: '😳', cor: '#fb7185', nome: 'sem graça' },
  radiante: { emoji: '🤩', cor: '#c6f432', nome: 'radiante' },
  protetor: { emoji: '🫡', cor: '#ffb020', nome: 'protetor' },
  tenso: { emoji: '😬', cor: '#ff7a3d', nome: 'tenso' },
});

// Emoção oficial → nome que aparece na Carteira (filtro de apoio do núcleo: tristeza aparece como cuidado)
const MOSTRA = { alegria: 'alegria', tristeza: 'carinho', raiva: 'irritacao', medo: 'medo', nojo: 'nojo',
  ansiedade: 'preocupacao', tedio: 'tedio', vergonha: 'vergonha', curiosidade: 'curiosidade', carinho: 'carinho' };

// Misturas: duas emoções altas ao mesmo tempo
const MISTURAS = [
  [['ansiedade', 'carinho'], 'protetor'],
  [['ansiedade', 'raiva'], 'tenso'],
];

const LIMIAR = NUCLEO.emocoes.limiar; // 3.8, igual ao Perfil
const LIMIAR_MISTURA = LIMIAR * NUCLEO.emocoes.misturaComeca; // a mistura começa em 70% do limiar
const RADIANTE = 7; // alegria muito alta (o "orgulho" de antes) vira radiante
const MEIA_VIDA_H = 8; // em 8 horas a emoção cai pela metade

// Quanto cada evento mexe em cada emoção (já com os nomes oficiais)
const EFEITO = {
  boas_vindas: { carinho: 1.5, curiosidade: 0.5 },
  gasto_cadastrado: { curiosidade: 0.8, tedio: -0.5 },
  entrada_cadastrada: { alegria: 3 },
  orcamento_80: { ansiedade: 4 },
  categoria_estourada: { ansiedade: 4.5, raiva: 3, alegria: -1.5 },
  delivery_repetido: { raiva: 1.5, ansiedade: 1, nojo: 0.5 },
  mes_verde: { alegria: 7.5, ansiedade: -2 },
  ritmo_alto: { ansiedade: 2 },
  mes_negativo: { ansiedade: 3, tristeza: 1.5, carinho: 1 },
  conta_negativa: { ansiedade: 3.5, medo: 2, carinho: 1.5 },
  cartao_limite: { ansiedade: 3, medo: 2 },
  sem_registro: { tedio: 2.5, carinho: 0.5 },
  pergunta: { curiosidade: 1, tedio: -1 },
  nao_entendi: { vergonha: 1.5, curiosidade: 0.5 },
  elogio: { carinho: 2.5, alegria: 1.5, vergonha: 0.5 },
  xingamento: { raiva: 2.5, tristeza: 1.5, nojo: 1 },
  agradecimento: { carinho: 2, alegria: 0.5 },
  piada: { alegria: 2, tedio: -2 },
  compromisso_vence: { ansiedade: 2, carinho: 0.5 },
  compromisso_atrasado: { ansiedade: 4, medo: 1.5, carinho: 1 },
  plano_do_mes: { alegria: 1.5, carinho: 1 },
  confira_banco: { carinho: 1, curiosidade: 0.5 },
  carinho_conversa: { carinho: 1.5, curiosidade: 0.5 },
  ofensiva_marco: { alegria: 5, tedio: -1 },
  racha_cadastrada: { curiosidade: 1, carinho: 0.5 },
  a_receber: { curiosidade: 1, ansiedade: 0.5 },
};

export function emocoesIniciais(now = Date.now()) {
  return { v: Object.fromEntries(EMOCOES.map(e => [e, 0])), at: now };
}

const limpar = x => (Number.isFinite(x) ? Math.max(0, Math.min(10, x)) : 0); // saneamento (como na espinha do Perfil)

// memória antiga (7 emoções da Carteira): o valor passa pro nome oficial
function migrar(v) {
  const n = { ...v };
  for (const [velho, oficial] of Object.entries(APELIDOS)) {
    if (n[velho] != null) { n[oficial] = Math.max(n[oficial] || 0, n[velho]); delete n[velho]; }
  }
  return n;
}

/** Avança o tempo: tudo decai para o calmo. */
export function decair(estado, now = Date.now()) {
  const e0 = estado && estado.v ? estado : emocoesIniciais(now);
  const e = { ...e0, v: migrar(e0.v) };
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

/** Emoção do momento (nome da Carteira): mistura, a mais alta, ou calmo. */
// Os valores que valem pra decidir o que ele mostra (já com o filtro do humor suave)
function valoresVisiveis(estado, humor, now) {
  const v = { ...decair(estado, now).v };
  if (humor === 'suave') {
    // Suave (2ª lei): a raiva aparece como preocupação
    v.ansiedade = Math.max(v.ansiedade, v.raiva);
    v.raiva = 0;
  }
  return v;
}

export function emocaoAtual(estado, humor = 'suave', now = Date.now()) {
  const v = valoresVisiveis(estado, humor, now);
  if (v.alegria >= RADIANTE) return 'radiante';
  for (const [[a, b], nome] of MISTURAS) {
    if (v[a] >= LIMIAR_MISTURA && v[b] >= LIMIAR_MISTURA) return nome;
  }
  let top = 'calmo', max = LIMIAR;
  for (const k of EMOCOES) if (v[k] > max) { max = v[k]; top = k; }
  return top === 'calmo' ? 'calmo' : MOSTRA[top];
}

// Quanto a emoção do momento está forte (0 a 1): escolhe o nível do rosto.
const BASE_DA = { radiante: ['alegria'], protetor: ['ansiedade', 'carinho'], tenso: ['ansiedade', 'raiva'],
  preocupacao: ['ansiedade'], irritacao: ['raiva'], carinho: ['carinho', 'tristeza'], orgulho: ['alegria'] };
export function intensidade(estado, emocao, now = Date.now()) {
  if (emocao === 'calmo') return 0.2;
  const e = decair(estado, now);
  const chaves = BASE_DA[emocao] || [emocao];
  const v = Math.max(...chaves.map(k => e.v[k] || 0));
  return Math.max(0, Math.min(1, (v - 3) / 6));
}

// ---------- Estabilizador (C.A.O.S. 2.0.7, núcleo: margem 2 · 3 falas · saída 2,2; igual ao Perfil) ----------
// Sem ele o rosto "pisca": duas emoções quase empatadas trocam a cada fala (achado do Code, 13/11). Com ele:
//  · a emoção que está no rosto fica pelo menos 3 falas;
//  · só troca se a nova passar 2 pontos na frente;
//  · só sai de vez quando cai abaixo de 2,2 (abaixo do limiar de 3,8 ela ainda segura um pouco).
// A memória dele (estab = { atual, falas }) fica com o resto da memória do C.A.O.S.; aqui é tudo função pura.
const ESTAB = NUCLEO.emocoes.estabilizador;

function forca(v, nome) {
  if (!nome || nome === 'calmo') return 0;
  if (nome === 'radiante') return v.alegria || 0;
  const mistura = MISTURAS.find(([, n]) => n === nome);
  if (mistura) return Math.min(v[mistura[0][0]] || 0, v[mistura[0][1]] || 0);
  const base = Object.keys(MOSTRA).filter(k => MOSTRA[k] === nome);
  return base.length ? Math.max(...base.map(k => v[k] || 0)) : 0;
}

/** Emoção do momento com estabilizador. Devolve { emocao, estab } (estab é o novo estado pra guardar na memória). */
export function emocaoEstavel(estado, humor = 'suave', now = Date.now(), estab = null) {
  const bruta = emocaoAtual(estado, humor, now);
  const atual = estab?.atual;
  const falas = Number(estab?.falas) || 0;
  const v = valoresVisiveis(estado, humor, now);
  if (!atual || atual === 'calmo' || forca(v, atual) < ESTAB.saida) return { emocao: bruta, estab: { atual: bruta, falas: 1 } };
  if (bruta === atual || falas < ESTAB.dwellFalas) return { emocao: atual, estab: { atual, falas: falas + 1 } };
  if (bruta !== 'calmo' && forca(v, bruta) >= forca(v, atual) + ESTAB.margem) return { emocao: bruta, estab: { atual: bruta, falas: 1 } };
  return { emocao: atual, estab: { atual, falas: falas + 1 } };
}
