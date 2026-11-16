// Pergunta curiosa depois de um gasto (JF, 16/11): como amigo que repara, às vezes o C.A.O.S. pergunta "valeu a pena?"
// ou "foi planejado ou bateu a vontade?". A resposta não grava nada nos dados (1ª lei): só fica na memória dele, pra
// ele lembrar ("é o 3º impulso que você me conta este mês"). Funções puras, sem internet.

import { formatBRL } from '../engine.js';

// a cada quanto ele pode perguntar, e a chance (pra não virar interrogatório)
export const CURIOSIDADE_INTERVALO = 3 * 3_600_000;
export const CURIOSIDADE_CHANCE = 0.35;

const GRUPO_DA_CATEGORIA = {
  delivery: 'comida', restaurante: 'comida',
  lazer: 'lazer', jogos: 'lazer', streaming: 'lazer',
  compras: 'compra',
  mercado: 'mercado',
};
// fixos e obrigações não ganham pergunta (ninguém compra aluguel por impulso)
const SEM_PERGUNTA = new Set(['moradia', 'contas', 'saude', 'educacao', 'transporte']);

// 5 perguntas por grupo; cada uma com as respostas que viram botão (regra do 0 ou 5 vale pras listas de perguntas)
export const PERGUNTAS = Object.freeze({
  comida: [
    { texto: 'Curiosidade minha: foi fome de verdade ou preguiça de cozinhar?', sugestoes: ['Fome de verdade', 'Preguiça', 'Foi um mimo'] },
    { texto: 'E aí, tava bom pelo menos?', sugestoes: ['Valeu a pena', 'Mais ou menos', 'Me arrependi'] },
    { texto: 'Esse foi planejado ou bateu a vontade?', sugestoes: ['Planejado', 'Bateu a vontade'] },
    { texto: 'Pergunta de amigo: valeu cada centavo?', sugestoes: ['Valeu a pena', 'Mais ou menos', 'Me arrependi'] },
    { texto: 'Foi comemoração ou dia corrido?', sugestoes: ['Comemoração', 'Dia corrido', 'Preguiça'] },
  ],
  lazer: [
    { texto: 'E aí, valeu a pena?', sugestoes: ['Valeu a pena', 'Mais ou menos', 'Me arrependi'] },
    { texto: 'Isso tava nos planos ou foi no impulso?', sugestoes: ['Planejado', 'Bateu a vontade'] },
    { texto: 'Me conta: se divertiu?', sugestoes: ['Muito!', 'Mais ou menos', 'Me arrependi'] },
    { texto: 'Curiosidade: foi presente pra você mesmo?', sugestoes: ['Foi um mimo', 'Planejado', 'Bateu a vontade'] },
    { texto: 'Faria de novo?', sugestoes: ['Faria', 'Talvez', 'Me arrependi'] },
  ],
  compra: [
    { texto: 'Era coisa que você precisava ou que você queria?', sugestoes: ['Precisava', 'Queria', 'Os dois'] },
    { texto: 'Esse foi planejado ou bateu a vontade?', sugestoes: ['Planejado', 'Bateu a vontade'] },
    { texto: 'Pesquisou o preço antes ou foi direto?', sugestoes: ['Pesquisei', 'Fui direto'] },
    { texto: 'Valeu a pena?', sugestoes: ['Valeu a pena', 'Mais ou menos', 'Me arrependi'] },
    { texto: 'Faz tempo que você queria isso?', sugestoes: ['Planejado', 'Bateu a vontade'] },
  ],
  mercado: [
    { texto: 'Foi a compra do mês ou aquela passadinha rápida?', sugestoes: ['Compra do mês', 'Passadinha'] },
    { texto: 'Levou lista ou foi no improviso?', sugestoes: ['Com lista', 'No improviso'] },
    { texto: 'Entrou algum mimo no carrinho?', sugestoes: ['Só o necessário', 'Foi um mimo'] },
    { texto: 'Esse saiu como você esperava?', sugestoes: ['Saiu certinho', 'Passou um pouco'] },
    { texto: 'Foi a passadinha de "só vou pegar o pão"?', sugestoes: ['Passadinha', 'Compra do mês'] },
  ],
  geral: [
    { texto: 'Esse foi planejado ou bateu a vontade?', sugestoes: ['Planejado', 'Bateu a vontade'] },
    { texto: 'Valeu a pena?', sugestoes: ['Valeu a pena', 'Mais ou menos', 'Me arrependi'] },
    { texto: 'Precisava ou queria?', sugestoes: ['Precisava', 'Queria', 'Os dois'] },
    { texto: 'Curiosidade minha: faria de novo?', sugestoes: ['Faria', 'Talvez', 'Me arrependi'] },
    { texto: 'Esse doeu no bolso ou foi tranquilo?', sugestoes: ['Tranquilo', 'Doeu um pouco'] },
  ],
});

/**
 * Depois de um gasto confirmado, decide se pergunta algo (e o quê).
 * @returns {{ texto, sugestoes, memoria } | null}
 */
export function perguntaCuriosa(gasto, memoria, { now = Date.now(), rng = Math.random } = {}) {
  if (!gasto || gasto.compromissoId || SEM_PERGUNTA.has(gasto.categoryId)) return null;
  const mem = memoria || {};
  const ultima = mem.curiosidade?.em || 0;
  if (now - ultima < CURIOSIDADE_INTERVALO || rng() >= CURIOSIDADE_CHANCE) return null;
  const grupo = GRUPO_DA_CATEGORIA[gasto.categoryId] || 'geral';
  const lista = PERGUNTAS[grupo];
  const p = lista[Math.floor(rng() * lista.length)];
  return {
    texto: p.texto,
    sugestoes: [...p.sugestoes],
    memoria: {
      ...mem,
      curiosidade: { ...(mem.curiosidade || {}), em: now },
      aguardando: { tipo: 'curiosidade', grupo, categoryId: gasto.categoryId, valor: gasto.amountCents, em: now },
    },
  };
}

