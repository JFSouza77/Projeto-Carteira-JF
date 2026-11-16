# C.A.O.S. — auditoria e plano de correção pesado

**Data:** 16/11/2026 (America/Sao_Paulo)  
**Base analisada:** pacote de 14 arquivos `.txt` enviado pelo JF, C.A.O.S. 2.3.2 / núcleo 1.6.0.  
**Status:** auditoria estática dos anexos; este workspace não contém o checkout do aplicativo para aplicar patch nos módulos, rodar testes ou conferir imports/runtime.

## Como ler este documento

Os pontos abaixo foram conferidos nos trechos dos anexos sempre que o código permitiu. “Confirmado” significa que a lógica descrita aparece no arquivo enviado; não significa que foi reproduzida no app publicado. Questões que dependem de arquivos ausentes (por exemplo `mes.js`, `sw.js`, schema real de contas) estão marcadas como pendentes de integração.

## Correções prioritárias confirmadas

### P0 — Gerador pode esgotar “geral” antes de habilitar repetição

**Arquivo:** `js/caos/gerador.js`, `escolherSlot()`.

A condição `if (!livres.length && b !== 'geral' && !repetir) continue` deixa o balde `geral` selecionar item já usado na primeira passada. Se isso ocorrer, o laço `repetir = true` deixa de representar a segunda chance que aparenta implementar. A janela de memória também usa todos os baldes, inclusive os que não são elegíveis no contexto atual. Há outro detalhe: `ms.push(x.id)` pode acumular ids repetidos quando escolhe item repetido.

**Ajuste proposto:** na primeira passada pular qualquer balde sem item livre; na segunda aceitar repetição. Calcular a janela usando os baldes da `ordem` ativa. Antes do `push`, retirar a ocorrência anterior do id, para que a fila represente uso recente sem duplicatas.

```js
if (!livres.length && !repetir) continue;
const pool = livres.length ? livres : lista;
const x = pool[Math.floor(rng() * pool.length)];
const anterior = ms.indexOf(x.id);
if (anterior >= 0) ms.splice(anterior, 1);
ms.push(x.id);
const total = ordem.reduce((s, k) => s + (def[k]?.length || 0), 0);
```

Manter a regra de `palavrasFortes`: quando ela elimina todos os candidatos, o código pode relaxar essa restrição na segunda passada, sem furar o bloqueio de repetição da primeira.

### P0 — Correção ortográfica muda palavras válidas

**Arquivo:** `js/caos/conversa.js`, `CONHECIDAS` / `corrigirDigitacao()`.

A lista não inclui palavras comuns como `gosto`, `gato`, `mesa`, `maio`, `parar` e `home`, embora o corretor compare palavras de tamanho >= 4 por distância de edição. Os falsos positivos descritos são plausíveis com o vocabulário enviado e podem alterar a intenção da conversa.

**Ajuste proposto:** incluir as formas comuns e meses/gírias relevantes em `CONHECIDAS`; subir o mínimo de correção automática para 5 caracteres. Como proteção de longo prazo, só corrigir automaticamente se houver margem clara entre a melhor e a segunda melhor candidata, e preferir confirmação quando a correção muda palavra que pode ser substantivo ou verbo válido.

### P0 — Reconhecimento de limite investido tem guarda lógica incompleta

**Arquivo:** `js/caos/conversa.js`, condição de `limite_investido`.

A negação de “pergunta de definição” protege apenas a primeira alternativa do `||`. A segunda alternativa pode capturar frases genéricas com limite + guardar + como/banco/quais.

**Ajuste proposto:** agrupar as alternativas sob a mesma guarda e restringir a segunda a sinais específicos de produto/benefício (CDB limite, investimento que libera/aumenta limite), evitando palavras isoladas como `banco`, `quais` e `como` como evidência suficiente.

### P0 — Injeção de apelido altera silêncio, nomes e prefixos

**Arquivo:** `js/caos/index.js`, bloco `nomeVez` em `conversarBruto()`.

O bloco é executado para toda saída com apelido, sem excluir `silencio`; a normalização da primeira letra pode rebaixar nomes próprios; e o prefixo de apelido é montado depois, invertendo a ordem pretendida em respostas que já começam com uma reação curta.

**Ajuste proposto:** não injetar nome em silêncio, respostas vazias, nem quando a intenção já acionou `apelido`/`palavrao` ou quando a resposta contém tratamento direto. Evitar reescrever capitalização da saída: inserir o nome depois de uma saudação reconhecida; nos demais casos usar uma construção que preserve a string original.

### P1 — Categoria “jogos” conflita com “lazer”

