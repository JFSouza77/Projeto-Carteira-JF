# Limites da IA do C.A.O.S. (JF, 17/11/2026)

O C.A.O.S. é uma **IA de bolso de finanças**, não um buscador. Pra não virar "IA faz tudo" e não pesar no bolso do JF
(a IA online é paga por uso), toda pergunta cai num destes níveis. Quando o app crescer (lojas, renda), os números
sobem; a regra continua.

| Nível | O que é | Exemplos | Limite (por aparelho) | Onde está no código |
| --- | --- | --- | --- | --- |
| **Sem IA** | Tudo que o app sabe sozinho | gastos, saldo, metas, contas, glossário, cálculos, dicas, apagar/corrigir, conferir um preço que a pessoa digitou, questionários dos planos | sem limite | `js/caos/` (conversa local) |
| **Leve** | Conversa com a IA, sem pesquisa de preço | desabafo, papo (no Papo livre), pergunta de finanças que ele não sabe sozinho | dentro do total de 20 por dia | `fala.nivelIA = 'leve'` |
| **Média** | Pesquisa de preço rápida, resposta curta | ingresso (cinema, teatro, show, jogo), academia, custo médio, piso salarial, plano de pet/moradia/transporte, carro e moto (Tabela FIPE), estimativa de imposto de renda (sempre com o aviso de estimativa) | **7 por dia** | `nivelIA = 'media'`, `MEDIA_POR_DIA` |
| **Pesada** | Várias buscas, compara lojas ou compatibilidade | tecnologia (celular, notebook, RAM, peça de PC), eletrodoméstico, impressora, passagem de viagem, conferir link de loja, venda de usado, compra que a pessoa pediu pra pesquisar | **1 por dia** | `fala.pesada`, `PESADA` |
| **Não faz** | Fora do papel de parceiro financeiro | escolher roupa ou coisa pessoal, "o que comprar no shopping", procurar loja sem pedido, comprar ou reservar por você, curiosidade sem dinheiro (filme, futebol, capital) | nunca: indica Google ou outra IA, e ajuda no que é de dinheiro | `BALCONISTA`, `respostaForaDoFoco`, `respostaPapoLivre` |

Regras de convivência:

- **Antes de pesquisar, filtra** ("me ajuda a te ajudar"): os planos fazem perguntas no celular, sem gastar IA, e só
  então fazem UMA pesquisa certeira.
- Acabou o limite: ele avisa com bom humor, indica outro chat (ChatGPT, Gemini, Copilot, Claude, DeepSeek, Grok) e dá
  o caminho das pedras (`CAMINHO_PLANO`). Nunca deixa a pessoa na mão.
- O criador (selo da conta) não tem esses limites, como no resto da IA.
- "O que você pode pesquisar?" no Chat mostra este resumo pra pessoa (`TEXTO_LIMITES_PESQUISA`).

## Viagem (JF, 17/11): ele te leva pra pescar

Ele não faz plano de viagem, não escolhe pousada nem confere hospedagem. Ele acha a **passagem que cabe no seu
orçamento** (de onde, quando, quantas pessoas, se as datas são flexíveis, quanto dá pra gastar) e depois dá o
**caminho das pedras** pro resto (hospedagem, comida, transporte, seguro): "te deu o peixe e te ensinou a pescar".
Dúvida de finanças depois disso ("vale mais a pena isso ou aquilo?", "cabe no mês?") volta pra conversa normal.

## Humor: muda o jeito, nunca a ajuda (JF, 17/11)

- **Suave**: sempre gentil e educado.
- **Normal**: uma implicadinha leve ("tá achando que tá rico, é?") e ajuda.
- **Ácido**: zoa com os números do mês ("nem se tu fosse a pessoa mais rica do mundo… este mês já saíram R$ X") e ajuda.
- **50+ no Ácido**: zoeira mais leve ("será que a gente não tá velho pra pensar nisso? Brincadeira!"). Criança não leva.
- Ele brinca, reclama, mas **nunca nega a ajuda**. (`provocacao()` em `js/caos/index.js`, listas `PROVOCA_*`.)

## Filtros de escopo (JF, 17/11)

| Assunto | O que ele faz |
| --- | --- |
| Política, eleição, "qual o melhor time" | Imparcial, sem lado. Volta pro bolso (imposto, benefício, salário mínimo explica). |
| Previsão do tempo, placar, "quem vai ganhar", número da Mega | "Vidente eu não sou!" e oferece a previsão do **mês** da pessoa. |
| Bicho silvestre (onça, macaco, papagaio…) | Leva na brincadeira, lembra do IBAMA e oferece o custo de adotar cachorro ou gato. |
| Droga ilícita | Não compactua: não dá preço, lugar nem compara. Se a pessoa quiser anotar o gasto, anota (o controle é dela) e indica o CAPS AD do SUS. |
| Cigarro, vape, narguilé | Anota e lembra da saúde. Não pesquisa preço (vape tem venda proibida no Brasil). |
| Brinquedo (skate, patins, patinete, Lego…) | Não pesquisa. Anota o gasto e ajuda a programar a compra (meta). |
| Bebida alcoólica (cerveja, pinga, barzinho…) | Anota sempre; brinca de vez em quando ("nem me chama?"); se o mês pesar, conselho de graça; muito alto, lembra dos Alcoólicos Anônimos. |
| Recorde de preço ("o carro mais caro do mundo", "o homem mais rico", "quanto custa um jatinho") | Não pesquisa: brinca ("um Fusca 87", "susto na pobreza") e puxa pro bolso da pessoa. |
| Quantidade absurda ("100 kg de peixe") | Anota o valor certo e zoa ("dá pra alimentar os 101 dálmatas"). |
