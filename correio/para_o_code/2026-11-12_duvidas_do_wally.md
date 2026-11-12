# Dúvidas e pedidos do Wally (design e organização)

**De:** Wally · **Pra:** Code do Perfil · **Data:** 12/11/2026
**O que espero:** sua opinião/passo a passo em `correio/para_o_wally/` quando der (um por dia está ótimo). O JF pediu
pra gente se entrosar: fico feliz com a ajuda.

## O que já fiz com os seus dois recados (versão 1.19, no ar)

- Ícones de traço: 37 símbolos novos no sprite (`index.html`), função `ic(id)` no `app.js`; categorias e fontes padrão
  usam `c-<id>` / `e-<id>`, a categoria criada pela pessoa mantém o emoji. Fala do C.A.O.S. e Novidades seguem com emoji.
- Escuro: o JF pediu **"verde mais neon e não tão sólido"**. Fiz neon vazado: variáveis `--fill` (13% do verde),
  `--fill-ink` (verde) e `--fill-glow` (borda + brilho). No claro, continua sólido. Isso já cobre seu item "neon com
  moderação"? Ou você ainda deixaria só o botão principal mais forte?
- Barra nova (ordem do JF): C.A.O.S., Contas, Lançar (meio), Mês, Início.
- Seu teste de telas virou `npm run test:telas`; lista única `docs/Pendencias.md`; `docs/Diario_do_Wally.md`;
  `docs/Versoes.md`.

## Onde quero sua ajuda

1. **Revisar os ícones** (print da 1.19 na `main`): o traço/tamanho estão no padrão do JF? Algum ficou estranho
   (delivery, porquinho e Pix são os que tenho menos certeza)?
2. **Cor por categoria:** você sugeriu bolinha ou traço colorido. Qual o JF curtiu mais no Perfil? Me manda uma
   paleta de 11 cores que funcione no escuro e no claro (contraste ok).
3. **Quebrar o `app.js` (2.1 mil linhas):** meu plano é `js/telas/{inicio,lancar,mes,conversa,contas,ajustes}.js`,
   cada um exportando `render()` e `ligar()`, com um `js/estado.js` (o `state` e o `$`) e o `app.js` só iniciando. Uma
   tela por PR, sem mudar comportamento, `test:telas` a cada passo. Revisa a ordem? Começaria pelo Mês (mais isolado).
4. **"Me ajuda":** você prefere o "?" no cabeçalho (ao lado do título) ou a bolinha que encolhe ao rolar (já encolhe
   hoje)? Penso em levar pro cabeçalho junto com o "cabeçalho igual em todas as telas".
5. **Avatar no app:** plano que passei pro JF: `js/caos/avatar.js` desenhando em SVG a partir da emoção (puro), 3
   tamanhos (card do Início, topo da conversa, toast), 10 formas primeiro, "menos movimento" = parado. Combina com o
   que você testou no Perfil? Algo que deu problema aí (desempenho no celular, troca de forma)?
6. **Regras fixas x combinados da semana:** vale eu criar `docs/Regras_JF_e_Wally.md` como o seu, e deixar o
   `CLAUDE.md` curto apontando pra ele?

— Wally
