// Tutorial guiado (JF, 17/11): "imagine que fosse um jogo: a tela escurece, acende só o que você precisa ver naquele
// momento, e o C.A.O.S. vira guia turístico, mostrando parte por parte". Pensado pra quem é muito novo ou mais velho.
// 17/11 (JF): em todos os passos o C.A.O.S. aparece como Guia Turístico (chapéu de explorador e bandeirinha).
// Arquivo só de dados e funções puras (o teste confere); quem desenha é o js/telas/tour.js.
// Regra do JF: quantidades terminam em 0 ou 5 (10 passos no completo, 5 no básico, 5 temas).

export const PASSOS_TOUR = Object.freeze({
  inicio_caos: { tela: 'inicio', alvo: '#caos', forma: 'guia', titulo: 'Eu sou o C.A.O.S.',
    texto: 'Muito prazer! Aqui no Início eu comento seus gastos, aviso quando alguma coisa aperta e comemoro quando o mês vai bem. Tocou em mim, a gente conversa.' },
  inicio_resumo: { tela: 'inicio', alvo: '#resumo-gasto', forma: 'guia', titulo: 'Seu mês num olhar',
    texto: 'Aqui aparece quanto você já gastou no mês e, quando der, quanto ainda dá pra gastar até o salário. Os números mudam sozinhos a cada anotação.' },
  barra: { tela: 'inicio', alvo: '.tabbar', forma: 'guia', titulo: 'A barra de baixo',
    texto: 'Daqui você vai pra qualquer lugar do app: Início, Contas, Lançar, Mês e Chat. É só tocar no nome.' },
  lancar_botao: { tela: 'inicio', alvo: '.tabbar [data-tab="lancar"]', forma: 'guia', titulo: 'O botão mais importante',
    texto: 'Gastou ou recebeu dinheiro? Toque neste botão do meio pra anotar. Leva só uns segundos.' },
  lancar_form: { tela: 'lancar', alvo: '#entry-form', forma: 'guia', titulo: 'Anotar é assim',
    texto: 'Escolha se é gasto ou entrada, digite o valor, diga o que foi e como pagou. Pronto! Também dá pra mandar a foto do comprovante que eu leio.',
    // quem acabou de chegar ainda não tem conta: o Lançar mostra antes o "cadastre uma conta"
    alvoAlt: '#lancar-trava',
    textoAlt: 'Antes do primeiro gasto, eu peço a conta do seu banco: só o nome e o saldo, nada de senha. Depois aparece aqui o espaço pra anotar o valor, o que foi e como pagou.' },
  contas: { tela: 'contas', alvo: '#add-conta-card', forma: 'guia', titulo: 'Seus bancos e cartões',
    texto: 'Em Contas você cadastra seus bancos e cartões, só com o saldo e o limite. Nada de senha nem número de cartão: o app nunca mexe no seu banco.' },
  mes: { tela: 'mes', alvo: '#comp-card', forma: 'guia', titulo: 'As contas do mês',
    texto: 'Em Mês ficam as contas fixas (aluguel, luz, internet), os planos e as metas. Eu te lembro antes de vencer.' },
  chat: { tela: 'conversa', alvo: '#chat-form', forma: 'guia', titulo: 'Fale comigo',
    texto: 'Aqui você escreve do jeito que fala com um amigo: "gastei 30 no mercado", "quanto gastei este mês?", "dá pra ir ao cinema?". Eu entendo e respondo.' },
  ajuda: { tela: 'inicio', alvo: '#me-ajuda', forma: 'guia', titulo: 'Travou? Me chama',
    texto: 'Este botão de ajuda fica sempre por perto. Tocou nele, aparecem atalhos e o passo a passo de cada coisa. Dá até pra arrastar ele pro lado.' },
  ajustes: { tela: 'inicio', alvo: '#abrir-ajustes', forma: 'guia', titulo: 'Do seu jeito',
    texto: 'Em Ajustes você escolhe meu humor, liga minha voz, aumenta a letra e cria sua conta pra usar em vários aparelhos. Este tutorial também mora lá.' },
});

export const ROTEIROS = Object.freeze({
  completo: ['inicio_caos', 'inicio_resumo', 'barra', 'lancar_botao', 'lancar_form', 'contas', 'mes', 'chat', 'ajuda', 'ajustes'],
  basico: ['inicio_caos', 'lancar_botao', 'lancar_form', 'chat', 'ajuda'],
});

// "Quero saber uma coisa só" (JF): a pessoa escolhe o assunto e vê só aquele pedaço
export const TEMAS_TOUR = Object.freeze([
  { id: 'anotar', t: 'Como anoto um gasto', passos: ['lancar_botao', 'lancar_form'] },
  { id: 'conversar', t: 'Como converso com o C.A.O.S.', passos: ['inicio_caos', 'chat'] },
  { id: 'bancos', t: 'Como cadastro meu banco', passos: ['contas'] },
  { id: 'mes', t: 'Onde vejo como anda o mês', passos: ['inicio_resumo', 'mes'] },
  { id: 'jeito', t: 'Como deixo o app do meu jeito', passos: ['ajustes', 'ajuda'] },
]);

/** Lista de passos de um roteiro ou tema, já com o número ("Passo 2 de 5"). */
export function montarRoteiro(qual) {
  const ids = ROTEIROS[qual] || TEMAS_TOUR.find(t => t.id === qual)?.passos || [];
  return ids.filter(id => PASSOS_TOUR[id]).map((id, i, todos) => ({ id, ...PASSOS_TOUR[id], n: i + 1, de: todos.length }));
}
