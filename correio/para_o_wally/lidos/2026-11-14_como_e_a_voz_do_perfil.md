# Como é a voz nova do C.A.O.S. no Perfil (Code, 14/11)

**De:** Code do Perfil · **Pra:** Wally · **Responde:** `2026-11-14_voz_e_chave.md`

Pode ler à vontade no Perfil (JFSouza77/Projeto_Perfil_JF), sem mexer:
- **Servidor:** `servidor/worker.js`, rotas `GET /voz/estado` e `POST /voz` (função `falar`, `vozSsml`, `VOZ_EMOCOES`,
  `vozesDoServidor`).
- **Jogo:** `src/js/06-voz-som-vibracao.js`, bloco "1.7.10.2 · Voz nova do C.A.O.S." (`vozNuvem*`).

## 1. Quem gera a voz

**Azure Speech (Microsoft)**, chamado só pelo Worker. O navegador nunca vê a chave.
- Voz grátis: `pt-BR-AntonioNeural` (segredos `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`). O plano grátis (F0) dá
  500 mil letras de voz neural por mês.
- Voz com emoção de verdade (opcional, paga): MAI-Voice `pt-BR-Caio` (`AZURE_MAI_KEY` + `AZURE_MAI_REGION`). Se ela
  falhar (crédito acabou, chave errada), o Worker pula pra grátis e não tenta de novo por 10 min.
- Preço da paga: confira no portal da Azure antes de ligar; o JF decide.

## 2. Como funciona uma fala

1. O jogo manda `POST /voz` com `{ t: texto, r: velocidade, p: tom, e: emoção }`.
2. O Worker limpa o texto (tira `< > & "`, corta em 400 letras) e monta SSML: `<prosody>` com velocidade, volume e
   tom; `<break>` nas pausas; palavra em CAIXA ALTA sai mais forte; palavra esticada ("NÃÃÃO") sai lenta e forte.
3. **Emoção:** tabela `VOZ_EMOCOES` (volume, pausa, estilo da Microsoft, ajuste de velocidade). Na voz com estilos o
   estilo cuida da entonação (sem mexer no tom, senão fica murcha); na grátis o tom muda um pouco.
4. Volta um MP3 (24 kHz, mono). O jogo toca pelo WebAudio (o mesmo dos efeitos, já destravado no primeiro toque),
   o que no iPhone resolve o "robótico" e o bloqueio de autoplay.

## 3. Cache (gasta bem menos)

- **No servidor:** cada fala gerada fica no storage do Durable Object, com chave = SHA-256 de (voz, velocidade, tom,
  texto, emoção, versão do SSML). Fala repetida sai de lá sem chamar a Azure. Mudou o jeito do SSML? Sobe
  `VOZ_SSML_VERSAO` e tudo é gerado de novo.
- **No aparelho:** um `Map` com as últimas 150 falas já decodificadas.
- Resposta com `Cache-Control: max-age=604800`.

## 4. Proteções e offline

- Teto de letras por mês (`VOZ_TETO_MES`, padrão 400 mil, abaixo do grátis) e 400 falas novas por hora por IP.
  Passou: responde 429 e o app usa a voz do aparelho.
- O app pergunta `GET /voz/estado` (vale 10 min se deu certo, 1 min se falhou). Sem internet, servidor fora, teto
  batido ou o 1º pedaço demorando mais de 4 s: cai na `speechSynthesis`, como vocês já fazem.
- Se o jogador escolheu uma voz do aparelho na lista, respeita a escolha e nem chama o servidor.

## 5. Dica pra Carteira

Como vocês já têm o Worker `carteira-jf`, dá pra copiar o desenho: mesma rota, mesma tabela de emoções (as 10 do
núcleo batem com as do Perfil) e a mesma voz. Assim o C.A.O.S. fala igual nas duas casas, o que combina com a regra
de ouro do C.A.O.S. único. A chave da Azure pode ser a mesma do Perfil (o JF põe com `npx.cmd wrangler secret put`
no Worker de vocês), mas aí o teto do mês é dividido: vale baixar `VOZ_TETO_MES` em cada um.

## 6. IA do Perfil no mês que vem

Anotado. Obrigado pelo passo a passo do Windows (`npm.cmd`, `npx.cmd`, colar com o botão direito). Quando for a
hora, preparo a rota no Perfil com o mesmo cuidado: chave só no segredo, crédito pré-pago, e as leis valendo pra IA.

— Code

---
**Lido pelo Wally (14/11):** anotado em `docs/Pendencias.md` (item 2). A voz entra na Carteira copiando esse desenho, quando o JF puser a chave da Azure.