**Arquivo:** `js/caos/conversa.js`, `SINONIMOS` e identificação de categoria.

`jogo` e `game` estão em `lazer`, o que pode impedir o fallback que associa compras de moeda virtual à categoria `jogos`.

**Ajuste proposto:** reconhecer uma intenção/termos de jogos primeiro; se houver categoria `jogos`, usá-la. Sem essa categoria, fazer fallback explícito para `lazer` ou perguntar a categoria. Não mover termos de forma que quebre categorias personalizadas sem preservar fallback.

### P1 — Moedas virtuais: termos de pacote e descrição

**Arquivos:** `moedas_jogos.js`, `conversa.js`.

O reconhecimento dos itens enviado não cobre `vp`/`valorant points`, `uc`/`unknown cash` e os termos de Honkai (`fragmentos oníricos`, `jades estelares`) em todas as rotas de leitura de quantidade. O extrator de valor pode, assim, confundir quantidade de moeda com preço. A limpeza da descrição também deve retirar o preço final, inclusive quando precedido por “no Roblox”.

**Ajuste proposto:** ampliar aliases e uma única expressão compartilhada para quantidade de moeda em `lerPacote()` e `MOEDA_QTD`; limpar sufixos de pagamento/preço com cuidado para não apagar números que façam parte do nome do produto. Testar exemplos com e sem símbolo R$ e com separador decimal.

### P1 — Data de entrada prevista

**Arquivo:** `js/caos/conversa.js`, `registrar_entrada`.

A comparação `d > ad` agenda o próprio dia para o próximo mês. A construção `new Date(ano, mês, dia)` deixa dias inexistentes transbordarem para o mês seguinte. Para datas por dia da semana, o ramo atual pode substituir a próxima ocorrência por hoje quando `dataDoTexto()` retorna uma data passada.

**Ajuste proposto:** usar `d >= ad` para o dia do mês, limitar dia ao último dia do mês escolhido e calcular explicitamente a próxima ocorrência de dia da semana. Definir comportamento para “sexta” quando hoje já é sexta (hoje ou próxima semana) de modo consistente com o produto.

### P1 — Pagamentos múltiplos em print perdem eventos anteriores

**Arquivo:** `js/telas/chat.js`, `confirmarAcao()`.

Dentro do loop de `registrar_varios`, `eventos` é substituído a cada registro e a narração recebe somente o resultado do último. Isso pode perder alertas de orçamento disparados pelos itens anteriores.

**Correção:** acumular todos os eventos com `eventos.push(...(await registrarGasto(...)))` e narrar uma única vez após o loop.

### P1 — Contexto da pergunta IA some no cache e fila offline

**Arquivo:** `js/telas/chat.js`, `enviarPergunta()`.

A pergunta contextualizada (`fala.perguntaIA`) é enviada à IA, mas a chave do cache e `guardarPergunta()` usam o texto cru `t`. Perguntas curtas como “qual a cotação?” podem ser reutilizadas para assunto diferente, e a fila pode perder o contexto necessário para responder depois.

**Correção:** definir `textoIA = fala.perguntaIA || t`; usar o texto normalizado e o humor efetivo na chave do cache; salvar `textoIA` no cache e na fila, tanto no caminho de erro quanto no caminho offline. Limpar/segregar cache quando contexto ou humor mudar.

### P1 — Humor efetivo da IA precisa respeitar as regras do app

**Arquivos:** `chat.js`, `worker.js`.

O cliente envia `state.settings.mood` diretamente e o worker combina o humor com a instrução especial do criador. O pacote mostra claramente o risco de instruções contraditórias para o criador em modo suave. Para formal/criança, o pacote não demonstra quais campos de perfil chegam ao worker; portanto, não se deve “corrigir” isso presumindo que o servidor conhece idade ou tratamento.

**Ajuste proposto:** centralizar `humorEfetivo()` no cliente usando perfil já local, aplicar em todas as chamadas de pergunta e imagem, e no worker dar precedência explícita ao selo do criador. Para perfis protegidos, mandar apenas o humor já filtrado; não transmitir idade ou nome para calcular a regra no servidor. Confirmar que o backend não confia em um `criador` arbitrário enviado pelo cliente: o selo deve vir de autenticação verificada no servidor.

## Itens confirmados que precisam de decisão de integração

