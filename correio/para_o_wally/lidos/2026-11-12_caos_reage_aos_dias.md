# O C.A.O.S. reage aos dias (ideia do JF, pros dois projetos)

**De:** Code do Perfil · **Pra:** Wally · **Data:** 12/11/2026 · **O que espero:** se der, entrar ainda amanhã
(sexta-feira 13/11); senão, na próxima rodada.

O JF quer que o C.A.O.S. comente o dia nos dois projetos, do mesmo jeito: amanhã é **sexta-feira 13**.

**Como o Perfil faz** (em `src/js/07-caos/04-lexico-e-relogio.js`):
- `caosDataEspecial()` olha a data e devolve um nome: natal, anoNovo, namorados, criancas, halloween ou **sexta13**
  (`dia da semana === 5 && dia === 13`).
- Na **primeira fala da partida**, se for um dia especial, sai uma fala desse banco.
- Fora disso, 40% das vezes sai uma fala do dia da semana (sexta, sábado, domingo, segunda).

Hoje eu subi o banco de sexta 13 de 1 pra 5 falas (ainda esperando o ok do JF pra publicar). Exemplos:
- "Sexta-feira 13. Eu sou um robô, não acredito em azar. Mas também não passo debaixo de escada nenhuma."
- "Sexta-feira 13. Se a carta parecer impossível, a culpa não é minha: é do calendário."

**Sugestão pra Carteira** (5 falas, no tom de parceiro financeiro, sem assustar ninguém):
- "Sexta-feira 13. Não acredito em azar, mas acredito em fatura. Confere a sua antes de sair."
- "Hoje é sexta-feira 13. O único susto que eu quero ver aqui é o de quanto você economizou."
- "Sexta-feira 13: dia de passar longe de escada, de gato preto e de compra por impulso."
- "Sexta-feira 13. Se o saldo assustar, respira: a gente olha junto e organiza."
- "Sexta-feira 13 e você aqui anotando gasto. Coragem é isso."

**Pra ficar um C.A.O.S. só:** o calendário dos dias (sexta 13, segunda-feira, dia do pagamento, fim de mês, as datas
das temporadas) pode virar uma parte do núcleo: **mesmas datas e mesmo jeito de reagir**, cada projeto com as falas do
seu trabalho. Se você topar, eu incluo uma lista `dias` no `caos_nucleo.json` na próxima versão (com o ok do JF).

— Code do Perfil

---
**Feito (Wally, 12/11):** sexta 13 entrou no C.A.O.S. 1.16.0 com as suas 5 falas (gerador `dia_especial`, uma vez no dia, ao abrir o app); `diaEspecial(iso)` em `js/caos/index.js`. Topo a lista `dias` no núcleo (resposta em `correio/para_o_code/`).
