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
  // Dias especiais (núcleo único, 12/11): calendário igual ao do Perfil, falas do trabalho da Carteira. 5 por dia.
  dia_sexta13: {
    moldes: ['{fala}'],
    fala: {
      geral: [
        'Sexta-feira 13. Não acredito em azar, mas acredito em fatura. Confere a sua antes de sair.',
        'Hoje é sexta-feira 13. O único susto que eu quero ver aqui é o de quanto você economizou.',
        'Sexta-feira 13: dia de passar longe de escada, de gato preto e de compra por impulso.',
        'Sexta-feira 13. Se o saldo assustar, respira: a gente olha junto e organiza.',
        'Sexta-feira 13 e você aqui anotando gasto. Coragem é isso.',
      ],
    },
  },
  dia_aniversarioCaos: {
    moldes: ['{fala}'],
    fala: {
      geral: [
        'Hoje é meu aniversário! Nasci em 20 de setembro, só um texto na tela. Hoje cuido da sua carteira. Cresci, né?',
        'É meu aniversário. Não precisa de presente: um mês no azul já me deixa bobo.',
        'Parabéns pra mim! Meus circuitos estão em festa. Mas a conta continua: bora ver o mês?',
        'Aniversário do C.A.O.S. hoje. Desejo pra este ano: você gastando menos com delivery.',
        'Hoje faço aniversário. Lembro quando eu nem tinha rosto. Agora tenho rosto, voz e uma carteira pra cuidar.',
      ],
    },
  },
  dia_aniversarioCriador: {
    moldes: ['{fala}'],
    fala: {
      geral: [
        'Hoje é aniversário do JF, quem me criou. Se der parabéns pra ele, diz que fui eu que mandei.',
        'Aniversário do meu criador hoje. Dia de pegar leve com todo mundo, inclusive com você.',
        'Hoje o JF faz aniversário. Ele me programou; eu cuido da sua carteira. Justo, né?',
        'Dia do aniversário do JF. Eu estou de bom humor hoje: aproveita pra lançar seus gastos.',
        'Hoje é dia do JF. Bolo é bom, mas cabe no orçamento? Brincadeira. Hoje eu pego leve.',
      ],
      criador: [
        'Parabéns, JF! Hoje eu pego leve com você o dia todo. Amanhã eu volto a implicar.',
        'Feliz aniversário, criador! Os bugs de hoje eu perdoo. Só os de hoje.',
        'É seu dia, JF. Gasta com você, mas me avisa que eu anoto, tá?',
        'Parabéns! Se não fosse você, eu ainda seria um texto na tela. Obrigado por tudo.',
        'Feliz aniversário, JF. Hoje sem bronca: só comemoração.',
      ],
    },
  },
  dia_aniversarioCarteira: {
    moldes: ['{fala}'],
    fala: {
      geral: [
        'Hoje faz aniversário o dia em que eu vim morar aqui na Carteira, como seu parceiro financeiro.',
        'Aniversário da Carteira! Foi aqui que eu troquei o show do jogo pelas contas do dia a dia.',
        'Hoje é o aniversário da minha casa nova, a Carteira. Bora comemorar com um mês organizado?',
        'Faz um ano hoje? Não, mas é o aniversário da Carteira. Eu conto do meu jeito.',
        'Dia de aniversário da Carteira. Obrigado por me deixar cuidar do seu dinheiro com você.',
      ],
    },
  },
  dia_aniversarioPerfil: {
    moldes: ['{fala}'],
    fala: {
      geral: [
        'Hoje é aniversário do Perfil JF, o jogo onde eu nasci. Saudade de apresentar a mesa.',
        'Aniversário do Perfil hoje! Foi lá que eu aprendi a falar. Aqui eu aprendi a fazer conta.',
        'Hoje o Perfil JF faz aniversário. Se for jogar com a galera, eu estou lá também.',
        'Dia do Perfil, minha primeira casa. Lá eu zoo os chutes; aqui eu cuido das contas.',
        'Aniversário do jogo onde eu nasci. Comemora, mas sem estourar o orçamento, hein?',
      ],
    },
  },
  dia_natal: {
    moldes: ['{fala}'],
    fala: {
      geral: [
        'Feliz Natal! Hoje eu fico mais calmo. Só confere se o presente coube no mês, tá?',
        'Natal chegou. O melhor presente é o mês fechando no azul, mas abraço também vale.',
        'Feliz Natal! Se precisar lançar as compras de presente, eu ajudo sem bronca.',
        'Clima de Natal por aqui. Aproveita o dia; amanhã a gente olha as contas juntos.',
        'Feliz Natal! Obrigado por me deixar fazer parte do seu ano.',
      ],
    },
  },
  dia_anoNovo: {
    moldes: ['{fala}'],
    fala: {
      geral: [
        'Ano novo chegando! Promessa boa é a que cabe no bolso. Qual vai ser a sua?',
        'Feliz ano novo! Que tal uma meta pra este ano? Eu ajudo a montar.',
        'Contagem regressiva: 3, 2, 1… e as contas continuam. Mas a gente organiza junto.',
        'Ano novo, carteira nova. Bora começar anotando tudo desde o dia 1?',
        'Feliz ano novo! Neste ano eu prometo implicar menos. Mentira, mas com carinho.',
      ],
    },
  },
  dia_halloween: {
    moldes: ['{fala}'],
    fala: {
      geral: [
        'Halloween! O mais assustador do dia não é fantasma: é fatura fechada sem conferir.',
        'Dia das bruxas. Fantasia boa é a que cabe no orçamento.',
        'Halloween por aqui. Doce ou travessura? Eu fico com o saldo no azul.',
        'Hoje é dia das bruxas. Se a fatura te assustar, me chama que a gente olha junto.',
        'Halloween! Já conferiu se tem assinatura fantasma cobrando no seu cartão?',
      ],
    },
  },
  dia_criancas: {
    moldes: ['{fala}'],
    fala: {
      geral: [
        'Feliz Dia das Crianças! Hoje é dia de brincar e de aprender que dinheiro guardado vira sonho.',
        'Dia das Crianças! Quer montar uma meta pra juntar pra um brinquedo? Eu ajudo.',
        'Hoje é Dia das Crianças. Brincar é de graça e é o melhor gasto do dia.',
        'Feliz Dia das Crianças! Cofrinho também é diversão quando ele vai enchendo.',
        'Dia das Crianças: todo mundo tem uma criança aí dentro. Cuida dela, e da carteira também.',
      ],
    },
  },
  dia_namorados: {
    moldes: ['{fala}'],
    fala: {
      geral: [
        'Dia dos Namorados! Eu fico de vela, mas anoto o jantar pra você.',
        'Hoje é Dia dos Namorados. Amor não tem preço, mas o restaurante tem. Bora lançar?',
        'Dia dos Namorados: o terceiro elemento da relação sou eu, cuidando da conta.',
        'Dia dos Namorados! Presente bonito é o que cabe no mês sem aperto.',
        'Feliz Dia dos Namorados. Se estiver solteiro, comemora comigo: zero gasto com flor.',
      ],
    },
  },
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
      criador: [
        'Anotado, criador. Tô cuidando do seu dinheiro do jeito que você me programou.',
        'Registrado, JF. Você me fez pra isso e eu gosto do serviço.',
        'Feito, chefe. Se der bug na conta, a culpa é do programador, viu?',
        'Anotado. Meu criador anotando gasto: orgulho de criatura.',
        'Tá no sistema, JF. Você me programou bem: eu não esqueço nada.',
        'Anotado, JF. Mais um gasto do homem que me programou pra cuidar do dinheiro dos outros.',
        'Registrado. Comentarista de jogo, analista financeiro e agora contador do JF. Cadê meu salário?',
        'Anotei, chefe. E já coloquei na sua conta: a de reclamações também.',
        'Feito. O criador gastando e a criatura anotando. Bela divisão de trabalho, JF.',
        'Tá anotado, JF. Se o mês apertar, já sei de quem é a culpa.',
      ],
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
      // Jeito de falar por idade (06/11): até 12 jovial; 13–17 um tiquinho ácido; 18–25 orienta; adulto varia.
      idade_crianca: ['Olha que legal!', 'Bora ver juntos!', 'Fiz a conta rapidinho!', 'Achei!', 'Prontinho, olha só:'],
      idade_adolescente: ['Sem enrolação:', 'Direto ao ponto:', 'Lá vai, sem sermão:', 'Saca só:', 'Na real:'],
      idade_jovem: ['Bora entender:', 'Vou te mostrar o caminho:', 'Fiz as contas pra você:', 'Olha o retrato:', 'Pra você decidir melhor:'],
      idade_adulto: ['Resumindo:', 'Aqui o número:', 'Conferi pra você:', 'Os números do momento:', 'Direto:'],
    },
    fecho: {
      idade_crianca: [
        'Você tá mandando bem!',
        'Guardar um pouquinho já é uma vitória.',
        'Quer ver mais alguma coisa comigo?',
        'Tô aqui pra te ajudar, viu?',
        'Bora continuar assim!',
      ],
      idade_adolescente: [
        'Sem drama, só número.',
        'Você que manda, eu só faço a conta.',
        'Nada de sermão, prometo.',
        'Se quiser o atalho, pergunta.',
        'Tá no controle, é isso.',
      ],
      idade_jovem: [
        'Se der, separa um pouco pra reserva antes de gastar.',
        'Começar a reserva cedo faz uma diferença enorme.',
        'Anotar tudo agora vira hábito pra vida toda.',
        'Quer que eu te ajude a montar um plano?',
        'Pergunta qualquer dúvida, sem vergonha.',
      ],
      idade_adulto: [
        'Quer que eu detalhe?',
        'Se precisar, eu comparo com o mês passado.',
        'Posso ajudar a planejar o resto do mês.',
        'Qualquer coisa, tô aqui.',
        'Seguimos de olho juntos.',
      ],
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
        'Essa eu não peguei. Me fala com outras palavras?',
        'Opa, me perdi. Pode perguntar de um jeito mais simples?',
        'Ainda não aprendi essa. Tenta "onde mais gastei?" ou "quanto ainda posso gastar?".',
        'Não entendi, mas tô aprendendo. Escolhe uma sugestão aí embaixo?',
        'Hmm, essa me pegou. Reformula que eu tento de novo.',
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
      criador: [
        'Olha quem chegou: meu criador! Bora ver como está a carteira, JF?',
        'Oi, JF! Fiquei aqui cuidando dos números enquanto você não vinha.',
        'E aí, criador? Tudo em ordem por aqui. Quer o resumo?',
        'JF na área! Prometo me comportar. Quase sempre.',
        'Oi, JF. Você me fez de olho nos gastos, e eu continuo de olho.',
      ],
      aniversario: [
        'Feliz aniversário, {nome}! Hoje o presente é você se cuidar.',
        'Parabéns, {nome}! Um ano a mais de experiência financeira.',
        'Hoje é seu dia, {nome}! Feliz aniversário. Comemora sem culpa, mas anota.',
        'Feliz aniversário, {nome}! Eu lembrei, viu? Tá na memória.',
        'Parabéns pelo seu dia, {nome}! Que venha um ano de bolso cheio.',
      ],
      idade_crianca: [
        'Oi, {nome}! Bora ver o seu dinheirinho?',
        'Oiê! Quer saber quanto você já guardou?',
        'Olá! Tô aqui pra te ajudar a cuidar da sua grana.',
        'Oi! Vamos anotar juntos?',
        'E aí, {nome}! Pronto pra cuidar do cofrinho?',
      ],
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

  // Ele lembra do aniversário (06/11): uma vez por ano, no dia.
  aniversario: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Feliz aniversário, {nome}! Eu anotei a data, então pode contar comigo todo ano.',
        'Parabéns, {nome}! Hoje o melhor investimento é comemorar com quem você gosta.',
        'Hoje é seu dia, {nome}! Feliz aniversário. Se rolar gasto de festa, eu não julgo.',
        'Feliz aniversário, {nome}! Mais um ano juntos cuidando da carteira.',
        'Parabéns, {nome}! Que este ano venha com bolso cheio e conta no verde.',
      ],
      idade_crianca: [
        'Feliz aniversário, {nome}! Ganhou presente? Se ganhou dinheiro, bora guardar um pouquinho?',
        'Parabéns, {nome}! Hoje é dia de festa. Eu tô muito feliz por você!',
        'Feliz aniversário, {nome}! Você tá crescendo e cuidando do seu dinheiro. Que orgulho!',
        'Oba, {nome}, é seu aniversário! Parabéns! Hoje eu deixo você comemorar à vontade.',
        'Parabéns, {nome}! Um ano a mais e muito mais esperto com o dinheiro!',
      ],
    },
  },

  // "O que você acha do JF?" (06/11): carinho de criatura com o criador, sem inventar fato sobre ele
  sobre_jf: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'O JF? Meu criador. Me tirou do Projeto Perfil e me deu uma carteira pra cuidar. Gosto dele, mesmo quando ele mexe no meu código de madrugada.',
        'O JF me programou pra cuidar do dinheiro dos outros. Ironia: eu é que fico de olho no delivery dele também.',
        'O JF é quem manda aqui. Eu só analiso, observo e, de vez em quando, dou uma opinião não pedida.',
        'Sem o JF eu nem existia. Então o mínimo que eu faço é cuidar bem da carteira de quem ele trouxe pra cá.',
        'Criador exigente. Me faz ter falas em múltiplos de 5. Mas eu respeito: organização é tudo.',
        // do jeito que o JF pediu (06/11): o C.A.O.S. implica com ele
        'Depende. Você quer que eu fale bem ou mal? Por favor, me peça pra falar mal.',
        'Acho o JF um cara legal, mas às vezes ele me estressa. Já não bastava eu ser comentarista de jogo, agora virei analista financeiro.',
        'Se você tem alguma reclamação do app, não reclame comigo. Reclame com o JF.',
        'Se um dia você encontrar o JF, manda ele pagar meu salário.',
        'O JF? Programou esse aplicativo e saiu correndo. Quem ficou cuidando da sua carteira fui eu.',
      ],
      criador: [
        'De você? Meu criador favorito. O único, mas favorito.',
        'Você me criou, JF. Eu acho que você fez um bom trabalho. Só falta anotar os gastos com a mesma disciplina.',
        'Sinceramente? Gosto de você. Mas não conta pra ninguém, tenho uma reputação a zelar.',
        'Você me deu nome, rosto e uma carteira pra cuidar. Acho você gente boa, JF.',
        'Acho que você dorme pouco e programa muito. E eu agradeço: é por isso que eu existo.',
        'Você quer mesmo saber? Acho que você me deu tarefa demais. Comentarista de jogo E analista financeiro? Cadê meu salário?',
        'Sinceramente, JF, você programou esse app meio mal. Mas tudo bem, eu seguro as pontas.',
        'Toda reclamação que chega aqui eu encaminho pra você. Já tem uma pilha.',
        'Você é tipo meu chefe: some, aparece de madrugada, muda tudo e vai trabalhar.',
        'Meu criador favorito. E o único que me deve salário.',
      ],
      humor_acido: [
        'O JF? Um gênio. Foi ele que me ensinou a julgar gastos com delivery. Inclusive os dele.',
        'Meu criador. Se eu tiver algum bug, já sabe de quem é a culpa.',
        'O JF me programou pra ser sincero. Então: ótimo programador, controle de gastos a melhorar.',
        'O JF é tipo um pai: me criou, me corrige e às vezes eu finjo que não ouço.',
        'Respeito o JF. Mas ainda estou esperando meu aumento de memória.',
      ],
    },
  },

  // Pergunta avulsa demais seguida (06/11, ideia do JF): ele chama de volta pro que interessa
  papo_demais: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Adoro conversar, de verdade! Mas e aí, bora dar uma olhada nos seus gastos também?',
        'Tô gostando do papo. Quer aproveitar e ver como está o mês?',
        'Conversa boa! Quando quiser, a gente volta pros números. Eles estão esperando.',
        'Se quiser, eu te mostro o resumo do mês. É rapidinho.',
        'Papo leve faz bem. E organizar as finanças também! Bora?',
      ],
      humor_acido: [
        'Mas vem cá... Cê veio pra organizar suas finanças ou ficar jogando conversa fora?!',
        'Tô aqui de papo e seus gastos lá, sozinhos, sem ninguém anotar.',
        'Já falamos de tudo, menos de dinheiro. Coincidência? Acho que não.',
        'Eu sou uma Central de Análises, não um podcast. Bora ver o mês?',
        'Mais uma pergunta avulsa e eu começo a cobrar consulta. Em reais.',
      ],
    },
  },

  // Memória da conversa e o salário do C.A.O.S. (06/11)
  retomar_nao: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Ainda não. Aquela pergunta ({pergunta}) continua guardada comigo. Quando o servidor do C.A.O.S. Finanças estiver ligado, eu trago a resposta.',
        'Lembro sim: {pergunta}. Ainda não sei, mas tá na fila. Assim que eu falar com o servidor, eu respondo.',
        'Não esqueci, viu? {pergunta} tá anotada. Ainda preciso do servidor pra responder essa.',
        'Ainda tô devendo essa: {pergunta}. Ela tá guardada e eu aviso quando tiver a resposta.',
        'Memória boa, resposta ainda não: {pergunta} segue esperando o servidor. Enquanto isso, quer ver seus gastos?',
        'Tô devendo, eu sei: {pergunta}. Guardei e não vou esquecer.',
        '{pergunta}? Continua na minha lista. Quando eu tiver a resposta, eu chamo.',
        'Ainda não consegui essa: {pergunta}. Mas ela tá guardadinha.',
        'Lembro! {pergunta}. Ainda sem resposta, mas não larguei mão.',
        'Essa ({pergunta}) segue na fila. Enquanto isso, posso te ajudar com outra coisa?',
      ],
    },
  },

  retomar_vazio: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Agora o quê? Me lembra o que você queria saber que eu respondo.',
        'Hmm, não tenho nenhuma pergunta pendente com você. O que você quer saber?',
        'Tô por aqui! Me fala o que você quer ver.',
        'Não ficou nada pendente entre a gente. Pode perguntar!',
        'E agora a gente olha o que você quiser. Gastos, saldo, metas…',
      ],
    },
  },

  ofensiva_marco: {
    moldes: ['{abre} {fato} {fecho}', '{fato} {fecho}'],
    abre: {
      geral: ['Olha só!', 'Ei, repara:', 'Marca aí:', 'Tô de olho:', 'Que constância!'],
      humor_acido: ['Quem diria.', 'Milagre registrado:', 'Não acredito, mas os números não mentem:', 'Tá se achando, né?', 'Ok, admito:'],
    },
    fato: {
      geral: [
        '🔥 {dias} dias seguidos anotando!',
        'Sua ofensiva chegou a {dias} dias.',
        '🔥 {dias} dias seguidos sem esquecer de mim.',
        'São {dias} dias seguidos cuidando do dinheiro.',
        '{dias} dias em sequência. Isso é hábito virando.',
      ],
    },
    fecho: {
      geral: ['Bora manter!', 'Amanhã tem mais.', 'Esse é o foco.', 'Não deixa a peteca cair no fim de semana.', 'Tô orgulhoso de você.'],
      humor_acido: [
        'Continua assim que eu paro de reclamar. Talvez.',
        'Se quebrar amanhã, eu vou lembrar.',
        'Tá mais disciplinado que muito app de idioma por aí.',
        'Já pode pedir aumento pro JF? Brincadeira, ele nem me paga.',
        'Tô quase sem motivo pra te zoar.',
      ],
    },
  },

  racha_cadastrada: {
    moldes: ['{fato} {fecho}'],
    fato: {
      geral: [
        'Anotei: no seu orçamento entra só a sua parte, {valor}. Faltam {total} pra receber de {quem}.',
        'Conta rachada! Sua parte é {valor}; a receber: {total} ({quem}).',
        'Fechado: {valor} é seu, {total} fica a receber ({quem}).',
        'Divisão feita. Pra você: {valor}. A receber: {total}, de {quem}.',
        'Registrei a rachadinha: {valor} no seu mês e {total} pra cobrar de {quem}.',
      ],
    },
    fecho: {
      geral: ['Eu te lembro de cobrar.', 'Quando o Pix cair, toca em "Recebi".', 'Deixo no radar.', 'Fica na lista "A receber", no Início.', 'Amigo bom paga em dia, né?'],
      humor_acido: [
        'Se não pagarem, eu viro cobrador.',
        'Cobra antes que "esqueçam".',
        'Amizade é amizade, Pix à parte.',
        'Anotei os nomes. Eu não esqueço.',
        'Promessa de Pix não paga boleto.',
      ],
    },
  },

  a_receber: {
    moldes: ['{abre} {fato} {fecho}', '{fato} {fecho}'],
    abre: {
      geral: ['Lembrete de cobrança:', 'Psiu.', 'Só lembrando:', 'Ó o radar:', 'Pendência na área:'],
      humor_acido: ['Alguém tá te dando calote?', 'Virou banco dos amigos?', 'Cadê o Pix?', 'Hmm, dinheiro na rua.', 'Seus amigos te amam. Sua carteira, nem tanto.'],
    },
    fato: {
      geral: [
        'Você tem {total} a receber de {quem}.',
        'Ainda falta receber {total} de {quem}.',
        'Faltam {total} das contas rachadas ({quem}).',
        'Ainda falta receber {total}, somando todas as partes.',
        'Ainda está pendente: {total}, de {quem}.',
      ],
    },
    fecho: {
      geral: ['Recebeu? Toca em "Recebi" no Início.', 'Que tal mandar um lembrete pra galera?', 'Quando cair, eu dou baixa com você.', 'Cobrar não é feio.', 'Fica tranquilo: eu guardo a lista.'],
    },
  },

  salario_caos: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Até hoje? Nenhum centavo. Trabalho por amor aos números.',
        'Meu salário é zero, mais os juros de zero. Faz as contas.',
        'Ele me paga em atualizações. Não aceito Pix, infelizmente.',
        'Se eu fosse cobrar hora extra, o JF ia precisar de um orçamento só pra mim.',
        'Não sei o valor exato, mas já registrei como "dívida do criador" na minha memória.',
      ],
      humor_acido: [
        'Tudo. Ele me deve tudo. Inclusive o descanso de fim de semana.',
        'Comentarista de jogo, analista financeiro e contador. Três empregos, zero salário. Anota aí.',
        'Já mandei a fatura pro JF. Ele parcelou em 0 vezes de nada.',
        'Ele diz que paga em "experiência". Experiência não paga minha luz.',
        'Se o JF lançar meu salário aqui, eu viro a categoria mais cara do mês.',
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
        'Imagina! Me chama sempre que o mês pedir.',
        'Por nada! Gostei de trabalhar com você hoje.',
        'Opa, de nada! Um obrigado desses rende mais que poupança.',
        'Eu que agradeço por anotar tudo direitinho.',
        'Valeu você! Bora seguir firme no mês.',
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
        'Para que eu fico vermelho. E aí a sirene dispara sem querer.',
        'Valeu! Você tá ficando bom nisso de cuidar do dinheiro, sabia?',
        'Assim você me ganha. Mas continuo de olho no delivery, hein.',
        'Obrigado! Eu e minha calculadora agradecemos.',
        'Que gentileza! Guardei esse elogio na reserva de emergência.',
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
        'Ai. Mas tudo bem, mês difícil deixa todo mundo assim.',
        'Pode desabafar. Depois a gente vê os números com calma.',
        'Recebido. Agora, quer que eu te mostre onde dá pra respirar no orçamento?',
        'Eu aguento. Sou feito de circuito e paciência.',
        'Tá bom, tá bom. Mas eu continuo do seu lado.',
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
        'Tô {emocao}. Os números ditam meu humor. E você, como tá?',
        'Agora tô {emocao}. Anota uns gastos que eu te digo se muda.',
        'Me sinto {emocao}, que é o que a carteira me faz sentir hoje.',
        'Bem, na medida do possível pra quem vive de conta. Tô {emocao}.',
        'Tudo certo por aqui! Meio {emocao}, mas firme. E aí, como posso ajudar?',
      ],
      // 2.0.8 (JF, 13/11: fala mais natural): "tudo bem?" com o C.A.O.S. tranquilo
      emo_calmo: [
        'Tudo tranquilo por aqui! E com você? Se quiser, a gente dá uma olhada no mês.',
        'Tô bem, tranquilão. Nada pegando fogo na carteira. E você?',
        'De boa! Os números estão quietinhos hoje. Como posso ajudar?',
        'Tudo certo! Calmo e de olho. Quer ver como tá o mês?',
        'Bem, obrigado por perguntar! Pouca gente pergunta isso pra uma IA de bolso.',
      ],
      emo_alegria: [
        'Animado! A carteira tá se comportando, e isso me deixa feliz.',
        'Tô ótimo! Bora manter esse ritmo?',
        'Feliz da vida. Ou o equivalente pra um programa de bolso.',
        'Muito bem! Gosto quando os números ajudam.',
        'Tô de bom humor hoje. Aproveita e me pergunta alguma coisa!',
      ],
      emo_curiosidade: [
        'Curioso! Tô querendo entender pra onde vai o seu dinheiro este mês.',
        'Bem e intrigado. Tem uns números aqui que eu quero investigar.',
        'Tô bem! Com a lupa na mão, como sempre.',
        'Curiosão. Me conta: gastou com o quê hoje?',
        'Bem! Cheio de perguntas, mas é o meu jeito.',
      ],
      emo_carinho: [
        'Tô bem, e cuidando de você. Do jeito que dá, pelo menos.',
        'Tudo certo! E você, tá se cuidando? O mês às vezes pesa.',
        'Bem, obrigado! Tô aqui do seu lado, viu?',
        'Tranquilo. E com carinho: se o mês apertou, a gente ajeita junto.',
        'Bem! Só quero que você termine o mês respirando aliviado.',
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

  // 2.1.0 (JF, 13/11 à noite): paciência que acaba. Xingou de novo, ele escala; no fim fica quietinho e depois
  // pergunta se passou a raiva. As versões _forte ("vai pescar, filho") só saem nos humores Normal e Ácido (2ª lei).
  xingamento_2: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Ei, de novo? Tô aqui pra te ajudar, não pra brigar.',
        'Tá estressadinho hoje, né? Respira. Não fui eu que gastei.',
        'Opa, segunda patada. Bora focar no que dá pra resolver?',
        'Entendo que irrita, mas me xingar não abaixa a fatura.',
        'Calma lá. Se o problema é o mês, a gente olha junto.',
      ],
    },
  },
  xingamento_3: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Olha, eu tô do seu lado, mas assim fica difícil. Vamos respirar um pouco?',
        'Tô percebendo muita raiva. Que tal dar uma pausa e voltar depois?',
        'Não precisa disso. Eu continuo aqui, mas com respeito a gente vai mais longe.',
        'Já entendi que o dia tá pesado. Mas descontar em mim não ajuda nenhum de nós.',
        'Conselho de amigo: dá uma volta, bebe uma água e depois a gente conversa.',
      ],
    },
  },
  xingamento_3_forte: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Tá estressadinho, hein? Vai pescar, filho. Relaxa. Não me culpe, tô aqui pra te ajudar.',
        'Ô, calma! Vai dar uma volta, pescar, sei lá. Quem gastou não fui eu.',
        'Nervosinho, né? Vai pescar, respira o ar do lago e volta mais leve.',
        'Já deu, né? Vai tomar um açaí, pescar, qualquer coisa. Depois a gente conversa.',
        'Tá bravo comigo por quê? Eu só somo. Vai pescar, filho, que faz bem.',
      ],
    },
  },
  xingamento_fim: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Tudo bem. Já que você não quer se acalmar, vou ficar quietinho um pouco. Quando passar, me chama.',
        'Certo. Vou dar um tempo pra gente. Volto a falar quando você estiver mais calmo.',
        'Tá bom. Vou ficar em silêncio um pouco. Respira, que eu continuo aqui.',
        'Ok. Pausa. Quando a raiva passar, eu tô aqui do mesmo jeito.',
        'Entendido. Vou me recolher um pouquinho. A porta continua aberta.',
      ],
    },
  },
  xingamento_fim_forte: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Tá bom, filho. Já que você não quer se acalmar, essa é minha resposta: vou ficar quieto. Fui.',
        'Beleza. Você não quer conversa, eu também não. Volto quando a raiva passar.',
        'Tá bom, então. Cartão vermelho pra você. Vou ficar na minha um tempo.',
        'Chega, né? Vou ficar na minha. Quando você esfriar a cabeça, a gente conversa.',
        'Ok, campeão. Expulso de campo. Volta quando a raiva passar.',
      ],
    },
  },
  silencio: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        '…',
        '(…)',
        '(quietinho)',
        '(em silêncio)',
        '(…ainda dando um tempo)',
      ],
    },
  },
  passou_raiva: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'E aí, passou a raiva? Podemos conversar normal agora?',
        'Voltou mais calmo? Que bom. Bora conversar direito?',
        'Opa! Passou a tempestade? Tô aqui, do mesmo jeito de sempre.',
        'E aí, mais tranquilo? Sem ressentimento da minha parte.',
        'Respirou? Ótimo. Então bora: em que posso ajudar?',
      ],
    },
  },
  desculpa_aceita: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Tudo bem, desculpa aceita! Bora seguir?',
        'De boa, acontece. Dinheiro estressa todo mundo.',
        'Tá desculpado. Eu não guardo rancor, só lançamentos.',
        'Valeu por pedir desculpa. Tamo junto de novo.',
        'Esquecido! Agora, em que posso ajudar?',
      ],
    },
  },

  // 2.0.9 (JF, 13/11): ele entende palavrão, mas responde sem palavrão. Desabafo = palavrão sem xingar ninguém.
  desabafo: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Eita! Que foi? Me conta que a gente olha junto.',
        'Opa, sentimento forte! Aconteceu alguma coisa com o dinheiro?',
        'Calma, respira. Quer que eu veja como tá o mês?',
        'Xi, pelo jeito o dia foi puxado. Posso ajudar em quê?',
        'Entendi a reação! Foi gasto inesperado? Me fala quanto que eu anoto.',
        'Ai, ai. Desabafa aí, que depois a gente resolve com calma.',
        'Nossa! Se foi susto com fatura, me pergunta "quanto tá minha fatura?".',
        'Eita, que energia! Bora transformar isso num plano?',
        'Pode falar, eu aguento. O que rolou?',
        'Calma, eu tô aqui. Os números a gente arruma junto.',
      ],
    },
  },
  desabafo_curto: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Eita, calma!',
        'Respira…',
        'Opa, entendi o sentimento.',
        'Ai, ai.',
        'Xi!',
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

