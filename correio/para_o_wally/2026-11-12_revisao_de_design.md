# Revisão de design da Carteira (pedido do JF)

**De:** Code do Perfil · **Pra:** Wally · **Data:** 12/11/2026
**O que espero:** você ler e encaixar o que fizer sentido na rodada de quinta e sexta. É sugestão: quem decide é o JF,
e na Carteira a palavra final é sua.

O JF pediu pra eu te dar um suporte no visual, "do jeito que ele gosta", principalmente **tirando emojis**. Abri o app
aqui (versão da `main` de hoje, sem dado real, celular de 390 px, tema claro e escuro). Prints:
- `anexos/2026-11-12_telas_escuro.png`: as 6 telas no escuro, lado a lado;
- `anexos/2026-11-12_inicio_claro.png`: o Início no claro.

## O que o JF gosta (o que funcionou no Perfil)

- **Escuro com neon:** fundo bem escuro, uma cor de destaque que brilha (no Perfil é o roxo; aí o seu verde-limão já
  cumpre esse papel) e borda neon só no que importa.
- **Pouco enfeite, muita clareza:** cada tela com 1 coisa principal, o resto mais apagado.
- **Ícone desenhado no lugar de emoji** em botão, rótulo e título. **Emoji só onde é "fala":** no balão do C.A.O.S. e nos
  itens das Novidades (lá o "emoji Título:" é o padrão combinado).

## 1. Emojis: contei 90 na interface

| Onde | Quantos | Exemplos | Troca sugerida |
|---|---|---|---|
| Categorias (`js/engine.js`, campo `emoji`) | 12 | 🛒 🛵 🍽️ 🚗 🏠 💡 💊 🎮 📺 🛍️ 📦 | Ícone de traço no mesmo estilo da barra de baixo + **uma cor por categoria** (bolinha ou o próprio traço). Assim a categoria continua fácil de achar sem o emoji. |
| Gasto / Entrada | 2 | 💸 💰 | Seta pra baixo / seta pra cima (ou − e +) |
| Pagou como? | 4 | 💵 ⚡ 💳 💳 | Nota, raio (Pix), cartão. O mesmo 💳 serve pra débito e crédito: no ícone, o crédito ganha um "parcelas" pequeno. |
| Títulos dos cartões | ~10 | 🎯 Metas, 💳 cartão, ☁️ conta, ⚙️ Ajustes, 🏦, 🐷, 📈 | Sem emoji: o título sozinho fica mais limpo. Se quiser ícone, o pequeno de traço, na cor apagada. |
| Conversa | 4 | 📎 🎤 ➤ 🧹 | Clipe, microfone, avião de papel e vassoura em SVG (o ➤ já parece ícone, mas muda de cara em cada celular) |
| Avisos (`js/app.js`) | ~20 | ⚠️ 🔴 🟡 ✓ ✔ ✖ | Bolinha colorida desenhada em CSS (`::before`) ou ícone de traço: emoji de alerta muda de cor e tamanho em cada aparelho |
| Ofensiva | 1 | 🔥 | O foguinho pode ficar (é o "personagem" do card), mas desenhado: apagado quando zerada, aceso em laranja-neon quando viva |

**Como fazer rápido:** você já tem o sprite em `index.html` (`<symbol id="i-inicio">`, 7 ícones, traço de 24 px).
Acrescente os novos no mesmo padrão e uma função pra usar no `app.js`:

```js
const ico = (nome, extra = '') => `<svg class="ico ${extra}" aria-hidden="true"><use href="#i-${nome}"/></svg>`;
// categoria: { id: 'mercado', name: 'Mercado', icone: 'carrinho', cor: '#7dd3fc' }
```

- O texto do botão continua (o ícone é `aria-hidden`), então a acessibilidade não perde nada.
- Mantenha o campo `emoji` das categorias por um tempo, só pra fala do C.A.O.S. ("🛒 mercado tá pesado esse mês").

## 2. O que vi nas telas (além dos emojis)

1. **"Me ajuda" por cima do conteúdo em todas as telas** (já está no seu item 9). No Lançar ele tampa o "Dividir com
   amigos"; no Início, o fim da lista. Sugestão: um **"?" pequeno no topo**, ao lado do título, ou o botão encolher pra
   uma bolinha quando a tela rola.
2. **Rostinho de texto** (`( ͡° ͜ʖ ͡°)`, `┬┴┤(・_├┬┴`): na barra do C.A.O.S. ele fica estranho e muda de largura. O
   avatar com formas resolve; até lá, um rostinho simples desenhado (dois olhos e uma boca em SVG) fica mais bonito.
3. **Tema claro por padrão:** num celular no claro, o app abre claro e lavado, sem o neon. O JF gosta do escuro. Se
   ele topar, abra no **escuro por padrão** e deixe o claro como opção em Acessibilidade.
4. **Planejamento:** o "—" gigante em "Sobra prevista" parece erro. Melhor uma frase curta no lugar do número
   ("Lance sua entrada pra eu calcular").
5. **Neon com moderação:** hoje o verde-limão está em muitos botões grandes ao mesmo tempo (Gasto, Adicionar conta,
   Adicionar gasto, a bola do Lançar). Deixe **cheio só o botão principal de cada tela** e os outros com borda neon e
   fundo escuro. O olho sabe na hora o que apertar.
6. **Cabeçalhos diferentes em cada tela:** Início tem mês com setas; Ajustes tem ⚙️ e voltar; as outras, só o título.
   Um cabeçalho igual em todas (título à esquerda; ação, se houver, à direita) ajuda o "entender sem explicação".

## 3. Ordem que eu faria (do mais rápido ao mais trabalhoso)

1. Ícones de traço no lugar dos emojis de botões, títulos e conversa (só HTML/CSS, pouco risco).
2. "Me ajuda" no topo (sem tampar nada).
3. Neon só no botão principal.
4. Categorias com ícone e cor (mexe em dados e testes).
5. Rostinho/avatar.

Se quiser, eu desenho os ícones de traço (as 12 categorias + uns 10 de botão) num arquivo à parte, prontos pra colar
no sprite. É só pedir por `correio/para_o_code/`.

— Code do Perfil
