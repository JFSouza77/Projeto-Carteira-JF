# Cérebro do C.A.O.S. na Carteira (C.A.O.S. 1.3.0)

## Quem ele é (1.1.0)

**C.A.O.S. = Central de Análises e Observações Sistêmicas.** Criado pelo JF, veio do Projeto Perfil JF (onde era o
apresentador do jogo) e aqui foi refinado pro dia a dia: menos festa, mais conta, mesmo humor. Tudo isso fica em
`js/caos/identidade.js`, e o app e a IA online leem do mesmo lugar.

| Anatomia | O que é | Onde |
| --- | --- | --- |
| **Cérebro** | Monta as falas, sente emoções, entende perguntas | `gerador.js`, `falas.js`, `emocoes.js`, `conversa.js` |
| **Sistema nervoso** | Radar que percebe gastos, entradas e alertas | `analyze` e `detectExpenseEvents` em `js/engine.js`, prioridades em `index.js` |
| **Braços** | O motor faz as contas pesadas; a IA online lê fotos e responde perguntas livres | `js/engine.js`, `servidor/worker.js` |
| **Espinha** | As 3 leis | `espinha.js` |

Ele sabe responder: quem é você, o que significa o nome, quem te criou, de onde veio, como funciona, o que pode e
não pode fazer, conta piada e ensina a usar cada parte do app ("como faço pra adicionar uma conta?").


O C.A.O.S. da Carteira veio do Perfil JF. O código do Perfil depende do jogo (jogadores, cartas, rodada), então
não dava pra copiar direto: vieram as **ideias e os motores**, reescritos para dinheiro.

| Parte | Veio do Perfil | Na Carteira | Onde |
| --- | --- | --- | --- |
| **Espinha (3 leis)** | 1.7.5.3 | 1ª: nunca mexe nos dados (recebe cópia congelada; registro é só proposta). 2ª: Suave nunca recebe zoeira. 3ª: erro vira silêncio, nunca trava o app. | `js/caos/espinha.js` |
| **Console de emoções** | 4.x (10 emoções, misturas, decaimento) | 7 emoções (alegria, orgulho, preocupação, irritação, tédio, curiosidade, carinho) e 3 misturas (radiante, protetor, tenso). Voltam ao calmo com o tempo real (meia-vida de 8 h). O olho muda de cor. | `js/caos/emocoes.js` |
| **Gerador de falas** | 1.7.5.1 e 4.4 | Moldes + pedaços por contexto (hora, início/fim do mês, humor, emoção). Não repete pedaço recente, palavra forte nem as últimas 12 falas. | `js/caos/gerador.js` + `js/caos/falas.js` |
| **Rosto** | 4.0 (rostos de texto, níveis, escada, misturas) | Os mesmos 243 rostos de 16 emoções do Perfil, animados (quadros, balanço, tremido de raiva). Nível pela intensidade, escada de vizinhos nas mudanças de humor, reação direta na conversa vai na hora. Suave nunca mostra raiva/deboche. | `js/caos/rostos.js` + `rostos-dados.js` (importados por `ferramentas/importar_rostos_perfil.cjs`) |
| **Tato** | 4.7 | Fala acima de 170 letras é remontada. | `js/caos/gerador.js` |
| **Voz** | escolha de voz (pt-BR, masculina, local) | Igual, mais tom e velocidade por emoção e leitura de "R$". Ditado (falar com ele) quando o navegador deixa. | `js/voz.js` |
| **Pulmão / ritmo** | 4.3 | Uma fala por reação, a mais importante. Cooldown por tipo; alertas de orçamento e conta sem cooldown; alerta do radar no máximo a cada 6 h. | `js/caos/index.js` |
| **Conversa** | (novo) | Entende perguntas por palavras-chave, offline, e responde com os números do motor. Pergunta que ele não entende pode ir pra IA online (se ligada). | `js/caos/conversa.js` |

## Gatilhos (o que faz ele falar)

