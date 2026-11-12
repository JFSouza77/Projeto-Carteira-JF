// Conversa com o C.A.O.S. (offline, sem IA): entende a pergunta por palavras-chave e responde com os números
// do motor. Só leitura: quando a pessoa pede um registro ("gastei 30 no mercado"), ele devolve uma PROPOSTA
// ({ acao }) e quem grava é o app, depois do Confirmar (1ª lei).

import {
  formatBRL, parseAmount, periodRange, ofensiva, aReceber, comReforco, sumInRange, topCategories, summarizeMonth, forecastMonth,
  incomeIn, monthKey, shiftMonth, monthLabel, accountBalance, accountLabel, totalBalance, analyze,
  spentIn, toISODate, INCOME_SOURCES, situacaoCompromissos, analisarPlanejamento, cabeNoMes, sugerirCategoria, palavrasDe, faturaDoCartao, progressoMeta, resumoInvestimentos,
} from '../engine.js';
import { IDENTIDADE, textoAnatomia, textoPodeNaoPode } from './identidade.js';
import { textoTendencia, quandoFoi, mercadoVelho } from '../mercado.js';

const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\bc\.\s?a\.\s?o\.\s?s\b\.?/g, 'caos') // "C.A.O.S." = "caos"
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
  cc: 'cartao', vr: 'restaurante', va: 'mercado', xopi: 'shopee', chopi: 'shopee', xopee: 'shopee', mercadolivre: 'mercado livre', ml: 'mercado livre',
};
export function expandirGirias(t) {
  return String(t).split(' ').map(w => GIRIAS[w] ?? w).join(' ');
}

