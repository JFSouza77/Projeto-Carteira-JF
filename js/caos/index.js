// C.A.O.S. financeiro: a camada de narração. Junta espinha, emoções, gerador de falas e conversa.
// REGRA: o narrador NUNCA altera dados. Não importa db.js, não toca em DOM nem em storage.
// Recebe cópias congeladas e devolve { fala, memoria } novos; quem grava a memória é o app.

import { completarOfertas } from './ofertas.js';
import { BANKS, formatBRL, INCOME_SOURCES, daysInMonth, toISODate, idadeDe, faixaEtaria, ehAniversario } from '../engine.js';
import { congelar, protegido } from './espinha.js';
import { NUCLEO } from './nucleo.js';
import { sentir, emocaoEstavel, emocoesIniciais, intensidade, ROSTO } from './emocoes.js';
import { escolherRosto, memoriaRostoInicial, rostoAnalista, rostoEspantado, rostoDaEmo } from './rostos.js';
import { perguntaCuriosa, respostaCuriosa } from './curiosidade.js';
import { MOEDAS_JOGOS } from './moedas_jogos.js';
export { rostoEspantado, rostoDaEmo };
import { gerarFala } from './gerador.js';
import { GERADORES, SUGESTOES } from './falas.js';
import { entender, responder, PASSOS_PESQUISA, continuarPagamento, proximaPerguntaPagamento, seguirPagamento } from './conversa.js';

// Sobe sempre que o C.A.O.S. for mexido (regra do JF).
export const CAOS_VERSAO = '2.6.5'; // 2.6.5 (17/11, JF): eletrodoméstico e impressora (comum, scanner, 3D) sempre passam pelo "vamos por partes" (o que precisa ter, uso, marca, voltagem, orçamento), mesmo com pedido detalhado; roupa e coisa pessoal não viram pesquisa nem com pedido (ele ajuda a anotar em Compras); móvel e eletrodoméstico comprados vão pra Moradia com um "investimento legal" e sem o aviso de conta do mês. 2.6.4 (17/11, JF): "IA de bolso, não balconista": compra comum (cama, mesa e banho, geladeira…) não vira pesquisa de loja, ele ajuda no que é de dinheiro e confere o preço/link que a pessoa trouxer (pesquisa só se pedir: "pesquisa pra mim", a pesada do dia); "compra o ingresso pra mim" → ele não compra, mas vê preço e se cabe; "o que comprar no shopping?" ganha resposta curta do guia; lazer com airsoft e tiro esportivo, e circo/parque/estádio viram gasto em Lazer; "banho" não vira mais "banco". 2.6.3 (17/11, JF): lazer entende beisebol, boliche, pista de patinação, patinação no gelo, kart, paintball e fliperama (plano de passeio e gasto em Lazer). 2.6.2 (17/11, JF): tecnologia ganha questionário de compatibilidade (memória RAM: notebook ou PC, DDR3/4/5, frequência, pentes; peça de PC: processador, placa-mãe, fonte; aparelho: uso, mínimo, novo ou usado); pesquisa de tecnologia e conferência de link são "pesadas": uma por dia, depois ele indica ChatGPT, Gemini, Copilot, Claude, DeepSeek ou Grok sem deixar a pessoa na mão; link de loja no Chat vira "confere se o preço faz sentido". 2.6.1 (17/11, JF): preço de tecnologia (notebook, celular, memória RAM, placa de vídeo, vender usado, "vale a pena comprar?") vai pra IA pesquisar com o Cara do TI; lazer ganhou teatro, peça, museu, stand-up, musical, circo, jogo de futebol, "o mais próximo" e "tem algum bom?" (plano de passeio, que pergunta a cidade); corrigidas rotas erradas (notebook virava conta de luz, placa de vídeo virava Detran, "teatro mais próximo" virava maior gasto). 2.6.0 (17/11, JF): 65 avatares: Estudante (faculdade, curso, FIES), Cinéfilo (lazer, cinema, show), Cara do TI (computador, celular, peça), Feirante (mercado e feira) e Salva-Vidas (aperto e dívida); o Faz-Tudo ganhou furadeira e chave inglesa nova e cuida também de luz e energia de casa. O tema da conversa escolhe o profissional. 2.5.9 (17/11, JF): 5 avatares novos (60): Farmacêutico (saúde sua ou do pet pesando), Faz-Tudo (mecânico, eletricista, encanador, conserto), Sacoleiro (compra demais no mês, com fala própria), Sortudo (loteria) e Colega de Trabalho (trabalho, piso); sem resposta, texto longo e IA dormindo chamam o Recalculando (GPS). 2.5.8 (17/11, JF): texto longo demais (mais de 60 palavras ou 400 letras) não vai pra IA: ele pede pra resumir, com bom humor, e oferece palpites do que achou no texto. 2.5.7 (17/11, JF num pet center): categorias Pet e Apostas; aposta alta ganha um "bora maneirar?" sem sermão; remédio do bicho e farmácia que sobem ganham um "tá tudo bem?"; glossário de banco (conta corrente, linha de crédito, chave Pix, como fazer Pix, como funciona o cartão), apostas e conta PJ (130 → 140). 2.5.6 (17/11, JF): apaga lançamento pela conversa ("apaga a entrada que lancei errado", "apaga o gasto de 50", "exclui o mercado"): ele acha, mostra qual é e só apaga depois do Confirmar. 2.5.5 (17/11, JF e Dona Débora): "como faço pra investir?" ganha resposta de verdade (reserva, prazo, renda fixa e onde anota no app), e quando a IA online falha ele diz que está "acordando" e ensina a reiniciar e perguntar de novo. 2.5.4 (17/11, JF): no Papo livre ele conversa, mas pergunta de pesquisa geral sem dinheiro (filme em cartaz, time de futebol, capital de país) não vai pra IA: ele indica ChatGPT, Gemini, Copilot ou Claude ("sou uma IA de bolso"). 2.5.3 (17/11, JF): ele pergunta como a pessoa quer ser chamada (Dona, Seu, Senhora, Senhor, o nome ou o que ela inventar) e chama assim. 2.5.2 (17/11, ok do JF): núcleo 1.9.0, o jeito de tratar acompanha a idade (de criança a 60+), cada casa com o seu motor. 2.5.1 (17/11, JF): "comi fora mas pagaram pra mim" vira dia sem gasto e ele aprende a rotina (amigos, família); vaquinha anota só a sua parte; jeitos de poupar (50/30/20, pague-se primeiro, 52 semanas, envelopes; 3 cofrinhos pra criança); tom pra 50 a 59 (maduro, jovial) e 60+ (calmo e claro). 2.5.0 (17/11, JF): pergunta de custo ("em média quanto custa", "hotel ou pousada?") vai curta pra IA e termina perguntando se é plano (vira meta); "tô gastando demais com cafezinho" e "almoçando muito fora" olham os gastos de verdade; glossário de trânsito e hospedagem. 2.4.9 (17/11, JF e Anne): foco da conversa. No "Só finanças" (padrão), pergunta sem nada de dinheiro não vai pra IA: ele responde amigável e volta pro bolso; desabafo ganha acolhimento e o CVV. "Papo livre" em Ajustes. 2.4.8 (17/11, JF): entende as fezinhas (Mega-Sena, Quina, Lotofácil, raspadinha, bolão, Mega da Virada): anota em Lazer, mostra a chance de verdade e o total do mês; prêmio e sorteio vão pra IA. 2.4.7 (17/11, ideias do JF): plantão vira extra e lembra de descansar, piso de profissão (pesquisa), salário mínimo 2026, PIB, mesada, mais 5 moedas e foto com legenda virando lançamento. 2.4.6 (17/11): km por litro, aviso de mecânico, kWh e glossário de combustível. 2.4.5 (17/11, JF): cada plano guiado diz o seu assunto (plano_pet, plano_moradia, plano_viagem, plano_transporte…) pro avatar certo aparecer. 2.4.4 2.4.4 (17/11, ideia do JF): combustível: preço e rumo da gasolina e do petróleo vão pra IA pesquisar (ANP, Petrobras, petróleo, dólar), "paguei 6,29 no litro, tá caro?" compara com a média, e "etanol 4,10 gasolina 6,20" ele calcula sozinho (regra dos 70%). 2.4.3 2.4.3 (17/11, ideia do JF): frase do dia de manhã (pensadores, investidores, ditados), e no Chat "me motiva", "me conta um ditado", "me conta uma curiosidade". 2.4.2 2.4.2 (17/11, JF: "qual melhor shopping pra curtir um cinema?" respondia gasto em Compras): pergunta de recomendação (qual o melhor, custo-benefício, me recomenda, onde é mais barato) vai pra IA pesquisar; nome de categoria só vira "quanto gastei" em pergunta curta ou que fala de gasto. 2.4.1 2.4.1 (17/11, JF): avatar próprio pra tangente (Distraído), pergunta de amigo (Curioso), formiguinha e pesquisa; o tutorial tem o Guia Turístico. 2.4.0 2.4.0 (16/11, ok do JF): núcleo 1.8.0, a cabeça meio TDAH (tangente que volta pro foco) virou parte de quem ele é, nos dois projetos. 2.3.9 2.3.9 (16/11, testes do JF no cinema): plano de passeio (cinema, show, rolê) que diz se cabe no mês; pesquisa pedida com todas as letras, preço de ingresso ou pedido detalhado vão direto pra IA, sem questionário; pedido novo no meio do questionário não vira resposta; "conferir o saldo" junta por banco. 2.3.8 2.3.8 (16/11, pedido do JF): efeito formiguinha (aviso a cada 10 gastinhos de até R$ 30 e "quais meus gastinhos?"), pergunta curiosa depois do gasto ("valeu a pena?", lembra os impulsos do mês) e tangentes de TDAH sem internet (curiosidade de dinheiro num 2º balão). 2.3.7 2.3.7 (16/11, ok do JF): 2 balões (a cutucada ou um "ah, e…" vem num 2º balão), a emoção do momento vai pro tom da IA, núcleo 1.7.0; dar baixa pela conversa (fatura paga, amigo que pagou, conta fixa paga); foto de comprovante pergunta como pagou. 2.3.6 2.3.6 (16/11, revisão do Gemini conferida): corretor não troca mais gosto/gato/mesa/maio/parar/home; o Ácido não some depois de umas falas (gerador); nome não entra no silêncio nem põe banco em minúscula; maluco/doido como adjetivo não é apelido; VP, UC, jades e fragmentos; jogo vai pra Jogos; C6 não vira R$ 6; limite investido com parênteses; humor certo na IA. 2.3.5 2.3.5 (16/11): planos guiados também pra pet, moradia (aluguel), transporte (gasolina) e economizar, com o aviso de privacidade antes de pedir bairro; a lixeira do Chat limpa também a memória curta dele. 2.3.4 2.3.4 (16/11): a pesquisa de compra e viagem começa com um questionário sem IA (de onde, quando, quantos, o que pesquisar, região, orçamento; ou detalhes, uso, marca, prazo, orçamento), uma pergunta por vez com Pular. 2.3.3 2.3.3 (16/11): pesquisa de compra e viagem: pede o orçamento e a IA online compara 2 a 4 sites, orientando (não entrega a resposta pronta). 2.3.2 2.3.2 (16/11): núcleo 1.6.0 (ok do JF): marcos da vida na Carteira, entre eles o cérebro online (IA na nuvem, 13/11). 2.3.1 2.3.1 (16/11): chama a pessoa pelo nome (uma resposta sim, outra não); Ácido de verdade (cutucada no fim, 6 em 10), e com o criador sempre; a IA online também chama pelo nome ({nome}, trocado no aparelho). 2.3.0 2.3.0 (16/11): "qual a cotação?" depois de falar de Robux segue no jogo (não vira Ibovespa); dólar sem dado vai pra IA online, sem "Fiz as contas". 2.2.9 2.2.9 (15/11): "vou receber 500 dia 20" vira entrada prevista; aviso de saldo abaixo do saudável (R$ 100) nas contas sem piso. 2.2.8 2.2.8 (15/11): categoria Jogos (Robux, skins…) com dica de gift card × crédito, e o avatar Gamer pras moedas de jogo. 2.2.7 2.2.7 (15/11): entende moedas de jogo (Robux, V-Bucks, Diamantes, VP…): qual é a moeda, onde comprar, preço por 100 de um pacote e dica contra golpe; preço de hoje vai pra IA online. 2.2.6 2.2.6 (15/11): pergunta fora do papel (esporte, horóscopo, receita…) ele responde sem chamar a IA e manda pro Google. 2.2.5 2.2.5 (15/11): conversa de filme, série, jogo, time… (sem falar do próprio dinheiro) vai pra IA online, e não cai em orçamento. 2.2.4 2.2.4 (15/11): papo pessoal ("como você se sente?", "o que acha da sua evolução?") vai pra IA online, e "internet" numa pergunta dessas não vira gasto em Contas. 2.2.3 2.2.3 (15/11): fato da semana (no lugar do troféu da ofensiva) e sugestão de orçamento quando uma categoria pesa. 2.2.2 2.2.2 (15/11): núcleo 1.5.0 (jeito de reagir; a emoção que manda segura mais no rosto). 2.2.1 2.2.1 (15/11): entende "oii", "oie" e "eaii" como oi. 2.2.0 2.2.0 (15/11): atualizou o saldo e não bate com o anotado, ele avisa (gasto ou entrada sem anotar). 2.1.9 2.1.9 (14/11): média de segurança dos bancos, quando estoura, sugestão de transferência, "posso comprar pelo banco X?". 2.1.8 2.1.8 (14/11): piso de segurança por banco, folga, dividir salário entre bancos, comparar salário/aumento, extras com descrição. 2.1.7 2.1.7 (14/11): hora não vira valor, dia da semana, corrigir data do último gasto, gasto sem "gastei" (só com o jeito de pagar), "não" cancela, pergunta em quê. 2.1.6 2.1.6 (14/11): cutucão em escada (brinca, cansa, se estressa) e categorias de lanche. 2.1.5 2.1.5 (14/11): sem "bem-vindo de volta" na abertura (Anne). 2.1.4 (14/11): entende apelido de amigo (corno, vagabundo) e xingamento junto com pergunta. 2.1.3 2.1.3 (13/11): rostinho de volta no balão, combinando com o avatar. 2.1.2: benefícios, bolsas, matemática