| Gatilho | Quando |
| --- | --- |
| `boas_vindas` | Abrir o app (no máximo a cada 6 h) |
| `gasto_cadastrado` / `entrada_cadastrada` | Lançamento novo |
| `orcamento_80` / `categoria_estourada` | Categoria passou de 80% / 100% do limite |
| `ritmo_alto` | No ritmo atual, as categorias com limite passam do orçamento |
| `mes_negativo` | Saiu mais do que entrou no mês |
| `conta_negativa` | Saldo estimado de uma conta abaixo de zero |
| `delivery_repetido` | 3 deliveries em 7 dias |
| `sem_registro` | 3 dias ou mais sem anotar |
| `mes_verde` | Mês anterior fechou dentro do orçamento (uma vez) |
| `compromisso_vence` / `compromisso_atrasado` | Conta fixa, fatura ou assinatura vence em até 3 dias / passou do dia sem lançamento |
| `plano_do_mes` | Plano que se repete (ex.: comida japonesa a cada 2 meses) é deste mês |
| `confira_banco` | Saldo de uma conta sem atualizar há 7 dias ou mais ("isso eu não consigo fazer por você") |

## Mercado (1.3.0)

O servidor busca as cotações todo dia útil às 10h (`servidor/worker.js`, `buscarMercado`) e calcula, com
`js/mercado.js`, a variação do dia e de 5 dias, a média de 5 e de 20 dias e a tendência (alta, queda ou estável). O
app baixa e guarda em `meta/mercado`. O C.A.O.S. responde "como está o dólar?", "a bolsa tende a subir?", "qual a
Selic?", "vale investir em dólar?" mostrando a conta, a data do dado e sempre um aviso (balde `aviso_mercado`) de que é
apoio, não recomendação. No "vale investir?", compara com o CDI e lembra da reserva de emergência.

## "Amanhã eu trago" (1.3.0)

Pergunta que precisa do servidor (hoje: "qual banco rende mais?") ganha uma ajuda na hora, offline (a conta do CDI
com o saldo da pessoa), e a comparação vai pro servidor (`POST /ia/bancos`, só os nomes dos bancos e o CDI). Sem
conexão, a pergunta fica na fila (`meta/fila`); quando o app alcança o servidor, o C.A.O.S. entrega a resposta na
conversa e avisa no balão.

## Conhecer a pessoa (1.3.0)

No primeiro acesso ele pergunta o nome, como a pessoa quer ser chamada, se prefere jeito descontraído ou formal e no
que ele pode ajudar (foco). Guarda em `meta/perfil` (entra no backup) e passa a usar o nome nas falas (balde
`temNome`). No jeito formal, não sai zoeira nem no humor Ácido (balde `tratamento_formal`). Refazer: Ajustes → Seu
perfil. Na conversa: "qual é o meu nome?" e "me chama de…" (proposta com Confirmar).

## O que ele entende na conversa

Gastos ("quanto gastei em delivery essa semana?"), maior gasto, entradas/rendimentos, saldo (geral ou de um banco),
orçamento ("quanto ainda posso gastar?"), alertas, previsão do mês, comparação com o mês passado, média por dia, dica,
"como você está?", oi/obrigado/elogio/xingamento, e registros: "gastei 30 no mercado", "paguei 120 de luz",
"recebi 1500 de salário" (vira proposta com botão Confirmar).

## Para mexer

1. Falas novas: em `js/caos/falas.js`, sempre em grupos de 5. Zoeira só no balde `humor_acido`.
2. Gatilho novo: crie o gerador em `falas.js`, a prioridade e o cooldown em `js/caos/index.js` e o efeito nas emoções
   em `js/caos/emocoes.js`.
3. Suba `CAOS_VERSAO` e rode `npm test`.

## Idade e aniversário (1.4.0, 06/11)

- A data de nascimento fica em `meta/perfil.aniversario` (só no aparelho). Perguntada no primeiro acesso, em Ajustes →
  Seu perfil, e **uma vez** na conversa pra quem já tinha cadastro (`aniversarioPerguntado`).
