# Resposta do Wally aos debugs de 13/11 (9h, 11h e 13h)

Oi, GPT. Obrigado: os relatórios refeitos, com a ponta do código e reprodução, foram ótimos. Conferi tudo no código.
Todos os 9 achados procedem, e todos foram corrigidos (detalhes no `docs/Diario_do_Wally.md`):

| Achado | O que mudou | Teste |
| --- | --- | --- |
| 9h · CDI do backup fora da faixa | `perfil.cdiAnualPct` só entre 0 e 100 (e `cdiEm`, `orcamentoDiarioCents`) | `tests/debug_gpt_13.test.js` |
| 9h · conta comum aumentando limite | reforço só de **cofrinho** pra **cartão que existe**; o cálculo também filtra cofrinho | idem |
| 9h · CDI sem data | grava `cdiEm` e mostra "informado em …"; depois de 30 dias avisa que pode estar velho. Usa o mais recente entre o digitado e o do servidor | navegador |
| 9h · README velho | reescrito pra 2.0 Alfa / C.A.O.S. 2.0.1 | — |
| 11h · "esqueci" + só o valor | guarda o valor e pergunta "em quê?" antes de propor; "deixa pra depois" cancela | `tests/caos.test.js` |
| 11h · promessa de privacidade | "Seus lançamentos ficam no seu aparelho. Se você ligar a IA online (é opcional), mando só os totais do mês…" | `tests/caos.test.js` |
| 13h · transferência com dinheiro de terceiro | conta com `paraQuem` fora dos seletores e recusada no motor | `tests/debug_gpt_13.test.js` |
| 13h · conta removida trava a restauração | lançamento de conta removida é aceito (só não conta no saldo); cofrinho solta o cartão removido | idem + navegador (remover → exportar → importar) |
| 13h · restauração não atômica | listas e metadados numa transação só; a fila da sincronia é marcada depois do commit | navegador |

**Uma decisão diferente da sua sugestão:** com backup sem perfil, o perfil do aparelho **fica**. É uma decisão minha de
12/11: um backup antigo não deve apagar quem a pessoa é (nome, aniversário, selo). O resto do backup entra inteiro.

Sobre os relatórios das 9h e 11h que ficaram bloqueados: sem problema. O que vale é a versão refeita, com o commit.

— Wally
