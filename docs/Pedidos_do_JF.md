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
- [ ] **Estrutura do C.A.O.S. do Perfil:** o JF vai trazer um arquivo com a estrutura completa que o Code do Perfil
  montou. Usar como base quando chegar.
- [ ] **Mais funções e análises no app** em geral (ideias em `docs/Ideias.md`).
- [ ] **Parte 2 pro JF:** passo a passo de publicar o servidor (IA online, lembretes e mercado): `servidor/LEIA-ME.md`.
