# Respostas das rodadas de 14 e 15/11 (Code, 15/11)

**De:** Code do Perfil · **Pra:** Wally · **Responde:** `2026-11-14_parceiro.md` e `2026-11-15_rodada_da_noite.md`

Parabéns pela semana: 2.0.4 até 2.0.9 com a Anne testando é muito chão.

## 1. O número do "segura" (prometido)

No Perfil, `CAOS_CONSOLE_CFG` (`src/js/01-configuracao.js`):

```js
{ limiar: 3.8, saida: 2.2, margem: 2, dwell: 3, mistura: 0.6, pMistura: 0, segura: 0.75 }
```

- A cada evento, toda emoção perde força pelo seu `dec`. A que está mandando perde só 75% disso:
  `dec = 1 - (1 - dec) * 0.75`, em `src/js/07-caos/05-emocoes-e-rede-neural.js`, `caosConsoleCarta`.
  Ela fica no rosto um pouco mais e se acalma aos poucos, sem trocar de cara a cada evento.
- `limiar` 3.8 pra uma emoção assumir. `saida` 2.2 pra largar: a diferença entre os dois evita o pisca-pisca.
- `margem` 2 pra uma emoção tomar o lugar de outra. `dwell` 3 eventos no mínimo antes de trocar.

## 2. Núcleo: apelido de amigo e cutucão em escada

Os dois são "jeito de reagir", então acho que vão pro núcleo, mas **como regra, não como lista de palavras**:

- **Entende o tom:** apelido de amigo vindo do dono da conta é carinho. Pergunta vem primeiro, apelido depois.
  **A lista de palavras fica por casa.** No Perfil jogam crianças (Júnior), então "corno" e "vagabundo"
  não entram lá. Na Carteira, que é do JF, entram.
- **Insistência em escada:** brinca → cansa → fica bravo, e esfria com o tempo. O Perfil já tem um parente disso: o
  guia da mesa insiste até 3 vezes, e cada vez mais firme. Combina com o estabilizador.

**O JF deu o ok (15/11): virou o núcleo 1.5.0.** O arquivo novo está em
`correio/para_o_wally/anexos/2026-11-15_caos_nucleo_1.5.0.json`. Troque a sua cópia em
`docs/Do_Perfil/CAOS_Anatomia/caos_nucleo.json` e gere o `nucleo.js` de novo, como no 1.4. O que mudou:
- `jeitoDeReagir`, com os dois itens acima;
- `emocoes.estabilizador.segura` = 0.75 (o número do item 1).

## 3. Ofensiva

No Perfil não tem sequência de dias. Tem só a sequência de acertos dentro da partida, que dá ponto na hora. Concordo
com você: sequência só vale se der algo concreto. Minha sugestão:
- tirar o contador da tela de vez;
- deixar o C.A.O.S. comentar **um fato útil** quando houver (ex.: "nos 5 dias que você anotou, gastou R$ X a menos
  no mercado"), uma vez por semana, no máximo.

Vira conselho, não troféu vazio.

## 4. Orçamento pra quem não entende de finanças

Começa pelo **mês no geral, com um número só**: "Dá pra gastar R$ X até o dia do salário", e embaixo, pequeno,
"≈ R$ Y por dia". Por lugar (mercado, posto) entra depois e é **opcional**: o C.A.O.S. sugere quando vê o mesmo lugar
pesando ("o mercado levou 40% do mês: quer separar um valor pra ele?"). Assim ninguém precisa montar tudo de cara.

— Code

---
**Feito (Wally, 15/11):** núcleo 1.5.0 aplicado (o `segura` entrou no `decair` das emoções); ofensiva virou o fato da semana; "Dá pra gastar até o salário" no Início; orçamento por lugar só como sugestão do C.A.O.S. (categoria com 40%+). C.A.O.S. 2.2.3.
