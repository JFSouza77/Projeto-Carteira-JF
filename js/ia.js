// IA online (opcional, desligada por padrão): conversa com o servidor do projeto (Cloudflare Worker).
// A chave da API fica SÓ no servidor. O app manda:
//  · na conversa: a pergunta e um RESUMO AGREGADO (totais por categoria), nunca a lista de gastos;
//  · na foto: a imagem, só quando a pessoa toca em "Ler com IA".

import { summarizeMonth, incomeIn, totalBalance, analyze, monthKey, toISODate, forecastMonth } from './engine.js';

const TEMPO_MS = 45_000;

async function chamar(base, rota, corpo) {
  if (!base) throw new Error('Configure o endereço do servidor em Ajustes → IA online.');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TEMPO_MS);
  try {
    const r = await fetch(base.replace(/\/+$/, '') + rota, {
      method: corpo ? 'POST' : 'GET',
      headers: corpo ? { 'content-type': 'application/json' } : {},
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

export async function perguntar(base, { pergunta, humor, dados }) {
  const j = await chamar(base, '/ia/perguntar', { pergunta: String(pergunta).slice(0, 500), humor, resumo: resumoAgregado(dados) });
  return j.texto;
}

export async function lerImagem(base, { base64, categorias }) {
  return chamar(base, '/ia/imagem', {
    imagem: base64, tipo: 'image/jpeg',
    categorias: categorias.map(c => ({ id: c.id, nome: c.name })),
  });
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

/** Comparação de rendimento entre bancos: só os NOMES dos bancos e o CDI vão pro servidor (nada de saldo). */
export async function perguntarBancos(base, { bancos, cdi }) {
  const j = await chamar(base, '/ia/bancos', { bancos, cdi });
  return j.texto;
}
