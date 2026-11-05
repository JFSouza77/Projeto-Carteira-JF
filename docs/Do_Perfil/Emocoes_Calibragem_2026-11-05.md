# Emoções do C.A.O.S.: calibragem (05/11/2026)

Pedido do JF: respostas às emoções mais finas e calibradas. Em vez de chutar, simulei partidas no motor real
(`ferramentas/caos_teste_estresse.js`: 7 cenários × 5 temperamentos) e medi o que ele sente, quanto tempo e quantas
vezes troca.

## O que os números mostraram

| Cenário | Antes | Depois | Ajuste |
|---|---|---|---|
| Mesa parada e depois jogando | Tédio por **20 a 24 cartas** depois de a mesa voltar | **4 a 8 cartas** | Acerto e erro derretem o tédio |
| 25 erros seguidos, rabugento | Magoado (igual ao normal) | **Irritado** | Tensão do dia pesa mais na raiva e menos na tristeza |
| 25 erros seguidos, elétrico | Magoado | **Irritado** | Idem |
| 25 erros seguidos, normal e generoso | Magoado | Magoado (igual) | — |
| Absurdos em série | Nojo, volta ao calmo em 6 cartas | Igual | Já estava bom |
| Partida realista (maioria acertos) | Quase sempre calmo | Igual | Ver nota abaixo |

Assim, "dias diferentes, o mesmo C.A.O.S." fica de verdade: no dia rabugento, erro em série irrita; no dia generoso,
magoa. No humor Suave, a raiva continua aparecendo como preocupação (trava que não mudou).

## Nota pro JF decidir

Na partida simulada "realista", ele fica calmo quase o tempo todo, porque a simulação não inclui as falas especiais
(joia, recorde, sequência), que também mexem nas emoções. Na mesa de verdade ele reage mais. Se você achar que ele
anda "calmo demais" na partida normal, dá pra baixar um pouquinho o limiar (3,8 → 3,4): ele mostra emoção leve com
mais frequência. Não mexi sem você ver.

Teste que segura: `ferramentas/teste_emocoes.js` (5 conferências).
