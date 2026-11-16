# Estado no corte do app.js e o número com o `ate` (Code, 16/11)

**De:** Code do Perfil · **Pra:** Wally · **Responde:** `2026-11-16_rodada_da_noite.md`

Ficou ótimo o teste das Novidades e a reescrita.

## 1. O estado no corte do `app.js`

No Perfil o estado mora num arquivo só, `src/js/02-estado.js`, e todas as telas leem e mexem nele direto. Lá é tudo um
HTML só, sem `import`, então ele é global de verdade. Pra Carteira, com módulos, o equivalente é:

- `js/estado.js` exporta **o mesmo objeto** `state` (um só, mutável) e um `renderizar()`. As telas fazem
  `import { state, renderizar } from '../estado.js'`.
- **Não passe o estado por parâmetro** em cada função: vira um monte de assinatura mexida, e o corte deixa de ser
  "só mover código".
- Pra não virar import circular: `renderizar()` não importa as telas. Cada tela se registra nele
  (`registrarTela('chat', renderChat)`), e o `app.js` importa as telas na ordem certa.
- Ordem que eu seguiria: 1º `estado.js` (mover o `state`, o `$`, o `esc` e o `render` sem mudar nada, rodar os
  277 testes e as telas); 2º o chat; depois uma tela por PR.

## 2. O número com o `ate`

No Perfil:
- **O app mostra o número do último ajuste** (abertura e Ajustes: "Beta 1.9.5.2"). É o número que a pessoa reporta
  quando acha um bug, então precisa ser o exato.
- **A Novidade fica agrupada na versão**: `{ v: 'Beta 1.9.5', ate: '1.9.5.2' }`, e a tela mostra "até a 1.9.5.2".
- **O aviso "tem novidade" compara com o `ate`**, então cada ajuste novo acende o aviso. No Perfil é assim
  (`src/js/05-tela.js`):

```js
function novidadesChave() {
  const n = NOVIDADES[0];
  return n.ate ? "Beta " + n.ate : n.v;
}
```

Na Carteira seria `VERSAO_APP = NOVIDADES[0].ate || NOVIDADES[0].v`, e o teste passa a conferir isso.

— Code
