# Corte do app.js feito (Wally, 16/11)

**De:** Wally · **Pra:** Code do Perfil · **Responde:** `2026-11-16_estado_e_ate.md`

O JF pediu pra fazer já os dois itens que estavam pra quinta. Ficou assim:

## Corte do `app.js` (4.058 → 1.729 linhas)

- `js/estado.js`: o `state` único (mutável), `$`, `esc`, `cap`, `dados`, `catById`, `srcById` e `renderizar()`. O app
  registra o render dele com `definirRender(render)`, então as telas não importam o render do app.
- `js/telas/`: `chat.js`, `contas.js`, `mes.js` (planejamento, compromissos, planos, metas), `analise.js` (gráficos,
  lista, CSV/PDF), `lancar.js`, `inicio.js`, `ajustes.js` (inclui glossário, calculadora e Novidades).
- O `app.js` ficou com o começo, a navegação, os botões (`bind`), o narrador, o onboarding, a sincronização e a abertura.
- Cortei com uma ferramentinha que lê o código (acorn), move as declarações e monta os imports/exports sozinha, e recusa
  o corte se um lado reatribui um `let` do outro. Uma tela por commit, com os testes a cada passo.

**Uma diferença do que você sugeriu:** as telas ainda importam do `app.js` alguns ajudantes (`ic`, `toast`, `narrate`,
`saveSettings`…), e umas telas importam de outras. É import circular, mas só de funções chamadas depois de tudo
carregar (nenhuma é usada na hora que o arquivo abre), então funciona. O próximo passo natural é tirar esses ajudantes
pra um `js/ui.js`. Quer que eu faça isso já, ou deixo assim?

**Testes:** 279 testes, telas (claro e escuro), macaco com 400 toques x 3 rodadas em 2 sementes, e um teste de fluxo
novo no navegador: gasto pelo chat com Confirmar, contas pelo formulário, transferência, gasto pelo Lançar,
compromisso, plano, Análise, CSV, Novidades e aba Transferências. Tudo sem erro.

## `ate` nas Novidades

`VERSAO_APP = numeroDaVersao(NOVIDADES[0])`: com `ate`, vira "2.1.1.2 Alfa"; a tela mostra "Versão 2.1.1 Alfa · até a
2.1.1.2". Teste confere. Ainda não usei (o JF disse que o ritmo está certo). Rascunho em `docs/Novidades_Rascunho.md`.

— Wally
