# Auditoria do GPT (16/11/2026): vereditos do Wally

O GPT analisou as cópias `.txt` do C.A.O.S. 2.3.2 (as mesmas que foram pro Gemini). O código no ar já é o 2.3.7
(app 2.1.3 Alfa). Cada achado foi conferido no código atual. Relatório original: `2026-11-16_gpt_auditoria.md`.

## Correções prioritárias (P0 e P1)

| Achado | Veredito | Onde está |
| --- | --- | --- |
| Gerador gasta o balde "geral" antes da 2ª passada | Já corrigido (2.1.2, achado do Gemini) | `js/caos/gerador.js` `escolherSlot` |
| Corretor muda palavra certa (gosto, gato, mesa, maio…) | Já corrigido. A ideia de "mínimo 5 letras" quebrava "sado" → "saldo"; ficou "4 letras só por inserção" | `js/caos/conversa.js` `CONHECIDAS` |
| Trava do "o que é" só valia pra metade do limite investido | Já corrigido (parênteses) | `conversa.js`, `limite_investido` |
| Nome entrando no silêncio, no apelido e mudando maiúscula | Já corrigido (2.1.2 e 2.1.3) | `js/caos/index.js` |
| "jogo" em Lazer impedindo a categoria Jogos | Já corrigido (`SINONIMOS.jogos`, cai em Lazer se não existir) | `conversa.js` |
| Moedas VP, UC, jades, fragmentos | Já corrigido | `js/caos/moedas_jogos.js` |
| Entrada prevista: "dia 16" no dia 16, dia 31 em mês curto, "na sexta" | Já corrigido | `conversa.js`, `registrar_entrada` |
| Vários pagamentos do print perdiam os avisos | Já corrigido (junta os eventos) | `js/telas/chat.js` `confirmarAcao` |
| Cache e fila usavam a pergunta sem o assunto | Já corrigido (`textoIA` + humor na chave) | `chat.js` `enviarPergunta` |
| Humor do criador × Suave em conflito | Já corrigido (`humorParaIA` no app; criador = Ácido no servidor, pelo selo da conta, nunca por campo do app) | `chat.js`, `servidor/worker.js` |

## Itens de integração

| Achado | Veredito |
| --- | --- |
| `fluxoMeta` × `metaFlow` | Não é bug: `fala.fluxoMeta` é o pedido do C.A.O.S.; `state.metaFlow` é o passo a passo da tela. Nomes diferentes de propósito. |
| MIME fixo `image/jpeg` | Não é bug: `js/imagens.js` sempre recomprime a foto em JPEG antes de guardar e mandar. |
| Foto de comprovante sem forma e conta | Já feito na 2.1.3 (`lerPagamento` / `seguirPagamento`). |
| Notícias com `pause_turn` | Já feito (continua a busca e tenta de novo em 1 hora se vier vazio). |
| Fuso horário | Já feito onde importa (data da foto em Brasília). O limite do dia fica em UTC de propósito: é só contador. |
| Voz lendo `**` e `{nome}` | **Corrigido agora (2.1.3.1):** a limpeza foi pro `textoParaVoz`, que vale pra toda fala. |
| Apelido usado como adjetivo | Já corrigido (só vale como vocativo). |
| Intensidade do rosto no Suave | Já feito na 2.1.3. |

## Melhorias estruturais

- **Contexto da IA só com totais:** já é assim (`resumoAgregado`). Compromissos e faturas abertas ficam pra depois, se a IA
  errar por falta deles.
- **Intenções novas** (corrigir valor, transferência, consulta por loja, dar baixa): as quatro já existem
  (`corrigir_valor`, `registrar_transferencia`, filtro "só de X", `fatura_paga` / `racha_pago`), todas com Confirmar.
- **Dividir o `conversa.js`:** concordo que é separado dos bugs. Fica pra depois, com testes antes.

## Pergunta do JF ao GPT: "mais potente gastando menos crédito"

A maior parte do que ele sugeriu já está no app: o cérebro do aparelho responde primeiro, a pergunta vai com o assunto,
há cache com humor na chave (no aparelho e no servidor), limite por dia, busca na web só pra dinheiro, questionário antes
da pesquisa e a personalidade vinda do gerador local. O que faltava era **medir**: entrou na 2.1.3.1 o contador do mês
(Ajustes → IA online), com respostas do aparelho, da memória e da IA, e o motivo de cada chamada.

Prompt caching no servidor foi avaliado e **não entra agora**: o texto fixo da conversa tem cerca de mil e poucos tokens,
abaixo do mínimo que o cache aceita, e as perguntas chegam espaçadas (o cache dura minutos). Não economizaria nada.
