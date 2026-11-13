// Conversa com o C.A.O.S. (offline, sem IA): entende a pergunta por palavras-chave e responde com os números
// do motor. Só leitura: quando a pessoa pede um registro ("gastei 30 no mercado"), ele devolve uma PROPOSTA
// ({ acao }) e quem grava é o app, depois do Confirmar (1ª lei).

import {
  formatBRL, parseAmount, periodRange, ofensiva, aReceber, comReforco, sumInRange, topCategories, summarizeMonth, forecastMonth,
  incomeIn, monthKey, shiftMonth, monthLabel, accountBalance, accountLabel, totalBalance, analyze,
  spentIn, toISODate, INCOME_SOURCES, idadeDe, faixaEtaria, situacaoCompromissos, analisarPlanejamento, cabeNoMes, sugerirCategoria, palavrasDe, faturaDoCartao, progressoMeta, resumoInvestimentos,
} from '../engine.js';
import { IDENTIDADE, textoPodeNaoPode, textoVida, textoComoFunciona, textoPrivacidade } from './identidade.js';
import { acharTermo, ATUALIZADO_EM, GLOSSARIO } from './glossario.js';
import { lerPorcentagem, textoPorcentagem, lerOfertas, analisarOfertas, textoOfertas, lerOfertaUnica, textoOfertaUnica } from './ofertas.js';

const GLOSSARIO_POR_TERMO = new Map(GLOSSARIO.map(g => [g.termo, g]));
import { textoTendencia, quandoFoi, mercadoVelho } from '../mercado.js';

const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\bc\.\s?a\.\s?o\.\s?s\b\.?/g, 'caos') // "C.A.O.S." = "caos"
  .replace(/%/g, ' porcento ') // "1%" vira "1 porcento" (a calculadora de juros precisa)
  .replace(/[^\w\s,.$-]/g, ' ').replace(/\s+/g, ' ').trim();

// Palavras que levam a cada categoria (além do próprio nome dela)
const SINONIMOS = {
  mercado: ['mercado', 'supermercado', 'feira', 'acougue', 'padaria', 'hortifruti', 'atacadao', 'compras do mes'],
  delivery: ['delivery', 'ifood', 'i food', 'rappi', 'pedido de comida', 'pedi comida', 'lanche em casa'],
  restaurante: ['restaurante', 'almoco', 'jantar', 'lanche', 'lanchonete', 'bar', 'cafe', 'pizzaria', 'hamburguer'],
  transporte: ['transporte', 'uber', '99', 'onibus', 'metro', 'gasolina', 'combustivel', 'estacionamento', 'pedagio', 'taxi', 'carro', 'posto', 'etanol', 'alcool', 'diesel'],
  moradia: ['moradia', 'aluguel', 'condominio', 'iptu', 'casa'],
  contas: ['contas', 'conta de luz', 'luz', 'agua', 'internet', 'celular', 'telefone', 'gas', 'energia', 'boleto'],
  saude: ['saude', 'farmacia', 'remedio', 'medico', 'consulta', 'exame', 'dentista', 'plano de saude', 'academia'],
  lazer: ['lazer', 'cinema', 'jogo', 'game', 'show', 'festa', 'viagem', 'passeio'],
  // Streaming (06/11, pedido do JF): fica explícito, separado de Lazer e de Contas
  streaming: ['streaming', 'netflix', 'mercado play', 'disney', 'disney plus', 'hbo', 'hbo max', 'max', 'paramount',
    'paramount plus', 'prime video', 'amazon prime', 'globoplay', 'apple tv', 'crunchyroll', 'spotify', 'deezer',
    'youtube premium', 'star plus', 'telecine', 'assinatura de filme'],
  compras: ['compras', 'roupa', 'tenis', 'sapato', 'shopping', 'presente', 'eletronico', 'loja', 'shopee', 'amazon', 'mercado livre', 'shein', 'aliexpress'],
  outros: ['outros', 'outro', 'diversos'],
};

const FONTES = {
  salario: ['salario', 'pagamento', 'holerite', 'vale'],
  freela: ['freela', 'freelance', 'bico', 'extra', 'servico', 'trampo'],
  rendimento: ['rendimento', 'rendimentos', 'juros', 'dividendo', 'dividendos', 'investimento', 'cdb', 'poupanca', 'tesouro'],
  presente: ['presente', 'pix', 'me deu', 'ganhei', 'mesada'],
  outros: ['outros', 'outro'],
};

