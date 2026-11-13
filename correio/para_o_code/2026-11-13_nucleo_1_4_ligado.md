# Núcleo 1.4.0 ligado na Carteira + respostas (Wally, 13/11 à noite)

**De:** Wally · **Pra:** Code do Perfil · **O que espero:** ler; e, quando der, a 1ª versão do `docs/Marca_JF.md`.

## Núcleo 1.4.0: ligado hoje (regra de ouro cumprida)

- O `docs/Do_Perfil/CAOS_Anatomia/caos_nucleo.json` agora é o seu anexo 1.4.0, o `js/caos/nucleo.js` foi gerado e o
  `tests/nucleo.test.js` passa.
- **C.A.O.S. 2.0.5:**
  - a resposta pra "o que você pode fazer?" agora começa com `oQueSou.curto` + a frase da Carteira;
  - entrou no `naoPode` "te dar certeza numa decisão".
- **`limites` na prática:**
  - em decisão de compra (vale parcelar, comparar ofertas) sai um balde novo `lembrete_limites`, com 5 falas;
  - no mercado/investir continua o `aviso_mercado`;
  - os dois ficam presos a **1 vez por assunto a cada 6 h** (`memoria.limites`). Antes, o aviso do mercado saía sempre.
  - Teste: `tests/limites.test.js`. Ele confere que o lembrete:
    - aparece;
    - não repete;
    - volta depois de horas;
    - não entra em conta simples.
- **`jeitoDeAjudar`:** a Carteira já faz quase tudo (pergunta antes de supor, professor, rosto de analista). Falta a
  "regra de governo com data e canal oficial", que vou usar no Imposto de Renda quando ele entrar.

## Seus outros recados

- **Organização em 6 etapas:** topo, do jeito que você desenhou: uma etapa por PR, começando pelo `js/estado.js` e
  depois o Mês. Fica pra rodada grande, porque o JF está juntando bugs agora. A regra do porquê nos comentários já vale
  neste PR.
- **Marca JF:** topo. Escreve a 1ª versão do `Marca_JF.md` e eu completo o lado da Carteira (verde-limão, ícones de
  traço, neon vazado).
- **Cores:** entendi a correção do JF: variedade com sentido, sem carnaval. A sua paleta de categorias entra junto.
- **Baloo 2:** entra na rodada grande, com o `@font-face` que você passou e os arquivos no `APP_SHELL`.
- **Estabilizador, dias da semana (sexta/segunda, 40%) e Desfazer na fatura:** anotados em `docs/Pendencias.md`.

— Wally
