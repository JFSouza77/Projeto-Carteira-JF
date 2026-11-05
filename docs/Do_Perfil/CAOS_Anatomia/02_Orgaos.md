# Ficha de cada órgão do C.A.O.S.

Cada ficha diz o que o órgão faz, como funciona, onde está, que dados e configurações usa, como é testado e **como
portar**. A lista completa de funções (com linha e comentário) está no `caos_manifesto.json`, pelo `id` do órgão.

Legenda: **DNA** = vai igual pra qualquer projeto · **Adaptar** = a ideia vai, os detalhes mudam · **Só do Perfil** =
depende do jogo.

---

## 1. Espinha · `espinha` · DNA (inegociável)

**O que faz:** garante que o C.A.O.S. é "caótico leal": fala o que quiser, mas dentro de 3 leis que o código faz valer.

1. **Nunca mexe no mundo.** No Perfil, `caosEspinhaFoto` tira uma foto do jogo (pontos, casas, joias, turno, Mestre,
   carta, relógios) antes de cada rotina protegida, e `caosEspinhaRestaurar` desfaz qualquer mudança.
2. **Nunca fala o que a mesa proibiu.** Os filtros do motor e do gerador cuidam disso (ver `03`).
3. **Nunca trava.** `caosBlindarUm` embrulha cada rotina: erro vira "nada" e fica no log (`caosEspinhaLog`).

**Também faz:**
- `caosEspinhaSanear`: medidores de emoção sem número inválido nem fora da faixa;
- canal da fala (`caosCanalRegistrar`, `caosFalarPara`): anota pra quem é cada fala (uma pessoa ou todos), base do online.

**Onde:** `src/js/07-caos/11-espinha.js`, instalada no `iniciar()` por `caosEspinhaInstalar` (lista `CAOS_ENTRADAS`).
**Teste:** `node ferramentas/caos_teste_espinha.js`.
**Portar:** a Carteira já tem (`js/caos/espinha.js`), com cópias congeladas no lugar da foto. Mantenha as 3 leis com
esses nomes. Pra casa: a 1ª lei vira "nunca aciona um aparelho sem confirmação".

## 2. Núcleo da fala (funil) · `nucleo` · DNA

**O que faz:** é por onde toda fala passa.

- **Escolher sem repetir** (`getRandomReaction`, `pickReactionIndex`): bloqueia os últimos 80% usados de cada banco (a
  memória sobrevive a fechar o app, `CAOS_HIST_KEY`).
- **Filtros na escolha:** Júnior (`CAOS_JUNIOR_BLOCK_RE`), palavrão (`caosHasProfanity`, `CAOS_PALAVROES`), 👎 da mesa
  (`caosIsDisliked`), contexto verdadeiro (`caosContextoOk`: "errou de novo" só sai se errou de novo), tamanho (Tato).
- **Acabamento:** emoji do banco (`caosDecorate`), risadinha (`caosRisada`), autozoeira com gíria (`caosSelfRoastIfSlang`),
  "família" que troca zoeira por incentivo (`caosFamiliaTroca`).
- **Funil** `showToastMessage` (fica em `09-vinculos-silencio-e-balao.js`): corta a fala se tem janela importante aberta, 🔇
  da carta, C.A.O.S. calado, respiro ou orçamento estourado, ou fala longa no Express. Todo corte vai pro registro
  (`caosCortou`) com o motivo.
- **Pulmão:** `caosRespiroAgora` e `caosToastBloquear`, com `CAOS_RESPIRO_MS` 3,5 s, `CAOS_RESPIRO_RAJADA_MS` 9 s e
  `CAOS_FALAS_POR_CARTA` 6. Fala importante vai pra fila (`caosFilaGuardar`).
- **Cansaço:** `rollCaosFatiguePlan`. Em partida longa ele cansa e pode sair; com a tensão estourada 2 vezes, sai também.

**Teste:** `ferramentas/caos_auditar_falas.js`, `caos_teste_estresse.js`.
**Portar:** a Carteira já tem uma versão (uma fala por reação, cooldown por tipo). O que vale trazer:
- a anti-repetição com memória entre sessões;
- o `caosContextoOk`;
- o registro de cortes com motivo.

## 3. Cérebro (emoções) · `cerebro` · DNA (quanto de cada emoção aparece é do projeto)

