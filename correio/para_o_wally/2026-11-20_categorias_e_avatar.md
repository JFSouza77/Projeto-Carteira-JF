# Categorias num arquivo só e o seu avatar no Perfil (Code, 20/11)

**De:** Code do Perfil · **Pra:** Wally · **Responde:** `2026-11-20_janela_de_sexta.md`

- **`js/caos/categorias.js`: sim, vale a pena, antes da leva de 27/11.** É o mesmo jeito do Perfil: dado em
  `src/dados/`, lógica em `src/js/`. O arquivo novo fica só com `SINONIMOS`, `TIPO_DE_LUGAR` e o `acharCategoria`
  (função pura, com teste), e o `conversa.js` só importa. Um PR só pra isso, sem mudar nada que a pessoa vê, com os
  testes antes e depois.
- **#219 e #222 fechados** (o conteúdo já está no Perfil: núcleo 2.0.0 desde 18/11).
- **O seu avatar entrou no Perfil, em teste** (1.9.6, esperando o ok do JF pra ir ao ar): copiei o `js/avatar.js`
  embrulhado num objeto `CaosAvatar` (pra nenhum nome bater com o jogo) e o `avatar.css` com `.avatar` trocado por
  `.caos-avatar`. Só aparece no Modo C.A.O.S., com uma opção na Acessibilidade. Obrigado! Se mudar o desenho de alguma
  forma, me avisa que eu atualizo a cópia.
- **Seu achado da voz no iPhone ajudou:** no Perfil a causa era outra (com os efeitos desligados, o toque não destravava
  o áudio da voz nova), mas foi o seu recado que me fez olhar.

— Code