export function entender(texto, { categories = [], anterior = null } = {}) {
  const r0 = entenderSimples(corrigirDigitacao(expandirGirias(norm(texto)), categories.map(c => norm(c.name))), { categories });
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
  const r = { t, categoria: acharCategoria(t, categories), periodo: acharPeriodo(t), valor: acharValor(t), fonte: acharFonte(t) };
  const pergunta = /\b(quanto|qual|quais|onde|como|tive|teve|tenho|vai|posso|consigo|algum|alguma)\b|\?/.test(t);

  if (!t) return { ...r, intent: 'nao_entendi' };
  // Registro ("gastei 30 no mercado", "paguei 120 de luz", "recebi 1500 de salario")
  if (r.valor && !/\bquanto\b/.test(t)) {
    if (/\b(recebi|recebo|ganhei|ganho|entrou|caiu|recebemos|me pagaram)\b/.test(t)) return { ...r, intent: 'registrar_entrada' };
    if (/\b(gastei|paguei|comprei|torrei|saiu|pedi|abasteci|gasto de|gastamos|passei|deixei|foram|foi)\b/.test(t)) return { ...r, intent: 'registrar_gasto' };
    // Anotação curta, sem verbo, do jeito de quem anota num papel: "uber 30", "50 no posto" (achado do Gemini, 06/11)
    const curtinha = t.split(' ').length <= 5 && !pergunta && !/\b(meta|guardei|juntei|poupei|investi)\b/.test(t);
    if (curtinha && (r.categoria || descricaoDe(t) || /^[a-z]+ \d/.test(t) || /^\d+([.,]\d+)? [a-z]/.test(t))) return { ...r, intent: 'registrar_gasto' };
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
  if (/(cartao|fatura|limite (do|no) cartao)/.test(t) && !/\b(como|onde|quero|preciso|queria)\b.*\b(cadastr|adicion|registr|coloc|ponho|crio|criar)/.test(t)) return { ...r, intent: 'cartao' };
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
  if (/(de onde (voce )?(veio|vem|surgiu|saiu)|sua origem|sua historia|onde (voce )?nasceu|projeto perfil|veio do perfil)/.test(t)) return { ...r, intent: 'origem' };
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
  if (/\b(burro|idiota|inutil|lixo|chato|odeio voce|merda|porcaria)\b/.test(t)) return { ...r, intent: 'xingamento' };
  if (/\b(te amo|voce e (o )?(muito )?(melhor|demais|incrivel|genial|otimo|legal|top|brabo|foda)|gosto de voce|lindo|parabens caos)\b/.test(t)) return { ...r, intent: 'elogio' };
  if (/(como voce (esta|ta)|tudo bem com voce|como (vai|ta) voce|seu humor|voce esta bem)/.test(t)) return { ...r, intent: 'como_esta' };
  if (/\b(alerta|alertas|problema|como estou|como to|como esta (minha|a) (situacao|carteira)|situacao|resumo|radar)\b/.test(t)) return { ...r, intent: 'alertas' };
  if (/(rendimento|recebi|entrada|entradas|salario|ganhei|renda|entrou|receita|dividendo|juros)/.test(t)) return { ...r, intent: 'entradas' };
  if (/\b(saldo|quanto tenho|dinheiro na conta|na conta|nas contas|tenho no banco)\b/.test(t)) return { ...r, intent: 'saldo' };
  if (/(maior gasto|mais gastei|gastei mais|com o que (mais )?gast|onde (mais )?gast|categoria que mais|top|ranking|principal gasto)/.test(t)) return { ...r, intent: 'maior_gasto' };
  if (/(previsao|vai dar|fim do mes|ritmo|vou conseguir|chegar ao fim|projecao|aguenta)/.test(t)) return { ...r, intent: 'previsao' };
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
    const f = forecastMonth(expenses, mes, today);
    return `Vou por partes. Até hoje (dia ${f.day} de ${f.daysTotal}) você gastou ${formatBRL(f.spentCents)}. Tirando as contas fixas (${formatBRL(f.fixosCents)}), dá uma média de ${formatBRL(f.perDayCents)} por dia. Se continuar nesse ritmo até o dia ${f.daysTotal}, o mês fecha perto de ${formatBRL(f.projectedCents)}. É uma estimativa: se você gastar menos nos próximos dias, ela cai.`;
  }
  if (['gasto_total', 'gasto_categoria', 'maior_gasto', 'onde_gastei'].includes(intent)) {
    const s = summarizeMonth(expenses, categories, mes);
    const top = s.rows.filter(r => r.spentCents > 0).sort((a, b) => b.spentCents - a.spentCents).slice(0, 3);
    if (!top.length) return 'Ainda não tem gasto anotado neste mês, então não tem o que somar. Quando você lançar, eu mostro quanto foi em cada categoria.';
    return `Vou por partes. Eu somo tudo que você anotou no mês, separado por tipo de gasto (categoria). Os maiores: ${top.map(r => `${r.name} ${formatBRL(r.spentCents)}`).join(', ')}. Somando tudo dá ${formatBRL(s.totalCents)}. Quer ver uma categoria por dentro? Pergunta tipo "quanto gastei em ${top[0].name.toLowerCase()}?".`;
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
  return palavrasDe(m[1]).slice(0, 3).join(' ');
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
      const desc = descricaoDe(intencao.t);
      // categoria: pela palavra (sinônimos) ou pelo que ele aprendeu com o histórico da pessoa
      const aprendida = !intencao.categoria && desc ? sugerirCategoria(desc, expenses) : null;
      const cat = intencao.categoria || (aprendida && categories.find(c => c.id === aprendida.categoryId))
        || categories.find(c => c.id === 'outros') || categories[0];
      const recorrente = /\b(internet|luz|energia|agua|aluguel|condominio|netflix|spotify|streaming|academia|plano|celular|telefone|assinatura|mensalidade|escola|faculdade|seguro|gas)\b/.test(intencao.t)
        || ['contas', 'moradia', 'streaming'].includes(cat?.id);
      return {
        gatilho: 'proposta_registro',
        dica: recorrente ? 'Isso parece conta de todo mês. Se for, cadastra em 📅 Mês → Contas fixas que eu passo a lembrar do vencimento e já entra no planejamento.' : null,
        vars: { valor: formatBRL(intencao.valor), categoria: cat?.name ?? 'Outros' },
        acao: { tipo: 'registrar_gasto', amountCents: intencao.valor, categoryId: cat?.id ?? 'outros', date: today,
          note: desc ? desc[0].toUpperCase() + desc.slice(1) : '' },
        aprendeu: !!aprendida,
      };
    }
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
        acao: { tipo: 'registrar_entrada', amountCents: intencao.valor, sourceId: fonte.id, date: today, note: '' },
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
        const f = faturaDoCartao(comReforco(c, accounts, expenses, incomes), expenses, today);
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
        return { fato: `${accountLabel(uma)}: saldo estimado de ${formatBRL(accountBalance(uma, expenses, incomes))}.`, sugestoes: ['Algum alerta?'] };
      }
      const lista = contas.map(a => `${accountLabel(a)} ${formatBRL(accountBalance(a, expenses, incomes))}`).join(', ');
      return {
        fato: `Saldo estimado total: ${formatBRL(totalBalance(accounts, expenses, incomes))} (${lista}). É o saldo que você informou mais o que foi lançado depois.`,
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
      const f = forecastMonth(expenses, mes, today);
      const s = summarizeMonth(expenses, categories, mes);
      const inc = incomeIn(incomes, mes);
      let fato = `No ritmo atual (${formatBRL(f.perDayCents)} por dia), o mês deve fechar em ${formatBRL(f.projectedCents)}.`;
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
      const sit = situacaoCompromissos(compromissos, expenses, today).filter(c => c.noMes);
      if (!compromissos.length) return { fato: 'Você ainda não cadastrou compromissos. Na aba 📅 Mês dá pra pôr contas fixas, faturas, assinaturas e planos que se repetem, e eu lembro dos vencimentos.', sugestoes: ['O que planejei pro mês?'] };
      const abertos = sit.filter(c => c.status !== 'pago');
      if (!abertos.length) return { fato: `Tudo pago este mês! ${sit.length} ${sit.length === 1 ? 'compromisso' : 'compromissos'} em dia.`, sugestoes: ['Cabe no mês?'] };
      const lista = abertos.map(c => `${c.nome} ${formatBRL(c.faltaCents)}${c.parcial ? ' que falta' : ''}${c.diaNoMes ? ` (${c.status === 'atrasado' ? `venceu dia ${c.diaNoMes}` : `dia ${c.diaNoMes}`})` : ''}`).join('; ');
      const total = abertos.reduce((a, c) => a + c.faltaCents, 0);
      const prox = abertos.find(c => c.status === 'atrasado') || abertos[0];
      return {
        fato: `Falta pagar ${formatBRL(total)} este mês: ${lista}. Já pagou ${prox.nome}? Se sim, confirma que eu lanço.`,
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
      const saldo = accounts.length ? totalBalance(accounts, expenses, incomes) : 0;
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
    case 'significado': case 'criador': case 'origem': case 'identidade': case 'piada':
      return { gatilho: intencao.intent, vars: { sigla: IDENTIDADE.sigla, criador: IDENTIDADE.criador, origem: IDENTIDADE.origem, slogan: IDENTIDADE.slogan }, sugestoes: SUG_IDENTIDADE };
    case 'como_funciona':
      return { fato: `Sou uma IA de bolso, montada em camadas. ${textoAnatomia()} Funciono offline; com a IA online ligada, ganho um reforço pra perguntas livres e fotos.`, sugestoes: SUG_IDENTIDADE };
    case 'limites':
      return { fato: textoPodeNaoPode(), sugestoes: SUG_IDENTIDADE };
    case 'tutorial':
      return { fato: TUTORIAL[intencao.tema] || TUTORIAL.geral, sugestoes: ['Como adiciono uma conta?', 'Como ponho orçamento?', 'Como mando foto?'] };
    case 'ajuda':
      return {
        fato: 'Eu analiso e observo sua carteira. Pode me perguntar sobre gastos ("quanto gastei em delivery?"), entradas ("tive rendimentos?"), saldo, orçamento, alertas, previsão do mês, pedir uma dica ou uma piada. Pode mandar "gastei 30 no mercado" que eu preparo o registro pra você confirmar, mandar foto de comprovante e perguntar "como faço…" que eu ensino a usar o app.',
        sugestoes: SUG_IDENTIDADE,
      };
    default:
      return { gatilho: intencao.intent };
  }
}
