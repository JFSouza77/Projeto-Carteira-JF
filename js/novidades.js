// Novidades que a pessoa vê (tela 🆕 Novidades). Escreva pra quem usa o app:
//  · cada item é "emoji Título: explicação" (título curto, até 34 letras, sem dois-pontos);
//  · nada de bastidores (quem fez, revisão, testes, código). Versão que só mudou por dentro fica só com o "t";
//  · o mais importante primeiro; no máximo 7 itens por versão;
//  · toda versão nova do app ganha a sua entrada aqui (regra no CLAUDE.md). A mais nova fica em cima.
// Arquivo só de dados e funções puras: quem mostra e guarda o "já vi" é o app.js.

export const NOVIDADES = Object.freeze([
  {
    v: '1.5',
    data: '06/11/2026',
    nome: 'Cartão e Cérebro',
    t: 'Cartão de crédito com fatura e limite, e um C.A.O.S. que entende melhor o que você escreve.',
    itens: [
      '💳 Cartão de crédito: cadastre em Contas com limite, dia que fecha e dia que vence. Lance o gasto no cartão e ele acompanha a fatura e avisa perto do limite e do vencimento.',
      '🧠 Continua a conversa: perguntou quanto gastou no mercado? Agora é só mandar "e no mês passado?" ou "e em delivery?".',
      '⌨️ Erro de digitação: "qunto gastie no mercdo" ele entende como "quanto gastei no mercado".',
      '🎯 Melhor palpite: quando não tem certeza, ele responde o que achou que era e pede pra você perguntar de outro jeito se não for.',
      '📬 Nenhuma pergunta esquecida: o que ele não souber fica guardado. Quando o servidor estiver ligado, ele volta com "Ei, sabe aquela sua pergunta?".',
    ],
    qol: [],
  },
  {
    v: '1.4',
    data: '06/11/2026',
    nome: 'Aniversário e Respiro',
    t: 'O C.A.O.S. sabe sua idade, lembra do seu dia, pensa antes de responder e entende mais perguntas.',
    itens: [
      '🎂 Seu aniversário: diga sua data de nascimento (no começo ou em Ajustes). O C.A.O.S. ajusta o jeito de falar à sua idade e te dá parabéns no dia.',
      '💬 Ele pensa antes de falar: aparece "digitando…" por um instante antes da resposta, como numa conversa de verdade.',
      '🧠 Entende mais perguntas: "quanto eu tenho guardado no total?", "o que mais tenho planejado pro mês?" e "quanto tenho pra pagar?".',
      '💳 Pagamento em partes: pagou só um pedaço de uma conta? Ela continua aberta com o que falta, e a sobra do mês conta o resto.',
      '🛡️ Backup mais seguro: um arquivo estragado ou mexido é recusado antes de mudar qualquer coisa nos seus dados.',
      '🏦 Mais bancos: Banestes, BRB, Banco do Nordeste, Agibank, Will Bank e outros. Conta em "Outro" mostra só o apelido.',
      '😶 Rosto que combina: a cara do C.A.O.S. sai do que ele está dizendo. Aviso sério nunca vem com cara de festa.',
    ],
    qol: [
      '🆕 Novidades: esta tela. Quando o app mudar, aparece um aviso no Início.',
      '📱 Tela mais limpa: o topo e a barra de digitar ficaram sólidos, sem nada aparecendo cortado por baixo.',
      '✅ Plano do mês: se você cancelar o lançamento, o plano continua pendente.',
    ],
  },
  {
    v: '1.3',
    data: '05/11/2026',
    nome: 'Planejamento do Mês',
    t: 'Uma aba pra planejar o mês: contas fixas, planos de compra e a pergunta que importa, cabe no mês?',
    itens: [
      '📅 Aba Mês: contas fixas, faturas, assinaturas e planos que se repetem, com a sobra prevista do mês.',
      '🤔 Cabe no mês: pergunte "cabe 200 no mês?" e o C.A.O.S. soma o que já saiu, o que falta pagar e seus planos.',
      '⏰ Vencimentos: ele avisa quando uma conta vence em breve ou já venceu.',
      '👋 Primeiro acesso: o C.A.O.S. se apresenta, pergunta seu nome, como te chamar e no que você quer ajuda.',
      '📈 Mercado: dólar, euro, bolsa e juros do dia, com a análise dele e sem recomendar investimento.',
      '🏦 Qual banco rende mais: ele compara e, se não souber na hora, traz a resposta depois.',
    ],
    qol: [],
  },
  {
    v: '1.2',
    data: '04/11/2026',
    nome: 'Rosto do C.A.O.S.',
    t: 'O C.A.O.S. ganhou rosto: ele muda de expressão conforme o que sente.',
    itens: [
      '😶 Rosto animado: o C.A.O.S. pisca, muda de cara e mostra o que está sentindo em cada fala.',
    ],
    qol: [],
  },
  {
    v: '1.1',
    data: '04/11/2026',
    nome: 'Quem é o C.A.O.S.',
    t: 'Pergunte "quem é você?" e ele conta quem é, de onde veio e o que pode e não pode fazer.',
    itens: [
      '🤖 Ele sabe quem é: o que significa a sigla, de onde veio, quem criou e o que ele nunca faz com seu dinheiro.',
      '😄 Piadas: peça uma piada quando quiser.',
    ],
    qol: [],
  },
  {
    v: '1.0',
    data: '04/11/2026',
    nome: 'Primeira Versão',
    t: 'Controle de gastos com o C.A.O.S.: anote, acompanhe o mês e converse com ele.',
    itens: [
      '💸 Gastos e entradas: anote em segundos, por categoria, com foto do comprovante se quiser.',
      '🎯 Orçamento: limite por categoria, com aviso quando estiver perto de estourar.',
      '💬 Conversa: pergunte quanto gastou, onde gastou mais ou mande "gastei 30 no mercado".',
      '🏦 Contas: o saldo de cada banco, que você mesmo informa. O app não acessa seu banco.',
      '🔔 Lembretes: um aviso no fim do dia pra anotar os gastos.',
      '📴 Funciona sem internet: seus dados ficam só no seu aparelho.',
    ],
    qol: [],
  },
]);

export const VERSAO_APP = NOVIDADES[0].v;

/** Tem novidade que a pessoa ainda não viu? (`vista` = última versão que ela abriu) */
export function temNovidade(vista) {
  return vista !== VERSAO_APP;
}

/** Separa "🎂 Título: explicação" em partes pra tela. */
export function partesDoItem(item) {
  const m = String(item).match(/^(\S+)\s+([^:]{1,34}):\s*(.+)$/u);
  return m ? { icone: m[1], titulo: m[2], texto: m[3] } : { icone: '•', titulo: '', texto: String(item) };
}
