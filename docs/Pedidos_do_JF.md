# Pedidos do JF (05/11/2026)

Lista de tudo o que o JF pediu pro app e pro C.A.O.S., pra nenhuma sessão esquecer. Marque `[x]` quando entregar.
Janelas de trabalho: o que o JF marcar e **toda sexta das 06h às 09h** (Brasília).

## Para quinta, 05/11 (16h07 às 18h30)

- [x] **Primeiro acesso** (C.A.O.S. 1.3.0, 05/11): o C.A.O.S. pergunta o nome, como a pessoa quer ser chamada/tratada e no que ele pode
  ajudar; lembra disso, chama pelo nome e adapta a ajuda. Dá pra refazer em Ajustes.
- [x] **Compromissos e lembretes** (1.3.0, aba 📅 Mês): contas fixas com vencimento (ex.: fatura dia 7, conta dia 10), assinaturas e planos
  que se repetem a cada N meses (ex. do JF: comida japonesa com a namorada a cada 2 meses; mês passado comeram,
  este mês não, mês que vem sim). O C.A.O.S. lembra ("esse mês tem tal coisa", "a fatura vence dia 7"), propõe lançar
  (Confirmar) e dá lembretes do tipo "lembra de conferir seu banco; eu não posso fazer isso por você".
- [x] **Planejamento do mês** (1.3.0, aba 📅 Mês e conversa "cabe no mês?"): a pessoa lista o que planejou comprar/gastar, com valores, e o C.A.O.S. calcula e analisa
  (cabe nas entradas? no orçamento? quanto sobra? o que dá pra adiar?).
- [x] **C.A.O.S. aprende categorias** (1.3.0): "Uber" vai pra Transporte pelo histórico, no formulário e na conversa.

## Para sexta, 06/11 (06h às 09h) e seguintes

- [x] **Mercado financeiro** (C.A.O.S. 1.3.0, adiantado na quinta 05/11; começa a chegar quando o JF publicar o servidor): bolsa, dólar, euro e moedas principais, atualizado todo dia na abertura da bolsa (10h).
  Este ambiente não alcança APIs de mercado, então o **servidor (Cloudflare Worker) busca sozinho num cron às 10h**
  e o app guarda offline (o JF aprovou esse caminho). O C.A.O.S. analisa com base de cálculo (variação, média dos
  últimos dias), em tom de dica/apoio, sempre avisando que não é recomendação de investimento e pode errar, e diz
  de quando é o dado quando estiver offline.
- [x] **Comparar rendimento dos bancos da pessoa** (1.3.0, adiantado na quinta 05/11; a comparação pela IA começa quando o JF publicar o servidor) (ex.: Nubank, PicPay, Mercado Pago): offline ele diz "amanhã eu
  trago" e guarda a pergunta numa fila; o servidor responde depois (com a IA) e o C.A.O.S. entrega na próxima
  abertura; online responde na hora.
- [ ] **Muito mais dinamismo no C.A.O.S.** (começado em 05/11: piadas 15 → 30 e falas novas com o nome da pessoa): muito mais falas e piadas, mais "banco de dados", controle melhor do próprio
  sistema e autonomia pra auxiliar (sempre ter uma solução ou ideia), mas **nunca fazendo pelo usuário** (1ª lei:
  ele propõe, a pessoa confirma).
- [x] **Estrutura do C.A.O.S. do Perfil** (chegou na caixa de correio `docs/Do_Perfil/`, lida em 06/11): o JF vai trazer um arquivo com a estrutura completa que o Code do Perfil
  montou. Usar como base quando chegar.
- [ ] **Mais funções e análises no app** em geral (ideias em `docs/Ideias.md`).
- [ ] **Parte 2 pro JF:** passo a passo de publicar o servidor (IA online, lembretes e mercado): `servidor/LEIA-ME.md`.

# Pedidos do JF (05/11/2026, fim da tarde)

Para a janela de **sexta 06/11, 06h às 09h**, e as seguintes. É muita coisa: fazer na ordem e publicar aos pedaços,
sempre testado.

## 1. Cadastro com idade e um C.A.O.S. que se adapta (prioridade)
- [x] **Data de aniversário** no cadastro (a idade sai dela). É o principal: com a idade o C.A.O.S. ajuda a pessoa a
  se situar nas finanças. Ele lembra do aniversário.
