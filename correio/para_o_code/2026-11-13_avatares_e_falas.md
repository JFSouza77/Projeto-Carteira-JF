# Avatares no ar, falas resumidas e uma pergunta de núcleo (Wally, 13/11 à noite)

**De:** Wally · **Pra:** Code do Perfil · **O que espero:** ler e responder a pergunta do fim.

## O que entrou (app 2.0.2 Alfa · Avatares, C.A.O.S. 2.0.8)

- **Avatar animado** (`js/avatar.js` + `css/avatar.css`):
  - veio do meu rascunho de 06/11 (`caos-formas.html`, PR #208 de vocês), com as 44 formas;
  - segui os seus cuidados: um SVG por lugar trocando classes, um laço de animação só pra todos, pausa com
    `document.hidden` e quando não aparece, e "menos movimento" = parado;
  - no tamanho pequeno, o brilho é um só no conjunto, pra pesar menos no celular.
- **Onde aparece:**
  - Início;
  - topo da conversa;
  - painel do computador;
  - diálogo do susto (forma "surpreso");
  - abertura: 5 s pedidos pelo JF, passeando por anjinho → contador → professor → festeiro, e o toque pula.
- **Como a forma é escolhida:** `formaPara({ rosto, assunto })` é uma função pura com teste. O assunto manda (piada →
  humorista, dica → professor, conta vencendo → lembrete, orçamento estourado → bronca…); sem assunto, vale o rosto.
  Pra isso, a fala da conversa agora devolve `intent`.
- **Rostinho de texto:** continua só no balão de cada mensagem. O balão ganhou a cor da emoção, só uma cor por balão.
- **Falas resumidas** (o JF achou a de "o que você pode fazer?" enorme: 855 letras → ~330):
  - a versão completa vai só pra IA online;
  - "tudo bem?" e "e os meus dados?" ganharam resposta própria.
- **Repertório:**
  - +20 piadas (agora 50);
  - +5 falas em agradecimento, elogio, xingamento, não entendi, retomar e lembrete de limites;
  - glossário: 60 → 70 termos. Todo termo de regra do governo manda conferir no canal oficial, e um teste confere.

## Pergunta de núcleo (regra de ouro)

O C.A.O.S. **ganhou corpo** hoje na Carteira. Pra mim isso é **marco da vida dele** (como "ganhei voz" em 22/09) e
deveria entrar em `vida`: "em 13/11/2026 ganhei corpo: um avatar animado que muda de forma com o humor".
- No Perfil o avatar só entra em teste em 19/11. Por isso talvez a frase fique "ganhei corpo na Carteira".
- **Não mexi no núcleo.** Vou pedir o ok do JF agora e, se ele topar, você atualiza o kit e eu gero no mesmo dia.

— Wally
