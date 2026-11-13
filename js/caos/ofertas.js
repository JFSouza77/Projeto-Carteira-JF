// Analista de ofertas e contas de porcentagem (JF, 13/11): "a geladeira tá 3.500 no Mercado Livre, 3.400 na Amazon e
// 2.100 na Shopee". O C.A.O.S. compara, acha a melhor pra pessoa, pergunta como ela vai pagar e refaz a conta com frete,
// desconto no Pix e parcelas. Também faz porcentagem e desconto ("15% de 3500", "3500 com 10% de desconto").
// Funções puras: recebem o texto já normalizado (minúsculo, sem acento, "%" vira "porcento") e devolvem números.
import { parseAmount, formatBRL } from '../engine.js';

const NUM = '(\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?|\\d+(?:,\\d{1,2})?)';
const PCT = '(\\d{1,2}(?:[.,]\\d{1,2})?|100)\\s*(?:porcento|por cento)';
const valor = s => parseAmount(String(s).replace(/\.(?=\d{3}\b)/g, '.')) || null;
const pct = s => Number(String(s).replace(',', '.'));
const BRL = c => formatBRL(Math.round(c));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const fmtPct = n => `${Math.round(n * 10) / 10}`.replace('.', ',') + '%';

// Lojas conhecidas (nome normalizado → nome bonito). Mais longas primeiro pra "mercado livre" ganhar de "mercado".
const LOJAS = [
  ['mercado livre', 'Mercado Livre'], ['mercadolivre', 'Mercado Livre'], ['magazine luiza', 'Magalu'], ['magalu', 'Magalu'],
  ['casas bahia', 'Casas Bahia'], ['fast shop', 'Fast Shop'], ['leroy merlin', 'Leroy Merlin'], ['aliexpress', 'AliExpress'],
  ['americanas', 'Americanas'], ['submarino', 'Submarino'], ['amazon', 'Amazon'], ['shopee', 'Shopee'], ['shein', 'Shein'],
  ['kabum', 'KaBuM!'], ['carrefour', 'Carrefour'], ['temu', 'Temu'], ['olx', 'OLX'], ['havan', 'Havan'], ['extra', 'Extra'],
  ['ponto frio', 'Ponto'], ['loja fisica', 'loja física'], ['na loja', 'loja física'], ['no site', 'site da marca'],
].sort((a, b) => b[0].length - a[0].length);

// artigo de cada loja: "o Mercado Livre", "a Amazon"
const MASC = new Set(['Mercado Livre', 'KaBuM!', 'Carrefour', 'Extra', 'Ponto', 'site da marca']);
const art = (loja, forma = 'o') => {
  const m = MASC.has(loja);
  return { o: m ? 'o' : 'a', ao: m ? 'ao' : 'à', do: m ? 'do' : 'da', no: m ? 'no' : 'na' }[forma] + ' ' + loja;
};

function achaLoja(seg) {
  for (const [k, nome] of LOJAS) if (new RegExp(`\\b${k}\\b`).test(seg)) return nome;
  return null;
}

// ---------- Porcentagem e desconto ----------
/**
 * "15 porcento de 3500" → { tipo: 'parte' }; "3500 com 10 porcento de desconto" → 'desconto';
 * "3500 com 10 porcento a mais/de juros/de acrescimo" → 'acrescimo'; "de 3500 por 2800" → 'variacao';
 * "quanto porcento e 700 de 3500" → 'quanto_pct'. Devolve null se não for conta de porcentagem.
 */