// o que a resposta quer dizer (texto já sem acento e em minúscula)
export function tipoDaResposta(tx) {
  if (/(arrepend|nao valeu|nem valeu|joguei fora|dinheiro jogado)/.test(tx)) return 'arrependi';
  if (/(impulso|bateu a vontade|vontade|nao resisti|queria\b|fui direto|improviso|passou um pouco|doeu)/.test(tx)) return 'impulso';
  if (/(preguica|dia corrido|cansad)/.test(tx)) return 'preguica';
  if (/(mimo|presente|comemora|merecia|mereco)/.test(tx)) return 'mimo';
  if (/(planejad|precisava|pesquisei|com lista|compra do mes|necessario|saiu certinho|tranquilo|nos planos)/.test(tx)) return 'planejado';
  if (/(valeu|muito|faria|gostei|amei|demais|bom\b|otimo|fome)/.test(tx)) return 'valeu';
  if (/(mais ou menos|talvez|sei la|os dois|passadinha)/.test(tx)) return 'meio';
  return null;
}

const REACOES = {
  planejado: ['Isso que eu gosto de ver: gasto que já tinha lugar no plano.', 'Planejado é outra coisa, né? Nem dói.', 'Boa! Gasto com plano é gasto tranquilo.', 'Anotado na minha cabeça: mais um com plano. Orgulho.', 'Assim que se faz. Sem susto no fim do mês.'],
  impulso: ['Acontece! O segredo é perceber, e você percebeu.', 'Sem julgamento. Só fica de olho se começar a repetir.', 'Vontade bate em todo mundo. O que conta é não virar rotina.', 'Tranquilo. Uma dica: esperar 24 horas antes de comprar tira muita vontade.', 'Valeu a sinceridade! Eu lembro disso pra te ajudar depois.'],
  arrependi: ['Poxa. Pelo menos agora você sabe pra próxima.', 'Acontece. Arrependimento também ensina.', 'Respira: um gasto não define o mês. Bora segurar os próximos.', 'Fica a lição, sem culpa. Você ainda está no controle.', 'Entendi. Se quiser, eu te lembro disso quando aparecer de novo.'],
  preguica: ['Dia corrido conta! Só vale ver quantas vezes isso rola na semana.', 'Normal. Uma comidinha congelada em casa salva esses dias.', 'Preguiça é humana. O bolso só pede que não seja todo dia.', 'Justo. Às vezes o descanso vale o preço.', 'Entendi. Se virar hábito, eu te aviso.'],
  mimo: ['Mimo também faz parte! Cuidar de você é importante.', 'Merecido! Só cabe no orçamento, que tá tudo certo.', 'Um mimo de vez em quando faz bem pra cabeça.', 'Adoro! Gasto que deixa feliz e cabe no mês é ótimo.', 'Tá liberado. Com moderação, mimo é saúde.'],
  valeu: ['Que bom! Gasto que vale a pena é o melhor tipo.', 'Ótimo! Dinheiro bem gasto é isso.', 'Fico feliz! É pra isso que o dinheiro serve.', 'Boa! Quando vale a pena, nem pesa.', 'Massa! Anotado e aprovado.'],
  meio: ['Entendi. Na próxima, vale pensar duas vezes.', 'Mais ou menos já é uma pista: talvez dê pra trocar por algo melhor.', 'Justo. Nem todo gasto é inesquecível.', 'Tranquilo. Às vezes é assim mesmo.', 'Anotado! Da próxima vez a gente avalia junto.'],
};

/**
 * Lê a resposta à pergunta curiosa. Não grava dado nenhum: só a memória dele (contagem do mês).
 * @returns {{ fato, memoria } | null} null = não era resposta (a conversa segue normal)
 */
export function respostaCuriosa(texto, espera, memoria, { now = Date.now(), rng = Math.random, mes } = {}) {
  const tx = String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  if (!tx || /\?/.test(tx) || tx.split(/\s+/).length > 8) return null;
  const tipo = tipoDaResposta(tx);
  if (!tipo) return null;
  const mem = memoria || {};
  const atual = mem.curiosidade?.mes === mes ? mem.curiosidade : { mes, impulsos: 0, planejados: 0, arrependidos: 0, impulsoCents: 0 };
  const c = { ...atual, em: mem.curiosidade?.em || now };
  if (tipo === 'impulso') { c.impulsos += 1; c.impulsoCents += espera?.valor || 0; }
  if (tipo === 'planejado') c.planejados += 1;
  if (tipo === 'arrependi') c.arrependidos += 1;
  const lista = REACOES[tipo];
  let fato = lista[Math.floor(rng() * lista.length)];
  // a partir do 2º impulso do mês, ele lembra o número (alerta com número, sem bronca)
  if (tipo === 'impulso' && c.impulsos >= 2) fato += ` Esse é o ${c.impulsos}º impulso que você me conta este mês (${formatBRL(c.impulsoCents)} no total).`;
  if (tipo === 'planejado' && c.planejados >= 3) fato += ` Já são ${c.planejados} gastos planejados este mês!`;
  return { fato, tipo, memoria: { ...mem, curiosidade: c } };
}
