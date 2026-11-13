# Pendências da Carteira (lista única)

Um lugar só pra ver o que está aberto (sugestão do Code do Perfil, 12/11/2026; o JF tem TDAH, uma lista ajuda).
Os detalhes continuam em `Pedidos_do_JF.md`, `Rascunhos_da_Semana.md` e `Ideias.md`; aqui fica só o resumo.
Atualizada pelo Wally a cada rodada.

## Bugs que o JF está caçando (13/11 à tarde, corrigir na próxima leva)

1. **Ajustes → Lembretes (UI):** a caixa do horário (20:30) passa da borda direita do cartão. O checkbox, o "Desligado." e o
   "Testar notificação" ficam soltos, sem espaçamento nem alinhamento. Provável causa: `input[type=time]` com largura
   fixa no iPhone. Arrumar junto com uma revisão do card.
2. **Botão "Me ajuda":** encolhe pro "?" quando rola a tela e volta a crescer quando para. Isso incomoda o JF: tem que ter
   **um formato só**. Pedido junto:
   - **dá pra arrastar:** segurar e arrastar pra qualquer canto, e o app lembra onde ficou;
   - **toque rápido abre um menuzinho de ajuda rápida**, com perguntas prontas que já abrem a conversa do C.A.O.S. com
     aquela pergunta.
3. **Microfone não funciona:** o C.A.O.S. não consegue ouvir o que o JF fala (confirmado por ele). O
   `js/voz.js` não mudou desde 12/11. Suspeita: o iPhone bloqueia o ditado do navegador no app instalado na tela
   inicial. Investigar:
   - conferir a permissão do microfone;
   - mostrar um erro claro em vez de não fazer nada;
   - plano B: ditado pelo teclado do iPhone (o microfone do próprio teclado).

## Próxima rodada grande (pedidos do JF, 13/11)

- **Avatares animados do C.A.O.S.** no lugar dos rostinhos (os rostinhos ficam só quando precisar, pra não poluir).
  Os avatares já estão prontos (vieram do Perfil).
  - Criar mais avatares onde fizer sentido, por exemplo **"espantado"**: o susto com um valor absurdo, tipo "R$ 17 mil
    na Cacau Show?". Ele reage ao "valor fora do normal".
  - O que for traço dele vai pro núcleo, com o ok do JF e aviso ao Code.
- **Contas em outras moedas (ideia do JF, 13/11):** conta global em dólar ou euro (C6 em dólar e euro, Inter em dólar,
  PicPay em dólar e euro desde nov/2025) e o **Meli Dólar** do Mercado Pago. O Meli Dólar é uma stablecoin, uma moeda
  digital (cripto) atrelada ao dólar, comprada com o saldo em reais dentro do app; não é conta bancária e não serve pra
  pagar no exterior.
  - **Plano:** campo `moeda` na conta (BRL, USD, EUR ou Meli Dólar), saldo guardado na moeda dela e mostrado
    "US$ 120,00 ≈ R$ 650,00 (cotação de dd/mm)".
  - **Cotação:** a do servidor (mercado, todo dia útil) quando estiver no ar; antes disso, a pessoa informa.
  - **Total em reais:** soma com a cotação do dia, avisando que é estimativa.
  - **Avisos:** saldo em moeda estrangeira não tem FGC; o Meli Dólar é cripto. O C.A.O.S. explica no glossário.
  - Lançar gasto em outra moeda fica pra depois.
- **Tela de carregamento** ao abrir o app, com área de login: um respiro curto, não demora. Nada de abrir de forma
  instantânea e seca.

## Esperando o JF

- **Selo de criador:** quando o servidor for pro ar, pôr o apelido da conta do JF em `CRIADOR_CONTAS`.

- **Publicar o servidor juntos** (IA online, conta, push, mercado, Jornal). Passo a passo: `servidor/LEIA-ME.md`.
- Contar mais sobre ele pro C.A.O.S. zoar com mais assunto (sem dado pessoal sensível).

## Próxima rodada (sexta 13/11)

**Repaginada do AI Studio** (plano em `docs/Repaginada_AI_Studio.md`): fase 1 no computador feita (1.25); fase 2 feita na
madrugada de 13/11 (1.26 e 1.27: transferência, ritmo, barras, filtros, CSV, Cobrar, simulador, Estúdio, calendário da
ofensiva, editar lançamento). V2 do AI Studio (13/11 de manhã): 1.28 e 2.0 Alfa no ar (orçamento de hoje, gráficos
vivos, rosca neon, metas com anel, bancos com cores reais, exportar o mês, teste do macaco). Falta: Dica do Dia
(C.A.O.S., versão nova), rodada de falas/emoções/rostinhos (com o Code; núcleo só com ok do JF), toque no dia da
ofensiva, C.A.O.S. reagindo enquanto preenche, fase 1 no celular (cabeçalho com rostinho e 4 cartões), melhorias do
simulador e a fase 3. Hoje: GPT faz debug às 9h, 11h e 13h; servidor com o JF no almoço.

0. Núcleo único, parte 3: temperamento do dia, estabilizador e paciência (emoções 7 → 10 já foram, 1.20).
1. P12: revisão de cada tela, **depois** da repaginada que o JF vai trazer do Google AI Studio (12/11).
2. Professor de finanças, parte 2: mais termos (até 100), "olhar de cuidado" (farmácia, combustível, luz, apostas).
3. Relatório do mês em PDF (pela impressão do navegador) e passo final do primeiro acesso: cadastrar a 1ª conta.
5. Começar a quebrar o `app.js` em um arquivo por tela (com o Code revisando o plano).
6. Avatar: 10 formas principais (depois do teste do Code em 19/11, ou antes se o JF pedir).

## Depois do servidor


- **Sincronização ao mesmo tempo (achado do GPT):** o `/sync` lê, junta e grava o estado inteiro no KV; dois aparelhos
  sincronizando no mesmo segundo podem perder uma mudança. Plano: passar o estado da conta pra um Durable Object
  (serializa as gravações) quando o servidor estiver no ar e com gente usando.

- Jornal do C.A.O.S. (notícias 06h e 18h, fonte oficial + "o que muda pra você" calculado no aparelho).
- Comparar rendimento dos bancos pela IA; perguntas da fila.

## Corrigido na hora (12/11)

- Escuro por padrão (JF topou a ideia do Code); o claro e o "do aparelho" ficam em Acessibilidade.
- Parcelado no resumo do mês: o JF deixou com o Wally. Decisão: continua o valor todo no mês da compra (é quando a
  pessoa se comprometeu); as parcelas futuras aparecem no cartão. Rever se alguém reclamar.

- Aviso vazio aparecia como uma pílula em cima do botão Lançar (1.17).
- "Cabe no mês" sem renda dizia "sobram R$ 0,00" (1.17).
- "—" gigante na Sobra prevista virou frase (1.19).

## Ideias (com quem deu)

- JF: praieiro, entregador, onde foi o gasto (shopping/online), voz do C.A.O.S., "como prefere que eu fale com você".
- Gemini: Saúde da Carteira 0–1000 (🕒 depois da ofensiva rodar).
- Code do Perfil: categoria com ícone + cor, cabeçalho igual em todas as telas, neon só no botão principal.
