# Repaginada vinda do Google AI Studio (13/11/2026) — análise e plano do Wally

O JF trouxe o app que o AI Studio montou (React + TypeScript + Tailwind, ~15 mil linhas) e 18 prints. **Visual aprovado
pelo JF ("achei LINDO").** Este documento diz o que entra, como e em que ordem.

## O que o protótipo é (e o que não é)

- **É:** um protótipo visual muito bom, com ideias de tela e de funções novas. O C.A.O.S. dele é uma cópia em TypeScript
  do nosso (da v1.22, antes do núcleo 1.2, das correções do GPT/Gemini e do professor completo).
- **Não é:** um app pronto pra trocar o nosso. Ele guarda tudo no `localStorage` (sem IndexedDB), não funciona sem
  internet (sem service worker), não tem conta, sincronização nem criptografia ponta a ponta, não tem os 160 testes nem o
  servidor com push, e traz `@google/genai` + `express` (servidor e IA do Google). Trocar seria perder tudo isso.

**Decisão:** o app continua o nosso (JS puro, offline, E2EE). A cara nova e as funções boas são **portadas pra cá**, aos
poucos, com teste e print a cada passo. Nada de React nem Tailwind no app.

## O que entra (✅), em fases

### Fase 1 — Cara nova (layout)

**Andamento:** computador e tablet feitos na 1.25 (menu lateral, 2 colunas, painel C.A.O.S. ao vivo, Me ajuda no menu).
Falta do celular: cabeçalho com rostinho e os 4 cartões de resumo.
- ✅ **Computador/tablet (≥ 1024 px):** 3 colunas, igual aos prints: menu à esquerda (com saldo e ofensiva embaixo),
  conteúdo no meio, painel **"C.A.O.S. ao vivo"** à direita (rosto, intensidade da emoção, observação atual, radar
  rápido, perguntas prontas, Conversar). Botão "Ocultar C.A.O.S.".
- ✅ **Celular:** fica a nossa barra (C.A.O.S., Contas, Lançar no meio, Mês, Início, a ordem do JF) e o neon vazado.
  Do protótipo vêm o cabeçalho com o rostinho e os 4 cartões de resumo (Gasto, Entradas, Sobra prevista, Saldo em contas).
- ✅ Botão "Novo lançamento" no topo do Início; cartão do C.A.O.S. com dois atalhos ("Previsão do mês", "Simulador").

### Fase 2 — Funções novas

**Andamento (madrugada de 13/11, 1.26 e 1.27):** feito tudo, menos "C.A.O.S. reage enquanto você preenche" (fica pra
próxima, porque mexe no C.A.O.S. e sobe a versão dele). O simulador saiu na versão simples (valor + parcelas → sobra antes e
depois, e em quantas vezes caberia); "planos a adiar" e "limite do cartão antes/depois" ficam pra uma melhoria. Filtro por
forma de pagamento no extrato também ficou pra depois (hoje: tipo, categoria e busca).
- ✅ **Transferência entre contas** (Lançar → Transferência): move dinheiro sem virar gasto nem entrada.
- ✅ **Ritmo de gastos no mês:** acumulado real × linha ideal do orçamento/entrada.
- ✅ **Fluxo dos últimos 6 meses em barras** (entradas × gastos) no lugar da nossa linha.
- ✅ **Gastos por categoria clicáveis** (toca e filtra o extrato) e **extrato com filtros** (tipo, categoria, forma) +
  **editar lançamento** + **Exportar CSV**.
- ✅ **Simulador "E se eu comprar?"** na aba Mês (valor, parcelas, cartão → nova sobra, planos a adiar, limite antes/depois).
- ✅ **Rachadinha: botão "Cobrar"** (copia mensagem pronta pro WhatsApp).
- 🕒 **C.A.O.S. reage enquanto você preenche o lançamento** (antes de salvar: "isso estoura Delivery").
- ✅ **Estúdio & Professor** dentro da aba C.A.O.S.: glossário pesquisável, calculadoras com controles, linha do tempo e
  as 3 leis.
- ✅ **Calendário da ofensiva** (28 dias) com "dia sem gasto" em 1 toque.

### Fase 3 — Ideias do relatório do AI Studio
| Ideia | Veredito |
| --- | --- |
| Retrospectiva do mês ("Wrapped") | ✅ depois da fase 2 (tudo calculado no aparelho) |
| Missões e desafios semanais | ✅ depois (combina com a ofensiva) |
| Sons sintetizados opcionais | 🕒 desligado por padrão, respeitando "menos movimento" |
| "Olho no futuro" (parcelas e assinaturas dos próximos meses) | ✅ (a base já existe: parcelas por fatura) |
| Gasto emocional (necessidade, impulso, cansaço…) | ✅ com cuidado: 1 toque, opcional, nunca julga |
| Personalidade que evolui com a confiança | 🕒 vai pro núcleo (regra de ouro: precisa do ok do JF e do Code) |
| Dica do Dia por humor | ✅ (já temos o `caos-line`; vira cartão próprio) |
| Metas com anel de progresso em D3 | ✅ o anel, ❌ o D3 (biblioteca pesada; o anel é SVG simples) |

## O que não entra (❌) e por quê
- React, Tailwind, `localStorage`, `@google/genai`, `express`: trocariam a base que já é offline, testada e criptografada.
- A barra de baixo na ordem do protótipo (Início, Lançar, Mês, Contas, C.A.O.S.): o JF escolheu outra (12/11).
- Botão verde chapado no escuro: o JF pediu neon vazado (12/11).

## Cuidados na portagem
- Lei 1 em tudo: transferência, edição e "dia sem gasto" pedem confirmação; o C.A.O.S. só propõe.
- Cada fase em PRs pequenos, com `npm test`, `npm run test:telas` e prints (celular e computador, claro e escuro).
- Dados de exemplo do protótipo (`seed.ts`) não entram no app.

## V2 do AI Studio (JF, 13/11 de manhã)

O JF trouxe a versão 2 do protótipo (zip e prints fora do repositório, só no rascunho do Wally). O que entra, na ordem:

| # | Item | Veredito |
| --- | --- | --- |
| 1 | Orçamento de hoje (limite por dia + barra) e atalhos Gasto/Entrada/Transferir no Início | ✅ no ar (1.28, PR #94) |
| 2 | Metas com anel de progresso que enche ao guardar | ✅ em SVG simples, ❌ D3 (biblioteca pesada, offline) |
| 3 | Gráficos vivos: ritmo Acumulado/Por dia com toque no dia; 6 meses Comparar/Saldo líquido; categorias Barras/Donut; toque no dia da ofensiva | ✅ |
| 4 | Lançar: chips +10/+20/+50/+100/+200 e Limpar; cores por forma de pagamento | ✅ |
| 5 | Contas: cor por banco, cartão com faixa do banco e situação do limite (Saudável/Atenção/Crítico), "Lançar compra neste cartão" | ✅ |
| 6 | Exportar o mês (CSV e PDF pela impressão do navegador) no Mês | ✅ |
| 7 | Dica do Dia no Início (muda com o humor, Outra dica, Aprofundar) | ✅ mexe no C.A.O.S. (versão nova, listas em múltiplo de 5, 2ª lei: ácido nunca no formal nem pra criança) |
| 8 | "Melhorar falas, glossário, emoções, rostinhos, brilhos" | 🕒 rodada própria do C.A.O.S., com o Code (núcleo só com o ok do JF) |

Publicação: o item 1 foi antes das 08h. O resto vai em pedaços depois da rodada de teste do ChatGPT (09h), pra não mudar o
app no meio do teste dele.