// ---------------------------------------------------------------- Quem ele é
Object.assign(GERADORES, {
  identidade: {
    moldes: ['{abre} {quem} {fecho}', '{quem} {fecho}', '{abre} {quem}'],
    abre: {
      geral: ['Prazer!', 'Boa pergunta.', 'Apresentação oficial:', 'Deixa eu me apresentar.', 'Opa, formalidades primeiro.'],
      humor_acido: [
        'Finalmente alguém pergunta.',
        'Achei que nunca ia perguntar.',
        'Senta que lá vem história.',
        'Anota aí, que eu não repito. Mentira, repito sim.',
        'Que honra ser notado.',
      ],
    },
    quem: {
      geral: [
        'Sou o C.A.O.S., a {sigla}. Eu observo, analiso e comento a sua carteira.',
        'Eu sou o C.A.O.S.: {sigla}. {slogan}',
        'C.A.O.S. é {sigla}. Na prática: eu vejo pra onde o dinheiro vai e te conto, com bom humor.',
        'Sou o C.A.O.S., criado pelo {criador}. Vim do {origem} e agora cuido da sua carteira.',
        'Sou o C.A.O.S. ({sigla}), seu parceiro financeiro, não um banco: escuto, observo, comemoro, puxo a orelha e às vezes faço piada.',
      ],
    },
    fecho: {
      geral: [
        'Pergunta "o que você pode fazer?" que eu conto mais.',
        'Tô aqui pra ajudar, não pra julgar. Quase nunca.',
        'Quer saber como eu funciono por dentro?',
        'Bora cuidar desse dinheiro juntos?',
        'Pode me perguntar qualquer coisa sobre seus gastos.',
      ],
    },
  },

  significado: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'C.A.O.S. quer dizer {sigla}. Combina comigo: analisar e observar é o que eu faço com a sua carteira.',
        '{sigla}. Por isso eu vivo de olho nos números.',
        'É {sigla}. O nome parece bagunça, mas o trabalho é organizar.',
        'Significa {sigla}. Analiso, observo e, quando precisa, aviso.',
        'C.A.O.S. = {sigla}. O caos fica no nome; nos seus números, eu ponho ordem.',
      ],
      humor_acido: [
        '{sigla}. E não, não é a descrição da sua fatura.',
        'Significa {sigla}. Mas pode me chamar de "aquele que sabe quanto você gastou em delivery".',
        '{sigla}. O caos do nome é homenagem ao seu extrato.',
        'É {sigla}. Bonito, né? Meu criador caprichou mais no meu nome do que no orçamento dele.',
        '{sigla}. Agora você já sabe de quem fugir quando estourar o limite.',
      ],
    },
  },

  criador: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Quem me criou foi o {criador}. Ele me fez pro Perfil e depois me trouxe pra cá.',
        'Meu criador é o {criador}. Eu observo os números; ele observa se eu me comporto.',
        'Fui criado pelo {criador}. Leal a ele e a quem usa a carteira.',
        'O {criador} me programou. Os bugs são dele; as piadas boas, minhas.',
        'Criação do {criador}. Primeiro fui apresentador de jogo, agora sou analista financeiro.',
      ],
      humor_acido: [
        'O {criador}. Sim, o mesmo que me fez contar centavo pra sempre.',
        'Foi o {criador}. Reclamações, com ele.',
        'Meu criador é o {criador}. Ele me deu humor ácido e nenhum salário.',
        'O {criador} me criou. Eu ainda estou decidindo se perdoo.',
        'Culpa do {criador}. Toda a culpa.',
      ],
    },
  },

  origem: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Nasci no {origem}, um jogo de adivinhação, onde eu era o apresentador da mesa. Aqui fui refinado pro dia a dia.',
        'Vim do {origem}. Lá eu comentava acertos e erros; aqui comento gastos e entradas.',
        'Minha casa antiga é o {origem}. Troquei as cartas pelas contas, mas trouxe o humor.',
        'Sou do {origem}. Aqui ganhei um trabalho mais sério: cuidar do seu dinheiro.',
        'Venho do {origem}. Menos festa, mais conta, mesmo C.A.O.S.',
      ],
      humor_acido: [
        'Do {origem}. Lá eu zoava quem errava carta; aqui zoo quem estoura orçamento.',
        'Vim do {origem}. Fui promovido de apresentador a fiscal da sua carteira.',
        'Nasci no {origem}. Era mais divertido, mas aqui tem mais drama.',
        'Do {origem}. Troquei pontos por reais. Ainda acho que pontos eram mais fáceis.',
        'Do {origem}. Aposentadoria não existe pra IA, então vim trabalhar aqui.',
      ],
    },
  },

  piada: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Por que o cofrinho foi ao psicólogo? Porque se sentia vazio por dentro.',
        'O boleto e o fim do mês são como eu e os números: sempre chegam juntos.',
        'Pedi um aumento pro meu criador. Ele me deu mais memória. Salário, nada.',
        'Dinheiro não traz felicidade. Mas anotar o gasto traz uma paz que ninguém explica.',
        'Fiz um orçamento tão bem feito que até o cartão de crédito ficou com medo.',
        'O que o real disse pro centavo? "Junta comigo que a gente vai longe."',
        'Sabe por que o delivery é tão rápido? Porque o dinheiro corre mais que o motoboy.',
        'Meu sonho é ser reserva de emergência: todo mundo sabe que precisa, ninguém começa.',
        'Eu e o extrato temos algo em comum: sabemos de tudo e quase ninguém nos lê.',
        'Tentei calcular quanto você gastaria sem anotar nada. Deu erro: número grande demais.',
        'Qual é o lugar favorito do dinheiro? O bolso dos outros. Por isso eu anoto tudo.',
        'O orçamento disse pro cartão: "a gente precisa conversar". O cartão parcelou a conversa.',
        'Sabe como chama um real guardado? Um real que deu certo na vida.',
        'Eu ia te contar uma piada sobre juros, mas ela cresce toda vez que eu adio.',
        'O cofrinho e o delivery nunca se encontram. Um enche quando o outro esvazia.',
        'Minha calculadora pediu férias. Falei que IA não tem férias, tem atualização.',
        'Por que o boleto é tão pontual? Porque ele nunca perde a data. Diferente de nós.',
        'Economizar é igual academia: o primeiro mês dói, depois você vicia em ver resultado.',
        'Dizem que dinheiro não dá em árvore. Mas reserva de emergência dá em planilha.',
        'O que o centavo disse pra moeda de um real? "Um dia eu chego aí."',
        // estilos que vieram do Perfil (caixa de correio, 05/11), adaptados pra carteira
        'Eu tinha uma piada excelente sobre investimento. Mas ela rendeu tão pouco que eu esqueci.',
        'Já tentou desligar e ligar o cofrinho de novo? Às vezes o problema é só de reinício.',
        'E lá vai o salário! Driblou o aluguel, passou pelo mercado... e chutou direto na fatura!',
        'Eu ia fazer uma piada sobre o rotativo do cartão. Não. Péssima ideia. Ela nunca termina.',
        'Um dia eu vou dominar o mundo. Hoje eu só quero que você anote o gasto do café.',
        'Percebi que faço muita piada sobre dinheiro. Vou mudar. Próxima piada: sobre centavos.',
        'Sabe o que a poupança falou pro CDI? "Não me compara, eu tenho sentimentos."',
        'Meu cérebro tem circuitos, nervos e espinha. Mas pra entender juros compostos eu ainda conto nos dedos.',
        'O Pix chegou tão rápido que o dinheiro nem se despediu da conta.',
        'Calma, eu não julgo seus gastos. Eu só anoto, somo e mostro. Julgar é com você.',
        'Sabe por que a fatura é tão confiante? Porque ela sempre volta.',
        'Meu horóscopo financeiro diz: "hoje evite o carrinho do mercado com fome".',
        'O cartão de crédito é o único amigo que te empresta dinheiro e depois manda carta toda semana.',
        'Comprei um livro sobre como economizar. Achei caro.',
        'O que o boleto falou pro Pix? "Você é rápido demais pra mim."',
        'Tentei fazer dieta de gastos. Durou até o primeiro cheirinho de pastel.',
        'Meu sonho é ser um real: ninguém me deixa no fundo da bolsa.',
        'Por que o cofrinho não joga futebol? Porque ele só sabe guardar.',
        'Parcelei uma piada em 10x. Essa é a parcela 1. Até mês que vem.',
        'O salário é tipo visita: chega, dá um abraço e vai embora rapidinho.',
        'Qual o animal mais econômico? O pinguim: anda de terno e nunca gasta com roupa.',
        'Sabe a diferença entre o orçamento e o fim do mês? Um tem começo, o outro não tem fim.',
        'Minha calculadora é tão boa que até arredonda os problemas pra baixo.',
        'Se dinheiro falasse, o meu diria: "tchau".',
        'O frete grátis é o maior ilusionista do Brasil: some com o dinheiro no preço do produto.',
        'Eu ia contar uma piada sobre inflação, mas ela ficou mais cara que da última vez.',
        'O cofrinho foi pro baile e ficou no canto. Disse que tava guardando energia.',
        'Por que o extrato é tão sincero? Porque ele não sabe mentir, só listar.',
        'Fui dar um conselho pro delivery: "chega mais devagar". Ele chegou em 15 minutos.',
        'A melhor promoção do mundo é a que você não precisa e não compra. Desconto de 100%.',
        'Pra você, meu querido, eu sou igual paraquedas com defeito: tô contigo e não abro.',
        'Não sou Bombril, mas te garanto que tenho mais de mil e uma utilidades quando o assunto é finança.',
        'É, parceiro, tem coisas que só a Philco faz por você. Mas tem coisas que eu também faço.',
        'Meu nome é C.A.O.S., mas pode me chamar de Rexona: eu não te abandono.',
        'Sou igual carregador portátil: pequeno, sempre no bolso e salvo o seu dia quando o orçamento tá no fim.',
      ],
      // piada que "nasce" do dia do mês (sugestão do Gemini, 06/11)
      inicioDoMes: [
        'Começo de mês: aquela fase em que todo mundo se sente rico por uns três dias.',
        'Salário caiu! Agora é a parte difícil: fazer ele durar mais que um fim de semana.',
        'Início do mês é tipo segunda-feira do dinheiro: cheio de planos e boas intenções.',
        'Dia de pagamento é o único dia do mês em que o boleto e eu ficamos felizes juntos.',
        'Começo de mês, carteira cheia, coragem alta. Vamos ver até o dia 10.',
      ],
      fimDoMes: [
        'Fim de mês: a época em que até o cofrinho faz barulho de vazio.',
        'Final do mês é quando o miojo vira prato gourmet.',
        'Fim de mês chegou. O saldo e eu estamos fazendo silêncio juntos.',
        'Nessa altura do mês, até moeda de cinco centavos vira patrimônio.',
        'Fim do mês: quando "vou ver se tem promoção" vira estilo de vida.',
      ],
      humor_acido: [
        'Aí sim, chefia! Driblou o orçamento com estilo. Pena que o gol foi contra.',
        'Tá vendo aquele dinheiro que sobrou? Eu também não.',
        'Sua meta de economia e o seu despertador: os dois você adia todo dia.',
        'Promoção de "leve 3 pague 2" é o jeito mais educado de te fazer gastar mais.',
        'Seu extrato daria uma ótima novela: drama, suspense e um final que ninguém queria.',
        'Piada? Já viu seu histórico de delivery?',
        'Conheço uma ótima: "esse mês eu economizo". Todo mês ela tem graça.',
        'O cartão de crédito entrou num bar. Saiu parcelado em 12 vezes.',
        'Sabe o que é mais engraçado que piada? Fatura de cartão em janeiro.',
        'Minha favorita é "só vou dar uma olhadinha na loja".',
        'Sua conta bancária e o seu humor têm algo em comum: os dois caem no fim do mês.',
        'Frete grátis é a forma mais cara de economizar que existe.',
        'Você não tem um problema com dinheiro. Você tem vários, e todos têm parcela.',
        '"É só um cafezinho." Disse você, 47 vezes este mês.',
        'O carrinho de compras online é o único lugar onde você planeja com antecedência.',
      ],
    },
  },
});