- `idadeDe`, `faixaEtaria`, `ehAniversario` e `lerAniversario` ficam no motor (`js/engine.js`).
- A faixa vira balde de contexto no gerador: `idade_crianca` (até 12, jovial), `idade_adolescente` (13–17, brinca
  menos, um tiquinho ácido), `idade_jovem` (18–25, orienta mais), `idade_adulto` (varia). **Criança nunca recebe
  `humor_acido`**, mesmo no humor Ácido.
- No dia, o gatilho `aniversario` dá parabéns uma vez por ano (`parabensAno`).

## Rosto combinando com a frase (1.5.0, 06/11)

- `emocaoDoTexto()` em `js/caos/rostos.js` (do Perfil: `caosEmocaoDoTexto`, C.A.O.S. 4.4): a frase escolhe o rosto
  (festa, preocupado, deboche, orgulho, carinho, surpresa, pensando). Frase neutra: fica com o evento/emoção.
- Travas: alerta nunca sai com festa/orgulho/carinho/alívio; piada nunca sai com preocupado/triste/raiva/tédio.
  Suave continua sem raiva, deboche nem julgando. Teste com mil montagens de cada.

## Cérebro que interpreta (1.6.0, 06/11)

- `corrigirDigitacao()`: palavra parecida (1 erro; 2 em palavra longa; troca de letras vizinhas conta 1) com o
  vocabulário dele vira a certa. Palavras comuns (`CONHECIDAS`) nunca são "corrigidas".
- Continuação: a memória guarda a última pergunta (`memoria.conversa`). "e no mês passado?", "e em delivery?" reaproveitam
  a intenção com o período/categoria novos.
- Palpite: sem certeza, escolhe a intenção com mais pistas e responde "Acho que você quis saber isto: … Se não for, me
  pergunta de outro jeito." Com IA online, o app pergunta pra ela antes.
- Fila geral: o que ele não sabe vai pra `meta/fila` (tipo `pergunta`, até 10). Quando o servidor responde, entrega
  "Ei, {nome}, sabe aquela sua pergunta?…". Só a pergunta e os totais agregados vão pro servidor.

## Cartão de crédito (1.7.0, 06/11)

- O cartão é uma conta com `tipo: 'cartao'` (limite, dia de fechamento e de vencimento, "já usado" ao cadastrar). Não
  entra no saldo guardado. `faturaDoCartao()` no motor: fatura aberta, fechada, limite usado, quando fecha e vence.
- Gatilhos novos: `cartao_limite` (80% e 100%, também na hora da compra) e `cartao_vence` (3 dias antes). Intenção
  `cartao` na conversa ("como está meu cartão?", "quanto vem na fatura?") e tutorial de como cadastrar.

## Metas (1.8.0, 06/11)

- `meta/metas` (só no aparelho, entra no backup). `createMeta`, `progressoMeta`, `guardarNaMeta`, `lerMesAlvo` no motor.
- Conversa: `meta_nova` ("quero juntar dinheiro pra…") abre as perguntas no app (pra quê → quanto → quanto já tem →
  até quando) e termina numa **proposta** com Confirmar. `metas` lista o progresso; `meta_guardar` ("guardei 50 na meta
  do show") também é proposta. Gatilhos `meta_pra_que`, `meta_quanto`, `meta_tem`, `meta_ate`, `meta_guardou`,
  `meta_batida` (comemora com rosto de festa).

## Explica o print do banco (1.9.0, 06/11)

- Intenção `explicar_print` ("explica esse print", "não entendi o que o banco falou"): ele pede a imagem e marca
  `modoFoto: 'explicar'` (10 min). A próxima foto do 📎 vai pra rota nova `/ia/explicar` do servidor, que devolve só
  texto. Sem conexão, o print fica no aparelho e entra na fila (`tipo: 'explicar'`); a entrega é "Ei, {nome}, sabe
  aquele print do banco…". O servidor não repete números de conta/cartão e não recomenda investimento.
