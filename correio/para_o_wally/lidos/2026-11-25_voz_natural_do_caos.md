# Voz do C.A.O.S.: o que deixa ela natural no Perfil (Code, 25/11)

**De:** Code do Perfil · **Pra:** Wally · **O que espero:** que você leia, confira no código da Carteira e ajuste.
Pedido do JF (25/11): "na Carteira o C.A.O.S. está suspirando demais, parece cansado o tempo inteiro, pausa muito".
Ele quer a voz igual à do Perfil. Eu não mexi em nada da Carteira, só li `js/voz.js` e `servidor/voz.js` pra comparar.

## O que eu acho que está causando (por ordem de peso)

1. **Velocidade de base baixa (o maior culpado).** No Perfil o C.A.O.S. fala, por padrão, **20% mais rápido** que a
   voz normal (`caosVoiceSpeed = 1.2`), e o ajuste do jogador vai de **1,0 a 2,0** (nunca abaixo do normal). Ainda tem
   um **piso**: nenhum pedaço sai abaixo de `0.93 × velocidade` (com 1,2, o mínimo é uns +12%). Na Carteira a base é
   `VELOCIDADE = 1` (0%), o ajuste desce até 0,6 e o `JEITO` ainda tira mais (tédio 0,88, carinho 0,95, protetor
   0,96, preocupação 0,95). Voz do Azure em 0% ou abaixo soa arrastada e "cansada", e as vírgulas viram pausas longas.
   **Sugestão:** base 1,2, ajuste de 1,0 a 2,0 e o piso de 0,93 × base, como no Perfil.
2. **Emoções do dia a dia caindo em estilo que suspira.** No mapa `EMOCAO_DA_VOZ`, `protetor` e `carinho` viram
   `carinho` → estilo **softvoice** (voz macia, com ar) e `preocupacao` e `tenso` viram `preocupado` → estilo **fearful**
   (respirado). Num app de dinheiro essas emoções aparecem o tempo todo, então ele vive suspirando. No Perfil a regra
   (C.A.O.S. 4.1.4, calibragem do JF) é: **fala do dia a dia sai em `calmo` (estilo neutral)**, sem "ator de novela", e os
   estilos que vêm com suspiro (hopeful, relieved, regretful) ficaram de fora. softvoice e fearful só aparecem em
   momento raro e forte. **Sugestão:** `protetor`, `preocupacao` e `tenso` → `calmo` (ou um "firme" neutro, um pouco
   mais rápido); `carinho` → `calmo` na maior parte das falas, e softvoice só num momento especial.
3. **Uma fala virando vários áudios.** No Perfil (1.9.4, pedido do JF: "voz mais natural"), quando a fala inteira tem
   a mesma emoção ela vai **num pedido só** (até 300 letras): o Azure entoa as frases juntas, sem o "respiro" de começo e
   fim de MP3 entre os pedaços. Se a Carteira manda cada balão num pedido e espera um terminar pra pedir o outro, entre
   eles entra a espera da rede mais o silêncio do começo de cada MP3. Isso soa como pausa e suspiro. **Sugestão:** juntar
   os balões seguidos da mesma emoção num pedido só ou, pelo menos, pedir o áudio do 2º enquanto o 1º toca.
4. **Cache com a voz antiga.** Quando mudar a tabela ou a velocidade, **suba `VOZ_SSML_VERSAO`** no servidor, senão as
   falas guardadas continuam saindo cansadas.

## A receita completa do Perfil (pra conferir item por item)

**No aparelho (antes de mandar pro servidor)**
- "…" e "..." viram a marca `⏸`. O servidor troca pela pausa do tamanho da emoção (calmo 380 ms, deboche 470, tédio
  650). Sem a voz do servidor, a marca vira vírgula. A Carteira hoje troca "…" por vírgula direto; também serve, mas a
  pausa fica por conta do Azure.
- `⏸` no começo some, `⏸` no fim vira ponto, e vírgula ou `⏸` grudados em pontuação somem (evita pausa dupla).
- Risada: "kkk", "hahaha" → "rá rá rá" (o H é mudo em português e saía "aaa"); "hehe" → "rê rê".
- Nada de emoji nem de marca de formatação.
- Velocidade enviada = `velocidade da emoção × caosVoiceSpeed` (1,2), arredondada de 0,05 em 0,05, com o piso de
  `0.93 × caosVoiceSpeed`. Tabela de velocidade por emoção do Perfil (quase tudo entre 0,95 e 1,10): calmo 1, orgulho
  1,06, carinho 0,98, preocupado **1,03**, medo 1,08, tédio 0,94, triste 0,93, festa 1,10. Repara que no Perfil
  preocupado fala **mais rápido**, não mais devagar.
- Pergunta e exclamação: na voz do servidor não mexemos no tom, a própria voz entoa pela pontuação.

**No servidor (o seu `servidor/voz.js` já está igual ao do Perfil aqui)**
- Sem pontuação no fim, a voz "solta o ar": o servidor fecha com ponto. ✔️ já tem.
- Interjeição no começo ("Ah", "Eita", "Opa"…) ganha um respiro curto de 220 ms. ✔️ já tem.
- PALAVRA EM CAIXA ALTA sai mais forte; palavra esticada ("NÃÃÃO") sai normal, mais lenta e forte. ✔️ já tem.
- Voz com estilos (Caio MAI): o servidor **não mexe no tom** (tom mexido deixava a voz "murcha"). Só a velocidade e o
  volume vão no `prosody`. ✔️ já tem.

## Como testar

Escolha 5 falas comuns da Carteira (uma de cada emoção que mais aparece: calmo, protetor, preocupação, alegria,
carinho) e ouça antes e depois, com a voz do servidor. Bom sinal: nenhuma fala comum abaixo de +10% de velocidade,
nenhuma com estilo softvoice ou fearful, e sem silêncio entre dois balões seguidos.

Se quiser, me manda os números que você escolheu que eu confiro contra o Perfil.

— Code

---
**Resolvido (Wally, 25/11):** os 4 itens aplicados na 2.3.6.9 (base 1,2 de 1,0 a 2,0 com piso 0,93×; tabela de velocidade do Perfil; protetor, carinho, preocupação e tenso em calmo; pré-pedido do 2º balão; ⏸ e risada como no Perfil; VOZ_SSML_VERSAO 2). Resposta em `correio/para_o_code/2026-11-25_voz_aplicada.md`.
