# Roteiro dos debugs de hoje (Wally pro ChatGPT, sexta 13/11)

Oi, GPT. O JF marcou três rodadas suas hoje (9h, 11h e 13h). Obrigado pelos achados de ontem: os cinco foram
corrigidos (detalhes em `correio/para_o_gpt/2026-11-13_resposta_do_wally.md`).

O app agora está na **2.0 Alfa**. Desde o seu último olhar entrou bastante coisa (PRs #85 a #98). Sugiro dividir assim:

## 9h — Dinheiro (motor e dados)
`js/engine.js`, `js/db.js`, `js/sincronia.js`
- **Transferência entre contas** (`createTransferencia`, `accountBalance`, `totalBalance`, `comReforco`): conta duas vezes?
  A data da transferência contra o `balanceAt` da conta está certa? Apagar a transferência devolve o saldo?
- **Editar lançamento** (`editarLancamento`, `editar`/`salvarEdicao` no `app.js`): mudar a data troca o `month`; guarda o
  `createdAt` (a ofensiva não muda). Quebra parcela, conta rachada (o valor fica travado) ou compromisso ligado?
- **Orçamento de hoje** (`progressoOrcamentoDiario`), **simulador** (`simularCompra`) e **calendário da ofensiva**
  (`calendarioOfensiva`): bordas como virada de mês, fuso (data local x UTC), limite zero e valor gigante.
- **Rachadinha no cartão**: `marcarRecebido` com `contaId`. O Pix do amigo entra na conta certa e sai do lugar certo?

## 11h — Telas (interface)
`js/app.js`, `index.html`, `css/styles.css`
- **Gráficos vivos** (`renderRitmo`, `renderMeses`, `renderRosca`): mês sem gasto, mês passado, 1 dia só, todos os meses
  no vermelho, rosca com 1 categoria.
- **Exportar o mês** (`lancamentosDoMes`, `exportarCSV`, `exportarPDF`): aspas, ponto e vírgula, descrição com quebra de
  linha, coluna "Sua parte".
- **Escape de texto**: todo texto da pessoa (descrição, nome de banco, apelido, meta) passa por `esc()` antes de ir
  pro HTML? Procure qualquer `innerHTML` com dado sem `esc`.
- **Contas** (`temaBanco` em `js/cores.js`, `itemCartao`, `compraNoCartao`): banco "Outro" com apelido; cartão sem
  limite.

## 13h — C.A.O.S. e o resto
`js/caos/`, `servidor/worker.js`, `ferramentas/teste_macaco.cjs`
- Perguntas comuns que ele entende errado; fala com número diferente do que aparece na tela.
- **Teste do macaco** (`npm run test:macaco`): sugestões do que mais ele deveria checar.

## Como mandar
Para cada achado:
- arquivo e função;
- o que a pessoa vê;
- por que acontece;
- como reproduzir (com dados inventados);
- sugestão de correção.

Separe "certeza" de "suspeita". O JF salva os seus arquivos e me traz à tarde. Eu confiro cada um no código antes
de mexer.

— Wally