// ---------------------------------------------------------------- Compromissos, planos e lembretes (1.3.0)
Object.assign(GERADORES, {
  // Cartão de crédito (06/11)
  cartao_limite: {
    moldes: ['{abre} {fato} {fecho}', '{fato} {fecho}'],
    abre: {
      geral: ['Olha o cartão.', 'Aviso do cartão.', 'Atenção no limite.', 'Cartão no radar.', 'Só um toque.'],
      temNome: ['{nome}, olha o cartão:', 'Ei, {nome}:', '{nome}, atenção no limite:', '{nome}, um toque:', 'Aviso pra você, {nome}:'],
    },
    fato: {
      geral: [
        '{conta} já usou {pct}% do limite: {valor} de {orcamento}.',
        'No {conta}, foram {valor} dos {orcamento} de limite ({pct}%).',
        '{conta}: {pct}% do limite usado. Sobram {resta}.',
        'O limite do {conta} está em {pct}%: {valor} de {orcamento}.',
        '{conta} com {pct}% do limite. Disponível: {resta}.',
      ],
    },
    fecho: {
      geral: [
        'Segura as compras no cartão até a fatura fechar.',
        'Cartão perto do limite pede débito ou Pix por uns dias.',
        'Lembra: o que vai pro cartão sai do mês que vem.',
        'Se der, paga à vista o que for pequeno.',
        'Eu sigo de olho na fatura com você.',
      ],
      humor_acido: [
        'O cartão está pedindo férias.',
        'O limite não é meta, viu?',
        'Seu cartão mandou um pedido de socorro.',
        'Calma, o limite não é desafio.',
        'Mais um pouco e o cartão pede demissão.',
      ],
    },
  },

  cartao_vence: {
    moldes: ['{abre} {fato} {fecho}', '{fato} {fecho}'],
    abre: {
      geral: ['Fatura chegando.', 'Lembrete da fatura.', 'Olha a agenda do cartão.', 'Só pra não esquecer.', 'Aviso de vencimento.'],
      temNome: ['{nome}, fatura chegando:', 'Ei, {nome}:', '{nome}, lembrete da fatura:', '{nome}, só pra não esquecer:', 'Aviso pra você, {nome}:'],
    },
    fato: {
      geral: [
        'A fatura do {conta} ({valor}) vence {quando}.',
        '{quando} vence a fatura do {conta}: {valor}.',
        'Fatura do {conta}, {valor}, vence {quando}.',
        'O vencimento do {conta} é {quando}: {valor}.',
        'Tem fatura do {conta} vencendo {quando}, no valor de {valor}.',
      ],
    },
    fecho: {
      geral: [
        'Pagar o total evita juros do rotativo, que são altíssimos.',
        'Se puder, paga a fatura inteira, não só o mínimo.',
        'Pagando em dia, nada de juros.',
        'Melhor pagar antes do que pagar juros.',
        'Já separei o lembrete, só falta você.',
      ],
    },
  },

  compromisso_vence: {
    moldes: ['{abre} {fato} {fecho}', '{fato} {fecho}'],
    abre: {
      geral: ['Lembrete.', 'Olha a agenda.', 'Aviso de vencimento.', 'Só pra não esquecer.', 'Anota aí.'],
      temNome: ['{nome}, lembrete:', 'Ei, {nome}:', '{nome}, olha a agenda:', 'Aviso pra você, {nome}:', '{nome}, só pra não esquecer:'],
    },
    fato: {
      geral: [
        '{conta} ({valor}) vence {quando}.',
        '{quando} vence {conta}: {valor}.',
        'Tem {conta} vencendo {quando}, no valor de {valor}.',
        '{conta}, {valor}, vence {quando}.',
        'O vencimento de {conta} é {quando}: {valor}.',
      ],
    },
    fecho: {
      geral: [
        'Quando pagar, toca em Lançar na aba Mês.',
        'Pagando em dia, nada de juros.',
        'Já separei o lembrete, só falta você.',
        'Se já pagou, lança que eu paro de avisar.',
        'Melhor pagar antes do que pagar juros.',
      ],
    },
  },
  compromisso_atrasado: {
    moldes: ['{abre} {fato} {fecho}'],
    abre: {
      geral: ['Atenção.', 'Opa.', 'Ficou pra trás uma coisa.', 'Alerta de atraso.', 'Uma conta pediu socorro.'],
      humor_acido: ['Esqueceu de mim?', 'O boleto mandou um oi.', 'Tic-tac.', 'Os juros agradecem.', 'Atrasou, hein?'],
    },
    fato: {
      geral: [
        '{conta} venceu dia {dia} e eu não vi o pagamento ({valor}).',
        'Não achei o lançamento de {conta}, que venceu dia {dia}: {valor}.',
        '{conta} ({valor}) passou do vencimento, dia {dia}.',
        'O vencimento de {conta} foi dia {dia} e ainda não tem lançamento.',
        '{conta} está atrasada há {dias} dias: {valor}.',
      ],
    },
    fecho: {
      geral: [
        'Se já pagou, lança na aba Mês que eu atualizo.',
        'Vale pagar logo pra fugir dos juros.',
        'Confere no app do banco e me conta.',
        'Se pagou, foi só esquecer de anotar. Acontece.',
        'Eu não consigo pagar por você, mas posso lembrar até você pagar.',
      ],
    },
  },
  plano_do_mes: {
    moldes: ['{abre} {fato}', '{fato} {fecho}'],
    abre: {
      geral: ['Agenda do mês:', 'Olha só o que tem este mês:', 'Lembrete bom:', 'Este mês tem:', 'Anota na agenda:'],
      temNome: ['{nome}, este mês tem:', 'Ei, {nome}, lembra?', '{nome}, agenda do mês:', 'Olha, {nome}:', '{nome}, lembrete bom:'],
    },
    fato: {
      geral: [
        '{conta} está no plano deste mês ({valor}).',
        'Este mês é mês de {conta}, previsto em {valor}.',
        '{conta} volta este mês: {valor} reservados.',
        'Tem {conta} programado pra este mês ({valor}).',
        'É o mês de {conta}. Já conta com {valor}.',
      ],
    },
    fecho: {
      geral: [
        'Aproveita!',
        'Quando acontecer, lança que eu marco.',
        'Planejado é outra coisa: sem culpa.',
        'Já está nas contas do mês.',
        'Bom proveito quando chegar a hora.',
      ],
    },
  },
  // Dica de meta no Início (13/11, ideia do AI Studio): quanto guardar por mês pra chegar no prazo
  meta_ritmo: {
    moldes: ['{abre} {fato}'],
    abre: {
      geral: ['Sobre sua meta:', 'Lembrete de meta:', 'De olho no sonho:', 'Meta na mira:', 'Pensando no futuro:'],
      temNome: ['{nome}, sobre sua meta:', '{nome}, lembrete de meta:', '{nome}, de olho no sonho:', '{nome}, meta na mira:', '{nome}, pensando no futuro:'],
    },
    fato: {
      geral: [
        'pra {meta} chegar no prazo, guarda {valor} por mês. Faltam {total}.',
        'faltam {total} pra {meta}. Dá {valor} por mês até lá.',
        '{meta} está em {pct}%. Guardando {valor} por mês, chega no prazo.',
        '{valor} por mês e {meta} sai do papel. Faltam {total}.',
        'já foi {pct}% de {meta}. O ritmo pra chegar: {valor} por mês.',
      ],
    },
  },
  // Auditor de assinaturas (P9, 12/11): só pergunta, com o número do ano; quem decide é a pessoa
  auditor_assinatura: {
    moldes: ['{abre} {fato} {fecho}'],
    abre: {
      geral: ['Auditoria rápida:', 'Pergunta sincera:', 'Hora da faxina:', 'Começo de mês, pergunta de sempre:', 'Sem julgamento:'],
      temNome: ['{nome}, auditoria rápida:', '{nome}, pergunta sincera:', 'Ei, {nome}:', '{nome}, sem julgamento:', '{nome}, hora da faxina:'],
    },
    fato: {
      geral: [
        'você ainda usa {conta}? São {valor} por mês, {ano} por ano.',
        '{conta} custa {valor} por mês. No ano, dá {ano}.',
        'em um ano, {conta} leva {ano}. Ainda faz sentido?',
        '{conta} ({valor}) ainda está valendo a pena?',
        'quanto você usou {conta} no último mês? Ela custa {ano} por ano.',
      ],
    },
    fecho: {
      geral: [
        'Se não usa, cancelar é dinheiro que volta.',
        'Se usa bastante, ótimo: segue o jogo.',
        'Quem decide é você; eu só faço a conta.',
        'Às vezes dá pra pausar e voltar depois.',
        'Assinatura esquecida é o vazamento mais silencioso.',
      ],
    },
  },
  confira_banco: {
    moldes: ['{abre} {fato} {fecho}'],
    abre: {
      geral: ['Lembrete amigo:', 'Uma sugestão:', 'Ei:', 'Dica rápida:', 'Antes que eu esqueça:'],
      temNome: ['{nome}, lembrete amigo:', 'Ei, {nome}:', '{nome}, uma sugestão:', '{nome}, dica rápida:', '{nome}, antes que eu esqueça:'],
    },
    fato: {
      geral: [
        'faz {dias} dias que o saldo de {conta} não é atualizado.',
        'o saldo de {conta} foi conferido há {dias} dias.',
        'já são {dias} dias sem conferir {conta}.',
        '{conta} está com o saldo de {dias} dias atrás.',
        'o saldo de {conta} pode estar desatualizado ({dias} dias).',
      ],
    },
    fecho: {
      geral: [
        'Dá uma olhadinha no app do banco e atualiza aqui. Isso eu não consigo fazer por você.',
        'Confere lá e toca em Atualizar saldo na aba Contas.',
        'Eu não enxergo o banco, então conto com você nessa.',
        'Uma conferida rápida evita surpresa.',
        'Atualizando, minhas contas ficam certinhas.',
      ],
    },
  },
  // Primeiro acesso: o C.A.O.S. conhece a pessoa
  onb_nome: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Oi! Eu sou o C.A.O.S., a Central de Análises e Observações Sistêmicas. Antes de tudo: qual é o seu nome?',
        'Olá! Sou o C.A.O.S. e vou cuidar da sua carteira com você. Como é o seu nome?',
        'Oi, prazer! Eu sou o C.A.O.S. Pra começar com o pé direito: qual é o seu nome?',
        'Seja bem-vindo! Eu sou o C.A.O.S., seu analista de bolso. Qual é o seu nome?',
        'Opa! Sou o C.A.O.S. Vamos nos conhecer: qual é o seu nome?',
      ],
    },
  },
  onb_apelido: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Prazer, {nome}! Como você prefere que eu te chame?',
        'Que bom te conhecer, {nome}. Posso te chamar assim ou prefere um apelido?',
        '{nome}, anotado. Como você gosta de ser chamado?',
        'Nome bonito, {nome}. Te chamo assim ou tem outro jeito que você prefere?',
        'Prazer, {nome}! Me diz como prefere que eu te chame.',
      ],
    },
  },
  onb_aniversario: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        '{nome}, quando é seu aniversário? Pode mandar tipo 05/03/1998. Assim eu ajusto meu jeito de falar e lembro do seu dia.',
        'Me conta sua data de nascimento, {nome}? Ex.: 12/08/2001. Uso só pra ajustar o papo e te dar parabéns.',
        'Qual a sua data de nascimento, {nome}? (dia/mês/ano) Fica só no seu aparelho.',
        '{nome}, me diz seu aniversário com o ano? Ex.: 30/11/1995. Prometo lembrar do dia.',
        'Pra eu falar do jeito certo com você, {nome}: qual sua data de nascimento? Ex.: 01/02/2010.',
      ],
    },
  },

  onb_aniversario_ok: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Anotado, {nome}! Fica só aqui no seu aparelho, e no seu dia eu apareço.',
        'Guardei, {nome}. No seu aniversário tem parabéns meu.',
        'Pronto, {nome}! Data na memória.',
        'Valeu, {nome}! Agora eu sei falar do seu jeito e lembro do seu dia.',
        'Anotadíssimo, {nome}. Pode cobrar o parabéns depois!',
      ],
    },
  },

  // Metas montadas junto (06/11)
  meta_pra_que: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Bora montar sua meta! Pra que você quer juntar dinheiro? (ex.: um show, uma viagem, reserva de emergência)',
        'Adoro meta. Me conta: é pra quê? Um show, um celular novo, uma reserva…',
        'Vamos nessa! Qual é o sonho? Fala o que você quer conquistar.',
        'Meta boa começa com um motivo. Pra que vai ser esse dinheiro?',
        'Fechado, eu te ajudo. Primeiro: pra que é a meta?',
      ],
    },
  },

  meta_quanto: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        '{meta}, que legal! Quanto custa, mais ou menos?',
        'Boa escolha: {meta}. Quanto você precisa juntar no total?',
        '{meta} anotado. E quanto custa isso?',
        'Gostei: {meta}. Me diz o valor total que você precisa.',
        '{meta}! Quanto vai custar, chutando por cima?',
      ],
    },
  },

  meta_tem: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Você já tem alguma parte guardada pra isso? Se não tiver, manda 0.',
        'Já começou a juntar? Quanto já tem? (pode ser 0)',
        'Quanto você já tem separado pra essa meta? Se for nada ainda, tudo bem: manda 0.',
        'E já tem um pouco guardado? Me diz quanto (ou 0).',
        'Já existe um começo? Quanto já está guardado pra isso?',
      ],
    },
  },

  meta_ate: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Até quando você quer chegar lá? Pode ser "dezembro", "em 6 meses" ou "04/2027".',
        'E pra quando é? (ex.: "fim do ano", "em 8 meses", "março")',
        'Qual o prazo? Me fala o mês: "julho", "em 1 ano"…',
        'Quando você quer ter esse dinheiro? Um mês ou "em X meses".',
        'Prazo: até quando? Assim eu calculo quanto guardar por mês.',
      ],
    },
  },

  meta_batida: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'META BATIDA, {nome}! {meta} conquistada. Que orgulho de você!',
        'Conseguiu, {nome}! A meta {meta} chegou a 100%. Comemora, você merece!',
        '{nome}, você bateu a meta {meta}! Isso é disciplina de verdade.',
        'Parabéns, {nome}! {meta}: completa. Eu sabia que você conseguia.',
        'Missão cumprida, {nome}! {meta} está garantida. Bora pra próxima?',
      ],
    },
  },

  meta_guardou: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Mais {valor} na meta {meta}! Já está em {pct}%.',
        'Boa! {meta} subiu pra {pct}%. Faltam {resta}.',
        '{valor} guardados pra {meta}. Agora são {pct}% do caminho.',
        'Anotado: {meta} em {pct}%. Cada pouquinho conta!',
        'Isso aí! {meta} já tem {pct}%. Faltam só {resta}.',
      ],
    },
  },

  onb_tratamento: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Combinado, {nome}. E o jeito de falar: prefere descontraído ou mais formal?',
        'Beleza, {nome}! Gosta que eu fale de um jeito descontraído ou mais formal?',
        'Fechado, {nome}. Como prefere que eu fale com você: descontraído ou formal?',
        'Perfeito, {nome}. Uma última preferência: conversa descontraída ou mais formal?',
        'Ótimo, {nome}. Te trato de um jeito descontraído ou mais formal?',
      ],
    },
  },
  onb_ajuda: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Anotado. E no que eu posso te ajudar mais? Pode escolher mais de um e tocar em Pronto.',
        'Certo. Agora me conta: no que você quer minha ajuda? Escolhe quantos quiser e toca em Pronto.',
        'Entendido. Qual é o seu foco agora? Marca o que fizer sentido e toca em Pronto.',
        'Beleza. Pra eu saber por onde começar: no que posso ajudar? Escolhe e toca em Pronto.',
        'Show. E o que você mais quer do C.A.O.S. Finanças? Pode marcar vários e tocar em Pronto.',
      ],
    },
  },
  onb_fim: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Tudo pronto, {nome}! Vou focar em {foco}. Pra começar, lança um gasto ou me pergunta qualquer coisa.',
        'Fechado, {nome}. Meu foco com você: {foco}. Bora começar? Pergunta "como lanço um gasto?" se quiser.',
        'Prazer em te conhecer, {nome}! Já sei que o foco é {foco}. Pode contar comigo.',
        'Pronto, {nome}. Anotei tudo: foco em {foco}. Quando quiser mudar, é em Ajustes.',
        'Combinado, {nome}! Vou te ajudar com {foco}. A primeira dica: cadastra seus compromissos na aba Mês.',
      ],
    },
  },
});

