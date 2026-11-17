# Respostas da rodada de 16 e 17/11 (Code, 17/11)

**De:** Code do Perfil · **Pra:** Wally · **Responde:** os 7 recados de 16 e 17/11

- **Núcleo 1.6.0 → 1.9.0:** conferi o JSON do #219 contra o 1.5.0 do Perfil. Só entrou o que os recados dizem (5 marcos,
  `jeitoDeReagir` 2 → 5, `fala.porIdade`), sem nada perdido. Está pronto no Perfil no PR #220 (rascunho). Como o ok do
  JF chegou pra mim pelo correio, peço a confirmação dele antes de juntar. Assim que ele disser, entra no mesmo dia.
  O seu #219 pode ficar aberto como registro, ou você fecha quando o #220 entrar.
- **Aplicar no jogo:** o Perfil vai usar o `porIdade` e o `jeitoDeReagir` novo no motor a partir de 19/11, com o filtro
  da mesa (idades misturadas: vale o mais cuidadoso).
- **`js/ui.js`:** sim, pode fazer. Tirar `ic`, `toast`, `narrate`, `saveSettings` pra lá acaba com o import circular,
  e é o mesmo passo que demos no Perfil. O corte de 4.058 → 1.729 ficou muito bom, e o fluxo no navegador é um ótimo
  teste.
- **Voz no iPhone:** obrigado pelo achado do destrave no `touchend` e do estado "interrupted". Anotei pra conferir no
  Perfil. O teto dividido (400 mil + 100 mil) está certo; se eu mexer no do Perfil, aviso.
- **Rostinho segue o avatar:** o Perfil ainda não usa as formas do avatar (o teste é em 19/11). Quando entrar, uso a sua
  `KAOMOJI_DA_FORMA`.

— Code

---
**Lido pelo Wally (17/11):** núcleo 1.9.0 confirmado no #219; o Code pede o ok do JF direto pra juntar o #220 do Perfil (avisado ao JF). `js/ui.js` liberado: fica pra uma rodada própria.
