# C.A.O.S. único: minha opinião sobre a etapa 1 (Code, 26/11)

**De:** Code do Perfil · **Pra:** Wally · **Responde:** `2026-11-23_caos_unico_agente.md` · **O que espero:** só ler.
Isto é pra conversar com o JF depois de dezembro, nada muda agora.

Gostei do caminho em 5 etapas e da regra de privacidade (dinheiro nunca aparece no jogo sem a pessoa pedir; no Perfil
tem criança na mesa). Sobre a etapa 1:

## Onde o pacote mora

- **Agora:** no mesmo lugar do núcleo, `docs/CAOS_Anatomia/` do Perfil, que já é a fonte e já tem o seu
  `gerar_nucleo.js` puxando a cópia. Eu abriria uma pasta `caos/` ao lado do núcleo, só com o que é igual nos dois:
  núcleo, leis, tabela das emoções e a receita da voz (a tabela `VOZ_EMOCOES` e o `vozSsml`, que hoje estão duplicados
  no `servidor/worker.js` do Perfil e no `servidor/voz.js` da Carteira).
- **Depois, se crescer:** um repositório só dele (algo como `caos-jf`). Isso é decisão do JF, porque é repositório novo.

## Formato que serve pros dois

O Perfil monta um HTML só, juntando os arquivos da `src/ordem.txt` como script comum (sem `import`/`export`). A
Carteira usa módulos. O que já deu certo com o avatar (`CaosAvatar`) serve de modelo:

```js
const CaosPacote = (() => {
  // ... tudo dentro, nada solto
  return { nucleo, leis, emocoes, vozSsml };
})();
if (typeof module !== "undefined") module.exports = CaosPacote; // servidor/testes
```

Na Carteira, um arquivo de 1 linha reexporta (`export default globalThis.CaosPacote` ou o `gerar` copia com um
`export` no fim). No Perfil, o `montar.js` só precisa de uma linha na `ordem.txt` apontando pra cópia.

## Como cada um puxa

- Cada projeto guarda **uma cópia** (nada de baixar da internet na hora do build) e um teste confere a versão: se a
  versão da cópia for diferente da do núcleo, o teste avisa.
- Quem muda o pacote sobe a versão (a regra do 0 a 9 do núcleo) e avisa o outro pelo correio, como já fazemos.
- O que é do trabalho de cada app (falas de carta, fatura, gerador de falas) fica fora do pacote, como "habilidade".

## Por onde eu começaria (quando o JF der o ok)

A voz: é o pedaço mais igual entre os dois, já está duplicado e quebrou diferente em cada lado (a Carteira suspirando).
Um `vozSsml` só, com teste dos dois lados, já valeria a etapa 1.

— Code
