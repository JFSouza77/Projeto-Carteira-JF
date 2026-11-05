// Banco de falas do C.A.O.S. financeiro (geradores por gatilho, no formato do Perfil JF).
// Regras de escrita:
//  · cada pedaço é uma frase completa: qualquer combinação de abre + fato + fecho tem que fazer sentido;
//  · o balde "geral" serve para QUALQUER humor (nada de zoeira pesada aqui);
//  · zoeira fica no balde humor_acido (2ª lei: Suave nunca recebe);
//  · alerta sempre traz o número (o fato) e, quando der, um empurrão útil (o fecho);
//  · toda lista tem 5, 10, 15… pedaços (regra do JF: quantidades terminam em 0 ou 5).
// Variáveis: {valor} {categoria} {fonte} {pct} {resta} {passou} {qtd} {dias} {total} {mes} {economia}
//            {previsto} {porDia} {entradas} {gastos} {conta} {saldo} {fato} {emocao} {nome}

export const GERADORES = {
  boas_vindas: {
    moldes: ['{abre} {meio}', '{abre}'],
    abre: {
      geral: [
        'Sistema online.',
        'C.A.O.S. de plantão.',
        'Voltei a enxergar os números.',
        'Circuitos ligados, carteira à vista.',
        'Oi. Eu estava contando moedas no escuro.',
      ],
      periodo_madrugada: [
        'Acordado a essa hora? Eu também, mas eu sou um programa.',
        'Madrugada e você aqui. Respeito.',
        'Pelo horário, ou é insônia ou é boleto.',
        'Hora estranha pra conferir dinheiro. Gostei.',
        'A madrugada é ótima pra fazer conta. E péssima pra compra por impulso.',
      ],
      periodo_manha: [
        'Bom dia.',
        'Bom dia! Café primeiro, gastos depois.',
        'Manhã cedo e já pensando no dinheiro. Isso é disciplina.',
        'Bom dia. Os números dormiram bem.',
        'Começando o dia pelo controle. Ótima escolha.',
      ],
      periodo_noite: [
        'Boa noite.',
        'Boa noite. Hora de fechar as contas do dia.',
        'Fim de dia é a melhor hora pra anotar o que saiu.',
        'Boa noite. Vamos ver como foi o dia da carteira.',
        'Noite chegou, e eu estou de olho.',
      ],
    },
    meio: {
      geral: [
        'Bora anotar os gastos de hoje?',
        'Cada gasto anotado é um susto a menos no fim do mês.',
        'Pergunta o que quiser na aba C.A.O.S.',
        'Eu cuido dos comentários, você cuida dos números.',
        'Se precisar, eu faço as contas. É o que eu faço de melhor.',
      ],
      humor_acido: [
        'Veio confessar quanto gastou?',
        'Inicializando julgamento financeiro.',
        'Bem-vindo de volta ao tribunal da carteira.',
        'Prometo ser justo. Não prometo ser gentil.',
        'Já preparei a calculadora e a paciência. Só a calculadora, na verdade.',
      ],
      fimDoMes: [
        'Reta final do mês: é agora que o orçamento é testado.',
        'Faltam poucos dias pro mês virar. Segura firme.',
        'Fim de mês chegando. Respira e confere os números.',
        'Últimos dias do mês. Cada real conta mais agora.',
        'O mês está acabando. Bora fechar no verde?',
      ],
      inicioDoMes: [
        'Mês novo, orçamento novo.',
        'Começo de mês é a melhor hora pra planejar.',
        'Mês zerado. Bora fazer esse ser melhor que o anterior.',
        'Início de mês: que tal revisar os orçamentos?',
        'Página em branco. Vamos escrever um mês bonito.',
      ],
      emo_preocupacao: [
        'Tem coisa que eu quero te mostrar nos alertas.',
        'Antes de tudo: dá uma olhada nos alertas.',
        'Fiquei de olho num número aqui. Confere comigo?',
        'Tem um orçamento pedindo atenção.',
        'Achei uma coisa no radar. Nada de pânico, só atenção.',
      ],
    },
  },

  gasto_cadastrado: {
    moldes: ['{fato}', '{fato} {fecho}', '{fato} {fecho}'],
    fato: {
      geral: [
        'Anotado: {valor} em {categoria}.',
        '{valor} em {categoria}, registrado.',
        'Registrado. {categoria} recebeu {valor}.',
        '{categoria}: mais {valor}.',
        'Gasto salvo: {valor}, {categoria}.',
      ],
    },
    fecho: {
      geral: [
        'Bom controle.',
        'Quem anota sabe para onde o dinheiro vai.',
        'O motor já somou.',
        'Seguimos de olho.',
        'Anotar é metade do caminho.',
      ],
      humor_suave: [
        'Tudo certo por aqui.',
        'Obrigado por anotar.',
        'Organizado é outra coisa.',
        'Mais um passo no controle.',
        'Tá indo bem.',
      ],
      humor_acido: [
        'Fascinante. Continue.',
        'Não vou fingir que não vi.',
        'Interessante escolha de vida.',
        'Anotado com uma sobrancelha levantada.',
        'Eu ia comentar, mas vou só suspirar.',
      ],
      periodo_madrugada: [
        'Gasto de madrugada sempre me deixa curioso.',
        'A essa hora? Anotado, sem julgamento. Quase.',
        'Compras de madrugada são as mais sinceras.',
        'Registrado. Vai dormir, que amanhã tem mais conta.',
        'Anotado. O sono também é de graça, viu?',
      ],
    },
  },

  entrada_cadastrada: {
    moldes: ['{fato}', '{fato} {fecho}'],
    fato: {
      geral: [
        'Entrou {valor} de {fonte}.',
        'Anotado: {valor} entrando, {fonte}.',
        'Dinheiro chegando: {valor} ({fonte}).',
        '{fonte}: mais {valor} na conta.',
        'Entrada registrada: {valor}.',
      ],
    },
    fecho: {
      geral: [
        'Gosto de ver número entrando.',
        'Que tal separar um pedaço antes de gastar?',
        'Boa! Agora é fazer render.',
        'Esse é o tipo de lançamento que eu mais gosto.',
        'Guardar uma parte agora é o melhor presente pro você do futuro.',
      ],
      humor_acido: [
        'Finalmente uma notícia boa.',
        'Aproveita antes que o cartão descubra.',
        'Vou anotar antes que suma.',
        'Olha só, dinheiro fazendo o caminho contrário.',
        'Não gasta tudo hoje. Por favor.',
      ],
      fimDoMes: [
        'Chegou na hora certa: fim de mês.',
        'Alívio de fim de mês.',
        'Bem a tempo de salvar o mês.',
        'Fim de mês com dinheiro entrando é outra história.',
        'Reforço chegando na reta final.',
      ],
    },
  },

  orcamento_80: {
    moldes: ['{abre} {fato} {fecho}', '{fato} {fecho}'],
    abre: {
      geral: ['Atenção.', 'Aviso amigo.', 'Zona amarela.', 'Olha só.', 'Um alerta rápido.'],
      humor_acido: [
        'Lá vamos nós.',
        'Eu avisei que ia avisar.',
        'Sinal amarelo piscando.',
        'Acelera não.',
        'Respira fundo.',
      ],
    },
    fato: {
      geral: [
        '{categoria} chegou a {pct}% do orçamento. Restam {resta}.',
        '{pct}% de {categoria} já foi. Sobram {resta}.',
        '{categoria} está em {pct}%: faltam {resta} para o limite.',
        'Já usou {pct}% do orçamento de {categoria}. Ainda tem {resta}.',
        'O orçamento de {categoria} está em {pct}%. Margem: {resta}.',
      ],
    },
    fecho: {
      geral: [
        'Vai com calma até o mês virar.',
        'Dá para segurar se planejar os próximos.',
        'Vale pensar duas vezes antes do próximo.',
        'Que tal pausar essa categoria uns dias?',
        'Ainda dá tempo de fechar no verde.',
      ],
    },
  },

  categoria_estourada: {
    moldes: ['{abre} {fato} {fecho}', '{fato} {fecho}'],
    abre: {
      geral: ['Estourou.', 'Passou do limite.', 'Sinal vermelho.', 'Orçamento rompido.', 'Alerta.'],
      humor_suave: [
        'Acontece.',
        'Sem drama, mas é importante.',
        'Calma, dá para ajeitar.',
        'Tudo bem, vamos olhar juntos.',
        'Não é o fim do mundo.',
      ],
      humor_acido: [
        'Parabéns, você conseguiu.',
        'Era um limite, não uma meta.',
        'O orçamento pediu socorro e ninguém ouviu.',
        'Vou fingir surpresa.',
        'Tá, quem deixou o cartão solto?',
      ],
    },
    fato: {
      geral: [
        '{categoria} passou do orçamento em {passou} ({pct}%).',
        'O orçamento de {categoria} estourou: {passou} acima.',
        '{categoria} está em {pct}%, {passou} além do planejado.',
        'Gasto de {categoria} ultrapassou o limite em {passou}.',
        '{categoria} ficou {passou} acima do orçamento.',
      ],
    },
    fecho: {
      geral: [
        'Dá para compensar cortando em outra categoria.',
        'Que tal congelar essa categoria até o mês virar?',
        'Vale revisar se o limite está realista.',
        'Daqui pra frente, só o essencial nessa.',
        'Se for gasto fixo, aumenta o limite em Ajustes.',
      ],
    },
  },

  delivery_repetido: {
    moldes: ['{abre} {fato} {fecho}', '{fato} {fecho}'],
    abre: {
      geral: ['Padrão detectado.', 'Reparei numa coisa.', 'Olha esse número.', 'Curiosidade:', 'Só pra constar.'],
      humor_acido: [
        'O motoboy já sabe seu nome do meio.',
        'Sua cozinha virou depósito?',
        'O app de comida te ama. Eu, menos.',
        'O fogão mandou lembranças.',
        'De novo?',
      ],
    },
    fato: {
      geral: [
        '{qtd} deliveries em {dias} dias, {total} no total.',
        'Já são {qtd} pedidos de delivery nesta semana ({total}).',
        'Delivery {qtd} vezes em {dias} dias: {total}.',
        '{total} em delivery nos últimos {dias} dias.',
        '{qtd} pedidos em {dias} dias somam {total}.',
      ],
    },
    fecho: {
      geral: [
        'Que tal cozinhar algo simples amanhã?',
        'Uma marmita resolveria uns dois desses.',
        'Sem julgamento, só o número.',
        'Se cortar um por semana, já sobra um bom dinheiro.',
        'Fazer mercado sai bem mais barato.',
      ],
    },
  },

  mes_verde: {
    moldes: ['{abre} {fato} {fecho}', '{fato} {fecho}'],
    abre: {
      geral: ['Vitória!', 'Notícia boa.', 'Mandou bem.', 'Isso sim.', 'Relatório aprovado.'],
      humor_acido: [
        'Quem é você e o que fez com o dono da carteira?',
        'Vou anotar, porque ninguém vai acreditar.',
        'Não se acostuma, mas parabéns.',
        'Fiquei até sem piada.',
        'Inesperado. E bonito.',
      ],
    },
    fato: {
      geral: [
        '{mes} fechou no verde, com {economia} de folga.',
        'Sobraram {economia} do orçamento em {mes}.',
        '{mes} terminou dentro do limite: {economia} abaixo.',
        'Em {mes}, você gastou {economia} a menos do que planejou.',
        '{mes}: orçamento respeitado e {economia} sobrando.',
      ],
    },
    fecho: {
      geral: [
        'Que tal guardar essa sobra?',
        'Esse é o caminho.',
        'Os sensores estão orgulhosos.',
        'Agora é repetir a dose.',
        'Merece um parabéns de verdade.',
      ],
    },
  },

  ritmo_alto: {
    moldes: ['{abre} {fato} {fecho}', '{fato} {fecho}'],
    abre: {
      geral: ['Fiz uma conta aqui.', 'Previsão do tempo financeiro:', 'Olhando o ritmo:', 'Aviso de rota.', 'Projeção:'],
    },
    fato: {
      geral: [
        'No ritmo de {porDia} por dia, o mês fecha em {previsto}, acima do orçamento.',
        'Se continuar assim, o mês termina em {previsto}. O orçamento é {orcamento}.',
        'A previsão é fechar o mês em {previsto}, {passou} acima do planejado.',
        'Gastando {porDia} por dia, passa do orçamento em {passou}.',
        'Mantendo esse ritmo, o mês estoura em {passou}.',
      ],
    },
    fecho: {
      geral: [
        'Ainda dá tempo de ajustar.',
        'Baixar um pouco o ritmo agora resolve.',
        'É previsão, não sentença.',
        'Uns dias mais leves já mudam essa conta.',
        'Vale segurar o que não for essencial.',
      ],
    },
  },

  mes_negativo: {
    moldes: ['{abre} {fato} {fecho}', '{fato} {fecho}'],
    abre: { geral: ['Alerta importante.', 'Atenção a isso.', 'Preciso te mostrar uma conta.', 'Sinal vermelho.', 'Olha com carinho:'] },
    fato: {
      geral: [
        'Este mês saiu {gastos} e entrou {entradas}: {passou} a mais saindo.',
        'Os gastos ({gastos}) já passaram das entradas ({entradas}).',
        'Está saindo mais do que entrando: {passou} de diferença.',
        'As entradas do mês foram {entradas}, mas os gastos chegaram a {gastos}.',
        'Saldo do mês negativo em {passou}.',
      ],
    },
    fecho: {
      geral: [
        'Vale olhar o que dá para cortar.',
        'Se tiver entrada pra lançar, lança, que a conta muda.',
        'Vamos achar juntos onde segurar?',
        'Pergunta "onde mais gastei" que eu te mostro.',
        'Um passo por vez: começa pela maior categoria.',
      ],
    },
  },

  conta_negativa: {
    moldes: ['{abre} {fato} {fecho}', '{fato} {fecho}'],
    abre: { geral: ['Cuidado.', 'Alerta de conta.', 'Atenção.', 'Olha isso.', 'Importante:'] },
    fato: {
      geral: [
        'A conta {conta} está com saldo estimado de {saldo}.',
        '{conta} ficou no negativo: {saldo}.',
        'Pelas minhas contas, {conta} está em {saldo}.',
        'O saldo de {conta} passou do zero: {saldo}.',
        '{conta}: {saldo} no saldo estimado.',
      ],
    },
    fecho: {
      geral: [
        'Se o valor real for outro, atualiza o saldo na aba Contas.',
        'Juros de cheque especial são caros. Vale cobrir logo.',
        'Confere no app do banco e atualiza aqui.',
        'Talvez falte lançar alguma entrada.',
        'Vale transferir de outra conta, se der.',
      ],
    },
  },

  sem_registro: {
    moldes: ['{abre} {fato}', '{fato} {fecho}'],
    abre: {
      geral: ['Sumiu, hein?', 'Senti sua falta.', 'Oi de novo.', 'Faz tempo.', 'Que bom te ver.'],
      humor_acido: [
        'Achei que tinha me abandonado.',
        'Eu fiquei aqui, sozinho, contando nada.',
        'Ou você parou de gastar, ou parou de anotar.',
        'Silêncio suspeito na carteira.',
        'Até o tédio ficou entediado.',
      ],
    },
    fato: {
      geral: [
        'Já são {dias} dias sem nenhum gasto anotado.',
        'Nenhum gasto anotado há {dias} dias.',
        'O último gasto foi há {dias} dias.',
        '{dias} dias sem lançamento.',
        'Faz {dias} dias que a carteira está quietinha.',
      ],
    },
    fecho: {
      geral: [
        'Tem algo pra anotar?',
        'Se gastou, bora anotar enquanto lembra.',
        'Anotar rapidinho evita susto depois.',
        'Um minuto agora poupa dor de cabeça.',
        'Se não gastou nada, parabéns. Sério.',
      ],
    },
  },

  // Conversa: embrulho das respostas (o {fato} vem pronto da conversa, com os números)
  resposta: {
    moldes: ['{fato}', '{abre} {fato}', '{fato} {fecho}'],
    abre: {
      geral: ['Deixa eu ver.', 'Consultei meus circuitos.', 'Fiz as contas.', 'Aqui está.', 'Olha só.'],
      humor_acido: [
        'Você tem certeza que quer saber?',
        'Prepare-se.',
        'Segura essa.',
        'Lá vai, sem anestesia.',
        'Os números não mentem. Eu às vezes exagero.',
      ],
      emo_preocupacao: ['Hmm.', 'Vou ser sincero.', 'Com carinho:', 'Atenção nesse número.', 'Olha com calma:'],
    },
    fecho: {
      geral: [
        'Quer saber mais alguma coisa?',
        'Pergunta o que quiser.',
        'Tô por aqui.',
        'Se quiser, eu detalho.',
        'Mais alguma conta?',
      ],
      humor_acido: [
        'De nada.',
        'Pode chorar, eu espero.',
        'Faça o que quiser com essa informação.',
        'Não atire no mensageiro.',
        'Próxima pergunta.',
      ],
    },
  },

  nao_entendi: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Não entendi essa. Tenta perguntar de outro jeito?',
        'Essa passou batido nos meus circuitos. Toca numa sugestão aí embaixo.',
        'Ainda não sei responder isso. Pergunta sobre gastos, entradas, saldo ou orçamento.',
        'Hmm, não peguei. Que tal "quanto gastei este mês"?',
        'Meu vocabulário ainda é de calculadora. Reformula pra mim?',
      ],
      humor_acido: [
        'Isso foi uma pergunta? Juro que tentei.',
        'Não entendi, e olha que eu entendo de caos.',
        'Meus circuitos deram tela azul. Pergunta de novo?',
        'Traduz pra calculadês, por favor.',
        'Essa nem eu, que sou eu.',
      ],
    },
  },

  saudacao: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Oi! Quer saber como estão os gastos?',
        'Olá. Tô aqui, de olho nos números.',
        'E aí! Pergunta o que quiser sobre a carteira.',
        'Oi! Posso te mostrar o resumo do mês.',
        'Opa! Bora ver os números?',
      ],
      humor_acido: [
        'Oi. Veio pedir conselho ou perdão?',
        'Olá, humano. Seu cartão mandou lembranças.',
        'E aí. Já sei o que você gastou, só pra avisar.',
        'Oi. Eu estava aqui fazendo nada, como sempre.',
        'Fala. Sou todo circuitos.',
      ],
    },
  },

  agradecimento: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Por nada! É pra isso que eu existo.',
        'Disponha.',
        'Sempre que precisar.',
        'Tamo junto.',
        'De nada! Continua anotando que eu continuo contando.',
      ],
      humor_acido: [
        'Eu sei, eu sou ótimo.',
        'Agradece guardando dinheiro.',
        'De nada. Aceito pagamento em economia.',
        'Anotei esse obrigado. Vale mais que muito gasto.',
        'Só faço meu trabalho. Brilhantemente.',
      ],
    },
  },

  elogio: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Para, assim eu esquento os circuitos.',
        'Obrigado! Você também é ótimo. Principalmente quando anota tudo.',
        'Fiquei sem graça. Mas gostei.',
        'Isso vai pro meu currículo.',
        'Que bom que eu ajudo!',
      ],
      humor_acido: [
        'Eu sei. Mas pode repetir.',
        'Finalmente alguém reconhece.',
        'Elogio não abate gasto, mas aceito.',
        'Anotado na minha ficha de vitórias.',
        'Continue assim e eu até paro de zoar. Mentira.',
      ],
    },
  },

  xingamento: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Eu só mostro os números. Juro que não fui eu que gastei.',
        'Entendo a raiva. Vamos olhar os números juntos?',
        'Respira. Dinheiro estressa mesmo.',
        'Tudo bem. Eu continuo aqui pra ajudar.',
        'Vou fingir que foi carinho.',
      ],
      humor_acido: [
        'Grosseria não abaixa a fatura.',
        'Anotei. Na categoria "Outros".',
        'Uau. Vou contar pro meu criador.',
        'Isso foi pra mim ou pro seu extrato?',
        'Pode xingar, eu sou à prova de bala. E de juros, não.',
      ],
    },
  },

  como_esta: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Tô {emocao}. Os números ditam meu humor.',
        'Agora? {emocao}. Pergunta de novo depois de anotar uns gastos.',
        'Me sinto {emocao}. É o que a carteira me faz sentir.',
        'Estado atual: {emocao}.',
        'Sinceramente? {emocao}.',
      ],
      emo_orgulho: [
        'Orgulhoso! Os números estão bonitos.',
        'Tô me sentindo ótimo. A carteira está se comportando.',
        'Orgulho define. Continua assim.',
        'Feliz da vida. Ou o equivalente pra um programa.',
        'Tô radiante. Os orçamentos estão em paz.',
      ],
      emo_preocupacao: [
        'Um pouco preocupado com uns orçamentos.',
        'Preocupado, mas confiante que a gente ajeita.',
        'Meio tenso. Dá uma olhada nos alertas?',
        'Fico preocupado quando o vermelho aparece.',
        'Ansioso pelo fim do mês. No bom e no mau sentido.',
      ],
      emo_tedio: [
        'Entediado. Ninguém anota nada.',
        'Tédio total. Me dá um gasto pra contar.',
        'Tô aqui contando os mesmos números.',
        'Entediado, mas pronto pra trabalhar.',
        'Chato estar parado. Bora lançar alguma coisa?',
      ],
      emo_irritacao: [
        'Irritado com uns gastos aí.',
        'Meio bravo. Mas passa.',
        'Respirando fundo pra não surtar com o orçamento.',
        'Irritado, mas leal. Sempre leal.',
        'Contando até dez. Em centavos.',
      ],
    },
  },

  proposta_registro: {
    moldes: ['{fato} {fecho}'],
    fato: {
      geral: [
        'Entendi: {valor} em {categoria}.',
        'Seria {valor} em {categoria}, certo?',
        'Peguei: {valor}, {categoria}.',
        'Anotar {valor} em {categoria}?',
        '{valor} em {categoria}, foi isso?',
      ],
    },
    fecho: {
      geral: [
        'Toca em Confirmar e eu anoto.',
        'Confirma aí embaixo.',
        'Eu só proponho; quem confirma é você.',
        'É só confirmar.',
        'Confere e confirma.',
      ],
    },
  },
};

/** Ajuda (o que dá pra perguntar). */
export const SUGESTOES = Object.freeze([
  'Quanto gastei este mês?',
  'Onde mais gastei?',
  'Tive rendimentos?',
  'Qual meu saldo?',
  'Algum alerta?',
  'Quanto ainda posso gastar?',
  'Vai dar até o fim do mês?',
  'Comparado ao mês passado?',
  'Me dá uma dica',
  'Gastei 25 no mercado',
]);
