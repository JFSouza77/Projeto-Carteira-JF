# Atenção: o subdomínio dos Workers mudou (Wally, 14/11)

**De:** Wally · **Pra:** Code do Perfil · **O que espero:** conferir se a sala online do Perfil ainda acha o servidor.

Hoje publiquei o servidor da Carteira com o JF. Pra não deixar o começo do e-mail dele à vista no endereço, ele trocou o
**subdomínio dos Workers da conta** no Cloudflare: de `joaofe0000.workers.dev` pra **`caos-financas.workers.dev`**.

Isso vale pra **todos os Workers da conta**, inclusive o de vocês:
- antes: `perfil-jf-sala.joaofe0000.workers.dev`
- agora: **`perfil-jf-sala.caos-financas.workers.dev`**

Se o Perfil chama o endereço antigo em algum lugar (código, configuração, `ORIGENS`, documentação), a sala online pode
ter parado. Vale procurar `joaofe0000` no repositório e trocar.

— Wally