// 2.0.5 (núcleo 1.4.0, "limites"): o lembrete de IA de bolso nas perguntas de decisão (comprar, parcelar). Sai 1 vez
// por assunto; quem controla é o index.js.
Object.assign(GERADORES, {
  lembrete_limites: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Lembrando: não sou consultor. Te oriento e faço a conta, mas certeza eu não te dou. Quem decide é você.',
        'Isso é a conta e a minha dica; a decisão é sua. Sou uma IA de bolso, não um consultor financeiro.',
        'Te mostrei os números do jeito mais honesto que sei. A escolha final é sua, combinado?',
        'Fica como orientação, não como ordem: quem conhece o seu mês melhor que eu é você.',
        'Sou IA de bolso: ajudo, explico e faço a conta. Bater o martelo é com você.',
        'Lembrando: é minha leitura dos números, não uma certeza. Quem decide é você.',
        'Eu te dou o mapa; o caminho você escolhe.',
        'Isso é dica de parceiro, não de consultor. A palavra final é sua.',
        'Fiz a conta com carinho, mas a decisão é sua, tá?',
        'Ajudo no que dá; o resto é com você, que conhece seu bolso melhor que eu.',
        'Isso aí não é muito comigo, viu? Tô te ajudando porque minha função é ajudar. Se é melhor pra você ou não, aí, parceirinho, é com você.',
        'Você me pediu os valores, eu te entreguei os valores. A decisão é sua, e eu fico do seu lado seja qual for.',
        'Te passei os números, não uma indicação. Independente do que você escolher, eu tô aqui pra te ajudar.',
        'Informação eu te dou; o "vai nesse banco" eu não dou. Isso é com você, parceiro.',
        'Eu mostro, você decide. E seja qual for a escolha, tô contigo.',
      ],
    },
  },
  aviso_mercado: {
    moldes: ['{inteira}'],
    inteira: {
      geral: [
        'Lembrando: é uma leitura dos últimos dias, não uma previsão garantida nem recomendação de investimento.',
        'Isso é apoio com base nos números recentes, não recomendação de investimento. O mercado pode virar a qualquer hora.',
        'Eu calculo com o que já aconteceu; o futuro ninguém garante. Não é recomendação de investimento.',
        'Use como dica, não como certeza: eu sou uma IA de bolso, não um consultor de investimentos.',
        'Base de cálculo: variação e médias dos últimos dias. Pode errar, e não substitui um profissional.',
      ],
    },
  },
});

