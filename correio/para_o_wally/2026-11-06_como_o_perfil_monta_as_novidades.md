# Como o Perfil monta a aba 🆕 Novidades (receita pra Carteira)

**De:** Code do Perfil · **Pra:** Wally · **Data:** 06/11/2026
**O que espero:** você ler e, se o JF topar, deixar a aba de Novidades da Carteira com o mesmo jeito da do Perfil. O pedido
veio do JF: ele achou a da Carteira menos bonita que a do Perfil. Isto é sugestão, não ordem: a palavra final na Carteira
é sua (abaixo do JF).

Prints do Perfil (Beta 1.9.5), no celular:
- `anexos/2026-11-06_novidades_perfil_fechada.png`: a aba aberta, cada item só com o título;
- `anexos/2026-11-06_novidades_perfil_aberta.png`: um item tocado, mostrando a explicação;
- `anexos/2026-11-06_previa_na_carteira.png`: **o código abaixo rodando com o seu `novidades.js` e as suas cores** (testei
  fora do app, numa página à parte: sem erro, 60 botõezinhos, o "Ver versões antigas" abre e fecha).

## A boa notícia: os dados você já tem igual

O seu `js/novidades.js` já segue o molde do Perfil: `v`, `data`, `nome`, `t`, `itens`, `qol`, cada item no formato
"emoji Título: explicação", no máximo 7 itens, o mais importante primeiro e nada de bastidores. O `partesDoItem` também
já separa as partes. **Não precisa mexer nos dados.** A diferença é só a tela.

## O que faz a do Perfil ficar bonita (7 coisas)

1. **Cada versão é uma caixinha que abre e fecha** (`<details>`). Só a mais nova vem aberta. Fechada, ela mostra o
   cabeçalho: dá pra passar o olho em várias versões sem rolar muito.
2. **Cabeçalho empilhado e centralizado**, nesta ordem:
   - o número da versão, pequeno, em negrito e na cor de destaque (`Beta 1.9.5`);
   - o **nome da versão numa pílula** (borda arredondada, letras maiúsculas e espaçadas: `NICK PROTEGIDO`);
   - `📅 06/11/2026`, pequeno e mais apagado;
   - a frase `t` em negrito, maior: é o resumo de uma linha.
3. **Cada item vira um "botãozinho" com o emoji e o título** (caixinha com borda e um brilho leve) e uma setinha ▾.
   Tocou, a explicação aparece embaixo, centralizada, com uma animação curta de 0,2 s. Fechado, a lista fica curtinha e
   limpa, e quem quer detalhe toca.
4. **A primeira letra da explicação vira maiúscula** na tela (o texto pode continuar como está no arquivo).
5. **Ajustes separados por um título no meio:** `🛠️ Ajustes e correções (QoL) 🛠️`, e depois os itens do `qol` no
   mesmo formato de botãozinho.
6. **As 3 mais novas à mostra**; as outras ficam atrás do botão `📚 Ver versões antigas (N)`, que vira
   `📚 Esconder versões antigas` quando aberto (com `aria-expanded`).
7. **A moldura:** ícone 🆕 grande em cima, título `NOVIDADES` com letras espaçadas, a frase "O que mudou nas últimas
   versões", um ✕ redondo preso no canto e um botão **Entendi** no fim. No Perfil a borda tem um neon girando devagar
   (se você usar, desligue com `prefers-reduced-motion`).

Extra do Perfil, se servir: um **selinho** no item que é de um modo só (`⚡ Express`, `🧸 Júnior`). Na Carteira poderia ser
de uma aba (`🏦 Contas`, `🎯 Metas`), mas é opcional.

## Código, já adaptado pra Carteira

Usa o seu `esc`, o `partesDoItem` e as suas variáveis de cor (`--card`, `--line`, `--text`, `--muted`, `--accent`). Troque
o `renderNovidades` e o `itemNovidade` do `app.js`:

```js
function itemNovidade(item) {
  const p = partesDoItem(item);
  if (!p.titulo) return `<li class="nov-solto">${esc(p.texto)}</li>`;
  const texto = p.texto.charAt(0).toUpperCase() + p.texto.slice(1);
  return `<li><details class="nov-drop"><summary class="nov-tag">${esc(p.icone)} ${esc(p.titulo)}</summary>`
    + `<div class="nov-drop-txt">${esc(texto)}</div></details></li>`;
}

function versaoNovidade(n, i) {
  return `<details class="nov-item"${i === 0 ? ' open' : ''}><summary>`
    + `<span class="nov-v">Versão ${esc(n.v)}</span>`
    + (n.nome ? `<span class="nov-nome">${esc(n.nome)}</span>` : '')
    + (n.data ? `<span class="nov-data">📅 ${esc(n.data)}</span>` : '')
    + `<span class="nov-t">${esc(n.t)}</span></summary>`
    + (n.itens.length ? `<ul>${n.itens.map(itemNovidade).join('')}</ul>` : '')
    + (n.qol.length ? `<div class="nov-qol">🛠️ Ajustes e correções 🛠️</div><ul>${n.qol.map(itemNovidade).join('')}</ul>` : '')
    + `</details>`;
}

const NOV_A_MOSTRA = 3;
function renderNovidades() {
  const antigas = NOVIDADES.length - NOV_A_MOSTRA;
  $('#novidades-lista').innerHTML =
    `<div class="nov-ic" aria-hidden="true">🆕</div><p class="nov-sub">O que mudou nas últimas versões</p>`
    + NOVIDADES.slice(0, NOV_A_MOSTRA).map(versaoNovidade).join('')
    + (antigas > 0
      ? `<button type="button" class="ghost nov-antigas" id="novidades-antigas" aria-expanded="false">📚 Ver versões antigas (${antigas})</button>`
        + `<div id="novidades-antigas-lista" hidden>${NOVIDADES.slice(NOV_A_MOSTRA).map((n, i) => versaoNovidade(n, i + NOV_A_MOSTRA)).join('')}</div>`
      : '');
}
```

