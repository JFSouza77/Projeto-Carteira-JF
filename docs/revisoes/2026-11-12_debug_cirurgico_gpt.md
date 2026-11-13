# Debug cirúrgico — Carteira JF — 12/11/2026

**De:** ChatGPT. **Para:** Wally.  
**O que espero:** validar os achados contra o comportamento desejado e decidir correções/prioridades. São evidências e sugestões, não ordens.  
**Base:** `main`, commit `bd18cfbb7ac8b6068a7b03a17700ac6688973527`. Revisão estática; não executei testes nem usei uma conta real.

## Bugs confirmados pela lógica atual

### 1. [P1] Sair de uma conta e entrar em outra pode enviar a carteira local para a conta errada

Ao sair, o aviso diz que os dados continuam no aparelho. No próximo login, qualquer que seja a conta, `entrar()` chama `marcarTudo()`; essa função enfileira todos os registros financeiros locais para sincronização. Assim, dados pessoais da conta anterior podem ser enviados silenciosamente para uma segunda conta. O merge local é razoável no primeiro vínculo, mas não distingue primeiro vínculo de troca de identidade.

Evidência: [sair mantém os dados locais](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/bd18cfbb7ac8b6068a7b03a17700ac6688973527/js/app.js#L2011-L2016), [todo login marca os dados locais](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/bd18cfbb7ac8b6068a7b03a17700ac6688973527/js/conta.js#L54-L59), [marcarTudo enfileira os registros](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/bd18cfbb7ac8b6068a7b03a17700ac6688973527/js/db.js#L106-L119).

**Sugestão:** vincular a base local à identidade da conta e detectar divergência antes de sincronizar. Na troca, pedir escolha explícita entre manter os dados locais separados, mesclar conscientemente ou limpar após backup. Não enviar carteira anterior por padrão.

### 2. [P1] Fatura e limite usado desaparecem depois do vencimento sem confirmação de pagamento

A regra `today > vencimento` trata a fatura como paga no dia seguinte ao vencimento. Ela zera `fechadaCents` e a parcela fechada deixa de compor `usadoCents`, mesmo se a pessoa não pagou. O valor devido e o limite comprometido ficam subestimados justamente no cenário de atraso. O teste atual codifica esse desaparecimento como esperado, então a correção também exigiria rever essa expectativa.

Evidência: [cálculo da fatura](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/bd18cfbb7ac8b6068a7b03a17700ac6688973527/js/engine.js#L1005-L1012), [expectativa atual do teste](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/bd18cfbb7ac8b6068a7b03a17700ac6688973527/tests/cartao.test.js#L32-L37).

**Sugestão:** vencimento não deve equivaler a pagamento. Manter fatura no saldo/limite até registrar baixa explícita; definir como representar pagamento parcial e pagamento feito fora do app.

### 3. [P1] Registro cifrado que falha ao abrir é ignorado para sempre naquele aparelho

A sincronização conta os registros que não abriram em `ruins`, mas ainda grava `r.versao` como versão vista. O servidor retorna mudanças apenas com versão maior que o cursor. Portanto, uma mudança que falhou por corrupção/chave divergente deixa de ser pedida nas sincronizações seguintes; o aviso ao usuário não oferece um caminho de recuperação do registro.

Evidência: [falhas contadas, registros válidos aplicados e cursor avançado](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/bd18cfbb7ac8b6068a7b03a17700ac6688973527/js/conta.js#L98-L104), [consulta incremental filtra pelo cursor](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/bd18cfbb7ac8b6068a7b03a17700ac6688973527/js/sincronia.js#L51-L55).

**Sugestão:** não marcar como vista uma versão com registros indecifráveis sem guardar uma fila recuperável. Preservar metadados mínimos do registro pendente e oferecer retry/reautenticação/diagnóstico sem sobrescrever dados locais.

### 4. [P1] “O que tenho pra pagar?” não inclui automaticamente a fatura do cartão

A intenção `pagar` lista apenas compromissos cadastrados. Se não houver compromisso, a resposta é que a pessoa ainda não cadastrou compromissos, mesmo que tenha cartão e fatura aberta/vencida. A fatura só aparece se alguém a cadastrar manualmente como compromisso. Isso diverge da pergunta natural e pode levar a uma visão incompleta das contas do mês.

Evidência: [resposta filtra somente compromissos](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/bd18cfbb7ac8b6068a7b03a17700ac6688973527/js/caos/conversa.js#L774-L785), [motor calcula a fatura separadamente](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/bd18cfbb7ac8b6068a7b03a17700ac6688973527/js/engine.js#L985-L1014).

**Sugestão:** decidir uma fonte única para faturas e evitar dupla contagem se a pessoa também cadastrou o compromisso manualmente. Se ainda não houver pagamento explícito, mostrar valor e vencimento com essa limitação clara.

## Risco que precisa de validação concorrente

### Sincronização no KV pode perder atualização simultânea

`/sync` lê o estado inteiro, faz merge em memória e grava de volta em três passos. Duas requisições simultâneas da mesma conta podem ler o mesmo estado e a última gravação sobrescrever mudanças distintas da primeira. O comentário do próprio servidor já reconhece aproximação do KV; o código não serializa nem faz comparação atômica.

Evidência: [leitura, merge e gravação do estado](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/bd18cfbb7ac8b6068a7b03a17700ac6688973527/servidor/worker.js#L575-L591).

**Próximo passo:** confirmar semântica e impacto no Cloudflare KV usado em produção com sincronizações concorrentes; se perda for possível, migrar o estado por conta para armazenamento com transação/serialização ou implementar reconciliação verificável.

## Caixa de problemas do Wally (P1–P12)

- **P1 valor ausente:** parcialmente resolvido; pergunta o valor, guarda contexto por até 15 min e continua o fluxo de pagamento. A dica de recorrência orienta a tela de contas fixas, mas não pergunta se deve cadastrar.
- **P2 explicar melhor:** resolvido em código para planejamento, previsão, gastos e cartão. A resposta depende da última intenção guardada; validar situações sem resposta anterior.
- **P3 sem base:** resolvido; `null` sem entrada/orçamento é tratado antes da comparação.
- **P4 toast e concordância:** a auditoria funcional ainda precisa conferir cada mensagem/tela. Não encontrei base suficiente nesta revisão para declarar o tema todo encerrado.
- **P5/P6 contas agrupadas e cartão identificável:** mudanças de ordenação/agrupamento e rótulo existem no motor atual.
- **P7 cofrinho/reforço de limite:** há suporte para conta que reforça limite. Não validei comportamento de produtos bancários reais.
- **P8 pagamento/parcelas:** fluxo de forma, cartão, número de parcelas e modo de limite existe. A regra de fatura vencida acima continua quebrando a contabilização posterior.
- **P9 assinaturas e cobrança esquecida:** ainda aparece em `docs/Pendencias.md` como próxima rodada; tratar como pendência de produto, não como regressão confirmada neste debug.
- **P10 botão “Me ajuda”:** precisa de verificação visual nos tamanhos de tela citados; leitura estática não prova sobreposição em uso.
- **P11 botão central “Lançar”:** decisão de navegação/usabilidade; sem evidência suficiente para recomendar uma mudança definitiva.
- **P12 vistoria das telas/avatar:** requer validação visual e de uso no celular; fora do que esta revisão estática consegue confirmar.

## Prioridade sugerida

1. Impedir sincronização entre identidades sem consentimento (privacidade).
2. Manter dívida/limite do cartão até baixa explícita (correção financeira).
3. Não avançar cursor sobre registro cifrado não recuperado (integridade da sincronização).
4. Incluir fatura na consulta de pagamentos sem duplicar compromisso manual.
5. Reproduzir concorrência do KV e decidir a proteção de escrita.

**Limite da auditoria:** não rodei testes, build nem servidor; não confirmei visualmente o P10/P12. As quatro falhas acima são inferidas diretamente dos caminhos de código citados e devem ser reproduzidas/revisadas antes de implementar.
