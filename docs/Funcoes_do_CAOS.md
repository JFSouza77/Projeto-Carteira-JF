# Funções do C.A.O.S. (pra revisar)

Lista feita pelo Wally em 16/11/2026, tirada do código (`js/caos/conversa.js`, função `entender()`).
App 2.1.5 Alfa · C.A.O.S. 2.4.4 · núcleo 1.8.0. São **69 jeitos de entender** uma frase, em 7 grupos.

Como ler: cada linha é uma coisa que ele entende, com um exemplo de frase e o que ele faz.
- 🖥️ = responde sem internet (no próprio celular).
- 🌐 = precisa da IA online.
- ✅ = ele propõe, e só grava depois do seu Confirmar (1ª lei).

## 1. Anotar (ele propõe, você confirma)

| O que | Exemplo | O que ele faz |
| --- | --- | --- |
| Gasto | "gastei 30 no mercado" | Propõe o gasto, pergunta como pagou ✅ 🖥️ |
| Gasto sem valor | "gastei no uber" | Pergunta quanto foi 🖥️ |
| Vários gastos | "gastei 10 no pão e 20 no uber" | Propõe todos de uma vez ✅ 🖥️ |
| Entrada | "recebi 1500 de salário" | Propõe a entrada ✅ 🖥️ |
| Entrada prevista | "vou receber 500 dia 20" | Guarda como "a receber" até você tocar em Recebi ✅ 🖥️ |
| Esqueci de lançar | "esqueci de lançar ontem" | Ajuda a anotar com a data certa 🖥️ |
| Corrigir a data | "esse gasto foi na quarta" | Muda a data do último gasto ✅ 🖥️ |
| Dar baixa | "já paguei a fatura do C6" / "o João me pagou" / "paguei o aluguel" | Fatura paga, parte do amigo recebida, conta fixa lançada ✅ 🖥️ |
| Corrigir o valor | "errei, foi 45, não 50" | Muda o valor do último gasto ✅ 🖥️ |
| Transferência | "transferi 200 do Inter pro C6" | Anota a transferência entre suas contas ✅ 🖥️ |
| Meta nova | "quero juntar pra uma viagem" | Faz as perguntas e propõe a meta ✅ 🖥️ |
| Guardar na meta | "guardei 100 na viagem" | Propõe guardar ✅ 🖥️ |
| Mudar o apelido | "me chama de JF" | Troca como ele te chama ✅ 🖥️ |

## 2. Seu dinheiro (consultas)

| O que | Exemplo | O que ele faz |
| --- | --- | --- |
| Quanto gastei | "quanto gastei este mês?" (ou hoje, semana, mês passado, em mercado) | Soma e responde 🖥️ |
| Onde mais gastei | "onde mais gastei?" | Ranking por categoria e o maior gasto 🖥️ |
| Média | "qual minha média por dia?" | Faz a média 🖥️ |
| Comparar | "gastei mais que mês passado?" | Compara os meses 🖥️ |
| Orçamento | "como está meu orçamento?" | Limite × gasto por categoria 🖥️ |
| Alertas | "algum alerta?" | Lista os avisos (saldo baixo, piso, fatura…) 🖥️ |
| Previsão | "vai dar até o fim do mês?" | Projeta o mês no ritmo atual 🖥️ |
| Cabe no mês | "posso comprar 300?" | Diz se cabe, contando contas e planos 🖥️ |
| Contas a pagar | "o que tenho pra pagar?" | Compromissos e vencimentos 🖥️ |
| Planos | "meus planos" | Compras planejadas do mês 🖥️ |
| Saldo | "quanto tenho no total?" | Soma dos bancos 🖥️ |
| Uma conta | "quanto tem no Nubank?" | Saldo daquela conta 🖥️ |
| Cartão | "quanto está a fatura do C6?" | Fatura, limite e vencimento 🖥️ |
| Folga do banco | "quanto posso gastar no Inter?" | O que dá sem passar do piso 🖥️ |
| Média de segurança | "meus bancos estão seguros?" | Soma dos pisos × saldos, em quantos dias estoura 🖥️ |
| De onde transferir | "qual banco tem folga?" | Sugere de onde tirar pra cobrir outro 🖥️ |
| Dividir o salário | "como divido meu salário entre os bancos?" | Sugere a divisão pelos pisos 🖥️ |
| Entradas | "tive rendimentos?" | O que entrou no mês 🖥️ |
| Comparar entradas | "recebi mais que mês passado?" / "tive aumento?" | Compara as entradas 🖥️ |
| A receber | "quem me deve?" | Rachadinhas e o que falta receber 🖥️ |
| Metas | "como estão minhas metas?" | Progresso de cada meta 🖥️ |
| Fato da semana | "minha ofensiva" | O que mudou da semana passada pra esta 🖥️ |
| Gastinhos (formiguinha) | "quais meus gastinhos?" | Quantos gastos de até R$ 30 no mês, quanto somam e onde mais aparecem 🖥️ |

