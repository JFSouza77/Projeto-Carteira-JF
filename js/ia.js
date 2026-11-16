// IA online (opcional, desligada por padrão): conversa com o servidor do projeto (Cloudflare Worker).
// A chave da API fica SÓ no servidor. O app manda:
//  · na conversa: a pergunta e um RESUMO AGREGADO (totais por categoria), nunca a lista de gastos;
//  · na foto: a imagem, só quando a pessoa toca em "Ler com IA".

import { summarizeMonth, incomeIn, totalBalance, analyze, monthKey, toISODate, forecastMonth } from './engine.js';

const TEMPO_MS = 45_000;

// Criador (JF, 16/11): com o selo de criador, o app manda o token da conta e o servidor libera o uso sem limite.
// Pra quem não é criador, nada de token: a pergunta segue sem dizer de quem é.
let tokenCriador = null;
export function definirCriador(token) { tokenCriador = token || null; }

async function chamar(base, rota, corpo) {
  if (!base) throw new Error('Configure o endereço do servidor em Ajustes → IA online.');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TEMPO_MS);
  try {
    const r = await fetch(base.replace(/\/+$/, '') + rota, {
      method: corpo ? 'POST' : 'GET',
      headers: { ...(corpo ? { 'content-type': 'application/json' } : {}), ...(tokenCriador && rota.startsWith('/ia/') ? { authorization: `Bearer ${tokenCriador}` } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: ctrl.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.erro || `O servidor respondeu ${r.status}.`);
    return j;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('O servidor demorou demais. Tenta de novo.');
    if (e instanceof TypeError) throw new Error('Sem conexão com o servidor da IA.');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

/** Só totais: nada de descrição, data ou valor de lançamento individual. */
export function resumoAgregado(dados, today = toISODate()) {
  const mes = monthKey(today);
  const s = summarizeMonth(dados.expenses, dados.categories, mes);
  const f = forecastMonth(dados.expenses, mes, today, dados.compromissos || []);
  return {
    mes,
    dia: Number(today.slice(8, 10)),
    gastoTotalCentavos: s.totalCents,
    entradasCentavos: incomeIn(dados.incomes, mes),
    previsaoMesCentavos: f.projectedCents,
    saldoContasCentavos: dados.accounts.length ? totalBalance(dados.accounts, dados.expenses, dados.incomes, dados.transferencias || []) : null,
    categorias: s.rows.filter(r => r.spentCents || r.budgetCents)
      .map(r => ({ nome: r.name, gastoCentavos: r.spentCents, orcamentoCentavos: r.budgetCents })),
    alertas: analyze(dados, today).map(a => a.type),
  };
}

export function saude(base) {
  return chamar(base, '/saude');
}

export async function perguntar(base, { pergunta, humor, dados, modo = null, semBusca = false, emocao = null }) {
  // modo 'pesquisa' (16/11): pesquisa de compra ou viagem, com mais buscas e resposta em lista
  const j = await chamar(base, '/ia/perguntar', { pergunta: String(pergunta).slice(0, 500), humor, resumo: resumoAgregado(dados), ...(modo ? { modo } : {}), ...(semBusca ? { semBusca: true } : {}), ...(emocao ? { emocao } : {}) });
  return j.texto;
}

export async function lerImagem(base, { base64, categorias, legenda = '' }) {
  return chamar(base, '/ia/imagem', {
    imagem: base64, tipo: 'image/jpeg', legenda: String(legenda || '').slice(0, 200),
    categorias: categorias.map(c => ({ id: c.id, nome: c.name })),
  });
}

/** Lê ofertas num print (loja, preço, parcelas, frete). A imagem só vai quando a pessoa manda o print da oferta. */
export async function lerOfertas(base, { base64 }) {
  return chamar(base, '/ia/ofertas', { imagem: base64, tipo: 'image/jpeg' });
}

/** Explica um print do banco/fatura. A imagem só vai quando a pessoa pede ("explica esse print"). */
export async function explicarImagem(base, { base64, duvida, humor }) {
  const j = await chamar(base, '/ia/explicar', { imagem: base64, tipo: 'image/jpeg', duvida: String(duvida || '').slice(0, 300), humor });
  return j.texto;
}

export { chamar };

/** Resumo do mercado que o servidor atualiza todo dia útil às 10h (o app guarda pra usar offline). */
export function baixarMercado(base) {
  return chamar(base, '/mercado');
}

/** Notícias do dia (14/11): o servidor busca 2x por dia; aqui só baixa o que já está pronto (não gasta IA). */
export function baixarNoticias(base) {
  return chamar(base, '/noticias');
}

/** Comparação de rendimento entre bancos: só os NOMES dos bancos e o CDI vão pro servidor (nada de saldo). */
export async function perguntarBancos(base, { bancos, cdi }) {
  const j = await chamar(base, '/ia/bancos', { bancos, cdi });
  return j.texto;
}

// 2.1.3.1 (GPT, 16/11: "medir antes de cortar crédito"): conta no aparelho quantas respostas o cérebro local deu e por
// que a IA online foi chamada. Fica só no aparelho (meta/iaMes) e zera no mês novo. Funções puras.
export const MOTIVOS_IA = Object.freeze({
  papo: 'papo',
  pesquisa: 'pesquisa e planos',
  assunto: 'pergunta com assunto (mercado, moedas…)',
  duvida: 'frase que eu não entendi',
});

export function motivoDaIA(fala) {
  if (fala?.modoIA === 'pesquisa') return 'pesquisa';
  if (fala?.intent === 'papo_pessoal') return 'papo';
  if (fala?.perguntaIA) return 'assunto';
  return 'duvida';
}

// tipo: 'local' (o cérebro do aparelho respondeu), 'memoria' (resposta da IA reaproveitada, sem gastar) ou um motivo
export function contarUsoIA(uso, mes, tipo) {
  const u = uso && uso.mes === mes
    ? { ...uso, motivos: { ...(uso.motivos || {}) } }
    : { mes, local: 0, memoria: 0, ia: 0, motivos: {} };
  if (tipo === 'local') u.local += 1;
  else if (tipo === 'memoria') u.memoria += 1;
  else { u.ia += 1; u.motivos[tipo] = (u.motivos[tipo] || 0) + 1; }
  return u;
}

export function descreverUsoIA(uso, mes) {
  if (!uso || uso.mes !== mes || !(uso.local + uso.ia + uso.memoria)) return 'Este mês ainda não teve conversa.';
  const total = uso.local + uso.ia + uso.memoria;
  const pct = Math.round((uso.local + uso.memoria) * 100 / total);
  const motivos = Object.entries(uso.motivos || {}).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${n} ${MOTIVOS_IA[k] || k}`).join(', ');
  return `Este mês: ${uso.local} ${uso.local === 1 ? 'resposta' : 'respostas'} aqui no aparelho, sem gastar crédito, e ${uso.ia} com a IA online${motivos ? ` (${motivos})` : ''}.`
    + `${uso.memoria ? ` ${uso.memoria} ${uso.memoria === 1 ? 'veio' : 'vieram'} da memória, sem gastar.` : ''} ${pct}% sem gastar crédito.`;
}
