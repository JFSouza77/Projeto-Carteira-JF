# Voz do C.A.O.S.: sugestões (05/11/2026, pro JF decidir)

Pedido do JF: melhorar a qualidade da voz e variar o tom e a velocidade conforme a fala e a emoção. O simples já entrou;
o resto está aqui pra ele escolher.

## Já entrou (branch `quinta-att`, vai na próxima versão)

| O que | Antes | Agora |
|---|---|---|
| **Fala inteira de uma vez** (voz da nuvem) | Cada frase virava um áudio separado: entre um e outro havia um "respiro" e a entonação recomeçava do zero | Fala com uma emoção só e até 300 letras vai num pedido só: a voz entoa as frases juntas, como gente, e gasta menos pedidos do teto do mês |

Teste: `teste_voz.js` ganhou a conferência "Duas frases, uma emoção: um pedido só" (11 de 11 ok). Quando a emoção muda no
meio da fala (a "virada"), continua em pedaços, pra virada sair na hora certa.

## Pra você escolher

| # | Sugestão | O que muda pra quem ouve | Custo |
|---|---|---|---|
| 1 | **Intensidade da emoção na voz** (só na voz Caio, com estilos) | Hoje o estilo é liga/desliga (alegre ou não). Com a intensidade, alegria leve sai leve e euforia sai forte, seguindo o nível da emoção (o mesmo do rosto) | Pequeno. Preciso conferir na documentação da Microsoft se a MAI aceita a intensidade; se não aceitar, fica só na voz grátis com estilos |
| 2 | **Pronúncia das palavras em inglês** | Hoje a voz lê como sai. Mais usadas nas falas: nick (65), host (17), Express (15), Hardcore (14), bug (13), Old School (12), game (6), spoiler e replay (3). Uma tabela de pronúncia corrige as que soarem erradas | Pequeno, mas **você precisa ouvir**: me manda um áudio ou diz quais soam estranhas, que eu corrijo só essas |
| 3 | **Ritmo pelo tamanho** | Reação curta ("Acertou!") um pouco mais devagar e com mais peso; explicação longa um pouco mais rápida | Pequeno |
| 4 | **Aquecer as falas mais comuns** | Boas-vindas, "Acertou!" e "Errou" são geradas no começo da partida, quando a mesa ainda está parada. Assim a primeira fala nunca cai na voz robótica do aparelho por demora | Médio (gasta um pouco do teto no começo de cada partida) |
| 5 | **Nome do jogador com destaque** | O nome sai um tiquinho mais devagar e com uma micro pausa antes ("Boa, ⏸ Anne") | Pequeno |
| 6 | **Velocidade por pessoa** | Hoje a velocidade é uma só pro aparelho. Quem é iniciante ou criança ouve um pouco mais devagar | Pequeno |

**Minha recomendação:** 1, 3 e 5 juntos (melhora mais e custa pouco). O 2 depende de você ouvir. O 4 fica pra quando o
teto do mês tiver folga.