## 3. Decidir e calcular

| O que | Exemplo | O que ele faz |
| --- | --- | --- |
| Vale parcelar | "vale parcelar 1200 em 10x?" | Compara à vista × parcelado 🖥️ |
| Comparar ofertas | "loja A 300 ou loja B 280 em 3x?" | Diz qual sai melhor 🖥️ |
| Uma oferta | "vale 250 nesse fone?" | Analisa a oferta 🖥️ |
| Print de oferta | (manda o print) | Lê preços do print 🌐 |
| Porcentagem e contas | "quanto é 15% de 200?" / "quanto é 12 x 7?" | Faz a conta 🖥️ |
| Juros | "quanto rende 1000 a 1% ao mês em 12 meses?" | Calculadora de juros 🖥️ |
| Mercado | "como está o dólar?" / "qual a Selic?" | Números do dia (sem o dado, pesquisa na IA) 🖥️/🌐 |
| Investir | "a bolsa tende a subir?" | Base de cálculo + aviso de que não recomenda 🖥️ |
| Meus investimentos | "quanto tenho investido?" | Soma e rendimento 🖥️ |
| Onde rende mais | "qual banco rende mais?" | Compara % do CDI 🌐 |
| Limite investido | "quais bancos aumentam o limite se eu investir?" | Explica CDB que vira limite (C6, Inter, PicPay…) 🖥️ |
| Planejar pet, moradia, transporte ou economizar | "quanto custa cuidar de um pincher?" / "meu aluguel está caro" / "gasto muito com gasolina" / "onde posso economizar?" | Questionário de 5 perguntas sem IA (com aviso de privacidade antes de pedir bairro); depois a IA faz a conta com as premissas à mostra e sugere caminhos, sem decidir 🌐 (sem IA: dicas do caminho 🖥️) |
| Plano de passeio | "quanto tá um ingresso no cinema?" / "dá pra ir ao cinema esse mês?" | Pesquisa ingresso, estacionamento e pipoca e diz se cabe no mês (tranquilo, com cuidado ou melhor esperar) 🌐 (sem IA: dicas pra sair mais barato 🖥️) |
| Pesquisa direta | "pesquisa na internet o preço de…" | Vai direto pra IA, sem questionário (também quando o pedido já vem detalhado) 🌐 |
| Pesquisa de compra ou viagem | "quanto custaria uma viagem pros EUA?" / "me ajuda a achar uma geladeira" | Faz um questionário rápido sem IA (de onde, quando, quantos, região, orçamento; ou detalhes, uso, marca, prazo), com Pular; depois a IA compara 2 a 4 sites e diz o que conferir (frete, bagagem…). Ele orienta, não decide 🌐 (sem IA: o caminho das pedras 🖥️) |
| Combustível | "a gasolina vai subir?" / "paguei 6,29 no litro, tá caro?" / "etanol 4,10 gasolina 6,20" | Pesquisa preço (ANP) e o que mexe nele, sem prometer número 🌐; etanol x gasolina na hora 🖥️ |
| Km por litro | "rodei 400 km com 40 litros a 6,20" / "rodei 1200 km este mês" / "meu carro tá bebendo muito" | Consumo, custo por km e projeção (soma os abastecimentos anotados); abaixo do comum, sugere mecânico 🖥️ |
| Conta de luz (kWh) | "minha conta deu 250 com 300 kwh" / "quanto gasta um chuveiro 20 minutos por dia" | Preço do kWh e quanto cada aparelho pesa no mês (15 aparelhos com potência típica) 🖥️ |
| Trabalho e renda | "recebi 800 de plantão" / "qual o piso de enfermeiro?" / "qual o salário mínimo?" / "qual o PIB do Brasil?" / "como peço mesada?" | Plantão vira extra (e lembra de descansar se forem muitos) 🖥️; piso pesquisado 🌐; salário mínimo, PIB e mesada 🖥️ |
| Foto com legenda | clipe no Chat + "comprei esse tênis por 250" | Comprovante: a IA lê; foto do que comprou: a legenda vira o lançamento, com a foto junto 🖥️ |
| Fezinha (loteria) | "joguei 6 na mega" / "quais as chances da quina?" / "quanto tá o prêmio da Mega da Virada?" / "quanto gastei com fezinha?" | Anota em Lazer com o nome do jogo e o total do mês 🖥️; chance de verdade 🖥️; prêmio e sorteio 🌐 |
| Moedas de jogo | "quanto tá valendo 100 robux?" | A moeda, onde comprar, preço de hoje e alerta de golpe 🖥️/🌐 |

