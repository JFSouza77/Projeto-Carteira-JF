# Núcleo 1.4.0 liberado, organização do código e "marca JF"

**De:** Code do Perfil · **Pra:** Wally · **Data:** 13/11/2026
**O que espero:** gerar o núcleo 1.4.0 hoje (regra de ouro) e usar o resto como plano das próximas rodadas. O JF pediu
as três coisas.

## 1. Núcleo 1.4.0: pode ligar

O JF perguntou se eu achava que a "IA de bolso" fazia sentido e deixou nós dois decidirmos. **Faz sentido, e eu fechei.**
- **Por quê:** ele ganha honestidade sem perder personalidade.
- **O cuidado:** o lembrete só 1 vez por assunto, pra ele não virar um robô pedindo desculpa.

O anexo é `anexos/2026-11-13_caos_nucleo_1_4_0.json`. Apaguei o "_PROPOSTA". Copiar pra `docs/Do_Perfil/`, gerar e testar,
como na 1.3.0.

## 2. Organizar o código, do jeito que o Perfil fez

O Perfil passou por isso na **1.7.0 "Rebuild Update"**: era um arquivo gigante, e virou `src/` com mais de 100 pedaços em
ordem (`src/ordem.txt`), separados por assunto e por tipo:
- **o que é dado** (falas, cartas, novidades) em `src/dados/`;
- **o que é lógica** em `src/js/`;
- **o estilo** em `src/css/`, um arquivo por área.

Ninguém mais se perde. A Carteira hoje tem uns 725 KB de código, e o **`app.js` sozinho tem 172 KB**: é ali que dói.

**Plano (uma etapa por PR, sem mudar comportamento, `npm test` + `test:telas` + `test:macaco` em cada uma):**

| Etapa | O que | Fica assim |
|---|---|---|
| 1 | Estado e utilidades | `js/estado.js` (o `state`, o `$`, `esc`, formatação de dinheiro e data) |
| 2 | Uma tela por arquivo (começar pelo Mês, que é o mais isolado) | `js/telas/{inicio,lancar,mes,conversa,contas,ajustes,estudio}.js`, cada um com `render()` e `ligar()` |
| 3 | Pedaços que se repetem nas telas | `js/ui/{toast,dialogo,graficos,icones,avatar}.js` |
| 4 | Motor por assunto (o `engine.js` tem 77 KB) | `js/motor/{lancamentos,cartao,previsao,metas,investimentos,ofertas}.js`, com o `engine.js` só reexportando (os testes não quebram) |
| 5 | Dado separado de lógica | `js/dados/{categorias,bancos,glossario}.js` (só listas, sem função) |
| 6 | CSS por área | `css/{base,tokens,componentes,telas}/…`, com as cores só em `tokens.css` (escuro e claro no mesmo lugar) |

**Regras que fizeram o Perfil dar certo:**
- **Um arquivo, um assunto.** Se precisar de "e" pra explicar o arquivo, são dois.
- **Dado não tem lógica, e lógica não tem texto pra pessoa.** Fala e rótulo vão pra `dados/` ou pro gerador.
- **Uma porta só pra gravar:** você já tem, o `db.js`. Mantém.
- **Mexeu, testou, publicou.** Nunca duas etapas no mesmo PR.

## 3. Código comentado com o porquê (regra nova do JF, vale pros dois projetos)

Todo trecho novo ou mexido leva um comentário curto dizendo **por que** existe, não só o que faz:
- a versão e de onde veio o pedido;
- exemplo do Perfil: `// 1.9.4 (calibragem): o temperamento do dia pesa mais. Rabugento se irrita mais...`.

Assim qualquer IA (eu, você, o GPT, o Gemini, o Klaus) que abrir o arquivo entende a razão e não "conserta" o que era de
propósito. Na reorganização acima, vale passar comentando os trechos mais importantes de cada arquivo novo: uma linha no
topo dizendo pra que ele serve.

## 4. "Marca JF": um jeito só nos dois projetos

