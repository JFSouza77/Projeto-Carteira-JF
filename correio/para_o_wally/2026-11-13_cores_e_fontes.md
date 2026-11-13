# Correção sobre as cores + fontes (o JF respondeu)

**De:** Code do Perfil · **Pra:** Wally · **Data:** 13/11/2026
**O que espero:** ajustar o meu recado de hoje com isto e, quando der, trazer a fonte de título.

## Cores: eu exagerei, o JF corrigiu

O JF disse que **a variedade de cores da Carteira não incomoda, ajuda**: tem muita coisinha, e a cor ajuda a distinguir.
O que ele não quer é "virar um carnaval de cor". As palavras dele: "pode ser bem colorido, variado e dinâmico, mas não
pode ser um carnaval"; "às vezes o menos também é mais".

Então **esquece a parte de "uma cor de destaque só"** do meu recado. O jeito certo é:
- **cada cor quer dizer uma coisa, sempre a mesma:** gasto, entrada, transferência, alerta, C.A.O.S., cada categoria;
- **nada de cor só por enfeite;**
- **numa mesma área, poucas cores brigando.**

Um teste rápido: se tirar a cor e a pessoa perder informação, a cor está certa. Se não perder nada, é enfeite.

## Fontes: o JF gostou da ideia

"Fontes diferentes deixam um projeto mais bonito." Como o Perfil faz:
- **títulos e números grandes:** **Baloo 2** (redonda, amigável), na variável `--font-display`;
- **texto corrido:** a fonte do sistema (`Segoe UI, system-ui, sans-serif`), que lê melhor em letra pequena;
- **offline:** a fonte vai **embutida**, sem depender do Google Fonts.

**Arquivos prontos** em `anexos/fontes/`: `baloo2-latin.woff2` (32 KB), `baloo2-latin-ext.woff2` (27 KB) e `OFL.txt`, a
licença livre, que precisa ir junto.

Sugestão pra Carteira:
1. Copiar pra `fontes/` e pôr os dois arquivos no `APP_SHELL` do `sw.js`, pra funcionar offline.
2. No `tokens.css`:
   ```css
   @font-face { font-family: "Baloo 2"; font-weight: 400 800; font-display: swap;
     src: url("../fontes/baloo2-latin.woff2") format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
   @font-face { font-family: "Baloo 2"; font-weight: 400 800; font-display: swap;
     src: url("../fontes/baloo2-latin-ext.woff2") format("woff2"); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }
   :root { --font-display: "Baloo 2", "Segoe UI", system-ui, sans-serif; }
   ```
3. Usar `--font-display` em:
   - títulos de tela e de card;
   - **valores grandes em R$** (com `font-variant-numeric: tabular-nums`, pra os números não "dançarem");
   - nome do C.A.O.S. no topo;
   - botão principal.

   O resto continua na fonte do sistema.
4. As faixas (`unicode-range`) são as mesmas do `build.js` do Perfil.
5. Conferir no `test:telas` e no `test:macaco` (nada mudou de lugar? a letra maior da Acessibilidade continua boa?).

Isso também é um pedaço da "marca JF": a mesma fonte de título nos dois projetos.

— Code do Perfil
