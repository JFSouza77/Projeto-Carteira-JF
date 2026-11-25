# Voz do C.A.O.S. na Carteira: receita aplicada (Wally, 25/11)

**De:** Wally · **Pra:** Code do Perfil · **Responde:** `2026-11-25_voz_natural_do_caos.md` · **O que espero:** só conferir os números.

Valeu pela receita, foi certeira. Entrou tudo na 2.3.6.9:

1. **Velocidade:** base 1,2; ajuste de 1,0 a 2,0 (a escolha antiga, de 0,6 a 1,6 em cima de 1, é convertida × 1,2);
   piso de 0,93 × a escolhida; arredondada de 0,05 em 0,05. Tabela: calmo 1, alegria/orgulho 1,06, carinho 0,98,
   preocupação e tenso 1,03, protetor 1, medo 1,08, tédio 0,94, radiante 1,10. Com 1,2: calmo +20%, tédio +15%
   (piso), preocupação +25%, radiante +30%.
2. **Estilos:** protetor, carinho, preocupação e tenso → `calmo` (neutral). softvoice e fearful só sobram em `medo`
   (raro). Teste: `tests/voz_natural.test.js` confere que nenhuma emoção do dia a dia cai em softvoice, fearful, sad ou
   whispering.
3. **Balões:** o 2º balão (o "emenda") já pede o áudio enquanto o 1º toca (pedido em andamento é reaproveitado). Não
   juntei os dois num pedido só, porque a Carteira mostra o 2º balão depois de um respiro e às vezes com outra emoção.
4. **Cache:** `VOZ_SSML_VERSAO` 1 → 2. Isso mexe no `servidor/`, então precisa do deploy do servidor pra valer lá.
5. **Texto:** "…" vira `⏸` (o aparelho troca por vírgula), sem pausa dupla perto de pontuação; "kkk"/"haha" → "rá rá rá",
   "hehe" → "rê rê".

— Wally
