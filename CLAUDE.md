# Projeto Carteira JF

App de controle de gastos com um narrador (C.A.O.S. financeiro) que comenta os gastos.

## Plataforma

- **PWA** em HTML + CSS + JavaScript puro (ES modules). Sem framework e sem etapa de build.
- Alvo: Android e iPhone, instalado pela tela inicial.
- **Offline-first**: o app inteiro funciona sem internet. Dados no **IndexedDB**; app shell em cache pelo
  service worker (`sw.js`).
- Caminhos sempre **relativos** (`./js/app.js`, não `/js/app.js`), para o app funcionar em qualquer subpasta.
- Ao mudar qualquer arquivo do app shell, **suba `CACHE_VERSION` em `sw.js`**, senão o celular continua com a
  versão antiga em cache. Arquivo novo no app shell também precisa entrar na lista `APP_SHELL`.

## Arquitetura (regra de ouro)

| Camada | Arquivo | Papel |
| --- | --- | --- |
| Motor | `js/engine.js` | Regras, cálculos e detecção de eventos. Funções puras, sem DOM e sem IndexedDB. |
| Persistência | `js/db.js` | Único lugar que lê e grava no IndexedDB. |
| Narrador | `js/caos.js` | Recebe eventos e devolve uma fala. Funções puras. |
| UI | `js/app.js` | Liga tudo: lê a tela, chama o motor, grava via `db.js`, pede fala ao narrador. |

**O narrador NUNCA altera dados.** `js/caos.js`:

- não importa `db.js` e não toca no DOM, no IndexedDB nem no `localStorage`;
- recebe eventos e snapshots só para leitura (os testes passam objetos congelados);
- devolve `{ fala, memoria }`. A memória do narrador (anti-repetição, cooldown) é o único estado dele, e quem
  grava é o `app.js`, numa chave separada (`meta/caosMemory`), nunca junto dos gastos.

Se uma feature nova parecer exigir que o narrador mude um gasto, um orçamento ou uma categoria, ela pertence ao
motor, não ao narrador.

## Dinheiro

- Valores sempre em **centavos inteiros** (`amountCents`, `budgetCents`). Nunca guarde float de reais.
- Datas de gasto em `YYYY-MM-DD` (hora local); mês em `YYYY-MM`.

## C.A.O.S.

- Humores: `suave` (**padrão**), `normal`, `acido`. Humor ácido sobre dinheiro irrita quem está apertado; nunca
  mude o padrão.
- Toda fala de alerta deve trazer o número (quanto, quantos %) e, quando der, um empurrão útil. Piada sozinha
  não ajuda ninguém a controlar gasto.
- Anti-repetição e cooldown ficam em `caos.js`. Alertas de orçamento não têm cooldown; o "gasto cadastrado" tem.
- Voz é opcional (`speechSynthesis`, pt-BR), desligada por padrão.

## Privacidade e repositório

- Repositório **privado**.
- **Nada de dados reais no commit**: nenhum extrato, backup (`carteira-backup-*.json`), print com valores reais
  ou planilha pessoal. Dados de teste são inventados.
- Nenhuma chave de API no app. A IA online (fase 5) passa por um Cloudflare Worker que guarda a chave, e o app
  envia só **totais agregados por categoria**, nunca a lista de gastos.

## Comandos

```bash
npm test          # testes do motor e do narrador (node:test, sem dependências)
npm run serve     # servidor local em http://localhost:8080
```

Service worker e `crypto.randomUUID` exigem `https` ou `localhost`.

## Roadmap

1. ~~CLAUDE.md~~
2. ~~Motor: cadastrar gasto, categorias, total do mês, orçamento por categoria~~
3. ~~IndexedDB + instalação como PWA~~
4. ~~C.A.O.S. v0: gatilhos com banco pequeno de falas~~
5. Cloudflare Worker com IA online (resumo mensal e insights, só dados agregados)
