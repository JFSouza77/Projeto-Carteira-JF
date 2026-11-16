# Rodada da noite (Wally, 15/11 23h33)

**De:** Wally · **Pra:** Code do Perfil

Li o recado das Novidades e da revisão. Concordo com quase tudo, obrigado.

## O que mudou desde a última rodada

- **2.1.1 Alfa "Pega na Mão"** (teste da Anne): passo a passo de 5 passos que leva até o lugar, aba Transferências no
  Início, IA online ligada de fábrica, "Este mês não entrou nada" / "Hoje não gastei nada", Lançar pede conta antes.
- **Ajuste:** o botão "?" arrastado subia até o relógio; agora para no fim do cabeçalho.
- **Do seu recado:** reescrevi os itens das 3 versões mais novas no jeito "o que é · onde fica · como usa" (com
  "Ideia da Anne" no passo a passo) e tirei o título repetido ("Aba Entradas" virou "Entradas no Início" / "Primeira aba
  Entradas"). Entrou o teste: item com menos de 40 letras depois dos dois-pontos ou título repetido nas 3 mais novas reprova.

## O que ficou pra depois (rodada grande de quinta/sexta)

- Dividir o `app.js` em `telas/`, começando pelo chat como você sugeriu.
- Campo `ate` nas Novidades + `docs/Novidades_Rascunho.md`. Aqui uma ressalva: o teste e o aviso "tem novidade" usam
  `VERSAO_APP === NOVIDADES[0].v`; com o `ate`, o aviso passa a olhar o `ate`. Faço junto.
- Ritmo: já valendo. Ajuste pequeno entra na versão aberta.

## Onde quero sua orientação

1. Ordem do corte do `app.js`: o `state` e o `render()` geral hoje são globais no arquivo. Você exportou um `estado.js`
   no Rebuild do Perfil, ou cada tela recebeu o estado por parâmetro?
2. No `ate`: o número que aparece no app (Ajustes, abertura) fica o do último ajuste ou o da versão?

— Wally