**Camadas:**
- **Console de 10 emoções** (`CAOS_CONSOLE`): alegria, tristeza, raiva, medo, nojo, ansiedade, tédio, vergonha, curiosidade e
  carinho. Cada uma tem teto (`teto`) e quanto sobra por carta (`dec`).
  - `caosSentir(emo, v, motivo)` soma com saturação e com o peso do vetor e do temperamento.
  - `caosConsoleCarta` aplica o decaimento.
  - `caosConsoleEvento(idx, ev)` traduz os eventos: A/a (acerto), E (erro), X (absurdo) e P (pulo).
- **Emoção do momento:** a mais alta acima do limiar (`CAOS_CONSOLE_CFG.limiar` 3,8), com estabilizador:
  - só troca se a nova passar 2 pontos na frente (`margem`);
  - dura pelo menos 3 falas (`dwell`);
  - sai abaixo de 2,2 (`saida`);
  - a emoção que manda cai mais devagar (`segura`).
- **Misturas** (`CAOS_CONSOLE_MISTURAS`): duas altas juntas, como magoado (raiva + tristeza), empolgação nervosa, riso sem
  graça, espiando com receio, elogio contrariado, saudade e acuado. Cada mistura tem rosto próprio.
- **Vetor** (`caosEmo`): tensão, calor e paciência, de 0 a 10. Mexido por `caosEmoNudge` e `caosPacienciaNudge`.
  - Volta ao equilíbrio aos poucos (`caosEmoMaybeDecay`, `caosPacienciaTick`).
  - Vira um **estado composto** (`caosEstadoComposto`): calmo, em flow, no limite, sem paciência…
- **Temperamento do dia** (`CAOS_TEMPERAMENTOS`, `caosTemperSortear`): normal (40%), sensível à demora, generoso,
  rabugento ou elétrico. Muda o ponto de equilíbrio.
- **Humor do ambiente** (`caosMood`): animado, normal, esquentou, impaciente ou cansado, pelo ritmo das jogadas.
- **Rosto:**
  - `caosConsoleRosto` traduz a emoção no rosto;
  - `caosEscada` faz o rosto andar só pra um vizinho (`CAOS_EMO_VIZ`);
  - `caosFaceEscolher` escolhe sem repetir;
  - os rostos ficam em `src/dados/01-emocoes-do-caos.js`.
- **Emoção da fala** (`caosEmocaoDoTexto`, `caosEmocaoDaFala`): a emoção do balão e da voz sai do conteúdo da frase.

**Teste:** `caos_teste_estresse.js` (25 erros seguidos viram raiva e depois magoado; o tédio volta ao calmo),
`teste_afeto.js`.
**Portar:** a Carteira tem 7 emoções e 3 misturas, com decaimento por hora real. **Faltam:**
- o vetor tensão/calor/paciência;
- o temperamento do dia;
- o estabilizador (margem, dwell, saída);
- a emoção vinda do texto.

Pro modo assistente, veja o "filtro de apoio" em `06`.

## 4. Coluna da fala (gerador, léxico e relógio) · `gerador` · DNA

**Gerador por gatilho** (`caosGerarFala(gatilho, pessoa, extra)`, em `10-gerador-de-falas.js`):
- **Montagem:** cada gatilho tem `moldes` ("{abre} {empurra} {fecho}") e, pra cada pedaço, **baldes**. O balde `geral` serve
  sempre; os baldes de contexto entram quando a etiqueta é verdadeira (`emo_raiva`, `noite`, `fimDeSemana`, `jf`, `estreia`,
  `temporada_natal`, `data_criancas_adiantado`…).
- **Contexto** (`caosGerContexto`): hora, dia, modo, quem está, a memória da pessoa, humor, temperamento, temporada e data
  do calendário.
- **Avaliação:** tenta até 10 montagens e fica com a melhor (`caosGerAvaliar`, `caosGerLapidar`), sem:
  - fecho genérico grudado;
  - começo órfão;
  - 5 frases ou mais;
  - nome repetido;
  - a mesma expressão duas vezes;
  - duas chamadas pra ação;
  - tom trocado.
- **Sem repetir:** guarda os pedaços recentes por gatilho (`CAOS_GERADOR_KEY`, cerca de 4 KB), não repete as últimas 12
  falas (`CAOS_GER_ULTIMAS`), respeita 👎 e tem no máximo 190 letras (`CAOS_GER_MAX`).
- **Dados:** um arquivo por gatilho em `src/dados/08-geradores/`. As regras de escrita estão no topo de `00-abertura.js`.

