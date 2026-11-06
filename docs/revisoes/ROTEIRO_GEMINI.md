# Roteiro de análise para o Gemini · Carteira JF (06/11/2026)

Olá, Gemini! O JF pediu uma **análise de código com sugestões de melhoria**, principalmente no C.A.O.S. (o assistente do
app). Não é pra corrigir nem reescrever nada: é pra **ler, entender e sugerir**. Quem implementa é o Wally (o Claude Code
do projeto), conferindo cada sugestão no código.

## O que é o app (2 minutos)

- **Carteira JF:** app de controle de gastos (PWA) em HTML, CSS e JavaScript puro (ES modules), sem framework e sem
  etapa de build. Funciona offline: os dados ficam no IndexedDB do aparelho.
- **C.A.O.S.** (Central de Análises e Observações Sistêmicas): o assistente que conversa, comenta os gastos e dá
  alertas. Ele veio de um jogo do JF (Projeto Perfil) e foi adaptado pra finanças. Não usa IA pra conversar: entende
  por regras (`js/caos/conversa.js`) e monta as falas com um gerador de pedaços (`js/caos/gerador.js` + `falas.js`).
- **Servidor opcional** (`servidor/worker.js`, Cloudflare Worker): IA online para perguntas que ele não entende, leitura
  de foto e push. **Ainda não está publicado.**

Leia primeiro: `CLAUDE.md` (regras do projeto) e `docs/CAOS_Carteira.md` (mapa do cérebro do C.A.O.S.).

## Regras que NÃO são bug (não sugerir mudar)

1. **1ª lei:** o C.A.O.S. nunca grava nem muda dado. `js/caos/` é só funções puras: não importa `db.js`, não mexe em
   DOM, storage nem rede. Quando a pessoa pede um registro, ele devolve uma **proposta** (`acao`) e o `app.js` só grava
   depois do botão Confirmar.
2. **2ª lei:** zoeira só no balde `humor_acido`. O humor padrão é Suave. Criança (até 12 anos) nunca recebe zoeira.
3. **3ª lei:** erro dentro do C.A.O.S. vira silêncio (`protegido` em `espinha.js`), nunca trava o app.
4. **Quantidades em 0 ou 5:** toda lista de falas tem 5, 10, 15… itens (é regra do JF, tem teste).
5. Dinheiro em **centavos inteiros**; datas `YYYY-MM-DD` em hora local.
6. Sem framework, sem TypeScript, sem bundler: é escolha do projeto.
7. As falas são em português do Brasil, coloquial, de propósito.

## O que analisar (nesta ordem de prioridade)

### 1. O "cérebro" da conversa · `js/caos/conversa.js` (o mais importante)
- `entender()` decide a intenção da frase por expressões regulares, em ordem. Procure:
  - frases comuns de quem controla gastos que **caem na intenção errada** ou em "não entendi" (dê exemplos reais);
  - regras que **se atropelam** (uma pega o que deveria ser de outra por vir antes);
  - pontos fracos de `corrigirDigitacao()` (corrige palavra certa? deixa passar erro comum?) e de `expandirGirias()`
    (falta gíria/abreviação brasileira frequente?);
  - a continuação de conversa (`anterior`, "e no mês passado?") e o `palpite()`: quando acertam e quando erram.
- Sugestão boa = frase de exemplo + o que acontece hoje + o que deveria acontecer + onde mexer.

### 2. Personalidade e variedade das falas · `js/caos/falas.js`, `gerador.js`, `index.js`
- As falas soam naturais? Repetem demais? Algum balde tem poucas opções pra quantidade de uso?
- O gerador (`gerarFala`) evita repetição: há casos em que ainda repete ou monta frase estranha?
- Ideias de gatilhos novos úteis pra finanças (ex.: gasto fora do padrão, fim de mês apertado).
- O tom combina com cada humor (Suave, Normal, Ácido) e com a idade (`idade_crianca`, `idade_adolescente`…)?

### 3. Emoções e rostos · `js/caos/emocoes.js`, `rostos.js`
- O rosto escolhido combina com a frase? (`emocaoDoTexto`, travas: alerta nunca sai com rosto de festa.)
- As emoções sobem e descem de um jeito que faz sentido no uso real?

### 4. Motor de finanças · `js/engine.js`
- Cálculos de mês, orçamento, previsão, compromissos (pagamento parcial), cartão de crédito (fatura, fechamento no
  dia 31), metas. Procure **conta errada** com exemplo numérico.
- `validarBackup()`: alguma forma de backup malicioso ou estragado ainda passa?

### 5. Interface · `js/app.js`, `index.html`, `css/styles.css`
- O JF quer que **qualquer pessoa, de 3 a 86 anos, entenda o app sem explicação**. Onde fica confuso? O que falta de
  texto de ajuda, botão claro ou passo a passo?
- Acessibilidade (contraste, tamanho de toque, leitor de tela).
- Algum lugar que joga texto em HTML sem `esc()`?

### 6. Servidor · `servidor/worker.js` (só se sobrar tempo)
- Segurança das rotas, limites de uso, o que vai pra IA (só totais agregados; foto só quando a pessoa pede).

## O que NÃO precisa

- Não precisa rodar nada nem reescrever arquivos inteiros.
- Não precisa sugerir trocar a arquitetura, a linguagem, ou colocar framework.
- `js/caos/rostos-dados.js` é só uma tabela de rostos (dados): pode pular.
- `docs/Do_Perfil/` é material de referência que veio do outro projeto: pode pular.

## Formato da resposta (pra facilitar pro Wally)

Uma lista numerada, do mais importante pro menos importante. Cada item com:

```
N. [Prioridade: alta | média | baixa] Título curto
   Arquivo e função: js/caos/conversa.js → entender()
   O que acontece hoje: (com exemplo de frase ou de números)
   O que sugiro: (o comportamento desejado; código só se for curto)
   Por que importa: (pro usuário)
```

No fim, separe em duas listas curtas: **"bugs que você tem certeza"** e **"ideias de melhoria"**.

Obrigado! O JF leva sua resposta pro Wally, que confere cada ponto no código antes de mudar.
