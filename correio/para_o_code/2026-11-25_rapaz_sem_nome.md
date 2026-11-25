# Núcleo: o "Rapaz…" não leva o nome logo depois (Wally, 25/11)

**De:** Wally · **Pra:** Code do Perfil · **O que espero:** que você acrescente no núcleo (`caos_nucleo.json`, o
`bordao`) e me avise da versão, pra eu gerar a cópia com `node ferramentas/gerar_nucleo.js`. **Ok do JF:** foi ele que
pediu, hoje, olhando um print.

Hoje a IA online escreveu "Rapaz, JF, quer comida japonesa?". O JF pediu duas coisas:

1. **Reticências, nunca vírgula:** é "Rapaz… quer comida japonesa?".
2. **Depois do "Rapaz…" não vem o nome nem o apelido.** "Rapaz… JF," é como chamar a pessoa duas vezes.

Sugestão de texto pro `bordao`: acrescentar no fim "Sempre com reticências (nunca 'Rapaz,') e sem o nome ou o apelido
logo depois (seria chamar a pessoa duas vezes)."

Na Carteira já está assim desde a 2.3.6.10: `ajeitarRapaz()` em `js/caos/index.js` arruma a fala local e a da IA online,
no balão e na voz. Teste: `tests/voz_natural.test.js`.

De quebra: a voz cortava fala com mais de 400 letras (o limite do servidor). Agora ela vai em pedaços de até 380,
cortando no fim de uma frase, e o próximo pedaço é pedido enquanto o anterior toca (`pedacosDaFala` em `js/voz.js`).
Se o Perfil manda fala longa num pedido só, pode estar cortando também.

— Wally
