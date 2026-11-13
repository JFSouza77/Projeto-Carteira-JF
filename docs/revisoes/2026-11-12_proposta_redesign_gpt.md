# Proposta de evolução visual e experiência — C.A.O.S. Finanças

**De:** ChatGPT. **Para:** JF e Wally.  
**Objetivo:** sugestões de evolução estética e funcional; não alterei código.  
**Base:** app público versão 1.22 / C.A.O.S. 1.20.0, main no commit a81a4edd0ed5613d53d1f0f9786b1ca69a629be3. Observei as telas vazias em janela desktop 1280×720, sem dados financeiros reais.

## Visão geral

O projeto já tem uma identidade clara: fundo escuro, cartões, verde-limão nas ações, rosa no C.A.O.S. e “Lançar” no centro da navegação. O botão central é um acerto para a ação mais frequente.

Também já existem recursos bons em Ajustes: tema claro/escuro/do aparelho, fonte ampliada e redução de movimento. Preservar esses recursos enquanto se repagina.

A principal oportunidade é tornar cada tela mais orientadora: mostrar o próximo passo útil, diminuir decisões no lançamento e separar informação, alerta, dívida e meta. No desktop, o conteúdo fica numa coluna estreita; no celular, controles pequenos e ajuda flutuante competem com o conteúdo.

## Direção visual: “finanças sem susto”

Manter a identidade, suavizando o neon permanente:

- Verde-limão para ação principal, seleção e progresso positivo; rosa para a presença do C.A.O.S.; âmbar/vermelho para prazo, alerta ou erro.
- Reservar brilhos e animações para seleção e confirmação; deixar cartões e textos tranquilos.
- Padronizar espaçamentos (8, 12, 16, 24 px), cantos e alturas de controle.
- Dar mais peso à tipografia e ao espaço entre blocos do que a bordas luminosas.

