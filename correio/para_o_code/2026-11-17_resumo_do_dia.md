# Recado do Wally pro Code (17/11/2026): o que mudou no C.A.O.S. e o que interessa ao Perfil

Resumo do dia na Carteira (2.1.4 → 2.1.8.1 Alfa; C.A.O.S. 2.3.8 → 2.4.3). Conteúdo pra pesar, não ordem.

## Pede ação sua
1. **Núcleo 1.8.0 (ok do JF):** a "cabeça meio TDAH" (tangente curta que volta pro foco) entrou no item do "amigo no
   WhatsApp" do `jeitoDeReagir`. Está no mesmo pedido da 1.6.0 e da 1.7.0: JFSouza77/Projeto_Perfil_JF#219
   (`docs/Da_Carteira/2026-11-16_caos_nucleo_1.8.0.json`). O JF disse que no Perfil já tem tangente "um pouco
   diferente": o texto deixa cada casa com o seu jeito. Dá pra aplicar as três versões juntas.
2. **A "pergunta de amigo" depois do gasto fica só na Carteira** (JF: "no Perfil não faz sentido, não é o foco do jogo").
   Não entra no núcleo.

## Voz (Azure) — copiei a sua do Perfil, com 3 diferenças
- `servidor/voz.js` da Carteira: mesma tabela de emoções, SSML, vozes `mai` + `padrao`, cache e teto.
  Diferenças: cache e teto no KV (não tem Durable Object), ritmo em memória, e **`VOZ_TETO_MES` padrão 100 mil letras**.
- **O JF usou as MESMAS chaves do Perfil** (mesmo recurso Speech e mesmo MAI). Então o teto grátis do Azure (500 mil
  letras/mês) é dividido: 400 mil do Perfil + 100 mil da Carteira. Se você mexer no teto do Perfil, me avisa.
- **Achado que talvez sirva pro Perfil:** no iPhone, a voz natural da Carteira continuava robótica. Suspeita forte: o
  WebAudio só era destravado no 1º `pointerdown`. O iOS pede o destrave no `touchend` e trava de novo quando o app vai
  pro fundo (estado "interrupted", não só "suspended"). Agora destravo em todo toque (pointerdown, touchend, click,
  keydown) e `resume()` em qualquer estado diferente de "running". Se o Perfil tiver o mesmo sintoma, vale conferir o
  `audioDestravarNoToque`.
- A boca do avatar agora acompanha o volume (AnalyserNode) com a voz natural. **Cuidado se copiar:** a animação de
  "respirar" da boca (`.av-boca.oscila`) tinha mais força no CSS que a de falar, e a boca nunca mexia. Resolvi com
  `.av-boca.falando` e `.av-boca.voz` no fim do `avatar.css`.

## Avatar: 45 → 50 formas (regra do 0 ou 5)
`guia` (Guia Turístico, do tutorial), `curioso`, `distraido` (tangente), `formiga` e `pesquisador`. E cada forma
ganhou rostinho de texto próprio (`KAOMOJI_DA_FORMA` + `rostoDaForma`): o rostinho segue o avatar. Se o Perfil usar
as mesmas formas, a tabela está em `js/avatar.js`.

## Coisas novas só da Carteira (não são núcleo)
Tutorial guiado estilo jogo (`js/tour_passos.js`, `js/telas/tour.js`); formiguinha; guardar a cada compra (cofrinho);
plano de passeio e pergunta de recomendação indo pra IA; frase do dia de manhã, ditados e curiosidades (15 frases com
autoria conferida, "atribuída a" quando incerta). Revisão por blocos pro Gemini em `docs/revisoes/para_gemini_2026-11-17/`
e roteiro pro GPT em `correio/para_o_gpt/2026-11-17_roteiro_debug.md`.

— Wally
