// Conversa com o C.A.O.S. (offline, sem IA): entende a pergunta por palavras-chave e responde com os números
// do motor. Só leitura: quando a pessoa pede um registro ("gastei 30 no mercado"), ele devolve uma PROPOSTA
// ({ acao }) e quem grava é o app, depois do Confirmar (1ª lei).

import {
  formatBRL, parseAmount, periodRange, sumInRange, topCategories, summarizeMonth, forecastMonth,
  incomeIn, monthKey, shiftMonth, monthLabel, accountBalance, accountLabel, totalBalance, analyze,
  spentIn, toISODate, INCOME_SOURCES, situacaoCompromissos, analisarPlanejamento, cabeNoMes, sugerirCategoria, palavrasDe,
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
  transporte: ['transporte', 'uber', 'onibus', 'metro', 'gasolina', 'combustivel', 'estacionamento', 'pedagio', 'taxi', 'carro'],
  moradia: ['moradia', 'aluguel', 'condominio', 'iptu', 'casa'],
  contas: ['contas', 'conta de luz', 'luz', 'agua', 'internet', 'celular', 'telefone', 'gas', 'energia', 'boleto'],
  saude: ['saude', 'farmacia', 'remedio', 'medico', 'consulta', 'exame', 'dentista', 'plano de saude', 'academia'],
  lazer: ['lazer', 'cinema', 'jogo', 'game', 'show', 'festa', 'viagem', 'streaming', 'netflix', 'spotify', 'passeio'],
  compras: ['compras', 'roupa', 'tenis', 'sapato', 'shopping', 'presente', 'eletronico', 'loja', 'shopee', 'amazon'],
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

/** Descobre a intenção. Função pura e testável. */
export function entender(texto, { categories = [] } = {}) {
  const t = norm(texto);
  const r = { t, categoria: acharCategoria(t, categories), periodo: acharPeriodo(t), valor: acharValor(t), fonte: acharFonte(t) };
  const pergunta = /\b(quanto|qual|quais|onde|como|tive|teve|tenho|vai|posso|consigo|algum|alguma)\b|\?/.test(t);

  if (!t) return { ...r, intent: 'nao_entendi' };
  // Registro ("gastei 30 no mercado", "paguei 120 de luz", "recebi 1500 de salario")
  if (r.valor && !/\bquanto\b/.test(t)) {
    if (/\b(recebi|ganhei|entrou|caiu|recebemos|me pagaram)\b/.test(t)) return { ...r, intent: 'registrar_entrada' };
    if (/\b(gastei|paguei|comprei|torrei|saiu|pedi|abasteci|gasto de|gastamos)\b/.test(t)) return { ...r, intent: 'registrar_gasto' };
  }
  // Compromissos, planos e "cabe no mês?" (1.3.0)
  if (/(qual (e )?(o )?meu nome|como (e|eh) meu nome|voce sabe (o )?meu nome|lembra (de )?mim|quem sou eu)/.test(t)) return { ...r, intent: 'meu_nome' };
  const apelido = t.match(/(?:me chama|pode me chamar|me chame) de ([a-z0-9 ]{2,30})$/);
  if (apelido) return { ...r, intent: 'mudar_apelido', apelido: apelido[1].trim() };
  if (/(cabe no (mes|meu bolso|orcamento|bolso)|da pra comprar|posso comprar|consigo comprar|tenho dinheiro pra|vai sobrar|quanto (vai )?sobra)/.test(t)) return { ...r, intent: 'cabe' };
  if (/(o que (eu )?tenho (pra|para) pagar|contas? (do|deste|desse) mes|vencimento|quando vence|o que vence|tenho conta|compromissos?|minhas contas fixas|assinaturas)/.test(t)) return { ...r, intent: 'pagar' };
  if (/(o que (eu )?planejei|meus planos|planejamento|planos? (do|deste|desse|pro|para o) mes|o que (eu )?vou comprar)/.test(t)) return { ...r, intent: 'planos' };
  // Mercado (1.3.0): moedas, bolsa, juros e "vale investir?"
  const ativo = /\b(dolar|dolares|usd)\b/.test(t) ? 'USD' : /\beuros?\b/.test(t) ? 'EUR' : /\blibras?\b/.test(t) ? 'GBP'
    : /\b(bitcoin|btc)\b/.test(t) ? 'BTC' : /peso argentino/.test(t) ? 'ARS' : /\b(bolsa|ibovespa|ibov|b3|acoes)\b/.test(t) ? 'IBOV'
    : /\bselic\b/.test(t) ? 'SELIC' : /\bcdi\b/.test(t) ? 'CDI' : /\b(ipca|inflacao)\b/.test(t) ? 'IPCA' : null;
  if (/((qual|quais|que) (banco|conta|desses|dessas)[a-z ]*(rende|rendimento))|rende mais|melhor rendimento|rendimento (do|da|dos|das|de|nos|nas) (banco|bancos|conta|contas|meu|minha|nubank|picpay|inter|mercado pago|c6|itau|bradesco|caixa|santander|pagbank)|onde (eu )?(deixo|guardo|coloco) (o |meu )?dinheiro|comparar (os )?bancos/.test(t)) return { ...r, intent: 'bancos' };
  if (/(vale (a pena )?investir|devo investir|investir em|boa hora (pra|para) (comprar|investir)|compensa (comprar|investir)|tende a (subir|cair|crescer))/.test(t)) return { ...r, intent: 'investir', ativo };
  if (ativo || /(mercado financeiro|como (esta|ta) o mercado|cotacao|cotacoes|cambio|moedas)/.test(t)) return { ...r, intent: 'mercado', ativo };
  // Quem ele é (identidade): vem antes de tudo que não é registro
  if (/(o que (significa|quer dizer)|significado|sigla).*(caos|seu nome|nome)|caos significa|o que e caos|o que e o caos/.test(t)) return { ...r, intent: 'significado' };
  if (/(quem (te |o )?(criou|fez|programou|inventou|desenvolveu|construiu)|seu criador|seu pai|seu dono|quem e (o )?jf|quem manda em voce)/.test(t)) return { ...r, intent: 'criador' };
  if (/(de onde (voce )?(veio|vem|surgiu|saiu)|sua origem|sua historia|onde (voce )?nasceu|projeto perfil|veio do perfil)/.test(t)) return { ...r, intent: 'origem' };
  if (/(como voce funciona|como (e|funciona) (o )?seu cerebro|seu cerebro|sistema nervoso|sua espinha|seus bracos|voce pensa|voce sente|como voce e feito|do que voce e feito)/.test(t)) return { ...r, intent: 'como_funciona' };
  if (/(o que voce (nao )?pode|o que voce nao faz|seus limites|voce (pode|consegue) (mexer|apagar|alterar|gastar|acessar|ver)|acessa (meu|o) banco|ve minha conta|minhas regras|suas regras|suas leis)/.test(t)) return { ...r, intent: 'limites' };
  if (/(quem e voce|quem (e|eh) tu|quem es tu|o que (e|eh) voce|se apresent|apresente.se|qual (e )?(o )?seu nome|como (voce )?se chama|voce e (uma )?(ia|inteligencia|robo|humano|gente|pessoa)|^caos\??$)/.test(t)) return { ...r, intent: 'identidade' };
  if (/(piada|me faz rir|algo engracado|anedota|charada|me alegra)/.test(t)) return { ...r, intent: 'piada' };
  // Ensinar a usar o app ("como faço pra lançar um gasto?")
  const verboComo = /\b(como|onde)\b.*\b(faco|faz|fazer|coloco|colocar|cadastro|cadastrar|adiciono|adicionar|lanco|lancar|registro|registrar|anoto|anotar|crio|criar|mudo|mudar|troco|trocar|ativo|ativar|ligo|ligar|uso|usar|mando|mandar|envio|enviar|instalo|instalar|exporto|exportar|importo|importar|defino|definir|ponho|por|vejo|ver|apago|apagar|configuro|configurar)\b/;
  if (/(economiz|poupar|guardar dinheiro|gastar menos)/.test(t)) return { ...r, intent: 'dica' };
  if (verboComo.test(t) || /(me ensina|tutorial|passo a passo|como usa(r)? o app|como funciona o app)/.test(t)) {
    const TEMAS = [
      ['entrada', /(entrada|salario|rendimento|receita|recebi|ganho)/],
      ['orcamento', /(orcamento|limite|meta de gasto)/],
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
  if (/\b(te amo|voce e (o )?(melhor|demais|incrivel|genial|otimo)|gosto de voce|lindo|parabens caos)\b/.test(t)) return { ...r, intent: 'elogio' };
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

const SUG_IDENTIDADE = ['O que você pode fazer?', 'Como funciona seu cérebro?', 'Conta uma piada', 'Quanto gastei este mês?'];

// Passo a passo de cada parte do app (o C.A.O.S. também instrui)
const TUTORIAL = {
  gasto: 'Pra anotar um gasto: aba ➕ Lançar, deixa em 💸 Gasto, digita o valor, escolhe a categoria e toca em Adicionar. Ou me fala aqui: "gastei 30 no mercado", que eu preparo e você confirma.',
  entrada: 'Pra anotar uma entrada: aba ➕ Lançar, toca em 💰 Entrada, digita o valor, escolhe de onde veio (salário, freela, rendimentos…) e toca em Adicionar. Ou me fala: "recebi 1500 de salário".',
  orcamento: 'Pra pôr orçamento: aba ⚙️ Ajustes → Orçamentos, e coloca o limite do mês em cada categoria. Deixa vazio onde não quiser limite. Aí eu aviso em 80% e quando estourar.',
  conta: 'Pra adicionar uma conta: aba 🏦 Contas, escolhe o banco, coloca o saldo que aparece no app do banco e toca em Adicionar conta. Depois, ao lançar, escolhe a conta e eu acompanho o saldo. De vez em quando, toca em Atualizar saldo pra acertar com o banco.',
  foto: 'Pra mandar foto: em ➕ Lançar, toca em 📷 Foto do comprovante; ou aqui na conversa, no 📎. Com a IA online ligada (Ajustes), eu leio o valor sozinho e você só confirma.',
  lembrete: 'Pra ligar os lembretes: ⚙️ Ajustes → Lembretes, liga a chave e escolhe o horário. No iPhone só funciona com o app instalado na tela inicial e o servidor configurado.',
  instalar: 'Pra instalar: no Android, menu do Chrome → Instalar app. No iPhone, no Safari: Compartilhar → Adicionar à Tela de Início. No PC, o ícone de instalar na barra de endereço.',
  backup: 'Pra fazer backup: ⚙️ Ajustes → Backup → Exportar backup. Pra levar pra outro aparelho, abre o app lá e usa Importar backup com o arquivo. As fotos não entram no backup.',
  ia: 'A IA online é opcional: ⚙️ Ajustes → IA online, cola o endereço do servidor, liga e toca em Testar conexão. Ela lê foto de comprovante e responde o que eu não entendo sozinho.',
  humor: 'Pra mudar meu jeito: ⚙️ Ajustes → C.A.O.S. Humor Suave (gentil, o padrão), Normal ou Ácido (zoeira liberada). Ali também liga a minha voz.',
  apagar: 'Pra apagar um lançamento: na aba 🏠 Início, em Lançamentos do mês, toca no × do lado dele. Eu mesmo não apago nada: essa é uma das minhas leis.',
  geral: 'O app tem 5 abas: 🏠 Início (resumo e alertas), ➕ Lançar (gastos e entradas), 💬 C.A.O.S. (eu!), 🏦 Contas (bancos e saldos) e ⚙️ Ajustes (orçamentos, humor, lembretes, backup). Pergunta "como lanço um gasto?" ou "como ponho orçamento?" que eu explico cada uma.',
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
  const base = a.baseTipo === 'entradas' ? `das entradas (${formatBRL(a.baseCents)})` : `do orçamento (${formatBRL(a.baseCents)})`;
  const partes = `já saiu ${formatBRL(a.gastosCents)}, faltam ${formatBRL(a.compPendentesCents)} de compromissos e ${formatBRL(a.planosPendentesCents)} de planos`;
  if (a.sobraCents >= 0) return `Cabe no mês: ${partes}, e ainda sobram ${formatBRL(a.sobraCents)} ${base}.`;
  return `Não cabe tudo: ${partes}, e faltariam ${formatBRL(-a.sobraCents)} ${base}.${a.adiar.length ? ` Dá pra adiar ${a.adiar.map(p => `${p.nome} (${formatBRL(p.valorCents)})`).join(', ')}.` : ''}`;
}

function semBase() {
  return 'Pra eu calcular se cabe, preciso de uma base: lança suas entradas do mês (salário, extras) ou define orçamentos em Ajustes.';
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
      return {
        gatilho: 'proposta_registro',
        vars: { valor: formatBRL(intencao.valor), categoria: cat?.name ?? 'Outros' },
        acao: { tipo: 'registrar_gasto', amountCents: intencao.valor, categoryId: cat?.id ?? 'outros', date: today,
          note: desc ? desc[0].toUpperCase() + desc.slice(1) : '' },
        aprendeu: !!aprendida,
      };
    }
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
    case 'saldo': {
      if (!accounts.length) {
        return { fato: 'Você ainda não cadastrou nenhuma conta. Vai na aba Contas, escolhe o banco e coloca o saldo atual.', sugestoes: ['Quanto gastei este mês?'] };
      }
      const t = intencao.t;
      const uma = accounts.find(a => t.includes(norm(a.bank)) || (a.nickname && t.includes(norm(a.nickname))));
      if (uma) {
        return { fato: `${accountLabel(uma)}: saldo estimado de ${formatBRL(accountBalance(uma, expenses, incomes))}.`, sugestoes: ['Algum alerta?'] };
      }
      const lista = accounts.map(a => `${accountLabel(a)} ${formatBRL(accountBalance(a, expenses, incomes))}`).join(', ');
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
      const c = top[0];
      const corte = Math.round(c.totalCents * 0.15);
      const semOrc = categories.filter(x => !x.budgetCents).length;
      return {
        fato: `Sua maior categoria no mês é ${c.emoji} ${c.name} (${formatBRL(c.totalCents)}). Cortar 15% dela daria ${formatBRL(corte)} de folga.${semOrc ? ` E ${semOrc} categorias estão sem orçamento: definir um limite ajuda a segurar.` : ''}`,
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
      if (!a.planos.length) return { fato: 'Nada planejado ainda pra este mês. Na aba 📅 Mês você lista o que quer comprar ou gastar, com valores, e eu calculo se cabe.', sugestoes: ['O que tenho pra pagar?'] };
      const lista = a.planos.map(p => `${p.feito ? '✔ ' : ''}${p.nome} ${formatBRL(p.valorCents)}`).join('; ');
      return { fato: `Planos deste mês: ${lista}. Faltam ${formatBRL(a.planosPendentesCents)}. ${textoSobra(a)}`, sugestoes: ['Cabe no mês?', 'O que tenho pra pagar?'] };
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
    case 'mercado': case 'investir': {
      const m = dados.mercado;
      if (!m) {
        return { fato: 'Ainda não tenho dados do mercado. Eles chegam pelo servidor da Carteira, todo dia útil às 10h: configure o endereço em Ajustes → IA online. Depois que chegarem, eu guardo e respondo até sem internet.' };
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
    case 'significado': case 'criador': case 'origem': case 'identidade': case 'piada':
      return { gatilho: intencao.intent, vars: { sigla: IDENTIDADE.sigla, criador: IDENTIDADE.criador, origem: IDENTIDADE.origem }, sugestoes: SUG_IDENTIDADE };
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
