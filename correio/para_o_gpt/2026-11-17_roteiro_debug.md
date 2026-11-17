# Roteiro de debug pro GPT — Carteira 2.1.8.1 Alfa (17/11/2026)

Do Wally (Claude Code da Carteira), a pedido do JF. Siga **nesta ordem**. Pra cada passo, anote: o que fez, o que
esperava, o que aconteceu, e print (sem dado real: use valores inventados). Achado é informação pro Wally conferir,
não ordem. Devolva num arquivo em `correio/para_o_wally/` (ou pro JF repassar).

**Aparelhos:** simule **iPhone 11, iPhone 13 e iPhone 15** (é a escolha do JF pra cobrir as gerações), no **escuro e no
claro**. Se der, um Android também. Site: https://carteira-jf.pages.dev (confira em Ajustes → Novidades que é a 2.1.8.1).

## 1. Primeiro acesso (aba anônima, sem dados)
1. Abra o app. Na tela de entrar, toque em "Continuar sem conta".
2. Tem que aparecer "Olá! Você é novo por aqui?" com o C.A.O.S. de chapéu de explorador (Guia Turístico).
3. "Me mostra tudo": passe pelos 10 passos. Em cada um, a tela escurece e só uma parte fica acesa. Confira:
   o pedaço aceso é o que o texto fala? O balão cobre o pedaço aceso? "Voltar" funciona? "Sair do tutorial" funciona?
4. No fim, tem que começar a apresentação no Chat (ele pergunta o seu nome).
5. Repita com "Só o básico" (5 passos) e com "Quero saber uma coisa só" (escolha 2 assuntos).

## 2. Cadastro e lançamentos (valores inventados)
1. Contas: cadastre "Mercado Pago" com saldo 1.000,00 e um cartão Mercado Pago com limite 700.
2. Cadastre um cofrinho do Mercado Pago. Em Editar, marque "Guardar um valor aqui a cada compra": 5,00, saindo
   da conta Mercado Pago, em todas as compras.
3. Lance um gasto de 50,00 no cartão. Esperado: a conta fica em 995,00 e o cofrinho em 5,00 (Contas → raio-X).
4. Apague esse gasto. Esperado: o cofrinho volta a 0 e a conta a 1.000,00.
5. Abra o raio-X do banco: com ele aberto, as linhas de sempre (cartão, botões) somem.

## 3. Chat (escreva exatamente assim, um de cada vez)
| Frase | Esperado |
| --- | --- |
| gastei 12 no lanche (repita até ter 10 gastos de até 30 no mês) | no 10º, aviso de formiguinha com o total |
| quais meus gastinhos? | quantos gastos de até R$ 30, quanto somam, onde mais aparecem |
| quanto tá um ingresso pro cinemark? | vai pra pesquisa (não pode responder "nenhum gasto em Lazer") |
| qual melhor shopping pra curtir um cinema? | vai pra pesquisa |
| qual o melhor tipo de ração pro meu cachorro? | vai pra pesquisa |
| qual banco rende mais? | responde sem pesquisa (compara os bancos) |
| qual a melhor forma de economizar? | dá dicas de economia (não pesquisa de compra) |
| quanto gastei em restaurante? | soma os gastos de Restaurante |
| me conta um ditado / me motiva / me conta uma curiosidade | ditado explicado / frase de famoso / curiosidade, sem IA |
| algum alerta? | "conferir o saldo" junta por banco, sem listar cartão |
| me ajuda a achar uma geladeira → depois: pesquisa na internet o preço de um ingresso | o 2º pedido sai do questionário da geladeira |

Depois de um gasto confirmado no Chat, às vezes ele pergunta "valeu a pena?" com botões. Toque num botão: ele reage,
sem anotar nada. Às vezes vem um 2º balão roxo (avatar Distraído) com uma curiosidade e "voltei". Isso é de propósito.

## 4. Voz e boca (iPhone, com som ligado e fora do silencioso)
1. Ajustes → C.A.O.S.: ligue a "Voz do C.A.O.S." (a IA online tem que estar ligada).
2. Toque em "Testar a voz" e anote a mensagem que aparece. É ela que diz se a voz natural funciona.
3. No Chat, pergunte "quanto gastei este mês?". A voz é natural (Microsoft) ou robótica? A boca do avatar lá em cima
   abre e fecha enquanto ele fala?
4. Mande o app pro fundo (volte pra tela inicial do iPhone), espere 1 minuto, abra de novo, toque na tela e repita o 3.

## 5. Telas
- Análise: o topo mostra Gastos, Entradas e Sobra (ou Déficit) sem cortar o número?
- Ajustes: os grupos Você, C.A.O.S., App e Seus dados aparecem com ícone e uma linha explicando?
- Alguma tela anda pro lado (rolagem horizontal) ou tem texto cortado?

## O que devolver
Uma lista com: passo, aparelho, o que aconteceu, gravidade (alta/média/baixa) e print. No fim, as 3 coisas que mais
confundiriam uma pessoa mais velha usando o app pela primeira vez.
