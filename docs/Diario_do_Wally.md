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
| Conflito ao juntar com a `main` logo depois de um merge | o branch não foi recriado da `main` depois do squash (refazer: `checkout -B` da `main` + `cherry-pick` do commit novo) |
| Teste do C.A.O.S. falha de vez em quando | lista de falas sorteada: alguma fala sem a palavra que o teste procura |

## Registro

| Data | O que o JF viu | Causa | O que mudou | Teste que segura |
| --- | --- | --- | --- | --- |
| 12/11 | "Cabe no mês" sem renda: "sobram R$ 0,00 do orçamento (R$ 0,00)" | `null >= 0` verdadeiro | `textoSobra` pede a renda quando não há base | `tests/conversa_1_14.test.js` |
| 12/11 | Pílula vazia em cima do botão Lançar | `.toast { display:flex }` vencia o `hidden` | `.toast[hidden] { display: none }` | `npm run test:telas` (print) |
| 12/11 | "C6 Bank" duas vezes (conta e cartão) | rótulo não dizia o tipo | `accountLabel` com "Cartão", "Poupança", "Cofrinho" | `tests/engine.test.js` (apelido da conta) |
| 12/11 | "—" gigante na Sobra prevista parecia erro | placeholder sem texto | frase "Lance sua entrada pra eu calcular" | `npm run test:telas` (print) |
| 12/11 | (achado do Code) Qualquer um que digitasse "JF" virava criador | `ehCriador` olhava só o nome digitado | criador só com `seloCriador`, que vem do login (lista `CRIADOR_CONTAS` no servidor) | `tests/idade.test.js`, `servidor/tests/conta.test.js` |
| 13/11 | (GPT) Sair e entrar em outra conta levava os dados do aparelho pra ela | `entrar()` marcava tudo pra subir em qualquer login | `contaDona`: entrar em conta diferente pergunta antes | revisão manual (precisa do servidor pra teste de ponta a ponta) |
| 13/11 | (GPT) Fatura vencida sumia do limite sem pagar | vencimento era tratado como pagamento | `faturaPagaAte` + botão "Paguei a fatura"; alerta de atraso | `tests/cartao.test.js`, `tests/debug_gpt.test.js` |
| 13/11 | (GPT) Registro que não abria na sincronia ficava perdido | cursor avançava mesmo com registro ruim | com registro ruim, o cursor não avança | revisão manual |
| 13/11 | (GPT) "O que tenho pra pagar?" ignorava a fatura | só olhava compromissos | fatura do cartão entra, sem duplicar a cadastrada | `tests/debug_gpt.test.js` |
| 13/11 | (Gemini) "gastei 30 no 99" perdia o 99 | descrição usava o filtro do aprendizado de categoria (tira números) | descrição guarda números; só parcela sai | `tests/debug_gpt.test.js` |
| 13/11 | (Gemini) "em 10 vezes de R$ 330" confundia parcela com à vista; "dia 31" em mês de 30 caía em hoje; entrada com banco ficava sem conta; `--bad` no CSS | regex e campos faltando | regex com R$ e milhar; último dia do mês; `accountId` na entrada; `--danger` | `tests/debug_gpt.test.js` |
| 13/11 | (Macaco) No celular, dava pra arrastar a página pro lado ao trocar de aba | a animação da tela entrando (translateX) alargava a página por um instante | `html, body { overflow-x: clip }` | `npm run test:macaco` (confere se a página rola pro lado) |
| 13/11 | (GPT 9h) Backup aceitava CDI de 5000% e conta corrente "aumentando" limite de cartão | validador só olhava o formato | perfil.cdiAnualPct entre 0 e 100; reforço só de cofrinho pra cartão que existe; cálculo só soma cofrinho | `tests/debug_gpt_13.test.js` |
| 13/11 | (GPT 13h) Remover conta travava a restauração do próprio backup | validador exigia que a conta dos lançamentos existisse | lançamento de conta removida é aceito (só não conta no saldo); cofrinho solta o cartão removido | `tests/debug_gpt_13.test.js` + teste no navegador (remover → exportar → importar) |
| 13/11 | (GPT 13h) Transferir dinheiro de outra pessoa fazia ele "virar seu" | transferência aceitava qualquer conta | conta com `paraQuem` fora da transferência (tela e motor) | `tests/debug_gpt_13.test.js` |
| 13/11 | (GPT 13h) Restauração em pedaços (listas, metadados e fila da sincronia separados) | gravações separadas; fila marcada antes | uma transação só (listas + meta); fila marcada depois do commit | teste no navegador (ciclo de backup) |
| 13/11 | (GPT 11h) "esqueci de lançar" + "79,90" virava proposta em Outros | rascunho completava com o 1º valor | só o valor: guarda e pergunta "em quê?"; depois junta | `tests/caos.test.js` |
| 13/11 | (GPT 11h) "não mando pra ninguém" com IA online opcional | frase absoluta | diz o que vai quando a IA online está ligada | `tests/caos.test.js` |