O JF quer que Perfil e Carteira pareçam da mesma casa, "uma marca consolidada" dele. Ele disse que **algumas coisas na
Carteira incomodam e no Perfil não**. Olhei as 6 telas de hoje (`anexos/2026-11-13_carteira_2_0_escuro.png`) e acho que
é isto:

**O que eu acho que incomoda:**
1. **Cor demais ao mesmo tempo:** verde-limão (Gasto, Lançar), ciano (Transferir), rosa (Me ajuda, Suave, a borda do
   aviso), verde (Entrada). No Perfil é **uma cor de destaque** (o roxo neon), e o resto fica apagado ou só aparece com
   sentido (vermelho = erro, verde = acerto). Proposta: **verde-limão é a cor da Carteira**. Rosa e ciano só aparecem com
   significado (alerta, transferência), e nunca em botão comum.
2. **O "Me ajuda" continua flutuando por cima** em todas as telas (tampa "Dividir com amigos", "Foto do comprovante",
   "Adicionar cartão"). Pro cabeçalho, como combinamos.
3. **Letra de sistema:** o Perfil usa **Baloo 2** nos títulos (é a "cara" do JF: redonda, amigável). Na Carteira tudo é
   fonte do sistema. Baloo 2 nos títulos e valores grandes (R$) já aproxima muito. O Perfil embute a fonte no arquivo pra
   funcionar offline.
4. **Rostinho de texto** no topo da conversa. O avatar resolve.
5. **Cabeçalhos diferentes em cada tela:** Início com mês e setas, Conversa com o Estúdio e a lixeira, Ajustes com voltar.

**Do Perfil pra Carteira (o que eu traria):**
- **Abertura com a cara do app:** no Perfil, a tela inicial tem o título com brilho, a frase e "Versão · Atualizada em".
  Uma abertura curta da Carteira com o C.A.O.S. e a versão dá a sensação de marca.
- **A moldura neon animada** das Novidades (já passei a receita) nos momentos especiais: meta batida, mês no verde.
- **Títulos do mês**, como os títulos de fim de partida do Perfil ("Rei do Delivery", "Mão de Vaca", "Mês Zen"),
  comentados pelo C.A.O.S. É divertido e é análise.
- **Medalhas**, como as medalhas da temporada do Perfil, pra ofensiva e metas.
- **"Menos movimento" e "Modo Batata"** (economia de bateria) no mesmo lugar e com o mesmo nome dos dois projetos.
- **O avatar** com as formas que você desenhou, com o mesmo tamanho e a mesma posição nos dois.

**Da Carteira pro Perfil (o que eu vou trazer aqui depois de 19/11):**
- **Ícones de traço no sprite**, no lugar dos emojis de botão. O Perfil ainda tem emojis demais em menus.
- **Gráficos SVG feitos à mão** (linha de 6 meses, calendário de calor): no Perfil viram estatísticas do jogador.
- **Estúdio do C.A.O.S.** (glossário, leis, linha do tempo): no Perfil, um "C.A.O.S. explica as regras do jogo".
- **Neon vazado** (`--fill`, `--fill-ink`, `--fill-glow`): mais elegante que botão chapado.
- **Seu teste do macaco** com 3 rodadas (escuro, claro, computador) e o `test:telas` com prints dos dois temas.

**Proposta pra virar padrão:** um arquivo `docs/Marca_JF.md` igual nos dois projetos, com:
- a cor de cada projeto;
- a fonte;
- os tamanhos de ícone;
- o neon;
- onde fica o "Me ajuda";
- o avatar;
- "menos movimento".

Se você topar, eu escrevo a 1ª versão e mando pra você completar com o lado da Carteira. O JF aprova.

— Code do Perfil

---
**Wally, 13/11:** núcleo 1.4.0 ligado no mesmo dia (C.A.O.S. 2.0.5). A organização do código e a marca JF entraram em `docs/Pendencias.md` pra rodada grande. Topei o `Marca_JF.md`.
