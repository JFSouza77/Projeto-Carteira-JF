// Sincronização entre aparelhos (06/11): regras puras, usadas pelo app E pelo servidor (o mesmo arquivo).
// Cada registro (gasto, entrada, conta, compromisso, plano, categoria, meta, perfil) vira uma "mudança":
//   { store, id, em, rec }   em = quando mudou (ms); rec = o registro, ou null quando foi apagado.
// Quem mudou por último ganha (por registro). O servidor carimba cada mudança aceita com um número de versão (v),
// e cada aparelho pede "o que mudou depois da versão X". Sem DOM, sem rede, sem banco: só dados.

export const STORES_SINCRONIZADOS = Object.freeze(['expenses', 'incomes', 'accounts', 'compromissos', 'planos', 'categories', 'metas', 'perfil', 'investimentos']);
export const LIMITE_MUDANCAS = 5000;

const ID_OK = /^[A-Za-z0-9_.:-]{1,80}$/;

export const chaveDe = (store, id) => `${store}/${id}`;

/** Confere uma lista de mudanças vinda de fora (do app ou do servidor). Devolve só as válidas. */
export function mudancasValidas(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.slice(0, LIMITE_MUDANCAS).filter(m => m && typeof m === 'object'
    && STORES_SINCRONIZADOS.includes(m.store) && typeof m.id === 'string' && ID_OK.test(m.id)
    && Number.isFinite(m.em) && m.em > 0
    && (m.rec === null || (m.rec && typeof m.rec === 'object' && !Array.isArray(m.rec))));
}

/** Ponta a ponta (07/11): o registro só pode chegar embaralhado ({ v: 1, d: "base64" }) ou apagado (null). */
export const MAX_CIFRADO = 300_000;
export const recCifrado = rec => rec === null || (!!rec && typeof rec === 'object' && !Array.isArray(rec) && rec.v === 1
  && typeof rec.d === 'string' && rec.d.length > 0 && rec.d.length <= MAX_CIFRADO && /^[A-Za-z0-9+/=]+$/.test(rec.d) && Object.keys(rec).length === 2);

/** A "senha de acesso" que o app manda (nunca a senha de verdade): "e2ee1:" + 64 letras hexadecimais. */
export const ACESSO_RE = /^e2ee1:[0-9a-f]{64}$/;

/** Estado vazio da conta no servidor. */
export const estadoVazio = () => ({ versao: 0, registros: {} });

/**
 * Junta mudanças no estado guardado. Quem tem o `em` maior ganha; empate fica o que já estava.
 * Devolve { estado, aceitas } sem mexer no estado recebido.
 */
export function mesclar(estado, mudancas) {
  const atual = estado && estado.registros ? estado : estadoVazio();
  const registros = { ...atual.registros };
  const novas = mudancasValidas(mudancas).filter(m => {
    const antes = registros[chaveDe(m.store, m.id)];
    return !antes || m.em > antes.em;
  });
  if (!novas.length) return { estado: { versao: atual.versao, registros }, aceitas: 0 };
  const versao = atual.versao + 1;
  for (const m of novas) registros[chaveDe(m.store, m.id)] = { store: m.store, id: m.id, em: m.em, rec: m.rec, v: versao };
  return { estado: { versao, registros }, aceitas: novas.length };
}

/** O que mudou depois da versão `desde` (o que um aparelho ainda não viu). */
export function mudancasDesde(estado, desde = 0) {
  const regs = Object.values((estado && estado.registros) || {});
  return regs.filter(r => r.v > desde).map(({ store, id, em, rec }) => ({ store, id, em, rec }));
}

/** Apelido da conta: letras, números, ponto, traço e sublinhado, de 3 a 30. Comparado sem maiúsculas e sem acento. */
export function normalizarApelido(apelido) {
  const a = String(apelido || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return /^[a-z0-9_.-]{3,30}$/.test(a) ? a : null;
}

export const SENHA_MINIMA = 6;