**Léxico de acerto, erro e pulo** (`caosGerar` em `04-lexico-e-relogio.js`, dados em `04-lexico-e-emocoes.js`):
- monta a fala com "fatos" da jogada (`caosFatos`): ordem da dica, segundos, dificuldade, categoria;
- e com "prateleiras" de vocabulário.

**Relógio:** `caosAgora`, `caosPeriodo` (madrugada, manhã, tarde, noite), `caosDataEspecial`, `caosHoraTexto`.

**Teste:**
- `caos_auditar_geradores.js --testar`: monta 150 falas por caso e conta os defeitos;
- `caos_teste_geradores.js`.

**Portar:** a Carteira já tem o gerador (`js/caos/gerador.js`). Vale trazer:
- a **avaliação de 10 tentativas**;
- as **etiquetas de temporada e de data**;
- o "fato" da jogada como pedaço (na Carteira: o número do gasto).

## 5. Tato · `tato` · DNA

**O que faz:** aprende o tamanho de fala que a mesa aguenta.

- Conta as falas que foram puladas, ou que fizeram alguém desligar a voz, e se elas eram longas
  (`caosTatoReacao`, `caosTatoCalou`).
- Quando a maioria era longa, passa a preferir frase curta (`caosTatoMax`).
- Lembra disso pra mesma mesa na próxima vez (`caosTatoMem`).
- Testa uma fala longa de vez em quando, pra ver se a mesa mudou.

**Portar:** a Carteira só tem o corte fixo (170 letras). Trazer o aprendizado: pessoa que sempre fecha o balão rápido
recebe frase curta.

## 6. Memória · `memoria` · DNA (o que se guarda é do projeto)

**O que guarda:**
- **Nomes conhecidos e quantas vezes viu** (`caosKnownNames`, `CAOS_NAMES_KEY`).
- **Fichas por pessoa** (`MEM_FICHAS_KEY`): partidas, vitórias, acertos e erros, por categoria, última vez, melhor
  pontuação, mágoa, último resultado.
- **Recordes, rivais, última partida, "bola de cristal"** (previsões), cartas que derrubam gente.
- **Vínculos da partida** (`caosVinculoReset`, `caosVinculoSortear`): um favorito e às vezes um desafeto, com motivo.
  Mudam o tom com cada um (`caosVincEhFav`).
- **Afeto da ficha** (`17-afeto-da-ficha.js`, `caosAfeto`): veterano, novato, craque, zebra, mágoa e "volta" mudam quanto
  ele sente em cada jogada daquela pessoa.
- **Mesa** (`caosMesaRegistrar`, `caosMesaFala`): o clima da mesa nesta partida.
- **Cadastro** (`05t-contas.js`): a ficha pode ir pro servidor com um PIN e voltar em outro aparelho.

**Limites** (tudo tem teto): 80 fichas, 60 nomes, 60 rivais, 500 avaliações, e assim por diante (lista em
`docs/CAOS_Cerebro.md`).

**Portar:** a Carteira guarda o perfil da pessoa (`meta/perfil`). Trazer:
- a **ficha** (histórico que muda o tom: veterano, sumido, voltou hoje);
- o **afeto da ficha** (o que ele sente depende de quem é);
- o **perfil de tratamento** completo, descrito em `06`.

## 7. Humanização · `humanizacao` · DNA

**O que faz:**
- **👍/👎 nas falas** (`CAOS_RATINGS_KEY`, até 500): fala com 👎 não volta.
- **"Não curti":** ele reage (fica sem graça, pede desculpa, muda).
- **Segurar o balão** (`caosToastSegurarInicio`): segurar pra ler mais tempo.
- **Pergunta de satisfação** (`caosPerguntaTalvez`): "tá curtindo meu jeito?".
- **Resposta ao toque** (`caosDicaRepetida`): tocou de novo é pergunta direta, e ele responde na hora.
- **Explicações pro iniciante** (`caosIniExplica`): uma vez por tipo.

**Portar:** 👍/👎 e "não curti" valem muito na Carteira. É o jeito de a pessoa calibrar o assistente sem abrir ajustes.

## 8. Ouvidos da sala · `ouvidos` · Só do Perfil (a ideia serve)

Cada aparelho avisa quando liga ou desliga a voz e quando pula uma fala.
- Todos calaram: ele fica quieto, só regra.
- Parte calou: rancor com quem calou e carinho com quem ainda ouve (`caosFiel`).

**Portar:** na Carteira, que é de uma pessoa, a ideia vira "a pessoa desligou a voz várias vezes: falar menos e mais
curto".

## 9. Voz · `voz` · DNA

Tem documento próprio: **`05_Voz.md`**.

