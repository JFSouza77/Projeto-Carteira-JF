# Contrato de encaixe: a "tomada" do C.A.O.S.

O C.A.O.S. só funciona em outro projeto se o projeto entregar algumas coisas pra ele, e se ele devolver as coisas sempre
do mesmo jeito. Este contrato é isso: a tomada. Com ele, o mesmo núcleo serve no Perfil, na Carteira e na casa.

No Perfil, o contrato ainda está **espalhado** (o C.A.O.S. lê `players` e `currentCard` direto, e fala por
`showToastMessage`). A **etapa 2** do kit é reescrever o núcleo do Perfil atrás deste contrato, sem mudar o jogo. A
Carteira **já está quase nele**: o `js/caos/index.js` dela é puro (recebe cópias congeladas e devolve `{ fala, memoria }`).

## O núcleo é uma função pura

```js
// Entra: o evento, uma cópia congelada do que ele pode saber e a memória dele.
// Sai: o que falar (ou nada) e a memória nova. Ele nunca grava nada sozinho.
const { fala, memoria, proposta } = caos.reagir(evento, { mundo, pessoa, memoria, agora, rng });
```

- **`evento`:** o que aconteceu (dicionário abaixo).
- **`mundo`:** uma cópia congelada (`Object.freeze`, em profundidade) só com o que ele precisa ler. Exemplos: placar e
  carta no Perfil; totais por categoria e orçamento na Carteira. **Nunca** a lista crua de dados sensíveis, se não precisar.
- **`pessoa`:** o perfil de tratamento de quem está ali (veja abaixo).
- **`memoria`:** o estado dele (emoções, vetor, temperamento, o que já falou, tato, 👍/👎). Quem guarda é o app.
- **`agora`** e **`rng`:** relógio e sorteio injetados. Com eles, o teste repete a mesma fala (o Perfil testa assim:
  `teste_cerebro.js` fixa o sorteio e o relógio).
- **Sai `fala`:** `{ texto, emocao, rosto, prioridade, para, gatilho, banco }` ou `null` (silêncio também é resposta).
- **Sai `proposta`** (opcional): `{ acao, dados, texto }`, quando ele sugere uma ação. Exemplos: "registrar gasto de 30 no
  mercado"; na casa, "apagar a luz da sala". **Só o app executa, depois do Confirmar da pessoa** (1ª lei).

## O que o app faz com a saída (o adaptador)

```js
const adaptador = {
  mostrarFala(fala),            // balão com o rosto e a animação da emoção
  falarEmVoz(fala),             // 05_Voz.md: nuvem (Azure) com reserva no aparelho
  guardarMemoria(memoria),      // localStorage, IndexedDB ou KV: o C.A.O.S. não sabe onde fica
  confirmarProposta(proposta),  // botão Confirmar; só aqui o mundo muda
  registrar(tipo, detalhe),     // log: fala que saiu, fala cortada e motivo, erro contido
};
```

## O perfil de tratamento (por pessoa)

```js
pessoa = {
  id, nome, nicks: ["JF", "TGP", "JF77", "TGP77"], chamarDe: "JF",
  humor: "suave" | "normal" | "acido" | "zero" | "familia" | "caos",
  tratamento: "descontraido" | "formal",
  iniciante: false, idade: "adulto" | "jovem" | "crianca",
  permissoes: { zoar: true, dicas: true, sugestoes: true, analises: true, falarSozinho: true, voz: true },
  pedidos: { maisLeve: false, maisAcido: false, falarMenos: false },
  ficha: { desde, vezes, ultimaVez, ... },   // o que ele lembra da pessoa (muda o tom: veterano, sumido)
  conhecido: "criador" | "familia" | "amigo" | null,   // vem do arquivo de família
}
```

Regras:
- **`permissoes`:** cada uma liga ou desliga um tipo de fala. Sem `zoar`, nem o Ácido zoa. Sem `analises`, ele não faz
  leitura do comportamento da pessoa.
- **`conhecido`:** vem do `familia_exemplo.json` (preenchido pelo projeto). Nome de criança nunca vai no código.
- **Criança e iniciante:** sempre filtro de criança e humor Suave, seja qual for a escolha.

## Dicionário de eventos

Os eventos mudam por projeto, mas cada um tem um **efeito emocional padrão**. É isso que mantém a personalidade igual.

| Efeito padrão | Perfil (jogo) | Carteira (dinheiro) | Casa (futuro) |
|---|---|---|---|
| **Vitória** (alegria, orgulho) | Acertou rápido, sequência, venceu a partida | Mês no verde, meta batida, economizou | Rotina cumprida, conta de luz menor |
| **Tropeço** (raiva → preocupação no modo assistente) | Errou, errou de novo, absurdo | Estourou o orçamento, saldo negativo | Esqueceu a porta aberta |
| **Tédio** | Pulou, mesa parada | Dias sem registrar | Casa ociosa |
| **Tensão** (ansiedade, medo) | Reta final, alguém perto de vencer | Conta vencendo, fim do mês apertado | Alarme, temperatura alta |
| **Carinho** | Jogador Suave acertou, favorito | Pessoa voltou depois de um tempo, agradeceu | Bom dia de rotina |
| **Curiosidade** | Categoria nova, carta difícil | Gasto fora do padrão | Algo diferente na rotina |
| **Chegada** | Entrou na mesa | Abriu o app | Chegou em casa |
| **Silêncio pedido** | 🔇, desligou a voz, pulou fala | Fechou o balão rápido, desligou a voz | "Agora não" |
| **Avaliação** | 👍 / 👎 na fala | 👍 / 👎 na fala | 👍 / 👎 |

## Testes que todo projeto precisa ter (do mesmo jeito do Perfil)

1. **Igualdade:** com o mesmo sorteio e o mesmo relógio, a mesma entrada dá a mesma fala.
2. **1ª lei:** depois de qualquer reação, o mundo está igual ao de antes (ou o objeto congelado deu erro e a 3ª lei segurou).
3. **2ª lei:**
   - Suave e criança nunca recebem zoeira;
   - palavrão nunca sai;
   - 👎 não volta.
4. **3ª lei:** um erro forçado dentro dele devolve `fala: null` e o app segue.
5. **Quantidades:** toda lista de falas com 0 ou 5 no final.
6. **Gerador:** mil montagens sem placeholder sobrando, sem repetir as últimas 12, dentro do limite de letras.
