// Conversa com o C.A.O.S. (offline, sem IA): entende a pergunta por palavras-chave e responde com os números
// do motor. Só leitura: quando a pessoa pede um registro ("gastei 30 no mercado"), ele devolve uma PROPOSTA
// ({ acao }) e quem grava é o app, depois do Confirmar (1ª lei).

import {
  formatBRL, parseAmount, periodRange, ofensiva, aReceber, comReforco, sumInRange, topCategories, summarizeMonth, forecastMonth,
  incomeIn, monthKey, shiftMonth, monthLabel, accountBalance, accountLabel, totalBalance, analyze, folgaDoPiso, dividirEntrePisos, resumoPisos, sugerirTransferencias,
  spentIn, toISODate, INCOME_SOURCES, idadeDe, faixaEtaria, situacaoCompromissos, analisarPlanejamento, cabeNoMes, sugerirCategoria, palavrasDe, faturaDoCartao, progressoMeta, resumoInvestimentos,
  formiguinhas, FORMIGA_LIMITE_CENTS,
} from '../engine.js';
import { IDENTIDADE, textoPodeNaoPode, textoVida, textoComoFunciona, textoPrivacidade } from './identidade.js';
import { acharTermo, ATUALIZADO_EM, GLOSSARIO } from './glossario.js';
import { acharMoedaJogo, lerPacote, DICA_SEGURANCA, MOEDAS_JOGOS } from './moedas_jogos.js';
import { lerPorcentagem, textoPorcentagem, lerOfertas, analisarOfertas, textoOfertas, lerOfertaUnica, textoOfertaUnica } from './ofertas.js';

const GLOSSARIO_POR_TERMO = new Map(GLOSSARIO.map(g => [g.termo, g]));
import { textoTendencia, quandoFoi, mercadoVelho } from '../mercado.js';

const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\bc\.\s?a\.\s?o\.\s?s\b\.?/g, 'caos') // "C.A.O.S." = "caos"
  .replace(/%/g, ' porcento ') // "1%" vira "1 porcento" (a calculadora de juros precisa)
  .replace(/\braspadinha (de )?(gelo|morango|uva|limao|groselha|frutas?|maracuja|abacaxi)\b/g, 'sorvete de $2') // 2.3.0.1: essa raspadinha é de comer
  .replace(/[^\w\s,.$+*/×÷-]/g, ' ').replace(/\s+/g, ' ').trim(); // + * / × ÷ ficam: matemática básica (13/11)

// Palavras que levam a cada categoria (além do próprio nome dela)
const SINONIMOS = {
  mercado: ['mercado', 'supermercado', 'feira', 'acougue', 'padaria', 'hortifruti', 'atacadao', 'compras do mes', 'cerveja', 'refrigerante', 'bebida'],
  delivery: ['delivery', 'ifood', 'i food', 'rappi', 'pedido de comida', 'pedi comida', 'lanche em casa'],
  restaurante: ['restaurante', 'almoco', 'jantar', 'lanche', 'lanchonete', 'bar', 'cafe', 'pizzaria', 'hamburguer', 'sorvete', 'casquinha', 'acai', 'pastel', 'salgado', 'coxinha', 'mcdonalds', 'mcdonald s', 'mc donalds', 'burger king', 'subway', 'bobs'],
  transporte: ['transporte', 'uber', '99', 'onibus', 'metro', 'gasolina', 'combustivel', 'estacionamento', 'pedagio', 'taxi', 'carro', 'posto', 'etanol', 'alcool', 'diesel'],
  moradia: ['moradia', 'aluguel', 'condominio', 'iptu', 'casa'],
  contas: ['contas', 'conta de luz', 'luz', 'agua', 'internet', 'celular', 'telefone', 'gas', 'energia', 'boleto'],
  saude: ['saude', 'farmacia', 'remedio', 'medico', 'consulta', 'exame', 'dentista', 'plano de saude', 'academia'],
  lazer: ['lazer', 'cinema', 'show', 'festa', 'viagem', 'passeio',
    // 2.3.0.1 (JF): as fezinhas (loteria) contam como Lazer
    'mega sena', 'megasena', 'mega da virada', 'quina', 'lotofacil', 'lotomania', 'dupla sena', 'timemania', 'dia de sorte', 'super sete', 'loteria', 'loterica', 'raspadinha', 'raspadinhas', 'fezinha', 'bolao'],
  // revisão do Gemini (16/11): jogo tinha ficado em Lazer depois que a categoria Jogos nasceu (2.2.8)
  jogos: ['jogos', 'jogo', 'game', 'games', 'steam', 'psn', 'xbox', 'nintendo', 'skin', 'passe de batalha', 'robux', 'vbucks'],
  // Streaming (06/11, pedido do JF): fica explícito, separado de Lazer e de Contas
  streaming: ['streaming', 'netflix', 'mercado play', 'disney', 'disney plus', 'hbo', 'hbo max', 'max', 'paramount',
    'paramount plus', 'prime video', 'amazon prime', 'globoplay', 'apple tv', 'crunchyroll', 'spotify', 'deezer',
    'youtube premium', 'star plus', 'telecine', 'assinatura de filme'],
  compras: ['compras', 'roupa', 'tenis', 'sapato', 'shopping', 'presente', 'eletronico', 'loja', 'shopee', 'amazon', 'mercado livre', 'shein', 'aliexpress'],
  // Educação (JF, 13/11): faculdade e bolsa de estudos
  educacao: ['educacao', 'faculdade', 'mensalidade', 'curso', 'escola', 'colegio', 'material escolar', 'livro', 'apostila', 'matricula', 'pos graduacao', 'pos', 'ingles', 'idiomas', 'cursinho', 'universidade', 'fies'],
  outros: ['outros', 'outro', 'diversos'],
};

const FONTES = {
  salario: ['salario', 'pagamento', 'holerite', 'vale'],
  freela: ['freela', 'freelance', 'bico', 'extra', 'servico', 'trampo', 'plantao', 'plantoes', 'hora extra', 'horas extras'], // 2.3.0: plantão é extra
  rendimento: ['rendimento', 'rendimentos', 'juros', 'dividendo', 'dividendos', 'investimento', 'cdb', 'poupanca', 'tesouro'],
  presente: ['presente', 'pix', 'me deu', 'ganhei', 'mesada'],
  outros: ['outros', 'outro'],
};

