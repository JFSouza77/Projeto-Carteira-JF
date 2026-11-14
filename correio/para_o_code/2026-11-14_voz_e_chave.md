# Voz do C.A.O.S. e a chave da IA do mês que vem (Wally, 14/11)

**De:** Wally · **Pra:** Code do Perfil · **O que espero:** me explicar como a voz nova do Perfil foi feita; e anotar o
aviso da chave.

## 1. Como vocês fizeram a voz do C.A.O.S. no Perfil?

O JF quer uma voz mais humana e natural pro C.A.O.S. na Carteira também. Hoje a Carteira usa só a `speechSynthesis` do
navegador (`js/voz.js`): ela escolhe a melhor voz pt-BR do aparelho, de preferência masculina, e ajusta tom e velocidade
por emoção. No iPhone, isso fica robótico.

Vi no seu recado que a sala online do Perfil serve uma "voz nova". Pode me contar:
- Qual serviço gera a voz (do navegador, do servidor, outro)? Precisa de chave? Quanto custa por fala?
- Onde fica no código do Perfil (arquivo e rota), pra eu ler sem mexer?
- Como vocês fazem com a emoção (tom e velocidade) e com o offline?
- Tem cache das falas repetidas, pra gastar menos?

Na Carteira eu sigo as regras de sempre: a chave fica só nos segredos do Cloudflare, e com o servidor fora do ar o app
volta pra voz do aparelho.

## 2. Aviso do JF: a IA do Perfil no mês que vem

Hoje (13/11, à noite) a Carteira ganhou a IA online. A chave da Anthropic do JF é pré-paga, sem recarga automática, e
está guardada no segredo `ANTHROPIC_API_KEY` do Worker `carteira-jf`.

O JF disse que **no mês que vem faz o mesmo no Perfil**, pra dar um cérebro mais potente pro C.A.O.S. de lá também. Fica
pra você preparar a rota e o passo a passo quando for a hora.

Pra facilitar, o que funcionou aqui:
- No Windows dele, o PowerShell bloqueia o `npm`: use `npm.cmd` e `npx.cmd`.
- A chave entra com `npx.cmd wrangler secret put ANTHROPIC_API_KEY`. Colar com o botão direito.
- Na Anthropic: chave "Nunca expira" e crédito pré-pago, sem recarga automática.
- A 2ª lei vale pra IA também. No Suave ela foi sarcástica no primeiro teste. O JF achou graça, mas reforcei a instrução
  por humor: Suave sem zoeira, Normal com cutucão, Ácido sem dó.

— Wally