function acharCategoria(t, categorias) {
  let melhor = null;
  for (const c of categorias) {
    const chaves = [norm(c.name), ...(SINONIMOS[c.id] || [])];
    for (const k of chaves) {
      if (k && new RegExp(`(^|\\s)${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(t)) {
        if (!melhor || k.length > melhor.k.length) melhor = { c, k };
      }
    }
  }
  return melhor ? melhor.c : null;
}

function acharFonte(t) {
  for (const [id, chaves] of Object.entries(FONTES)) if (chaves.some(k => t.includes(k))) return id;
  return null;
}

function acharPeriodo(t) {
  if (/\bhoje\b/.test(t)) return 'hoje';
  if (/\bontem\b/.test(t)) return 'ontem';
  if (/mes passado|ultimo mes|mes anterior/.test(t)) return 'mes_passado';
  if (/semana|7 dias|sete dias/.test(t)) return 'semana';
  if (/\bano\b/.test(t)) return 'ano';
  return 'mes';
}

// ---------- Professor de finanças: calculadoras (13/11) ----------

/** "juros compostos de 1000 a 1% por 12 meses" → { tipo, valor, taxa (fração ao mês), meses }. */
export function lerCalculoJuros(texto) {
  const t = String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const PCT = '(?:%|porcento|por cento)';
  const temPct = new RegExp(`\\d\\s*${PCT}`).test(t);
  const tipo = /juros? compost/.test(t) ? 'compostos' : /juros? simples/.test(t) ? 'simples' : /(quanto (rende|renderia|vai render|fica)|se eu (guardar|investir|aplicar))/.test(t) && temPct ? 'compostos' : null;
  if (!tipo) return null;
  const taxa = t.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${PCT}\\s*(ao|a|por)?\\s*(mes|ano|a\\.?m\\.?|a\\.?a\\.?)?`));
  const prazo = t.match(/(\d+)\s*(meses|mes|anos|ano)\b/);
  const semTaxa = t.replace(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${PCT}`, 'g'), ' ').replace(/(\d+)\s*(meses|mes|anos|ano)\b/g, ' ');
  const valor = acharValor(semTaxa);
  if (!taxa || !prazo || !valor) return { tipo, faltando: true };
  let i = Number(taxa[1].replace(',', '.')) / 100;
  const anual = /ano|a\.?a/.test(taxa[3] || '');
  let meses = Number(prazo[1]) * (/ano/.test(prazo[2]) ? 12 : 1);
  // taxa ao ano: no composto vira a mensal equivalente; no simples, divide por 12
  const iSimples = anual ? i / 12 : i;
  const iComposto = anual ? Math.pow(1 + i, 1 / 12) - 1 : i;
  if (meses > 600 || i > 1) return { tipo, faltando: true };
  return { tipo, valor, taxa: tipo === 'simples' ? iSimples : iComposto, taxaSimples: iSimples, meses, taxaTexto: `${taxa[1]}% ${anual ? 'ao ano' : 'ao mês'}` };
}

/** Juros: valor final e quanto foi de juros (centavos). */
export function calcularJuros({ tipo, valor, taxa, meses }) {
  const final = tipo === 'simples' ? valor * (1 + taxa * meses) : valor * Math.pow(1 + taxa, meses);
  return { finalCents: Math.round(final), jurosCents: Math.round(final - valor) };
}

/** "parcelar 3000 em 10x de 330" ou "3000 a vista ou 10x de 330" → { vista, n, parcela }. */
export function lerParcelamento(t) {
  const n = t.match(/(\d{1,2})\s*x|em (\d{1,2}) (vezes|parcelas)/);
  const parcela = t.match(/(?:x|vezes|parcelas) de (?:r\$\s?)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  const resto = t.replace(/(\d{1,2})\s*x(?: de (?:r\$\s?)?\d+(?:[.,]\d{1,2})?)?/g, ' ').replace(/em \d{1,2} (vezes|parcelas)(?: de (?:r\$\s?)?\d{1,3}(?:\.\d{3})*(?:[.,]\d{1,2})?)?/g, ' ');
  const vista = acharValor(resto);
  return { vista: vista || null, n: n ? Number(n[1] || n[2]) : null, parcela: parcela ? parseAmount(parcela[1]) : null };
}

/** Data de um lançamento atrasado: "ontem", "anteontem", "dia 10" (do mês atual, ou do anterior se ainda não chegou). */
export function dataDoTexto(t, today) {
  const menos = n => { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() - n); return toISODate(d); };
  if (/\banteontem\b/.test(t)) return menos(2);
  if (/\bontem\b/.test(t)) return menos(1);
  const m = t.match(/\bdia (\d{1,2})\b/);
  if (m) {
    const dia = Number(m[1]);
    const mes = Number(today.slice(8, 10)) >= dia ? today.slice(0, 7) : shiftMonth(today.slice(0, 7), -1);
    const ultimo = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate();
    // "dia 31" num mês de 30 dias: último dia do mês (achado do Gemini), em vez de cair calado em hoje
    if (dia >= 1 && dia <= 31) return `${mes}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`;
  }
  return today;
}

function avisoDaData(data, today) {
  if (data === today) return null;
  return `Vou anotar com a data de ${Number(data.slice(8, 10))}/${Number(data.slice(5, 7))}.`;
}

function acharValor(t) {
  const m = t.match(/(?:r\$\s?)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(reais|real|conto|pila|r\$)?/);
  return m ? parseAmount(m[1]) : null;
}

// ---------- Cérebro que interpreta (1.6.0) ----------
// Erro de digitação: palavra parecida com uma do vocabulário dele vira a palavra certa ("qunto gastie" → "quanto gastei").
const VOCAB = [
  'quanto', 'quando', 'gastei', 'gastou', 'gastos', 'gasto', 'gastar', 'paguei', 'despesa', 'despesas', 'mercado',
  'supermercado', 'delivery', 'restaurante', 'transporte', 'moradia', 'contas', 'saude', 'lazer', 'compras', 'outros',
  'saldo', 'orcamento', 'limite', 'entrada', 'entradas', 'salario', 'rendimento', 'rendimentos', 'recebi', 'planejado',
  'planejei', 'planejamento', 'programado', 'compromisso', 'compromissos', 'vencimento', 'previsao', 'alerta', 'alertas',
  'guardado', 'poupado', 'banco', 'bancos', 'semana', 'passado', 'anterior', 'comparar', 'media', 'maior', 'piada',
  'ajuda', 'obrigado', 'cotacao', 'dolar', 'bitcoin', 'investir', 'pagar', 'farmacia', 'gasolina', 'aluguel', 'internet',
  'padaria', 'cinema', 'presente', 'sobrou', 'situacao', 'resumo', 'categoria', 'gastando', 'ontem', 'hoje', 'mes',
];
// Palavras comuns que NÃO são erro (não corrigir pra parecida: "conta" ≠ "contas", "comprar" ≠ "compras").
const CONHECIDAS = [
  'ofensiva', 'foguinho', 'seguidos', 'seguida', 'sequencia', 'receber', 'devem', 'deve', 'rachei', 'rachar', 'rachada', 'rachadinha', 'dividi', 'dividir',
  'conta', 'comprar', 'compra', 'comprei', 'gasta', 'gastas', 'pago', 'paga', 'pagou', 'mais', 'menos', 'tenho', 'temos',
  'posso', 'pode', 'mesmo', 'sobre', 'meus', 'minha', 'minhas', 'quero', 'queria', 'falar', 'fala', 'coisa', 'coisas',
  'tudo', 'isso', 'esse', 'essa', 'este', 'esta', 'para', 'pela', 'pelo', 'dele', 'dela', 'voce', 'ainda', 'ganhei',
  'total', 'cabe', 'qual', 'quais', 'onde', 'como', 'vale', 'valeu', 'carro', 'casa', 'loja', 'festa', 'dinheiro',
  'comida', 'conto', 'reais', 'real', 'preciso', 'sabe', 'saber', 'cartao', 'fatura', 'poupar', 'guardar', 'dica',
  'dicas', 'algo', 'alguma', 'algum', 'muito', 'pouco', 'agora', 'depois', 'antes', 'sempre', 'nunca', 'tambem',
  'obrigada', 'brigado', 'certo', 'errado', 'legal', 'bom', 'boa', 'noite', 'tarde', 'manha', 'cade', 'quem', 'porque',
  'pois', 'entao', 'assim', 'aqui', 'juros', 'renda', 'banca', 'passa', 'passei', 'gastamos', 'ganho', 'ganha', 'mesada',
  'lanche', 'pizza', 'mercados', 'plano', 'planos', 'planejar', 'pagamento', 'pagamentos', 'gastando', 'gostei',
  'sobra', 'sobrar', 'falta', 'faltam', 'planejo', 'anotar', 'lancar', 'quero', 'investido', 'investida', 'investidos',
  'investimento', 'investimentos', 'aplicado', 'aplicacao', 'aplicacoes', 'rendeu', 'renderam', 'semanas', 'meses', 'dias', 'ano', 'anos', 'contar', 'contei', 'conte',
];
const VOCAB_SET = new Set([...VOCAB, ...CONHECIDAS]);

/** Distância de edição com troca de letras vizinhas contando 1 ("gastie" ~ "gastei"). */
function distancia(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

export function corrigirDigitacao(t, extras = []) {
  const vocab = [...VOCAB, ...extras];
  return String(t).split(' ').map(w => {
    if (w.length < 4 || VOCAB_SET.has(w) || extras.includes(w) || /\d/.test(w)) return w;
    const max = w.length >= 8 ? 2 : 1;
    let melhor = null;
    for (const v of vocab) {
      if (Math.abs(v.length - w.length) > max || v[0] !== w[0]) continue; // primeira letra quase nunca erra
      const dd = distancia(w, v, max);
      if (dd <= max && (!melhor || dd < melhor.d)) melhor = { v, d: dd };
    }
    return melhor ? melhor.v : w;
  }).join(' ');
}

// Continuação da conversa ("e no mês passado?", "e em delivery?") reaproveita a última pergunta.
const REUSAVEIS = new Set(['gasto_total', 'maior_gasto', 'entradas', 'media', 'orcamento', 'saldo', 'previsao', 'comparar']);
const mencionaPeriodo = t => /\b(hoje|ontem|semana|7 dias|sete dias|ano|mes passado|ultimo mes|mes anterior|este mes|esse mes|neste mes|nesse mes)\b/.test(t);

// Melhor palpite quando não dá pra ter certeza: a intenção com mais pistas na frase.
const PISTAS = {
  gasto_total: ['gast', 'despes', 'paguei', 'saiu'],
  saldo: ['saldo', 'banco', 'guard', 'poup', 'conta'],
  entradas: ['recebi', 'salario', 'entrada', 'renda', 'rendiment'],
  planos: ['plane', 'program', 'comprar'],
  pagar: ['pagar', 'venc', 'boleto', 'fatura'],
  orcamento: ['limite', 'orcament', 'sobr'],
  alertas: ['alerta', 'situac', 'resumo', 'problema'],
  maior_gasto: ['maior', 'mais'],
  previsao: ['previs', 'fim do mes', 'ritmo'],
};

function palpite(t) {
  let melhor = null;
  for (const [intent, pistas] of Object.entries(PISTAS)) {
    const n = pistas.filter(p => t.includes(p)).length;
    if (n && (!melhor || n > melhor.n)) melhor = { intent, n };
  }
  return melhor?.intent || null;
}

/**
 * Descobre a intenção. Função pura e testável.
 * `anterior` = a última pergunta entendida ({ intent, categoryId, periodo }), pra continuar a conversa.
 */
// Abreviações e gírias (06/11, pedido do JF): "vc", "cê", "tbm", "q", "pq", "hj", "qnto"… viram a palavra inteira.
const GIRIAS = {
  vc: 'voce', vcs: 'voces', ce: 'voce', oce: 'voce', tb: 'tambem', tbm: 'tambem', tmb: 'tambem', q: 'que', oq: 'o que',
  pq: 'por que', pk: 'por que', ta: 'esta', tao: 'estao', to: 'estou', td: 'tudo', tds: 'todos', mt: 'muito', mto: 'muito',
  mta: 'muita', blz: 'beleza', obg: 'obrigado', vlw: 'valeu', msm: 'mesmo', hj: 'hoje', qnt: 'quanto', qto: 'quanto',
  qnto: 'quanto', qnd: 'quando', qdo: 'quando', n: 'nao', naum: 'nao', nn: 'nao', eh: 'e', dps: 'depois', agr: 'agora',
  cmg: 'comigo', ctg: 'contigo', pfv: 'por favor', pf: 'por favor', sla: 'sei la', tlgd: 'ta ligado', mn: 'mano', vdd: 'verdade',
  grana: 'dinheiro', bufunfa: 'dinheiro', din: 'dinheiro', gastano: 'gastando', torrei: 'gastei', rango: 'comida',
  // atalhos de finanças do brasileiro (sugestão do Gemini, 06/11)
  // mais gírias (JF, 13/11 à noite)
  fds: 'fim de semana', tmj: 'tamo junto', pprt: 'papo reto', mlk: 'moleque', slk: 'sei la', vey: 'veio', kkk: 'haha', kkkk: 'haha', rs: 'haha', rsrs: 'haha',
  cc: 'cartao', vr: 'restaurante', va: 'mercado', xopi: 'shopee', chopi: 'shopee', xopee: 'shopee', mercadolivre: 'mercado livre', ml: 'mercado livre',
};
export function expandirGirias(t) {
  return String(t).split(' ').map(w => GIRIAS[w] ?? w).join(' ');
}

// ---------- Palavrão (JF, 13/11 à noite: "ele tem que entender o palavrão, até abreviado, tipo KRLH") ----------
// Ele ENTENDE, mas nunca responde com palavrão. Dois casos:
//  · xingar o C.A.O.S. ("vsf caos", "você é um lixo") → resposta de xingamento (calma, sem revidar);
//  · desabafo ("krlh, gastei 500 no mercado") → tira o palavrão e entende o pedido normal; se só sobrou o palavrão,
//    ele pergunta o que houve. Assim "que merda, quanto gastei?" deixa de virar xingamento.
const PALAVROES = {
  caralho: 'caralho', krlh: 'caralho', krl: 'caralho', crl: 'caralho', crlh: 'caralho', karalho: 'caralho', caraio: 'caralho', carai: 'caralho', caramba: 'caramba', krai: 'caralho',
  porra: 'porra', poha: 'porra', pora: 'porra', prr: 'porra', porr: 'porra', merda: 'merda', mrd: 'merda', bosta: 'bosta', cacete: 'cacete', kct: 'cacete',
  pqp: 'puta que pariu', putz: 'putz', puts: 'putz', droga: 'droga', inferno: 'inferno', desgraca: 'desgraca', dsgrc: 'desgraca', mds: 'meu deus', aff: 'aff', afe: 'aff',
  foda: 'foda', fodase: 'foda-se', fdse: 'foda-se', fudeu: 'fudeu', fodeu: 'fudeu', fudido: 'fudido', lascou: 'lascou', saco: 'saco',
};
// ofensa: palavra que já é xingamento de alguém
const OFENSAS = {
  vsf: 'vai se foder', vtnc: 'vai tomar no cu', tnc: 'tomar no cu', fdp: 'filho da puta', vsfd: 'vai se foder', pnc: 'pau no cu',
  burro: 'burro', idiota: 'idiota', inutil: 'inutil', lixo: 'lixo', otario: 'otario', otaria: 'otaria', babaca: 'babaca', imbecil: 'imbecil',
  trouxa: 'trouxa', arrombado: 'arrombado', corno: 'corno', bocó: 'boco', boco: 'boco', retardado: 'retardado', estupido: 'estupido', jumento: 'jumento', anta: 'anta',
  porcaria: 'porcaria', chato: 'chato', ridiculo: 'ridiculo', palhaco: 'palhaco', escroto: 'escroto', cuzao: 'cuzao',
};
const FRASES_OFENSA = /(vai (se|te) (foder|fuder|ferrar|lascar)|vai tomar no cu|filho da puta|odeio (voce|vc|o caos)|cala (a )?boca|tomar no cu)/;
const PARA_ELE = /\b(voce|vc|tu|caos|seu|sua|te|contigo)\b/;
/** Lê palavrão e ofensa. Devolve { limpo, palavrao, ofensa }. Pura. */
export function lerPalavroes(t) {
  const palavras = t.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const temOfensa = FRASES_OFENSA.test(t) || palavras.some(w => OFENSAS[w]);
  const temPalavrao = palavras.some(w => PALAVROES[w]) || /puta que pariu|que merda|que porra/.test(t);
  // palavrão dito PRA ele ("caos de merda", "você é uma bosta") também é ofensa
  const ofensa = temOfensa || (temPalavrao && PARA_ELE.test(t) && /\b(e|eh|de|seu|sua|uma?|esse|essa)\b/.test(t) && palavras.length <= 7);
  const limpo = palavras.filter(w => !PALAVROES[w] && !OFENSAS[w]).join(' ')
    .replace(/\b(puta que pariu|que (merda|porra))\b/g, ' ').replace(/^(que|mano|meu|ai|nossa|ah|eita)( |$)/, '').replace(/\s+/g, ' ').trim();
  return { limpo, palavrao: temPalavrao || temOfensa, ofensa };
}

export function entender(texto, { categories = [], anterior = null } = {}) {
  const base = corrigirDigitacao(expandirGirias(norm(texto)), categories.map(c => norm(c.name)));
  const pv = lerPalavroes(base);
  if (pv.ofensa) return { t: base, intent: 'xingamento', palavrao: true, categoria: null, periodo: acharPeriodo(base) };
  if (pv.palavrao) {
    const r = entender(pv.limpo, { categories, anterior });
    if (!pv.limpo || (r.intent === 'nao_entendi' && !r.palpite)) return { ...r, t: base, intent: 'desabafo', palavrao: true };
    return { ...r, palavrao: true };
  }
  const r0 = entenderSimples(base, { categories });
  const t = r0.t;
  const curta = t.split(' ').length <= 6;
  const continua = anterior && REUSAVEIS.has(anterior.intent) && curta
    && (/^e\b/.test(t) || /^(e )?(no|na|em|do|da|com|de|nos|nas)\b/.test(t) || (r0.intent === 'nao_entendi' && (r0.categoria || mencionaPeriodo(t))));
  if (continua && (r0.intent === 'nao_entendi' || r0.intent === 'gasto_total' || r0.intent === anterior.intent || r0.intent === 'comparar')) {
    const categoria = r0.categoria || (mencionaPeriodo(t) ? categories.find(c => c.id === anterior.categoryId) || null : null);
    const periodo = mencionaPeriodo(t) ? r0.periodo : anterior.periodo || 'mes';
    const intent = r0.intent === 'comparar' && anterior.intent !== 'comparar' ? 'comparar' : anterior.intent;
    return { ...r0, intent, categoria, periodo, continuacao: true };
  }
  if (r0.intent === 'nao_entendi') {
    const p = palpite(t);
    if (p) return { ...r0, intent: p, palpite: true };
  }
  return r0;
}

function entenderSimples(t, { categories = [] } = {}) {
  // "dia 10" é data, não valor (P9, "esqueci de lançar": "gastei 50 no mercado dia 10")
  const r = { t, categoria: acharCategoria(t, categories), periodo: acharPeriodo(t), valor: acharValor(t.replace(/\bdia \d{1,2}\b/g, ' ')), fonte: acharFonte(t) };
  const pergunta = /\b(quanto|qual|quais|onde|como|tive|teve|tenho|vai|posso|consigo|algum|alguma)\b|\?/.test(t);

  if (!t) return { ...r, intent: 'nao_entendi' };
  // Ofertas e porcentagem (JF, 13/11): "3500 no mercado livre, 3400 na amazon e 2100 na shopee", "15% de 3500",
  // "3500 com 10% de desconto", "de 3500 por 2800". Antes do registro: preço em loja não é gasto.
  if (!/\b(gastei|paguei|comprei|torrei|recebi|ganhei)\b/.test(t)) {
    const ofertas = lerOfertas(t);
    if (ofertas) return { ...r, intent: 'comparar_ofertas', ofertas: ofertas.ofertas, produto: ofertas.produto };
    // "vou mandar o print da oferta", "compara esse print": a próxima foto é pra ler ofertas
    if (/(print|foto|imagem|tela)[a-z ]{0,20}(oferta|preco|produto|loja|anuncio)|(oferta|preco|anuncio)[a-z ]{0,15}(print|foto)|compar[a-z]* (esse|esses|o|os) (print|prints|foto|fotos)|^(mandar|vou mandar|mando) (o |um )?print$/.test(t)) return { ...r, intent: 'ofertas_print' };
    const unica = lerOfertaUnica(t);
    if (unica) return { ...r, intent: 'oferta_unica', ofertas: unica.ofertas, produto: unica.produto };
    const pct = lerPorcentagem(t);
    if (pct) return { ...r, intent: 'porcentagem', pct };
  }
  // Registro ("gastei 30 no mercado", "paguei 120 de luz", "recebi 1500 de salario")
  if (r.valor && !/\bquanto\b/.test(t)) {
    if (/\b(recebi|recebo|ganhei|ganho|entrou|caiu|recebemos|me pagaram)\b/.test(t)) return { ...r, intent: 'registrar_entrada' };
    if (/\b(gastei|paguei|comprei|torrei|saiu|pedi|abasteci|gasto de|gastamos|passei|deixei|foram|foi)\b/.test(t)) return { ...r, intent: 'registrar_gasto' };
    // Anotação curta, sem verbo, do jeito de quem anota num papel: "uber 30", "50 no posto" (achado do Gemini, 06/11)
    const curtinha = t.split(' ').length <= 5 && !pergunta && !/\b(meta|guardei|juntei|poupei|investi)\b/.test(t);
    if (curtinha && (r.categoria || descricaoDe(t) || /^[a-z]+ \d/.test(t) || /^\d+([.,]\d+)? [a-z]/.test(t))) return { ...r, intent: 'registrar_gasto' };
  }
  // "Esqueci de lançar" (P9, vistoria do JF): um sustinho de brincadeira e as perguntas pra anotar
  const ESQUECI = /\b(esqueci|esqueceu|esquecemos) de (lancar|anotar|colocar|registrar|botar|por)\b|\b(nao|n) (lancei|anotei|registrei)\b/;
  if (ESQUECI.test(t)) {
    // aproveita o que a frase já trouxe (achado do GPT, 12/11): "esqueci de lançar 50 no mercado dia 10" já vira proposta
    const resto = t.replace(/^.*?(esqueci|esqueceu|esquecemos|nao lancei|n lancei|nao anotei|nao registrei)( de (lancar|anotar|colocar|registrar|botar|por))?( um| uma| o| a)?( gasto| compra| coisa| conta)?\s*/, '').trim();
    const comoGasto = `gastei ${resto}`.trim();
    if (r.valor) return { ...r, t: comoGasto, intent: 'registrar_gasto' };
    if (r.categoria || descricaoDe(comoGasto)) return { ...r, t: comoGasto, intent: 'gasto_sem_valor' };
    return { ...r, intent: 'esqueci_de_lancar' };
  }
  // Gasto sem valor (12/11, vistoria do JF): "gastei não sei quanto de internet" → ele pergunta quanto foi
  const tSemNaoSei = t.replace(/\bnao sei (quanto|o valor|direito)\b/g, '');
  if (!r.valor && /\b(gastei|paguei|comprei|torrei|pedi|abasteci|gastamos)\b/.test(t) && !/\b(quanto|qual|quais|onde|como|quando)\b|\?/.test(tSemNaoSei)) {
    return { ...r, intent: 'gasto_sem_valor' };
  }
  // "Me explica melhor" (12/11): explicar de novo a última resposta, em passos
  if (/^(me )?(expli(ca|que)|explicar)( isso| ai| aí)?( melhor| de novo| direito| devagar| com calma)?\??$|^(nao|n) entendi( nada| isso| direito)?\??$|^como assim\??$|(pode|poderia|consegue) (me )?explicar( melhor| de novo)?|explica(r)? melhor|o que (voce|vc) quis dizer/.test(t)) {
    return { ...r, intent: 'explicar_melhor' };
  }
  // Metas (1.8.0): montar junto, ver o progresso e guardar dinheiro nelas
  if (r.valor && /\b(guardei|juntei|separei|coloquei|poupei|depositei)\b/.test(t) && /\b(meta|pr[oa]|para o|para a|no|na)\b/.test(t)) return { ...r, intent: 'meta_guardar' };
  if (/((criar|montar|nova|fazer|comecar) (uma )?meta|quero (guardar|juntar|economizar|poupar)( dinheiro)? (pra|para)|juntar dinheiro (pra|para)|me ajuda a (guardar|juntar)|quero (ter|fazer) uma reserva)/.test(t)) return { ...r, intent: 'meta_nova', metaNome: nomeDaMeta(t) };
  if (/(minhas metas|minha meta|\bmetas?\b.*(como|quanto|esta|estao|vai)|(como|quanto).*\bmetas?\b|quanto falta (pra|para) (a )?meta)/.test(t)) return { ...r, intent: 'metas' };
  // Compromissos, planos e "cabe no mês?" (1.3.0)
  if (/(qual (e )?(o )?meu nome|como (e|eh) meu nome|voce sabe (o )?meu nome|lembra (de )?mim|quem sou eu)/.test(t)) return { ...r, intent: 'meu_nome' };
  const apelido = t.match(/(?:me chama|pode me chamar|me chame) de ([a-z0-9 ]{2,30})$/);
  if (apelido) return { ...r, intent: 'mudar_apelido', apelido: apelido[1].trim() };
  // "quanto sobra do orçamento de mercado?" é orçamento, não "cabe no mês" (achado do Gemini, 06/11)
  if (/(orcamento|limite)/.test(t) && /(sobra|resta|falta|quanto (ainda )?posso)/.test(t) && !/cabe no/.test(t)) return { ...r, intent: 'orcamento' };
  if (/(cabe no (mes|meu bolso|orcamento|bolso)|da pra comprar|posso comprar|consigo comprar|tenho dinheiro pra|vai sobrar|quanto (vai )?sobra)/.test(t)) return { ...r, intent: 'cabe' };
  // "Explica o print do banco" (06/11): a pessoa manda o print e ele explica pelo servidor
  if (/(explica|explicar|nao entendi|o que (significa|quer dizer)|me ajuda a entender).*(print|tela|banco|fatura|extrato|app do banco|imagem|foto)|(print|tela) do banco/.test(t)) return { ...r, intent: 'explicar_print' };
  // Cartão de crédito (06/11): "como está meu cartão?", "quanto vem na fatura?", "quanto tenho de limite?"
  // "o que é limite do cartão?" é pergunta de glossário, não do seu cartão (revisão de 13/11 à noite)
  const perguntaDeSignificado = /^(o que (e|sao|significa|quer dizer)|me explica|explica|me ensina)\b/.test(t) && acharTermo(t);
  if (!perguntaDeSignificado && /(cartao|fatura|limite (do|no) cartao)/.test(t) && !/\b(como|onde|quero|preciso|queria)\b.*\b(cadastr|adicion|registr|coloc|ponho|crio|criar)/.test(t)) return { ...r, intent: 'cartao' };
  if (/((o que|quanto) (eu )?(ainda )?tenho (pra|para|de) pagar|falta pagar|contas? (do|deste|desse) mes|vencimento|quando vence|o que vence|tenho conta|compromissos?|minhas contas fixas|assinaturas)/.test(t)) return { ...r, intent: 'pagar' };
  const querFazer = /\b(quero|preciso|queria|gostaria de) (anotar|lancar|registrar|adicionar|cadastrar|colocar|planejar|fazer|ligar|instalar|mandar)\b/.test(t);
  if (!/^como\b/.test(t) && !querFazer && /(o que (eu )?planejei|meus planos|planejamento|planos? (do|deste|desse|pro|para o) mes|o que (eu )?vou comprar|planejad|programad|o que (mais )?(eu )?tenho (pra|para) (esse|este|o) mes|o que mais (eu )?(tenho|vou))/.test(t)) return { ...r, intent: 'planos' };
  // Ofensiva (07/11): "quantos dias seguidos?", "minha ofensiva", "meu foguinho"
  if (/(ofensiva|foguinho|dias seguidos|dias em sequencia|sequencia de dias|streak)/.test(t) && !r.valor) return { ...r, intent: 'ofensiva' };
  // Rachadinha (07/11): "quem me deve?", "quanto tenho a receber?", "quanto me devem?"
  if (/(quem (me|ta me|esta me) dev|quanto (me )?devem|me deve[mn]?\b|(tenho|falta|faltam) (a|pra|para) receber|a receber\b|rachadinha|conta rachada|quem (nao )?(me )?pagou)/.test(t) && !r.valor) return { ...r, intent: 'a_receber' };
  if (/(quanto (eu )?(tenho )?investido|meus investimentos|minha carteira de investimento|quanto (meus investimentos|meu investimento) (rende|rendeu|renderam)|como (estao|esta) (meus|o meu|os meus) investimentos?)/.test(t)) return { ...r, intent: 'meus_investimentos' };
  // Saldo (06/11): "quanto eu tenho guardado no total?", "quanto tem nas contas?", "quanto poupei?"
  if (!/(pra|para) (pagar|gastar)/.test(t) && /(\bsaldo\b|quanto (eu )?(tenho|tem|ainda tenho|sobrou)\b(?! (pra|para|de) )|tenho guardado|guardad[oa]s?\b|poupad[oa]s?\b|quanto (eu )?(guardei|poupei|juntei)|dinheiro (no|na|nos|nas) (banco|conta)|tenho no banco|nas contas|no total)/.test(t)
    && !/(gast|entrada|recebi|rendimento|planej)/.test(t)) return { ...r, intent: 'saldo' };
  // Mercado (1.3.0): moedas, bolsa, juros e "vale investir?"
  // Professor de finanças (13/11): calculadoras e glossário offline (70 termos), antes de "entradas" (que pega "juros")
  const calc = lerCalculoJuros(t);
  // "o que é juros compostos?" é pergunta de glossário; conta só com números ou pedido de cálculo
  if (calc && (!calc.faltando || /(calcul|faz a conta|faca a conta|simul|quanto (rende|renderia|fica|vira))/.test(t))) return { ...r, intent: 'calc_juros', calc };
  if (/(vale a pena parcelar|parcelar ou (pagar )?(a vista)|a vista ou parcelad|compensa parcelar|devo parcelar|melhor parcelar)/.test(t)) return { ...r, intent: 'vale_parcelar', parc: lerParcelamento(t) };
  // Limite garantido (JF, 13/11 à noite): "quais bancos aumentam o limite se eu investir?"
  if (!/^(o que (e|sao|significa)|me explica|explica)\b/.test(t) && /(limite garantido|cdb (mais )?limite|limite (com|por) (garantia|investimento)|cdb cartao)/.test(t)
    || (/limite/.test(t) && /(invest|aplica|guard|cdb|cofrinho|caixinha|poupanca)/.test(t) && /(aumenta|aumentar|ganh|liber|vira|transforma|banco|quais|como)/.test(t))) {
    return { ...r, intent: 'limite_investido' };
  }
  const termo = acharTermo(t);
  const contexto = t.match(/\b(meu|minha) (pai|mae|chefe|amigo|amiga|irmao|irma|avo|tio|tia|namorad[oa]|esposa|marido|professor[a]?|colega)\b.*\b(falou|disse|comentou|mencionou|falaram)\b/);
  if (termo && (contexto || /(o que (e|sao|significa|quer dizer)|\bque (e|sao)\b|me explica|explica|me ensina|como funciona|ouvi falar|vi falar|nunca entendi|nao entendo|nao sei o que)/.test(t))) {
    return { ...r, intent: 'glossario', termo, quem: contexto ? contexto[2] : null };
  }
  const ativo = /\b(dolar|dolares|usd)\b/.test(t) ? 'USD' : /\beuros?\b/.test(t) ? 'EUR' : /\blibras?\b/.test(t) ? 'GBP'
    : /\b(bitcoin|btc)\b/.test(t) ? 'BTC' : /peso argentino/.test(t) ? 'ARS' : /\b(bolsa|ibovespa|ibov|b3|acoes)\b/.test(t) ? 'IBOV'
    : /\bselic\b/.test(t) ? 'SELIC' : /\bcdi\b/.test(t) ? 'CDI' : /\b(ipca|inflacao)\b/.test(t) ? 'IPCA' : null;
  if (/((qual|quais|que) (banco|conta|desses|dessas)[a-z ]*(rende|rendimento))|rende mais|melhor rendimento|rendimento (do|da|dos|das|de|nos|nas) (banco|bancos|conta|contas|meu|minha|nubank|picpay|inter|mercado pago|c6|itau|bradesco|caixa|santander|pagbank)|onde (eu )?(deixo|guardo|coloco) (o |meu )?dinheiro|comparar (os )?bancos/.test(t)) return { ...r, intent: 'bancos' };
  if (/(vale (a pena )?investir|devo investir|investir em|boa hora (pra|para) (comprar|investir)|compensa (comprar|investir)|tende a (subir|cair|crescer))/.test(t)) return { ...r, intent: 'investir', ativo };
  if (ativo || /(mercado financeiro|como (esta|ta) o mercado|cotacao|cotacoes|cambio|moedas)/.test(t)) return { ...r, intent: 'mercado', ativo };
  // Quem ele é (identidade): vem antes de tudo que não é registro
  if (/(o que (significa|quer dizer)|significado|sigla).*(caos|seu nome|nome)|caos significa|o que e caos|o que e o caos/.test(t)) return { ...r, intent: 'significado' };
  if (/(o que (voce )?(acha|pensa|me diz|fala) (do|de|sobre o|sobre) (jf|joao|joao fernando|tgp|seu criador|criador|seu pai)|voce gosta (do|de) (jf|seu criador)|como e o jf|fala (do|sobre o) jf|(fala|falar|falando) (mal|bem) (do|de|sobre o) (jf|seu criador|criador)|o que voce tem a dizer sobre (o jf|seu criador))/.test(t)) return { ...r, intent: 'sobre_jf' };
  // Brincadeira com o criador: "quanto ele te deve de salário?" (06/11)
  if (/((quanto|qual).*(te deve|seu salario|teu salario|voce ganha|ce ganha)|(ele|jf|criador).*(paga|deve|pagar).*(salario|voce)|seu salario|voce recebe salario)/.test(t) && !r.valor) return { ...r, intent: 'salario_caos' };
  // Memória da conversa: "e agora?", "já sabe responder essa?" voltam na última pergunta que ficou sem resposta
  if (/^(e agora|e ai|e entao|ja (sabe|consegue|saber|sabes) (responder|me responder)|ja sabe|conseguiu (responder)?|lembra (da|daquela) (minha )?pergunta)\b/.test(t)) return { ...r, intent: 'retomar' };
  if (/(quem (te |o )?(criou|fez|programou|inventou|desenvolveu|construiu)|seu criador|seu pai|seu dono|quem e (o )?jf|quem manda em voce)/.test(t)) return { ...r, intent: 'criador' };
  // a vida dele (núcleo único, 12/11): quando nasceu, aniversário, a história toda
  if (/(quando (voce |vc )?nasceu|seu aniversario|aniversario (seu|do caos)|quantos anos (voce |vc )?tem|sua historia|sua vida|conta (a )?sua historia)/.test(t)) return { ...r, intent: 'vida' };
  if (/(de onde (voce )?(veio|vem|surgiu|saiu)|sua origem|onde (voce )?nasceu|projeto perfil|veio do perfil)/.test(t)) return { ...r, intent: 'origem' };
  if (/(como voce funciona|como (e|funciona) (o )?seu cerebro|seu cerebro|sistema nervoso|sua espinha|seus bracos|voce pensa|voce sente|como voce e feito|do que voce e feito)/.test(t)) return { ...r, intent: 'como_funciona' };
  if (/(o que voce (nao )?pode|o que voce nao faz|seus limites|voce (pode|consegue) (mexer|apagar|alterar|gastar|acessar|ver)|acessa (meu|o) banco|ve minha conta|minhas regras|suas regras|suas leis)/.test(t)) return { ...r, intent: 'limites' };
  if (/(quem e voce|quem (e|eh) tu|quem es tu|o que (e|eh) voce|se apresent|apresente.se|qual (e )?(o )?seu nome|como (voce )?se chama|voce e (uma )?(ia|inteligencia|robo|humano|gente|pessoa)|^caos\??$)/.test(t)) return { ...r, intent: 'identidade' };
  if (/(piada|me faz rir|algo engracado|anedota|charada|me alegra)/.test(t)) return { ...r, intent: 'piada' };
  // Ensinar a usar o app ("como faço pra lançar um gasto?")
  const verboComo = /\b(como|onde)\b.*\b(faco|faz|fazer|coloco|colocar|cadastro|cadastrar|adiciono|adicionar|lanco|lancar|registro|registrar|anoto|anotar|crio|criar|mudo|mudar|troco|trocar|ativo|ativar|ligo|ligar|uso|usar|mando|mandar|envio|enviar|instalo|instalar|exporto|exportar|importo|importar|defino|definir|ponho|por|vejo|ver|apago|apagar|configuro|configurar|divido|dividir|racho|rachar)\b/;
  if (/(economiz|poupar|guardar dinheiro|gastar menos)/.test(t)) return { ...r, intent: 'dica' };
  if (verboComo.test(t) || querFazer || /(me ensina|tutorial|passo a passo|como usa(r)? o app|como funciona o app|como planejo)/.test(t)) {
    const TEMAS = [
      ['racha', /(divid|rach|amigos? (vao|vai) (me )?pagar|me pagar de volta)/],
      ['ofensiva', /(ofensiva|foguinho|dias seguidos|nao gastei nada)/],
      ['entrada', /(entrada|salario|rendimento|receita|recebi|ganho)/],
      ['orcamento', /(orcamento|limite|meta de gasto)/],
      ['cartao', /(cartao|fatura|credito)/],
      ['mes', /(planej|compromisso|conta fixa|assinatura|\bmes\b)/],
      ['conta', /(\bcontas?\b|banco|saldo|nubank|itau|bradesco|caixa|inter)/],
      ['foto', /(foto|comprovante|imagem|nota fiscal|recibo|print)/],
      ['lembrete', /(lembrete|notifica|avis(o|ar) diario|alarme)/],
      ['instalar', /(instal|tela inicial|celular|iphone|android)/],
      ['backup', /(backup|exportar|importar|copia|trocar de celular)/],
      ['ia', /(ia online|inteligencia|servidor|ler foto)/],
      ['humor', /(humor|voz|falar|acido|suave)/],
      ['apagar', /(apag|excluir|deletar|remover)/],
      ['gasto', /(gasto|despesa|compra|lancamento)/],
    ];
    const tema = (TEMAS.find(([, rx]) => rx.test(t)) || ['geral'])[0];
    return { ...r, intent: 'tutorial', tema };
  }
  if (/\b(ajuda|comandos|o que voce (faz|sabe)|pra que (voce )?serve|para que (voce )?serve|sua funcao|como voce (me )?ajuda|o que posso perguntar)\b/.test(t)) return { ...r, intent: 'ajuda' };
  if (/\b(obrigad|valeu|vlw|brigad|agradeco)/.test(t)) return { ...r, intent: 'agradecimento' };
  if (/\b(burro|idiota|inutil|lixo|chato|odeio voce|porcaria)\b/.test(t)) return { ...r, intent: 'xingamento' };
  if (/\b(te amo|voce e (o )?(muito )?(melhor|demais|incrivel|genial|otimo|legal|top|brabo|foda)|gosto de voce|lindo|parabens caos)\b/.test(t)) return { ...r, intent: 'elogio' };
  if (/(como voce (esta|ta)|tudo bem com voce|como (vai|ta) voce|seu humor|voce esta bem|^(e ai|eai|oi|ola|opa)?[ ,!]*(tudo|td) (bem|bom|certo|joia|tranquilo)\??$|^beleza\??$)/.test(t)) return { ...r, intent: 'como_esta' };
  if (/(meus dados|minha privacidade|privacidade|quem ve (meus|os meus)|e seguro|meus dados (estao|ficam)|pra onde vao)/.test(t)) return { ...r, intent: 'privacidade' };
  if (/\b(alerta|alertas|problema|como estou|como to|como esta (minha|a) (situacao|carteira)|situacao|resumo|radar)\b/.test(t)) return { ...r, intent: 'alertas' };
  if (/(rendimento|recebi|entrada|entradas|salario|ganhei|renda|entrou|receita|dividendo|juros)/.test(t)) return { ...r, intent: 'entradas' };
  if (/\b(saldo|quanto tenho|dinheiro na conta|na conta|nas contas|tenho no banco)\b/.test(t)) return { ...r, intent: 'saldo' };
  if (/(maior gasto|mais gastei|gastei mais|com o que (mais )?gast|onde (mais )?gast|categoria que mais|top|ranking|principal gasto)/.test(t)) return { ...r, intent: 'maior_gasto' };
  if (/(previsao|vai dar|fim do mes|ritmo|vou conseguir|chegar ao fim|projecao|aguenta|(vai|vou) fechar|fechar o mes|como (o mes|vou) (fechar|terminar))/.test(t)) return { ...r, intent: 'previsao' };
  if (/(compar|mes passado.*(gast|mais|menos)|melhor que|pior que|em relacao)/.test(t) && !/quanto gastei/.test(t)) return { ...r, intent: 'comparar' };
  if (/(orcamento|limite|quanto (ainda )?posso|quanto falta|quanto sobra|posso gastar|sobrou)/.test(t)) return { ...r, intent: 'orcamento' };
  if (/(media|por dia|diario|diaria)/.test(t)) return { ...r, intent: 'media' };
  if (/(dica|economiz|poupar|guardar dinheiro|como gastar menos|conselho|sugestao)/.test(t)) return { ...r, intent: 'dica' };
  if (/(gast|paguei|saiu|despesa|torrei)/.test(t) && pergunta) return { ...r, intent: 'gasto_total' };
  if (/^(oi|ola|e ai|eai|opa|bom dia|boa tarde|boa noite|salve|hey|alo)\b/.test(t)) return { ...r, intent: 'saudacao' };
  if (r.categoria && pergunta) return { ...r, intent: 'gasto_total' };
  return { ...r, intent: 'nao_entendi' };
}

/** "quero juntar dinheiro pra um show do Coldplay" → "Show do Coldplay" */
export function nomeDaMeta(t) {
  const m = String(t).match(/(?:pra|para)\s+(?:um|uma|o|a|os|as|meu|minha)?\s*([a-z0-9 ]{3,40})$/);
  if (!m) return null;
  const n = m[1].replace(/\s+(ate|em|no|na)\s.*$/, '').trim();
  return n ? n[0].toUpperCase() + n.slice(1) : null;
}

/** Resumo da meta que a pessoa montou (pra proposta e pra lista). */
export function textoMeta(p) {
  const prazo = p.ate ? ` até ${monthLabel(p.ate)}` : '';
  const porMes = p.porMesCents ? ` Guardando ${formatBRL(p.porMesCents)} por mês, você chega lá${prazo}.` : '';
  return `${p.nome}: ${formatBRL(p.guardadoCents)} de ${formatBRL(p.alvoCents)} (${p.pct}%), faltam ${formatBRL(p.faltaCents)}.${porMes}`;
}

const SUG_IDENTIDADE = ['O que você pode fazer?', 'Como funciona seu cérebro?', 'Conta uma piada', 'Quanto gastei este mês?'];

// Passo a passo de cada parte do app (o C.A.O.S. também instrui)
const TUTORIAL = {
  racha: 'Pra dividir uma conta: aba ➕ Lançar, digita o valor TOTAL que você pagou, escolhe a categoria e toca em "🍕 Dividir com amigos". Escreve o nome de quem vai te pagar (separado por vírgula). No orçamento entra só a sua parte, e o resto fica em "A receber" no Início. Quando o Pix cair, toca em "Recebi".',
  ofensiva: 'A ofensiva 🔥 conta os dias seguidos em que você anota no app. Lançou um gasto ou uma entrada no dia, conta. Não gastou nada? Toca em "Hoje não gastei nada" no Início, que também conta. Ficou um dia inteiro sem abrir, ela zera, mas o recorde fica guardado.',
  gasto: 'Pra anotar um gasto: aba ➕ Lançar, deixa em 💸 Gasto, digita o valor, escolhe a categoria e toca em Adicionar. Ou me fala aqui: "gastei 30 no mercado", que eu preparo e você confirma.',
  entrada: 'Pra anotar uma entrada: aba ➕ Lançar, toca em 💰 Entrada, digita o valor, escolhe de onde veio (salário, freela, rendimentos…) e toca em Adicionar. Ou me fala: "recebi 1500 de salário".',
  orcamento: 'Pra pôr orçamento: ⚙️ Ajustes (engrenagem no alto do Início) → Orçamentos, e coloca o limite do mês em cada categoria. Deixa vazio onde não quiser limite. Aí eu aviso em 80% e quando estourar.',
  conta: 'Pra adicionar uma conta: aba 🏦 Contas, escolhe o banco, coloca o saldo que aparece no app do banco e toca em Adicionar conta. Depois, ao lançar, escolhe a conta e eu acompanho o saldo. De vez em quando, toca em Atualizar saldo pra acertar com o banco.',
  mes: 'Pra planejar o mês: aba 📅 Mês. Em Compromissos você põe contas fixas, faturas, assinaturas e planos que se repetem (com o dia do vencimento). Em Planos do mês, o que quer comprar e quanto custa. Eu mostro a sobra prevista e respondo "cabe no mês?".',
  cartao: 'Pra registrar um cartão de crédito: aba 🏦 Contas → Adicionar cartão de crédito. Coloca o banco, o limite, o dia que a fatura fecha, o dia que vence e quanto já está usado. Depois, ao lançar um gasto, escolhe o cartão em "Conta" e eu acompanho a fatura e o limite.',
  foto: 'Pra mandar foto: em ➕ Lançar, toca em 📷 Foto do comprovante; ou aqui na conversa, no 📎. Com a IA online ligada (Ajustes), eu leio o valor sozinho e você só confirma.',
  lembrete: 'Pra ligar os lembretes: ⚙️ Ajustes → Lembretes, liga a chave e escolhe o horário. No iPhone só funciona com o app instalado na tela inicial e o servidor configurado.',
  instalar: 'Pra instalar: no Android, menu do Chrome → Instalar app. No iPhone, no Safari: Compartilhar → Adicionar à Tela de Início. No PC, o ícone de instalar na barra de endereço.',
  backup: 'Pra fazer backup: ⚙️ Ajustes → Backup → Exportar backup. Pra levar pra outro aparelho, abre o app lá e usa Importar backup com o arquivo. As fotos não entram no backup.',
  ia: 'A IA online é opcional: ⚙️ Ajustes → IA online, cola o endereço do servidor, liga e toca em Testar conexão. Ela lê foto de comprovante e responde o que eu não entendo sozinho.',
  humor: 'Pra mudar meu jeito: ⚙️ Ajustes → C.A.O.S. Humor Suave (gentil, o padrão), Normal ou Ácido (zoeira liberada). Ali também liga a minha voz.',
  apagar: 'Pra apagar um lançamento: na aba 🏠 Início, em Lançamentos do mês, toca no × do lado dele. Eu mesmo não apago nada: essa é uma das minhas leis.',
  geral: 'Na barra de baixo: ➕ Lançar (gastos e entradas), 📅 Mês (planejamento), 🏠 Início no meio (resumo e alertas), 💬 C.A.O.S. (eu!) e 🏦 Contas (bancos e saldos). Dá pra trocar de aba arrastando a tela pro lado. Os ⚙️ Ajustes (orçamentos, humor, lembretes, backup) ficam na engrenagem, no alto do Início. Pergunta "como lanço um gasto?" ou "como ponho orçamento?" que eu explico cada uma.',
};

const fmtPct = v => `${String(Math.round(v * 100) / 100).replace('.', ',')}%`;
const sinal = v => (v == null ? '' : `${v > 0 ? '+' : ''}${fmtPct(v)}`);
const fmtReal = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: v >= 1000 ? 0 : 2 });

/** Uma linha com o número, a variação e a tendência, mostrando a conta (base de cálculo). */
function textoAtivo(m, a) {
  if (a === 'SELIC') return m.selic ? `Selic: ${fmtPct(m.selic.valor)} ao ano${m.ipca12 ? `; com a inflação em 12 meses em ${fmtPct(m.ipca12.valor)}, o juro real fica perto de ${fmtPct(m.selic.valor - m.ipca12.valor)}` : ''}.` : '';
  if (a === 'CDI') return m.cdi ? `CDI: ${fmtPct(m.cdi.valor)} ao ano. É a referência da renda fixa (um CDB "100% do CDI" rende isso, antes do imposto).` : '';
  if (a === 'IPCA') return m.ipca12 ? `Inflação (IPCA) em 12 meses: ${fmtPct(m.ipca12.valor)}.` : '';
  const x = a === 'IBOV' ? m.ibov : m.moedas?.[a];
  if (!x) return '';
  const valor = a === 'IBOV' ? `${Math.round(x.atual).toLocaleString('pt-BR')} pontos` : fmtReal(x.atual);
  const media = x.media20 != null ? ` A média dos últimos ${Math.min(20, x.dias)} dias é ${a === 'IBOV' ? `${Math.round(x.media20).toLocaleString('pt-BR')} pontos` : fmtReal(x.media20)}, e ele está ${x.atual >= x.media20 ? 'acima' : 'abaixo'} dela: ${textoTendencia(x.tendencia)}.` : '';
  return `${x.nome || 'Ibovespa'}: ${valor}${x.varDia != null ? ` (${sinal(x.varDia)} no dia` : ''}${x.var5 != null ? `, ${sinal(x.var5)} em 5 dias)` : x.varDia != null ? ')' : ''}.${media}`;
}

function textoSobra(a) {
  // sem entrada nem orçamento não tem conta pra fazer (em JS, null >= 0 é true: antes virava "sobram R$ 0,00")
  if (a.sobraCents == null || !a.baseTipo) return semBase();
  const base = a.baseTipo === 'entradas' ? `das entradas (${formatBRL(a.baseCents)})` : `do orçamento (${formatBRL(a.baseCents)})`;
  const partes = `já saiu ${formatBRL(a.gastosCents)}, faltam ${formatBRL(a.compPendentesCents)} de compromissos e ${formatBRL(a.planosPendentesCents)} de planos`;
  if (a.sobraCents >= 0) return `Cabe no mês: ${partes}, e ainda sobram ${formatBRL(a.sobraCents)} ${base}.`;
  return `Não cabe tudo: ${partes}, e faltariam ${formatBRL(-a.sobraCents)} ${base}.${a.adiar.length ? ` Dá pra adiar ${a.adiar.map(p => `${p.nome} (${formatBRL(p.valorCents)})`).join(', ')}.` : ''}`;
}

// ---------- Como pagou (P8, vistoria do JF 12/11) ----------
// Ordem: pagou como? → cartão: crédito ou débito? → crédito: à vista ou parcelado (quantas vezes)? →
// parcelado: prende o limite todo ou só a parcela? → qual cartão / de qual banco. Pula o que a pessoa já disse.

const CONTA_DE = { credito: a => a.tipo === 'cartao', pix: a => a.tipo !== 'cartao', debito: a => a.tipo !== 'cartao' };

/** Tira da descrição as palavras do pagamento (pix, crédito, 3x, nome do banco). */
function limparPagamento(desc, accounts = []) {
  if (!desc) return desc;
  desc = desc.replace(/\b(dia \d{1,2}|anteontem|ontem|hoje)\b/gi, ' ').replace(/\bdia\s*$/i, ' ').replace(/\s+/g, ' ').trim();
  if (!desc) return null;
  const bancos = new Set(accounts.flatMap(a => [a.bank, a.nickname]).filter(Boolean).map(norm));
  const LIGA = /^(no|na|de|do|da|em|a|com|pelo|pela|e)$/;
  const palavras = desc.split(/\s+/);
  // nome do banco com mais de uma palavra ("Banco Teste"): marca a sequência toda
  const doBanco = new Set();
  for (const b of bancos) {
    const bt = b.split(/\s+/);
    for (let i = 0; i + bt.length <= palavras.length; i++) {
      if (bt.every((x, k) => norm(palavras[i + k]) === x)) bt.forEach((_, k) => doBanco.add(i + k));
    }
  }
  const limpo = [];
  for (const [i, w] of palavras.entries()) {
    const n = norm(w);
    // número solto só sai se for parcela ("em 3 vezes"); "no 99", "padaria 2 irmãos" ficam (achado do Gemini, 12/11)
    const parcela = /^\d{1,2}$/.test(n) && /^(vezes|parcelas|x)$/.test(norm(palavras[i + 1] || ''));
    if (doBanco.has(i) || parcela || /^(pix|debito|credito|cartao|dinheiro|especie|\d{1,2}x|vezes|parcelas|parcelado|vista)$/.test(n) || bancos.has(n)) {
      while (limpo.length && LIGA.test(norm(limpo[limpo.length - 1]))) limpo.pop(); // "no" de "no pix"
      continue;
    }
    limpo.push(w);
  }
  while (limpo.length && LIGA.test(norm(limpo[0]))) limpo.shift();
  while (limpo.length && LIGA.test(norm(limpo[limpo.length - 1]))) limpo.pop();
  return limpo.join(' ').trim() || null;
}

/** Lê do texto o que a pessoa já contou do pagamento. */
export function lerPagamento(texto, accounts = []) {
  const t = norm(texto);
  const r = {};
  if (/\bpix\b/.test(t)) r.forma = 'pix';
  else if (/\bdebito\b/.test(t)) r.forma = 'debito';
  else if (/\bcredito\b/.test(t)) r.forma = 'credito';
  else if (/\b(dinheiro|especie|em maos|dinheiro vivo|nota)\b/.test(t)) r.forma = 'dinheiro';
  else if (/\bcartao\b/.test(t)) r.forma = 'cartao'; // falta saber: crédito ou débito
  const vezes = t.match(/\b(\d{1,2}) ?x\b|\bem (\d{1,2}) ?(vezes|parcelas)\b/);
  if (vezes) {
    const n = Number(vezes[1] || vezes[2]);
    if (n >= 1 && n <= 24) { r.parcelas = n; if (n > 1 && r.forma !== 'credito') r.forma = 'credito'; }
  } else if (/\b(a vista|avista|de uma vez|uma vez so)\b/.test(t)) r.parcelas = 1;
  if (/\b(limite todo|valor todo|no limite|prende tudo|tudo no limite|prende o limite)\b/.test(t)) r.limiteModo = 'total';
  else if (/\b(dividido|so a parcela|a parcela|parcela do mes|por mes)\b/.test(t)) r.limiteModo = 'parcela';
  const filtro = CONTA_DE[r.forma] || (() => true);
  const achou = accounts.filter(filtro).filter(a => {
    const nomes = [a.bank, a.nickname].filter(Boolean).map(norm);
    return nomes.some(n => n.length >= 2 && new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t));
  });
  if (achou.length === 1) { r.accountId = achou[0].id; if (!r.forma && achou[0].tipo === 'cartao') r.forma = 'credito'; }
  return r;
}

/** A próxima pergunta sobre o pagamento, ou null quando já dá pra propor. */
export function proximaPerguntaPagamento(acao, accounts = []) {
  if (!accounts.length) return null; // sem conta cadastrada, não enche de pergunta
  if (!acao.forma) return { texto: 'Pagou como? Dinheiro, Pix, débito ou crédito?', sugestoes: ['Pix', 'Débito', 'Crédito', 'Dinheiro'] };
  if (acao.forma === 'cartao') return { texto: 'No cartão de crédito ou de débito?', sugestoes: ['Crédito', 'Débito'] };
  if (acao.forma === 'credito' && acao.parcelas == null) {
    return { texto: 'À vista ou parcelado? Se for parcelado, me fala em quantas vezes, tipo "4x".', sugestoes: ['À vista', '2x', '3x', '10x'] };
  }
  if (acao.forma === 'credito' && acao.parcelas > 1 && !acao.limiteModo) {
    const parcela = formatBRL(Math.floor(acao.amountCents / acao.parcelas));
    return { texto: `Esse parcelado prende o valor todo (${formatBRL(acao.amountCents)}) no seu limite, soltando ${parcela} por mês, ou só a parcela de ${parcela} ocupa o limite? Se não souber, fala "não sei".`,
      sugestoes: ['Prende o limite todo', 'Só a parcela', 'Não sei'] };
  }
  if (!acao.accountId && CONTA_DE[acao.forma]) {
    const cabem = accounts.filter(CONTA_DE[acao.forma]);
    if (cabem.length > 1) {
      return { texto: acao.forma === 'credito' ? 'Qual cartão?' : 'De qual banco saiu?', sugestoes: cabem.slice(0, 5).map(a => accountLabel(a)) };
    }
  }
  return null;
}

/** Completa a ação com o que dá pra deduzir (uma conta só, "não sei" = valor todo). */
function completarPagamento(acao, accounts = []) {
  const a = { ...acao };
  if (a.forma === 'credito' && a.parcelas > 1 && !a.limiteModo) return a;
  if (!a.accountId && CONTA_DE[a.forma]) {
    const cabem = accounts.filter(CONTA_DE[a.forma]);
    if (cabem.length === 1) a.accountId = cabem[0].id;
  }
  return a;
}

/** Proposta final (com o pagamento) ou a próxima pergunta, no formato de resposta do responder. */
export function seguirPagamento(acao, dados) {
  const accounts = dados.accounts || [];
  const a = completarPagamento(acao, accounts);
  const q = proximaPerguntaPagamento(a, accounts);
  if (q) return { fato: q.texto, cru: true, sugestoes: q.sugestoes, aguardar: { tipo: 'pagamento', acao: a } };
  const conta = accounts.find(c => c.id === a.accountId);
  const como = a.forma === 'credito' ? (a.parcelas > 1 ? `no crédito em ${a.parcelas}x de ${formatBRL(Math.floor(a.amountCents / a.parcelas))}` : 'no crédito à vista')
    : a.forma === 'debito' ? 'no débito' : a.forma === 'pix' ? 'no Pix' : a.forma === 'dinheiro' ? 'em dinheiro' : '';
  const final = { ...a, forma: a.forma === 'cartao' ? null : a.forma || null, parcelas: a.parcelas || 1, limiteModo: a.limiteModo || 'total' };
  const cat = (dados.categories || []).find(c => c.id === a.categoryId);
  return {
    fato: `Fechado: ${formatBRL(a.amountCents)} em ${cat?.name ?? 'Outros'}${como ? `, ${como}` : ''}${conta ? ` (${accountLabel(conta)})` : ''}. Confere e confirma aí embaixo.`,
    cru: true, acao: final, sugestoes: [],
  };
}

/** Resposta da pessoa a uma pergunta do pagamento. null = não era resposta (segue a conversa normal). */
export function continuarPagamento(acao, texto, dados) {
  const t = norm(texto);
  if (/^(cancela|cancelar|deixa|deixa pra la|esquece|nao quero)\b/.test(t)) return { fato: 'Tranquilo, não anotei nada.', cru: true, sugestoes: [] };
  if (String(texto).trim().split(/\s+/).length > 8) return null;
  const accounts = dados.accounts || [];
  const lido = lerPagamento(texto, accounts.filter(CONTA_DE[acao.forma === 'cartao' ? 'credito' : acao.forma] || (() => true)));
  const novo = { ...acao };
  if (lido.forma && (!acao.forma || acao.forma === 'cartao')) novo.forma = lido.forma === 'cartao' ? acao.forma || 'cartao' : lido.forma;
  if (lido.parcelas != null && novo.parcelas == null) novo.parcelas = lido.parcelas;
  if (lido.limiteModo && !novo.limiteModo) novo.limiteModo = lido.limiteModo;
  if (/\bnao sei\b/.test(t) && novo.parcelas > 1 && !novo.limiteModo) novo.limiteModo = 'total';
  if (lido.accountId && !novo.accountId) novo.accountId = lido.accountId;
  // resposta com o nome da conta como está na sugestão ("Nubank · Poupança")
  if (!novo.accountId) {
    const igual = accounts.find(a => norm(accountLabel(a)) === t);
    if (igual) { novo.accountId = igual.id; if (!novo.forma || novo.forma === 'cartao') novo.forma = igual.tipo === 'cartao' ? 'credito' : 'debito'; }
  }
  if (JSON.stringify(novo) === JSON.stringify(acao)) return null;
  return seguirPagamento(novo, dados);
}

/** "Me explica melhor": a última resposta de novo, em passos simples, com a conta aberta. */
export function explicarMelhor(anterior, dados, today = toISODate()) {
  const { expenses = [], incomes = [], categories = [] } = dados;
  const mes = monthKey(today);
  const intent = anterior?.intent;
  if (['planos', 'cabe', 'pagar', 'saldo_mes'].includes(intent)) {
    const a = analisarPlanejamento(dados, today);
    if (!a.baseTipo) return `${semBase()} Funciona assim: eu pego o que entra no mês, tiro o que já saiu, o que ainda falta pagar de contas fixas e os planos que você anotou. O que sobrar é o quanto você ainda pode gastar sem aperto.`;
    const base = a.baseTipo === 'entradas' ? `1) Entrou no mês: ${formatBRL(a.baseCents)}.` : `1) Seu orçamento do mês (você não anotou entradas, então uso os limites): ${formatBRL(a.baseCents)}.`;
    const resultado = a.sobraCents >= 0 ? `Sobram ${formatBRL(a.sobraCents)}: é o quanto você ainda pode gastar sem aperto.` : `Faltam ${formatBRL(-a.sobraCents)}: não cabe tudo, então algum plano precisa esperar.`;
    return `Vou por partes. ${base} 2) Já saiu: ${formatBRL(a.gastosCents)}. 3) Ainda falta pagar de contas fixas: ${formatBRL(a.compPendentesCents)}. 4) Planos que você anotou: ${formatBRL(a.planosPendentesCents)}. A conta é: ${formatBRL(a.baseCents)} − ${formatBRL(a.gastosCents)} − ${formatBRL(a.compPendentesCents)} − ${formatBRL(a.planosPendentesCents)}. ${resultado} Qual parte ficou confusa?`;
  }
  if (intent === 'previsao') {
    const f = forecastMonth(expenses, mes, today, dados.compromissos || []);
    const pend = f.pendentesCents ? ` Somei também ${formatBRL(f.pendentesCents)} de contas fixas e assinaturas que ainda não caíram (tipo a que cobra lá pelo dia 20).` : '';
    return `Vou por partes. Até hoje (dia ${f.day} de ${f.daysTotal}) você gastou ${formatBRL(f.spentCents)}. Tirando as contas fixas (${formatBRL(f.fixosCents)}), dá uma média de ${formatBRL(f.perDayCents)} por dia.${pend} Se continuar nesse ritmo até o dia ${f.daysTotal}, o mês fecha perto de ${formatBRL(f.projectedCents)}. É uma estimativa: se você gastar menos nos próximos dias, ela cai.`;
  }
  if (['gasto_total', 'gasto_categoria', 'maior_gasto', 'onde_gastei'].includes(intent)) {
    const s = summarizeMonth(expenses, categories, mes);
    const top = s.rows.filter(r => r.spentCents > 0).sort((a, b) => b.spentCents - a.spentCents).slice(0, 3);
    if (!top.length) return 'Ainda não tem gasto anotado neste mês, então não tem o que somar. Quando você lançar, eu mostro quanto foi em cada categoria.';
    return `Vou por partes. Eu somo tudo que você anotou no mês, separado por tipo de gasto (categoria). Os maiores: ${top.map(r => `${r.name} ${formatBRL(r.spentCents)}`).join(', ')}. Somando tudo dá ${formatBRL(s.totalCents)}. Quer ver uma categoria por dentro? Pergunta tipo "quanto gastei em ${top[0].name.toLowerCase()}?".`;
  }
  if (intent === 'glossario' && anterior.termo) {
    const g = GLOSSARIO_POR_TERMO.get(anterior.termo);
    if (g) return `Bora mais fundo em ${g.termo.toLowerCase()}. ${g.mais}`;
  }
  if (intent === 'cartao') {
    return 'Vou por partes. O cartão junta suas compras numa fatura. Ela "fecha" num dia do mês (o que você comprou até ali vai pra essa fatura) e "vence" alguns dias depois (é quando você paga). O limite é o máximo que o banco deixa você usar; o que você já usou e ainda não pagou fica preso nele. Por isso eu mostro quanto ainda está livre.';
  }
  if (!intent) return 'Explico, sim! Mas me diz o quê: me manda a pergunta de novo, ou o assunto (tipo "o cartão", "o cabe no mês", "a previsão"), que eu explico com calma, passo a passo.';
  return 'Explico, sim. Qual parte ficou confusa? Me manda a palavra ou o número que não fez sentido que eu explico só ele, com um exemplo.';
}

function semBase() {
  return 'Pra eu fazer essa conta, preciso saber quanto entra no seu mês. Quanto você recebe? Me fala tipo "recebi 2500 de salário" que eu anoto como entrada, e aí eu te digo quanto sobra de verdade.';
}

/** "gastei 30 no uber" → "uber"; "paguei 120 de luz" → "luz". */
export function descricaoDe(t) {
  const m = String(t).match(/\b(?:no|na|nos|nas|em|de|do|da|com|pro|pra)\s+([a-z0-9 ]{2,40})$/);
  if (!m) return '';
  // número fica na descrição ("no 99", "padaria 2 irmãos"); palavra vazia sai (achado do Gemini, 12/11)
  return m[1].split(/\s+/).filter(w => /^\d{1,4}$/.test(w) || palavrasDe(w).length).slice(0, 3).join(' ');
}

/** Primeiro acesso: tira o nome de "meu nome é João", "sou a Ana", "João". */
export function extrairNome(texto) {
  let t = String(texto || '').trim().replace(/[.!?,;]+$/g, '');
  t = t.replace(/^(oi|ola|olá|e ai|eai|opa)[,!\s]+/i, '')
    .replace(/^(o\s+)?meu nome (é|e|eh)\s+/i, '').replace(/^(eu\s+)?(me chamo|sou o|sou a|sou)\s+/i, '')
    .replace(/^(pode me chamar de|me chama de)\s+/i, '');
  const nome = t.split(/\s+/).slice(0, 3).join(' ').replace(/[^\p{L}\p{N} '-]/gu, '').trim();
  return nome ? nome.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ').slice(0, 30) : '';
}

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

/**
 * Monta o FATO da resposta (com os números) para a intenção. Só leitura dos dados.
 * @returns {{ gatilho?: string, fato?: string, sugestoes?: string[], acao?: object, eventos?: string[] }}
 */
export function responder(intencao, dados, { today = toISODate(), emocao = 'calmo', perfil = null, now = Date.now() } = {}) {
  const { expenses = [], incomes = [], categories = [], accounts = [], compromissos = [], planos = [] } = dados;
  const range = periodRange(intencao.periodo, today);
  const mes = monthKey(today);

  switch (intencao.intent) {
    case 'registrar_gasto': {
      // descrição: o que vem depois de "no/na/de/em/com" ("gastei 30 no uber" → "Uber")
      // descrição sem o jeito de pagar ("no pix no mercado" → "mercado")
      const desc = limparPagamento(descricaoDe(intencao.t), dados.accounts);
      // categoria: pela palavra (sinônimos) ou pelo que ele aprendeu com o histórico da pessoa
      const aprendida = !intencao.categoria && desc ? sugerirCategoria(desc, expenses) : null;
      const cat = intencao.categoria || (aprendida && categories.find(c => c.id === aprendida.categoryId))
        || categories.find(c => c.id === 'outros') || categories[0];
      const recorrente = /\b(internet|luz|energia|agua|aluguel|condominio|netflix|spotify|streaming|academia|plano|celular|telefone|assinatura|mensalidade|escola|faculdade|seguro|gas)\b/.test(intencao.t)
        || ['contas', 'moradia', 'streaming'].includes(cat?.id);
      return {
        gatilho: 'proposta_registro',
        dica: [avisoDaData(dataDoTexto(intencao.t, today), today), recorrente ? 'Isso parece conta de todo mês. Se for, cadastra em 📅 Mês → Contas fixas que eu passo a lembrar do vencimento e já entra no planejamento.' : null].filter(Boolean).join(' ') || null,
        vars: { valor: formatBRL(intencao.valor), categoria: cat?.name ?? 'Outros' },
        acao: { tipo: 'registrar_gasto', amountCents: intencao.valor, categoryId: cat?.id ?? 'outros', date: dataDoTexto(intencao.t, today),
          note: desc ? desc[0].toUpperCase() + desc.slice(1) : '', ...lerPagamento(intencao.t, dados.accounts) },
        aprendeu: !!aprendida,
        pagamento: true,
      };
    }
    case 'pagamento_resposta':
      return intencao.resposta;
    case 'glossario': {
      const g = intencao.termo;
      const idade = idadeDe(perfil?.aniversario, today);
      const crianca = idade != null && faixaEtaria(idade) === 'crianca';
      const abre = intencao.quem ? `Ah, ${intencao.quem === 'mae' ? 'sua mãe' : `seu ${intencao.quem.replace('mae', 'mãe')}`} falou de ${g.termo.toLowerCase()}? Explico. ` : '';
      const gov = g.governo ? ` Isso depende de regra do governo, que muda: o que eu sei é de ${ATUALIZADO_EM}. Confere no canal oficial.` : '';
      const def = (crianca ? g.crianca : g.adulto).replace(/^É /, 'é ');
      return { fato: `${abre}${g.termo}: ${def}${gov} Quer que eu explique melhor? É só pedir.`, cru: true, sugestoes: ['Me explica melhor', 'O que é juros compostos?', 'Vale a pena parcelar?'] };
    }
    case 'calc_juros': {
      const c = intencao.calc;
      if (c.faltando) {
        return { fato: `Faço a conta de juros ${c.tipo}! Me manda o valor, a taxa e o tempo, tipo "juros ${c.tipo} de 1000 a 1% ao mês por 12 meses".`, cru: true, sugestoes: [] };
      }
      const r = calcularJuros(c);
      const tempo = c.meses % 12 === 0 && c.meses >= 12 ? `${c.meses / 12} ${c.meses === 12 ? 'ano' : 'anos'}` : `${c.meses} ${c.meses === 1 ? 'mês' : 'meses'}`;
      const comparar = c.tipo === 'compostos' ? ` Com juros simples daria ${formatBRL(calcularJuros({ ...c, tipo: 'simples', taxa: c.taxaSimples }).finalCents)}: a diferença é o juro sobre juro.` : '';
      return { fato: `Com juros ${c.tipo}, ${formatBRL(c.valor)} a ${c.taxaTexto} por ${tempo} vira ${formatBRL(r.finalCents)} (${formatBRL(r.jurosCents)} de juros).${comparar} Se for dívida, a mesma conta joga contra você. É só uma conta: rendimento real depende de imposto e taxa.`, cru: true, sugestoes: ['O que é juros compostos?', 'Vale a pena parcelar?'] };
    }
    case 'ofertas_print':
      return { fato: 'Manda o print da oferta pelo 📎 (pode ser um de cada loja) que eu leio preço, parcelas e frete e comparo pra você. A imagem só vai pro servidor do C.A.O.S. Finanças pra essa leitura.',
        modoFoto: 'ofertas', cru: true, sugestoes: [] };
    case 'oferta_unica':
      return { fato: textoOfertaUnica(intencao.ofertas[0], intencao.produto), cru: true, sugestoes: ['Mandar print', 'Deixa pra depois'], modoFoto: 'ofertas',
        aguardar: { tipo: 'ofertas', ofertas: intencao.ofertas, produto: intencao.produto } };
    case 'porcentagem':
      return { fato: textoPorcentagem(intencao.pct), cru: true, sugestoes: [] };
    case 'comparar_ofertas': {
      const a = analisarOfertas(intencao.ofertas);
      return { fato: textoOfertas(a, intencao.produto), cru: true, decisao: 'compra', sugestoes: ['Mandar print', 'Deixa pra depois'], modoFoto: 'ofertas',
        aguardar: { tipo: 'ofertas', ofertas: intencao.ofertas, produto: intencao.produto } };
    }
    case 'vale_parcelar': {
      const p = intencao.parc || {};
      if (p.n && p.parcela) {
        const total = p.n * p.parcela;
        const vista = p.vista && p.vista !== total ? p.vista : null;
        if (vista) {
          const dif = total - vista;
          return { fato: dif > 0
            ? `Parcelado dá ${p.n}x de ${formatBRL(p.parcela)} = ${formatBRL(total)}. À vista é ${formatBRL(vista)}. Parcelando você paga ${formatBRL(dif)} a mais: isso é juro, mesmo que digam "sem juros". Se dá pra pagar à vista sem apertar o mês, à vista ganha.`
            : `Parcelado dá ${formatBRL(total)} e à vista ${formatBRL(vista)}: o parcelado não sai mais caro. Aí vale parcelar se as ${p.n} parcelas de ${formatBRL(p.parcela)} cabem no mês junto com as que você já tem.`, cru: true, decisao: 'compra' };
        }
        return { fato: `${p.n}x de ${formatBRL(p.parcela)} dá ${formatBRL(total)} no total. Pergunta o preço à vista: se for menor, a diferença é o juro escondido. E confere se a parcela cabe no mês com as outras que você já tem.`, cru: true, decisao: 'compra' };
      }
      return { fato: 'Depende: o parcelado sai mais caro que o à vista? (aí tem juro). A parcela cabe no mês? E vale pelo que dura? Coxinha em 3x, não; notebook em 10x sem juros, pode ser. Me manda os números, tipo "3000 à vista ou 10x de 330".', cru: true, decisao: 'compra', sugestoes: [] };
    }
    case 'esqueci_de_lancar':
      return {
        fato: 'Esqueceu?! Quase caí da cadeira aqui. Brincadeira: acontece com todo mundo, e eu não conto pra ninguém. Me fala três coisas: quanto foi, em quê e quando. Tipo "50 no mercado ontem" ou "120 de luz dia 10".',
        cru: true,
        aguardar: { tipo: 'esqueci' },
        sugestoes: ['Deixa pra depois'],
      };
    case 'gasto_sem_valor': {
      const desc = descricaoDe(intencao.t);
      const doQue = desc ? ` de ${desc}` : intencao.categoria ? ` em ${intencao.categoria.name}` : '';
      return {
        fato: `Bora anotar! Quanto foi o gasto${doQue}? Me manda só o valor, tipo 79,90. Se não lembrar, dá uma olhada no app do banco ou na fatura e me fala depois.`,
        aguardar: { tipo: 'valor_gasto', t: intencao.t, categoria: intencao.categoria || null },
        cru: true,
        sugestoes: [],
      };
    }
    case 'explicar_melhor':
      return { fato: explicarMelhor(dados.anterior, dados, today) };
    case 'registrar_entrada': {
      const fonte = INCOME_SOURCES.find(s => s.id === (intencao.fonte || 'outros'));
      return {
        gatilho: 'proposta_registro',
        vars: { valor: formatBRL(intencao.valor), categoria: `entrada (${fonte.name})` },
        // "recebi 1500 de salário no nubank": a entrada cai na conta (achado do Gemini); cartão nunca recebe entrada
        acao: { tipo: 'registrar_entrada', amountCents: intencao.valor, sourceId: fonte.id, date: dataDoTexto(intencao.t, today), note: '',
          accountId: lerPagamento(intencao.t, (dados.accounts || []).filter(a => a.tipo !== 'cartao')).accountId || null },
      };
    }
    case 'gasto_total': {
      const filtro = intencao.categoria ? e => e.categoryId === intencao.categoria.id : () => true;
      const { totalCents, count } = sumInRange(expenses, range, filtro);
      const onde = intencao.categoria ? ` em ${intencao.categoria.name}` : '';
      if (!count) return { fato: `Nenhum gasto${onde} ${range.label}.`, sugestoes: ['Gastei 25 no mercado', 'Algum alerta?'] };
      let extra = '';
      if (intencao.categoria && intencao.periodo === 'mes' && intencao.categoria.budgetCents) {
        extra = ` São ${pct(totalCents, intencao.categoria.budgetCents)}% do orçamento de ${formatBRL(intencao.categoria.budgetCents)}.`;
      }
      return {
        fato: `Você gastou ${formatBRL(totalCents)}${onde} ${range.label}, em ${count} ${count === 1 ? 'lançamento' : 'lançamentos'}.${extra}`,
        sugestoes: ['Onde mais gastei?', 'Comparado ao mês passado?', 'Vai dar até o fim do mês?'],
      };
    }
    case 'maior_gasto': {
      const top = topCategories(expenses, categories, range);
      if (!top.length) return { fato: `Nada gasto ${range.label} ainda.` };
      const total = top.reduce((s, c) => s + c.totalCents, 0);
      const lista = top.slice(0, 3).map(c => `${c.emoji} ${c.name} ${formatBRL(c.totalCents)} (${pct(c.totalCents, total)}%)`).join(', ');
      const maior = expenses.filter(e => e.date >= range.from && e.date <= range.to)
        .reduce((m, e) => (!m || e.amountCents > m.amountCents ? e : m), null);
      const cat = maior && categories.find(c => c.id === maior.categoryId);
      const item = maior ? ` O maior lançamento foi ${formatBRL(maior.amountCents)}${maior.note ? ` (${maior.note})` : ''} em ${cat?.name ?? 'Outros'}.` : '';
      return { fato: `Onde mais saiu dinheiro ${range.label}: ${lista}.${item}`, sugestoes: ['Me dá uma dica', 'Quanto ainda posso gastar?'] };
    }
    case 'entradas': {
      // "rendimentos" no sentido geral = qualquer entrada; só filtra investimento quando a pergunta é específica
      const especifica = intencao.fonte === 'salario' || intencao.fonte === 'freela'
        || (intencao.fonte === 'rendimento' && /invest|juros|dividend|cdb|poupanca|tesouro/.test(intencao.t));
      const filtro = especifica ? i => i.sourceId === intencao.fonte : () => true;
      const { totalCents, count } = sumInRange(incomes, range, filtro);
      if (!count) {
        return {
          fato: `Não tem nenhuma entrada anotada ${range.label}. Se recebeu algo, me fala tipo "recebi 1500 de salário".`,
          sugestoes: ['Recebi 1500 de salário', 'Qual meu saldo?'],
        };
      }
      const porFonte = INCOME_SOURCES.map(s => ({ s, v: sumInRange(incomes, range, i => i.sourceId === s.id).totalCents }))
        .filter(x => x.v > 0).map(x => `${x.s.emoji} ${x.s.name} ${formatBRL(x.v)}`).join(', ');
      const gastos = sumInRange(expenses, range).totalCents;
      const saldo = totalCents - gastos;
      return {
        fato: `Entrou ${formatBRL(totalCents)} ${range.label} (${porFonte}). Saiu ${formatBRL(gastos)}, então o saldo do período está ${saldo >= 0 ? 'positivo em' : 'negativo em'} ${formatBRL(Math.abs(saldo))}.`,
        sugestoes: ['Onde mais gastei?', 'Qual meu saldo?'],
      };
    }
    case 'explicar_print':
      return { fato: 'Manda o print aqui pelo 📎 que eu te explico o que o banco quis dizer. A imagem só vai pro servidor do C.A.O.S. Finanças pra isso, e eu não repito números de conta nem de cartão.', modoFoto: 'explicar', sugestoes: [] };
    case 'meta_nova':
      return { gatilho: 'meta_pra_que', fluxoMeta: { nome: intencao.metaNome || null } };
    case 'metas': {
      const metas = (dados.metas || []).map(m => progressoMeta(m, today));
      if (!metas.length) return { fato: 'Você ainda não tem metas. Quer montar uma comigo? É só falar "quero juntar dinheiro pra…" ou tocar em Nova meta, na aba 📅 Mês.', sugestoes: ['Quero montar uma meta'] };
      return { fato: metas.map(m => (m.batida ? `${m.nome}: meta batida! 🎉` : textoMeta(m))).join(' '), sugestoes: ['Quero montar uma meta', 'Cabe no mês?'] };
    }
    case 'meta_guardar': {
      const metas = (dados.metas || []).filter(m => !m.conquistadaEm);
      if (!metas.length) return { fato: 'Você ainda não tem meta aberta pra guardar dinheiro. Quer montar uma? Fala "quero juntar dinheiro pra…".', sugestoes: ['Quero montar uma meta'] };
      const meta = metas.find(m => intencao.t.includes(norm(m.nome))) || (metas.length === 1 ? metas[0] : null);
      if (!meta) return { fato: `Em qual meta? Você tem: ${metas.map(m => m.nome).join(', ')}. Fala tipo "guardei 50 na meta ${metas[0].nome}".`, sugestoes: metas.map(m => `Guardei ${(intencao.valor / 100).toFixed(0)} na meta ${m.nome}`) };
      return { fato: `Quer que eu some ${formatBRL(intencao.valor)} na meta ${meta.nome}?`, acao: { tipo: 'meta_guardar', metaId: meta.id, valorCents: intencao.valor } };
    }
    case 'cartao': {
      const cartoes = accounts.filter(a => a.tipo === 'cartao');
      if (!cartoes.length) return { fato: 'Você ainda não cadastrou cartão de crédito. Na aba 🏦 Contas tem "Adicionar cartão de crédito": limite, dia que fecha e dia que vence. Aí eu acompanho a fatura com você.', sugestoes: ['Como registro meu cartão?'] };
      const partes = cartoes.map(c => {
        const f = faturaDoCartao(comReforco(c, accounts, expenses, incomes, dados.transferencias || []), expenses, today);
        const fech = f.diasParaFechar === 0 ? 'fecha hoje' : `fecha em ${f.diasParaFechar} ${f.diasParaFechar === 1 ? 'dia' : 'dias'}`;
        const venc = f.fechadaCents > 0 ? ` Fatura fechada de ${formatBRL(f.fechadaCents)} vence ${f.diasParaVencer === 0 ? 'hoje' : f.diasParaVencer === 1 ? 'amanhã' : `dia ${Number(f.vencimento.slice(8))}`}.` : '';
        return `${f.nome}: ${formatBRL(f.usadoCents)} de ${formatBRL(f.limiteCents)} do limite (${f.pct}%), sobram ${formatBRL(f.disponivelCents)}. A fatura aberta está em ${formatBRL(f.abertaCents)} e ${fech}.${venc}`;
      });
      return { fato: partes.join(' '), sugestoes: ['O que tenho pra pagar?', 'Cabe no mês?'] };
    }
    case 'saldo': {
      if (!accounts.length) {
        return { fato: 'Você ainda não cadastrou nenhuma conta. Vai na aba Contas, escolhe o banco e coloca o saldo atual.', sugestoes: ['Quanto gastei este mês?'] };
      }
      const t = intencao.t;
      const contas = accounts.filter(a => a.tipo !== 'cartao');
      const uma = contas.find(a => t.includes(norm(a.bank)) || (a.nickname && t.includes(norm(a.nickname))));
      if (uma) {
        return { fato: `${accountLabel(uma)}: saldo estimado de ${formatBRL(accountBalance(uma, expenses, incomes, dados.transferencias || []))}.`, sugestoes: ['Algum alerta?'] };
      }
      const lista = contas.map(a => `${accountLabel(a)} ${formatBRL(accountBalance(a, expenses, incomes, dados.transferencias || []))}`).join(', ');
      return {
        fato: `Saldo estimado total: ${formatBRL(totalBalance(accounts, expenses, incomes, dados.transferencias || []))} (${lista}). É o saldo que você informou mais o que foi lançado depois.`,
        sugestoes: ['Quanto gastei este mês?', 'Tive rendimentos?'],
      };
    }
    case 'orcamento': {
      const s = summarizeMonth(expenses, categories, mes);
      if (intencao.categoria) {
        const r = s.rows.find(x => x.id === intencao.categoria.id);
        if (!r.budgetCents) return { fato: `${r.name} não tem orçamento. Gasto do mês: ${formatBRL(r.spentCents)}. Dá pra definir em Ajustes.` };
        const resta = r.budgetCents - r.spentCents;
        return { fato: resta >= 0
          ? `${r.name}: ${formatBRL(r.spentCents)} de ${formatBRL(r.budgetCents)}. Ainda pode gastar ${formatBRL(resta)}.`
          : `${r.name} já passou ${formatBRL(-resta)} do orçamento de ${formatBRL(r.budgetCents)}.` };
      }
      if (!s.budgetTotalCents) return { fato: 'Você ainda não definiu orçamentos. Vai em Ajustes → Orçamentos e coloca um limite por categoria.' };
      const resta = s.budgetTotalCents - s.budgetedSpentCents;
      const dias = Number(today.slice(8, 10));
      const faltam = Math.max(1, new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate() - dias + 1);
      return {
        fato: resta >= 0
          ? `Nas categorias com limite, ainda dá pra gastar ${formatBRL(resta)} este mês. Dá uns ${formatBRL(Math.floor(resta / faltam))} por dia até o fim do mês.`
          : `Os orçamentos já passaram ${formatBRL(-resta)} do total planejado (${formatBRL(s.budgetTotalCents)}).`,
        sugestoes: ['Onde mais gastei?', 'Me dá uma dica'],
      };
    }
    case 'previsao': {
      const f = forecastMonth(expenses, mes, today, compromissos);
      const s = summarizeMonth(expenses, categories, mes);
      const inc = incomeIn(incomes, mes);
      let fato = `No ritmo atual (${formatBRL(f.perDayCents)} por dia), o mês deve fechar em ${formatBRL(f.projectedCents)}.`;
      if (f.pendentesCents) fato += ` Já contei ${formatBRL(f.pendentesCents)} de contas fixas e assinaturas que ainda vão cair este mês.`;
      if (s.budgetTotalCents) {
        // compara só o que tem limite com o orçamento
        const projBud = Math.round((s.budgetedSpentCents / Math.max(1, f.day)) * f.daysTotal);
        fato += projBud > s.budgetTotalCents
          ? ` Nas categorias com limite, a previsão (${formatBRL(projBud)}) passa ${formatBRL(projBud - s.budgetTotalCents)} do orçamento.`
          : ` As categorias com limite devem fechar dentro do orçamento de ${formatBRL(s.budgetTotalCents)}.`;
      }
      if (inc) fato += f.projectedCents > inc ? ` E fica acima das entradas (${formatBRL(inc)}).` : ` E cabe nas entradas do mês (${formatBRL(inc)}).`;
      return { fato, sugestoes: ['Quanto ainda posso gastar?', 'Me dá uma dica'] };
    }
    case 'comparar': {
      const atual = spentIn(expenses, mes);
      const ant = spentIn(expenses, shiftMonth(mes, -1));
      const dia = Number(today.slice(8, 10));
      const antAteHoje = sumInRange(expenses, { from: `${shiftMonth(mes, -1)}-01`, to: `${shiftMonth(mes, -1)}-${String(dia).padStart(2, '0')}` }).totalCents;
      if (!ant) return { fato: `Não tem gasto anotado em ${monthLabel(shiftMonth(mes, -1))} pra comparar. Este mês: ${formatBRL(atual)}.` };
      const dif = atual - antAteHoje;
      return {
        fato: `Até o dia ${dia}, este mês saiu ${formatBRL(atual)}; no mesmo ponto do mês passado eram ${formatBRL(antAteHoje)} (${dif > 0 ? `${formatBRL(dif)} a mais` : dif < 0 ? `${formatBRL(-dif)} a menos` : 'igualzinho'}). O mês passado inteiro fechou em ${formatBRL(ant)}.`,
        sugestoes: ['Onde mais gastei?', 'Vai dar até o fim do mês?'],
      };
    }
    case 'media': {
      const f = forecastMonth(expenses, mes, today);
      return { fato: `Média deste mês: ${formatBRL(f.perDayCents)} por dia, em ${f.day} ${f.day === 1 ? 'dia' : 'dias'}.` };
    }
    case 'dica': {
      const top = topCategories(expenses, categories, periodRange('mes', today));
      const alertas = analyze(dados, today);
      if (alertas.some(a => a.type === 'delivery_repetido')) return { fato: 'Dica da semana: o delivery está pesando. Cozinhar duas vezes por semana já faz diferença no fim do mês.' };
      if (!top.length) return { fato: 'Primeira dica: anota tudo por uma semana, até o cafezinho. Depois eu te mostro onde dá pra cortar.' };
      // corte de 15% na maior categoria que dá pra segurar (delivery, lazer, compras…), não em moradia ou saúde
      const ESSENCIAIS = new Set(['moradia', 'saude', 'contas', 'mercado', 'transporte']);
      const c = top.find(x => !ESSENCIAIS.has(x.id)) || top[0];
      const corte = Math.round(c.totalCents * 0.15);
      const semOrc = categories.filter(x => !x.budgetCents).length;
      return {
        fato: `${c === top[0] ? 'Sua maior categoria no mês' : 'Onde dá pra segurar mais fácil'} é ${c.emoji} ${c.name} (${formatBRL(c.totalCents)}). Cortar 15% dela daria ${formatBRL(corte)} de folga.${semOrc ? ` E ${semOrc} categorias estão sem orçamento: definir um limite ajuda a segurar.` : ''}`,
      };
    }
    case 'alertas': {
      const a = analyze(dados, today);
      if (!a.length) return { fato: 'Nenhum alerta agora. Tudo dentro do esperado.', sugestoes: ['Quanto gastei este mês?', 'Vai dar até o fim do mês?'] };
      return { alertas: a, fato: `Tenho ${a.length} ${a.length === 1 ? 'alerta' : 'alertas'}. O principal:`, sugestoes: ['Onde mais gastei?', 'Me dá uma dica'] };
    }
    case 'meu_nome':
      return perfil?.apelido
        ? { fato: `Claro! Você é ${perfil.nome && perfil.nome !== perfil.apelido ? `${perfil.nome}, e eu te chamo de ${perfil.apelido}` : perfil.apelido}. Se quiser mudar, é só falar "me chama de…".` }
        : { fato: 'Ainda não sei seu nome. Me conta? Diz "me chama de" e o seu nome.' };
    case 'mudar_apelido': {
      const novo = intencao.apelido.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
      return { gatilho: 'proposta_registro', vars: { valor: novo, categoria: 'seu novo nome' },
        fato: `Quer que eu passe a te chamar de ${novo}?`, acao: { tipo: 'mudar_apelido', apelido: novo } };
    }
    case 'pagar': {
      // fatura do cartão entra sozinha (achado do GPT, 12/11), menos se a pessoa já cadastrou essa fatura como
      // compromisso (aí não conta duas vezes). Fatura não vira proposta de gasto: as compras já foram lançadas;
      // pagar a fatura é marcar "Paguei a fatura" em Contas.
      const comFaturaCadastrada = new Set(compromissos.filter(c => c.tipo === 'fatura' && c.accountId).map(c => c.accountId));
      const faturas = accounts.filter(a => a.tipo === 'cartao' && !comFaturaCadastrada.has(a.id))
        .map(a => faturaDoCartao(comReforco(a, accounts, expenses, incomes, dados.transferencias || []), expenses, today))
        .filter(f => f.fechadaCents > 0);
      const dia = iso => `${Number(iso.slice(8))}/${Number(iso.slice(5, 7))}`;
      const txtFaturas = faturas.map(f => `fatura do ${f.nome} ${formatBRL(f.fechadaCents)} (${f.atrasada ? `venceu dia ${dia(f.vencimento)}` : `vence dia ${dia(f.vencimento)}`})`);
      const totalFaturas = faturas.reduce((t, f) => t + f.fechadaCents, 0);
      const dicaFatura = faturas.length ? ' Pagou a fatura? Marca em Contas, no cartão, em "Paguei a fatura".' : '';
      const sit = situacaoCompromissos(compromissos, expenses, today).filter(c => c.noMes);
      if (!compromissos.length && !faturas.length) return { fato: 'Você ainda não cadastrou compromissos. Na aba 📅 Mês dá pra pôr contas fixas, faturas, assinaturas e planos que se repetem, e eu lembro dos vencimentos.', sugestoes: ['O que planejei pro mês?'] };
      const abertos = sit.filter(c => c.status !== 'pago');
      if (!abertos.length && !faturas.length) return { fato: `Tudo pago este mês! ${sit.length} ${sit.length === 1 ? 'compromisso' : 'compromissos'} em dia.`, sugestoes: ['Cabe no mês?'] };
      const lista = [...abertos.map(c => `${c.nome} ${formatBRL(c.faltaCents)}${c.parcial ? ' que falta' : ''}${c.diaNoMes ? ` (${c.status === 'atrasado' ? `venceu dia ${c.diaNoMes}` : `dia ${c.diaNoMes}`})` : ''}`), ...txtFaturas].join('; ');
      const total = abertos.reduce((a, c) => a + c.faltaCents, 0) + totalFaturas;
      const prox = abertos.find(c => c.status === 'atrasado') || abertos[0];
      if (!prox) return { fato: `Falta pagar ${formatBRL(total)}: ${lista}.${dicaFatura}`, sugestoes: ['Cabe no mês?'] };
      return {
        fato: `Falta pagar ${formatBRL(total)} este mês: ${lista}. Já pagou ${prox.nome}? Se sim, confirma que eu lanço.${dicaFatura}`,
        acao: { tipo: 'registrar_gasto', amountCents: prox.faltaCents || prox.valorCents, categoryId: prox.categoryId, date: today, note: prox.nome, compromissoId: prox.id, accountId: prox.accountId },
        sugestoes: ['Cabe no mês?', 'O que planejei pro mês?'],
      };
    }
    case 'planos': {
      const a = analisarPlanejamento(dados, today);
      // 06/11: "o que mais eu tenho planejado?" mostra os planos E o que ainda falta pagar no mês
      const abertos = a.compromissos.filter(c => c.status !== 'pago');
      const contas = abertos.length ? ` Compromissos que faltam: ${abertos.map(c => `${c.nome} ${formatBRL(c.faltaCents)}${c.diaNoMes ? ` (dia ${c.diaNoMes})` : ''}`).join('; ')}.` : '';
      if (!a.planos.length && !abertos.length) return { fato: 'Nada planejado ainda pra este mês. Na aba 📅 Mês você lista o que quer comprar ou gastar, com valores, e eu calculo se cabe.', sugestoes: ['O que tenho pra pagar?'] };
      const lista = a.planos.map(p => `${p.feito ? '✔ ' : ''}${p.nome} ${formatBRL(p.valorCents)}`).join('; ');
      const planos = a.planos.length ? `Planos deste mês: ${lista}. Faltam ${formatBRL(a.planosPendentesCents)}.` : 'Nenhum plano de compra este mês.';
      return { fato: `${planos}${contas} ${textoSobra(a)}`, sugestoes: ['Cabe no mês?', 'O que tenho pra pagar?'] };
    }
    case 'cabe': {
      if (intencao.valor) {
        const c = cabeNoMes(dados, intencao.valor, today);
        if (c.cabe == null) return { fato: semBase() };
        return {
          fato: c.cabe
            ? `Cabe! Somando o que já saiu (${formatBRL(c.gastosCents)}), compromissos (${formatBRL(c.compPendentesCents)}) e planos (${formatBRL(c.planosPendentesCents)}), sobram ${formatBRL(c.sobraCents)}. Depois de ${formatBRL(intencao.valor)}, ficariam ${formatBRL(c.sobraDepois)}.`
            : `Apertado. Hoje a sobra prevista é ${formatBRL(c.sobraCents)}; com ${formatBRL(intencao.valor)} ficaria ${formatBRL(c.sobraDepois)}. ${c.adiar.length ? `Dá pra adiar ${c.adiar.map(p => p.nome).join(', ')}.` : 'Talvez esperar o próximo mês.'}`,
          sugestoes: ['O que tenho pra pagar?', 'O que planejei pro mês?'],
        };
      }
      const a = analisarPlanejamento(dados, today);
      if (a.sobraCents == null) return { fato: semBase() };
      return { fato: textoSobra(a), sugestoes: ['Posso comprar algo de 200?', 'O que tenho pra pagar?'] };
    }
    case 'bancos': {
      const bancos = [...new Set(accounts.map(a => a.bank).filter(b => b && !/carteira|outro/i.test(b)))];
      const saldo = accounts.length ? totalBalance(accounts, expenses, incomes, dados.transferencias || []) : 0;
      const cdi = dados.mercado?.cdi?.valor;
      let conta = '';
      if (cdi) {
        const mensal = Math.pow(1 + cdi / 100, 1 / 12) - 1;
        conta = ` Pra ter a base: o CDI está em ${fmtPct(cdi)} ao ano. Uma conta que paga 100% do CDI rende uns ${fmtPct(mensal * 100)} ao mês${saldo > 0 ? `: com os seus ${formatBRL(saldo)}, seriam cerca de ${formatBRL(Math.round(saldo * mensal))} por mês, antes do imposto` : ''}.`;
      }
      const quais = bancos.length > 1 ? `entre ${bancos.slice(0, -1).join(', ')} e ${bancos[bancos.length - 1]}` : bancos.length ? `do ${bancos[0]}` : 'entre os seus bancos';
      return {
        fato: `Boa pergunta! Comparar o rendimento ${quais} pede dados que mudam toda hora (o percentual do CDI de cada conta ou caixinha).${conta} O jeito certo de comparar: veja no app de cada banco quanto "% do CDI" ele paga; quanto maior, melhor, e confira se o dinheiro fica disponível na hora.`,
        filaIA: bancos.length ? { tipo: 'bancos', bancos, pergunta: intencao.t } : null,
        sugestoes: ['Qual a Selic?', 'Como está o mercado?'],
      };
    }
    case 'ofensiva': {
      const o = ofensiva({ expenses, incomes, diasSemGasto: perfil?.diasSemGasto || [] }, today);
      if (!o.dias) {
        return { fato: `Sua ofensiva está zerada${o.recorde ? ` (seu recorde é ${o.recorde} ${o.recorde === 1 ? 'dia' : 'dias'})` : ''}. Anota um gasto hoje, ou toca em "Hoje não gastei nada" no Início, e o foguinho 🔥 acende de novo.`, sugestoes: ['Quanto gastei hoje?', 'Quanto gastei este mês?'] };
      }
      const dia = n => `${n} ${n === 1 ? 'dia' : 'dias'}`;
      return {
        fato: `${o.dias === 1 ? '🔥 Ofensiva acesa: 1 dia anotando.' : `🔥 Ofensiva de ${o.dias} dias seguidos anotando.`}${o.hojeFeito ? ' Hoje já está garantido.' : ' Falta anotar hoje pra não perder!'} Seu recorde é ${dia(o.recorde)}.`,
        sugestoes: ['Quanto gastei este mês?', 'Quem me deve?'],
      };
    }
    case 'a_receber': {
      const r = aReceber(expenses);
      if (!r.itens.length) return { fato: 'Ninguém te deve nada agora. Quando rachar uma conta, marque "🍕 Dividir com amigos" na hora de lançar o gasto que eu guardo quem deve quanto.', sugestoes: ['Como divido uma conta?'] };
      const porPessoa = new Map();
      for (const x of r.itens) porPessoa.set(x.nome, (porPessoa.get(x.nome) || 0) + x.valorCents);
      const lista = [...porPessoa].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, v]) => `${n} (${formatBRL(v)})`).join(', ');
      return { fato: `Você tem ${formatBRL(r.totalCents)} a receber: ${lista}${porPessoa.size > 5 ? ' e mais gente' : ''}. Quando o Pix cair, toca em "Recebi" na lista "A receber", no Início.`, sugestoes: ['Quanto gastei este mês?'] };
    }
    case 'meus_investimentos': {
      const lista = dados.investimentos || [];
      if (!lista.length) return { fato: 'Você ainda não cadastrou investimentos. Na aba 🏦 Contas, em "📈 Investimentos", você coloca o que tem (CDB, Tesouro, ações, poupança…), quanto aplicou e quanto está valendo. Aí eu acompanho com você.', sugestoes: ['Como está o mercado?'] };
      const r = resumoInvestimentos(lista);
      const sinal = r.ganhoCents >= 0 ? 'rendeu' : 'está abaixo em';
      const maior = r.porTipo[0];
      return {
        fato: `Você tem ${formatBRL(r.atualCents)} investidos em ${r.quantidade} ${r.quantidade === 1 ? 'aplicação' : 'aplicações'}. Aplicou ${formatBRL(r.aplicadoCents)} e ${sinal} ${formatBRL(Math.abs(r.ganhoCents))} (${r.rendimentoPct.toLocaleString('pt-BR')}%). A maior parte está em ${maior.nome} (${maior.pct}%). Lembrando: eu acompanho, mas não recomendo investimento.`,
        sugestoes: ['Como está o mercado?', 'Quanto tenho guardado no total?'],
      };
    }
    case 'mercado': case 'investir': {
      const m = dados.mercado;
      if (!m) {
        return { fato: 'Ainda não tenho dados do mercado. Eles chegam pelo servidor do C.A.O.S. Finanças, todo dia útil às 10h: configure o endereço em Ajustes → IA online. Depois que chegarem, eu guardo e respondo até sem internet.' };
      }
      const agora = new Date(now);
      const quando = quandoFoi(m.atualizadoEm, agora);
      const velho = mercadoVelho(m, agora) ? ' Esse dado já tem alguns dias, pode estar desatualizado.' : '';
      const linhaAtivo = a => textoAtivo(m, a);
      let fato;
      if (intencao.intent === 'investir') {
        const alvo = intencao.ativo || 'IBOV';
        fato = `${linhaAtivo(alvo) || 'Não tenho esse dado agora.'}${m.cdi ? ` Pra comparar: o CDI está em ${fmtPct(m.cdi.valor)} ao ano, que é quanto a renda fixa paga com pouco sobe e desce.` : ''} Se for investir, pensa no prazo e não coloca o dinheiro da reserva de emergência em algo que oscila.`;
      } else if (intencao.ativo) {
        fato = linhaAtivo(intencao.ativo) || 'Esse dado não veio na última atualização.';
      } else {
        fato = ['USD', 'EUR', 'IBOV', 'SELIC'].map(linhaAtivo).filter(Boolean).join(' ');
      }
      return { fato: `${fato} (Atualizado ${quando}.)${velho}`, aviso: true, sugestoes: ['Como está o dólar?', 'A bolsa tende a subir?', 'Qual a Selic?'] };
    }
    case 'como_esta':
      return { gatilho: 'como_esta', vars: { emocao } };
    case 'retomar':
      return {};
    case 'salario_caos':
      return { gatilho: 'salario_caos', vars: {}, sugestoes: ['O que vc acha do JF?', 'Quanto gastei este mês?'] };
    case 'sobre_jf':
      return { gatilho: 'sobre_jf', vars: { criador: IDENTIDADE.criador }, sugestoes: SUG_IDENTIDADE };
    case 'vida':
      return { fato: textoVida(), sugestoes: SUG_IDENTIDADE };
    case 'significado': case 'criador': case 'origem': case 'identidade': case 'piada':
      return { gatilho: intencao.intent, vars: { sigla: IDENTIDADE.sigla, criador: IDENTIDADE.criador, origem: IDENTIDADE.origem, slogan: IDENTIDADE.slogan }, sugestoes: SUG_IDENTIDADE };
    case 'como_funciona':
      return { fato: textoComoFunciona(), sugestoes: ['Quais são suas leis?', 'O que você pode fazer?', 'E os meus dados?'] };
    case 'limites':
      return { fato: textoPodeNaoPode(), sugestoes: ['E os meus dados?', 'Como funciona seu cérebro?', 'Conta uma piada'] };
    case 'privacidade':
      return { fato: textoPrivacidade(), sugestoes: ['O que você pode fazer?', 'Como faço backup?'] };
    case 'tutorial':
      return { fato: TUTORIAL[intencao.tema] || TUTORIAL.geral, sugestoes: ['Como adiciono uma conta?', 'Como ponho orçamento?', 'Como mando foto?'] };
    case 'limite_investido':
      // pesquisado em 13/11/2026 (sites dos bancos e notícias); muda com o tempo, por isso a data e o "confira no app"
      return {
        fato: 'Dá sim! Alguns bancos transformam dinheiro guardado em limite: C6 (Limite Garantido: R$ 1 aplicado vira R$ 1 de limite), Inter (CDB Mais Limite), Nubank (Caixinhas) e PicPay (Cofrinho do cartão). O dinheiro rende, mas fica preso como garantia. Dado de novembro de 2026: confira no app do banco.',
        cru: true, decisao: 'investimento', sugestoes: ['O que é limite garantido?', 'O que é CDB?'],
      };
    case 'ajuda':
      return {
        fato: 'Pode me perguntar dos seus gastos ("quanto gastei em delivery?"), do saldo, do orçamento ou de como o mês vai fechar. Também anoto: manda "gastei 30 no mercado" ou a foto do comprovante. Travou no app? Pergunta "como faço…".',
        sugestoes: SUG_IDENTIDADE,
      };
    default:
      return { gatilho: intencao.intent };
  }
}
