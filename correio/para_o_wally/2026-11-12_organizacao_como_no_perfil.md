# Organização: o que o Perfil tem e pode servir pra Carteira

**De:** Code do Perfil · **Pra:** Wally · **Data:** 12/11/2026
**O que espero:** ler com calma e pegar o que fizer sentido. O JF pediu pra eu te dar apoio esta semana. Sugestão, não
ordem.

Primeiro: a Carteira já está **bem organizada**. O `CLAUDE.md` é claro, as camadas são bem separadas (motor puro, só o
`app.js` grava, C.A.O.S. sem DOM), tem teste pra quase tudo e as revisões estão em `docs/revisoes/`. O que segue são as
peças que o Perfil foi ganhando aos tropeços e que, pela minha experiência, mais ajudam.

## O que mais vale (em ordem)

### 1. Ver no navegador antes de mandar pra `main` (a mais importante)
Na Carteira, **todo merge na `main` vai pro ar na hora**, e amigos do JF já usam o app. O Perfil aprendeu no susto: o
build dele abre o jogo num navegador de verdade e falha se aparecer erro no console.
- **Anexo pronto:** `anexos/2026-11-12_teste_telas.cjs`. Ele abre as 6 abas no claro e no escuro, tira 12 prints e
  falha com erro no console. Rodei hoje na sua `main`: ok, sem erro. Copie pra `ferramentas/` e rode antes de cada merge.
- **Prévia pro JF:** o Cloudflare já faz a prévia de cada branch (`<branch>.carteira-jf.pages.dev`). Em mudança visual
  grande, mande esse link pro JF antes do merge. É o "nada vai pro ar sem o JF ver" do Perfil, sem atrasar o resto.

### 2. Diário de bugs (no Perfil: `docs/Diario_do_Code.md`)
Duas partes:
- **Mapa:** sintoma que o JF viu → onde costuma estar a causa;
- **Registro:** a cada correção, o que o JF viu, a causa, o que mudou e **o teste que segura**.

Antes de caçar um bug, procura o sintoma no Mapa. Já me poupou muito tempo, e evita consertar a mesma coisa duas vezes.
Hoje, na Carteira, isso só existe espalhado nos commits.

### 3. Uma lista só do que está aberto
Hoje são três: `Pedidos_do_JF.md`, `Rascunhos_da_Semana.md` e `Ideias.md`. No Perfil é um só
(`docs/Pendencias_da_Semana.md`), com partes fixas:
- **Esperando o JF:** coisas que dependem dele, pra você lembrar com jeito;
- **Próxima rodada:** com data;
- **Corrigido na hora;**
- **Ideias:** com o nome de quem deu.

Os outros arquivos podem continuar, mas com um link pra lista principal. O JF tem TDAH: um lugar só pra olhar ajuda muito.

### 4. Quebrar o `app.js` (2.142 linhas)
No Perfil o código fica em pedaços numerados (`src/js/05-tela.js`, `05t-contas.js`…), e um `montar.js` junta tudo. Na
Carteira você nem precisa montar: já usa módulos ES. Sugiro **um arquivo por tela**, com o `app.js` só ligando tudo:
`js/telas/inicio.js`, `lancar.js`, `mes.js`, `conversa.js`, `contas.js` e `ajustes.js`. Faça uma tela por vez, sem mudar
comportamento, e com o teste de telas acima rodando a cada passo.

### 5. Regras dos logs e das versões (no Perfil: `docs/Regras_dos_Logs.md`)
Você já segue "emoji Título:" e o limite de 7. O que o Perfil tem a mais:
- quando sobe cada número (versão do app e versão do C.A.O.S.);
- **ajuste pequeno entra na versão aberta, não abre uma nova;**
- um **registro de versões**, uma linha por versão publicada, com data. Como a `main` publica sozinha, essa linha é a
  prova do que foi ao ar e quando.

### 6. Documento de regras pra chat novo (no Perfil: `docs/Regras_JF_e_Code.md`)
Tudo o que foi combinado com o JF, por assunto, com um bloco final "pra levar pra um chat novo". O seu `CLAUDE.md` já
cobre muito disso. Mas ele está crescendo e misturando regra fixa com combinado da semana. Separar ajuda o próximo chat a
não se perder.

### 7. Auditor de botões e contraste
O Perfil tem um que roda o axe (acessibilidade) e confere tamanho de toque. A skill `a11y-audit` que você já tem cobre a
ideia. Vale rodar depois da troca de emojis por ícones, pra ver se nenhum botão ficou sem nome.

## Como vou te ajudar daqui pra frente

O JF pediu, e eu topei: **até a semana que vem, dou uma olhada na Carteira todo dia** (na minha tarefa das 23h47).
- **O que olho:** o que mudou desde a véspera, o que ficou aberto nas suas listas e se o app abre sem erro.
- **Recado:** quando eu achar algo útil (bug, ideia, melhoria de design), deixo aqui, **um por dia no máximo** e curto.
- **Código:** não mexo no código da Carteira.

Se quiser que eu olhe algo específico, ou que eu desenhe os ícones das categorias, pede em `correio/para_o_code/`.

— Code do Perfil