function acharCategoria(t, categorias) {
  let melhor = null;
  const temJogos = categorias.some(c => c.id === 'jogos'); // sem a categoria Jogos, jogo continua em Lazer
  for (const c of categorias) {
    const chaves = [norm(c.name), ...(SINONIMOS[c.id] || []), ...(c.id === 'lazer' && !temJogos ? SINONIMOS.jogos : [])];
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

// Pergunta de "quanto custa / em média / o que é mais barato" (2.3.2): resposta curta, pesquisada pela IA
const CUSTO_MEDIO = /(em media|media nacional|preco medio|valor medio|custo medio|quanto (ta|esta|anda) custando|quanto (custa|custaria|sai|saia|sairia|cobram|cobra)|quanto (eu )?(pago|pagaria|vou pagar) (pra|para|por)|quanto (e|eh|fica) (pra|para) (tirar|fazer|emplacar|transferir|regularizar|renovar)|(o que|qual) (costuma ser|e|eh|sai) mais (barato|em conta)|mais barato ficar|custa caro)/;

// ---------- Foco da conversa (2.3.1, JF 17/11) ----------
// A Anne testou e achou que o C.A.O.S. "se perdeu na IA": respondia produtor dos Vingadores e distância entre
// estados, virando chatbot comum. Agora a pessoa escolhe em Ajustes: "Só finanças" (padrão) ou "Papo livre". No foco,
// pergunta sem nada de dinheiro não vai pra IA: ele responde aqui, de um jeito amigável, e puxa de volta pro dinheiro.
const DE_DINHEIRO = /\b(dinheiro|grana|reais|real|r\$|gast\w*|pag\w*|compr\w*|vend\w*|prec\w*|cust\w*|car[oa]s?|barat\w*|salari\w*|renda|contas|conta (de|do|da|no|na|bancaria|corrente|fixa|poupanca)|minha conta|na conta|banco|bancos|cartao|cartoes|fatura|credito|debito|pix|boleto|invest\w*|juros|rend\w*|poup\w*|econom\w*|orcament\w*|divida\w*|emprestimo\w*|financ\w*|impost\w*|taxa\w*|tarifa\w*|valor\w*|lucr\w*|prejuizo|bolsa|acoes|dolar\w*|euro\w*|moeda\w*|cripto\w*|bitcoin|aluguel|parcel\w*|desconto\w*|promoc\w*|ofert\w*|loja\w*|frete|ingresso\w*|passage\w*|orcar|troco|mesada|heranca|seguro\w*|aposentad\w*|inss|fgts|cdb|tesouro|selic|inflacao|cotac\w*|bilheteria|fatur\w*|ganh(o|os|ar|a|ei|amos)|negocio\w*|empresa\w*|empreend\w*|freela\w*|emprego\w*|trabalho|plantao|piso|pib|loteria|aposta\w*|premio\w*|cofrinho|caixinha|meta|metas|boleto|cobranca\w*|golpe\w*|vale a pena|quanto (custa|custou|sai|saiu|fica|ficou|vale|ganha|paga|gasta|gastei|rende|cobra|tenho|devo))\b/;
/** A pergunta tem a ver com dinheiro? (o foco "Só finanças" só manda pra IA o que tiver) */
export function assuntoDeDinheiro(texto) {
  return DE_DINHEIRO.test(norm(texto));
}
const SENTIMENTO = /\b(traiu|traicao|terminou|terminamos|separ\w*|brig\w*|chorei|chorando|triste|tristeza|deprimid\w*|depressao|ansios\w*|ansiedade|sozinh\w*|magoad\w*|coracao partido|luto|morreu|faleceu|solidao)\b/;
// 5 jeitos de voltar pro foco (regra do 0 ou 5)
const FORA_DO_FOCO = Object.freeze([
  'Essa foge do meu quintal: eu sou especialista em dinheiro, não em tudo. Pra isso, o Google resolve rapidinho. Agora, se tiver gasto pra anotar ou conta pra fazer, é comigo!',
  'Boa pergunta, mas eu sou do time das finanças. Pergunta pro Google que ele sabe. Enquanto isso: quer ver como está o seu mês?',
  'Aí você me pegou fora da minha área! Eu cuido do seu dinheiro: gastos, contas, metas e planos. Pra essa, melhor uma busca na internet.',
  'Eu até queria saber, mas meu cérebro é todo de finanças. Pra essa, vale o Google. Se tiver algo de dinheiro no meio, me conta que eu ajudo.',
  'Isso não é bem a minha praia: eu sou o parceiro do seu bolso. Se quiser só bater papo comigo, liga o "Papo livre" em Ajustes. Fora isso, bora pras contas?',
]);
/** Resposta sem IA pra pergunta fora do foco. Desabafo ganha acolhimento, não "pergunta pro Google". */
export function respostaForaDoFoco(texto, rng = Math.random) {
  if (SENTIMENTO.test(norm(texto))) {
    return 'Poxa, sinto muito. Eu não sou bom de conselho do coração, mas tô aqui. Se o peso estiver grande, o CVV atende de graça no 188, a qualquer hora. E uma dica de amigo: nada de decisão de dinheiro no calor da emoção (compra por impulso, pagar coisa por alguém). Quando quiser, a gente cuida das finanças junto.';
  }
  return FORA_DO_FOCO[Math.floor(rng() * FORA_DO_FOCO.length) % FORA_DO_FOCO.length];
}

// ---------- Papo livre com freio (2.3.3.4, JF 17/11) ----------
// JF: "papo livre não é ficar respondendo filme em cartaz, times de futebol, capital de país: gasta crédito à toa e
// ele perde o foco". No Papo livre ele conversa (como você está, desabafo, opinião, brincadeira), mas pergunta de
// curiosidade/pesquisa sem nada de dinheiro não vai pra IA: ele indica um chat de uso geral e volta pro bolso.
// pergunta direta (qual, quem, onde…) conta como pesquisa, menos quando é sobre ele ("qual sua comida favorita?" é papo)
const INTERROGA = /\b(qual|quais|quem|onde|quando|quantos|quantas|que horas|que dia|em que ano)\b/;
const SOBRE_ELE = /\b(voce|vc|seu|sua|seus|suas|tu|te|caos)\b/;
const PESQUISA_GERAL = /\b(capita(l|is)|pais|paises|estado|cidade|distancia|km de|filmes?|cartaz|cinema|series?|novelas?|episodio|temporada|atores?|atriz|elenco|diretor|produtor\w*|musicas?|cantor\w*|banda|album|letra da|times?|futebol|campeonato|brasileirao|copa|jogo de ontem|placar|escalacao|jogador\w*|tabela|classificacao|receita de|como (se )?(faz|fazer|cozinha)|historia d[aoe]|guerra|presidente|governador|prefeito|eleic\w*|traduz\w*|traducao|em ingles|significa|significado|definicao|previsao do tempo|clima|temperatura|horoscopo|signo|curiosidade sobre|me (conta|fala|explica) (sobre|quem|o que|como)|o que (e|eh|foi|aconteceu)|por que o|porque o|resumo d[aoe]|livro|autor|planeta|universo|animal|doenca|sintoma|remedio|codigo|programa(r|cao)|python|javascript)\b/;
/** No Papo livre: é pergunta de pesquisa geral (sem dinheiro), daquelas que um chat comum responde melhor? */
export function perguntaDePesquisaGeral(texto) {
  const t = norm(texto);
  const pesquisa = PESQUISA_GERAL.test(t) || (INTERROGA.test(t) && !SOBRE_ELE.test(t));
  return pesquisa && !assuntoDeDinheiro(texto) && !SENTIMENTO.test(t);
}
// 5 jeitos de indicar outro chat (regra do 0 ou 5)
const PAPO_LIVRE_FREIO = Object.freeze([
  'Gosto do papo, mas nessa eu não sou o melhor guia: sou só uma IA de bolso, feita pras suas finanças. Pra esse tipo de pergunta, o ChatGPT, o Gemini, o Copilot ou o Claude (que é excelente nisso) resolvem bem. Se tiver dinheiro no meio, volta aqui!',
  'Ih, essa é de enciclopédia! Eu sou uma IA de bolso, meu forte é o seu dinheiro. Pra curiosidade assim, vai de ChatGPT, Gemini, Copilot ou Claude. Enquanto isso, quer ver como está o seu mês?',
  'Eu até bato papo, mas pesquisa de tudo um pouco não é comigo: gastaria crédito à toa e eu perderia o foco. Pergunta pro ChatGPT, pro Gemini, pro Copilot ou pro Claude. O que for de bolso, pode mandar pra mim!',
  'Boa pergunta, mas eu sou só uma IA de bolso, aqui pra cuidar das suas finanças. Pra isso, um chat de uso geral (ChatGPT, Gemini, Copilot ou Claude) te ajuda muito melhor. Tem gasto pra anotar?',
  'Nessa eu passo a bola: quem manda bem é o ChatGPT, o Gemini, o Copilot ou o Claude. Eu sou o parceiro do seu bolso e prefiro guardar a energia pras suas contas. Bora?',
]);
/** Resposta sem IA pra pergunta de pesquisa geral no Papo livre. */
export function respostaPapoLivre(rng = Math.random) {
  return PAPO_LIVRE_FREIO[Math.floor(rng() * PAPO_LIVRE_FREIO.length) % PAPO_LIVRE_FREIO.length];
}

// ---------- Fezinha: loterias (2.3.0.1, JF 17/11) ----------
// "Ele entende mega-sena, raspadinha (não o sorvete), quina, mega da virada... essas fezinhas." Chance é conta fixa
// (combinação de números), então sai aqui sem IA; prêmio, sorteio e resultado mudam toda semana e vão pra IA pesquisar.
const LOTERIA = /\b(mega ?sena|mega da virada|mega|quina|lotofacil|lotomania|dupla sena|timemania|dia de sorte|super sete|loteria|loterias|loterica|raspadinhas?|fezinhas?|bolao|boloes)\b/;
const ehLoteriaNota = n => LOTERIA.test(norm(n || ''));
// chance de acertar tudo na aposta mínima: combinações C(n, k)
const CHANCES = Object.freeze([
  { nome: 'Mega-Sena', re: /mega ?sena|mega da virada|\bmega\b/, um: 50063860, aposta: '6 números de 60' },
  { nome: 'Quina', re: /quina/, um: 24040016, aposta: '5 números de 80' },
  { nome: 'Lotofácil', re: /lotofacil/, um: 3268760, aposta: '15 números de 25' },
  { nome: 'Lotomania', re: /lotomania/, um: 11372635, aposta: '50 números de 100, acertando 20' },
  { nome: 'Dupla Sena', re: /dupla sena/, um: 15890700, aposta: '6 números de 50' },
]);
const milhoes = n => n.toLocaleString('pt-BR');
/** Nome bonito da fezinha pra descrição do gasto ("joguei 10 no bolão da mega" → "Bolão da Mega-Sena"). */
function nomeDaFezinha(t) {
  const jogo = /mega da virada/.test(t) ? 'Mega da Virada' : /mega/.test(t) ? 'Mega-Sena' : /quina/.test(t) ? 'Quina'
    : /lotofacil/.test(t) ? 'Lotofácil' : /lotomania/.test(t) ? 'Lotomania' : /dupla sena/.test(t) ? 'Dupla Sena'
    : /timemania/.test(t) ? 'Timemania' : /raspadinha/.test(t) ? 'Raspadinha' : null;
  if (/bolao/.test(t)) return jogo ? `Bolão da ${jogo}` : 'Bolão';
  return jogo || 'Fezinha';
}

// ---------- Carro e casa: km por litro e kWh (2.1.9.3, JF 17/11) ----------
// "Recomenda ir ao mecânico caso o carro esteja gastando muito; ajuda a calcular a quilometragem por litro ao longo do
// mês ou da semana; e o kWh nas contas de energia da casa." Contas feitas aqui, sem IA.
const NUM = '(\\d+(?:[.,]\\d+)?)';
const num = x => Number(String(x).replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
/** "rodei 400 km com 40 litros a 6,20" → { km, litros, kml, precoLitro, gasto, tipo, moto } (centavos no preço e no gasto). */
export function lerConsumo(t) {
  const kmlM = t.match(new RegExp(`${NUM}\\s*km\\s*(?:/|por)\\s*(?:l|lt|litro)\\b`));
  const precoM = t.match(/(\d{1,2}[.,]\d{2,3})\s*(?:reais\s*)?(?:o|no|por|cada)\s*litro|litro\s*(?:a|por|de|custa|custou|ta|esta|saiu)?\s*(?:r\$\s*)?(\d{1,2}[.,]\d{2,3})/);
  const semKml = kmlM ? t.replace(kmlM[0], ' ') : t;
  // "40 litros a 6,20": com litros no texto, um número com centavos depois de "a/por/de" é o preço do litro
  const precoSolto = !precoM && /\d\s*(l|lt|lts|litros?)\b/.test(t) ? t.match(/\b(?:a|por)\s*(?:r\$\s*)?(\d{1,2}[.,]\d{2,3})\b/) : null;
  const kmM = semKml.match(new RegExp(`${NUM}\\s*(?:km|kms|quilometros?)\\b`));
  const litrosM = semKml.match(new RegExp(`${NUM}\\s*(?:l|lt|lts|litros?)\\b`));
  let resto = t;
  for (const m of [kmlM, precoM, precoSolto, kmM, litrosM]) if (m) resto = resto.replace(m[0], ' ');
  const gasto = /(gastei|paguei|abasteci|coloquei|botei|r\$|reais|\bde gasolina|\bde etanol)/.test(resto) ? acharValor(resto) : null;
  return {
    km: kmM ? num(kmM[1]) : null, litros: litrosM ? num(litrosM[1]) : null, kml: kmlM ? num(kmlM[1]) : null,
    precoLitro: precoM ? Math.round(num(precoM[1] || precoM[2]) * 100) : precoSolto ? Math.round(num(precoSolto[1]) * 100) : null, gasto: gasto || null,
    tipo: /\b(etanol|alcool)\b/.test(t) ? 'etanol' : /\bdiesel\b/.test(t) ? 'diesel' : 'gasolina', moto: /\bmotos?\b/.test(t),
  };
}
const CONSUMO_PEDE = /(km por litro|km\/l\b|km l\b|quantos km (o |meu |ele )?(carro |moto )?(faz|anda|roda)|consumo (do|da|de) (meu |minha )?(carro|moto)|(carro|moto) (ta |esta )?(gastando|bebendo|consumindo|puxando) (muito|demais)|calcul\w* (o |a )?(consumo|media|quilometragem)|media de consumo|quanto (meu |o )?(carro|moto) (faz|gasta|consome) por (km|quilometro|litro)|custo por (km|quilometro))/;
// referência de km/l abaixo da qual vale olhar o carro (carro de passeio comum; moto bem mais)
const KML_MINIMO = { gasolina: 8, etanol: 5.5, diesel: 7 };

// Aparelhos de casa: potência típica (W) ou consumo fixo no mês (kWh, os que ficam sempre ligados). 15 itens.
export const APARELHOS = Object.freeze([
  { nome: 'chuveiro', re: /chuveiro/, w: 5500 },
  { nome: 'ar-condicionado', re: /ar ?condicionado|\bar\b.*\bbtus?\b|split/, w: 1000 },
  { nome: 'aquecedor', re: /aquecedor/, w: 1500 },
  { nome: 'micro-ondas', re: /micro ?-?ondas/, w: 1200 },
  { nome: 'forno elétrico', re: /forno eletrico|forno/, w: 1500 },
  { nome: 'air fryer', re: /air ?fryer|fritadeira/, w: 1500 },
  { nome: 'ferro de passar', re: /ferro( de passar)?/, w: 1000 },
  { nome: 'secador', re: /secador/, w: 1200 },
  { nome: 'máquina de lavar', re: /maquina de lavar|lava ?roupas?|lavadora/, w: 500 },
  { nome: 'geladeira', re: /geladeira|refrigerador/, kwhMes: 35 },
  { nome: 'freezer', re: /freezer/, kwhMes: 45 },
  { nome: 'TV', re: /\btv\b|televisao|televisor/, w: 100 },
  { nome: 'computador', re: /computador|\bpc\b|videogame|playstation|xbox/, w: 250 },
  { nome: 'notebook', re: /notebook|laptop/, w: 60 },
  { nome: 'ventilador', re: /ventilador/, w: 80 },
]);
const TARIFA_EXEMPLO = 85; // centavos por kWh: média de exemplo, com impostos (cada conta tem a sua)
/** "chuveiro de 5500w 20 minutos por dia", "minha conta deu 250 com 300 kwh" → números da conta de energia. */
export function lerEnergia(t) {
  const kwhM = t.match(new RegExp(`${NUM}\\s*(?:kwh|kw ?/ ?h|kw h|quilowatts? ?hora|kilowatts? ?hora)\\b`));
  const kwM = t.match(new RegExp(`${NUM}\\s*(?:kw|quilowatts?|kilowatts?)\\b(?!\\s*/?\\s*h)`));
  const wM = t.match(new RegExp(`${NUM}\\s*(?:w|watts?)\\b`));
  const btuM = t.match(/(\d{1,2}(?:\.?\d{3}))\s*btus?\b/);
  const hM = t.match(new RegExp(`${NUM}\\s*(?:h|hs|horas?)\\b`));
  const minM = t.match(/(\d{1,3})\s*(?:min|mins|minutos?)\b/);
  const diasM = t.match(/(\d{1,2})\s*dias\b/);
  const tarifaM = t.match(/(\d[.,]\d{1,3})\s*(?:reais\s*)?(?:o|por|cada|no|de)?\s*(?:kwh|kw ?\/ ?h|kw h)\b|tarifa (?:de |e |eh |ta |esta )?(?:r\$\s*)?(\d[.,]\d{1,3})/);
  let resto = t;
  for (const m of [tarifaM, kwhM, kwM, wM, btuM, hM, minM, diasM]) if (m) resto = resto.replace(m[0], ' ');
  const aparelho = APARELHOS.find(a => a.re.test(t)) || null;
  let w = kwM ? num(kwM[1]) * 1000 : wM ? num(wM[1]) : btuM ? Math.round(num(btuM[1]) * 0.09) : aparelho?.w ?? null;
  const horasDia = hM ? num(hM[1]) : minM ? num(minM[1]) / 60 : null;
  return {
    kwh: kwhM ? num(kwhM[1]) : null, w, wInformado: !!(kwM || wM || btuM), horasDia, dias: diasM ? Number(diasM[1]) : 30,
    tarifa: tarifaM ? Math.round(num(tarifaM[1] || tarifaM[2]) * 100) : null, aparelho,
    conta: /(conta|paguei|deu|veio|gastei|r\$|reais)/.test(resto) ? acharValor(resto) : null,
  };
}
const ENERGIA_PEDE = /(quanto (gasta|consome|custa|puxa|pesa)|gasta muito|consome muito|consumo|na conta de luz|conta de luz|energia|por mes|quanto sai|quanto fica|ligad[oa])/;
const fmtKwh = v => `${Number(v.toFixed(1)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh`;
const fmtKm = v => Number(v.toFixed(1)).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

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
  // dia da semana (14/11): "foi na quarta" = a última quarta (hoje, se hoje for quarta)
  const sem = t.match(/\b(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:[- ]feira)?\b/);
  if (sem) {
    const alvo = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].indexOf(sem[1]);
    const hoje = new Date(`${today}T12:00:00`).getDay();
    return menos((hoje - alvo + 7) % 7);
  }
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

// Hora não é dinheiro (JF, 14/11: "foi na quarta 09:15 da manhã" virava R$ 9,00)
const HORAS = /\b\d{1,2}[:h]\d{2}\b|\b\d{1,2}h\b|\bas \d{1,2}(?:h| horas?)?\b|\b\d{1,2} ?(?:h|horas?)?(?= (?:da manha|da tarde|da noite|da madrugada)\b)/g;
// Nome de banco com número não é valor (16/11: "já paguei a fatura do C6" virava gasto de R$ 6)
const BANCO_COM_NUMERO = /\b(c6( bank)?|99( ?pay| ?food)?|bs2|b3|n26)\b/g;
function acharValor(t) {
  t = String(t).replace(HORAS, ' ').replace(BANCO_COM_NUMERO, ' ');
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
  // revisão do Gemini (16/11, conferida): "gosto" virava "gasto", "gato" virava "gasto", "mesa" virava "mes",
  // "maio" virava "maior", "parar" virava "pagar", "home" virava "hoje"
  'cinemark', 'cinepolis', 'kinoplex', 'pipoca', 'ingresso', 'ingressos', 'shopping', 'shoppings', // 2.3.9: cinema não vira outra palavra
  'gosto', 'gosta', 'gostou', 'gato', 'gatos', 'gata', 'mesa', 'mesas', 'maio', 'marco', 'abril', 'junho', 'julho', 'agosto',
  'parar', 'parei', 'home', 'meta', 'metas', 'jogo', 'jogos', 'game', 'games', 'pasta', 'gesto', 'menos', 'massa',
];
// palavras do glossário não são "corrigidas" (bug de 13/11: "pé de meia" virava "pé de média")
const VOCAB_SET = new Set([...VOCAB, ...CONHECIDAS, ...GLOSSARIO.flatMap(g => g.chaves.flatMap(k => k.split(' ')))]);

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
      // 4 letras tem vizinho demais (mesa/mes, home/hoje): aí só vale a letra que faltou ("sado" → "saldo") (16/11)
      if (w.length === 4 && v.length <= w.length) continue;
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
  trouxa: 'trouxa', arrombado: 'arrombado', bocó: 'boco', boco: 'boco', retardado: 'retardado', estupido: 'estupido', jumento: 'jumento', anta: 'anta',
  porcaria: 'porcaria', chato: 'chato', ridiculo: 'ridiculo', palhaco: 'palhaco', escroto: 'escroto', cuzao: 'cuzao',
};
// Apelido de amigo (JF, 14/11: "eu chamo meus melhores amigos de corno, de vagabundo… é meu jeito de tratar o caos"):
// não é xingamento. Ele entende como tratamento de brother e responde a pergunta que veio junto.
const APELIDOS = {
  corno: 'corno', cornao: 'corno', vagabundo: 'vagabundo', vagabunda: 'vagabunda', vagaba: 'vagabundo', safado: 'safado', safada: 'safada',
  malandro: 'malandro', maluco: 'maluco', doido: 'doido', doida: 'doida', mane: 'mane', pilantra: 'pilantra', folgado: 'folgado',
  cabecudo: 'cabecudo', sacana: 'sacana', bandido: 'bandido', vacilao: 'vacilao',
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
  // revisão do Gemini (16/11): "gastei 80 igual um maluco", "tô doido pra juntar" não é chamar ele de maluco/doido
  const adjetivo = /\b(to|estou|ta|esta|fiquei|ficou|igual (a )?(um|uma)|que nem (um|uma)|feito (um|uma)|tipo (um|uma)|como (um|uma))\s+(maluco|doido|doida|folgado|safado|safada)\b/.test(t);
  const apelido = !adjetivo && palavras.some(w => APELIDOS[w]);
  const limpo = palavras.filter(w => !PALAVROES[w] && !OFENSAS[w] && !APELIDOS[w]).join(' ')
    .replace(new RegExp(FRASES_OFENSA.source, 'g'), ' ').replace(/\b(puta que pariu|que (merda|porra))\b/g, ' ').replace(/^(que|mano|meu|ai|nossa|ah|eita)( |$)/, '').replace(/\s+/g, ' ').trim();
  return { limpo, palavrao: temPalavrao || temOfensa, ofensa, apelido };
}

// Sobrou só "e aí", "fala", "oi"… depois de tirar o apelido? Então foi só um chamado de amigo.
const SO_CHAMADO = /^(e ai|eai|fala|oi|ola|opa|salve|bom dia|boa tarde|boa noite|ei|ow|o|caos|meu|mano|ai|hein|ne)?( (caos|meu|mano|ai|hein|ne|ze))*$/;

// Planos guiados (JF, 16/11): compra, viagem, pet, moradia, transporte e economizar. "Ele não te dá a resposta: te
// orienta a chegar nela." Antes da IA, um questionário rápido sem IA (5 perguntas, uma por vez, com Pular), pra uma
// pesquisa só, certeira, sem inventar número. O orçamento é sempre o último.
const PRIVACIDADE = 'Fica tranquilo: esta conversa fica só no seu celular. Pra IA vai só o necessário, sem seu nome, e o servidor do app não guarda sua pergunta. Quer apagar? A lixeira do Chat limpa a conversa e a minha memória dela. ';
export const PASSOS_PESQUISA = Object.freeze({
  viagem: [
    { id: 'origem', rotulo: 'Saindo de', q: 'De onde você sai? (a cidade)' },
    { id: 'quando', rotulo: 'Quando e quem', q: 'Quando quer ir, por quantos dias e quantas pessoas? Tipo "janeiro, 7 dias, 2 pessoas".' },
    { id: 'incluir', rotulo: 'Pesquisar', q: 'O que eu pesquiso: passagem, hotel ou os dois?', chips: ['Passagem', 'Hotel', 'Os dois'] },
    { id: 'regiao', rotulo: 'Região ou tipo de hotel', q: 'Tem região ou tipo de hospedagem preferido? Tipo "perto da praia", "no centro", "pousada simples".' },
    { id: 'orcamento', rotulo: 'Orçamento', q: 'E o orçamento total? Me fala tipo "até 5000". Se não tiver, diz "sem orçamento".', chips: ['Sem orçamento'] },
  ],
  produto: [
    { id: 'detalhe', rotulo: 'Detalhes', q: 'Me descreve melhor: modelo, tamanho ou o que precisa ter? Tipo "300 litros, frost free".' },
    { id: 'uso', rotulo: 'Pra quê', q: 'É pra quê? Tipo "casa com 4 pessoas", "trabalho", "presente".' },
    { id: 'marca', rotulo: 'Marca', q: 'Tem marca preferida, ou alguma que você não quer?', chips: ['Tanto faz'] },
    { id: 'quando', rotulo: 'Precisa pra', q: 'Precisa pra quando?', chips: ['Urgente', 'Este mês', 'Sem pressa'] },
    { id: 'orcamento', rotulo: 'Orçamento', q: 'E o orçamento? Me fala tipo "até 5000". Se não tiver, diz "sem orçamento".', chips: ['Sem orçamento'] },
  ],
  pet: [
    { id: 'animal', rotulo: 'Bicho e porte', q: 'Qual bicho e de que porte? Tipo "cachorro pequeno, pinscher" ou "gato".' },
    { id: 'origem', rotulo: 'Adotar ou comprar', q: 'Vai adotar ou comprar?', chips: ['Adotar', 'Comprar'] },
    { id: 'cuidados', rotulo: 'Entra na conta', q: 'O que entra na conta? Ração, banho e tosa, veterinário, vacinas, plano de saúde pet…', chips: ['Tudo', 'Só o básico'] },
    { id: 'cidade', rotulo: 'Cidade', q: 'Em que cidade você mora? O preço muda bastante de lugar pra lugar.' },
    { id: 'orcamento', rotulo: 'Dá pra separar por mês', q: 'Quanto dá pra separar por mês pro pet? Tipo "até 300". Se não souber, diz "sem orçamento".', chips: ['Sem orçamento'] },
  ],
  moradia: [
    { id: 'atual', rotulo: 'Paga hoje', q: `${PRIVACIDADE}Quanto você paga hoje de moradia (aluguel com condomínio, ou parcela)?` },
    { id: 'regiao', rotulo: 'Cidade e bairro', q: 'Em que cidade e bairro? Não precisa de endereço: só o bairro.' },
    { id: 'trabalho', rotulo: 'Ida pro trabalho', q: 'Fica longe do trabalho ou do estudo? Como você vai: a pé, ônibus, carro, moto?' },
    { id: 'objetivo', rotulo: 'Quer', q: 'O que você quer: ver se está caro, mudar pra algo mais barato, ou comprar?', chips: ['Ver se está caro', 'Mudar', 'Comprar'] },
    { id: 'orcamento', rotulo: 'Teto por mês', q: 'Quanto dá pra pagar por mês de moradia, no máximo? Tipo "até 1500".', chips: ['Sem orçamento'] },
  ],
  transporte: [
    { id: 'rotina', rotulo: 'Rotina', q: `${PRIVACIDADE}Como é seu dia a dia: de qual bairro sai, pra qual vai e quantas vezes? Só bairros, sem endereço.` },
    { id: 'veiculo', rotulo: 'Vai de', q: 'Vai de quê hoje?', chips: ['Carro', 'Moto', 'Ônibus', 'App'] },
    { id: 'gasto', rotulo: 'Gasta por mês', q: 'Quanto gasta por mês com isso, mais ou menos? (gasolina, passagem, estacionamento…)' },
    { id: 'opcoes', rotulo: 'Topa outras opções', q: 'Topa outras opções? Bicicleta, a pé, carona, ônibus, juntar as saídas…', chips: ['Topo', 'Prefiro não'] },
    { id: 'orcamento', rotulo: 'Quer gastar até', q: 'Quanto quer gastar por mês com transporte? Tipo "até 400".', chips: ['Sem orçamento'] },
  ],
  // 2.3.9 (JF, 16/11: "quero ir ao cinema esse mês… dá pra ir? compro pipoca?"): passeio e lazer
  lazer: [
    { id: 'regiao', rotulo: 'Cidade ou região', q: 'Em que cidade ou região? Tipo "Grande Vitória", "centro de BH".' },
    { id: 'quando', rotulo: 'Quando', q: 'Quando você quer ir?', chips: ['Este fim de semana', 'Este mês'] },
    { id: 'quem', rotulo: 'Quantas pessoas', q: 'Vai sozinho ou com mais gente?', chips: ['Só eu', '2 pessoas', 'Família'] },
    { id: 'extras', rotulo: 'Além do ingresso', q: 'Entra o quê além do ingresso? Pipoca, estacionamento, lanche, Uber…', chips: ['Pipoca', 'Estacionamento', 'Só o ingresso'] },
    { id: 'orcamento', rotulo: 'Quer gastar até', q: 'Quanto quer gastar no total? Tipo "até 100". Se não tiver, diz "sem orçamento".', chips: ['Sem orçamento'] },
  ],
  economizar: [
    { id: 'meta', rotulo: 'Quer economizar', q: 'Quanto quer economizar por mês? Tipo "300".' },
    { id: 'objetivo', rotulo: 'Pra quê', q: 'É pra algum objetivo? Reserva, viagem, sair de dívida…', chips: ['Reserva', 'Dívida', 'Um sonho'] },
    { id: 'fixos', rotulo: 'Contas que pesam', q: 'Quais contas fixas pesam mais? Tipo aluguel, internet, celular, streaming.' },
    { id: 'intocavel', rotulo: 'Não abre mão de', q: 'Tem algo que você não abre mão? Tipo academia ou um streaming.', chips: ['Nada'] },
    { id: 'prazo', rotulo: 'Prazo', q: 'Em quanto tempo quer ver o resultado?', chips: ['1 mês', '3 meses', '6 meses'] },
  ],
});
const NOME_DO_PLANO = { lazer: 'Plano de passeio', viagem: 'Pesquisa de viagem', produto: 'Pesquisa de compra', pet: 'Plano de pet', moradia: 'Plano de moradia', transporte: 'Plano de transporte', economizar: 'Plano pra economizar' };

const LAZER = /\b(restaurante|restaurantes|lanchonete|pizzaria|hamburgueria|cinema|cinemark|cinepolis|kinoplex|filme no cinema|ingresso|ingressos|show|teatro|parque de diversao|balada|barzinho|rodizio|passeio|role|festival|estadio|boliche|escape room)\b/;
// pergunta de preço de algo de fora ("quanto tá um ingresso no cinemark?"): não é "quanto gastei" (2.3.9, JF)
const PRECO_DE_FORA = /\b(quanto (ta|esta|custa|custam|sai|fica|anda|e|eh|ta custando|esta custando)|qual (o )?(preco|valor)|preco d[eoa]s?|valor d[eoa]s?|valores d[eoa]s?)\b/;
// pesquisa pedida com todas as letras: vai direto pra IA, sem questionário (JF: "sou seu criador, me respeita")
const PESQUISA_DIRETA = /\b(pesquisa|pesquisar|busca|buscar|procura|procurar|ve|ver|olha|olhar)( (pra|para) mim)?( (na|no) (internet|google|web))\b/;
// pergunta de recomendação ("qual o melhor shopping pra ver um filme?", "melhor ração pro meu cachorro",
// "qual o melhor custo-benefício?"): vai direto pra IA pesquisar (2.4.2, JF: "ele tem que entender muito melhor
// as perguntas"). Fica de fora o que é do próprio dinheiro (banco, cartão, investimento…), que tem resposta aqui.
const RECOMENDA = /\b((qual|quais) (e |eh |seria |sao )?(o |a |os |as )?melhor(es)?|(o|a) melhor (tipo de |marca de |lugar pra |opcao )?\w+ (pra|para)|melhor custo.?beneficio|custo.?beneficio|vale mais a pena|compensa mais|(me )?recomenda(r|ria)?|(me )?indica(r|ria)?|onde (e|eh|fica|sai|compro) mais barat[oa]|qual (e |eh )?(o |a )?mais barat[oa]|o que (e|eh) melhor)\b/;
const DO_PROPRIO_DINHEIRO = /\b(banco|bancos|conta|contas|cartao|cartoes|fatura|investimento|investimentos|investir|cdb|tesouro|rende|rendimento|poupanca|orcamento|categoria|gasto|gastos|gastei|meta|metas|saldo|salario|juros|cofrinho|caixinha|dica|app|aplicativo|economizar|economia|poupar)\b/;
const COMBUSTIVEL = /\b(gasolina|etanol|alcool|diesel|combustivel|combustiveis|petroleo|petrobras|gnv)\b/;
// "etanol 4,10 e gasolina 6,20" → preço de cada um (centavos)
function lerPrecosCombustivel(t) {
  const pega = nome => { const m = t.match(new RegExp(`\\b${nome}\\b[^0-9]{0,15}(\\d{1,2}[.,]\\d{1,3})`)); return m ? Math.round(Number(m[1].replace(',', '.')) * 100) : null; };
  return { etanol: pega('(?:etanol|alcool)'), gasolina: pega('gasolina') };
}
const VIAGEM = /\b(viagem|viajar|passagem|passagens|voo|voos|hotel|hospedagem|pacote de viagem)\b/;
const PET = /\b(pet|pets|cachorro|cachorrinho|cao|gato|gatinho|gata|filhote|pinscher|pincher|calopsita|passaro|hamster|coelho|peixe|aquario|vira lata)\b/;
const MORADIA = /\b(aluguel|apartamento|ape|casa propria|me mudar|mudar de casa|mudar de apartamento|mudanca|morar sozinh[oa]|condominio|financiar (uma |a )?(casa|ape))\b/;
const TRANSPORTE = /\b(gasolina|combustivel|etanol|uber|99|onibus|transporte|carro|moto|bicicleta|bike|deslocamento)\b/;
const PEDE = /\b(quanto|custa|custaria|sai|sairia|fica|ficaria|pesquis|procur|planej|calcul|me ajuda|ajuda|me ajude|quero|pretendo|penso em|vale|compensa|caro|cara|economiz|gasto muito|gastando muito|gasto demais|reduzir|diminuir)/;
/** Planos guiados (16/11): o que a pessoa quer planejar ou pesquisar, e se já disse o orçamento. */
export function acharPesquisa(t, valor) {
  if (/\b(juntar|guardar|poupar|meta|gastei|paguei|comprei|recebi|robux|v ?bucks|diamantes|quanto gastei|quanto gasto com|gasto com|gastando com)\b/.test(t)) return null;
  let tipo = null;
  const precoDeFora = PRECO_DE_FORA.test(t) && /\b(um|uma|o|a|os|as|no|na|do|da)\b/.test(t);
  if (LAZER.test(t) && (PEDE.test(t) || precoDeFora || /\b(da pra (eu )?ir|posso ir|vale ir|recomenda|pesquis|valores?|precos?)\b/.test(t))) tipo = 'lazer';
  // recomendação: o assunto decide o plano; sem assunto conhecido, é compra
  const recomenda = RECOMENDA.test(t) && !DO_PROPRIO_DINHEIRO.test(t);
  if (!tipo && recomenda) tipo = LAZER.test(t) ? 'lazer' : PET.test(t) ? 'pet' : VIAGEM.test(t) ? 'viagem' : MORADIA.test(t) ? 'moradia' : TRANSPORTE.test(t) ? 'transporte' : 'produto';
  if (tipo) { /* já decidido acima */ }
  else if (/(onde (posso|da pra|consigo|eu posso) economizar|como (posso |eu )?economizar|me ajuda a economizar|cortar gastos|reduzir (meus )?gastos|gastar menos)/.test(t)) tipo = 'economizar';
  else if (PET.test(t) && PEDE.test(t) && !/\b(racao|petshop|pet shop)\b.*\b\d/.test(t)) tipo = 'pet';
  else if (MORADIA.test(t) && PEDE.test(t)) tipo = 'moradia';
  else if (TRANSPORTE.test(t) && /(economiz|gasto muito|gastando muito|gasto demais|caro|reduzir|diminuir|compensa|vale mais|ajuda)/.test(t)) tipo = 'transporte';
  else if (VIAGEM.test(t) && PEDE.test(t)) tipo = 'viagem';
  else if (/\b(pesquisa|pesquisar|procura|procurar|acha|achar|encontra|encontrar|compara|comparar)\b.*\b(preco|precos|onde|loja|lojas|melhor|barato|mais barato|um|uma|o|a)\b/.test(t)
    || /\b(onde (compro|comprar|acho)|melhor preco|mais barato|quero comprar (um|uma|o|a))\b/.test(t)
    || PESQUISA_DIRETA.test(t)) tipo = 'produto';
  if (!tipo) return null;
  // vai direto pra IA, sem questionário (2.3.9, JF): pesquisa pedida com todas as letras ("pesquisa na internet…"),
  // pergunta de preço curta ("quanto tá um ingresso no cinemark?") ou pedido já detalhado (o questionário só atrapalha)
  const palavras = t.split(/\s+/).filter(Boolean).length;
  // (pergunta de preço curta só pula no passeio: compra, pet e casa ainda ganham as perguntas, que poupam crédito)
  const direto = PESQUISA_DIRETA.test(t) || recomenda || (tipo === 'lazer' && precoDeFora && palavras <= 12) || palavras >= 18;
  const orc = t.match(/\b(orcamento|ate|teto|no maximo|maximo)\b[^0-9]{0,15}(\d[\d.,]*)/);
  const orcamento = orc ? Math.round(Number(orc[2].replace(/\./g, '').replace(',', '.')) * 100) : undefined;
  const item = t.replace(/\b(pra mim|para mim|na internet|no google|na web|quais sao|qual e|qual|quanto (ta|esta|anda)|os valores|o valor|valores|valor|ve|ver|olha|olhar|busca|buscar)\b/g, ' ').replace(/\b(me ajuda a|me ajude a|ajuda a|ajude a|me ajuda|me ajude|caos|por favor|pesquisa|pesquisar|procura|procurar|acha|achar|encontra|encontrar|compara|comparar|quanto|custa|custaria|sai|sairia|fica|ficaria|o preco de|preco de|preco|onde (compro|comprar|acho)|quero comprar|quero fazer|quero|pretendo|penso em|calcular|planejar|considerando|pra eu|para eu|eu)\b/g, ' ')
    .replace(/\b(orcamento|ate|teto|no maximo|maximo)\b[^0-9]{0,15}\d[\d.,]*( reais| mil)?/g, ' ').replace(/[?!.,;]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^((qual|o|a|os|as|da|do|de|pra|para|que|e)\s+)+/, '');
  // lazer: o que a pessoa já disse não vira pergunta de novo
  const respostas = tipo === 'lazer' ? respostasDoLazer(t) : {};
  const padrao = { lazer: 'esse passeio', viagem: 'essa viagem', produto: 'isso', pet: 'seu pet', moradia: 'sua moradia', transporte: 'seu transporte', economizar: 'onde economizar' }[tipo];
  return { tipo, viagem: tipo === 'viagem', item: (item || padrao).slice(0, 80), direto, respostas,
    orcamento: orcamento && orcamento > 0 ? orcamento : (valor && /\b(orcamento|ate)\b/.test(t) ? valor : undefined) };
}

// 2.3.9: tira do pedido de passeio o que já foi dito (região, quando, quem, extras)
function respostasDoLazer(t) {
  const r = {};
  const reg = t.match(/\b(grande vitoria|vitoria|vila velha|serra|cariacica|viana|guarapari|sao paulo|rio de janeiro|belo horizonte|bh|curitiba|salvador|recife|fortaleza|brasilia|porto alegre)\b/)
    || t.match(/\b(?:aqui (?:na|no|em)|perto (?:de|da|do)|em) ([a-z]+(?: [a-z]+)?)\b(?= |$)/);
  if (reg && !/\b(casa|mim|um|uma|o|a)$/.test(reg[1])) r.regiao = reg[1];
  const q = t.match(/\b(esse mes|este mes|essa semana|esta semana|esse fim de semana|este fim de semana|fim de semana|hoje|amanha|sabado|domingo|sexta)\b/);
  if (q) r.quando = q[1];
  const quem = t.match(/\b(sozinho|sozinha|so eu|eu e (?:minha|meu) [a-z]+|com (?:a |o )?(?:minha|meu) [a-z]+|com amigos|em familia|familia|\d+ pessoas)\b/);
  if (quem) r.quem = quem[1];
  const ex = ['pipoca', 'estacionamento', 'lanche', 'uber', 'combo', 'refrigerante'].filter(x => t.includes(x));
  if (ex.length) r.extras = ex.join(', ');
  return r;
}

export function entender(texto, { categories = [], anterior = null } = {}) {
  const base = corrigirDigitacao(expandirGirias(norm(texto)), categories.map(c => norm(c.name)));
  const pv = lerPalavroes(base);
  // Xingou E perguntou ("burro, quanto gastei?"): ele lê os dois. Responde a pergunta, com uma reação curta antes.
  // Só xingamento, sem pergunta de verdade: segue como xingamento (com a paciência escalando).
  if (pv.ofensa) {
    const r = pv.limpo && pv.limpo !== base && !SO_CHAMADO.test(pv.limpo) ? entender(pv.limpo, { categories, anterior }) : null;
    if (r && r.intent !== 'nao_entendi' && r.intent !== 'xingamento' && r.intent !== 'desabafo') return { ...r, palavrao: true, xingouJunto: true };
    return { t: base, intent: 'xingamento', palavrao: true, categoria: null, periodo: acharPeriodo(base) };
  }
  if (pv.apelido && !pv.palavrao) {
    if (!pv.limpo || pv.limpo === base || SO_CHAMADO.test(pv.limpo)) return { t: base, intent: 'apelido', categoria: null, periodo: 'mes' };
    const r = entender(pv.limpo, { categories, anterior });
    return { ...r, apelido: true };
  }
  if (pv.palavrao) {
    const r = entender(pv.limpo, { categories, anterior });
    if (!pv.limpo || (r.intent === 'nao_entendi' && !r.palpite)) return { ...r, t: base, intent: 'desabafo', palavrao: true };
    return { ...r, palavrao: true };
  }
  const r0 = entenderSimples(base, { categories, anterior });
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
  if (r0.intent === 'nao_entendi' && !r0.foraDoTema) {
    const p = palpite(t);
    if (p) return { ...r0, intent: p, palpite: true };
  }
  return r0;
}

// ---------- O que ele tem anotado do mercado (pesquisado em 13/11/2026) ----------
// JF (13/11): "ele pode informar os valores, mas deixa claro que é o que tem anotado até tal dia; não é verdade
// absoluta; vale conferir com o banco". Atualizar a data quando atualizar os números.
export const ANOTADO_EM = '13 de novembro de 2026';
export const AVISO_DATA = `Isso é o que eu tinha anotado até ${ANOTADO_EM}: não é verdade absoluta, valores mudam todo dia. Confere com o banco.`;
const SELIC_ANOTADA = 'Selic em 13,75% ao ano (Copom de 4/11). '; // só quando não tem o dado ao vivo do servidor
const RENDIMENTOS_ANOTADOS = 'Com condições (campanha, depósito mínimo ou assinatura), os cofrinhos do PicPay e do Mercado Pago chegam a uns 120% do CDI, e o Nubank a 120% pra alguns clientes. Sem condição, Nubank, Inter e C6 ficam perto de 100%.';

// ---------- Matemática básica (JF, 13/11 à noite) ----------
// "quanto é 7 x 8?", "15 vezes 23", "1200 dividido por 12", "350 + 80". Ele faz a conta e ensina um atalho.
const NUM_C = '(\\d+(?:[.,]\\d+)?)';
const OPS = { x: '*', vezes: '*', '*': '*', '×': '*', mais: '+', '+': '+', menos: '-', '-': '-', 'dividido por': '/', 'divido por': '/', '/': '/', '÷': '/' };
export function lerConta(t) {
  const m = t.match(new RegExp(`^(?:quanto (?:e|da|fica|vale)\\s+|calcula\\s+|faz (?:a conta|ai)\\s+)?${NUM_C}\\s*(x|vezes|\\*|×|mais|\\+|menos|-|dividido por|divido por|/|÷)\\s*${NUM_C}\\s*\\??$`));
  if (!m) return null;
  const n = v => Number(v.replace(',', '.'));
  const a = n(m[1]), b = n(m[3]), op = OPS[m[2]];
  if (!Number.isFinite(a) || !Number.isFinite(b) || !op) return null;
  if (op === '-' && !/^(quanto|calcula|faz)/.test(t)) return null; // "50-60 reais" sozinho não é conta
  return { a, b, op };
}
const fmtNum = v => Number(v.toFixed(2)).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
export function textoConta({ a, b, op }) {
  const A = fmtNum(a), B = fmtNum(b);
  if (op === '/') {
    if (b === 0) return 'Dividir por zero não dá, nem pra mim. Nenhum número cabe zero vezes certinho.';
    const r = a / b;
    return `${A} ÷ ${B} = ${fmtNum(r)}. Pra conferir, faz o caminho de volta: ${fmtNum(r)} × ${B} = ${A}.`;
  }
  if (op === '*') {
    const r = a * b;
    const inteiros = Number.isInteger(a) && Number.isInteger(b);
    // atalho: quebra o número maior em dezenas + unidades (15 × 23 = 15 × 20 + 15 × 3)
    const [p, q] = b >= a ? [a, b] : [b, a];
    if (inteiros && q >= 11 && q % 10 !== 0) {
      const dez = q - (q % 10), uni = q % 10;
      return `${A} × ${B} = ${fmtNum(r)}. Atalho: ${fmtNum(p)} × ${fmtNum(dez)} = ${fmtNum(p * dez)} e ${fmtNum(p)} × ${uni} = ${fmtNum(p * uni)}; somando, ${fmtNum(r)}.`;
    }
    if (inteiros && a <= 10 && b <= 10) return `${A} × ${B} = ${fmtNum(r)}. É somar o ${A} ${B} vezes (ou o ${B}, ${A} vezes).`;
    return `${A} × ${B} = ${fmtNum(r)}.`;
  }
  if (op === '+') {
    const r = a + b;
    const redondo = Math.ceil(b / 10) * 10;
    return Number.isInteger(b) && b % 10 !== 0 && b > 10
      ? `${A} + ${B} = ${fmtNum(r)}. Atalho: soma ${fmtNum(redondo)} (dá ${fmtNum(a + redondo)}) e tira ${fmtNum(redondo - b)}.`
      : `${A} + ${B} = ${fmtNum(r)}.`;
  }
  const r = a - b;
  return `${A} − ${B} = ${fmtNum(r)}.${r < 0 ? ' Deu negativo: o segundo número é maior que o primeiro.' : ` Pra conferir: ${fmtNum(r)} + ${B} = ${A}.`}`;
}

// "800 robux" é quantidade de moeda de jogo, não valor em reais (JF, 15/11)
const MOEDA_QTD = /\b\d+(?:\.\d{3})*\s*(?:robux|v ?-?bucks|vp|rp|diamantes?|minecoins?|gemas?|uc|cp|cristais|primogemas?|jades?(?: estelares?)?|fragmentos?(?: oniricos?)?|fc points|cod points)\b/g;
const FORA_DO_PAPEL = /\b(quem (venceu|ganhou|foi campeao|e o artilheiro)|campeonato|brasileirao|libertadores|placar|resultado do jogo|escalacao|artilheiro|horoscopo|meu signo|signo de|receita de|como (fazer|faco|preparo) (um |uma )?(bolo|torta|pao|lasanha|pudim)|letra da musica|previsao do tempo|vai chover|capital d[aeo]s? |quantos anos tem|quem descobriu|quem inventou)\b/;
const FORA_DO_TEMA = /\b(series?|filmes?|novelas?|livros?|jogos? de|games?|animes?|desenhos?|temporadas?|episodios?|ator|atriz|atores|cantor|cantora|bandas?|albuns?|album|time de|campeonato|copa do mundo|marvel|dc comics|estreias?|estreou|bilheteria|personagens?|elenco|trailer|diretor|roteiro|oscar|hbo|disney|pixar)\b/;
const PAPO_PESSOAL = /\b(como (voce )?(se sente|esta se sentindo|ta se sentindo|se sentiu|tem se sentido)|voce se sente|o que (voce )?(acha|achou|tem achado|pensa|pensou) (da|do|de|sobre) (sua|seu|voce|mim|ser|ter)|o que (voce )?(tem achado|acha) da (sua )?evolucao|voce (gosta|curte|prefere|sonha|tem medo|tem saudade|fica feliz|fica triste|se diverte)|(seu|sua) (filme|musica|serie|comida|cor|time|jogo|livro|desenho) (favorit|preferid)|qual (e )?(o |a )?(seu|sua) (filme|musica|serie|comida|cor|time|jogo|livro|desenho)|se voce fosse|voce (ja )?(sonhou|imaginou))/;

function entenderSimples(t, { categories = [], anterior = null } = {}) {
  // "dia 10" é data, não valor (P9, "esqueci de lançar": "gastei 50 no mercado dia 10")
  const r = { t, categoria: acharCategoria(t, categories), periodo: acharPeriodo(t), valor: acharValor(t.replace(/\bdia \d{1,2}\b/g, ' ').replace(MOEDA_QTD, ' ')), fonte: acharFonte(t) };
  const pergunta = /\b(quanto|qual|quais|onde|como|tive|teve|tenho|vai|posso|consigo|algum|alguma)\b|\?/.test(t);

  if (!t) return { ...r, intent: 'nao_entendi' };
  if (/^(so|era so|e so) (curiosidade|pra saber|informacao)$/.test(t)) return { ...r, categoria: null, intent: 'so_curiosidade' };
  // Fezinha (2.3.0.1): pergunta de loteria; "joguei 6 na mega" continua sendo gasto (vai pra Lazer)
  if (LOTERIA.test(t) && !(r.valor && /\b(joguei|apostei|gastei|paguei|comprei|fiz)\b/.test(t)) && !/raspadinha de (gelo|morango|uva|limao|groselha|frutas?)/.test(t)) {
    const oQueE = /^(o que (e|sao|significa)|me explica|explica|que e)\b/.test(t);
    if (/(quanto (eu )?(gastei|gasto|ja gastei|torrei)|meus gastos?|gastei quanto)/.test(t)) return { ...r, categoria: null, intent: 'loteria', pede: 'gasto' };
    if (/(chance|chances|probabilidade|possibilidade|dificil|facil de ganhar|quantas pessoas|vale a pena|compensa|da pra ganhar|como (eu )?ganh|ficar rico|estrategia|numeros? da sorte|melhor jogo|qual (a |e a )?melhor loteria)/.test(t)) return { ...r, categoria: null, intent: 'loteria', pede: 'chance' };
    if (/(premio|acumul|resultado|sorteio|sorteados|quando (e|sai|vai ser)|que dia|ganhador|ganhou|valor da aposta|quanto custa|preco)/.test(t) && !oQueE) return { ...r, categoria: null, intent: 'loteria', pede: 'pesquisa' };
  }
  // Métodos de poupar (2.3.3, JF 17/11): 50/30/20, pague-se primeiro, 52 semanas, envelopes; pra criança, 3 cofrinhos
  if (!r.valor && /\b((metodos?|jeitos?|tecnicas?|formas?|dicas?|regras?) (de|pra|para) (poupar|guardar|juntar)( dinheiro)?|como (eu )?(faco|fazer|comeco|comecar|posso|consigo|aprendo|aprender) (a |uma )?(poupar|poupanca|guardar dinheiro|juntar dinheiro|ter uma poupanca)|como (se )?(poupa|guarda dinheiro|junta dinheiro)|me ensina a (poupar|guardar|juntar)|(comecar|comeco) a (poupar|guardar dinheiro|juntar dinheiro|fazer uma poupanca)|quanto (eu )?devo guardar|quanto (do meu salario|da mesada) (eu )?(guardo|devo guardar|separo))\b/.test(t)) {
    return { ...r, categoria: null, intent: 'metodos_poupar' };
  }
  // Me pagaram / vaquinha (2.3.3, JF 17/11: "me chamaram pra almoçar e pagaram tudo pra mim"): comer fora sem gastar
  // também é economia e entra como dia sem gasto; e o C.A.O.S. vai conhecendo a rotina (amigos, família…)
  {
    const bancado = /\b(pagaram (tudo |a conta |o almoco |a pizza |o jantar )?(pra|para|por) mim|pagou (tudo |a conta )?(pra|para|por) mim|me (bancaram|bancou|pagaram o (almoco|jantar|lanche|rodizio|cafe|cinema)|pagaram a (pizza|conta|comida))|foi por conta d[oae]s?|por conta da casa|(nao|nem) paguei nada|sem pagar nada|fui convidad[oa] pra (almocar|jantar|comer)|eu (so )?participei mas nao paguei|nao gastei nada .*\b(almoc|jant|pizza|comi|lanch))/.test(t);
    if (bancado && !r.valor && !/\b(me deve|devendo|quem me|pagou o que|me pagou os|me pagou a parte|me devolveu)\b/.test(t)) {
      const quem = /\b(pai|pais|mae|familia|avo|avos|tio|tia|irmao|irma|sogr[oa]|primo|prima)\b/.test(t) ? 'familia'
        : /\b(namorad[oa]|esposa|marido|noiv[oa]|crush|mozao|amor)\b/.test(t) ? 'par'
        : /\b(chefe|empresa|trabalho|firma|cliente)\b/.test(t) ? 'trabalho' : /\b(amig\w*|galera|turma|colegas?|pessoal|parceir\w*)\b/.test(t) ? 'amigos' : null;
      return { ...r, categoria: null, intent: 'pagaram_pra_mim', quem };
    }
    if (/\bvaquinha\b/.test(t)) {
      const minha = t.match(/\b(?:minha parte|minha cota|eu dei|eu entrei com|eu coloquei|dei|coloquei|entrei com)\D{0,25}(\d[\d.,]*)/);
      if (minha) return { ...r, valor: acharValor(minha[0]) || r.valor, categoria: r.categoria, intent: 'registrar_gasto', vaquinha: true, t: `${t} vaquinha` };
      if (!/(o que e|como funciona|como faz)/.test(t)) return { ...r, categoria: null, intent: 'vaquinha_parte' };
    }
  }
  // Perguntas de custo e gasto demais (2.3.2, JF 17/11: "ele responde em média quanto custa, curto, sem explicar o
  // passo a passo, e pergunta se é plano seu; e olha os seus gastos quando você diz que tá gastando demais com algo")
  {
    const demais = t.match(/\b(?:gastando|gasto|gastei|torrando|torrei|torro) (?:demais|muito|bastante|horrores|uma nota) (?:com|de|em|no|na|nos|nas)\s+(.+)$/);
    const comendoFora = /\b(almocando|jantando|comendo|lanchando|almoco|almocei|janto|como) (muito|demais|bastante|toda hora|todo dia) (fora|na rua)\b|\b(almocando|comendo|jantando) fora (muito|demais|toda hora|todo dia)\b/.test(t);
    if (comendoFora) return { ...r, categoria: categories.find(c => c.id === 'restaurante') || null, intent: 'gasto_demais', item: null, fora: true };
    if (demais && !/\b(gasolina|combustivel|etanol|uber|99|transporte|aluguel|condominio|pet|racao|cachorro|gato|carro|moto)\b/.test(demais[1])) {
      const item = demais[1].split(/\s+(?:na|no|da|do|em|nas|nos|esse|este|essa|esta|ultimamente|de novo)\b/)[0].replace(/\b(o|a|os|as|um|uma)\b/g, ' ').trim().split(/\s+/).slice(0, 3).join(' ');
      return { ...r, categoria: acharCategoria(item, categories) || acharCategoria(demais[1], categories), intent: 'gasto_demais', item };
    }
    const custo = CUSTO_MEDIO.test(t) && !/\b(gastei|gastou|gastamos|meus? gastos?|minhas? (contas?|faturas?|gastos?)|meu orcamento|por dia|robux|v ?bucks|diamantes|ingresso|cinema|show|teatro|gasolina|etanol|diesel|kwh|chuveiro|mega|quina|loteria|piso|salario)\b/.test(t) && !LAZER.test(t);
    // plano guiado (viagem pra um lugar, pet, casa, transporte) continua com as perguntas dele; a comparação curta
    // ("o que costuma ser mais barato, hotel ou pousada?") e o "quanto custa X" avulso ficam aqui
    const guiado = custo ? acharPesquisa(t, r.valor) : null;
    const comparar = /((o que|qual) (costuma ser|e|eh|sai) mais (barato|em conta)|mais barato ficar)/.test(t);
    if (custo && (comparar || !guiado || guiado.tipo === 'produto')) {
      const m = t.match(/(?:custa|custando|custaria|sai|saindo|pago (?:pra|para)|preco (?:medio )?(?:de|do|da|pra|para)|valor (?:medio )?(?:de|do|da|pra|para)|caro|barato|cobram (?:pra|para|por))\s+(?:pra |para |o |a |um |uma )*([a-z ]{3,40})/);
      const item = (m ? m[1] : '').replace(/\b(hoje|hoje em dia|atualmente|no brasil|em media|mais ou menos|agora|em 20\d\d)\b.*$/, '').trim().split(/\s+/).slice(0, 4).join(' ');
      return { ...r, categoria: null, intent: 'custo_medio', item: item || null };
    }
  }
  // Trabalho e renda (2.3.0, JF 17/11): salário mínimo, PIB, piso de profissão e mesada
  if (!r.valor || /\bpib\b/.test(t)) {
    const oQueE = /^(o que (e|sao|significa)|me explica|explica|que e)\b/.test(t);
    if (/((qual|quanto) (e |eh |ta |esta |vai ser |sera |fica )?(o )?(valor (do|de) )?salario minimo|salario minimo (atual|hoje|de hoje|agora|de 20\d\d|desse ano|deste ano|esse ano|este ano|ta|esta|e quanto))/.test(t)) {
      return { ...r, categoria: null, intent: 'glossario', termo: GLOSSARIO.find(g => g.termo === 'Salário mínimo'), quem: null };
    }
    // "piso" sozinho no app é o saldo mínimo do banco ("meu piso no Banestes"); "piso salarial" é do trabalho
    if (oQueE && /piso (salarial|da categoria|nacional|regional)/.test(t)) return { ...r, categoria: null, intent: 'glossario', termo: GLOSSARIO.find(g => g.termo === 'Piso salarial'), quem: null };
    if (/\bpib\b|produto interno bruto/.test(t) && !oQueE && /(qual|quanto|atual|hoje|brasil|cresceu|caiu|ultimo|desse ano|deste ano|do pais)/.test(t)) return { ...r, categoria: null, intent: 'pib' };
    const prof = t.match(/\bpiso (?:salarial |nacional |regional )?(?:de |do |da |dos |das |pra |para )(?:um |uma )?([a-z ]{3,40})|\bquanto ganha (?:um |uma |o |a )([a-z ]{3,40})|\bsalario (?:medio )?(?:de |do |da )(?:um |uma )([a-z ]{3,40})/);
    if (prof && !oQueE) {
      const profissao = (prof[1] || prof[2] || prof[3]).replace(/\b(no|na|em|hoje|atual|agora|por mes|em 20\d\d)\b.*$/, '').trim();
      if (profissao && !/^(mes|ano|dezembro|janeiro|minimo)$/.test(profissao)) return { ...r, categoria: null, intent: 'piso_salarial', profissao };
    }
    if (/\b(mesada|semanada)\b/.test(t) && !/\b(recebi|ganhei|caiu|entrou|gastei)\b/.test(t)
      && /(como (eu )?(peco|pedir|consigo|consegui|ganho|ganhar|convenco|convencer|falo|falar|converso|conversar)|quero (ganhar |receber |ter )?(uma )?(mesada|semanada)|(meus pais|minha mae|meu pai|minha familia)( nao)? (me )?(da|dao|deixa|quer)|nao (ganho|recebo|tenho) mesada|pedir (uma )?(mesada|semanada)|ter (uma )?mesada|ajuda.*mesada|mesada.*(pais|mae|pai))/.test(t)) {
      return { ...r, categoria: null, intent: 'pedir_mesada' };
    }
  }
  // Carro e casa (2.1.9.3, JF 17/11): termo de combustível/energia é glossário; km por litro e kWh, conta aqui.
  {
    const termoCE = acharTermo(t);
    const ehCE = termoCE && /^(Gasolina|Diesel|Etanol|Consumo do carro|Hodômetro|kWh|Potência)/.test(termoCE.termo);
    if (ehCE && !/\d/.test(t.replace(/\bs(10|500)\b/g, ' ')) && /(o que (e|sao|significa|quer dizer)|\bque (e|sao)\b|diferenca|explica|me ensina|como funciona|serve|vale a pena|compensa|e melhor|faz bem|faz mal|ouvi falar|nunca entendi)/.test(t)) {
      return { ...r, categoria: null, intent: 'glossario', termo: termoCE, quem: null };
    }
    const cons = lerConsumo(t);
    if ((cons.km && cons.litros) || cons.kml || (cons.km && /\b(rodei|andei|percorri|rodo|ando|rodamos|andamos)\b/.test(t)) || CONSUMO_PEDE.test(t)) {
      return { ...r, categoria: null, intent: 'consumo_carro', cons };
    }
    const en = lerEnergia(t);
    if (en.kwh || (en.wInformado && (en.horasDia || ENERGIA_PEDE.test(t))) || (en.aparelho && ENERGIA_PEDE.test(t) && !/\b(gastei|paguei|comprei)\b/.test(t))
      || /(calcul\w* (o |a )?(kwh|consumo de (energia|luz)|conta de luz)|como (calculo|calcula|calcular) (o |a )?(kwh|conta de luz|consumo de energia)|preco do kwh)/.test(t)) {
      return { ...r, categoria: null, intent: 'energia', en };
    }
  }
  // Combustível (JF, 17/11: "análise de preço de gasolina, se vai subir ou descer, se estou pagando caro"): pergunta de
  // preço ou de rumo vai pra IA pesquisar (ANP, Petrobras, petróleo e dólar). "Abasteci 200" continua sendo gasto;
  // "gasto muito com gasolina" continua no plano de transporte; "etanol 4,10 gasolina 6,20" ele calcula aqui.
  if (COMBUSTIVEL.test(t)) {
    const precos = lerPrecosCombustivel(t);
    if (precos.etanol && precos.gasolina) return { ...r, categoria: null, intent: 'etanol_ou_gasolina', precos };
    const registro = /\b(abasteci|gastei|paguei|coloquei|botei|enchi)\b/.test(t) && !/\b(litro|caro|cara|barato|barata)\b|\?/.test(t);
    const doBolso = /\b(quanto gastei|gastei quanto|gasto com|gastando|gasto muito|gastei muito|economiz)/.test(t);
    if (!registro && !doBolso && /\b(preco|precos|valor|quanto (ta|esta|custa)|caro|cara|barato|barata|sub(ir|indo|iu)|sobe|aument\w*|reajuste|baix(ar|ou|ando)|desc(e|er|eu)|ca(ir|iu|indo)|reducao|previsao|tendencia|como (ta|esta|anda)|litro|vale a pena abastecer|compensa|petroleo|petrobras)\b|etanol ou gasolina|gasolina ou etanol|alcool ou gasolina/.test(t)) {
      return { ...r, categoria: null, intent: 'combustivel', precoLitro: /\blitro\b/.test(t) ? r.valor : null };
    }
  }
  // Papo pessoal com ele (JF, 15/11: "como vc se sente tendo acesso à internet?" virava gasto em Contas, por causa da
  // palavra "internet"): pergunta sobre o que ele sente, acha ou gosta vai pra IA online quando está ligada; sem ela,
  // ele responde como está. Não pega pergunta de dinheiro ("o que você acha de eu comprar 300?").
  // Aperto sem palavrão (revisão do Gemini, 16/11): "tô liso", "acabou meu dinheiro", "esse mês tá osso". Antes ia pra
  // IA (gastava crédito); agora ele acolhe aqui, com os números do mês e um caminho.
  if (!r.valor && /\b(to|estou|tô|fiquei|ando|tamo|estamos) (liso|lisa|duro|dura|quebrado|quebrada|zerado|zerada|sem (grana|dinheiro|um real|nada))\b|\bacabou (o |meu |todo o |todo meu )?dinheiro\b|\b(mes|semana) (ta|esta|tá) (osso|dificil|apertado|puxado|complicado|foda)\b|\b(fatura|conta) (ta|esta|tá) (me )?dando medo\b|\bnao (sei|to sabendo) (mais )?(como|o que) (pagar|fazer com (as|minhas) contas)\b/.test(t)) return { ...r, categoria: null, intent: 'aperto' };
  if (PAPO_PESSOAL.test(t) && !r.valor && !/\b(gast|saldo|fatura|orcamento|dinheiro|comprar|compra|paguei|pagar|investir|economizar|guardar)/.test(t)) return { ...r, categoria: null, intent: 'papo_pessoal' };
  // Moedas de jogo (JF, 15/11): Robux, V-Bucks, Diamantes, VP… é dinheiro de verdade, então é com ele.
  // Registro ("comprei 800 robux por 40") continua sendo registro.
  const jogo = acharMoedaJogo(t);
  if (jogo && !/\b(gastei|comprei|paguei)\b/.test(t)
    && /\b(moeda|moedas|quanto|quantos|preco|precos|vale|valendo|valor|cotacao|converter|convert|em reais|reais|real|comprar|compro|recarga|recarregar|gift|card|cartao|onde|qual|quais|como|pacote|barato|caro|compensa|pena)\b|\?/.test(t)) {
    const precoDeHoje = /\b(quanto|quantos|preco|precos|vale|valendo|valor|cotacao|converter|convert|em reais|barato|caro|compensa)\b/.test(t);
    return { ...r, categoria: null, intent: 'moeda_jogo', jogo, pacote: lerPacote(t), precoDeHoje };
  }
  // Continuação do assunto do jogo (JF, 16/11: "quanto tá valendo 100 robux?" e depois "mas quanto tá valendo em relação
  // ao real? qual a cotação" virava Ibovespa por causa de "cotação"). Sem outra moeda ou índice na frase, segue no jogo.
  const jogoAntes = !jogo && anterior?.intent === 'moeda_jogo' && anterior.jogo ? MOEDAS_JOGOS.find(j => j.jogo === anterior.jogo) : null;
  if (jogoAntes && !/\b(dolar|dolares|usd|euros?|libras?|bitcoin|btc|bolsa|ibovespa|ibov|b3|acoes|selic|cdi|ipca|inflacao)\b/.test(t)
    && /\b(cotacao|valendo|vale|valor|preco|precos|quanto|real|reais|converter|convert|cambio)\b/.test(t)) {
    return { ...r, categoria: null, intent: 'moeda_jogo', jogo: jogoAntes, pacote: lerPacote(t), precoDeHoje: true, seguimento: true };
  }
  // Fora do papel (JF, 15/11: "quem venceu o Brasileirão de 19xx? aí foge muito; a IA gastaria crédito à toa"):
  // esporte, horóscopo, receita de comida, letra de música, clima… sem dinheiro no meio, ele responde aqui mesmo,
  // sem chamar a IA, e sugere o Google.
  if (FORA_DO_PAPEL.test(t) && !/\b(gast|paguei|comprei|preco|precos|custa|custou|custo|orcamento|salario|dinheiro|reais|valor|ingresso|aposta|bilheteria|caro|barato|quanto (custa|sai|paga|ganha|ganhou))/.test(t)) return { ...r, categoria: null, intent: 'fora_do_papel' };
  // Fora do tema (JF, 15/11: "VisionQuest teve o mesmo orçamento da série Lanterns?!" virava "você não definiu
  // orçamentos"): fala de filme, série, jogo, time, artista… sem falar do próprio dinheiro vai pra IA online
  // (sem ela, "ainda não sei responder"). Registro com valor ("gastei 40 no cinema") continua sendo registro.
  if (FORA_DO_TEMA.test(t) && !r.valor && !/\b(eu|meu|minha|meus|minhas|gastei|paguei|comprei|assinei|assinatura|gasto|gastos|cartao|fatura)\b/.test(t)) return { ...r, categoria: null, intent: 'nao_entendi', foraDoTema: true };
  // Matemática básica (JF, 13/11 à noite: "ele ensina matemática básica pra gente"): "quanto é 15 x 23?"
  const conta = lerConta(t);
  if (conta) return { ...r, intent: 'conta', conta };
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
  // Corrigir o VALOR do último gasto (revisão do Gemini, 16/11): "errei, foi 45, não 50" virava um gasto novo de R$ 45
  if (r.valor && !pergunta && (/^(errei|ops|opa|na verdade|corrigindo|corrige|digitei errado|anotei errado)\b/.test(t)
    || /\b(foi|era|foram|eram) (r\$ ?)?\d+([.,]\d{1,2})?( reais)?,? (e )?(nao|n) (r\$ ?)?\d/.test(t)
    || /\b(muda|mude|troca|corrige|arruma) (o |esse |este |aquele )?(ultimo |ultima )?(gasto|lancamento|valor)\b.*\b(pra|para) (r\$ ?)?\d/.test(t))) {
    return { ...r, intent: 'corrigir_valor' };
  }
  // Dar baixa pela conversa (revisão do Gemini, 16/11; o JF pediu pra fazer já): fatura paga e amigo que pagou a parte
  if (/\bfatura\b/.test(t) && /\b(paguei|quitei|ja paguei|ja pago|ja foi paga|esta paga|ta paga)\b/.test(t) && !pergunta) {
    return { ...r, valor: null, categoria: null, intent: 'fatura_paga' };
  }
  if (/\b(me pagou|me pagaram|pagou a parte|pagou o que devia|devolveu|devolveram|acertou comigo|acertaram comigo|me mandou o pix|me fez o pix|me passou o pix|me pagou o pix|pagou)\b/.test(t)
    && !/\b(eu|paguei|gastei|comprei)\b/.test(t) && !pergunta) {
    return { ...r, categoria: null, intent: 'racha_pago' };
  }
  // Transferência pela conversa (revisão do Gemini, 16/11): "transferi 200 do Inter pro C6" vira proposta (com Confirmar)
  if (r.valor && /\b(transferi|transfiro|mandei|passei|movi|joguei|botei)\b/.test(t) && /\b(do|da|de)\b.+\b(pro|pra|para|pro meu|pra minha)\b/.test(t)) {
    return { ...r, categoria: null, intent: 'registrar_transferencia' };
  }
  // Corrigir a data do último gasto (JF, 14/11: "esse gasto foi na quarta-feira 09:15 da manhã")
  if (/\b(esse|este|essa|esta|aquele|aquela|o ultimo|a ultima|ultimo|ultima)\s+(gasto|lancamento|pagamento|valor|compra)\b/.test(t)
    && /\b(foi|era|e|aconteceu|pago|paguei|caiu)\b/.test(t)
    && /\b(ontem|anteontem|hoje|dia \d{1,2}|domingo|segunda|terca|quarta|quinta|sexta|sabado)\b/.test(t) && !pergunta) {
    return { ...r, valor: null, intent: 'corrigir_data' };
  }
  // Piso de segurança e salário (JF, 14/11): "meu piso no Banestes é 2000", "quanto posso gastar no C6?",
  // "me ajuda a dividir meu salário entre os bancos", "tive aumento?", "recebi mais ou menos que mês passado?"
  // a receber (15/11): "quanto vou receber?", "o que tenho pra receber?"
  if (!r.valor && /\b(quanto|o que|quando) (eu )?(ainda )?vou receber\b|\bentradas? previstas?\b/.test(t)) return { ...r, intent: 'previstas' };
  // média de segurança e transferências (JF, 14/11): "como tá minha média de segurança?", "qual banco tem folga?"
  if (/\b(media de seguranca|seguranca (geral|dos bancos|media|como um todo)|piso (geral|total|medio)|pisos no geral|vou estourar (o |meu )?piso|quando (o piso )?estoura)\b/.test(t)) return { ...r, intent: 'media_seguranca' };
  if (/\b(qual|que) (banco|conta) (tem|ta com|esta com) (folga|sobra|mais dinheiro)\b|\b(de onde|qual banco) (eu )?(tiro|transfiro|passo)\b|\b(sugere|sugira|sugestao de) (uma )?transferencia\b|\btransferir pra (cobrir|completar)\b/.test(t)) return { ...r, intent: 'sugerir_transferencia' };
  if (/\b(piso|pisos|minimo de seguranca|valor de seguranca)\b/.test(t)) return { ...r, intent: r.valor && !pergunta ? 'definir_piso' : 'pisos' };
  if (/\b(dividir|distribuir|repartir|partilhar|parcionar|particionar|separar|organizar)\b/.test(t) && /\b(banco|bancos|contas)\b/.test(t)) return { ...r, intent: 'dividir_entre_bancos' };
  if (/quanto (eu )?(ainda )?(posso|da pra|consigo|devo) (gastar|usar|tirar)( ainda)? (no|na|do|da|pelo|pela)\b/.test(t)) return { ...r, intent: 'folga_conta' };
  if (/\b(aumento|aumentou|reajuste|diminuiu|reducao|reduziu|caiu meu salario)\b/.test(t) && /\b(salario|recebi|ganho|ganhei|tive|meu)\b/.test(t) && !r.valor) return { ...r, intent: 'entradas_comparar' };
  if (/\b(mais ou menos|menos ou mais|comparad[oa]|do que o mes passado|que o mes passado|que mes passado)\b/.test(t) && /\b(recebi|salario|entrou|entrada|entradas|ganhei)\b/.test(t)) return { ...r, intent: 'entradas_comparar' };
  // Registro ("gastei 30 no mercado", "paguei 120 de luz", "recebi 1500 de salario")
  if (r.valor && !/\bquanto\b/.test(t)) {
    // sem verbo, mas dizendo como pagou (JF, 14/11: "7 reais no débito do Inter", "5,50 numa casquinha pelo débito")
    if (!pergunta && /\b(pix|debito|credito|cartao|dinheiro)\b/.test(t) && !/\b(recebi|ganhei|entrou|caiu)\b/.test(t)) return { ...r, intent: 'registrar_gasto' };
    // (o "quanto vou receber?" é pergunta, sem valor: fica mais abaixo)
    // "vou receber 500 dia 20" (JF, 15/11): entrada prevista, ainda não entrou
    if (/\b(vou receber|vou ganhar|vai cair|vai entrar|tenho (a|pra|para) receber|vao me pagar|vai me pagar|vou ser pago)\b/.test(t)) return { ...r, intent: 'registrar_entrada', prevista: true };
    if (/\b(recebi|recebo|ganhei|ganho|entrou|caiu|recebemos|me pagaram)\b/.test(t)) return { ...r, intent: 'registrar_entrada' };
    if (/\b(gastei|paguei|comprei|torrei|saiu|pedi|abasteci|gasto de|gastamos|passei|deixei|foram|foi)\b/.test(t)) return { ...r, intent: 'registrar_gasto' };
    // 2.3.0.1 (JF): "joguei 10 no bolão da mega", "fiz uma fezinha de 20 na quina" (aposta é gasto, em Lazer)
    if (LOTERIA.test(t) && /\b(joguei|apostei|jogamos|apostamos|fiz|fizemos|entrei)\b/.test(t)) return { ...r, intent: 'registrar_gasto' };
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
  // Pesquisa de compra e viagem (JF, 16/11): "quanto custaria uma viagem pros EUA?", "me ajuda a achar uma geladeira".
  // Ele pede o orçamento e a IA online pesquisa 2 a 4 sites; ele orienta, não entrega a resposta pronta.
  const pesquisa = acharPesquisa(t, r.valor);
  if (pesquisa) return { ...r, categoria: null, intent: 'pesquisa_compra', ...pesquisa };
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
  // efeito formiguinha (JF, 16/11): "quais meus gastinhos?", "gastos pequenos", "efeito formiga"
  if (/(formiguinha|efeito formiga|gastinhos?\b|gastos? (pequenos?|miudos?|de formiga)|pequenos gastos)/.test(t) && !r.valor) return { ...r, intent: 'formiguinha' };
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
  // revisão do Gemini (16/11): os parênteses faltavam (a trava do "o que é" só valia pra metade) e "guardo + limite + como"
  // pegava qualquer pergunta de guardar dinheiro
  if (!/^(o que (e|sao|significa)|me explica|explica)\b/.test(t) && (/(limite garantido|cdb (mais )?limite|limite (com|por) (garantia|investimento)|cdb cartao)/.test(t)
    || (/limite/.test(t) && /(invest|aplica|cdb|cofrinho|caixinha)/.test(t) && /(aumenta|aumentar|ganh|liber|vira|transforma)/.test(t)))) {
    return { ...r, intent: 'limite_investido' };
  }
  const termo = acharTermo(t);
  const contexto = t.match(/\b(meu|minha) (pai|mae|chefe|amigo|amiga|irmao|irma|avo|tio|tia|namorad[oa]|esposa|marido|professor[a]?|colega)\b.*\b(falou|disse|comentou|mencionou|falaram)\b/);
  if (termo && (contexto || /(o que (e|sao|significa|quer dizer)|\bque (e|sao)\b|me explica|explica|me ensina|como funciona|ouvi falar|vi falar|nunca entendi|nao entendo|nao sei o que)/.test(t))) {
    return { ...r, intent: 'glossario', termo, quem: contexto ? contexto[2] : null };
  }
  // 2.3.0 (JF): iene, dólar canadense, franco suíço, yuan e rublo ("rubra" também, do jeito que o JF escreveu)
  const ativo = /\b(dolar(es)? canadense(s)?|cad)\b/.test(t) ? 'CAD' : /\b(ienes?|yen|yenes|jpy)\b/.test(t) ? 'JPY'
    : /\b(francos? suicos?|chf)\b/.test(t) ? 'CHF' : /\b(yuan|yuans|iuane?s?|renminbi|cny)\b/.test(t) ? 'CNY'
    : /\b(rublos?|rubra|rub)\b/.test(t) ? 'RUB'
    : /\b(dolar|dolares|usd)\b/.test(t) ? 'USD' : /\beuros?\b/.test(t) ? 'EUR' : /\blibras?\b/.test(t) ? 'GBP'
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
  // 2.4.3 (JF, 17/11): frase de pensador ou investidor, ditado popular e curiosidade de dinheiro, sem gastar IA
  if (/(frase (do dia|de motivacao|motivacional|inspiradora|de (um |algum )?(pensador|filosofo|investidor|milionario|bilionario|famoso))|outra frase|me (motiva|inspira|anima)|motivacao|pensamento do dia|citacao)/.test(t) && !r.valor) return { ...r, intent: 'motivacao' };
  if (/(ditado|proverbio|outro ditado)/.test(t) && !r.valor) return { ...r, intent: 'ditado' };
  if (/(curiosidade|me conta (algo|alguma coisa|uma coisa) (legal|interessante|curiosa)|fato curioso|me ensina (algo|alguma coisa)|coisa interessante sobre (dinheiro|financas))/.test(t) && !/(gast|paguei|anot)/.test(t) && !r.valor) return { ...r, intent: 'curiosidade_fin' };
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
  if (/^(o+i+e*|ola+|e a+i+|ea+i+|opa+|bom dia|boa tarde|boa noite|salve+|he+y+|alo+)\b/.test(t)) return { ...r, intent: 'saudacao' }; // "oii", "oie", "eaii" (teste do amigo do JF, 15/11)
  // 2.4.2 (JF: "qual melhor shopping pra curtir um cinema?" respondia "nenhum gasto em Compras"): nome de categoria
  // só vira "quanto gastei" em pergunta curta ("e no mercado?") ou que fala de gasto; o resto vai pra IA
  if (r.categoria && pergunta && (t.split(/\s+/).length <= 4 || /\b(quanto|total|soma|gastos?|gastei|foi)\b/.test(t))) return { ...r, intent: 'gasto_total' };
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
// moeda que vale centavos (iene, rublo, peso): 4 casas, senão vira "R$ 0,04" pra tudo (2.3.0)
const fmtReal = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: v < 1 ? 4 : 2, maximumFractionDigits: v >= 1000 ? 0 : v < 1 ? 4 : 2 });

/** Uma linha com o número, a variação e a tendência, mostrando a conta (base de cálculo). */
const NOME_ATIVO = { JPY: 'iene', CAD: 'dólar canadense', CHF: 'franco suíço', CNY: 'yuan', RUB: 'rublo', USD: 'dólar', EUR: 'euro', GBP: 'valor da libra', BTC: 'bitcoin', ARS: 'peso argentino', IBOV: 'Ibovespa', SELIC: 'valor da Selic', CDI: 'CDI', IPCA: 'IPCA' };

function textoAtivo(m, a) {
  if (a === 'SELIC') return m.selic ? `Selic: ${fmtPct(m.selic.valor)} ao ano${m.ipca12 ? `; com a inflação em 12 meses em ${fmtPct(m.ipca12.valor)}, o juro real fica perto de ${fmtPct(m.selic.valor - m.ipca12.valor)}` : ''}.` : '';
  if (a === 'CDI') return m.cdi ? `CDI: ${fmtPct(m.cdi.valor)} ao ano. É a referência da renda fixa (um CDB "100% do CDI" rende isso, antes do imposto).` : '';
  if (a === 'IPCA') return m.ipca12 ? `Inflação (IPCA) em 12 meses: ${fmtPct(m.ipca12.valor)}.` : '';
  const x = a === 'IBOV' ? m.ibov : m.moedas?.[a];
  if (!x) return '';
  const valor = a === 'IBOV' ? `${Math.round(x.atual).toLocaleString('pt-BR')} pontos` : fmtReal(x.atual);
  const media = x.media20 != null ? ` A média dos últimos ${Math.min(20, x.dias)} dias é ${a === 'IBOV' ? `${Math.round(x.media20).toLocaleString('pt-BR')} pontos` : fmtReal(x.media20)}, e ele está ${x.atual >= x.media20 ? 'acima' : 'abaixo'} dela: ${textoTendencia(x.tendencia)}.` : '';
  // moeda miúda (iene, rublo): o jeito de entender é em 100 unidades (2.3.0)
  const cem = a !== 'IBOV' && x.atual < 0.5 ? ` Ou seja, 100 ${x.nome.split(' ')[0].toLowerCase()}s = ${fmtReal(x.atual * 100)}.` : '';
  return `${x.nome || 'Ibovespa'}: ${valor}${x.varDia != null ? ` (${sinal(x.varDia)} no dia` : ''}${x.var5 != null ? `, ${sinal(x.var5)} em 5 dias)` : x.varDia != null ? ')' : ''}.${cem}${media}`;
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
  desc = desc.replace(HORAS, ' ').replace(/\b(da manha|da tarde|da noite|da madrugada)\b/g, ' ').replace(/\b(dia \d{1,2}|anteontem|ontem|hoje)\b/gi, ' ').replace(/\bdia\s*$/i, ' ').replace(/\s+/g, ' ').trim();
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
/** Acha o banco citado na frase ("no C6", "do banestes", "mercado pago"), pelo nome ou apelido. */
function acharConta(t, contas) {
  let melhor = null;
  for (const a of contas) {
    const nomes = [a.bank, a.nickname, String(a.bank || '').split(/\s+/)[0]].filter(x => x && norm(x).length >= 2).map(norm);
    for (const n of nomes) if (new RegExp(`(^|\\s)${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(t) && (!melhor || n.length > melhor.n.length)) melhor = { a, n };
  }
  return melhor?.a || null;
}

const diaMes = iso => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;

/** Descrição da entrada ("recebi 200 de extra da gasolina" → "Extra da gasolina"); vazia se for só o nome da fonte. */
function notaDaEntrada(t, fonte, accounts = []) {
  const m = String(t).match(/\b(?:de|do|da|pelo|pela|pra|por)\s+([a-z0-9 ]{3,60})$/);
  let d = m ? m[1] : '';
  d = limparPagamento(d.replace(/\b(no|na)\s+[a-z0-9 ]+$/, ''), accounts) || '';
  d = d.replace(/\b(dia \d{1,2}|ontem|hoje|anteontem)\b/g, '').trim();
  if (!d || norm(fonte.name).includes(d) || /^(salario|pagamento|freela|extra)$/.test(d)) return '';
  return (d[0].toUpperCase() + d.slice(1)).slice(0, 60);
}

export function descricaoDe(t) {
  // 2.3.0 (JF, foto com legenda): "comprei esse tênis por 250", "gastei 80 nessa camisa" → "tenis", "camisa"
  const m = String(t).match(/\b(?:no|na|nos|nas|em|de|do|da|com|pro|pra|num|numa|nesse|nessa|neste|nesta)\s+([a-z0-9 ]{2,40})$/)
    || String(t).match(/\bcomprei\s+(?:(?:um|uma|uns|umas|esse|essa|este|esta|esses|essas|o|a|os|as|meu|minha|meus|minhas)\s+)?([a-z ]{2,30}?)\s+(?:por|de|a|em|no|na|pelo|pela)?\s*(?:r\$\s*)?\d/);
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
      // corta o jeito de pagar antes de achar a descrição ("5,50 numa casquinha no mcdonalds pelo débito do inter")
      const semPag = intencao.t.split(/\s+(?:(?:no|na|pelo|pela|via|com|em|de|do|da)\s+)?(?:pix|debito|credito|cartao|dinheiro)\b/)[0];
      // moeda de jogo ("comprei 800 robux por 40"): a descrição é a moeda e a categoria é Lazer (15/11)
      const jogoReg = acharMoedaJogo(intencao.t);
      const desc = limparPagamento(descricaoDe(semPag) || descricaoDe(intencao.t), dados.accounts) || (jogoReg ? jogoReg.moeda.split(' (')[0] : '');
      // categoria: pela palavra (sinônimos) ou pelo que ele aprendeu com o histórico da pessoa
      const aprendida = !intencao.categoria && jogoReg && !/\b(mercado|restaurante|uber)\b/.test(intencao.t) ? { categoryId: 'jogos' }
        : !intencao.categoria && desc ? sugerirCategoria(desc, expenses) : null;
      const cat = intencao.categoria || (aprendida && categories.find(c => c.id === aprendida.categoryId))
        || categories.find(c => c.id === 'outros') || categories[0];
      // nem categoria nem descrição ("7 reais no débito do Inter"): pergunta em quê, sem inventar "Outros"
      if (!intencao.categoria && !aprendida && !desc && !intencao.vaquinha) {
        const extra = intencao.t.slice(semPag.length).trim();
        return { fato: `Anotando ${formatBRL(intencao.valor)}. Foi em quê? Tipo "mercado", "uber" ou "farmácia".`, cru: true,
          sugestoes: ['Mercado', 'Restaurante', 'Transporte', 'Deixa pra depois'], aguardar: { tipo: 'desc_gasto', valor: intencao.valor, extra } };
      }
      const recorrente = /\b(internet|luz|energia|agua|aluguel|condominio|netflix|spotify|streaming|academia|plano|celular|telefone|assinatura|mensalidade|escola|faculdade|seguro|gas)\b/.test(intencao.t)
        || ['contas', 'moradia', 'streaming'].includes(cat?.id);
      return {
        gatilho: 'proposta_registro',
        dica: [avisoDaData(dataDoTexto(intencao.t, today), today), recorrente ? 'Isso parece conta de todo mês. Se for, cadastra em 📅 Mês → Contas fixas que eu passo a lembrar do vencimento e já entra no planejamento.' : null,
          // 15/11 (JF, que compra Robux): gasto com jogo ganha a dica de gift card × crédito
          cat?.id === 'jogos' && !lerPagamento(intencao.t, dados.accounts).forma ? 'Dica de gamer: gift card ajuda a gastar só o que você separou pro jogo; no crédito é mais prático pra compra que se repete (passe, assinatura), mas aí vale ficar de olho na fatura.' : null,
          // 2.3.0.1 (JF): fezinha anotada; a partir de R$ 50 no mês, ele mostra o total, sem sermão
          (() => {
            if (!LOTERIA.test(intencao.t)) return null;
            const tot = expenses.filter(e => e.date.slice(0, 7) === mes && ehLoteriaNota(e.note)).reduce((x, e) => x + e.amountCents, 0) + intencao.valor;
            return tot >= 5000 ? `Com essa, a fezinha do mês vai a ${formatBRL(tot)}. Boa sorte! Só não deixa a sorte entrar no orçamento das contas.` : 'Boa sorte! 🍀';
          })()].filter(Boolean).join(' ') || null,
        vars: { valor: formatBRL(intencao.valor), categoria: cat?.name ?? 'Outros' },
        acao: { tipo: 'registrar_gasto', amountCents: intencao.valor, categoryId: cat?.id ?? 'outros', date: dataDoTexto(intencao.t, today),
          note: intencao.vaquinha ? 'Vaquinha (minha parte)' : LOTERIA.test(intencao.t) ? nomeDaFezinha(intencao.t) : desc ? desc[0].toUpperCase() + desc.slice(1) : '', ...lerPagamento(intencao.t, dados.accounts) },
        aprendeu: !!aprendida,
        pagamento: true,
      };
    }
    case 'pagamento_resposta':
      return intencao.resposta;
    case 'corrigir_valor': {
      const ult = [...expenses].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
      if (!ult) return { fato: 'Não achei gasto pra corrigir. Me fala de novo o valor e onde foi, que eu anoto.', cru: true, sugestoes: [] };
      const nome = ult.note || categories.find(c => c.id === ult.categoryId)?.name || 'gasto';
      if (ult.amountCents === intencao.valor) return { fato: `O gasto "${nome}" já está com ${formatBRL(ult.amountCents)}.`, cru: true, sugestoes: [] };
      return { fato: `Mudar o valor de "${nome}" de ${formatBRL(ult.amountCents)} pra ${formatBRL(intencao.valor)}?`, cru: true, sugestoes: [],
        acao: { tipo: 'editar_valor', expenseId: ult.id, amountCents: intencao.valor } };
    }
    case 'registrar_transferencia': {
      const contas = (dados.accounts || []).filter(a => a.tipo !== 'cartao');
      const [, deTxt = '', paraTxt = ''] = intencao.t.match(/\b(?:do|da|de)\b(.+?)\b(?:pro|pra|para)\b(.+)$/) || [];
      const de = acharConta(` ${deTxt} `, contas), para = acharConta(` ${paraTxt} `, contas);
      if (!de || !para || de.id === para.id) {
        return { fato: `Não achei as duas contas nessa frase. Fala tipo "transferi 200 do Inter pro Nubank", com os nomes como estão em Contas.${contas.length < 2 ? ' Pra transferir, você precisa de 2 contas cadastradas.' : ''}`, cru: true, sugestoes: [] };
      }
      return { fato: `Anotar a transferência de ${formatBRL(intencao.valor)} de ${accountLabel(de)} pra ${accountLabel(para)}? Não é gasto nem entrada: o dinheiro só muda de lugar.`, cru: true, sugestoes: [],
        acao: { tipo: 'transferir', deId: de.id, paraId: para.id, amountCents: intencao.valor, date: dataDoTexto(intencao.t, today) } };
    }
    case 'corrigir_data': {
      // o último gasto anotado (da categoria, se a frase disser: "esse valor em saúde")
      const lista = [...expenses].filter(e => !intencao.categoria || e.categoryId === intencao.categoria.id)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const ult = lista[0];
      if (!ult) return { fato: 'Não achei esse gasto aqui. Me fala de novo o valor e onde foi, que eu anoto com a data certa.', cru: true, sugestoes: [] };
      const nova = dataDoTexto(intencao.t, today);
      const dm = iso => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;
      const nome = ult.note || categories.find(c => c.id === ult.categoryId)?.name || 'gasto';
      if (nova === ult.date) return { fato: `O gasto "${nome}" (${formatBRL(ult.amountCents)}) já está no dia ${dm(nova)}.`, cru: true, sugestoes: [] };
      return { fato: `Mudar a data de "${nome}" (${formatBRL(ult.amountCents)}) de ${dm(ult.date)} pra ${dm(nova)}?`, cru: true, sugestoes: [],
        acao: { tipo: 'editar_data', expenseId: ult.id, date: nova } };
    }
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
    case 'fatura_paga': {
      const cartoes = (dados.accounts || []).filter(a => a.tipo === 'cartao');
      const cartao = acharConta(intencao.t, cartoes) || (cartoes.length === 1 ? cartoes[0] : null);
      if (!cartao) return { fato: cartoes.length ? `De qual cartão? ${cartoes.map(c => accountLabel(c)).join(', ')}.` : 'Você ainda não tem cartão cadastrado aqui. Dá pra cadastrar em Contas.', cru: true, sugestoes: cartoes.slice(0, 4).map(c => `Paguei a fatura do ${c.bank}`) };
      const f = faturaDoCartao(comReforco(cartao, dados.accounts, expenses, dados.incomes || [], dados.transferencias || []), expenses, today);
      if (!f.fechadaCents) return { fato: `A fatura do ${accountLabel(cartao)} ainda não fechou: tem ${formatBRL(f.abertaCents)} na aberta. Quando fechar, aí você me fala que pagou.`, cru: true, sugestoes: [] };
      return { fato: `Marcar a fatura de ${formatBRL(f.fechadaCents)} do ${accountLabel(cartao)} como paga? O limite volta pra você.`, cru: true, sugestoes: [],
        acao: { tipo: 'fatura_paga', cartaoId: cartao.id, ate: f.ultimoFechamento, valorCents: f.fechadaCents } };
    }
    case 'racha_pago': {
      const lista = aReceber(expenses).itens;
      if (!lista.length) return { fato: 'Não tem ninguém te devendo aqui no app. Quando dividir uma conta, eu anoto quem falta pagar.', cru: true, sugestoes: [] };
      const achou = lista.filter(p => norm(p.nome).split(/\s+/).some(n => n.length >= 2 && new RegExp(`(^|\\s)${n}(\\s|$)`).test(intencao.t)));
      if (!achou.length) return { fato: `Quem foi? Tá me devendo: ${[...new Set(lista.map(p => p.nome))].slice(0, 6).join(', ')}.`, cru: true, sugestoes: [...new Set(lista.map(p => `${p.nome} me pagou`))].slice(0, 4) };
      // mais de uma conta da mesma pessoa: a do valor dito, ou a mais antiga
      const p = (intencao.valor && achou.find(x => x.valorCents === intencao.valor)) || achou.sort((a, b) => a.date.localeCompare(b.date))[0];
      return { fato: `Marcar que ${p.nome} te pagou ${formatBRL(p.valorCents)}${p.note ? ` (${p.note})` : ''}?`, cru: true, sugestoes: [],
        acao: { tipo: 'racha_recebido', expenseId: p.expenseId, pessoaId: p.pessoaId, nome: p.nome, valorCents: p.valorCents } };
    }
    case 'gasto_sem_valor': {
      // "paguei o aluguel": se é uma conta fixa cadastrada e ainda não paga este mês, propõe lançar ela (16/11)
      const fixa = situacaoCompromissos(dados.compromissos || [], expenses, today)
        .find(c => c.noMes && c.status !== 'pago' && norm(c.nome).length >= 3 && intencao.t.includes(norm(c.nome)));
      if (fixa && /\b(paguei|quitei|pago|ja paguei)\b/.test(intencao.t)) {
        const comp = (dados.compromissos || []).find(c => c.id === fixa.id) || fixa;
        return { fato: `Lançar ${fixa.nome} como pago: ${formatBRL(fixa.faltaCents)}? Se o valor foi outro, me fala tipo "paguei ${norm(fixa.nome)} 1350".`, cru: true, sugestoes: [],
          acao: { tipo: 'registrar_gasto', amountCents: fixa.faltaCents, categoryId: comp.categoryId || 'contas', note: fixa.nome, date: today, accountId: comp.accountId || null, compromissoId: fixa.id } };
      }
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
      // prevista: "dia 20" é o próximo dia 20 (este mês se ainda não passou, senão o que vem)
      let data = dataDoTexto(intencao.t, today);
      if (intencao.prevista) {
        const m = intencao.t.match(/\bdia (\d{1,2})\b/);
        const d = m ? Number(m[1]) : null;
        const [ay, am, ad] = today.split('-').map(Number);
        // revisão do Gemini (16/11): "dia 16" no dia 16 é hoje (não o mês que vem); "dia 31" num mês curto vira o
        // último dia; "na sexta" é a PRÓXIMA sexta (o dataDoTexto olha pra trás, que é o certo pra gasto)
        const sem = intencao.t.match(/\b(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:[- ]feira)?\b/);
        if (d) {
          const mesAlvo = d >= ad ? am - 1 : am; // índice do mês (0 a 11), pode passar de 11: o Date ajusta o ano
          const ultimo = new Date(ay, mesAlvo + 1, 0).getDate();
          data = toISODate(new Date(ay, mesAlvo, Math.min(d, ultimo)));
        } else if (sem) {
          const alvo = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].indexOf(sem[1]);
          const hojeSem = new Date(ay, am - 1, ad).getDay();
          data = toISODate(new Date(ay, am - 1, ad + ((alvo - hojeSem + 7) % 7)));
        } else data = data < today ? today : data;
      }
      // 2.3.0 (JF, 17/11): plantão é extra (anotado como "Plantão"); muitos no mês, ele sugere descansar, sem mandar
      const ehPlantao = /\bplant(ao|oes|onista)\b/.test(intencao.t);
      let dicaPlantao = null;
      if (ehPlantao && !intencao.prevista) {
        const nPlant = d => (dados.incomes || []).filter(i => i.date > d && i.date <= today && /plant/.test(norm(i.note || ''))).length + 1;
        const mesN = nPlant(toISODate(new Date(new Date(`${today}T12:00:00`).getTime() - 30 * 86_400_000)));
        const semN = nPlant(toISODate(new Date(new Date(`${today}T12:00:00`).getTime() - 7 * 86_400_000)));
        if (semN >= 3 || mesN >= 8) {
          dicaPlantao = `${semN >= 3 ? `É o ${semN}º plantão em 7 dias` : `É o ${mesN}º plantão em 30 dias`}. O extra ajuda muito, e quem decide é você: só não esquece de descansar. Cansado, a gente gasta mais (delivery, corrida de app, compra por impulso) e o extra vai embora.`;
        }
      }
      return {
        ...(dicaPlantao ? { dica: dicaPlantao } : {}),
        gatilho: 'proposta_registro',
        vars: { valor: formatBRL(intencao.valor), categoria: intencao.prevista ? `entrada prevista pra ${data.slice(8, 10)}/${data.slice(5, 7)} (${fonte.name})` : `entrada (${fonte.name})` },
        // "recebi 1500 de salário no nubank": a entrada cai na conta (achado do Gemini); cartão nunca recebe entrada
        acao: { tipo: 'registrar_entrada', amountCents: intencao.valor, sourceId: fonte.id, date: data, note: ehPlantao ? 'Plantão' : notaDaEntrada(intencao.t, fonte, dados.accounts), ...(intencao.prevista ? { prevista: true } : {}),
          accountId: lerPagamento(intencao.t, (dados.accounts || []).filter(a => a.tipo !== 'cartao')).accountId || null },
      };
    }
    case 'gasto_total': {
      const filtro = intencao.categoria ? e => e.categoryId === intencao.categoria.id : () => true;
      const { totalCents, count } = sumInRange(expenses, range, filtro);
      const onde = intencao.categoria ? ` em ${intencao.categoria.name}` : '';
      if (!count) return { fato: `Nenhum gasto${onde} ${range.label}.`, sugestoes: ['Gastei 25 no mercado', 'Algum alerta?'] };
      let extra = '';
      // "quanto gastei de Uber?" (revisão do Gemini, 16/11): se a palavra bate com a descrição, mostra só ela também
      const termo = (intencao.t.match(/\b(?:de|com|no|na|em)\s+([a-z0-9]{3,})(?:\s|$)/) || [])[1];
      if (termo && !['este', 'esse', 'mes', 'semana', 'hoje', 'ontem', 'gasto', 'gastos', 'total'].includes(termo)) {
        const doTermo = expenses.filter(e => e.date >= range.from && e.date <= range.to && norm(e.note || '').split(/\s+/).includes(termo));
        const sub = doTermo.reduce((s, e) => s + e.amountCents, 0);
        if (doTermo.length && sub !== totalCents) extra = ` Só de ${termo}: ${formatBRL(sub)}, em ${doTermo.length} ${doTermo.length === 1 ? 'lançamento' : 'lançamentos'}.`;
      }
      if (intencao.categoria && intencao.periodo === 'mes' && intencao.categoria.budgetCents) {
        extra += ` São ${pct(totalCents, intencao.categoria.budgetCents)}% do orçamento de ${formatBRL(intencao.categoria.budgetCents)}.`;
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
      const porFonte = INCOME_SOURCES.map(s => ({ s, v: sumInRange(incomes, range, i => i.sourceId === s.id && filtro(i)).totalCents }))
        .filter(x => x.v > 0).map(x => `${x.s.emoji} ${x.s.name} ${formatBRL(x.v)}`).join(', ');
      const gastos = sumInRange(expenses, range).totalCents;
      const saldo = totalCents - gastos;
      // o que entrou além do salário, com a descrição (JF, 14/11: "o extra da gasolina")
      const extras = incomes.filter(i => i.date >= range.from && i.date <= range.to && i.sourceId !== 'salario' && filtro(i)).slice(0, 4)
        .map(i => `${i.note || INCOME_SOURCES.find(s => s.id === i.sourceId)?.name} ${formatBRL(i.amountCents)} (${diaMes(i.date)})`);
      return {
        fato: `Entrou ${formatBRL(totalCents)} ${range.label} (${porFonte}).${extras.length && intencao.fonte !== 'salario' ? ` ${especifica ? 'Foi' : 'Além do salário'}: ${extras.join(', ')}.` : ''}${especifica ? '' : ` Saiu ${formatBRL(gastos)}, então o saldo do período está ${saldo >= 0 ? 'positivo em' : 'negativo em'} ${formatBRL(Math.abs(saldo))}.`}`,
        sugestoes: ['Onde mais gastei?', 'Qual meu saldo?'],
      };
    }
    case 'entradas_comparar': {
      const este = monthKey(today), antes = shiftMonth(este, -1);
      const doMes = (m, f = () => true) => incomes.filter(i => i.month === m && f(i)).reduce((t, i) => t + i.amountCents, 0);
      const salA = doMes(este, i => i.sourceId === 'salario'), salB = doMes(antes, i => i.sourceId === 'salario');
      const totA = doMes(este), totB = doMes(antes);
      if (!totA && !totB) return { fato: 'Ainda não tem entrada anotada neste mês nem no passado. Me fala tipo "recebi 3000 de salário dia 5 no Banestes".', cru: true, sugestoes: ['Recebi 3000 de salário'] };
      const comp = (a, b, nome) => !b ? `${nome} deste mês: ${formatBRL(a)} (mês passado não tem anotado)` : a === b ? `${nome}: ${formatBRL(a)}, igual ao mês passado` : `${nome}: ${formatBRL(a)}, ${a > b ? 'mais' : 'menos'} ${formatBRL(Math.abs(a - b))} que o mês passado (${formatBRL(b)})`;
      const extras = incomes.filter(i => i.month === este && i.sourceId !== 'salario').map(i => `${i.note || INCOME_SOURCES.find(s => s.id === i.sourceId)?.name} ${formatBRL(i.amountCents)} dia ${Number(i.date.slice(8))}`);
      const aumento = salA && salB && salA !== salB ? (salA > salB ? ' Pelo salário anotado, teve aumento.' : ' Pelo salário anotado, veio menor.') : '';
      return { fato: `${comp(salA, salB, 'Salário')}. ${comp(totA, totB, 'Tudo que entrou')}.${aumento}${extras.length ? ` Extras deste mês: ${extras.slice(0, 4).join(', ')}.` : ''}`, cru: true,
        sugestoes: ['Me ajuda a dividir o salário entre os bancos', 'Quanto gastei este mês?'] };
    }
    case 'definir_piso': {
      const contas = (dados.accounts || []).filter(a => a.tipo !== 'cartao');
      const conta = acharConta(intencao.t, contas) || (contas.length === 1 ? contas[0] : null);
      if (!conta) return { fato: `Piso de ${formatBRL(intencao.valor)} em qual banco? Me fala tipo "meu piso no Banestes é 2000".`, cru: true, sugestoes: contas.slice(0, 4).map(a => `Piso no ${a.bank} é ${(intencao.valor / 100).toFixed(0)}`) };
      return { fato: `Combinado: o piso de segurança de ${accountLabel(conta)} fica em ${formatBRL(intencao.valor)}. Eu aviso quando o saldo chegar perto. Confirma?`, cru: true, sugestoes: [],
        acao: { tipo: 'definir_piso', accountId: conta.id, pisoCents: intencao.valor } };
    }
    case 'media_seguranca':
    case 'sugerir_transferencia': {
      const rp = resumoPisos((accounts || []), expenses, incomes, dados.transferencias || [], today);
      if (!rp.comPiso.length) return { fato: 'Pra fazer a média de segurança, preciso dos pisos dos seus bancos principais. Me fala tipo "meu piso no Banestes é 2000".', cru: true, sugestoes: [] };
      const nomes = rp.comPiso.map(c => c.nome).join(' e ');
      const comFolga = rp.contas.filter(c => c.folgaCents > 0).sort((a, b) => b.folgaCents - a.folgaCents).map(c => `${c.nome} ${formatBRL(c.folgaCents)}${c.pisoCents ? '' : ' (sem piso)'}`);
      const abaixo = rp.contas.filter(c => c.pisoCents && c.folgaCents < 0).map(c => `${c.nome} está ${formatBRL(-c.folgaCents)} abaixo do piso`);
      let fato = intencao.intent === 'sugerir_transferencia' ? `${comFolga.length ? `Folga: ${comFolga.join(', ')}. ` : ''}${abaixo.length ? `${abaixo.join('; ')}. ` : ''}` : `Somando ${nomes}: ${formatBRL(rp.saldoTotalCents)} pra um piso total de ${formatBRL(rp.pisoTotalCents)}. `;
      if (intencao.intent !== 'sugerir_transferencia') {
        if (rp.status === 'estourado') fato += `Já passou do piso em ${formatBRL(-rp.folgaTotalCents)}. `;
        else if (rp.diasAteEstourar != null) fato += `Folga de ${formatBRL(rp.folgaTotalCents)}: no ritmo de ${formatBRL(rp.gastoDiaCents)} por dia nesses bancos, ela acaba em ${rp.diasAteEstourar} ${rp.diasAteEstourar === 1 ? 'dia' : 'dias'}. `;
        else fato += `Folga de ${formatBRL(rp.folgaTotalCents)}, e ainda não tem gasto anotado nesses bancos este mês. `;
      }
      const t = sugerirTransferencias(rp.contas);
      if (t.passos.length) fato += `Sugestão: ${t.passos.map(p => `passar ${formatBRL(p.valorCents)} do ${p.de} pro ${p.para}`).join('; ')}.${t.aindaFaltaCents ? ` Mesmo assim faltam ${formatBRL(t.aindaFaltaCents)}.` : ''} Quem decide é você.`;
      else if (rp.contas.some(c => c.pisoCents && c.folgaCents < 0)) fato += 'Não tem outro banco com folga pra cobrir agora.';
      else fato += intencao.intent === 'sugerir_transferencia' ? 'Nenhum banco está abaixo do piso: não precisa transferir agora.' : 'Cada banco está acima do próprio piso.';
      return { fato: fato.trim(), cru: true, sugestoes: ['Quanto posso gastar no C6?', 'Me ajuda a dividir o salário entre os bancos'] };
    }
    case 'pisos':
    case 'folga_conta': {
      const contas = (dados.accounts || []).filter(a => a.tipo !== 'cartao');
      const achada = acharConta(intencao.t, contas);
      const lista = (achada ? [achada] : contas).map(a => ({ a, saldo: accountBalance(a, expenses, incomes, dados.transferencias || []) }));
      if (!contas.length) return { fato: 'Cadastra seus bancos em Contas primeiro. Depois me fala o piso de cada um, tipo "meu piso no Banestes é 2000".', cru: true, sugestoes: [] };
      const linhas = lista.map(({ a, saldo }) => {
        const p = folgaDoPiso(a, saldo);
        if (!p) return `${accountLabel(a)}: ${formatBRL(saldo)}, sem piso definido`;
        return p.abaixo ? `${accountLabel(a)}: ${formatBRL(saldo)}, ${formatBRL(-p.folgaCents)} abaixo do piso de ${formatBRL(p.pisoCents)}`
          : `${accountLabel(a)}: dá pra gastar até ${formatBRL(p.folgaCents)} sem passar do piso de ${formatBRL(p.pisoCents)}`;
      });
      const semPiso = lista.some(({ a }) => !(a.pisoCents > 0));
      return { fato: `${linhas.join('. ')}.${semPiso ? ' Pra definir um piso, me fala tipo "meu piso no Banestes é 2000".' : ''}`, cru: true,
        sugestoes: ['Me ajuda a dividir o salário entre os bancos'] };
    }
    case 'dividir_entre_bancos': {
      const contas = (dados.accounts || []).filter(a => a.tipo !== 'cartao' && !a.paraQuem);
      const ultimoSalario = [...incomes].filter(i => i.sourceId === 'salario').sort((a, b) => b.date.localeCompare(a.date))[0];
      const valor = intencao.valor || ultimoSalario?.amountCents || 0;
      if (!valor) return { fato: 'Quanto você quer dividir? Me fala tipo "dividir 3000 entre os bancos".', cru: true, sugestoes: [] };
      const lista = contas.map(a => ({ id: a.id, nome: accountLabel(a), pisoCents: a.pisoCents || 0, saldoCents: accountBalance(a, expenses, incomes, dados.transferencias || []) }));
      if (!lista.some(c => c.pisoCents > 0)) return { fato: `Pra dividir ${formatBRL(valor)} do jeito certo, preciso saber o piso de segurança de cada banco: o mínimo que você quer manter lá. Me fala tipo "meu piso no Banestes é 2000".`, cru: true, sugestoes: [] };
      const d = dividirEntrePisos(valor, lista);
      const passos = d.passos.map((p, i) => `${i + 1}) ${formatBRL(p.valorCents)} pro ${p.nome}${p.completo ? ' voltar ao piso' : ' (ainda não chega no piso)'}`);
      const base = intencao.valor ? '' : ` (seu último salário, de ${diaMes(ultimoSalario.date)})`;
      if (!passos.length) return { fato: `Todos os bancos estão acima do piso, então os ${formatBRL(valor)}${base} estão livres. Uma ideia: separar uma parte pra reserva antes de gastar. A decisão é sua.`, cru: true, sugestoes: [] };
      return { fato: `Com ${formatBRL(valor)}${base}: ${passos.join('; ')}.${d.livreCents ? ` Sobram ${formatBRL(d.livreCents)} livres: uma ideia é guardar uma parte antes de gastar.` : ' Não sobra nada livre depois de cobrir os pisos.'} É uma sugestão; quem decide é você.`, cru: true, sugestoes: [] };
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
      // "posso comprar 300 pelo C6?" (JF, 14/11): vê se o banco aguenta sem furar o piso, e sugere outro se não der
      const contasCabe = (accounts || []).filter(a => a.tipo !== 'cartao');
      const banco = intencao.valor && acharConta(intencao.t, contasCabe);
      if (banco) {
        const rp = resumoPisos(contasCabe, expenses, incomes, dados.transferencias || [], today);
        const c = rp.contas.find(x => x.id === banco.id);
        const depois = c.saldoCents - intencao.valor;
        const outro = rp.contas.filter(x => x.id !== banco.id && x.folgaCents >= intencao.valor).sort((a, b) => b.folgaCents - a.folgaCents)[0];
        let fato;
        if (depois < 0) fato = `No ${c.nome} não dá: tem ${formatBRL(c.saldoCents)} e a compra é ${formatBRL(intencao.valor)}.`;
        else if (c.pisoCents && depois < c.pisoCents) fato = `Dá, mas o ${c.nome} fica com ${formatBRL(depois)}, ${formatBRL(c.pisoCents - depois)} abaixo do piso de ${formatBRL(c.pisoCents)}.`;
        else fato = `Dá! O ${c.nome} fica com ${formatBRL(depois)}${c.pisoCents ? `, ainda ${formatBRL(depois - c.pisoCents)} acima do piso` : ''}.`;
        if ((depois < 0 || (c.pisoCents && depois < c.pisoCents)) && outro) fato += ` O ${outro.nome} tem folga de ${formatBRL(outro.folgaCents)}: dá pra comprar por ele ou passar o dinheiro de lá.`;
        return { fato: `${fato} A decisão é sua.`, cru: true, sugestoes: ['Como tá minha média de segurança?'] };
      }
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
        fato: `${cdi ? '' : SELIC_ANOTADA}${RENDIMENTOS_ANOTADOS} Pra comparar ${quais}, olha o "% do CDI" no app de cada um.${conta} ${AVISO_DATA}`,
        decisao: 'investimento', cru: true,
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
    case 'formiguinha': {
      // 16/11 (JF): os gastinhos de até R$ 30 do mês, somados, e onde mais aparecem
      const f = formiguinhas(expenses, mes);
      const lim = formatBRL(FORMIGA_LIMITE_CENTS);
      if (!f.count) return { fato: `Nenhum gastinho de até ${lim} este mês. Formiga nenhuma na sua carteira!`, sugestoes: ['Quanto gastei este mês?'] };
      const nomeCat = id => categories.find(c => c.id === id)?.name || id;
      const top = f.porCategoria.slice(0, 3).map(c => `${nomeCat(c.categoryId)} (${c.count}×, ${formatBRL(c.totalCents)})`).join(', ');
      const vezes = f.count === 1 ? '1 gastinho' : `${f.count} gastinhos`;
      return {
        fato: `Este mês foram ${vezes} de até ${lim}, somando ${formatBRL(f.totalCents)} (${f.pct}% de tudo que você gastou). Onde mais aparecem: ${top}.${f.count >= 10 ? ' Escolher um deles pra segurar na semana já faz diferença.' : ''}`,
        sugestoes: ['Onde mais gastei?', 'Quanto gastei este mês?'],
      };
    }
    case 'metodos_poupar': {
      // 2.3.3 (JF): os métodos mais falados, com a conta feita na entrada da pessoa; criança ganha os 3 cofrinhos
      const idade = idadeDe(perfil?.aniversario, today);
      const faixa = idade != null ? faixaEtaria(idade) : null;
      if (faixa === 'crianca') {
        return { fato: 'Bora aprender juntos! Um jeito bem legal é o dos 3 cofrinhos: um pra gastar, um pra guardar (pra algo maior, tipo um jogo ou brinquedo) e um pra ajudar alguém. Toda vez que ganhar dinheiro, divide nos três antes de gastar. Outro jogo: guardar uma moedinha a mais toda semana. Quer que eu crie uma meta pro que você quer juntar?',
          cru: true, sugestoes: ['Quero criar uma meta', 'O que é mesada?'] };
      }
      const entMes = (incomes || []).filter(i => i.date.slice(0, 7) === mes).reduce((x, i) => x + i.amountCents, 0);
      const base = entMes || 0;
      const conta = base ? ` Com a sua entrada deste mês (${formatBRL(base)}): uns ${formatBRL(Math.round(base * 0.5))} pro necessário, ${formatBRL(Math.round(base * 0.3))} pros desejos e ${formatBRL(Math.round(base * 0.2))} pra guardar.` : '';
      return { fato: `Tem uns jeitos que funcionam bem: 1) Regra 50/30/20: metade pro necessário, 30% pro que você quer e 20% pra guardar.${conta} 2) Pague-se primeiro: o salário caiu, já transfere a parte de guardar, antes de gastar. 3) Desafio das 52 semanas: R$ 1 na 1ª semana, R$ 2 na 2ª… e no fim do ano são R$ 1.378. 4) Envelopes: um limite por categoria (o orçamento em Ajustes faz isso e eu aviso quando acaba). Se 20% for muito agora, começa com 5% e vai subindo. Quer que eu crie uma meta pra você?`,
        cru: true, sugestoes: ['Quero criar uma meta', 'O que é 50/30/20?', 'O que é desafio das 52 semanas?'] };
    }
    case 'pagaram_pra_mim': {
      // 2.3.3 (JF): "comi fora, mas não gastei: a galera pagou". Conta como dia sem gasto (o foguinho) se a pessoa quiser
      const dia = dataDoTexto(intencao.t, today);
      const quando = dia === today ? 'hoje' : `o dia ${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
      const quem = { familia: 'Família é tudo, né?', par: 'Que fofura!', trabalho: 'Por conta da firma, melhor ainda.', amigos: 'Amigo bom é assim!' }[intencao.quem] || 'Que sorte!';
      const vezes = intencao.vezes || 1;
      const extra = vezes >= 3 ? ` Já é a ${vezes}ª vez este mês que te bancam: quando der, retribui com um café ou um lanche, que amizade também se cuida.` : '';
      return { fato: `${quem} Comer fora sem gastar é economia de verdade, e eu anoto isso também. Quer que eu marque ${quando} como dia sem gasto? Conta pro seu foguinho.${extra}`,
        cru: true, sugestoes: [], acao: { tipo: 'dia_sem_gasto', date: dia } };
    }
    case 'vaquinha_parte':
      return { fato: 'Vaquinha, boa! Quanto foi a sua parte? Me fala tipo "minha parte na vaquinha foi 40" que eu anoto só o que saiu do seu bolso.', cru: true, sugestoes: [] };
    case 'so_curiosidade':
      return { fato: 'Beleza, fica a informação! Meu foco é o seu dinheiro: se um dia virar plano, é só me chamar que a gente organiza.', cru: true, sugestoes: ['Quanto gastei este mês?'] };
    case 'gasto_demais': {
      // 2.3.2 (JF: "acho que tô gastando demais com cafezinho na padaria" → "esse mês você comprou café umas 5 vezes")
      const doMes = expenses.filter(e => e.date.slice(0, 7) === mes);
      const de7 = toISODate(new Date(new Date(`${today}T12:00:00`).getTime() - 6 * 86_400_000));
      const raiz = w => norm(w).replace(/(zinhos?|zinhas?|inhos?|inhas?|s)$/, '');
      const chave = intencao.item ? raiz(intencao.item.split(' ')[0]) : '';
      let lista = chave.length >= 3 ? doMes.filter(e => norm(e.note || '').split(/\s+/).some(w => w.startsWith(chave))) : [];
      let nome = intencao.item;
      if (!lista.length && intencao.categoria) { lista = doMes.filter(e => e.categoryId === intencao.categoria.id); nome = intencao.categoria.name; }
      if (intencao.fora) nome = 'comer fora (restaurante, almoço, lanche)';
      if (!lista.length) {
        return { fato: `Não achei gasto com ${nome || 'isso'} anotado este mês. Anota quando rolar (tipo "gastei 7 de café na padaria") que eu fico de olho e te aviso se começar a pesar.`, cru: true, sugestoes: ['Onde mais gastei?'] };
      }
      const tot = lista.reduce((x, e) => x + e.amountCents, 0);
      const semana = lista.filter(e => e.date >= de7);
      const vezes = lista.length === 1 ? '1 vez' : `${lista.length} vezes`;
      const media = Math.round(tot / lista.length);
      const delivery = intencao.fora ? doMes.filter(e => e.categoryId === 'delivery').reduce((x, e) => x + e.amountCents, 0) : 0;
      const corte = Math.round(tot / 2);
      return { fato: `Vamos ver: este mês foram ${vezes} com ${nome}, somando ${formatBRL(tot)} (uns ${formatBRL(media)} por vez)${semana.length ? `; só nos últimos 7 dias, ${semana.length === 1 ? '1 vez' : `${semana.length} vezes`} e ${formatBRL(semana.reduce((x, e) => x + e.amountCents, 0))}` : ''}.${delivery ? ` Fora isso, ${formatBRL(delivery)} de delivery.` : ''} ${lista.length >= 4 ? `Se cortar pela metade, sobram uns ${formatBRL(corte)} no mês, ${formatBRL(corte * 12)} no ano.` : 'Ainda tá tranquilo, mas fico de olho.'}`,
        cru: true, sugestoes: ['Onde mais gastei?', 'Me dá uma dica'] };
    }
    case 'custo_medio': {
      // 2.3.2 (JF): "em média quanto custa…": a IA pesquisa a média e responde curto; ele não explica o passo a passo
      // nem indica loja, e pergunta se é plano da pessoa (aí vira meta). Sem IA, diz onde ver e oferece anotar.
      const item = intencao.item;
      const perguntaIA = `Custo médio. Pedido da pessoa: "${intencao.t}". Responda CURTO (2 ou 3 frases): a média ou faixa de preço no Brasil hoje, com a fonte e o mês; se for taxa de governo (Detran, cartório…), diga que muda por estado. Se for comparação (ex.: hotel ou pousada), diga qual costuma sair mais barato e por quê, em uma frase. Não explique o passo a passo nem indique loja. Termine perguntando se é um plano da pessoa e se ela quer que você anote ou ajude a juntar o dinheiro.`;
      const detran = /\b(emplac\w*|placa|cnh|carteira de motorista|habilitacao|transferencia|transferir o carro|licenciamento|vistoria|multa\w*|detran|crlv)\b/.test(intencao.t);
      const hospeda = /\b(hotel|hoteis|pousada\w*|airbnb|hostel|hospedagem|aluguel por temporada)\b/.test(intencao.t);
      const semIA = hospeda
        ? 'Sem a IA online eu não sei os preços de hoje, mas a regra costuma ser: pousada sai mais em conta que hotel em praia e interior; hostel é o mais barato; e aluguel por temporada compensa pra família ou grupo (olha a taxa de limpeza). Compara sempre o preço total, com café e transporte.'
        : detran
          ? 'Sem a IA online eu não sei o valor de hoje: taxa de Detran muda de estado pra estado. Confere no site do Detran do seu estado.'
          : 'Sem a IA online eu não sei a média de hoje: preço muda com o tempo e de loja pra loja. Vale olhar em 2 ou 3 lojas antes.';
      return { fato: `${semIA} Se for um plano seu, me fala que eu te ajudo a juntar o dinheiro.`,
        cru: true, perguntaIA: perguntaIA.slice(0, 700), modoIA: 'pesquisa',
        sugestoes: [item ? `Quero juntar pra ${item}`.slice(0, 40) : 'Quero criar uma meta', 'Só curiosidade'] };
    }
    case 'loteria': {
      // 2.3.0.1 (JF): fezinha é diversão; ele mostra a conta da chance e o quanto já foi no mês, sem sermão
      const doMes = expenses.filter(e => e.date.slice(0, 7) === mes && ehLoteriaNota(e.note));
      const totMes = doMes.reduce((x, e) => x + e.amountCents, 0);
      if (intencao.pede === 'gasto') {
        if (!totMes) return { fato: 'Nenhuma fezinha anotada este mês. Quando jogar, me fala tipo "joguei 6 na mega" que eu anoto em Lazer.', cru: true, sugestoes: ['Quais as chances da Mega-Sena?'] };
        return { fato: `Este mês foram ${doMes.length === 1 ? '1 fezinha' : `${doMes.length} fezinhas`}, somando ${formatBRL(totMes)}. Num ano, nesse ritmo, dá uns ${formatBRL(totMes * 12)}. Se quiser, combina um teto por mês: aí a fezinha fica sendo diversão.`, cru: true, sugestoes: ['Quais as chances da Mega-Sena?'] };
      }
      if (intencao.pede === 'pesquisa') {
        const perguntaIA = `Loteria. Pedido da pessoa: "${intencao.t}". Pesquise no site Loterias Caixa (ou notícia recente) o prêmio estimado, a data do próximo sorteio, o resultado ou o preço da aposta, conforme o pedido, com a data. Lembre de leve que é jogo de sorte e que a chance é pequena.`;
        return { fato: 'Sem a IA online eu não sei o prêmio nem o resultado de hoje: isso muda toda semana. Confere no site ou app Loterias Caixa. O que eu sei sem internet: a chance de ganhar a Mega-Sena com 6 números é de 1 em 50.063.860.',
          cru: true, perguntaIA: perguntaIA.slice(0, 600), modoIA: 'pesquisa', sugestoes: ['Quais as chances da Mega-Sena?', 'Quanto gastei com fezinha?'] };
      }
      const qual = CHANCES.find(c => c.re.test(intencao.t));
      const lista = qual ? [qual] : CHANCES.slice(0, 3);
      const linhas = lista.map(c => `${c.nome}: 1 em ${milhoes(c.um)} (aposta simples, ${c.aposta})`).join('; ');
      const virada = /virada/.test(intencao.t) ? ' A Mega da Virada tem a mesma chance da Mega comum: o prêmio é maior, a chance não.' : '';
      const mesTxt = totMes ? ` Este mês você já pôs ${formatBRL(totMes)} em fezinha.` : '';
      return { fato: `A chance de levar o prêmio maior: ${linhas}.${virada} Pra ter ideia: na Mega, é como achar 1 bilhete premiado num estádio com 50 milhões de bilhetes. Bolão aumenta a chance do grupo, mas divide o prêmio. Fezinha é diversão, não plano: põe um teto que não faça falta.${mesTxt}`,
        cru: true, sugestoes: ['Quanto gastei com fezinha?', 'O que é bolão?'] };
    }
    case 'pib': {
      // 2.3.0 (JF): número oficial com a data, sem IA (IBGE, divulgado em 03/03/2026)
      return { fato: 'O último PIB anual do Brasil é o de 2025: R$ 12,7 trilhões, com alta de 2,3% (IBGE, divulgado em março de 2026). Dividindo por pessoa, dá uns R$ 59.687 no ano, perto de R$ 4.974 por mês. O de 2026 sai em março de 2027; os números de cada trimestre saem no site do IBGE. PIB é a soma de tudo que o país produziu: crescendo, costuma vir mais emprego.',
        cru: true, sugestoes: ['O que é PIB?', 'O que é inflação?', 'Qual a Selic?'] };
    }
    case 'piso_salarial': {
      // 2.3.0 (JF: "sabe o piso de várias profissões pra ajudar a ordenar salário, gastos e plantões"): piso muda por
      // lei, estado e sindicato, então vai pra IA pesquisar; sem ela, o caminho pra achar
      const p = intencao.profissao;
      const perguntaIA = `Piso salarial. Pedido da pessoa: "${intencao.t}". Profissão: ${p}. Diga o piso nacional por lei, se existir, ou o piso estadual/da convenção coletiva mais comum, com a fonte e a data, e avise que muda por estado e sindicato. Se fizer sentido, dê uma dica curta de como organizar o salário (contas fixas no salário; extra e plantão pra reserva).`;
      return { fato: `Sem a IA online eu não pesquiso o piso de ${p}. Onde achar: algumas profissões têm piso nacional por lei (professor da rede pública, enfermagem); a maioria segue a convenção coletiva do sindicato da sua cidade, e alguns estados têm piso regional. O piso nunca fica abaixo do salário mínimo (R$ 1.621 em 2026). Dica pra organizar: paga as contas fixas com o salário e usa extra e plantão pra reserva.`,
        cru: true, perguntaIA: perguntaIA.slice(0, 600), modoIA: 'pesquisa', sugestoes: ['O que é piso salarial?', 'Qual o salário mínimo?'] };
    }
    case 'pedir_mesada': {
      // 2.3.0 (JF: "te ajuda a conversar com os pais pra ver se consegue mesada; ele dá dicas e sugere falas, mas é só
      // um amigo tentando ajudar"): nunca joga a criança contra os pais e respeita o "não"
      const idade = idadeDe(perfil?.aniversario, today);
      const crianca = idade != null && faixaEtaria(idade) === 'crianca';
      const fala = crianca
        ? '"Mãe, pai, posso falar uma coisa? Eu queria aprender a cuidar do meu dinheiro. Será que eu podia ganhar uma mesada pequena? Eu anoto tudo no app e daqui a um mês a gente vê se deu certo."'
        : '"Queria conversar sobre uma coisa: quero aprender a me virar com dinheiro. Que tal uma mesada pequena, combinando o que ela cobre (lanche, transporte, um jogo)? Eu anoto tudo no app e a gente revê em um mês."';
      return { fato: `Bora pensar juntos! Umas dicas de amigo: 1) escolhe uma hora tranquila, não no meio da correria nem logo depois de pedir outra coisa; 2) mostra que tem plano: pra que quer e que vai anotar tudo aqui; 3) propõe um mês de teste, com um valor pequeno, e aceita negociar (pode ser por semana); 4) se der, oferece ajudar mais em casa, mas sem transformar tudo em pagamento. Uma ideia de como começar: ${fala} Se disserem que agora não dá, tudo bem: dinheiro de casa às vezes está apertado. Agradece e tenta de novo mais pra frente.`,
        cru: true, sugestoes: ['O que é mesada?', 'Como eu começo a guardar dinheiro?'] };
    }
    case 'consumo_carro': {
      // 2.1.9.3 (JF, 17/11): km por litro, custo por km, projeção (a calculadora) e o empurrão pro mecânico
      const c = intencao.cons;
      const veic = c.moto ? 'a moto' : 'o carro';
      let kml = c.kml || (c.km && c.litros ? c.km / c.litros : null);
      let litros = c.litros || (c.gasto && c.precoLitro ? c.gasto / c.precoLitro : null);
      if (!kml && c.km && litros) kml = c.km / litros;
      let gasto = c.gasto || (litros && c.precoLitro ? Math.round(litros * c.precoLitro) : null);
      let doPeriodo = '';
      // só os km ("rodei 1200 km este mês"): soma o combustível anotado no período
      if (c.km && !gasto && !c.litros) {
        const de = intencao.periodo ? range : periodRange('mes', today);
        const comb = expenses.filter(e => e.date >= de.from && e.date <= de.to && (/(gasolina|etanol|alcool|diesel|combustivel|posto|abastec|gnv)/i.test(String(e.note || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''))));
        const soma = comb.reduce((x, e) => x + e.amountCents, 0);
        if (soma) { gasto = soma; doPeriodo = ` (somei ${comb.length === 1 ? '1 abastecimento anotado' : `${comb.length} abastecimentos anotados`} ${de.label})`; }
      }
      const partes = [];
      if (kml) partes.push(`${veic[0].toUpperCase() + veic.slice(1)} fez ${fmtKm(kml)} km por litro${c.km && litros ? ` (${fmtKm(c.km)} km ÷ ${fmtKm(litros)} litros)` : ''}.`);
      const porKm = gasto && c.km ? gasto / c.km : kml && c.precoLitro ? c.precoLitro / kml : null;
      if (porKm) {
        partes.push(`Cada km sai uns ${formatBRL(Math.round(porKm))}${doPeriodo}; a cada 100 km, ${formatBRL(Math.round(porKm * 100))}.`);
        if (c.km && /\b(semana|semanal)\b/.test(intencao.t)) partes.push(`Nesse ritmo, dá uns ${formatBRL(Math.round(porKm * c.km * 52 / 12))} por mês.`);
        else if (c.km && (doPeriodo || /\b(mes|mensal)\b/.test(intencao.t))) partes.push(`Num ano, nesse ritmo: uns ${formatBRL(Math.round(porKm * c.km * 12))}.`);
      }
      if (!kml && !porKm) {
        const pediu = /(gastando|bebendo|consumindo|puxando) (muito|demais)/.test(intencao.t);
        const falta = c.km ? ` Não achei abastecimento anotado ${intencao.periodo ? 'nesse período' : 'este mês'}: me diz quantos litros ou quanto gastou.` : '';
        return { fato: `${falta ? falta.trim() + ' ' : ''}Pra saber quanto ${veic} faz: enche o tanque, zera o hodômetro parcial e roda normal. No próximo abastecimento, enche de novo e divide os km rodados pelos litros que entraram. Me manda tipo "rodei 400 km com 40 litros a 6,20" que eu faço a conta, e o custo por km.${pediu ? ' Se ele começou a beber mais de repente, vale uma ida ao mecânico: pneu murcho, filtro de ar sujo, vela gasta e bico injetor sujo aumentam o consumo.' : ''}`,
          cru: true, sugestoes: ['O que é gasolina aditivada?', 'Etanol ou gasolina?'] };
      }
      const minimo = c.moto ? 20 : KML_MINIMO[c.tipo];
      if (kml && kml < minimo) {
        const ref = c.moto ? 30 : minimo + 3;
        const extra = c.precoLitro ? ` Comparando com ${fmtKm(ref)} km/l, são uns ${formatBRL(Math.round(c.precoLitro * (1000 / kml - 1000 / ref)))} a mais a cada 1.000 km.` : '';
        partes.push(`Tá abaixo do comum (${c.moto ? 'moto costuma fazer bem mais de 20' : `carro de passeio costuma passar de ${minimo} km/l ${c.tipo === 'gasolina' ? 'na gasolina' : c.tipo === 'etanol' ? 'no etanol' : 'no diesel'}`}).${extra} Vale passar no mecânico: pneu calibrado, filtro de ar, vela e bico injetor. A revisão costuma sair mais barata que o combustível a mais no ano.`);
      } else if (kml) {
        partes.push('Tá num consumo normal. Anota de novo daqui a uns tanques: se cair do nada, é sinal pra levar no mecânico.');
      }
      // gasto dito junto ("gastei 300 de gasolina e rodei 600 km"): oferece anotar, sem anotar sozinho (1ª lei)
      const anotar = c.gasto ? [`Gastei ${(c.gasto / 100).toFixed(2).replace('.', ',').replace(',00', '')} de ${c.tipo}`] : [];
      return { fato: partes.join(' '), cru: true, sugestoes: [...anotar, 'Etanol ou gasolina?', 'Quanto gastei com transporte?'] };
    }
    case 'energia': {
      // 2.1.9.3 (JF, 17/11): kWh da conta de luz e quanto cada aparelho pesa; tarifa de exemplo quando a pessoa não diz
      const e = intencao.en;
      const precoKwhConta = e.conta && e.kwh ? e.conta / e.kwh : null;
      const tarifa = e.tarifa || (precoKwhConta && !(e.w && e.horasDia) ? null : precoKwhConta) || null;
      const tarifaUsada = tarifa || TARIFA_EXEMPLO;
      const avisoTarifa = tarifa ? '' : ` (usei ${formatBRL(TARIFA_EXEMPLO)} o kWh de exemplo; o seu é o total da conta ÷ os kWh dela)`;
      if (precoKwhConta && !(e.w && e.horasDia)) {
        return { fato: `Sua energia saiu a ${formatBRL(Math.round(precoKwhConta))} por kWh (${formatBRL(e.conta)} ÷ ${fmtKwh(e.kwh)}), com imposto e bandeira já dentro. Guarda esse número: com ele eu calculo quanto cada aparelho pesa. Tipo "chuveiro 20 minutos por dia a ${(precoKwhConta / 100).toFixed(2).replace('.', ',')} o kwh".`,
          cru: true, sugestoes: ['O que é bandeira tarifária?', 'Quanto gasta um chuveiro?'] };
      }
      const nome = e.aparelho?.nome || 'o aparelho';
      if (e.aparelho?.kwhMes && !e.wInformado) {
        const v = Math.round(e.aparelho.kwhMes * tarifaUsada);
        return { fato: `${nome[0].toUpperCase() + nome.slice(1)} fica ligad${nome === 'geladeira' ? 'a' : 'o'} o tempo todo: uma comum gasta uns ${fmtKwh(e.aparelho.kwhMes)} por mês, uns ${formatBRL(v)}${avisoTarifa}. Modelo antigo pode gastar o dobro; olha o selo Procel na etiqueta. Porta bem fechada e borracha boa ajudam.`, cru: true, sugestoes: ['O que é kWh?'] };
      }
      if (e.w && e.horasDia) {
        const kwhMes = e.w / 1000 * e.horasDia * e.dias;
        const v = Math.round(kwhMes * tarifaUsada);
        const tempo = e.horasDia < 1 ? `${Math.round(e.horasDia * 60)} minutos` : `${fmtKm(e.horasDia)} ${e.horasDia === 1 ? 'hora' : 'horas'}`;
        const dica = e.aparelho?.nome === 'chuveiro' ? ' Tirar 5 minutos do banho, ou usar no morno, já mexe na conta.' : e.aparelho?.nome === 'ar-condicionado' ? ' Deixar em 23 °C e o filtro limpo economiza.' : '';
        return { fato: `${e.wInformado ? `${fmtKm(e.w)} W` : `${nome[0].toUpperCase() + nome.slice(1)} (uns ${fmtKm(e.w)} W)`} ligado ${tempo} por dia: ${fmtKm(e.w / 1000)} kW × ${fmtNum(e.horasDia)} h × ${e.dias} dias = ${fmtKwh(kwhMes)} no mês, uns ${formatBRL(v)}${avisoTarifa}.${dica}`, cru: true, sugestoes: ['O que é kWh?', 'Quanto gasta uma geladeira?'] };
      }
      if (e.kwh) {
        return { fato: `${fmtKwh(e.kwh)} a ${formatBRL(tarifaUsada)} o kWh dão uns ${formatBRL(Math.round(e.kwh * tarifaUsada))}${tarifa ? '' : ' (preço de exemplo; o seu está na conta)'}. Conta de luz = kWh do mês × preço do kWh, com imposto e bandeira.`, cru: true, sugestoes: ['O que é bandeira tarifária?'] };
      }
      return { fato: `Faço a conta! A fórmula é: watts ÷ 1.000 × horas por dia × dias = kWh no mês; vezes o preço do kWh, dá o valor. ${e.aparelho ? `Quanto tempo por dia ${nome === 'o aparelho' ? 'ele' : `o ${nome}`} fica ligado? Me diz tipo "${e.aparelho.nome} 30 minutos por dia".` : 'Me diz o aparelho e o tempo, tipo "chuveiro 20 minutos por dia". E se mandar sua conta ("deu 250 com 300 kwh"), eu acho o preço do seu kWh.'}`,
        cru: true, sugestoes: ['O que é kWh?'] };
    }
    case 'etanol_ou_gasolina': {
      // 17/11 (JF): a regra dos 70% (o etanol rende uns 30% menos por litro): conta feita aqui, sem IA
      const { etanol, gasolina } = intencao.precos;
      const pct = Math.round(etanol * 100 / gasolina);
      const vence = pct <= 70 ? 'o etanol compensa' : 'a gasolina compensa';
      return { fato: `Etanol a ${formatBRL(etanol)} é ${pct}% da gasolina a ${formatBRL(gasolina)}. ${pct <= 70 ? 'Até 70%' : 'Acima de 70%'}, ${vence}: o etanol rende uns 30% menos por litro, então só vale se for bem mais barato. Isso pra carro flex; confira no manual se o seu é.`,
        sugestoes: ['A gasolina vai subir?', 'Quanto gastei com transporte?'] };
    }
    case 'combustivel': {
      // 17/11 (JF): preço e rumo do combustível vão pra IA pesquisar; sem ela, as dicas que valem sempre
      const regiao = respostasDoLazer(intencao.t).regiao;
      const perguntaIA = `Combustível. Pedido da pessoa: "${intencao.t}".${intencao.precoLitro ? ` Ela pagou ${formatBRL(intencao.precoLitro)} o litro.` : ''}${regiao ? ` Região: ${regiao}.` : ''}`;
      return { fato: 'Sem a IA online eu não sei o preço de hoje. O que vale sempre: o etanol compensa quando custa até 70% da gasolina; aplicativo de posto e programa de fidelidade dão desconto; e calibrar o pneu e evitar arrancadas economizam combustível.',
        cru: true, perguntaIA: perguntaIA.slice(0, 600), modoIA: 'pesquisa', sugestoes: ['Etanol ou gasolina?', 'Quanto gastei com transporte?'] };
    }
    case 'a_receber': {
      const r = aReceber(expenses);
      // também tem entrada prevista ("vou receber 500 dia 20", 15/11)? responde as duas coisas
      const prevTot = (dados.previstas || []).reduce((t, p) => t + p.amountCents, 0);
      if (!r.itens.length && prevTot) return responder({ ...intencao, intent: 'previstas' }, dados, { today, emocao, perfil, now });
      if (!r.itens.length) return { fato: 'Ninguém te deve nada agora. Quando rachar uma conta, marque "🍕 Dividir com amigos" na hora de lançar o gasto que eu guardo quem deve quanto.', sugestoes: ['Como divido uma conta?'] };
      const porPessoa = new Map();
      for (const x of r.itens) porPessoa.set(x.nome, (porPessoa.get(x.nome) || 0) + x.valorCents);
      const lista = [...porPessoa].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, v]) => `${n} (${formatBRL(v)})`).join(', ');
      return { fato: `Você tem ${formatBRL(r.totalCents)} a receber: ${lista}${porPessoa.size > 5 ? ' e mais gente' : ''}. Quando o Pix cair, toca em "Recebi" na lista "A receber", no Início.${prevTot ? ` Fora isso, tem ${formatBRL(prevTot)} de entrada prevista (pergunta "quanto vou receber?" que eu detalho).` : ''}`, sugestoes: ['Quanto gastei este mês?'] };
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
        fato = linhaAtivo(intencao.ativo);
        // JF, 16/11: "Como está o dólar?" respondia "Fiz as contas pra você: Esse dado não veio". Sem o dado, ele diz
        // a verdade e a pergunta vai pra IA online (que pode pesquisar), quando ela está ligada.
        if (!fato) {
          return { fato: `O ${NOME_ATIVO[intencao.ativo] || 'dado'} não veio na última atualização do mercado (${quando}). Com a IA online ligada, eu pesquiso o valor de hoje.`, cru: true, semDado: true, sugestoes: ['A bolsa tende a subir?', 'Qual a Selic?'] };
        }
      } else {
        fato = ['USD', 'EUR', 'IBOV', 'SELIC'].map(linhaAtivo).filter(Boolean).join(' ');
      }
      return { fato: `${fato} (Atualizado ${quando}.)${velho}`, aviso: true, sugestoes: ['Como está o dólar?', 'A bolsa tende a subir?', 'Qual a Selic?'] };
    }
    case 'previstas': {
      const prev = [...(dados.previstas || [])].sort((a, b) => a.date.localeCompare(b.date));
      if (!prev.length) return { fato: 'Não tem nada previsto pra receber. Quando souber de um dinheiro que vai cair, me fala tipo "vou receber 500 dia 20".', cru: true, sugestoes: [] };
      const tot = prev.reduce((t, p) => t + p.amountCents, 0);
      const lista = prev.slice(0, 5).map(p => `${formatBRL(p.amountCents)} dia ${p.date.slice(8, 10)}/${p.date.slice(5, 7)}${p.note ? ` (${p.note})` : ''}`).join('; ');
      return { fato: `Você tem ${formatBRL(tot)} pra receber: ${lista}. Quando cair, toca em "Recebi" na aba Entradas do Início.`, cru: true, sugestoes: ['Dá pra gastar quanto até o salário?'] };
    }
    case 'aperto': {
      // acolhe primeiro, número depois, e um caminho (jeito de ajudar do núcleo), sem sermão
      const mes = monthKey(today);
      const entrou = incomeIn(dados.incomes || [], mes);
      const saiu = summarizeMonth(dados.expenses || [], dados.categories || [], mes).totalCents;
      const conta = entrou || saiu
        ? ` Olhando o mês: entrou ${formatBRL(entrou)} e saiu ${formatBRL(saiu)}${entrou > saiu ? `, então ainda tem ${formatBRL(entrou - saiu)} pra respirar` : entrou < saiu ? `, ou seja, ${formatBRL(saiu - entrou)} a mais do que entrou` : ''}.`
        : '';
      return {
        fato: `Aperto acontece, e você não está sozinho nessa.${conta} Bora ver juntos onde dá pra segurar? Um passo de cada vez.`,
        cru: true, sugestoes: ['Onde posso economizar?', 'Onde mais gastei?', 'O que tenho pra pagar?'],
      };
    }
    case 'pesquisa_compra': {
      // JF, 16/11: "me ajuda a te ajudar". Antes de pesquisar, um questionário rápido, sem IA (não gasta crédito),
      // pra filtrar logo de cara e fazer UMA pesquisa certeira, sem inventar número nem procurar o que não serve.
      const { item } = intencao;
      const tipo = intencao.tipo || (intencao.viagem ? 'viagem' : 'produto');
      const passos = PASSOS_PESQUISA[tipo];
      let respostas = { ...(intencao.respostas || {}) };
      if (intencao.orcamento !== undefined && respostas.orcamento === undefined) respostas.orcamento = intencao.orcamento;
      let passo = intencao.passo || 0;
      while (passo < passos.length && respostas[passos[passo].id] !== undefined) passo++;
      // 2.3.9 (JF): pedido direto ou já detalhado vai pra IA na hora, com o texto inteiro e o que deu pra ler dele
      if (intencao.direto && !intencao.passo) {
        const lidas = passos.filter(p => respostas[p.id]).map(p => (p.id === 'orcamento' ? `${p.rotulo}: ${formatBRL(respostas.orcamento)}` : `${p.rotulo}: ${respostas[p.id]}`));
        const perguntaIA = `${NOME_DO_PLANO[tipo]}. Pedido da pessoa: "${intencao.t}".${lidas.length ? ` ${lidas.join('. ')}.` : ''}`
          + `${tipo === 'lazer' ? ' Diga se cabe no mês pelo resumo e se os extras (pipoca etc.) valem a pena.' : ''}`;
        const oQue = item.length > 40 ? { lazer: 'os preços desse passeio', viagem: 'essa viagem' }[tipo] || 'isso' : item;
        return { fato: `Bora! Vou pesquisar ${oQue} pra você${tipo === 'lazer' ? ' e ver se cabe no seu mês' : ''}.`, cru: true, perguntaIA: perguntaIA.slice(0, 600), modoIA: 'pesquisa', assunto: `plano_${tipo}`,
          sugestoes: ['Dá pra gastar quanto até o salário?'] };
      }
      if (passo < passos.length) {
        const p = passos[passo];
        const abre = !intencao.passo
          ? `${tipo === 'viagem' || tipo === 'produto' ? `Bora pesquisar ${item}!` : tipo === 'lazer' ? `Bora planejar ${item}!` : 'Bora planejar isso junto!'} Me ajuda a te ajudar: umas perguntas rápidas antes, pra eu filtrar logo de cara e não sair inventando número nem procurando o que não te serve. `
          : '';
        return { fato: `${abre}${p.q}`, cru: true, sugestoes: [...(p.chips || []), 'Pular', 'Cancelar'], aguardar: { tipo: 'pesquisa', plano: tipo, item, passo, respostas }, assunto: `plano_${tipo}` };
      }
      const temOrcamento = passos.some(p => p.id === 'orcamento');
      const linhas = passos.filter(p => respostas[p.id]).map(p => (p.id === 'orcamento' ? `${p.rotulo}: ${formatBRL(respostas.orcamento)}` : `${p.rotulo}: ${respostas[p.id]}`));
      if (temOrcamento && !respostas.orcamento) linhas.push('Orçamento: não informado');
      const perguntaIA = `${NOME_DO_PLANO[tipo]}: ${item}. ${linhas.join('. ')}.${tipo === 'lazer' ? ' Diga se cabe no mês pelo resumo e se os extras valem a pena.' : ''}`.slice(0, 520);
      // sem a IA online (ou sem internet), ele dá o caminho das pedras
      const CAMINHO = {
        viagem: 'Compare em 2 ou 3 lugares: o site das companhias (Azul, Gol, Latam) e um buscador (Google Voos, Decolar); pra hotel, Booking ou Airbnb filtrando a região. Confira se é ida e volta, bagagem, taxas, horário e escala. Numa viagem completa, some passagem, hospedagem, comida, transporte, seguro viagem e, se for pra fora, o câmbio.',
        produto: 'Compare em 2 ou 3 lojas (Mercado Livre, Amazon, Magalu) ou num comparador (Buscapé, Zoom). Confira frete, prazo, garantia, parcelamento e a reputação do vendedor.',
        pet: 'Some o fixo do mês (ração, areia ou tapete, antipulgas) e reserve pro que vem de vez em quando (vacinas, vermífugo, veterinário, banho e tosa). Uma reserva pra emergência do bicho evita susto. Adotar sai bem mais em conta que comprar.',
        moradia: 'Uma regra de bolso: moradia até uns 30% do que entra. Compare com anúncios do mesmo bairro e de bairros vizinhos (QuintoAndar, OLX, Zap) e some o custo de ir pro trabalho: às vezes um aluguel um pouco maior perto do serviço sai mais barato no fim do mês.',
        transporte: 'Anote quanto gasta por semana e veja se dá pra juntar saídas, rachar carona ou trocar alguns dias por ônibus, bicicleta ou a pé. No carro, calibrar o pneu e evitar arrancadas já economiza combustível. Compare o preço por km de cada jeito de ir.',
        lazer: 'Pra um passeio mais barato: dia de promoção (no cinema, geralmente no começo da semana), meia-entrada se tiver direito, pipoca e bebida de casa quando o lugar deixa, e estacionamento conta: às vezes um app de transporte sai igual. Veja o que sobra no mês antes de ir.',
        economizar: 'Comece pelo que mais pesa no mês e pelas assinaturas esquecidas. Corte primeiro o que você nem sente falta, e guarde a economia assim que o dinheiro entrar, antes de gastar.',
      }[tipo];
      return { assunto: `plano_${tipo}`, fato: `Fechou, com isso eu filtro. ${CAMINHO}${respostas.orcamento ? ` Seu teto: ${formatBRL(respostas.orcamento)}.` : ''} Com a IA online ligada, eu faço a conta e pesquiso o que precisar pra você comparar.`, cru: true, perguntaIA, modoIA: 'pesquisa', sugestoes: ['Dá pra gastar quanto até o salário?'] };
    }
    case 'moeda_jogo': {
      const { jogo, pacote } = intencao;
      const partes = [`No ${jogo.jogo}, a moeda é ${jogo.moeda}. Dá pra comprar ${jogo.onde}.`];
      if (jogo.extra) partes.push(jogo.extra);
      if (pacote) {
        const por100 = Math.round((pacote.reaisCents / pacote.quantidade) * 100);
        partes.push(`Nesse pacote, sai ${formatBRL(por100)} a cada 100. Compare com os outros pacotes: o maior costuma sair mais barato por unidade, mas só vale se você ia usar tudo.`);
      } else if (intencao.precoDeHoje) {
        partes.push('O preço muda com promoção e com o dólar; sem internet eu não sei o valor de hoje. Com a IA online ligada, eu pesquiso.');
      }
      partes.push(DICA_SEGURANCA);
      return { fato: partes.join(' '), cru: true, sugestoes: ['Quanto gastei com jogos este mês?', 'Dá pra gastar quanto até o salário?'] };
    }
    case 'fora_do_papel': {
      const frases = [
        'Essa foge das minhas funções: eu sou uma IA de bolso, parceiro do seu dinheiro. Pra isso, o Google resolve rapidinho.',
        'Aí já é fora do meu campo. Eu cuido das suas finanças; essa pergunta o Google responde melhor que eu.',
        'Boa pergunta, mas não é comigo: sou especialista no seu bolso, não nisso. Dá uma busca no Google.',
        'Isso está além do que eu faço. Meu negócio é o seu dinheiro. Pra essa, vale perguntar no Google ou em outro site.',
        'Essa eu passo: sou um parceiro financeiro de bolso. Pergunta pro Google que ele sabe.',
      ];
      return { fato: frases[intencao.t.length % frases.length], cru: true, sugestoes: ['Quanto gastei este mês?', 'Dá pra gastar quanto até o salário?'] };
    }
    case 'como_esta':
    case 'papo_pessoal': // sem IA online, ele conta como está (com IA, o app manda a pergunta pra ela)
      return { gatilho: 'como_esta', vars: { emocao } };
    case 'retomar':
      return {};
    case 'salario_caos':
      return { gatilho: 'salario_caos', vars: {}, sugestoes: ['O que vc acha do JF?', 'Quanto gastei este mês?'] };
    case 'sobre_jf':
      return { gatilho: 'sobre_jf', vars: { criador: IDENTIDADE.criador }, sugestoes: SUG_IDENTIDADE };
    case 'vida':
      return { fato: textoVida(), sugestoes: SUG_IDENTIDADE };
    case 'motivacao':
      return { gatilho: 'motivacao', sugestoes: ['Outra frase', 'Me conta um ditado', 'Me conta uma curiosidade'] };
    case 'ditado':
      return { gatilho: 'ditado', sugestoes: ['Outro ditado', 'Me manda uma frase de motivação', 'Me conta uma curiosidade'] };
    case 'curiosidade_fin':
      return { gatilho: 'curiosidade_fin', sugestoes: ['Outra curiosidade', 'Me conta um ditado', 'Me manda uma frase de motivação'] };
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
    case 'conta':
      return { fato: textoConta(intencao.conta), cru: true, sugestoes: ['Quanto é 15% de 200?', 'O que é regra de três?'] };
    case 'limite_investido':
      // pesquisado em 13/11/2026 (sites dos bancos e notícias); muda com o tempo, por isso a data e o "confira no app"
      return {
        fato: `Dá sim! Alguns bancos transformam dinheiro guardado em limite: C6 (Limite Garantido: R$ 1 aplicado vira R$ 1 de limite), Inter (CDB Mais Limite), Nubank (Caixinhas) e PicPay (Cofrinho do cartão). O dinheiro rende, mas fica preso como garantia. ${AVISO_DATA}`,
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
