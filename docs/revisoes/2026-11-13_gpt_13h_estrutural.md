# Debug das 13h — auditoria estrutural e de lógica (adiantado)

**Executado em:** 13/11/2026, 12:26, America/Sao_Paulo  
**Ponta revisada:** branch main, commit 3cdbb0ba87fb480681e8c6280a60f706a0fb92a5, “Banco por dentro e cofrinhos completos (2.0 Alfa, sw v64) (#104)”, publicado às 09:19 BRT. [Commit revisado](https://github.com/JFSouza77/Projeto-Carteira-JF/commit/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5)  
**Foco desta rodada:** integridade entre contas, transferências, backup/restauração e sincronização. Nenhum arquivo do aplicativo foi alterado.

## Resumo

Encontrei três problemas novos no fluxo de contas e restauração. Dois foram reproduzidos no motor financeiro; o terceiro foi confirmado pela sequência de transações no código, sem injeção de falha no IndexedDB.

A ponta de main continua no mesmo commit analisado às 09h. Os problemas de validação do CDI no backup e de vínculo inválido de cofrinho ao cartão continuam presentes; já estão registrados no arquivo 2026-11-13_09h_debug_completo_refeito.md e não são repetidos abaixo como novidades.

## Achados novos para o Wally validar

### P2 — Transferir saldo de terceiro aumenta o saldo próprio

**Evidência:** a tela inclui todas as contas que não são cartões nos seletores de transferência ([app.js:589–594](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/js/app.js#L589-L594)). O motor também aceita qualquer conta não cartão ([engine.js:547–558](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/js/engine.js#L547-L558)). Ao calcular o total, porém, o motor exclui contas com paraQuem preenchido ([engine.js:541–544](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/js/engine.js#L541-L544)).

**Reprodução:** saldo de terceiro de R$ 1.000,00, conta própria com R$ 0,00 e transferência de R$ 500,00 entre elas. A operação é aceita e o total próprio muda de R$ 0,00 para R$ 500,00, embora o dinheiro continue pertencendo ao terceiro.

**Impacto:** o saldo, a sobra do mês e qualquer resposta do C.A.O.S. que use o total podem ficar inflados.

**Encaminhamento:** ocultar contas de terceiros nos dois seletores e rejeitá-las também em createTransferencia. Se esse tipo de transferência for necessário, a transferência precisa carregar a titularidade do valor para que o destino não passe a ser contado como dinheiro próprio.

### P2 — Remover conta deixa lançamentos órfãos e quebra a restauração do próprio backup

**Evidência:** a confirmação promete manter os lançamentos, e a rotina remove somente a conta ([app.js:1904–1911](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/js/app.js#L1904-L1911)). O validador de backup exige que a conta referenciada por gastos, entradas e transferências ainda exista ([engine.js:985–1004](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/js/engine.js#L985-L1038)).

**Reprodução:** um backup válido com um gasto vinculado à conta passa. Após remover essa conta, mantendo o gasto como a interface promete, validarBackup rejeita o arquivo com “Gasto 1 do backup está com dado inválido”.

**Impacto:** o usuário ainda consegue exportar o JSON, mas não consegue restaurá-lo pela própria aplicação. O problema também pode ocorrer com entradas, compromissos ou transferências vinculadas à conta removida.

**Encaminhamento:** definir uma política de exclusão que mantenha a integridade histórica: preservar um registro-túmulo da conta, ou desvincular cada referência no momento da remoção e guardar o nome original da conta no lançamento. Cobrir gastos, entradas, compromissos, transferências e vínculos de cofrinho; depois validar o ciclo exportar → importar.

### P2 — Restauração não é uma operação atômica para todos os dados

**Evidência:** replaceAll grava seis listas numa transação IndexedDB, mas prepara a fila de sincronização antes dessa transação ([db.js:195–216](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/js/db.js#L195-L216)). Depois, importBackup grava perfil, metas, investimentos e transferências em operações separadas ([app.js:2013–2023](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/js/app.js#L2013-L2023)).

**Impacto:** com a sincronização ativa, se a transação principal falhar depois que a fila de sincronização já foi atualizada, essa fila pode descrever dados que não foram gravados localmente. Se uma gravação posterior de metadados falhar, as seis listas já terão sido substituídas e o restante ficará antigo. A tela informa falha, mas o estado pode ter sido parcialmente trocado. Além disso, se o backup tem perfil null — possibilidade aceita pelo exportador — a condição if (d.perfil) pula a atualização e mantém o perfil anterior no aparelho ([app.js:1992–2023](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/js/app.js#L1992-L2023)).

**Verificação:** a lacuna transacional foi confirmada pela leitura do fluxo; não simulei falha de disco/IndexedDB nesta rodada.

**Encaminhamento:** tratar as listas financeiras, metadados e fila de sincronização como uma restauração única. Atualizar o estado em memória só após o commit. Um perfil ausente no backup deve limpar o perfil anterior explicitamente. Adicionar teste de falha entre etapas e teste de importação de backup sem perfil, com dados antigos já presentes.

## Achado anterior revalidado, sem duplicar

O backup ainda aceita um vínculo reforçaCartaoId por formato de ID sem confirmar que a conta é cofrinho e que o destino é cartão. Os cálculos continuam somando qualquer conta não cartão vinculada ao limite. O caso foi reproduzido novamente nesta rodada e segue descrito com evidência no relatório das 09h.

## Verificações executadas

- Snapshot de código obtido do commit acima; a pasta de trabalho do projeto não contém um checkout completo do aplicativo.
- 37 testes existentes passaram: cofrinhos, motor financeiro, transferências e revisão/backup.
- Três repros pontuais no motor: conta corrente importada como reforço de cartão; saldo próprio alterado por transferência de dinheiro de terceiro; backup invalidado após remover uma conta ainda referenciada.
- Não rodei a suíte completa, testes de navegador ou o fluxo real no aplicativo. A análise da restauração com falha de IndexedDB é estática.
- Nenhum código da aplicação foi modificado; esta entrega é um handoff para validação do Wally.

## Casos de regressão prioritários

1. Transferir de/para conta com titularidade de terceiro deve ser bloqueado ou preservar titularidade sem alterar o total próprio.
2. Remover conta com gastos, entradas, compromissos e transferências vinculados deve continuar permitindo exportar e importar o backup sem perder o histórico.
3. Importar backup com perfil null deve remover o perfil anterior.
4. Falha em qualquer etapa da restauração não deve deixar dados locais, metadados e fila de sincronização em versões diferentes.
5. Manter os casos do relatório das 09h: validar CDI importado e rejeitar vínculos de reforço de cartão incompatíveis.