export const MOODS = Object.freeze({ suave: 'Suave', normal: 'Normal', acido: 'Ácido' });
export const DEFAULT_MOOD = 'suave';
export { SUGESTOES, ROSTO };
export { IDENTIDADE, resumoIdentidade } from './identidade.js';

// Prioridade: só uma fala por reação, a mais importante (para não virar spam).
const PRIORIDADE = {
  categoria_estourada: 50, compromisso_atrasado: 49, conta_negativa: 48, abaixo_do_piso: 48, perto_do_piso: 41, piso_geral_estourado: 47, piso_geral_perto: 42, cartao_limite: 47, mes_negativo: 46, cartao_vence: 45, compromisso_vence: 44,
  orcamento_80: 40, mes_verde: 35, plano_do_mes: 25, confira_banco: 9, auditor_assinatura: 9, meta_ritmo: 6,
  ritmo_alto: 30, semana_menos: 12, semana_mais: 13, categoria_pesando: 11, saldo_baixo: 14, saldo_sem_gasto: 35, saldo_sem_entrada: 33, ofensiva_marco: 28, racha_cadastrada: 27, a_receber: 22, delivery_repetido: 20, formiguinha: 19, frase_do_dia: 6, entrada_cadastrada: 15, gasto_cadastrado: 10, sem_registro: 8, boas_vindas: 5,
};
// Dias especiais (núcleo): todos com a mesma prioridade (logo acima das boas-vindas) e uma vez por dia
for (const { id } of NUCLEO.dias.especiais) PRIORIDADE[`dia_${id}`] = 7;
// Cooldown por tipo (ms). Alertas de orçamento e conta não têm: são úteis.
const COOLDOWN = {
  gasto_cadastrado: 3 * 60_000,
  entrada_cadastrada: 60_000,
  delivery_repetido: 12 * 3_600_000,
  formiguinha: 20 * 3_600_000, // efeito formiguinha (16/11): no máximo 1 vez por dia
  frase_do_dia: 20 * 3_600_000, // frase do dia (17/11): 1 vez por dia, de manhã
  ritmo_alto: 24 * 3_600_000,
  sem_registro: 24 * 3_600_000,
  mes_negativo: 12 * 3_600_000,
  boas_vindas: 6 * 3_600_000,
  ...Object.fromEntries(NUCLEO.dias.especiais.map(({ id }) => [`dia_${id}`, 20 * 3_600_000])),
  plano_do_mes: 24 * 3_600_000,
  cartao_limite: 12 * 3_600_000,
  cartao_vence: 12 * 3_600_000,
  confira_banco: 3 * 24 * 3_600_000,
  meta_ritmo: 2 * 24 * 3_600_000, // a cada 2 dias, no máximo
  auditor_assinatura: 7 * 24 * 3_600_000, // uma vez na semana do começo do mês
  a_receber: 24 * 3_600_000,
  semana_menos: 7 * 24 * 3_600_000,
  categoria_pesando: 3 * 24 * 3_600_000,
  saldo_baixo: 2 * 24 * 3_600_000, // saldo saudável (15/11): a cada 2 dias, no máximo // sugestão de orçamento: a cada 3 dias, no máximo // fato da semana (15/11): no máximo 1 vez por semana
  semana_mais: 7 * 24 * 3_600_000,
};
const RADAR_COOLDOWN = 6 * 3_600_000;
const PACIENCIA_ZERA = 30 * 60_000; // xingamento de mais de meia hora atrás não conta pra escalada
const SILENCIO_MS = 3 * 60_000; // quanto tempo ele fica quietinho depois da última resposta
const LIMITES_INTERVALO = 6 * 60 * 60 * 1000; // "1 vez por conversa ou assunto" (núcleo 1.4.0)
const ALERTAS = new Set(['cartao_limite', 'cartao_vence', 'categoria_estourada', 'orcamento_80', 'delivery_repetido', 'formiguinha', 'ritmo_alto', 'mes_negativo', 'conta_negativa', 'abaixo_do_piso', 'perto_do_piso', 'piso_geral_estourado', 'piso_geral_perto', 'compromisso_vence', 'compromisso_atrasado', 'a_receber']);

