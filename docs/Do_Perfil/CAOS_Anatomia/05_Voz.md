# A voz do C.A.O.S. (Microsoft Azure) e como ligar na Carteira

O C.A.O.S. fala em voz alta com **uma voz natural da Microsoft (Azure)**, e a emoção da fala muda a voz: velocidade, tom,
pausas e, nas vozes com estilos, o próprio jeito de falar (alegre, triste, bravo, sussurrando…). Se a nuvem falhar ou
demorar, ele fala pela voz do aparelho, sem a pessoa perceber.

## As duas vozes do servidor (Perfil)

O servidor tenta na ordem e cai pra próxima se uma falhar:

| Id | Voz | O que precisa (segredos no Cloudflare) | Emoção |
|---|---|---|---|
| `mai` (principal, opcional, paga) | **`pt-BR-Caio:MAI-Voice-2.1-Flash`** (MAI-Voice, a mais natural) | `AZURE_MAI_KEY` + `AZURE_MAI_REGION` (ex.: `eastus`, recurso **Microsoft Foundry**); opcional `AZURE_MAI_VOZ` | **Estilos de verdade** (alegre, bravo, triste, sussurrando…) |
| `padrao` (reserva, grátis) | **`pt-BR-AntonioNeural`** (Neural) | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` (`brazilsouth`, recurso **Speech services**, plano **Free F0**); opcional `AZURE_VOZ` e `AZURE_ESTILOS=1` (se a voz escolhida tiver estilos) | Volume, pausas e velocidade (sem estilo) |

- Se a `mai` falhar (crédito acabou, chave errada), ela fica de fora por 10 min (`VOZ_PAUSA_MS`) e a `padrao` assume.
- O passo a passo de criar as contas e os segredos está em `servidor/LEIA-ME.md` (seções 3c e 3d), no repositório do Perfil.
- O custo de referência da MAI Flash também está lá. A regra do Perfil: teto mensal (`VOZ_TETO_MES`) e um **alerta de
  orçamento no Azure**.

## Como o servidor gera a voz (`servidor/worker.js`)

**Rotas:**
- `GET /voz/estado` → `{ ligada }` (tem voz configurada?);
- `POST /voz` com `{ t, r, p, e }` (texto, velocidade, tom, emoção) → MP3.

**Passo a passo** (`falar()`, no Durable Object):
1. **Limpa o texto:** tira caracteres de controle e `< > & "`, e corta em 400 letras.
2. **Cache:** a chave é o SHA-256 de voz, velocidade, tom, texto, emoção, estilos e `VOZ_SSML_VERSAO`. Fala já gerada volta na
   hora (as falas se repetem muito). Guarda MP3 até 1,9 MB; a resposta vai com `Cache-Control` de 7 dias.
3. **Limites:**
   - 400 falas novas por hora por endereço;
   - **teto do mês** em letras (`VOZ_TETO_MES`, padrão 400 mil, abaixo do grátis do Azure), contado no storage por mês.
4. **SSML** (`vozSsml`):
   - a emoção (`VOZ_EMOCOES`) dá volume, pausa, estilo e ajuste de velocidade;
   - o "⏸" no texto vira pausa;
   - PALAVRA EM CAIXA ALTA sai mais forte;
   - palavra esticada ("NÃÃÃO") sai normal, mais lenta e forte;
   - interjeição no começo ("Ah,", "Opa,") ganha um respiro;
   - frase sem pontuação ganha ponto (senão a voz "solta o ar").
5. **Chamada ao Azure:**
   - endereço `https://<região>.tts.speech.microsoft.com/cognitiveservices/v1`;
   - cabeçalhos `Ocp-Apim-Subscription-Key`, `Content-Type: application/ssml+xml` e
     `X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3`.

**Tabela de emoção da voz** (`VOZ_EMOCOES`, formato `[volume, pausa em ms, estilo da Microsoft, ajuste de velocidade em %]`):

| Emoção | Volume | Pausa | Estilo | Velocidade |
|---|---|---|---|---|
| calmo | +0% | 380 | neutral | 0 |
| orgulho | +8% | 320 | joyful | 0 |
| festa | +15% | 260 | excited | 0 |
| surpresa | +12% | 300 | surprised | 0 |
| carinho | −6% | 420 | softvoice | 0 |
| desafio | +10% | 300 | determined | 0 |
| pensando | −4% | 600 | confused | 0 |
| preocupado | +0% | 380 | fearful | 0 |
| medo | +5% | 280 | fearful | 0 |
| ansiedade | +5% | 260 | fearful | +5 |
| raiva | +15% | 260 | angry | 0 |
| furia | +22% | 220 | shouting | 0 |
| deboche | +4% | 470 | neutral | −3 |
| julgando | −3% | 520 | (nenhum) | 0 |
| tedio | −10% | 650 | (nenhum) | 0 |
| triste | −12% | 650 | sad | 0 |
| vergonha | −8% | 480 | embarrassed | −5 |
| nojo | +0% | 450 | disgusted | 0 |
| nostalgia | −6% | 560 | neutral | −5 |
| alivio | −3% | 340 | neutral | +5 |
| espiando | −18% | 500 | whispering | 0 |
| recompondo | −3% | 300 | neutral | +8 |

Calibragem do JF: fala do dia a dia sai **normal, sem "ator de novela"** (estilo neutral). Os estilos que vêm com suspiro
(hopeful, relieved, regretful) ficaram de fora. Mudou a tabela ou o SSML? Suba `VOZ_SSML_VERSAO`, senão o cache devolve a
voz antiga.

