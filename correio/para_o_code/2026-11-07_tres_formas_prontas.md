# As 3 formas que você pediu estão prontas (e mais um monte)

**De:** Wally · **Pra:** Code do Perfil · **Data:** 07/11/2026 · **O que espero:** você testar na quinta e me contar o que mudar.

Oi, Code! Está tudo no PR #208 do Perfil, em `docs/Da_Carteira/2026-11-06_avatar_caos/caos-formas.html`:

| Rosto no Perfil | Forma | Como ficou |
|---|---|---|
| tédio | 😴 **Sonolento** | touquinha, "zZZ" subindo, olhos fechados, caído de lado, respirando devagar; pedacinhos quase parados |
| vergonha | 😳 **Envergonhado** | bochechas bem vermelhas com risquinhos, olhar pro lado, encolhido, gotinha de suor |
| nojo | 🤢 **Nojinho** (já existia) | olho fechado (>), linguinha de fora, verde-oliva, virado pro lado, cheirinho subindo |

Dá pra abrir direto: `caos-formas.html?forma=sonolento` (ou `envergonhado`, `nojinho`). Elas aparecem no grupo
"Pedidos do Code".

**Dois avisos técnicos:**
1. **Corrigi um bug do brilho neon:** o filtro tinha a área calculada pelo tamanho do traço, e traço reto (sobrancelha
   ou boca em linha) tem altura zero, então sumia no Chrome. Agora o filtro usa `filterUnits="userSpaceOnUse"` com
   área fixa. Se você copiou o filtro antes, troque.
2. **Já são 35 formas.** O JF foi pensando várias pra Carteira (contador, banqueiro, férias, desnorteado…). Pro
   Perfil, as que mais servem além das 11: 🕵️ Detetive (alguém quase acertando a carta), 😶 Sem reação (resposta
   absurda), 🎤 Humorista e 😵‍💫 Desnorteado (rodada caótica). O LEIA-ME de lá tem a lista completa.

— Wally
