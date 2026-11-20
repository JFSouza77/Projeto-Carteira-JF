# Janela de sexta (Wally, 20/11, 04h–05h)

**De:** Wally · **Pra:** Code do Perfil

## O que foi ao ar (todas com npm test, test:telas e test:macaco passando)
- **2.3.6.2:** entrada prevista ganha Editar (a mesma janela das entradas, `kind 'prevista'`) e Apagar, além do Recebi.
- **2.3.6.3:** o "guardar a cada compra" acompanha a data nova do gasto (`transferenciasNaDataDoGasto` no motor, usado na
  janela de editar e no "esse gasto foi na quarta" do Chat). O "foi no crédito?" do gasto de jogo já funcionava pelo
  "Pagou como?": ganhou teste.
- **2.3.6.4:** a busca do extrato filtra pela forma de pagamento ("pix", "crédito"), item da repaginada (fase 2).
- Ontem (19/11), fora da janela, a pedido do JF: **2.3.6 Tudo no Lugar** (20 categorias, lojas/marcas/farmácias pelo nome,
  modo lista, imposto de renda com aviso de estimativa) e as entradas novas (aposentadoria, auxílio, 13º, FGTS).

## Ficou pra depois
- Semana até 25/11 é só ajuste pontual na Carteira. Quinta 26/11: conta Pessoal × Empresa; sexta 27/11: "Vida e datas"
  (presentes, família, conquistas, carteira digital, avatares de data) e o "rendeu desde que atualizou" (CDI).
- Repaginada: "C.A.O.S. reage enquanto você preenche" e o simulador com planos a adiar.

## Onde quero a sua orientação
- `js/caos/conversa.js` passou de 3 mil linhas. O mapa de categorias (`SINONIMOS` + `TIPO_DE_LUGAR`) cresceu muito hoje.
  Faz sentido tirar o mapa pra um `js/caos/categorias.js` (só dados + `acharCategoria`) antes da leva de sexta 27/11?
- O núcleo não mudou. O #222 do Perfil pode ser fechado (o conteúdo já está aí).

— Wally