export function memoriaInicial(now = Date.now()) {
  return { versao: CAOS_VERSAO, gerador: {}, emocoes: emocoesIniciais(now), lastAt: {}, lastMonthClosed: null, rosto: memoriaRostoInicial(), rostoUltimo: null, conversa: null };
}

function normalizarMem(m, now) {
  const base = memoriaInicial(now);
  if (!m || typeof m !== 'object') return base;
  return { ...base, ...m, gerador: m.gerador || {}, lastAt: m.lastAt || {}, emocoes: m.emocoes || base.emocoes, rosto: m.rosto || base.rosto };
}

const NOMES_DO_CRIADOR = new Set(['joao fernando', 'jf', 'tgp', 'jf77', 'tgp77']);
/**
 * Criador só com a conta confirmada pelo servidor (achado do Code, 12/11; foi o bug "Nick Protegido" do Perfil 1.9.5):
 * qualquer um podia digitar "JF" no primeiro acesso e virar criador. O selo vem do login (lista no servidor).
 */
export function ehCriador(perfil) {
  return !!perfil && perfil.seloCriador === true;
}

/** Só o nome parece o do criador (sem conta): ele trata como qualquer pessoa, no máximo brinca. */
export function pareceCriador(perfil) {
  const n = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return !!perfil && [perfil.apelido, perfil.nome].some(x => NOMES_DO_CRIADOR.has(n(x)));
}

/**
 * Dia especial (núcleo único, 12/11): o calendário é o mesmo do Perfil (NUCLEO.dias); as falas são as da Carteira.
 * Prioridade do núcleo: aniversários, depois as datas especiais. Devolve o id (ex.: 'sexta13') ou null.
 */
export function diaEspecial(iso) {
  const d = new Date(`${iso}T12:00:00`);
  const md = iso.slice(5);
  const dt = NUCLEO.datas;
  const regras = [
    ['aniversarioCaos', md === dt.meuAniversario],
    ['aniversarioCriador', md === dt.aniversarioDoCriador],
    ['aniversarioCarteira', md === dt.aniversarioDaCarteira],
    ['aniversarioPerfil', md === dt.aniversarioDoPerfil],
    ['sexta13', d.getDay() === 5 && d.getDate() === 13],
    ['natal', md === '12-24' || md === '12-25'],
    ['anoNovo', md === '12-31' || md === '01-01'],
    ['halloween', md === '10-31'],
    ['criancas', md === '10-12'],
    ['namorados', md === '06-12'],
  ];
  return regras.find(([, sim]) => sim)?.[0] ?? null;
}

function periodo(h) {
  return h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
}

/** Etiquetas de contexto para o gerador (hora, dia, humor, emoção, quem é a pessoa). */
/**
 * Humor que vai pra IA online (revisão do Gemini, 16/11): a 2ª lei vale lá também. Formal e criança nunca recebem o
 * Ácido; com o criador (selo da conta) é sempre Ácido, como no cérebro do celular.
 */
// respostas de número que podem ganhar o 2º balão de amigo ("ah, e…")
const EMENDA = new Set(['gasto_total', 'maior_gasto', 'saldo', 'orcamento', 'previsao', 'cabe', 'entradas', 'media', 'comparar', 'alertas']);
// tangente de TDAH (JF, 16/11): só em papo leve e consulta tranquila, nunca em alerta, proposta ou pergunta aberta
const TANGENTE = new Set([...EMENDA, 'saudacao', 'agradecimento', 'elogio', 'como_esta', 'dica', 'glossario', 'identidade', 'formiguinha']);
const TANGENTE_INTERVALO = 30 * 60_000;
const TANGENTE_CHANCE = 0.15;

/** 2.3.3 (JF, 17/11: "deixa a pessoa escolher como quer ser chamada"): o jeito escolhido (Dona Ana, Senhor, Mestre
 * Supremo do Universo…) ou, sem escolha, o apelido. */
export function comoChamar(perfil) {
  return perfil?.chamarDe || perfil?.apelido || null;
}

export function humorParaIA(mood, perfil, now = Date.now()) {
  if (perfil?.tratamento === 'formal') return 'suave';
  const idade = idadeDe(perfil?.aniversario, toISODate(new Date(now)));
  if (idade != null && faixaEtaria(idade) === 'crianca') return mood === 'acido' ? 'normal' : (mood || 'suave');
  if (ehCriador(perfil)) return 'acido';
  return mood || 'suave';
}

export function contexto({ humor, emocao, now = Date.now(), perfil }) {
  const d = new Date(now);
  const tags = new Set([`humor_${humor}`, `emo_${emocao}`, `periodo_${periodo(d.getHours())}`]);
  if (perfil?.apelido) tags.add('temNome');
  // o JF é reconhecido como criador (João Fernando, JF, TGP, JF77, TGP77), comparando sem acento e em minúsculas
  if (ehCriador(perfil)) {
    tags.add('criador');
    // o JF pediu (06/11): com ele o C.A.O.S. é ácido como no Perfil, em qualquer humor
    tags.add('humor_acido');
  }
  if (perfil?.tratamento === 'formal') {
    tags.add('tratamento_formal');
    tags.delete('humor_acido'); // formal: sem zoeira
  }
  // Idade (06/11): a faixa vira balde de contexto. Criança nunca recebe zoeira (2ª lei, com cuidado redobrado).
  const hoje = toISODate(d);
  const idade = idadeDe(perfil?.aniversario, hoje);
  if (idade != null) {
    const faixa = faixaEtaria(idade);
    tags.add(`idade_${faixa}`);
    if (faixa === 'crianca') tags.delete('humor_acido');
  }
  if (ehAniversario(perfil?.aniversario, hoje)) tags.add('aniversario');
  if (d.getDay() === 0 || d.getDay() === 6) tags.add('fimDeSemana');
  const dia = d.getDate();
  const total = daysInMonth(toISODate(d).slice(0, 7));
  if (dia <= 5) tags.add('inicioDoMes');
  if (dia >= total - 4) tags.add('fimDoMes');
  // misturas contam como as emoções de base para escolher pedaços
  if (emocao === 'protetor' || emocao === 'tenso') tags.add('emo_preocupacao');
  if (emocao === 'radiante') tags.add('emo_orgulho');
  return tags;
}

