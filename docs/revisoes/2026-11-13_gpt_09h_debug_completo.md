# Debug completo do Projeto Carteira — execução refeita

**Execução:** 13/11/2026, aproximadamente 11h25 (America/Sao_Paulo)  
**Versão conferida:** branch `main`, commit `3cdbb0ba87fb480681e8c6280a60f706a0fb92a5` — “Banco por dentro e cofrinhos completos (2.0 Alfa, sw v64) (#104)”.  
**Escopo:** primeira revisão ampla agendada para 09h, refeita agora com a fonte remota atual. A execução das 09h ficou bloqueada por falta de checkout local e falha de DNS; este documento substitui aquele relatório bloqueado.

## Resultado

Foram confirmados **dois defeitos de validação de backup** que podem gerar números financeiros incorretos após importar um arquivo, além de um problema de atualização/clareza da taxa de CDI e documentação desatualizada. Não encontrei evidência para afirmar que as contas internas do motor testadas estejam quebradas: **25 testes existentes passaram**.

## Base e limites da revisão

A pasta local do Projeto continua sem checkout Git nem código-fonte executável. Usei o conector do GitHub para ler os arquivos da branch principal e identifiquei o commit acima. Revisei o motor financeiro, as mudanças recentes em contas/cofrinhos e seus testes, trechos da integração da tela de Contas, service worker, manifesto de scripts, README e pendências.

Foi possível executar em área temporária os arquivos exatos `js/engine.js`, `tests/engine.test.js` e `tests/cofrinhos.test.js` obtidos da ponta atual. **Não** foi possível executar a suíte completa, build, teste de navegador/macaco ou verificação visual/tátil da aplicação: o checkout completo e as dependências não estão presentes localmente. A consulta do GitHub não retornou status checks nem workflow runs associados ao commit; isso não prova que não exista CI em outro formato.

## Achados

### P2 — Backup aceita CDI fora da faixa e pode mostrar rendimento absurdo

**Evidência:** [validação de perfil no motor](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/js/engine.js#L1039-L1053), [cálculo de rendimento](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/js/engine.js#L447-L451), [campo que grava o CDI manualmente](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/js/app.js#L1764-L1773).

A tela limita o CDI manual a um valor entre 0 e 100, mas o validador do backup não valida `perfil.cdiAnualPct`. Como a importação preserva o perfil, um backup com CDI de 5000 é aceito. Reprodução sobre o motor atual: `validarBackup(...)` retornou `ok: true`; para saldo de R$ 1.000,00 e 102% do CDI, o estimador retornou taxa anual de **5100%** e rendimento anual de **R$ 51.000,00**.

**Impacto:** estimativas de rendimento gravemente erradas após importar um backup alterado ou inválido.

**Correção recomendada:** validar também `cdiAnualPct` no perfil importado, com o mesmo limite do campo da tela, e criar casos para taxa negativa, excessiva, textual e ausente.

### P2 — Backup pode ligar conta comum ao reforço de limite de cartão

**Evidência:** [validação de contas do backup](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/js/engine.js#L975-L982), [cálculo do raio-X do cartão](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/js/engine.js#L458-L462), [cálculo usado pela fatura](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/js/engine.js#L509-L514).

A validação confere se `reforcaCartaoId` tem formato de ID, mas não confirma que ele aponta para um cartão nem que a conta ligada é do subtipo cofrinho. Os cálculos somam qualquer conta que tenha esse ID e não seja cartão. Reprodução no motor atual: backup com conta corrente de R$ 1.000,00 ligada ao cartão foi aceito; o raio-X elevou o limite mostrado de R$ 500,00 para R$ 1.500,00.

**Impacto:** limite disponível, percentual usado e alertas de cartão podem ser exibidos incorretamente depois de importar o backup.

**Correção recomendada:** validar o vínculo completo (conta vinculada é cofrinho; ID de destino existe e é cartão) e também filtrar por subtipo nos cálculos como defesa adicional. Adicionar teste de backup inválido para cada combinação.

### P2 — CDI manual não tem data de validade visível

**Evidência:** [CDI usado no raio-X](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/js/app.js#L1679-L1680), [salvamento manual do CDI](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/js/app.js#L1764-L1773).

A interface pede o “CDI de hoje”, mas salva somente o percentual. O valor continua sendo reutilizado nos próximos dias e o raio-X não mostra quando foi informado. A tela diz que o cálculo é uma estimativa, mas não permite perceber que a taxa pode estar antiga.

**Impacto:** quem não atualizar manualmente a taxa pode interpretar uma estimativa baseada em dado antigo como atual.

**Correção recomendada:** gravar a data/hora em que a taxa foi informada e mostrar “CDI informado em …”, com indicação visual quando estiver desatualizado. O cálculo deve continuar explicitamente apresentado como estimativa.

### P3 — README descreve uma versão antiga do produto

**Evidência:** [descrição de funcionalidades no README](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/README.md#L8-L18). O texto chama o narrador de “C.A.O.S. 1.0”, enquanto a regra atual do projeto identifica o C.A.O.S. como 2.0.0 e a ponta atual já é “2.0 Alfa”. O resumo público também não reflete várias funções atuais, inclusive cofrinhos, rendimento por CDI e raio-X do limite.

**Impacto:** Wally, contribuidores e usuários que consultam o README recebem um retrato incompleto e contraditório do app.

**Correção recomendada:** atualizar a apresentação e a lista de funcionalidades depois de confirmar quais itens desta Alfa já podem ser descritos como disponíveis.

## Verificações executadas

Com os arquivos atuais baixados da branch `main`, executei:

```text
node --test .audit-debug/tests/engine.test.js .audit-debug/tests/cofrinhos.test.js
25 testes passaram; 0 falharam.
```

A execução cobriu cálculos e comportamentos existentes do motor, além dos cinco testes de cofrinhos. Também fiz duas reproduções pontuais de backup inválido, descritas nos achados; ambas reproduziram os defeitos.

**Não executado:** restante de `npm test`, build, teste macaco, fluxos reais no navegador, leitor de tela e teste em celular. Não havia checkout completo nem dependências para esses passos. Nenhum código de produção foi alterado nem teste permanente foi acrescentado; os arquivos de auditoria temporários foram removidos ao final.

## Encaminhamento sugerido

1. Corrigir e testar os dois vínculos de backup antes de considerar os dados de CDI e cofrinhos confiáveis em importações.
2. Guardar a data da taxa de CDI e deixar a validade aparente na interface.
3. Atualizar o README para refletir o produto atual.
4. Repetir a suíte completa, build e teste de navegador/macaco a partir de um checkout local do mesmo commit, incluindo teste com teclado/leitor de tela e viewport móvel.

Nenhum dado real da carteira foi usado.  
**Relatório informativo para validação do Wally; não altera decisões do projeto.**

