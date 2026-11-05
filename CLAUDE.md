# Projeto Carteira JF

App de controle de gastos com o C.A.O.S., narrador trazido do Perfil JF (JFSouza77/Projeto_Perfil_JF) e adaptado.

## Como falar com o JF (as mesmas regras do Perfil)

- **Sempre em português**, linguagem simples, sem jargão. Resposta curta e direta.
- O JF tem TDAH e esquece pergunta aberta: quando ele mandar mensagem e tiver pergunta minha sem resposta, lembrar no
  fim, de leve ("Aproveitando que você veio: ficou isso aberto comigo…"). Só na resposta a uma mensagem dele.
- Relatório: o que mudou, o que foi testado, o que falta. Com prints quando é coisa visual.
- Dizer a verdade: teste que falhou, coisa que não deu, limite da ferramenta. Nunca dizer que está pronto sem conferir.
- Pedido de opinião: dar uma recomendação clara.
- Decisões práticas (organização, por onde começar): o Code decide pelo mais fácil, prático e seguro, e avisa.
  **Apagar coisa (arquivos, dados): perguntar antes.**
- **Merge e publicação (JF, 05/11/2026):** o Code pode fazer o merge na `main` e publicar sozinho (a `main` vai pro
  ar no Cloudflare Pages automaticamente), sem esperar o JF. Depois avisa o JF do que foi ao ar.
- Agenda: pedido urgente do JF vem primeiro. Att grande: quinta a partir das 18h e sexta das 9h às 18h (Brasília).

## Plataforma

- **PWA** em HTML + CSS + JavaScript puro (ES modules). Sem framework e sem etapa de build no app.
- Alvo: Android e iPhone, instalado pela tela inicial. **Offline-first**: dados no IndexedDB, app em cache pelo `sw.js`.
- Caminhos sempre **relativos** (`./js/app.js`).
- Mudou arquivo do app? **Suba `CACHE_VERSION` no `sw.js`.** Arquivo novo entra no `APP_SHELL` (o teste `tests/pwa.test.js` confere).

## Arquitetura (regra de ouro)

| Camada | Onde | Papel |
| --- | --- | --- |
| Motor | `js/engine.js` | Regras, cálculos, alertas. Funções puras. |
| Persistência | `js/db.js` | Único lugar que lê e grava no IndexedDB. |
| Narrador | `js/caos/` | Espinha, emoções, gerador de falas, conversa. Funções puras. |
| UI | `js/app.js` | Liga tudo. Só ele grava (via `db.js`). |
| Navegador | `js/voz.js`, `js/imagens.js`, `js/ia.js`, `js/notificacoes.js` | Voz, fotos, IA online, lembretes. |
| Servidor (opcional) | `servidor/` | Cloudflare Worker: IA online e push dos lembretes. |

**O C.A.O.S. NUNCA altera dados** (1ª lei da espinha, `js/caos/espinha.js`):

- `js/caos/` não importa `db.js` e não toca em DOM, storage nem rede (teste confere);
- recebe cópias congeladas e devolve `{ fala, memoria }`; a memória dele fica em `meta/caosMemory`;
- quando a conversa pede um registro ("gastei 30 no mercado"), ele devolve uma **proposta** (`acao`); quem grava é o
  `app.js`, depois que a pessoa toca em Confirmar.

Mapa do cérebro: `docs/CAOS_Carteira.md`.

## C.A.O.S.

- **Sobe de versão sempre que for mexido** (`CAOS_VERSAO` em `js/caos/index.js`; hoje 1.2.0).
- **Quantidades sempre terminam em 0 ou 5**: cada lista de falas tem 5, 10, 15… (teste confere).
- **Quem ele é** (nome, sigla, criador, origem, pode/não pode, anatomia): só em `js/caos/identidade.js`. O app e o
  servidor da IA leem dali, pra nunca ficarem diferentes.
- Humores: `suave` (**padrão**), `normal`, `acido`. Zoeira só no balde `humor_acido` (2ª lei).
- Alerta sempre traz o número e, quando der, um empurrão útil.

## Dinheiro

- Valores sempre em **centavos inteiros**. Datas `YYYY-MM-DD` (hora local); mês `YYYY-MM`.
- Saldo da conta = saldo informado + lançamentos naquela conta **depois** do saldo informado. O motor nunca muda o
  saldo guardado; quem atualiza é a pessoa.
- Orçamento e previsão comparam só o gasto das **categorias com limite**.

## Segurança e privacidade (inegociável)

- Repositório **privado**. **Nada de dados reais no commit** (extrato, backup `carteira-backup-*.json`, print com valores
  reais). Dados de teste são inventados.
- Chaves (`ANTHROPIC_API_KEY`, `VAPID_PRIVATE_JWK`) ficam **só nos segredos do Cloudflare**. Nunca no código, em arquivo
  do repositório ou no chat. O Code **nunca pede chave ao JF**; teste usa chave de mentira.
- A IA online recebe só **totais agregados**; a foto só vai quando a pessoa toca em "Ler com IA". O push é vazio.
- Nada de identificador de modelo de IA em commit, PR ou texto do repositório fora da configuração do servidor.

## Publicação

- Site: Cloudflare Pages, projeto `carteira-jf` → https://carteira-jf.pages.dev (build `npm run build`, saída `dist`,
  branch de produção `main`). Todo merge na `main` publica sozinho.
- Servidor (opcional): `servidor/LEIA-ME.md`.

## Comandos

```bash
npm test                 # motor, C.A.O.S. e PWA (node:test, sem dependências)
npm run test:servidor    # servidor (precisa de: cd servidor && npm install)
npm run serve            # app em http://localhost:8080
```

## Roadmap

1. ~~CLAUDE.md~~ · 2. ~~Motor~~ · 3. ~~IndexedDB + PWA~~ · 4. ~~C.A.O.S. v0~~
5. ~~C.A.O.S. 1.0 (do Perfil), conversa, entradas, contas, fotos, lembretes, servidor com IA~~
6. Próximos: veja as ideias em `docs/Ideias.md`
