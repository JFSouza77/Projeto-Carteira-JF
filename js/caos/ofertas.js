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
// Cartão da própria loja (JF, 13/11): às vezes a loja dá desconto pagando com o cartão dela.
// Promoção muda toda hora: ele só pergunta e faz a conta com o número que a pessoa trouxer.
const CARTOES_LOJA = [['mercado pago', 'Mercado Livre'], ['amazon', 'Amazon'], ['magalu', 'Magalu'], ['magazine luiza', 'Magalu'],
  ['casas bahia', 'Casas Bahia'], ['americanas', 'Americanas'], ['carrefour', 'Carrefour'], ['shopee', 'Shopee']];
export const lojaDoCartao = seg => {
  const m = seg.match(/cartao (?:da |do )?([a-z ]{3,20}?)(?= \d| com| de| tem| da| dá| porcento|$|,)/);
  if (!m) return null;
  const achado = CARTOES_LOJA.find(([k]) => m[1].includes(k));
  return achado ? achado[1] : (/\bda loja\b|\bdela\b/.test(seg) ? 'loja' : null);
};

function lerDetalhes(seg) {
  const d = {};
  let m;
  // "cartão amazon 10%", "10% no cartão do mercado pago", "cartão da loja dá 5%"
  if (/\bcartao\b/.test(seg) && (m = seg.match(new RegExp(`cartao[a-z ]{0,30}?${PCT}|${PCT}[a-z ]{0,20}?(?:no|com o) cartao`)))) d.cartaoPct = pct(m[1] || m[2]);
  if ((m = seg.match(new RegExp(`cupom[a-z ]{0,12}?${PCT}`)))) d.cupomPct = pct(m[1]);
  else if ((m = seg.match(new RegExp(`cupom (?:de |da |do )?(?:r\$ ?)?${NUM}`)))) d.cupomCents = valor(m[1]);
  if (/cashback/.test(seg) && (m = seg.match(new RegExp(`cashback[a-z ]{0,12}?${PCT}|${PCT}[a-z ]{0,12}?cashback`)))) d.cashbackPct = pct(m[1] || m[2]);
  if (/frete (e )?(gratis|gratuito|zero|de graca)|sem frete/.test(seg)) d.freteCents = 0;
  else if ((m = seg.match(new RegExp(`frete (?:de |e |fica |custa |sai )?(?:r\\$ ?)?${NUM}`)))) d.freteCents = valor(m[1]);
  if ((m = seg.match(new RegExp(`(?:pix|a vista|boleto)[a-z ]{0,20}?${PCT}|${PCT}[a-z ]{0,20}?(?:no pix|a vista|no boleto)`)))) d.pixPct = pct(m[1] || m[2]);
  else if ((m = seg.match(new RegExp(`(?:no pix|a vista|no boleto)(?: sai| fica| por| custa)? (?:r\\$ ?)?${NUM}`)))) d.vistaCents = valor(m[1]);
  if ((m = seg.match(new RegExp(`(\\d{1,2}) ?(?:x|vezes)(?: de (?:r\\$ ?)?${NUM})?( sem juros)?`)))) {
    d.parcelas = Number(m[1]);
    if (m[2]) d.parcelaCents = valor(m[2]);
    if (m[3]) d.semJuros = true;
  }
  // parcelamento sem os detalhes (JF, 13/11): "parcelado", "com juros", "sem juros" soltos → ele pergunta o que falta
  if (/\bsem juros\b/.test(seg)) d.semJuros = true;
  if (/\bcom juros\b/.test(seg)) d.comJuros = true;
  if (!d.parcelas && /\b(parcelad[oa]|parcelar|parcelando|em parcelas|a prazo|no credito parcelado)\b/.test(seg)) d.parcelado = true;
  return d;
}

