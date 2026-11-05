// Mercado financeiro: análise pura (sem rede). O servidor busca os números todo dia às 10h e usa estas funções;
// o app guarda o resumo offline e o C.A.O.S. lê dele. Tudo com base de cálculo, nada de "achismo".
// IMPORTANTE: é leitura do passado recente, não previsão garantida nem recomendação de investimento.

export const MOEDAS = Object.freeze({
  USD: { nome: 'Dólar', simbolo: 'US$' },
  EUR: { nome: 'Euro', simbolo: '€' },
  GBP: { nome: 'Libra', simbolo: '£' },
  ARS: { nome: 'Peso argentino', simbolo: 'ARS' },
  BTC: { nome: 'Bitcoin', simbolo: 'BTC' },
});

const media = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pctDe = (de, para) => (de ? ((para - de) / de) * 100 : null);
const r2 = x => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);

/**
 * Analisa uma série de valores diários (do mais antigo pro mais novo).
 * Tendência: compara o valor atual e a média de 5 dias com a média de 20 dias (ou do que tiver).
 *  · alta: atual e média curta acima da média longa (com folga de 0,5%);
 *  · queda: os dois abaixo;  · estável: no meio.
 */
export function analisarSerie(valores, { atual } = {}) {
  const xs = (valores || []).map(Number).filter(Number.isFinite);
  const v = Number.isFinite(atual) ? atual : xs[xs.length - 1];
  if (!Number.isFinite(v)) return null;
  const anterior = xs.length >= 2 ? xs[xs.length - 2] : null;
  const cinco = xs.length >= 6 ? xs[xs.length - 6] : xs[0];
  const m5 = media(xs.slice(-5));
  const m20 = media(xs.slice(-20));
  let tendencia = 'estavel';
  if (m5 != null && m20 != null && xs.length >= 6) {
    const folga = m20 * 0.005;
    if (v > m20 + folga && m5 > m20) tendencia = 'alta';
    else if (v < m20 - folga && m5 < m20) tendencia = 'queda';
  }
  return {
    atual: v, varDia: r2(pctDe(anterior, v)), var5: r2(pctDe(cinco, v)), media5: m5, media20: m20,
    dias: xs.length, tendencia, minimo: xs.length ? Math.min(...xs) : v, maximo: xs.length ? Math.max(...xs) : v,
  };
}

export function textoTendencia(t) {
  return t === 'alta' ? 'em alta nos últimos dias' : t === 'queda' ? 'em queda nos últimos dias' : 'estável nos últimos dias';
}

/** Idade do dado em texto ("hoje às 10:05", "ontem", "há 3 dias"). */
export function quandoFoi(iso, agora = new Date()) {
  if (!iso) return 'sem data';
  const d = new Date(iso);
  const dia = x => x.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const hora = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  if (dia(d) === dia(agora)) return `hoje às ${hora}`;
  const ontem = new Date(agora.getTime() - 86_400_000);
  if (dia(d) === dia(ontem)) return `ontem às ${hora}`;
  return `em ${dia(d)}`;
}

/** Resumo "velho": mais de 3 dias (fim de semana conta). */
export function mercadoVelho(resumo, agora = new Date()) {
  return !resumo?.atualizadoEm || agora - new Date(resumo.atualizadoEm) > 3.5 * 86_400_000;
}