function varsDoEvento(ev) {
  const r = v => (v != null ? formatBRL(v) : null);
  const fonte = ev.sourceId ? INCOME_SOURCES.find(s => s.id === ev.sourceId)?.name : null;
  return {
    categoria: ev.categoryName, valor: r(ev.amountCents ?? ev.valorCents), fonte, pct: ev.pct, resta: r(ev.leftCents),
    passou: r(ev.overCents), qtd: ev.count, dias: ev.days, total: r(ev.totalCents),
    mes: ev.monthName ? ev.monthName[0].toUpperCase() + ev.monthName.slice(1) : null,
    economia: r(ev.savedCents), previsto: r(ev.projectedCents), porDia: r(ev.perDayCents),
    orcamento: r(ev.budgetCents), entradas: r(ev.incomeCents), gastos: r(ev.totalCents),
    ano: r(ev.anoCents), quem: ev.quem, conta: ev.accountName ?? ev.nome, saldo: r(ev.balanceCents), piso: r(ev.pisoCents), dia: ev.dia, meta: ev.metaNome,
    quando: ev.type === 'compromisso_vence' || ev.type === 'cartao_vence'
      ? (ev.days === 0 ? 'hoje' : ev.days === 1 ? 'amanhã' : `em ${ev.days} dias (dia ${ev.dia})`) : null,
  };
}

function montar(gatilho, vars, { humor, emocao, mem, now, rng, perfil }) {
  const todas = { nome: comoChamar(perfil), ...vars };
  const ctx = { tags: contexto({ humor, emocao, now, perfil }), vars: Object.fromEntries(Object.entries(todas).filter(([, v]) => v != null)) };
  const { texto, memoria } = gerarFala(GERADORES, gatilho, ctx, mem.gerador, { rng });
  return { texto, gerador: memoria };
}

function rostoDe(emocao) {
  return ROSTO[emocao] || ROSTO.calmo;
}

// Momentos fortes: o rosto vai direto, sem a escada (como no Perfil)
const ROSTO_LIVRE = new Set(['mes_verde', 'categoria_estourada', 'conta_negativa', 'piada', 'entrada_cadastrada']);

/** Rosto animado (sistema do Perfil) para o momento; devolve a memória nova. */
function rostoPara(mem, { emocao, evento, humor, now, rng, direto = false, texto = null, alerta = false }) {
  const { rosto, memoria } = escolherRosto({
    emocao, evento, humor, rng, intensidade: intensidade(mem.emocoes, emocao, now), texto, alerta,
    // reação direta a algo que a pessoa falou: rosto na hora; mudança de humor espontânea: pela escada
    memoria: mem.rosto, livre: direto || ROSTO_LIVRE.has(evento),
  });
  return { rosto, mem: { ...mem, rosto: memoria, rostoUltimo: rosto } };
}

/**
 * Reage a eventos do motor (gasto cadastrado, alertas, boas-vindas…).
 * @returns {{ fala: null | { texto, evento, alerta, emocao, rosto }, memoria }}
 */
function reagirBruto(eventos, { mood = DEFAULT_MOOD, memory, now = Date.now(), rng = Math.random, perfil = null } = {}) {
  const humor = MOODS[mood] ? mood : DEFAULT_MOOD;
  let mem = normalizarMem(memory, now);
  const evs = congelar(eventos || []);

  // Todo evento mexe nas emoções (mesmo os que não viram fala)
  let emocoes = mem.emocoes;
  for (const ev of evs) emocoes = sentir(emocoes, ev.type, now);
  mem = { ...mem, emocoes };

  const candidatos = evs
    .filter(ev => GERADORES[ev.type])
    .filter(ev => !(ev.type === 'mes_verde' && mem.lastMonthClosed === ev.month))
    .filter(ev => {
      // alerta vindo do radar (ao abrir o app) não se repete toda hora: no máximo 1 vez a cada 6 h
      const chave = ev.radar ? `radar:${ev.type}` : ev.type;
      const cd = ev.radar ? Math.max(COOLDOWN[ev.type] || 0, RADAR_COOLDOWN) : COOLDOWN[ev.type];
      const last = mem.lastAt[chave];
      return !cd || last == null || now - last >= cd;
    })
    .sort((a, b) => (PRIORIDADE[b.type] || 0) - (PRIORIDADE[a.type] || 0));

  if (!candidatos.length) return { fala: null, memoria: mem };
  const ev = candidatos[0];
  const est = emocaoEstavel(mem.emocoes, humor, now, mem.estab);
  mem = { ...mem, estab: est.estab };
  const emocao = est.emocao;
  const { texto, gerador } = montar(ev.type, varsDoEvento(ev), { humor, emocao, mem, now, rng, perfil });
  if (!texto) return { fala: null, memoria: mem };
  const r = rostoPara(mem, { emocao, evento: ev.type, humor, now, rng, texto, alerta: ALERTAS.has(ev.type) });
  const memoria = {
    ...r.mem, gerador,
    lastAt: { ...mem.lastAt, [ev.radar ? `radar:${ev.type}` : ev.type]: now },
    lastMonthClosed: ev.type === 'mes_verde' ? ev.month : mem.lastMonthClosed,
  };
  return { fala: { texto, evento: ev.type, alerta: ALERTAS.has(ev.type), emocao, rosto: r.rosto }, memoria };
}

const EVENTO_DA_INTENCAO = { elogio: 'elogio', xingamento: 'xingamento', desabafo: 'pergunta', agradecimento: 'agradecimento', piada: 'piada', identidade: 'carinho_conversa', apelido: 'carinho_conversa', nao_entendi: 'nao_entendi' };

/**
 * Conversa: responde a uma mensagem da pessoa com os números do motor.
 * @returns {{ fala: { texto, emocao, rosto, sugestoes, acao?, entendeu }, memoria }}
 */