/** Tira do pedaço os números que não são o preço (frete, parcelas, porcentagens) e devolve o preço. */
function precoDe(seg) {
  const limpo = seg
    .replace(new RegExp(`frete (?:de |e |fica |custa |sai )?(?:r\\$ ?)?${NUM}`, 'g'), ' ')
    .replace(new RegExp(`(\\d{1,2}) ?(?:x|vezes)(?: de (?:r\\$ ?)?${NUM})?`, 'g'), ' ')
    .replace(new RegExp(`cupom (?:de |da |do )?(?:r\\$ ?)?${NUM}`, 'g'), ' ')
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
  const segs = t.split(/\s*;\s*|,(?!\d)\s*|\s+(?:e|ou|mas|ja)\s+(?=(?:na |no |em |pela |pelo )?[a-z0-9])/).filter(Boolean);
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
  // "amazon 10x de 380 e frete 50": o frete vale pra loja de antes. Se só uma loja tem dúvida de parcela,
  // um "sim, sem juros" solto é a resposta dela (JF, 13/11)
  const comDuvida = novas.filter(o => (o.parcelas > 1 && !o.parcelaCents && !o.semJuros) || (o.parcelado && !o.parcelas));
  let anterior = comDuvida.length === 1 ? comDuvida[0] : null;
  for (const seg of t.split(/\s*;\s*|,(?!\d)\s*|\s+e\s+(?=(?:na |no |a |o )?[a-z0-9])/)) {
    // "cartão do mercado pago 10%" vale pro Mercado Livre, mesmo sem falar o nome da loja
    const doCartao = /\bcartao\b/.test(seg) ? lojaDoCartao(seg) : null;
    const loja = achaLoja(seg.replace(/cartao (?:da |do )?[a-z ]{3,20}?(?= \d| com| de| tem| porcento|$)/, ' ')) || (doCartao && doCartao !== 'loja' ? doCartao : null);
    // loja nova com preço ("e na magalu tá 3.300") entra na comparação
    if (loja && !novas.some(o => o.loja === loja)) {
      const preco = precoDe(seg);
      if (preco) { novas.push({ loja, precoCents: preco, ...lerDetalhes(seg) }); anterior = novas[novas.length - 1]; mexeu = true; continue; }
    }
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
    // cupom vale em cima do preço; depois vem o jeito de pagar
    const cupom = o.cupomPct ? o.precoCents * o.cupomPct / 100 : (o.cupomCents || 0);
    const base = Math.max(0, o.precoCents - cupom);
    const vista = (o.vistaCents != null ? o.vistaCents - cupom : (o.pixPct ? base * (1 - o.pixPct / 100) : base)) + frete;
    const noCartaoLoja = o.cartaoPct ? base * (1 - o.cartaoPct / 100) + frete : null;
    let parcelado = null;
    if (o.parcelas > 1) parcelado = (o.parcelaCents ? o.parcelaCents * o.parcelas : base) + frete;
    const jurosCents = parcelado != null ? Math.max(0, parcelado - (base + frete)) : 0;
    const opcoes = [['a_vista', vista], ['cartao_loja', noCartaoLoja]].filter(([, v]) => v != null);
    const [jeito, custo] = opcoes.sort((a, b) => a[1] - b[1])[0];
    const cashback = o.cashbackPct ? base * o.cashbackPct / 100 : 0;
    return { ...o, vistaCents: Math.round(vista), cartaoLojaCents: noCartaoLoja != null ? Math.round(noCartaoLoja) : null,
      parceladoCents: parcelado != null ? Math.round(parcelado) : null, jurosCents: Math.round(jurosCents), cupomOffCents: Math.round(cupom),
      cashbackCents: Math.round(cashback), jeito, custoCents: Math.round(custo) };
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
    temPagamento: ofertas.some(o => o.freteCents != null || o.pixPct || o.vistaCents || o.parcelas || o.cartaoPct || o.cupomPct || o.cupomCents || o.parcelado || o.semJuros || o.comJuros) };
}