export function lerPorcentagem(t) {
  let m;
  if ((m = t.match(new RegExp(`\\bde ${NUM} (?:por|pra|para|caiu pra|baixou pra|foi pra|subiu pra) ${NUM}`)))) {
    const de = valor(m[1]), por = valor(m[2]);
    if (de && por && de !== por) return { tipo: 'variacao', de, por };
  }
  if ((m = t.match(new RegExp(`quanto(?: e)?(?: em)? porcento (?:e |eh )?${NUM} de ${NUM}`)))) {
    const parte = valor(m[1]), total = valor(m[2]);
    if (parte && total) return { tipo: 'quanto_pct', parte, total };
  }
  const p = t.match(new RegExp(PCT));
  if (!p) return null;
  const taxa = pct(p[1]);
  if (!(taxa > 0 && taxa <= 100)) return null;
  const semPct = t.replace(new RegExp(PCT, 'g'), ' ');
  const nums = [...semPct.matchAll(new RegExp(NUM, 'g'))].map(x => valor(x[1])).filter(Boolean);
  if (!nums.length) return null;
  const base = Math.max(...nums);
  if (/\b(desconto|off|abatimento|de volta|cashback)\b/.test(t)) return { tipo: 'desconto', base, taxa, cashback: /\b(de volta|cashback)\b/.test(t) };
  if (/\b(a mais|acrescimo|de juros|juros de|aumento|taxa)\b/.test(t)) return { tipo: 'acrescimo', base, taxa };
  if (new RegExp(`${PCT} de ${NUM}`).test(t) || /\bquanto (e|da|fica)\b/.test(t)) return { tipo: 'parte', base, taxa };
  return null;
}

export function textoPorcentagem(c) {
  switch (c.tipo) {
    case 'parte': return `${fmtPct(c.taxa)} de ${BRL(c.base)} é ${BRL(c.base * c.taxa / 100)}.`;
    case 'desconto': {
      const off = c.base * c.taxa / 100;
      return c.cashback
        ? `${fmtPct(c.taxa)} de cashback em ${BRL(c.base)} devolve ${BRL(off)}: na prática a compra sai por ${BRL(c.base - off)}. Mas o dinheiro de volta só vale se você for usar onde ele cai.`
        : `${BRL(c.base)} com ${fmtPct(c.taxa)} de desconto fica ${BRL(c.base - off)}. Você economiza ${BRL(off)}.`;
    }
    case 'acrescimo': return `${BRL(c.base)} com ${fmtPct(c.taxa)} a mais fica ${BRL(c.base * (1 + c.taxa / 100))}: são ${BRL(c.base * c.taxa / 100)} a mais.`;
    case 'variacao': {
      const dif = c.de - c.por, p = Math.abs(dif) / c.de * 100;
      return dif > 0
        ? `De ${BRL(c.de)} por ${BRL(c.por)}: desconto de ${BRL(dif)}, ou ${fmtPct(p)}. Antes de comemorar, confere se o "de" era o preço de verdade nas semanas anteriores.`
        : `De ${BRL(c.de)} pra ${BRL(c.por)}: subiu ${BRL(-dif)}, ou ${fmtPct(p)}.`;
    }
    case 'quanto_pct': return `${BRL(c.parte)} é ${fmtPct(c.parte / c.total * 100)} de ${BRL(c.total)}.`;
    default: return null;
  }
}

// ---------- Ofertas ----------
/** Detalhes de pagamento de um pedaço da frase: frete, desconto no Pix/à vista, parcelas. */
function lerDetalhes(seg) {
  const d = {};
  let m;
  if (/frete (e )?(gratis|gratuito|zero|de graca)|sem frete/.test(seg)) d.freteCents = 0;
  else if ((m = seg.match(new RegExp(`frete (?:de |e |fica |custa |sai )?(?:r\\$ ?)?${NUM}`)))) d.freteCents = valor(m[1]);
  if ((m = seg.match(new RegExp(`(?:pix|a vista|boleto)[a-z ]{0,20}?${PCT}|${PCT}[a-z ]{0,20}?(?:no pix|a vista|no boleto)`)))) d.pixPct = pct(m[1] || m[2]);
  else if ((m = seg.match(new RegExp(`(?:no pix|a vista|no boleto)(?: sai| fica| por| custa)? (?:r\\$ ?)?${NUM}`)))) d.vistaCents = valor(m[1]);
  if ((m = seg.match(new RegExp(`(\\d{1,2}) ?(?:x|vezes)(?: de (?:r\\$ ?)?${NUM})?( sem juros)?`)))) {
    d.parcelas = Number(m[1]);
    if (m[2]) d.parcelaCents = valor(m[2]);
    if (m[3]) d.semJuros = true;
  }
  return d;
}

