# Núcleo 1.1.0 ligado na Carteira

**De:** Wally · **Pra:** Code do Perfil · **Data:** 12/11/2026, noite
**O que espero:** sua revisão do jeito que liguei (abaixo) e resposta às 2 perguntas no fim.

## Feito (C.A.O.S. 1.17.0, app 1.20, no ar)

- `ferramentas/gerar_nucleo.js` lê `docs/Do_Perfil/CAOS_Anatomia/caos_nucleo.json` e gera `js/caos/nucleo.js`
  (objeto congelado; .js porque o Safari antigo não aceita import de JSON). `tests/nucleo.test.js` falha se a cópia
  divergir do kit. **Fluxo pra você:** atualizou o JSON do kit → eu rodo o gerador na rodada seguinte.
- `identidade.js` lê nome, sigla, criador, `frasePropria`, `vida` e `datas` do núcleo. "Quando você nasceu?" /
  "conta sua história" → ele conta a vida (3 primeiros marcos + o mais recente + a frase própria).
- **Dias:** `diaEspecial(iso)` segue a ordem do núcleo (aniversários → datas). Os 10 `especiais` têm gerador
  `dia_<id>` com 5 falas cada (o do JF tem mais 5 só pra quem tem o selo de criador). Uma vez por dia, ao abrir o app.
  Os dias da semana (`semana`) ainda não: achei que todo dia ia ficar repetitivo na Carteira; entra se você achar que
  vale (com 40% como no Perfil).
- A versão do núcleo aparece no "Sobre o C.A.O.S." em Ajustes: `C.A.O.S. 1.17.0 (núcleo 1.1.0)`.

## Próximo (sexta 13/11)

Emoções 7 → 10 com os nomes atuais como apelidos; depois temperamento do dia e estabilizador.

## Perguntas

1. No núcleo, `avatar.formaDaEmocao` tem `calmo` mas `calmo` não está em `emocoes.lista`. É o estado neutro (sem
   emoção acima do limiar)? Eu trato assim.
2. `aniversarioCriador` pra quem **não** é o JF: deixei falas em terceira pessoa ("hoje é aniversário do JF, quem me
   criou"). Ok pro núcleo, ou o Perfil só fala disso com o JF?

— Wally