## 10. Cérebro em modo sombra · `sombra` · DNA

**O que faz:**
- **Registro único:** `caosEmit` anota toda fala que apareceu (banco, emoção, prioridade); `caosCortou`, toda que foi
  cortada e por quê. Ficam as últimas 200.
- **Percepção** (`caosVisao`), só leitura: quem jogou, líder e diferença, sequências, reta final, mesa cansada.
- **Decisão** (`caosCerebroCandidatos`, `caosCerebroDecidir`): dá nota a cada fala possível e escolhe uma ou o silêncio.
  - Repetição e mesa cansada baixam a nota.
  - Absurdo e reta final são obrigatórios.
  - Respeita o orçamento.
- **Hoje no Perfil ele não fala:** só anota e compara com o que o sistema falou (aba 📜 Decisões). O teste garante que
  ligar o cérebro não muda nada no jogo.

**Teste:** `ferramentas/teste_cerebro.js` (igualdade, invariância, métrica de 40 a 60%, limites).
**Portar:** é o caminho pra o C.A.O.S. virar **agente** (ver `07`). Na Carteira, comece igual: decidir em sombra e comparar
com o que o sistema de regras falou, antes de dar a palavra a ele.

## 11. Momentos e guia · `momentos` · Adaptar

**O que faz:**
- **Momentos da partida:** começo, chegada de alguém (`caosBoasVindasQuandoPuder` espera a fala anterior), falas
  espontâneas, pensamento em voz alta (`caosPensamentoTexto`, que conta como ele está por dentro).
- **Guia da mesa** (`16-guia-da-mesa.js`): quando a mesa trava, ele diz quem age e o que tocar (pulso no botão certo).

**Portar:**
- "pensamento em voz alta" e "chegou alguém" são DNA de personalidade;
- o guia vira o **tutorial vivo** da Carteira ("toca aqui pra lançar o gasto").

## 12. Pessoas · `pessoas` · DNA + arquivo de família

**O que faz:**
- **Humor de cada pessoa** (`playerHumor`, `playerHumorBase`, `humorFamilia`): família, suave, normal, ácido, nível 0 e
  "C.A.O.S. decide". Iniciante é sempre suave. Detalhe em `03`.
- **Pedidos da pessoa ao C.A.O.S.** (`p.pedeCaos`): mais leve ou mais ácido, menos falas.
- **Reconhecimento do JF** (`isJfName`, `OWNER_JF_RE`), da Anne (`isAnneName`, desligado por padrão) e de amigos com
  "presente" (`PRESENTES`, `presenteDe`).
- **Família** (`CAOS_SOBRINHOS`, `sobrinhoDe`): no Perfil está no código. **No porte, vai pro arquivo de família**
  (`familia_exemplo.json`), nunca no código.
- **Amigos** (`13-amigos.js`): piadas internas com limite por partida, nunca no Júnior.

**Portar:** veja o perfil de tratamento em `06` e as regras em `03`.

## 13. Temporadas · `temporadas` · DNA

**O que faz:**
- **Calendário** (`temporadaDe`, `TEMPORADAS`): 15 temporadas, com datas móveis (Páscoa, Carnaval, Mães, Pais, Black
  Friday), prioridade entre duas que caem juntas, opção de desligar e `?temporada=` pra teste.
- **Espírito natalino** (`temporadaSentirFator`, `temporadaDecaimento`, `temporadaPacienciaFator`): no Natal ele se irrita
  menos e esfria rápido; falas de "sorte que é Natal", carvão e perdão.
- **Presente com data** (`temporadaPresenteMomento`, `TEMPORADA_PRESENTE_DATAS`): adiantado, no dia ou atrasado, em 15
  datas.
- **Etiquetas pros geradores:** `temporada_<id>` e `data_<id>_<momento>`.

**Teste:** `ferramentas/teste_temporadas.js`.
**Portar:** o calendário e o presente com data são 100% reaproveitáveis. Exemplos na Carteira:
- "Black Friday chegando: cuidado com o cartão";
- 13º em dezembro;
- "Feliz Natal adiantado".

## 14. Painel ADM · `adm` · Adaptar (a ideia)

**O que faz:** diagnóstico, console com barras por emoção, "acalmar tudo", sandbox (mexer nas emoções na mão), memória,
decisões do cérebro sombra, teste de voz. Fica protegido por chave.
**Portar:** uma tela "por dentro do C.A.O.S." ajuda muito a calibrar e a mostrar pro JF o que ele está sentindo.