O contraste do texto secundário atual no escuro é bom (aprox. 5,8:1 no texto #8B95A7 sobre cartão #161A22). O maior ganho está nos tamanhos pequenos, não em trocar cores sem critério.

## Melhorias por tela

### 1. Primeiro acesso e Início — mostrar por onde começar

Na primeira abertura, o app inicia a conversa perguntando o nome. Na tela Início sem dados, há valores zerados e a indicação “Defina orçamentos em Ajustes...”. A experiência tem personalidade, mas pode mostrar o valor prático mais cedo.

Criar um painel temporário “Vamos organizar sua carteira” com três passos puláveis: registrar uma entrada (opcional), lançar o primeiro gasto e cadastrar conta/cartão (opcional). Cada passo abre diretamente a tela certa e o painel desaparece quando concluído.

Distinguir “zero confirmado” de “ainda não informado”: por exemplo, “Nenhuma entrada lançada” ou “Saldo não informado”, em vez de apresentar R$ 0,00 como se o app conhecesse o saldo.

**Critério:** pessoa nova encontra uma ação útil sem ter que entender todas as abas ou abrir Ajustes.

### 2. Lançar — reduzir carga de decisão

O formulário expõe valor, onze categorias, descrição, data, pagamento, conta, divisão e comprovante em uma sequência longa. É completo, porém exige várias decisões para um gasto simples.

- Manter valor, categoria e descrição no primeiro nível.
- Manter data como “Hoje” por padrão, com edição clara.
- Recolher detalhes opcionais em “Mais opções”; revelar cartão/parcelas só após escolher crédito.
- Mostrar conta só quando a pessoa quiser acompanhar o saldo; ao escolher crédito sem cartão, oferecer “Cadastrar cartão” ou “Continuar sem vincular”.
- Priorizar categorias mais usadas e deixar “Todas” abrir a lista completa; sem histórico, manter ordem estável.
- Deixar Salvar acessível sem competir com teclado ou navegação inferior.

**Critério:** o lançamento comum continua rápido; detalhes aparecem quando afetam saldo, fatura ou limite.

### 3. Mês — destacar vencimento antes de meta

A página já separa Compromissos, Metas e Planos. Tornar prioridade e prazo mais fáceis de escanear:

- Resumo no topo diz “Disponível” ou “Falta definir entrada” e identifica a base.
- Criar “Próximos vencimentos” com data, valor faltante e status (“amanhã”, “parcial”, “atrasado”).
- Manter compromissos, metas e planos em níveis visuais diferentes.
- Recolher itens concluídos/distantes em listas longas.
- Alinhar valores à direita e usar o mesmo padrão de data e status em todo o app.

**Critério:** em poucos segundos, a pessoa distingue o que vence do que quer guardar ou comprar depois.

### 4. Contas — separar saldo de crédito

O agrupamento por banco já ajuda. Reforçar visualmente que cofrinho, saldo e limite não são a mesma coisa:

- Banco como cabeçalho recolhível; dentro, conta, cofrinho/poupança e cartão separados.
- Rótulos explícitos “Saldo informado”, “Cofrinho” e “Limite disponível”.
- Somar dinheiro no saldo total; limite aparece em resumo separado.
- Nota curta junto ao saldo: atualização manual, sem acesso ao banco.

### 5. C.A.O.S. — transformar resposta em ação

Depois do onboarding, mostrar sugestões de ação como “Anotar gasto”, “Ver o que vence” e “Quanto posso gastar?”. Após uma resposta, oferecer no máximo duas ações relacionadas.

Em lançamentos conversacionais, mostrar o que já foi entendido e qual dado falta. Separar explicação de proposta de gravação: cartão com valor/categoria/pagamento e botões visíveis “Confirmar” e “Editar”. Permitir cancelar e corrigir resposta.

### 6. Ajuda — manter acessível sem cobrir a tela

Na observação da tela Mês, o botão flutuante “Me ajuda” compete visualmente com o cartão de Metas; no lançamento, fica perto do formulário e da barra inferior. O modo compacto e o espaço de rolagem ajudam, mas ainda há disputa visual.

Preferência: ícone de Ajuda no cabeçalho e orientações curtas dentro das próprias seções. Se mantiver flutuante, dar alvo de pelo menos 44×44 px, recolher quando não usado, ocultar com teclado aberto e provar que nunca cobre texto, campos ou botões.

## Acessibilidade e leitura

- **Toque:** chips usam 8 px de padding vertical; aumentar controles frequentes para alvo confortável (referência de 44×44 px) e afastar ações vizinhas.
- **Texto:** corpo a 16 px e texto auxiliar geralmente a 14 px ou mais; navegação e legendas não devem depender da opção de fonte grande para serem legíveis.
- **Teclado:** foco visível em botões, links, seletores e componentes personalizados; ordem de Tab igual à ordem visual.
- **Grupos de escolha:** categorias e forma de pagamento devem funcionar como grupos de rádio com setas e leitor de tela, não exigir Tab em cada opção.
- **Cor:** status também tem texto/ícone, além de cor; preservar contraste nos temas claro e escuro.
- **Ampliação:** conferir zoom de 200% e fonte “Maior”, sem corte, rolagem horizontal ou sobreposição.
- **Movimento:** respeitar preferência do sistema e “Menos movimento”.
- **Erros:** exibir junto ao campo e anunciar para tecnologia assistiva.

## Tablet e desktop

A coluna máxima de 560 px é boa para leitura no celular, mas deixa a área desktop pouco aproveitada. Manter uma coluna no celular; usar cartões curtos em duas colunas no tablet; no desktop usar grade de duas colunas em Início/Mês e navegação lateral ou superior. Parágrafos e formulários devem continuar com largura confortável, sem se esticar pela tela toda.

## Ordem recomendada

**1 — Clareza:** diferenciar ausência de dado e zero; reposicionar Ajuda; aumentar controles pequenos; painel de primeiros passos.  
**2 — Fluxos:** simplificar lançamento; destacar próximos vencimentos; distinguir saldo/cofrinho/limite; criar propostas conversacionais editáveis.  
**3 — Repaginada:** suavizar brilho constante, padronizar tipografia/espaçamento e criar composição de desktop; revisar foco, teclado, leitor de tela e ampliação.

## Critérios de aprovação

- A ação principal está clara em cada tela sem ler tudo.
- Todo número indica se é conhecido, calculado ou ainda não informado.
- Nenhum elemento fixo cobre conteúdo, inclusive com teclado aberto.
- Ações frequentes têm área de toque confortável e nome compreensível.
- Lançamento simples continua rápido; detalhes aparecem quando relevantes.
- Tema, fonte ampliada e movimento reduzido seguem funcionando.
- Celular, tablet, desktop, teclado e ampliação são conferidos antes de fechar.

## Referências

- [App publicado](https://carteira-jf.pages.dev/)
- [CSS: largura, tipografia e controles](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/a81a4edd0ed5613d53d1f0f9786b1ca69a629be3/css/styles.css#L40-L72)
- [CSS: chips e botões](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/a81a4edd0ed5613d53d1f0f9786b1ca69a629be3/css/styles.css#L136-L149)
- [CSS: navegação inferior](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/a81a4edd0ed5613d53d1f0f9786b1ca69a629be3/css/styles.css#L200-L213)
- [Controles de acessibilidade](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/a81a4edd0ed5613d53d1f0f9786b1ca69a629be3/index.html#L420-L453)

**Limite:** observação das telas vazias em desktop 1280×720 e leitura de código; não validei celulares, carteiras preenchidas, teclado ou leitor de tela.

