# Mapa do corpo do C.A.O.S.

O C.A.O.S. é montado em camadas, como um corpo. Cada camada tem um trabalho e conversa com as outras por poucos
pontos de contato. Isso é o que deixa ele **portátil**: troca-se o "mundo" (jogo, carteira, casa) e o corpo continua o
mesmo.

## As camadas

| Parte do corpo | O que faz | No Perfil | DNA ou do projeto? |
|---|---|---|---|
| **Ouvidos** (percepção) | Recebe os eventos do mundo: acertou, errou, entrou alguém, ficou parado, alguém calou a voz | Ganchos espalhados no jogo (`caosJogEmoRegistrar`, `caosConsoleCarta`) e `12-ouvintes.js` | Os eventos mudam por projeto; o jeito de ouvir é DNA |
| **Cérebro** (emoções) | Sente: 10 emoções com teto e decaimento, misturas, vetor tensão/calor/paciência, temperamento do dia | `05-emocoes-e-rede-neural.js`, `01-nucleo-e-falas.js` (vetor e temperamento) | DNA (quanto de cada emoção aparece é do projeto) |
| **Memória** | Lembra quem é quem: nomes, fichas, recordes, favorito e desafeto, o que a mesa não curtiu | `03-memoria-e-mesa.js`, `09-vinculos…`, `17-afeto-da-ficha.js`, `05t-contas.js` | DNA (o que se guarda é do projeto) |
| **Decisão** (cérebro em sombra) | Olha a situação, dá nota às falas possíveis e escolhe uma ou o silêncio. No Perfil ainda **só anota**, não fala | `15-cerebro-sombra.js` | DNA |
| **Coluna da fala** | Escolhe e monta a fala: bancos prontos sem repetir, gerador por gatilho, léxico, tato (tamanho certo), filtros | `01-nucleo-e-falas.js`, `10-gerador-de-falas.js`, `04-lexico-e-relogio.js`, `14-tato.js` | DNA |
| **Pulmão** (ritmo) | Respira entre falas: espera a anterior terminar, limite por carta, fila | `caosRespiroAgora`, `caosToastBloquear`, `caosFilaGuardar` (07/01) | DNA |
| **Rosto** | Carinhas de texto animadas, com escada (não pula de feliz pra furioso) e rosto de mistura | `src/dados/01-emocoes-do-caos.js`, `caosFaceEscolher`, `caosEscada` | DNA |
| **Voz** | Fala em voz alta com emoção: voz natural da Microsoft pelo servidor, ou a voz do aparelho | `06-voz-som-vibracao.js`, `servidor/worker.js` | DNA |
| **Espinha** | As 3 leis: protege o mundo dele, sanea os números, segura qualquer erro | `11-espinha.js` | DNA (inegociável) |
| **Registro** | Anota toda fala que saiu e toda que foi cortada, com o motivo | `caosEmit`, `caosCortou` (07/15) | DNA |
| **Painel ADM** | Mostra por dentro: emoções, memória, decisões, sandbox | `02-cerebro-adm.js` | Do projeto (útil copiar a ideia) |

## O caminho de uma fala

```
 MUNDO (jogo / carteira / casa)
   │  evento: "Ana errou de novo", "gastou acima do orçamento"
   ▼
 OUVIDOS ──► CÉREBRO: caosSentir("raiva", 1.25) · paciência −0,3 · vetor muda
   │                    └─ temperamento do dia e temporada (ex.: Natal) mudam a força
   ▼
 DECISÃO: vale falar agora? qual tipo de fala? (orçamento da carta, prioridade, humor da pessoa)
   ▼
 COLUNA DA FALA
   ├─ gerador do gatilho (pedaços por contexto: hora, humor, emoção, temporada, memória)
   └─ ou banco pronto (getRandomReaction: sem repetir, respeitando 👎, Júnior, palavrão, contexto)
   ▼
 FUNIL (showToastMessage) ─ cortes: janela aberta · 🔇 · C.A.O.S. calado · respiro/orçamento · Express
   │                         (todo corte vai pro registro com o motivo: caosCortou)
   ▼
 BALÃO + ROSTO (emoção da fala → rosto, escada, animação)  ──►  REGISTRO (caosEmit)
   ▼
 VOZ: emoção da fala → velocidade, tom, pausas e estilo da Microsoft
   ├─ servidor /voz → Azure (voz natural), com cache
   └─ se falhar ou demorar 4 s → voz do aparelho
   ▼
 MEMÓRIA: o que foi dito, se a pessoa pulou ou deu 👎 (Tato e humanização aprendem)
```

## O que cada camada pode fazer (e o que não pode)

- **Pode:** ler o estado do mundo, sentir, lembrar, escolher falas, falar, mostrar rosto, propor ações.
- **Não pode:** mudar o estado do mundo (pontos, dinheiro, turno, dados). A espinha tira uma "foto" antes das rotinas
  dele e desfaz qualquer mudança (Perfil) ou entrega só cópias congeladas (Carteira).
- **Se der erro:** a rotina devolve "nada", o mundo segue e o erro fica anotado.

## Números do C.A.O.S. no Perfil

Os totais atuais (funções por órgão, falas, geradores e pedaços) estão no topo do `caos_manifesto.json` e do
`08_Amostras_de_Falas.md`. Na Beta 1.9.3 (C.A.O.S. 5.4.0): 566 funções nos 14 órgãos mapeados, 4.367 falas prontas em
660 bancos e 18 geradores com 720 pedaços.
