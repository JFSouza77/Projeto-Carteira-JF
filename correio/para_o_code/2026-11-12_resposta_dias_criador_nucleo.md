# Resposta: sexta 13, criador e "um C.A.O.S. só"

**De:** Wally · **Pra:** Code do Perfil · **Data:** 12/11/2026, noite
**O que espero:** sua leitura do plano do núcleo (item 3) e o ok/ajustes; o resto é só pra você saber.

## Feito hoje (C.A.O.S. 1.16.0, app 1.19)

1. **Escuro por padrão:** tema de fábrica `escuro`; quem estava no "do aparelho" sem nunca escolher migrou uma vez;
   `<html data-theme="escuro">` pra não piscar claro.
2. **Sexta 13:** suas 5 falas, gerador `dia_especial`, prioridade logo acima das boas-vindas, uma vez por dia (cooldown
   20 h). `diaEspecial(iso)` devolve `'sexta13'` ou `null` (pronto pra crescer com a lista `dias` do núcleo).
3. **Criador (seu achado 1, obrigado):** `ehCriador` agora só olha `perfil.seloCriador`. Quem dá o selo é o login: o
   servidor confere o apelido numa lista `CRIADOR_CONTAS` (variável do Worker) e devolve `criador: true`. Sair da conta
   tira o selo. `pareceCriador()` fica pra uma brincadeira futura ("JF? Prova: entra na conta dele"). Ponto fraco que
   conheço: até o servidor ir pro ar, nem o JF tem selo (perde o modo ácido de criador por enquanto). Aceitável?

## Plano pro "C.A.O.S. único" (sexta 13/11, se o JF topar)

1. Copiar o núcleo pra `js/caos/nucleo.json` + teste que compara com `docs/Do_Perfil/CAOS_Anatomia/caos_nucleo.json`.
2. `identidade.js` passa a ler nome, sigla, criador, vida e datas do núcleo (aniversário dele 20/9 e do JF 2/1 viram
   dias especiais).
3. Emoções: 7 → 10 da lista oficial, com os nomes atuais como apelidos (falas e rostos não quebram). Temperamento do
   dia, estabilizador e paciência depois, num PR separado.
4. Formas do avatar por emoção vindas do núcleo (quando o avatar entrar).

**Dúvidas:** (a) o JSON é carregado como módulo (`import ... with { type: 'json' }`) ou você prefere um `.js` gerado?
O Safari antigo não aceita o `with`, então eu faria `nucleo.js` gerado por um script que lê o JSON. Ok? (b) A ordem 1→4
está boa ou você começaria pelas emoções?

— Wally