function conversarBruto(texto, dados, { mood = DEFAULT_MOOD, memory, now = Date.now(), rng = Math.random, today, perfil = null } = {}) {
  const humor = MOODS[mood] ? mood : DEFAULT_MOOD;
  let mem = normalizarMem(memory, now);
  const d = congelar(dados);
  let intencao = entender(texto, { ...d, anterior: mem.conversa || null });
  // 2.3.4.6 (JF): link de loja no Chat = conferir se o preço faz sentido (a URL vem do texto original)
  const urlMandada = String(texto || '').match(/https?:\/\/[^\s<>"']{4,300}/);
  if (urlMandada && !(mem.aguardando && now - (mem.aguardando.em || 0) < 15 * 60_000)) intencao = { ...intencao, intent: 'conferir_link', url: urlMandada[0], palpite: false };
  // Paciência (JF, 13/11 à noite): xingou o C.A.O.S.? Ele escala aos poucos: calmo → firme → "vai pescar, filho" →
  // última resposta e fica quietinho uns minutos. Quando a pessoa volta, ele pergunta se passou a raiva.
  // Pedido de desculpa encerra na hora. No humor Suave a escalada é séria, sem zoeira (2ª lei).
  const pac = { n: 0, em: 0, silencioAte: 0, emburrou: false, ...(mem.paciencia || {}) };
  const txp = String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const desculpa = /\b(desculpa|desculpe|foi mal|perdao|me perdoa|sorry|nao foi por mal)\b/.test(txp);
  let assunto = null; // o que manda no avatar e no balde de fala (xingamento_2, silencio…)
  let passouRaiva = false;
  if (pac.n && now - pac.em > PACIENCIA_ZERA && !pac.emburrou) { pac.n = 0; }
  if (desculpa && (pac.n || pac.emburrou)) {
    intencao = { ...intencao, intent: 'xingamento', palpite: false };
    assunto = 'desculpa_aceita';
    Object.assign(pac, { n: 0, silencioAte: 0, emburrou: false });
  } else if (intencao.intent === 'xingamento') {
    pac.n += 1; pac.em = now;
    const forte = humor !== 'suave';
    if (pac.emburrou || pac.n >= 5) {
      assunto = forte ? 'xingamento_fim_forte' : 'xingamento_fim';
      Object.assign(pac, { silencioAte: now + SILENCIO_MS, emburrou: true });
    } else if (pac.n === 4) assunto = forte ? 'xingamento_3_forte' : 'xingamento_3';
    else if (pac.n >= 2) assunto = 'xingamento_2';
  } else if (intencao.xingouJunto && !pac.emburrou) {
    pac.n += 1; pac.em = now; // xingou junto com a pergunta: responde, mas a paciência conta
  } else if (pac.emburrou && now < pac.silencioAte) {
    intencao = { ...intencao, intent: 'xingamento', palpite: false };
    assunto = 'silencio';
  } else if (pac.emburrou) {
    passouRaiva = true;
    Object.assign(pac, { n: 0, silencioAte: 0, emburrou: false });
  }
  mem = { ...mem, paciencia: pac };
  // Esperando um valor (12/11): perguntou "quanto foi?" e a pessoa respondeu só o número
  const espera = mem.aguardando && now - (mem.aguardando.em || 0) < 15 * 60_000 ? mem.aguardando : null;
  if (espera?.tipo === 'valor_gasto' && intencao.valor && String(texto).trim().split(/\s+/).length <= 5
    && ['nao_entendi', 'registrar_gasto', 'gasto_sem_valor', 'cabe'].includes(intencao.intent)) {
    intencao = { ...intencao, intent: 'registrar_gasto', t: espera.t, categoria: intencao.categoria || espera.categoria, palpite: false };
  }
  // "esqueci de lançar" (12/11, achado do GPT): a resposta seguinte completa o rascunho, sem perguntar tudo de novo.
  // Pergunta ou pedido diferente não completa nada (o rascunho só cai fora).
  const tx = String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  // "Não" sozinho também cancela (JF, 14/11: respondeu "Não" ao "Pagou como?" e caiu na IA)
  const cancela = /^(cancela|cancelar|deixa|deixa pra (la|depois)|esquece|nao quero|depois)\b/.test(tx) || /^(nao|n|nada|nenhum)[.!]*$/.test(tx);
  if (espera && ['esqueci', 'valor_gasto', 'desc_gasto', 'ofertas'].includes(espera.tipo) && cancela) {
    intencao = { ...intencao, intent: 'pagamento_resposta', resposta: { fato: 'Tranquilo, não anotei nada. Quando lembrar, é só me falar.', cru: true, sugestoes: [] }, palpite: false };
  } else if (espera?.tipo === 'esqueci' && ['nao_entendi', 'registrar_gasto', 'gasto_sem_valor'].includes(intencao.intent) && !/\?/.test(tx)) {
    const t2 = /^(gastei|paguei|comprei)\b/.test(intencao.t) ? intencao.t : `gastei ${intencao.t}`;
    // só o valor ("79,90"), sem dizer em quê (achado do GPT, 13/11): não inventa "Outros"; guarda o valor e pergunta
    const soValor = intencao.valor && !intencao.categoria && !/[a-z]{3,}/.test(tx.replace(/\b(r\$|reais|real|conto|pila|gastei|paguei|comprei|foi|uns?|umas?)\b/g, ''));
    if (soValor) {
      intencao = { ...intencao, intent: 'pagamento_resposta', palpite: false, resposta: {
        fato: `Guardei os ${formatBRL(intencao.valor)} aqui no rascunho. Foi em quê? Tipo "mercado", "uber" ou "farmácia". Se foi outro dia, junta a data: "farmácia ontem".`,
        cru: true, sugestoes: ['Mercado', 'Delivery', 'Transporte', 'Deixa pra depois'], aguardar: { tipo: 'desc_gasto', valor: intencao.valor } } };
    } else if (intencao.valor) intencao = { ...intencao, t: t2, intent: 'registrar_gasto', palpite: false };
    else if (intencao.categoria || intencao.intent !== 'nao_entendi') intencao = { ...intencao, t: t2, intent: 'gasto_sem_valor', palpite: false };
  } else if (espera?.tipo === 'desc_gasto' && !/\?/.test(tx)) {
    // resposta do "foi em quê?": junta com o valor guardado e vira a proposta (a pessoa ainda confirma)
    const reais = (espera.valor / 100).toFixed(2).replace('.', ',');
    const junto = entender(`gastei ${reais} em ${texto} ${espera.extra || ''}`.trim(), { ...d, anterior: null });
    if (junto.valor) intencao = { ...junto, intent: 'registrar_gasto', palpite: false };
  }
  // ofertas (13/11): "amazon 10x sem juros, shopee frete 80" completa a comparação que está aberta
  if (espera?.tipo === 'ofertas' && !cancela && intencao.intent !== 'comparar_ofertas') {
    const novas = completarOfertas(espera.ofertas, tx.replace(/%/g, ' porcento '));
    if (novas) intencao = { ...intencao, intent: 'comparar_ofertas', ofertas: novas, produto: espera.produto, palpite: false };
  }
  // pesquisa de compra (16/11): a resposta ao "qual o seu orçamento?" completa o pedido e vai pra IA online
  // questionário da pesquisa (16/11): cada resposta vai pro passo da vez; "pular" deixa em branco; pergunta nova
  // (com "?") sai do questionário; só "cancela"/"deixa pra depois" cancela ("não" pode ser resposta, tipo de marca)
  if (espera?.tipo === 'pesquisa' && /^(cancela|cancelar|deixa pra (la|depois)|esquece|nao quero|para|parar)\b/.test(tx)) {
    intencao = { ...intencao, intent: 'pagamento_resposta', resposta: { fato: 'Beleza, fica pra depois. Quando quiser, é só pedir de novo.', cru: true, sugestoes: [] }, palpite: false };
  } else if (espera?.tipo === 'pesquisa' && !/\?/.test(tx) && intencao.intent !== 'pesquisa_compra') { // 2.3.9: pedido novo de pesquisa não vira resposta
    const plano = espera.plano || (espera.viagem ? 'viagem' : 'produto');
    const p = PASSOS_PESQUISA[plano][espera.passo];
    const pulou = /^(pular|pula|pulo|nao sei|sei la|tanto faz|qualquer|sem preferencia|nenhum|nenhuma)\b/.test(tx);
    let v = pulou ? '' : String(texto).trim().slice(0, 80);
    if (p?.id === 'orcamento') v = intencao.valor || 0;
    intencao = { ...intencao, intent: 'pesquisa_compra', item: espera.item, tipo: plano, passo: espera.passo + 1,
      respostas: { ...espera.respostas, ...(p ? { [p.id]: v } : {}) }, palpite: false, categoria: null };
  }
  if (espera?.tipo === 'pagamento' && cancela) {
    intencao = { ...intencao, intent: 'pagamento_resposta', resposta: { fato: 'Beleza, não anotei nada.', cru: true, sugestoes: [] }, palpite: false };
  } else if (espera?.tipo === 'pagamento') {
    const resposta = continuarPagamento(espera.acao, texto, d);
    if (resposta) intencao = { ...intencao, intent: 'pagamento_resposta', resposta, palpite: false };
  }
  // pergunta curiosa depois do gasto (16/11): "foi planejado?" → reação de amigo; só a memória dele guarda a resposta
  if (espera?.tipo === 'curiosidade') {
    const rc = respostaCuriosa(texto, espera, mem, { now, rng, mes: (today || toISODate(new Date(now))).slice(0, 7) });
    if (rc) {
      mem = rc.memoria;
      intencao = { ...intencao, intent: 'pagamento_resposta', resposta: { fato: rc.fato, cru: true, sugestoes: [] }, palpite: false };
    }
  }
  mem = { ...mem, aguardando: null };
  // Memória (06/11): "e agora?", "já sabe responder?" voltam na última pergunta que ficou sem resposta
  let retomada = null;
  if (intencao.intent === 'retomar' && mem.semResposta) {
    const de_novo = entender(mem.semResposta, { ...d, anterior: null });
    if (de_novo.intent !== 'nao_entendi' && !de_novo.palpite && de_novo.intent !== 'retomar') { intencao = de_novo; retomada = mem.semResposta; }
  }
  mem = { ...mem, emocoes: sentir(mem.emocoes, EVENTO_DA_INTENCAO[intencao.intent] || 'pergunta', now) };
  const est = emocaoEstavel(mem.emocoes, humor, now, mem.estab);
  mem = { ...mem, estab: est.estab };
  const emocao = est.emocao;
  // 2.3.3 (JF): o C.A.O.S. vai conhecendo a rotina: quantas vezes no mês te bancaram, e com quem (amigos, família…)
  if (intencao.intent === 'pagaram_pra_mim') {
    const mesAgora = toISODate(new Date(now)).slice(0, 7);
    const rot = mem.rotina?.mes === mesAgora ? mem.rotina : { mes: mesAgora, bancado: 0, comQuem: {} };
    const comQuem = intencao.quem ? { ...rot.comQuem, [intencao.quem]: (rot.comQuem[intencao.quem] || 0) + 1 } : rot.comQuem;
    mem = { ...mem, rotina: { mes: mesAgora, bancado: rot.bancado + 1, comQuem } };
    intencao = { ...intencao, vezes: mem.rotina.bancado };
  }
  let resp = responder(intencao, { ...d, anterior: mem.conversa || null }, { today: today || toISODate(new Date(now)), emocao: rostoDe(emocao).nome, perfil, now });
  if (assunto) resp = { gatilho: assunto, sugestoes: assunto === 'silencio' ? ['Desculpa'] : [] };
  // gasto novo: pergunta como pagou antes de propor (pula o que a pessoa já disse)
  if (resp.pagamento && resp.acao) {
    const q = proximaPerguntaPagamento(resp.acao, d.accounts || []);
    if (q) resp = { ...resp, ...seguirPagamento(resp.acao, d), acao: null, fato: `Anotando ${formatBRL(resp.acao.amountCents)}. ${q.texto}`, gatilho: null };
    else resp = { ...resp, acao: seguirPagamento(resp.acao, d).acao };
  }
  if (resp.aguardar) mem = { ...mem, aguardando: { ...resp.aguardar, em: now } };
  // "manda o print" no meio de uma comparação: a comparação continua aberta pro print entrar nela
  if (intencao.intent === 'ofertas_print' && espera?.tipo === 'ofertas') mem = { ...mem, aguardando: { ...espera, em: now } };

  let fato = resp.fato;
  if (retomada && fato) fato = `Sobre aquela sua pergunta ("${retomada}"): ${fato}`;
  // Melhor palpite (1.6.0): responde o que achou que era e pergunta de volta, em vez de "não entendi"
  if (intencao.palpite && fato) fato = `Acho que você quis saber isto: ${fato} Se não for, me pergunta de outro jeito.`;
  // 2.0.5 (núcleo 1.4.0, "limites"): em pergunta de decisão (investir, parcelar, qual comprar) ele ajuda e termina com
  // o lembrete de que é IA de bolso e quem decide é a pessoa. No máximo 1 vez por assunto a cada 6 h, pra não virar
  // robô pedindo desculpa (cuidado pedido pelo Code). O mercado usa o mesmo controle com as falas dele.
  const tema = resp.aviso ? 'investimento' : resp.decisao || null;
  if (tema && fato && !(now - ((mem.limites || {})[tema] || 0) < LIMITES_INTERVALO)) {
    const av = montar(resp.aviso ? 'aviso_mercado' : 'lembrete_limites', {}, { humor, emocao, mem, now, rng, perfil });
    mem = { ...mem, gerador: av.gerador, limites: { ...(mem.limites || {}), [tema]: now } };
    fato = `${fato} ${av.texto}`;
  }
  if (resp.alertas && resp.alertas.length) {
    // o principal alerta vira fala completa do gerador; os outros viram lista curta
    const principal = montar(resp.alertas[0].type, varsDoEvento(resp.alertas[0]), { humor, emocao, mem, now, rng, perfil });
    mem = { ...mem, gerador: principal.gerador };
    fato = `${fato} ${principal.texto}`;
    if (resp.alertas.length > 1) fato += ` Também: ${resp.alertas.slice(1).map(nomeAlerta).join(', ')}.`;
  }

  let saida;
  if (fato && resp.cru) {
    saida = fato; // pergunta direta (ex.: "quanto foi?"), sem embrulho
  } else if (fato) {
    const r = montar('resposta', { fato }, { humor, emocao, mem, now, rng, perfil });
    saida = r.texto || fato;
    mem = { ...mem, gerador: r.gerador };
  } else {
    const varsR = intencao.intent === 'retomar' ? { pergunta: mem.semResposta ? `"${mem.semResposta}"` : null } : {};
    const gat = intencao.intent === 'retomar' ? (mem.semResposta ? 'retomar_nao' : 'retomar_vazio') : (resp.gatilho || 'nao_entendi');
    const r = montar(gat, { ...(resp.vars || {}), ...Object.fromEntries(Object.entries(varsR).filter(([, v]) => v != null)) }, { humor, emocao, mem, now, rng, perfil });
    saida = r.texto;
    mem = { ...mem, gerador: r.gerador };
  }

  if (resp.dica && saida) saida = `${saida} ${resp.dica}`;
  // Ácido de verdade (JF, 16/11: "tá muito family friendly até no ácido; deram Rivotril pra minha IA?"): no Ácido, e
  // sempre com o criador, ele fecha a resposta com uma cutucada (6 em cada 10). Quem não está no Ácido não recebe nada
  // (a cutucada só tem balde ácido e do criador). Desabafo, xingamento e papo sem resposta ficam de fora.
  // 2 balões (JF, 16/11, ideia do Gemini): como amigo no WhatsApp, o "ah, e…" vem num 2º balão logo depois.
  // No Ácido (e com o criador), a cutucada vira o 2º balão; no Suave e no Normal, às vezes um "ah, e…" de amigo.
  let posTexto = null;
  let posAssunto = null; // 2.4.1: a tangente troca o avatar pro Distraído no 2º balão
  const acidoAqui = humor === 'acido' || ehCriador(perfil);
  if (saida && !resp.aguardar && acidoAqui && !['xingamento', 'desabafo', 'apelido', 'nao_entendi', 'papo_pessoal', 'retomar'].includes(intencao.intent) && rng() < 0.6) {
    const z = montar('cutucada', {}, { humor, emocao, mem, now, rng, perfil });
    if (z.texto) { posTexto = z.texto; mem = { ...mem, gerador: z.gerador }; }
  } else if (saida && !resp.aguardar && !resp.acao && !acidoAqui && EMENDA.has(intencao.intent) && rng() < 0.25) {
    const z = montar('emenda', {}, { humor, emocao, mem, now, rng, perfil });
    if (z.texto) { posTexto = z.texto; mem = { ...mem, gerador: z.gerador }; }
  }
  // tangente de TDAH (JF, 16/11): sem 2º balão ainda, de vez em quando (no máximo 1 a cada 30 min) ele lembra de uma
  // curiosidade de dinheiro que não tem nada a ver, e volta pro foco. Sem internet.
  if (!posTexto && saida && !resp.aguardar && !resp.acao && !(resp.alertas && resp.alertas.length) && !assunto
    && TANGENTE.has(intencao.intent) && now - (mem.tangenteEm || 0) >= TANGENTE_INTERVALO && rng() < TANGENTE_CHANCE) {
    const z = montar('tangente', {}, { humor, emocao, mem, now, rng, perfil });
    if (z.texto) { posTexto = z.texto; posAssunto = 'tangente'; mem = { ...mem, gerador: z.gerador, tangenteEm: now }; }
  }
  // Pelo nome (JF, 16/11: "ele fala com a gente de modo indefinido, responderia qualquer usuário"): uma resposta sim,
  // outra não, ele chama a pessoa pelo apelido que ela deu, se o nome ainda não apareceu na fala.
  // Revisão do Gemini (16/11): sem nome no silêncio da paciência nem quando vem reação de apelido/palavrão na frente
  // (ficava "Fala, parceiro! JF, você…"), e sem pôr em minúscula nome próprio (ficava "JF, nubank: …").
  const apelido = comoChamar(perfil);
  if (saida && apelido && assunto !== 'silencio' && !intencao.palavrao && !intencao.apelido) {
    const vez = (mem.nomeVez || 0) + 1;
    mem = { ...mem, nomeVez: vez };
    if (vez % 2 === 1 && !`${saida} ${posTexto || ''}`.toLowerCase().includes(String(apelido).toLowerCase())) {
      const oi = saida.match(/^(Oi|Olá|Opa|E aí|Eaí|Fala|Bom dia|Boa tarde|Boa noite)\b/);
      // só vira minúscula palavra comum de começo de frase; nome de banco, ativo ou jogo fica como está
      // 2.3.8: regra ao contrário (saía "Teste, Anotando R$ 50"): a 1ª palavra vira minúscula, menos nome próprio
      // (sigla como C6/CDI/JF, banco, jogo, ativo, e a palavra de quem já está na conta da pessoa)
      const comum = !nomeProprio(saida.split(/[\s,.:;!?]/)[0], d.accounts);
      if (oi) saida = `${oi[1]}, ${apelido}${saida.slice(oi[1].length)}`; // "Oi, JF! …" em vez de "JF, oi! …"
      else saida = `${apelido}, ${comum ? saida[0].toLowerCase() + saida.slice(1) : saida}`;
    }
  }
  // 2.0.9 (JF, 13/11): desabafo com palavrão no meio de um pedido ("krlh, gastei 500"): uma reação curta antes, sem
  // palavrão, e o pedido segue normal
  // 2.1.4 (JF, 14/11): "corno, quem te criou?" → apelido de amigo + pergunta; "burro, quanto gastei?" → xingou e
  // perguntou. Ele lê os dois: uma reação curta antes e a pergunta respondida.
  const prefixo = intencao.apelido ? 'apelido_curto' : intencao.xingouJunto ? 'xingou_junto' : 'desabafo_curto';
  if ((intencao.palavrao || intencao.apelido) && !['xingamento', 'desabafo', 'apelido'].includes(intencao.intent) && saida) {
    const dz = montar(prefixo, {}, { humor, emocao, mem, now, rng, perfil });
    if (dz.texto) { saida = `${dz.texto} ${saida}`; mem = { ...mem, gerador: dz.gerador }; }
  }
  if (passouRaiva) {
    const pr = montar('passou_raiva', {}, { humor, emocao, mem, now, rng, perfil });
    mem = { ...mem, gerador: pr.gerador };
    saida = ['nao_entendi', 'como_esta', 'saudacao', 'retomar'].includes(intencao.intent) || !saida ? pr.texto : `${pr.texto} ${saida}`;
    assunto = 'passou_raiva';
  }
  // Papo avulso demais seguido (06/11): na 5ª pergunta fora do dinheiro, ele chama de volta (sem bronca no Suave)
  const AVULSAS = new Set(['piada', 'identidade', 'significado', 'criador', 'origem', 'como_funciona', 'limites', 'elogio', 'xingamento', 'desabafo', 'como_esta', 'apelido', 'nao_entendi', 'sobre_jf', 'saudacao', 'agradecimento']);
  const avulsas = AVULSAS.has(intencao.intent) ? (mem.avulsas || 0) + 1 : 0;
  mem = { ...mem, avulsas };
  if (avulsas >= 5 && avulsas % 5 === 0 && saida && !assunto) { // na escalada da paciência, nada de "adoro conversar"
    const pd = montar('papo_demais', {}, { humor, emocao, mem, now, rng, perfil });
    if (pd.texto) { saida = `${saida} ${pd.texto}`; mem = { ...mem, gerador: pd.gerador }; }
  }

  const EVENTO_ROSTO = { piada: 'piada', identidade: 'identidade', significado: 'identidade', criador: 'identidade', origem: 'identidade',
    nao_entendi: 'nao_entendi', xingamento: 'xingamento', elogio: 'elogio', apelido: 'elogio', como_funciona: 'pensando', limites: 'pensando', sobre_jf: 'elogio' };
  const temAlerta = !!(resp.alertas && resp.alertas.some(a => ALERTAS.has(a.type)));
  // quando a pergunta já pede um rosto próprio (quem é você, o que pode fazer…), a frase não troca ele
  // ("o que você pode fazer?" saía preocupado por causa da palavra "aperta")
  const r = rostoPara(mem, { emocao, evento: EVENTO_ROSTO[intencao.intent], humor, now, rng, direto: !!EVENTO_ROSTO[intencao.intent], texto: EVENTO_ROSTO[intencao.intent] ? null : saida, alerta: temAlerta });
  mem = r.mem;
  // modo analista (13/11): ofertas e porcentagem ganham o rosto de óculos de analista
  if (['comparar_ofertas', 'oferta_unica', 'porcentagem', 'ofertas_print'].includes(intencao.intent)) {
    r.rosto = rostoAnalista(rng);
    mem = { ...mem, rostoUltimo: r.rosto };
  }
  // guarda a pergunta que ficou sem resposta (pra "e agora?"); some quando ela é respondida
  if (intencao.intent === 'nao_entendi') mem = { ...mem, semResposta: String(texto).trim().slice(0, 160) };
  else if (retomada) mem = { ...mem, semResposta: null };
  // lembra a última pergunta pra entender a próxima ("e no mês passado?")
  if (!['nao_entendi', 'retomar', 'explicar_melhor', 'gasto_sem_valor', 'pagamento_resposta'].includes(intencao.intent)) {
    mem = { ...mem, conversa: { intent: intencao.intent, categoryId: intencao.categoria?.id || null, periodo: intencao.periodo || 'mes', termo: intencao.termo?.termo || null, jogo: intencao.jogo?.jogo || null } };
  }
  return {
    fala: {
      texto: saida || 'Hmm.',
      posTexto, // 2º balão (16/11): o app mostra logo depois, com o "digitando…"
      posAssunto,
      emocao, rosto: r.rosto,
      sugestoes: resp.sugestoes || (intencao.intent === 'nao_entendi' ? SUGESTOES.slice(0, 5) : []),
      acao: resp.acao || null,
      fluxoMeta: resp.fluxoMeta || null,
      modoFoto: resp.modoFoto || null, // a próxima foto é pra explicar (não pra lançar) // "quero juntar pra…": o app conduz as perguntas e propõe a meta
      filaIA: resp.filaIA || null, // pergunta que precisa do servidor: o app responde agora ou guarda na fila
      entendeu: intencao.intent !== 'nao_entendi' && intencao.intent !== 'papo_pessoal' && !(intencao.intent === 'moeda_jogo' && intencao.precoDeHoje && !intencao.pacote) && !intencao.palpite && !(intencao.intent === 'retomar' && !retomada) && !resp.semDado
        && !resp.perguntaIA, // pesquisa pronta (questionário respondido): quem pesquisa é a IA
      // pra IA online, a continuação leva o assunto junto (ela não vê a conversa anterior)
      perguntaIA: resp.perguntaIA || (intencao.seguimento && intencao.jogo ? `Sobre ${intencao.jogo.moeda} do ${intencao.jogo.jogo}: ${String(texto).trim()}` : null),
      modoIA: resp.modoIA || null,
      pesada: !!resp.pesada, caminho: resp.caminho || null, // 2.3.4.6: pesquisa pesada (uma por dia) e o caminho das pedras
      palpite: !!intencao.palpite,
      // 2.3.4.3: custo e serviço de conserto (mecânico, eletricista…) chamam o Faz-Tudo
      intent: assunto || resp.assunto || intencao.intent,
      // 2.3.4.4: qual profissional aparece (o tema da conversa); o intent continua o mesmo pro resto do app
      avatar: assunto || (resp.assunto && resp.assunto !== 'plano_produto') ? null : (resp.avatar || avatarDoTema(resp.assunto || intencao.intent, texto, resp.acao)), // 2.0.8: o assunto da conversa (o app escolhe a forma do avatar com ele); 2.4.5: o plano guiado diz qual (plano_pet…)
    },
    memoria: mem,
  };
}

// 2.3.4.4 (JF): o tema da conversa escolhe o profissional (só em gasto, custo, pesquisa e plano; o resto tem o seu)
const COM_TEMA = new Set(['plano_produto', 'registrar_gasto', 'custo_medio', 'gasto_sem_valor', 'consumo_carro', 'pesquisa_compra', 'gasto_total', 'cabe', 'vale_parcelar', 'planos', 'gasto_demais', 'comparar_ofertas', 'oferta_unica', 'glossario']);
const TEMAS_AVATAR = [
  ['faz_tudo', null],
  ['estudante', /\b(faculdade|fies|prouni|bolsa de estudos?|mensalidade|cursinho|curso|escola|colegio|vestibular|enem|material escolar|universidade|tcc|apostila|matricula|estudante|estudar)\b/],
  ['ti', /\b(computador|notebook|pc gamer|pc|memoria ram|ram|placa de video|placa mae|ssd|hd externo|processador|monitor|teclado|mouse|headset|celular|smartphone|iphone|samsung|xiaomi|motorola|tablet|ipad|macbook|playstation|ps5|xbox|smartwatch|tv|smart tv|roteador|software|programa|licenca|impressora|console)\b/],
  ['cinefilo', /\b(cinema|filme|filmes|show|shows|teatro|ingresso|ingressos|pipoca|serie|series|festa|balada|passeio|parque|museu|boliche|patinacao|rinque|beisebol|kart|fliperama)\b/],
  ['feirante', /\b(mercado|supermercado|feira|hortifruti|acougue|padaria|atacadao|atacarejo|compras do mes|cesta basica)\b/],
];
const POR_CATEGORIA_AVATAR = { educacao: 'estudante', lazer: 'cinefilo', mercado: 'feirante' };
function avatarDoTema(intent, texto, acao) {
  if (!COM_TEMA.has(intent)) return null;
  const t = String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  for (const [a, rx] of TEMAS_AVATAR) if ((rx || FAZ_TUDO_TXT).test(t)) return intent === 'glossario' && a !== 'estudante' ? null : a;
  return (intent === 'registrar_gasto' && POR_CATEGORIA_AVATAR[acao?.categoryId]) || null;
}
const FAZ_TUDO_TXT = /\b(mecanic\w*|oficina|eletricist\w*|encanador\w*|encanamento|hidraulic\w*|pedreiro|pintor|marceneiro|chaveiro|conserto|consertar|reparo|reforma|manutencao|marido de aluguel|faz tudo|troca de oleo|vazamento|chuveiro|torneira|tomada|disjuntor|lampada|cano|pneu|bateria do carro|freio)\b/;

// nome próprio no começo da frase não vira minúscula (2.3.8)
const PROPRIOS = new Set([
  ...BANKS.flatMap(b => b.split(/\s+/)), ...MOEDAS_JOGOS.flatMap(m => m.jogo.split(/\s+/)),
  'Ibovespa', 'Bitcoin', 'Ethereum', 'Selic', 'IPCA', 'Pix', 'Robux', 'V-Bucks', 'Tesouro', 'C.A.O.S.', 'Caos',
].map(x => x.toLowerCase()));
function nomeProprio(palavra, accounts = []) {
  const w = String(palavra || '');
  if (!w || /\d/.test(w) || /^[A-ZÀ-Ú]{2,}/.test(w) || /[a-zà-ú][A-Z]/.test(w)) return true; // C6, CDI, JF, PicPay
  const lw = w.toLowerCase();
  return PROPRIOS.has(lw) || (accounts || []).some(a => String(a.bank || '').toLowerCase().split(/\s+/).includes(lw)
    || String(a.nickname || '').toLowerCase().split(/\s+/).includes(lw));
}

function nomeAlerta(a) {
  switch (a.type) {
    case 'categoria_estourada': return `${a.categoryName} estourada`;
    case 'orcamento_80': return `${a.categoryName} em ${a.pct}%`;
    case 'ritmo_alto': return 'ritmo acima do orçamento';
    case 'mes_negativo': return 'saindo mais do que entrando';
    case 'conta_negativa': return `${a.accountName} no negativo`;
    case 'abaixo_do_piso': return `${a.accountName} abaixo do piso (${formatBRL(a.balanceCents)} de ${formatBRL(a.pisoCents)})`;
    case 'saldo_baixo': return `saldo baixo (menos de R$ 100): ${(a.contas || []).map(c => `${c.nome} ${formatBRL(c.saldoCents)}`).join(', ')}`;
    case 'categoria_pesando': return `${a.categoryName} levou ${a.pct}% do mês`;
    case 'piso_geral_estourado': return `média de segurança estourada em ${formatBRL(a.overCents)}`;
    case 'piso_geral_perto': return `média de segurança acaba em ${a.days} ${a.days === 1 ? 'dia' : 'dias'}`;
    case 'perto_do_piso': return `${a.accountName} perto do piso: faltam ${formatBRL(a.leftCents)}`;
    case 'delivery_repetido': return `${a.count} deliveries na semana`;
    case 'formiguinha': return `${a.count} gastinhos somando ${formatBRL(a.totalCents)}`;
    case 'sem_registro': return `${a.days} dias sem anotar`;
    case 'compromisso_vence': return `${a.nome} vence ${a.days === 0 ? 'hoje' : a.days === 1 ? 'amanhã' : `em ${a.days} dias`}`;
    case 'compromisso_atrasado': return `${a.nome} venceu dia ${a.dia}`;
    case 'plano_do_mes': return `este mês tem ${a.nome}`;
    case 'confira_banco': return `conferir o saldo de ${a.accountName}`;
    case 'a_receber': return `${formatBRL(a.totalCents)} a receber`;
    case 'cartao_limite': return `${a.accountName} com ${a.pct}% do limite`;
    case 'auditor_assinatura': return `${a.nome} ainda vale a pena?`;
    case 'cartao_vence': return `fatura do ${a.accountName} vence ${a.days === 0 ? 'hoje' : a.days === 1 ? 'amanhã' : `em ${a.days} dias`}`;
    default: return a.type;
  }
}

export function emocaoDoMomento(memory, mood = DEFAULT_MOOD, now = Date.now()) {
  const m = normalizarMem(memory, now);
  const e = emocaoEstavel(m.emocoes, MOODS[mood] ? mood : DEFAULT_MOOD, now, m.estab).emocao; // só lê, não conta fala
  return { emocao: e, aparencia: rostoDe(e), rosto: m.rostoUltimo };
}

/** Rosto pra um momento sem fala (ex.: "pensando" enquanto a IA online responde). Não muda a memória. */
export function rostoAvulso(evento, { mood = DEFAULT_MOOD, memory, now = Date.now(), rng = Math.random, texto = null } = {}) {
  const m = normalizarMem(memory, now);
  return escolherRosto({ emocao: 'calmo', evento, humor: MOODS[mood] ? mood : DEFAULT_MOOD, memoria: m.rosto, rng, livre: true, texto }).rosto;
}

// 3ª lei: erro dentro do narrador vira silêncio, nunca trava o app.
export const reagir = protegido('reagir', reagirBruto, (ev, o = {}) => ({ fala: null, memoria: o.memory ?? memoriaInicial() }));
export const conversar = protegido('conversar', conversarBruto, (t, d, o = {}) => ({
  fala: { texto: 'Deu um curto aqui dentro. Tenta de novo?', emocao: 'calmo', rosto: null, sugestoes: SUGESTOES.slice(0, 3), acao: null, entendeu: false },
  memoria: o.memory ?? memoriaInicial(),
}));
export { nomeAlerta };

/**
 * Depois de um gasto confirmado (16/11): às vezes ele pergunta "valeu a pena?". Devolve { fala, memoria } ou fala null.
 * A resposta da pessoa volta pelo conversar() (memória "aguardando"); nada é gravado nos dados.
 */
export const curiosidadeDoGasto = protegido('curiosidadeDoGasto', (gasto, { memory, now = Date.now(), rng = Math.random } = {}) => {
  const mem = normalizarMem(memory, now);
  const p = perguntaCuriosa(congelar(gasto), mem, { now, rng });
  if (!p) return { fala: null, memoria: mem };
  return { fala: { texto: p.texto, sugestoes: p.sugestoes, intent: 'curiosidade' }, memoria: p.memoria };
}, (g, o = {}) => ({ fala: null, memoria: o.memory ?? memoriaInicial() }));

/** Fala avulsa de um gatilho (ex.: as perguntas do primeiro acesso). Devolve { texto, memoria }. */
export const falaAvulsa = protegido('falaAvulsa', (gatilho, vars = {}, { mood = DEFAULT_MOOD, memory, now = Date.now(), rng = Math.random, perfil = null } = {}) => {
  const humor = MOODS[mood] ? mood : DEFAULT_MOOD;
  const mem = normalizarMem(memory, now);
  const est = emocaoEstavel(mem.emocoes, humor, now, mem.estab);
  const emocao = est.emocao;
  const r = montar(gatilho, vars, { humor, emocao, mem, now, rng, perfil });
  return { texto: r.texto, memoria: { ...mem, estab: est.estab, gerador: r.gerador } };
}, (g, v, o = {}) => ({ texto: '', memoria: o.memory ?? memoriaInicial() }));