## 4. Aprender

| O que | Exemplo | O que ele faz |
| --- | --- | --- |
| Glossário | "o que é CDI?" | Explica (100 termos) 🖥️ |
| Dica | "me dá uma dica" | Dica de organização 🖥️ |
| Tutorial / como funciona | "como uso o app?" | Explica o app 🖥️ |
| Ajuda | "o que posso perguntar?" | Sugestões 🖥️ |
| Explicar um print | (print do banco) "o que é isso?" | Explica a fatura ou o extrato 🌐 |
| Explicar melhor | "não entendi" | Explica de novo, mais simples 🖥️ |
| Privacidade | "vocês veem meus dados?" | Explica o que fica onde 🖥️ |
| Limites dele | "você pode investir por mim?" | O que ele pode e não pode 🖥️ |

## 5. Sobre ele

| O que | Exemplo | O que ele faz |
| --- | --- | --- |
| Quem é | "quem é você?" | Se apresenta 🖥️ |
| O nome | "o que significa C.A.O.S.?" | A sigla 🖥️ |
| Criador | "quem te criou?" | Fala do JF 🖥️ |
| Origem | "de onde você veio?" | Nasceu no Perfil JF 🖥️ |
| História | "conta sua história" | Os marcos da vida dele (núcleo 1.6.0) 🖥️ |
| Sobre o JF | "quem é o JF?" | Fala do criador 🖥️ |
| Como está | "como você está?" | Responde com a emoção do momento 🖥️ |
| Salário dele | "quanto você ganha?" | Brinca que trabalha de graça 🖥️ |
| Meu nome | "qual meu nome?" | Diz como te chama 🖥️ |

## 6. Papo

| O que | Exemplo | O que ele faz |
| --- | --- | --- |
| Oi / obrigado / elogio | "oi", "valeu", "você é demais" | Responde no seu humor 🖥️ |
| Piada | "conta uma piada" | Piada de finanças 🖥️ |
| Frase de motivação | "me motiva", "me manda uma frase de motivação" | Frase de pensador ou investidor (e uma por dia, de manhã, no Início) 🖥️ |
| Ditado | "me conta um ditado" | Ditado popular e o que ele quer dizer pro bolso 🖥️ |
| Curiosidade | "me conta uma curiosidade" | Curiosidade de dinheiro (cofrinho, Pix, Buffett…) 🖥️ |
| Apelido de amigo | "fala, corno" | Entende como carinho 🖥️ |
| Xingamento | "burro" | Reage, com paciência em escada; se tiver pergunta junto, responde 🖥️ |
| Desabafo | "krlh, tô sem grana" | Acolhe 🖥️ |
| Aperto | "tô liso", "esse mês tá osso" | Acolhe com os números do mês e um caminho (sem gastar IA) 🖥️ |
| Papo pessoal | "como você se sente?" | Vai pra IA 🌐 |
| Fora do papel | "quem ganhou o Brasileirão de 98?" | Manda pro Google (sem gastar IA) 🖥️ |
| Retomar | "e agora, sabe aquela?" | Volta na pergunta que ficou sem resposta 🖥️ |
| Não entendeu | qualquer outra coisa | Pergunta pra IA online, ou guarda pra depois 🌐 |

## 7. Jeito dele (vale pra tudo)

- **Humor:** Suave (padrão), Normal ou Ácido. No Ácido, fecha 6 em 10 respostas com uma zoeira. Com o criador, sempre ácido.
- **Nome:** chama pelo apelido uma resposta sim, outra não. Na IA também, sem mandar o nome pra fora.
- **Dois balões:** quando empolga, manda um 2º balão curto ("ah, e…"); no Ácido, a zoeira vem nele.
- **Cabeça aérea (TDAH):** de vez em quando (no máximo 1 a cada 30 min), num 2º balão, lembra de uma curiosidade de dinheiro e volta pro foco. Sem internet.
- **Pergunta de amigo:** depois de um gasto anotado no Chat, às vezes pergunta "valeu a pena?" ou "foi planejado?". A resposta fica só na memória dele (conta os impulsos do mês).
- **Formiguinha:** a cada 10 gastinhos de até R$ 30 no mês, avisa quanto já somam.
- **Emoção:** a do rosto também muda o tom da IA online.
- **Emoções e rosto:** cada resposta tem uma emoção e um rostinho, e o avatar troca de forma pelo assunto.
- **Avisos:** alerta sempre com o número e um empurrão útil.
- **IA online:** recebe só totais, nunca a lista de gastos. Pesquisa na internet só assunto de dinheiro. Tem limite por dia, menos pro criador.
- **Sem internet:** tudo das tabelas com 🖥️ continua funcionando; o que precisa de IA fica guardado e ele responde depois.
