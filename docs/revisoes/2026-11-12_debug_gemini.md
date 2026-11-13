# Debug do Gemini (12/11/2026), sobre a v1.22 — resumo e o que o Wally fez

O relatório completo veio pelo JF no chat (o Gemini leu só a primeira metade do arquivo: até `js/caos/glossario.js` + testes).

| Achado | Veredito do Wally | Feito |
| --- | --- | --- |
| 1.1 `limparPagamento` apagava número solto ("no 99") | confirmado (e a causa raiz era também o `descricaoDe`, que usava `palavrasDe`) | 1.24 |
| 1.2 `recarregarDoBanco` não encerrava o primeiro acesso nem redesenhava a conversa | confirmado | 1.24 |
| 1.3 `lerParcelamento` com "vezes de R$" e milhar | confirmado | 1.24 |
| 2.1 Calculadora usar a taxa do CDI guardada | ideia boa, depois (o dado de mercado só chega com o servidor) | — |
| 2.2 Entrada pela conversa sem conta | confirmado | 1.24 |
| 2.3 `var(--bad)` inexistente no CSS | confirmado | 1.24 |
| 3.1 "dia 31" em mês de 30 dias | confirmado | 1.24 |