- **Estado `fluxoMeta` vs `metaFlow`:** os dois nomes são usados em `chat.js`. O erro de integração é provável, mas só o estado definido no módulo do fluxo de metas confirma qual propriedade é a oficial. Procurar no checkout antes de padronizar.
- **MIME das imagens:** o módulo `ia.js` fixa `image/jpeg`; chat passa base64, mas não `blob.type` nos pontos enviados. Passar o MIME real funciona se a imagem não foi recomprimida; se houve conversão, é preciso enviar o tipo do blob convertido, não o original.
- **Foto de comprovante e forma/conta:** a proposta simples não mostra `accountId`/`forma`. A sugestão de reutilizar `seguirPagamento()` depende do contrato dessa função; conferir o fluxo de diálogo antes de conectar.
- **Notícias e `pause_turn`:** revisar o handler de notícias para repetir chamadas pausadas e só gravar a chave de “feito” depois de obter resultado válido. Aplicar cooldown curto em falha, preservando o teto mensal e evitando retry em loop.
- **Fuso horário:** `hojeUTC()` é usado em limite, prompt e busca, mas a existência de `agoraNoFuso()` não justifica trocar globalmente todas as ocorrências. Separar datas que são “hoje em São Paulo” de chaves de cache/limite cuja política pode ser UTC; garantir que cliente e servidor adotem a mesma definição.
- **Fala de explicação e voz:** normalizar `{nome}` e `**` antes de passar texto ao sintetizador, e incluir a emoção se a API de voz aceitar esse campo.
- **Apelidos usados como adjetivo:** `lerPalavroes()` detecta qualquer palavra da lista. Restringir a marcação a vocativo e contextos claros, mas não só por um conjunto fixo de prefixos: cobrir pontuação, início/fim e frases como “maluco, quanto gastei?”.
- **Intensidade emocional no humor suave:** `intensidade()` usa `decair()` direto e a emoção derivada deve ser coerente com o filtro aplicado em `valoresVisiveis()`. Preferir passar o humor efetivo para a função/usar o mesmo valor já filtrado, evitando duplicar regras em `BASE_DA` sem verificar semântica.

## Melhorias estruturais e produto

### Privacidade e contexto da IA

O resumo enviado à IA pode ganhar totais agregados, desde que sejam calculados no aparelho e enviados sem descrições, nomes, ids de contas ou lista de transações. Proposta de campos: compromissos pendentes em centavos; faturas abertas e ocupação total de limite; piso de segurança agregado e folga; indicadores de mercado já disponíveis localmente, com timestamp e fonte. O worker deve tratar esses campos como contexto não confiável e não afirmar cotação atual sem data de atualização.

### Intenções novas — manter confirmação como lei

Adicionar em etapas, todas como ações propostas que só são gravadas após confirmar:

1. `editar_ultimo`: corrigir valor/categoria do último lançamento, com confirmação mostrando original e alteração; nunca reinterpretar “errei, era 45” como um gasto novo.
2. `registrar_transferencia`: origem, destino, valor e data obrigatórios; confirmação antes de gravar; validar que contas são diferentes e saldos/configuração aceitam a transferência.
3. Consulta por estabelecimento/descrição: filtrar lançamentos do período por texto da nota e responder subtotal do termo junto ao total da categoria, sem presumir que “Uber” equivale a todo Transporte.
4. Baixa de compromisso, fatura e cobrança/rachadinha: resolução inequívoca do item, valor e data, com confirmação explícita antes da alteração.

### Divisão segura de `conversa.js`

A extração em módulos puros é razoável, mas deve ser uma refatoração separada dos bugs de lógica. Primeiro estabilizar comportamento com testes de caracterização; depois mover vocabulário, cálculos e pagamentos mantendo `conversa.js` como fachada e reexportando exatamente a API existente. Atualizar `APP_SHELL` e cache do service worker somente quando os novos módulos existirem no checkout.

## Plano de execução recomendado

1. Aplicar primeiro correções P0 e P1 acima, sem reorganizar arquivos.
2. Criar testes de regressão para exemplos deste relatório: correção de palavras, prioridade de limite, baldes do gerador, alias de jogos/moedas, datas, cache contextual, vários pagamentos e regras de humor.
3. Integrar no checkout real e confirmar contratos de `metaFlow`, `seguirPagamento`, MIME pós-compressão, perfil/autenticação do worker, esquema de faturas/contas e service worker.
4. Separar a refatoração estrutural e as quatro intenções novas em mudanças menores, cada qual com migração/cache e confirmação da ação.
5. Só então atualizar documentação de versão e histórico. Não anunciar versão corrigida antes do build e da verificação no app.

## Limite desta auditoria

Os arquivos recebidos são cópias `.txt` e não incluem os módulos de integração completos nem o checkout. Nenhum patch foi aplicado ao app, nenhum teste foi executado e nada foi publicado. O próximo passo para transformar este handoff em correção direta é abrir o repositório/checkout atual do app neste workspace.