/** O texto da análise, pronto pra fala do C.A.O.S. */
export function textoOfertas(a, produto) {
  const doQue = produto ? ` d${/a$/.test(produto) ? 'a' : 'o'} ${produto}` : '';
  const partes = [`Comparei ${a.linhas.length} ofertas${doQue}:`];
  a.linhas.forEach((l, i) => {
    const extras = [];
    if (l.freteCents) extras.push(`com frete de ${BRL(l.freteCents)}`);
    if (l.freteCents === 0) extras.push('frete grátis');
    if (l.cupomOffCents) extras.push(`cupom de ${BRL(l.cupomOffCents)}`);
    if (l.pixPct) extras.push(`${fmtPct(l.pixPct)} de desconto à vista`);
    if (l.cartaoPct) extras.push(`${fmtPct(l.cartaoPct)} no cartão da loja${l.jeito === 'cartao_loja' ? ' (o melhor jeito aqui)' : ''}`);
    if (l.cashbackCents) extras.push(`${BRL(l.cashbackCents)} de cashback`);
    if (l.parcelas > 1) extras.push(l.jurosCents ? `${l.parcelas}x de ${BRL(l.parceladoCents / l.parcelas)} = ${BRL(l.parceladoCents)}, sendo ${BRL(l.jurosCents)} de juros`
      : l.semJuros || l.parcelaCents ? `${l.parcelas}x sem juros` : `${l.parcelas}x, juros a confirmar`);
    else if (l.parcelado) extras.push('parcelado, falta saber em quantas vezes');
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
  // Pix com desconto x parcelado sem juros na mesma loja: quanto custa a comodidade de parcelar
  for (const l of a.linhas) {
    if (l.parcelas > 1 && l.semJuros && !l.jurosCents && (l.pixPct || l.vistaCents != null) && l.vistaCents < l.precoCents + (l.freteCents || 0)) {
      const dif = l.precoCents + (l.freteCents || 0) - l.vistaCents;
      partes.push(`${cap(art(l.loja, 'no'))}: à vista sai ${BRL(dif)} mais barato; em ${l.parcelas}x sem juros você paga o preço cheio, mas sem tirar tudo de uma vez. Se o dinheiro já está guardado, o desconto do Pix ganha; se não está, sem juros não te cobra nada a mais.`);
    }
  }
  const duvidas = duvidasDeParcela(a.linhas);
  if (duvidas.length) partes.push(duvidas.join(' '));
  else if (!a.temPagamento) partes.push(perguntasDeCompra(a.linhas.map(l => l.loja)));
  else if (!duvidas.length) partes.push('Quer ver se cabe no mês? No Mês tem o "E se eu comprar?".');
  return partes.join(' ');
}

/**
 * As perguntas de quem entende de compra (JF, 13/11): já olhou em outra loja? Tem cupom? Desconto no cartão da loja?
 * No cartão você paga quanto? Promoção muda toda hora: ele pergunta, não afirma.
 */
export function perguntasDeCompra(lojas = []) {
  const outras = ['Magalu', 'Casas Bahia', 'Mercado Livre', 'Amazon', 'KaBuM!'].filter(l => !lojas.includes(l)).slice(0, 2);
  const cartoes = [];
  if (lojas.includes('Amazon')) cartoes.push('a Amazon com o cartão Amazon');
  if (lojas.includes('Mercado Livre')) cartoes.push('o Mercado Livre com o cartão Mercado Pago');
  if (lojas.includes('Magalu')) cartoes.push('a Magalu com o cartão Magalu');
  const q = ['Antes de fechar, me conta: como você vai pagar (Pix, à vista no cartão ou parcelado)?'];
  if (lojas.length < 3 && outras.length) q.push(`Já olhou ${outras.length > 1 ? `na ${outras[0]} ou na ${outras[1]}` : `na ${outras[0]}`}?`);
  q.push('Tem cupom ou cashback?');
  q.push(cartoes.length
    ? `Às vezes a loja dá desconto no cartão dela, tipo ${cartoes.join(' e ')}: você tem algum?`
    : 'Às vezes a loja dá desconto no cartão dela: você tem o cartão de alguma?');
  q.push('Me responde do jeito que for, tipo "amazon 10x sem juros", "mercado livre 5% no pix", "cartão amazon 10%", "cupom 50" ou "shopee frete 80". Ou manda o print da oferta.');
  return q.join(' ');
}

/** "Achei essa geladeira por 3.500 no mercado livre, tá bom?": uma loja só. Guarda e pergunta o resto. */
export function lerOfertaUnica(t) {
  if (!/\b(oferta|promocao|preco|ta bom|esta bom|vale a pena|compensa|achei|encontrei|vi|ta por|esta por|custa|custando|caro|barato)\b/.test(t)) return null;
  const loja = achaLoja(t);
  const preco = loja ? precoDe(t) : null;
  return loja && preco ? { produto: produtoDe(t), ofertas: [{ loja, precoCents: preco, ...lerDetalhes(t) }] } : null;
}

export function textoOfertaUnica(o, produto) {
  const doQue = produto ? ` ${/a$/.test(produto) ? 'da' : 'do'} ${produto}` : '';
  return `Anotei: ${art(o.loja)}${doQue} por ${BRL(o.precoCents)}. Pra saber se tá bom mesmo, eu preciso comparar. ${perguntasDeCompra([o.loja])}`;
}

/** O que a IA leu de um print vira a mesma frase que a pessoa escreveria (o cérebro é um só). */
export function fraseDoPrint(lido) {
  const reais = c => (c / 100).toFixed(2).replace('.', ',');
  const partes = (lido?.ofertas || []).filter(o => o && o.loja && o.preco_centavos > 0).slice(0, 6).map(o => {
    let f = `${reais(o.preco_centavos)} na ${String(o.loja).toLowerCase().slice(0, 30)}`;
    if (o.parcelas > 1) f += ` ${o.parcelas}x${o.parcela_centavos > 0 ? ` de ${reais(o.parcela_centavos)}` : ''}${o.sem_juros ? ' sem juros' : ''}`;
    if (o.frete_centavos === 0 && o.frete_gratis) f += ' frete gratis';
    else if (o.frete_centavos > 0) f += ` frete ${reais(o.frete_centavos)}`;
    if (o.desconto_pix_pct > 0) f += ` ${o.desconto_pix_pct}% no pix`;
    return f;
  });
  if (!partes.length) return null;
  const produto = lido.produto ? `oferta de ${String(lido.produto).toLowerCase().slice(0, 40)}: ` : 'oferta: ';
  return produto + partes.join(', ');
}

/** "Li no print: Amazon, R$ 3.400,00, 10x de R$ 340,00 sem juros, frete grátis." (o que a pessoa vê) */
export function resumoDoPrint(lido) {
  const lista = (lido?.ofertas || []).filter(o => o && o.loja && o.preco_centavos > 0).slice(0, 6).map(o => {
    const p = [`${o.loja}, ${BRL(o.preco_centavos)}`];
    if (o.parcelas > 1) p.push(`${o.parcelas}x${o.parcela_centavos > 0 ? ` de ${BRL(o.parcela_centavos)}` : ''}${o.sem_juros ? ' sem juros' : ''}`);
    if (o.frete_gratis) p.push('frete grátis'); else if (o.frete_centavos > 0) p.push(`frete ${BRL(o.frete_centavos)}`);
    if (o.desconto_pix_pct > 0) p.push(`${fmtPct(o.desconto_pix_pct)} no Pix`);
    return p.join(', ');
  });
  return lista.length ? `Li no print${lido.produto ? ` (${lido.produto})` : ''}: ${lista.join('; ')}.` : null;
}

/**
 * O que falta saber do parcelado (JF, 13/11): "é sem juros? até quantas vezes? se tiver juros, quanto é a parcela?".
 * Sem isso, ele não chuta: pergunta.
 */
export function duvidasDeParcela(linhas) {
  const q = [];
  for (const l of linhas) {
    const loja = art(l.loja, 'no');
    if (l.parcelado && !l.parcelas) q.push(`${cap(loja)}, parcela em até quantas vezes sem juros? E com juros, quanto fica cada parcela?`);
    else if (l.parcelas > 1 && !l.parcelaCents && !l.semJuros) {
      q.push(l.comJuros
        ? `${cap(loja)}, com juros: quanto fica cada parcela das ${l.parcelas}x? Com esse número eu mostro quanto é só de juros.`
        : `${cap(loja)}, essas ${l.parcelas}x são sem juros? Se tiver juros, me diz o valor de cada parcela (tipo "${l.parcelas}x de 380").`);
    }
  }
  if (q.length) q.push('Responde do seu jeito, tipo "amazon 10x sem juros" ou "mercado livre 12x de 320".');
  return q;
}