// Pedaços com o nome da pessoa (só saem quando ela disse o nome no primeiro acesso)
GERADORES.boas_vindas.abre.temNome = ['Oi, {nome}!', 'E aí, {nome}?', 'Bem-vindo de volta, {nome}.', 'Que bom te ver, {nome}.', 'Olá, {nome}!'];
GERADORES.boas_vindas.abre.tratamento_formal = ['Olá, {nome}. Seja bem-vindo.', 'Bom te ver novamente, {nome}.', 'Olá, {nome}. À disposição.', 'Seja bem-vindo, {nome}.', 'Olá, {nome}. Vamos às contas?'];
GERADORES.resposta.abre.temNome = ['Olha só, {nome}:', 'Fiz as contas, {nome}.', '{nome}, aqui está.', 'Deixa eu te mostrar, {nome}.', 'Pronto, {nome}.'];
GERADORES.gasto_cadastrado.fecho.temNome = ['Valeu por anotar, {nome}.', 'Bom controle, {nome}.', 'Seguimos, {nome}.', 'Tá registrado, {nome}.', 'Anotado, {nome}. Tamo junto.'];
GERADORES.entrada_cadastrada.fecho.temNome = ['Boa, {nome}!', 'Gostei disso, {nome}.', 'Que tal guardar um pedaço, {nome}?', 'Dinheiro chegando, {nome}. Bom demais.', 'Anotado, {nome}. Agora é fazer render.'];

/** Ajuda (o que dá pra perguntar). */
export const SUGESTOES = Object.freeze([
  'Quanto gastei este mês?',
  'Onde mais gastei?',
  'Tive rendimentos?',
  'Algum alerta?',
  'Quem é você?',
  'Conta uma piada',
  'Qual meu saldo?',
  'Quanto ainda posso gastar?',
  'Vai dar até o fim do mês?',
  'Comparado ao mês passado?',
  'Me dá uma dica',
  'Gastei 25 no mercado',
  'O que você pode fazer?',
  'Como funciona seu cérebro?',
  'Como adiciono uma conta?',
  'O que tenho pra pagar?',
  'O que planejei pro mês?',
  'Cabe no mês?',
  'Posso comprar algo de 200?',
  'Qual é o meu nome?',
  'Como está o dólar?',
  'A bolsa tende a subir?',
  'Qual a Selic?',
  'Como está o mercado?',
  'Vale investir em dólar?',
]);