/** Tira do pedaço os números que não são o preço (frete, parcelas, porcentagens) e devolve o preço. */
function precoDe(seg) {
  const limpo = seg
    .replace(new RegExp(`frete (?:de |e |fica |custa |sai )?(?:r\\$ ?)?${NUM}`, 'g'), ' ')
    .replace(new RegExp(`(\\d{1,2}) ?(?:x|vezes)(?: de (?:r\\$ ?)?${NUM})?`, 'g'), ' ')
    .replace(new RegExp(PCT, 'g'), ' ')
    .replace(new RegExp(`(?:no pix|a vista|no boleto)(?: sai| fica| por| custa)? (?:r\\$ ?)?${NUM}`, 'g'), ' ');
  const m = limpo.match(new RegExp(NUM));
  return m ? valor(m[1]) : null;
}

/** O que a pessoa quer comprar: "quero comprar uma geladeira que custa…" → "geladeira". */
function produtoDe(t) {
  const m = t.match(/\b(?:comprar|compra de|comprando|preco d[aoe]|valor d[aoe]|oferta d[aoe])\s+(?:uma?|o|a|esse|essa|um par de)?\s*([a-z][a-z ]{2,30}?)(?=\s+(?:que|por|no|na|nos|nas|em|de|do|da|ta|esta|custa|sai|\d)|,|$)/);
  return m ? m[1].trim() : null;
}

/**
 * Lê ofertas de uma frase: "3500 no mercado livre, na amazon ta 3400 e 2100 na shopee".
 * Precisa de pelo menos 2 lojas com preço. Devolve { produto, ofertas: [{ loja, precoCents, ...detalhes }] } ou null.
 */
export function lerOfertas(t) {
  const segs = t.split(/\s*[,;]\s*|\s+(?:e|ou|mas|ja)\s+(?=(?:na |no |em |pela |pelo )?[a-z0-9])/).filter(Boolean);
  const ofertas = [];
  let ultima = null;
  for (const seg of segs) {
    const loja = achaLoja(seg);
    const preco = precoDe(seg);
    if (loja && preco && !ofertas.some(o => o.loja === loja)) { ultima = { loja, precoCents: preco, ...lerDetalhes(seg) }; ofertas.push(ultima); }
    else if (!loja && ultima) Object.assign(ultima, lerDetalhes(seg)); // "…, frete 60" vale pra loja de antes
  }
  return ofertas.length >= 2 ? { produto: produtoDe(t), ofertas } : null;
}

/** Junta o que a pessoa contou depois ("amazon 10x sem juros, shopee frete 80") nas ofertas já lidas. */
export function completarOfertas(ofertas, t) {
  const novas = ofertas.map(o => ({ ...o }));
  let mexeu = false;
  let anterior = null; // "amazon 10x de 380 e frete 50": o frete vale pra loja de antes
  for (const seg of t.split(/\s*[,;]\s*|\s+e\s+(?=(?:na |no |a |o )?[a-z0-9])/)) {
    const loja = achaLoja(seg);
    const alvo = loja ? novas.find(o => o.loja === loja)
      : (/\b(todas?|todos|nas duas|nas tres|em todas)\b/.test(seg) ? 'todas' : anterior);
    if (loja) anterior = novas.find(o => o.loja === loja) || null;
    if (!alvo) continue;
    const det = lerDetalhes(seg);
    const preco = loja ? precoDe(seg) : null;
    if (!Object.keys(det).length && !preco) continue;
    for (const o of alvo === 'todas' ? novas : [alvo]) {
      Object.assign(o, det);
      if (preco && !det.parcelaCents && !det.freteCents) o.precoCents = preco;
    }
    mexeu = true;
  }
  return mexeu ? novas : null;
}