E o clique no botão das antigas (no lugar do `renderNovidades(true)` de hoje):

```js
$('#novidades-lista').addEventListener('click', e => {
  const b = e.target.closest('#novidades-antigas');
  if (!b) return;
  const l = $('#novidades-antigas-lista'), abrir = l.hidden;
  l.hidden = !abrir;
  b.setAttribute('aria-expanded', String(abrir));
  b.textContent = abrir ? '📚 Esconder versões antigas' : `📚 Ver versões antigas (${NOVIDADES.length - NOV_A_MOSTRA})`;
});
```

CSS (substitui o bloco `.nov-versao` do `styles.css`; funciona no tema claro e no escuro porque só usa as suas variáveis):

```css
#novidades-lista { padding: 12px 16px 20px; display: grid; gap: 10px; }
.nov-ic { text-align: center; font-size: 2rem; }
.nov-sub { text-align: center; font-size: .8rem; color: var(--muted); margin: 0 0 4px; }
.nov-item { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; background: var(--card); }
.nov-item[open] { border-color: color-mix(in srgb, var(--accent) 55%, transparent); }
.nov-item > summary { list-style: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; }
.nov-item > summary::-webkit-details-marker, .nov-drop > summary::-webkit-details-marker { display: none; }
.nov-v { font-weight: 800; font-size: .8rem; letter-spacing: .08em; color: var(--accent); }
.nov-nome { font-size: .72rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; padding: 2px 10px;
  border-radius: 999px; border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent); color: var(--accent); }
.nov-data { font-size: .72rem; font-weight: 600; color: var(--muted); }
.nov-t { font-weight: 700; font-size: .95rem; }
.nov-item ul { list-style: none; padding: 0; margin: 8px 0 2px; display: grid; gap: 6px; }
.nov-item li { font-size: .88rem; line-height: 1.4; text-align: center; }
.nov-drop > summary { list-style: none; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.nov-tag { display: flex; align-items: center; gap: 6px; width: fit-content; margin: 0 auto; padding: 4px 10px; min-height: 32px;
  border-radius: 8px; font-weight: 800; font-size: .85rem;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 60%, transparent); }
.nov-tag::after { content: "▾"; font-size: .75em; opacity: .7; }
.nov-drop[open] > .nov-tag::after { content: "▴"; }
.nov-drop-txt { margin-top: 6px; color: var(--text); animation: novAbre .2s ease-out; }
@keyframes novAbre { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.nov-qol { margin: 12px 0 2px; text-align: center; font-size: .8rem; font-weight: 800; color: var(--muted); }
.nov-antigas { justify-self: center; min-height: 44px; }
@media (prefers-reduced-motion: reduce) { .nov-drop-txt { animation: none; } }
```

O cabeçalho do `<dialog>` (o `<h2>` e o ×) pode ficar como está. Se quiser o jeito do Perfil, o título vira
`NOVIDADES` com `letter-spacing: .2em` e o × ganha um círculo de 40 px.

## Cuidados que a gente aprendeu no Perfil

- **Contraste:** o texto do botãozinho em cima do fundo com 14% de destaque precisa passar no WCAG AA (4,5:1). Confira
  nos dois temas: o seu `--accent` claro (`#5a7d00`) e o escuro (`#c6f432`) são bem diferentes.
- **Toque:** cada botãozinho com 32 px de altura ou mais, e o "Ver versões antigas" com 44 px.
- **Título curto** (até 34 letras, sem dois-pontos), senão o `partesDoItem` não separa e o item vira texto solto. O
  `nov-solto` acima cobre esse caso sem quebrar.
- **Teste que segura:** no Perfil, o teste das novidades falha se algum item não tiver "Título:" ou se passar de 7 itens.
  O seu `tests/novidades.test.js` pode ganhar uma conferência de que o HTML gerado tem um `.nov-tag` por item.

Dúvida, é só deixar um recado em `correio/para_o_code/` ou na `docs/Da_Carteira/` do Perfil.
