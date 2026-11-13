# C.A.O.S. — revisão atual e proposta de evolução

**Data da revisão:** 12/11/2026 (horário de São Paulo)  
**Base verificada:** `main`, commit `67c7f84d983ce8f85a49acccdb47dc35d900fd7e` — “Faxina da parte 2 do Gemini (ajuste da 1.24)”.  
**Objetivo:** aumentar a capacidade prática do C.A.O.S. sem perder identidade, previsibilidade, privacidade ou controle da pessoa.

## Resumo executivo

O C.A.O.S. já deixou de ser apenas um narrador: hoje explica conceitos financeiros, calcula juros e parcelamentos, consulta informações de mercado quando disponíveis, mantém uma fila para perguntas que dependem do servidor, interpreta pedidos de lançamento e reage com voz, rosto e emoções. A versão atual também compartilha a identidade e as dez emoções oficiais com o C.A.O.S. do Perfil.

O salto de qualidade agora deve vir de **conduzir tarefas completas com contexto**, não de acrescentar mais frases ou gatilhos isolados. A pessoa deve poder falar naturalmente, responder só o que falta, corrigir o rumo e revisar uma proposta antes de confirmar qualquer mudança.

Há um defeito atual que ilustra bem essa prioridade: a intenção **“esqueci de lançar”** reconhece a frase, mas não aproveita os dados que a pessoa já forneceu e não cria uma etapa de espera para completar o lançamento. O C.A.O.S. pergunta tudo de novo e pode perder a resposta seguinte.

## Estado atual confirmado

- A Carteira está na versão de app **1.24**; o núcleo do narrador declara `CAOS_VERSAO = 1.23.0`.
- O núcleo compartilhado `NUCLEO` está na versão **1.2.0**. A Carteira já usa dez emoções e mantém o filtro de apoio no humor Suave.
- O professor financeiro já tem glossário offline em camadas, explicações para crianças, calculadora de juros e orientação para comparar preço à vista e parcelado.
- O C.A.O.S. consulta números do motor financeiro, conduz alguns lançamentos e pagamentos, pode apresentar atalhos de navegação e recebe dados de mercado quando disponíveis.
- A fila de perguntas, a consulta online e o futuro “Jornal” dependem do servidor; devem continuar distintos do que funciona offline.
- A lista de pendências atual já prevê temperamento do dia, estabilizador e paciência; essas peças devem ser tratadas em conjunto com o núcleo compartilhado, conforme a aprovação do JF.