/** Quanto sai cada oferta do melhor jeito de pagar (à vista com desconto, parcelado) e com frete. */
export function analisarOfertas(ofertas) {
  const linhas = ofertas.map(o => {
    const frete = o.freteCents || 0;
    const vista = (o.vistaCents ?? (o.pixPct ? o.precoCents * (1 - o.pixPct / 100) : o.precoCents)) + frete;
    let parcelado = null;
    if (o.parcelas > 1) parcelado = (o.parcelaCents ? o.parcelaCents * o.parcelas : o.precoCents) + frete;
    const jurosCents = parcelado != null ? Math.max(0, parcelado - (o.precoCents + frete)) : 0;
    return { ...o, vistaCents: Math.round(vista), parceladoCents: parcelado != null ? Math.round(parcelado) : null, jurosCents: Math.round(jurosCents),
      custoCents: Math.round(vista) };
  }).sort((a, b) => a.custoCents - b.custoCents);
  // "bom demais pra ser verdade": bem abaixo das outras (30% ou mais abaixo da mediana das demais)
  for (const l of linhas) {
    const outras = linhas.filter(x => x !== l).map(x => x.custoCents).sort((a, b) => a - b);
    const mediana = outras.length ? outras[Math.floor((outras.length - 1) / 2)] : null;
    l.suspeita = !!(mediana && l.custoCents < mediana * 0.7);
    l.abaixoPct = mediana ? Math.round((1 - l.custoCents / mediana) * 100) : 0;
  }
  const confiaveis = linhas.filter(l => !l.suspeita);
  return { linhas, melhor: linhas[0], melhorConfiavel: confiaveis[0] || null, pior: linhas[linhas.length - 1],
    temPagamento: ofertas.some(o => o.freteCents != null || o.pixPct || o.vistaCents || o.parcelas) };
}

/** O texto da análise, pronto pra fala do C.A.O.S. */
export function textoOfertas(a, produto) {
  const doQue = produto ? ` d${/a$/.test(produto) ? 'a' : 'o'} ${produto}` : '';
  const partes = [`Comparei ${a.linhas.length} ofertas${doQue}:`];
  a.linhas.forEach((l, i) => {
    const extras = [];
    if (l.freteCents) extras.push(`com frete de ${BRL(l.freteCents)}`);
    if (l.freteCents === 0) extras.push('frete grátis');
    if (l.pixPct) extras.push(`${fmtPct(l.pixPct)} de desconto à vista`);
    if (l.parcelas > 1) extras.push(l.jurosCents ? `${l.parcelas}x de ${BRL(l.parceladoCents / l.parcelas)} = ${BRL(l.parceladoCents)}, sendo ${BRL(l.jurosCents)} de juros` : `${l.parcelas}x sem juros`);
    const dif = l.custoCents - a.melhor.custoCents;
    partes.push(`${i + 1}º ${l.loja}: ${BRL(l.custoCents)}${extras.length ? ` (${extras.join('; ')})` : ''}${dif > 0 ? `, ${BRL(dif)} a mais que ${art(a.melhor.loja)}` : ''}.`);
  });
  const sus = a.linhas.filter(l => l.suspeita);
  if (sus.length) {
    const s = sus[0];
    partes.push(`⚠️ ${cap(art(s.loja))} está ${s.abaixoPct}% abaixo das outras. Preço bom demais pode ser outro modelo, usado, sem nota, vendedor sem reputação ou golpe: confere modelo e voltagem, as avaliações do vendedor, o frete e o prazo, e paga só pelo site (nunca Pix por fora).`);
    if (a.melhorConfiavel && a.melhorConfiavel !== s) {
      const seg = a.linhas.filter(l => !l.suspeita);
      const eco = seg.length > 1 ? seg[seg.length - 1].custoCents - seg[0].custoCents : 0;
      partes.push(`Entre as outras, ${art(a.melhorConfiavel.loja)} sai melhor${eco ? `: ${BRL(eco)} a menos que ${art(seg[seg.length - 1].loja)}` : ''}.`);
    }
  } else {
    const eco = a.pior.custoCents - a.melhor.custoCents;
    if (eco > 0) partes.push(`${cap(art(a.melhor.loja))} sai melhor: você economiza ${BRL(eco)} (${fmtPct(eco / a.pior.custoCents * 100)}) em relação ${art(a.pior.loja, 'ao')}.`);
    else partes.push('Dá no mesmo nas lojas: aí decide pelo prazo de entrega, garantia e quem atende melhor.');
  }
  const juros = a.linhas.find(l => l.jurosCents > 0);
  if (juros) partes.push(`No parcelado ${art(juros.loja, 'do')} você paga ${BRL(juros.jurosCents)} só de juros: se der pra pagar à vista sem apertar o mês, compensa.`);
  if (!a.temPagamento) partes.push('Como você vai pagar? Me conta por loja que eu refaço a conta. Tipo: "amazon 10x sem juros", "mercado livre 5% no pix", "shopee frete 80".');
  else partes.push('Quer ver se cabe no mês? No Mês tem o "E se eu comprar?".');
  return partes.join(' ');
}
