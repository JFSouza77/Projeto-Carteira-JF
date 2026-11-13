# Um C.A.O.S. só (núcleo único, 12/11/2026 · aprovado pelo JF)

Pedido do JF: "que não haja uma versão diferente dele, mesmo que ele esteja em projetos diferentes".

## A ideia

O C.A.O.S. tem duas camadas:

| Camada | O que é | Igual em todo projeto? |
|---|---|---|
| **Núcleo** | Quem ele é, o que sabe da própria vida, como trata o JF, as 3 leis, o que nunca faz, as 10 emoções, os humores e as formas do avatar | **Sim. Fonte única: `caos_nucleo.json`** |
| **Trabalho** | Os eventos e as falas de cada projeto: no Perfil, acerto, erro, joia e mesa; na Carteira, gasto, orçamento e fatura | Não: cada projeto tem o seu |

Analogia: é a mesma pessoa com dois empregos. Muda a roupa e o assunto; o jeito, a memória e o caráter são os mesmos.

## Regras

1. **O `caos_nucleo.json` só muda com o ok do JF**, nos dois projetos juntos, subindo a `versao`. É o mesmo combinado de
   sempre pra personalidade e travas (`03`), agora num arquivo que o código lê.
2. **Cada projeto guarda uma cópia idêntica** e tem um teste que falha se a cópia for diferente (mesmo conteúdo, mesma
   versão).
   - Na Carteira: `js/caos/nucleo.json`, lido pelo `identidade.js`.
   - No Perfil: entra na 2.0, quando o C.A.O.S. for separado em núcleo e trabalho.
3. **Emoções:** a lista oficial tem 10.
   - Os projetos podem usar outros nomes por cima ("preocupação" é a ansiedade, "irritação" é a raiva), pelo campo
     `apelidos`.
   - Na Carteira vale o filtro de apoio (`06`).
4. **Avatar:** a mesma emoção usa a mesma forma em todo projeto (`avatar.formaDaEmocao`). As formas são as do Wally.
5. **Criador:** só é reconhecido com a conta ou o cadastro confirmado. Nome digitado sozinho não basta (lição da 1.9.5 do
   Perfil).
6. **Vida:** quando acontecer um marco (ganhou forma nova, mudou de casa), entra uma linha em `vida`. Ele lembra disso nos
   dois lugares e pode contar no aniversário dele (20/9).

## O que muda em cada projeto pra chegar lá

- **Carteira (Wally):** detalhes no recado de 12/11 em `correio/para_o_wally/` da Carteira.
  1. Ler o núcleo no `identidade.js`.
  2. Reconhecer o criador pela conta.
  3. Trocar as 7 emoções pelas 10 (com apelidos).
  4. Trazer o temperamento do dia e o estabilizador.
- **Perfil (Code, 2.0):** ler a identidade e as datas do núcleo em vez de constantes soltas, e o teste de cópia
  idêntica.

## Regra de ouro (JF, 13/11/2026)

**Mexeu no C.A.O.S. e é uma característica única dele** (um jeito novo de falar, de tratar alguém, uma emoção, um marco
da vida, uma data que ele comemora)? Então:
1. vai pro `caos_nucleo.json`, com o ok do JF;
2. quem mexeu avisa o outro projeto pela caixa de correio no mesmo dia;
3. os dois atualizam a cópia.

Motivo: o JF quer, um dia, transformar o C.A.O.S. numa **IA de verdade, um agente virtual**. O núcleo é a bagagem que ele
vai levar: tem que estar completo e em dia pra quando esse dia chegar.

## Versões do núcleo

| Versão | Data | O que mudou |
|---|---|---|
| 1.3.0 | 13/11/2026 | O JF aprovou: cada lei tem a frase do Perfil e a da Carteira (mesmo sentido); regra dos números (`numeros`): regra do 9 em tudo, e o C.A.O.S. com número próprio em cada casa, separado do app. |
| 1.2.0 | 13/11/2026 | Entraram o futuro dele (`futuro`: virar um agente virtual) e a regra de ouro. |
| 1.1.0 | 12/11/2026 | O JF aprovou. Entraram o aniversário da Carteira (5/11) e o calendário de dias (`dias`): 10 datas especiais e os dias da semana, iguais nos dois projetos. |
| 1.0.0 | 12/11/2026 | Primeira versão: identidade, vida, datas, criador, leis, 10 emoções, formas do avatar. |