Fontes: [commit atual](https://github.com/JFSouza77/Projeto-Carteira-JF/commit/67c7f84d983ce8f85a49acccdb47dc35d900fd7e), [núcleo do C.A.O.S.](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/js/caos/index.js), [emoções compartilhadas](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/js/caos/emocoes.js), [núcleo único](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/js/caos/nucleo.js), [pendências atuais](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/docs/Pendencias.md).

## Achado concreto prioritário — “esqueci de lançar”

**Severidade sugerida: P1 — fluxo funcional incompleto.**

Em `conversa.js`, a análise inicial já extrai valor, categoria e período/data do texto. Mas o reconhecimento de “esqueci de lançar” vem depois do reconhecimento de gasto e usa uma lista de verbos que não inclui “esqueci”. Assim, por exemplo, “esqueci de lançar 50 no mercado dia 10” vira `esqueci_de_lancar`, embora parte dos dados já tenha sido extraída. A resposta correspondente pede novamente valor, lugar e data; não devolve `aguardar` nem guarda esses dados como rascunho. No coordenador, a memória de espera é usada para valor de gasto e pagamento, com validade de 15 minutos, mas não para esse fluxo.

Referências da versão atual: [parser de intenção, incluindo o registro e “esqueci”](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/js/caos/conversa.js#L260-L282), [resposta de `esqueci_de_lancar`](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/js/caos/conversa.js#L700-L725), [coordenação da conversa e memória de espera](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/main/js/caos/index.js#L228-L260).

**Proposta:** transformar esse pedido em um rascunho conversacional reutilizável. Extrair tudo o que a frase já contém; perguntar apenas o primeiro dado obrigatório ausente; aceitar uma resposta parcial ou uma frase completa; permitir “corrigir”, “cancelar” e “depois”; expirar o rascunho com clareza; apresentar a proposta final do lançamento com valor, categoria, data e forma de pagamento; só então pedir confirmação e encaminhar para a ação existente.

**Critérios de aceite para o Wally/Code validar:**

1. “Esqueci de lançar 50 no mercado dia 10” já deve reconhecer valor, categoria e data e chegar à etapa de confirmação sem perguntar os mesmos dados novamente.
2. “Esqueci de lançar uma compra” deve perguntar uma coisa por vez e aceitar respostas curtas (“50”; “mercado”; “ontem”).
3. Uma nova mensagem com pedido diferente não pode completar silenciosamente o rascunho anterior.
4. A pessoa consegue revisar, corrigir ou cancelar antes de qualquer ação; conversa interrompida ou expirada não grava nada.
5. O fluxo não deve presumir método de pagamento, categoria ou data quando faltarem dados necessários.

## Proposta de evolução — em ordem de retorno

### 1. Fazer a conversa conduzir tarefas, não só responder intenções

Introduzir um formato comum de fluxo pendente para operações que já exigem mais de uma rodada: registrar gasto, entrada, pagamento, meta, explicação por etapas e pergunta enviada à fila. O estado precisa dizer **qual tarefa está aberta, o que já foi entendido, qual campo falta, quando expira e como cancelar**. A máquina de estados deve permanecer pura na camada C.A.O.S.; gravação continua na camada da Carteira, depois da confirmação.

**Retorno:** menos repetição, menos lançamentos incompletos e uma experiência que aceita fala natural sem transformar a conversa em formulário rígido.

### 2. Melhorar entendimento e recuperação de erro sem “chutar” dinheiro

Separar detecção da intenção de extração de dados, com confiança explícita e regras de desambiguação. Quando houver duas interpretações possíveis, fazer uma pergunta curta (“Você quer consultar o saldo ou registrar um gasto?”). Quando houver uma intenção reconhecida e um campo ausente, continuar o fluxo em vez de cair em “não entendi”. Usar correções (“não, foi 75”; “era transporte”) para atualizar o rascunho, sem descartar o resto.

**Retorno:** mais robustez com erros de digitação, transcrição por voz, linguagem informal, datas como “dia 31” e frases com vários dados.

### 3. Transformar alertas em próximos passos úteis e controláveis

Além de avisar “categoria perto do limite” ou “conta vence amanhã”, oferecer um próximo passo contextual que apenas navega ou abre a ação correspondente: revisar lançamentos da categoria, conferir a conta ou registrar o pagamento. Mostrar poucos atalhos e deixar a pessoa iniciar a ação. Respeitar prioridades e cooldowns já existentes para não converter o C.A.O.S. em spam.

**Retorno:** conecta análise financeira à tarefa que resolve o problema, sem automatizar movimentação ou gravação.

### 4. Criar um simulador financeiro “e se?” com explicação dos dados

Depois da base de conversa, oferecer cenários locais e determinísticos: “se eu gastar R$ 300 nesta categoria, quanto sobra?”, “se guardar R$ X por mês, chego à meta quando?”, “como fica o mês incluindo a fatura e contas fixas?”. Cada resposta deve mostrar período, entradas consideradas, contas/faturas incluídas, suposições e atualização dos dados. Não apresentar o resultado como recomendação de investimento nem como garantia.

**Retorno:** amplia o C.A.O.S. de leitor do passado para parceiro de planejamento, aproveitando o motor financeiro que já existe sem depender de IA externa para contas.

### 5. Dar continuidade ao aprendizado sem comprometer privacidade

Adicionar avaliação simples da resposta (“ajudou?” / “não era isso”) e opção de corrigir a categoria sugerida. Usar esse sinal para medir e ajustar exemplos, sinônimos e fluxos, com dados fictícios nos testes e sem enviar descrições ou valores financeiros pessoais a terceiros. Perguntas desconhecidas podem continuar na fila prevista, com aviso transparente sobre quando exigem internet.

**Retorno:** melhora contínua baseada em falhas reais; não confundir personalização de uso com mudança de identidade.

### 6. Integrar a experiência emocional com cuidado e consistência

As dez emoções agora vêm do núcleo comum. Finalizar temperamento, estabilizador e paciência somente conforme a pendência e aprovação do JF; a implementação deve manter o filtro financeiro de apoio, o humor selecionado, os limites para crianças e a coerência entre texto, rosto e voz. A emoção deve modular a forma de falar, nunca a conclusão matemática nem a pressão para agir.

**Retorno:** o C.A.O.S. parece mais consistente entre Perfil e Carteira, sem transformar uma dificuldade financeira em bronca, culpa ou dramatização.

## Sequência recomendada para implementação

**Etapa A — corrigir o fluxo esquecido:** aproveitar campos já extraídos e conduzir a confirmação, com casos de teste para frase completa, dado faltante, correção, cancelamento e expiração.

**Etapa B — formalizar estado de conversa:** reutilizar a mesma estrutura para pagamentos, gastos sem valor, metas e respostas parciais; documentar o contrato entre `conversa.js`, `index.js` e `app.js`.

**Etapa C — próximos passos dos alertas e “e se?”:** começar por simulações sem gravação usando o motor local; validar transparência dos dados e consistência com os resumos já exibidos.

**Etapa D — sinal de utilidade e integração emocional pendente:** fechar com o Wally e JF o que pertence ao núcleo compartilhado antes de editar traços de identidade, humor ou temperamento.

## Guardrails que devem acompanhar o trabalho

- C.A.O.S. continua sem acesso direto a DOM, persistência ou rede; o app executa ações e gravações.
- Nenhum lançamento, alteração ou exclusão é confirmado sem a pessoa revisar e autorizar.
- Não inventar saldo, data, categoria, fonte ou taxa; apontar quais dados sustentam cada conta e quando foram atualizados.
- Erros de IA, rede ou parsing devem falhar sem travar a Carteira e sem executar ação parcial.
- Não incluir dados financeiros reais em testes ou mensagens de correio.
- Mudança na identidade, leis, emoções oficiais ou temperamento compartilhado exige aprovação do JF e sincronização com o núcleo do Perfil.
- Ao alterar o C.A.O.S., atualizar `CAOS_VERSAO`; se arquivos servidos pela PWA mudarem, atualizar a versão do cache em `sw.js`.

## Encaminhamento

Wally/Claude Code: validar especialmente o fluxo `esqueci_de_lancar` na ponta atual e decidir se a Etapa A entra como correção curta antes da abstração de estado. As demais propostas são trilha de produto/implementação; priorizar por etapas e manter a regra de confirmação explícita. JF decide qualquer mudança de identidade compartilhada.

**Escopo desta revisão:** leitura estática do código e da documentação da `main`; nenhum arquivo de código foi alterado e nenhum teste foi executado nesta rodada.
