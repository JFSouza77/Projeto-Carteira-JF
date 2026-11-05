# Cérebro do C.A.O.S. na Carteira (C.A.O.S. 1.0.0)

O C.A.O.S. da Carteira veio do Perfil JF. O código do Perfil depende do jogo (jogadores, cartas, rodada), então
não dava pra copiar direto: vieram as **ideias e os motores**, reescritos para dinheiro.

| Parte | Veio do Perfil | Na Carteira | Onde |
| --- | --- | --- | --- |
| **Espinha (3 leis)** | 1.7.5.3 | 1ª: nunca mexe nos dados (recebe cópia congelada; registro é só proposta). 2ª: Suave nunca recebe zoeira. 3ª: erro vira silêncio, nunca trava o app. | `js/caos/espinha.js` |
| **Console de emoções** | 4.x (10 emoções, misturas, decaimento) | 7 emoções (alegria, orgulho, preocupação, irritação, tédio, curiosidade, carinho) e 3 misturas (radiante, protetor, tenso). Voltam ao calmo com o tempo real (meia-vida de 8 h). O olho muda de cor. | `js/caos/emocoes.js` |
| **Gerador de falas** | 1.7.5.1 e 4.4 | Moldes + pedaços por contexto (hora, início/fim do mês, humor, emoção). Não repete pedaço recente, palavra forte nem as últimas 12 falas. | `js/caos/gerador.js` + `js/caos/falas.js` |
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
