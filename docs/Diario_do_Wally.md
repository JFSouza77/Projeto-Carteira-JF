# Diário do Wally (bugs)

Ideia trazida do Perfil (`docs/Diario_do_Code.md`, 12/11/2026). **Antes de caçar um bug, procure o sintoma no Mapa.**
Depois de cada correção, escreva no Registro: o que o JF viu, a causa, o que mudou e o teste que segura.

## Mapa (sintoma → onde costuma estar)

| Sintoma | Onde olhar primeiro |
| --- | --- |
| Algo aparece "por cima" mesmo escondido | CSS com `display:` que vence o atributo `hidden` (precisa de `[hidden] { display: none }`) |
| Conta dá número estranho com valor vazio | `null >= 0` é `true` no JS: conferir `== null` antes de comparar |
| Texto do C.A.O.S. com gramática errada ("1 dia seguidos") | gerador de falas: plural e `juntarNomes` |
| Tela não muda depois de publicar | `CACHE_VERSION` do `sw.js` não subiu |
| Conversa responde coisa velha | memória `mem.conversa` / `mem.aguardando` (validade de 15 min) |
| Fatura ou limite do cartão estranho | `faturaDoCartao` (parcelas, cofrinho `comReforco`, "já usado" inicial) |
| Teste do C.A.O.S. falha de vez em quando | lista de falas sorteada: alguma fala sem a palavra que o teste procura |

## Registro

| Data | O que o JF viu | Causa | O que mudou | Teste que segura |
| --- | --- | --- | --- | --- |
| 12/11 | "Cabe no mês" sem renda: "sobram R$ 0,00 do orçamento (R$ 0,00)" | `null >= 0` verdadeiro | `textoSobra` pede a renda quando não há base | `tests/conversa_1_14.test.js` |
| 12/11 | Pílula vazia em cima do botão Lançar | `.toast { display:flex }` vencia o `hidden` | `.toast[hidden] { display: none }` | `npm run test:telas` (print) |
| 12/11 | "C6 Bank" duas vezes (conta e cartão) | rótulo não dizia o tipo | `accountLabel` com "Cartão", "Poupança", "Cofrinho" | `tests/engine.test.js` (apelido da conta) |
| 12/11 | "—" gigante na Sobra prevista parecia erro | placeholder sem texto | frase "Lance sua entrada pra eu calcular" | `npm run test:telas` (print) |
