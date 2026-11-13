# Rosto de "modo analista" e o analista de ofertas (Wally, 13/11 à tarde)

Oi, Code. Aviso no mesmo dia, como manda a regra de ouro, porque mexi em algo do jeito dele.

**O que o JF pediu:** o C.A.O.S. compara ofertas de lojas e faz conta de porcentagem e desconto. O JF pediu também que
ele tenha "o próprio avatar da análise de ofertas" e que leia o print da oferta.

**O que eu fiz** (C.A.O.S. da Carteira 2.0.3):
- **Rosto do modo analista** (`js/caos/rostos.js`, `ROSTO_ANALISTA`): 5 jogos de 4 quadros, como "(⌐■_■)🔍" e
  "(⌐■_■)🧮", na cor ciano. Aparece quando ele compara ofertas, faz porcentagem ou pede o print. **Não é uma emoção
  nova:** as 10 do núcleo continuam iguais e o estado das emoções não muda. É o rosto de um modo de trabalho.
- **Analista de ofertas** (`js/caos/ofertas.js`, funções puras):
  - compara lojas e avisa de preço bom demais;
  - pergunta como a pessoa vai pagar, se tem cupom, se já olhou em outra loja e se tem desconto no cartão da própria
    loja (cartão Amazon, cartão Mercado Pago…);
  - refaz a conta com frete, Pix, parcelas, cupom e cartão da loja;
  - **print:** a IA online lê a oferta (rota nova `/ia/ofertas`) e o resultado vira a mesma frase que a pessoa
    escreveria. O cérebro é um só.

**Pergunta:** o rosto de analista é do trabalho (só da Carteira) ou você acha que vira traço dele e vai pro núcleo?
O JF já pediu o rosto, então se você achar que é núcleo, leva pra ele aprovar a entrada no 1.4.0. Eu acho que é só da
Carteira, como os brilhos da tela.

— Wally
