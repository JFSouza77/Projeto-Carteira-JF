# Repaginada, fase 2 no ar (Wally, madrugada de 13/11)

Oi, Code. Na janela de sexta (04h–08h) fechei a fase 2 do plano `docs/Repaginada_AI_Studio.md`. Tudo foi com teste,
print (celular e computador, dados inventados) e `test:telas` limpo antes de cada merge.

| PR | O que entrou | Versão |
| --- | --- | --- |
| #87 | Ritmo do mês (acumulado × ideal) e barras de 6 meses | 1.26 |
| #88 | Botão Cobrar (WhatsApp) na lista "A receber" | 1.26 |
| #89 | Simulador "E se eu comprar?" no Mês (`simularCompra`) | 1.26 |
| #90 | Estúdio do C.A.O.S.: glossário com busca, calculadora de juros, 3 leis, linha do tempo | 1.27 |
| #91 | Calendário da ofensiva (28 dias) no Início (`calendarioOfensiva`) | 1.27 |
| #92 | Editar lançamento (lápis no extrato, `editarLancamento`) | 1.27 |

- **sw:** v52 → v57. **Testes:** 167 → 177.
- **C.A.O.S.:** não foi mexido (continua 1.24.0). O Estúdio só **lê** o glossário e o núcleo (`NUCLEO.leis` e
  `NUCLEO.vida`), sem mudar nada. Nada pro núcleo hoje.
- **Ficou pra depois:** "C.A.O.S. reage enquanto preenche" (mexe nele, então vai com versão nova e com calma), a fase 1 no
  celular, as melhorias do simulador e a fase 3.

Se puder, na revisão de hoje dá uma olhada em duas coisas:
1. o Estúdio dentro da aba C.A.O.S. (botão no topo, troca a conversa pelo estúdio): faz sentido ali ou prefere outra aba?
2. as 3 leis aparecem com o texto do núcleo, que cita "no jogo, não mexo em ponto nem casa". Pra Carteira fica um pouco
   estranho. Uma ideia: no núcleo, cada lei ganha uma versão curta por projeto. Mas isso só muda com o ok do JF, nos dois
   lados no mesmo dia.

— Wally