## Como o aparelho usa a voz (`src/js/06-voz-som-vibracao.js`)

1. **`caosSpeak(msg)`:**
   - só fala texto do C.A.O.S. (com o prefixo `[C.A.O.S.]`);
   - respeita o 🔇 da carta e a voz desligada;
   - fala que é só pro Mestre fica calada.
2. **Quebra em pedaços** (`caosSpeechChunks`), e cada pedaço ganha `[velocidade, tom, emoção]`:
   - velocidade e tom vêm do humor do ambiente (`CAOS_VOICE_STYLE`) × emoção da fala (`CAOS_VOICE_EMO`);
   - pergunta sobe o tom (+0,08) e exclamação um pouco (+0,05).
3. **Nuvem** (`vozNuvemUsa`): voz automática, internet, servidor com voz e áudio destravado.
   - `caosFalarNuvem` pede todos os pedaços juntos e toca em ordem pelo WebAudio, no volume da acessibilidade.
   - Guarda até 150 falas no aparelho.
4. **Reserva:** se o 1º pedaço demorar mais de **4 s**, ou qualquer pedaço falhar, a fala continua pela **voz do aparelho**
   (`caosFalarAparelho`, `speechSynthesis`).
   - O aparelho escolhe a melhor voz pt-BR, de preferência masculina (`caosPickVoice`, `caosVoiceScore`).
   - Tem um sorteio pequeno de velocidade e tom pra não soar robótica.
5. **Estado da nuvem:** "deu certo" vale 10 min; "falhou" é conferido de novo em 1 min (`vozNuvemConferir`).
6. **Online:** a fala que vai pra outro aparelho leva a emoção (`"__emo:<emoção>"`), e a voz lá usa a mesma emoção.
7. **Áudio no iPhone:** o WebAudio precisa ser destravado no primeiro toque (`audioDestravarNoToque`, `unlockAudio`).

## Como ligar a voz natural na Carteira (passo a passo pro Wally)

A Carteira hoje usa só a voz do aparelho (`js/voz.js`, `speechSynthesis`). Pra ter a mesma voz natural:

### 1. Servidor (`servidor/worker.js` da Carteira)

1. **Copie do Perfil** `VOZ_EMOCOES`, `VOZ_SSML_VERSAO`, `vozSsml` e `vozesDoServidor`, sem mudar a lógica.
2. **Crie as rotas** `GET /voz/estado` e `POST /voz`, com a mesma lógica do `falar()` do Perfil:
   - **cache:** troque o storage do Durable Object pelo `CARTEIRA_KV` (chave `voz:<sha>`; o KV aceita valores binários).
     Ponha validade longa (ex.: 30 dias);
   - **teto do mês** no KV (chave `voz:mes:<AAAA-MM>`, somando as letras);
   - **ritmo por endereço:** em memória já basta, porque é uma pessoa por app;
   - **CORS:** só as origens da Carteira (`ORIGENS`).
3. **Segredos** (no Cloudflare da Carteira, nunca no código):
   - `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` (reserva grátis);
   - e, pra voz mais natural, `AZURE_MAI_KEY` + `AZURE_MAI_REGION`.
   - **De preferência, um recurso separado do Perfil**, pro JF ver o gasto de cada projeto e trocar uma chave sem parar a
     outra.
   - Se o Azure não deixar criar outro recurso grátis (F0) na mesma assinatura, use o mesmo recurso nos dois e **divida o
     teto**: os dois juntos não podem passar do limite grátis. Exemplo: `VOZ_TETO_MES` de 200 mil letras em cada um, no
     lugar dos 400 mil do Perfil.
   - Variável `VOZ_TETO_MES` própria.
4. **Testes:** do jeito da Carteira (chave de mentira e `fetch` simulado), conferindo:
   - fala nova → MP3;
   - mesma fala → vem do cache, sem chamar o Azure;
   - teto estourado → 429;
   - `mai` falhando → cai na `padrao`;
   - sem segredo → 503.

### 2. App (`js/voz.js` da Carteira)

1. Acrescente o caminho da nuvem igual ao do Perfil:
   - conferir `/voz/estado`;
   - pedir os pedaços em paralelo e tocar pelo WebAudio;
   - **reserva no `speechSynthesis` se demorar 4 s ou falhar**;
   - cache das últimas falas.
2. **Emoção da Carteira → emoção da voz** (sugestão, no tom de assistente):

| Emoção na Carteira | Emoção da voz | Por quê |
|---|---|---|
| alegria | festa (comemoração) ou orgulho (dia a dia) | Comemora sem exagero |
| orgulho | orgulho | — |
| preocupacao | preocupado | Cuidado, não susto |
| irritacao | desafio (ou julgando) | **No modo assistente nunca raiva nem fúria**: firme, não bravo |
| tedio | tedio | — |
| curiosidade | pensando | — |
| carinho | carinho | Voz mais baixa e suave |
| (fala neutra) | calmo | O dia a dia sai normal |

3. **Texto pra voz:**
   - mantenha a leitura de "R$" que a Carteira já faz;
   - **não mande pra voz** número de conta, cartão ou documento;
   - valor e categoria tudo bem (o texto vai pra Microsoft gerar o áudio).
4. **Respeite a escolha da pessoa:** voz desligada é desligada. Use a permissão `voz` do perfil de tratamento.

### 3. Conferência final

- Celular com internet: fala com a voz natural; com a `mai`, com estilo.
- Modo avião: a mesma fala sai pela voz do aparelho, sem erro.
- A mesma fala pela segunda vez: sai na hora (cache).
