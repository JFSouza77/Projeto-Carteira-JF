# Um C.A.O.S. só (núcleo único, 12/11/2026)

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
