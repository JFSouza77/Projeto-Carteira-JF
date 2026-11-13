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

## Parte 2 (sobre a v1.24) — veredito do Wally

| Achado | Veredito | Feito |
| --- | --- | --- |
| 1.1 Fatura não paga sumia quando passava mais um fechamento | confirmado | soma desde o último "Paguei a fatura"; ciclo anterior sem pagar = atrasada |
| 1.2 Backup sem perfil mantém o perfil do aparelho | **não muda**: o perfil é de quem usa o aparelho (nome, aniversário), não dos dados; apagar faria o C.A.O.S. esquecer a pessoa ao restaurar um backup antigo dela | — |
| 2.1 Rachadinha no cartão: o Pix do amigo não entra em conta nenhuma | confirmado, depois | precisa perguntar em qual conta o Pix caiu (entra na lista) |
| 2.2 Lembrete do celular ignorava conta fixa sem valor (0) | confirmado | mesma regra do motor |
| 2.3 Voz sem medo, nojo e vergonha | confirmado | `JEITO` com as 3 |
| 3.1 Voz lia "R$ 600.000" errado | confirmado | centavos opcionais |
| KV x Durable Object / quebrar o `app.js` | de acordo | Pendências |