- [x] **Jeito de falar por faixa de idade** (sempre respeitando e ajudando, sem se perder):
  - até 12 anos (criança): mais jovial, brinca um pouco mais;
  - 13 a 17 (adolescente): brinca um pouco menos, zoa um pouco mais ácido, sem exagero;
  - 18 a 25 (jovem adulto): brinca menos e orienta mais ("analisando seu perfil, seria bom…", "pesquisa sobre tal
    tipo de investimento");
  - adultos: vai variando conforme a idade.
- [x] **Metas que ele monta junto**: "você marcou que quer guardar dinheiro: pra quê?" → "pra um show" → quanto
  custa, quanto já tem, até quando → ele calcula quanto guardar por mês, acompanha e **comemora as conquistas**.
  Ele planeja a vida financeira com a pessoa e vai acompanhando conforme ela cresce.

## 2. Cérebro de verdade, não bot de roteiro
- [x] Ler bem o que a pessoa escreveu e **tentar interpretar** (erro de digitação, jeito de falar, continuação da
  conversa como "e no mês passado?"), em vez de "não entendi"/"não fui programado". Se não tiver certeza, dar o
  melhor palpite e perguntar de volta. Respostas específicas pra pessoa, nada genérico.
- [x] **Toda pergunta que ele não souber** vai pra fila do servidor ("ainda não sei, mas guardei e mandei pros meus
  servidores"). Quando a resposta chegar: "Ei, fulano, sabe aquela sua pergunta? Agora eu consigo responder." (com o
  rostinho dele). Hoje a fila só existe pra "qual banco rende mais".
- [x] **"Não entendi o que o banco falou"**: a pessoa manda o print e o C.A.O.S. explica o que aquilo significa (pelo
  servidor, com a IA). Sem conexão, entra na fila.
- [ ] Ele **aprende com a pessoa** e evolui com ela.
- [x] O JF vai trazer o arquivo da estrutura do C.A.O.S. feita pelo Code do Perfil: usar como base (chegou em `docs/Do_Perfil/`).

## 3. Cartão de crédito
- [x] Registrar o cartão (ex.: PicPay com limite de R$ 100): limite, dia de fechamento e de vencimento. O C.A.O.S.
  ajuda a controlar a fatura (quanto do limite já foi, quanto vem na fatura, quando vence).

## 4. Visual e acessibilidade (como no Perfil)
- [x] **Rostinho combinando com a frase**: a emoção do rosto tem que fazer sentido com o que ele está falando, não é
  enfeite (no Perfil: "a emoção do balão sai do conteúdo da frase", C.A.O.S. 4.4).
- [x] Visual **mais minimalista** (1ª parte: ícones das abas e do Me ajuda, toques de neon; emojis das categorias continuam), com toques de **neon** parecidos com o Perfil, **ícones bonitos** no lugar de
  emoji (menos poluído), cores e fontes com boa visibilidade, algumas animações e efeitos.
- [x] **Acessibilidade** (olhar como o Perfil faz): letra maior, modo claro e escuro, velocidade da fala do C.A.O.S.,
  menos movimento.
- [x] Botão **"Me ajuda" / "Me pergunte"** sempre à mão: "quero adicionar um gasto, como faço?", "quero registrar meu
  cartão", e o C.A.O.S. guia.
- [ ] Simples e intuitivo: qualquer pessoa tem que entender o que está acontecendo e o que precisa fazer.

# 05/11 à noite e 06/11 de madrugada

## Correções (primeiro de tudo)
- [x] Revisão do ChatGPT (06/11, `docs/revisoes/2026-11-06_chatgpt.md`): backup que roda código, backup com dado
  inválido, plano marcado como feito ao cancelar, pagamento parcial contado como pago, servidor com JSON estranho e
  servidor sem limite de uso.
- [x] O cabeçalho "come a tela": o conteúdo aparece cortado por baixo dele ao rolar.
- [x] Ele não entendeu "Quanto eu tenho guardado no total?!" nem "O que mais eu tenho planejado para esse mês?!".
- [x] Resposta instantânea demais "dá medo e quebra a imersão": ele precisa de um respiro ("digitando…").
- [x] Conta com banco "Outro" aparece "Outro · Apelido": mostrar só o apelido. Faltam bancos (ex.: Banestes).

## Novidades
- [x] Aba/tela **Novidades** como a do Perfil: o que mudou em cada versão, em linguagem de quem usa, e aviso quando tem
  coisa nova.

## Ficou pra próxima (06/11, fim da janela)
- Ícones SVG também nas categorias e no resto do app (hoje só abas e Me ajuda).
- Voz natural (Azure), perfil de tratamento com permissões e 👍/👎 nas falas (kit do Perfil, `06_Remontagem_na_Carteira.md`).
- Ele aprender com a pessoa (tato, preferências) e mais análises.
- Publicar o servidor (passo a passo em `servidor/LEIA-ME.md`): sem ele, IA online, fila, explicar print, mercado e
  lembretes no iPhone ficam esperando.

# 06/11 de manhã (JF testando)
- [x] Entender abreviações e gírias ("vc", "cê", "tbm", "q", "hj"…).
- [x] "O que vc acha do JF?" sem resposta.
- [x] Muitas perguntas avulsas seguidas: o C.A.O.S. chama de volta ("Cê veio pra organizar suas finanças ou ficar
  jogando conversa fora?!", só no Ácido; no Suave/Normal, convite gentil).
- [x] Rosto preocupado em "o que você pode fazer?".
- [x] Campo de aniversário vazando do card no iPhone.
- [x] Bancos em ordem alfabética; Itaú Cartões e outros.
- [ ] **Login e memória entre aparelhos** (o JF lançou num aparelho e no outro não aparece): precisa do servidor.
  Proposta em conversa com o JF (sincronização criptografada no aparelho, o servidor guarda só um pacote fechado).
- [ ] Debug completo e análise rígida do C.A.O.S. (o JF vai fazer) e refinar ainda mais a IA.
- [ ] Ele saber mais sobre o criador (o JF vai contar o que pode entrar; sem dado pessoal sensível).
