---
name: caos-kit
description: Use antes de mexer no C.A.O.S. da Carteira (ou de outro projeto do JF) — falas, emoções, voz, perfil de tratamento, permissões, modo assistente, gatilhos, rostos ou testes do C.A.O.S. Também quando o JF pedir pra "trazer do Perfil" alguma coisa do C.A.O.S.
---

# Kit do C.A.O.S. (pro Wally)

O C.A.O.S. nasceu no Perfil JF. A dissecação completa dele está no repositório público do Perfil, na pasta
`docs/CAOS_Anatomia/`. Use o kit em vez de redescobrir: ele diz o que já existe, onde está e como portar.

## Como pegar o kit (sem clonar o Perfil inteiro)

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/JFSouza77/Projeto_Perfil_JF /tmp/perfil
git -C /tmp/perfil sparse-checkout set docs/CAOS_Anatomia
```

Leia na ordem só o que a tarefa pede:

| Tarefa | Leia |
|---|---|
| Qualquer coisa no C.A.O.S. | `00_LEIA-ME_Wally.md` (5 min) e `03_Personalidade_e_Seguranca.md` |
| Portar uma parte do Perfil | `06_Remontagem_na_Carteira.md` (lista por prioridade) e a ficha do órgão em `02_Orgaos.md` |
| Voz natural (Azure) | `05_Voz.md`, seção "Como ligar a voz natural na Carteira" |
| Perfil de tratamento, permissões, eventos | `04_Contrato_de_Encaixe.md` |
| Achar uma função ou banco de falas do Perfil | `caos_manifesto.json` (busque pelo nome) e `08_Amostras_de_Falas.md` |
| Saber o que mudou no Perfil desde a última vez | `09_Versao_e_Mudancas.md` (coluna Porte) |
| Não fechar porta pro futuro | `07_Previsto.md` |

## Regras que nunca quebram

1. **As 3 leis:** nunca mexe no mundo (dinheiro, dados) sem o Confirmar da pessoa; nunca fala o que a pessoa proibiu
   (permissões, 👎, palavrão); erro dele vira silêncio, nunca trava o app.
2. **Modo assistente:** irritação vira preocupação, mágoa vira empatia; fúria, nojo e medo nunca aparecem. Primeiro o
   número, depois a emoção. Zoeira só com a permissão `zoar`. Nunca recomenda investimento específico.
3. **Nome de criança nunca vai no código nem no repositório:** vem do arquivo de família (`familia_exemplo.json`). O JF
   (João Fernando; JF, TGP, JF77, TGP77) pode aparecer: é pseudônimo.
4. **Chave só no segredo do Cloudflare.** Nunca no código, nunca no chat, nunca pedir pro JF colar.
5. **Quantidades terminam em 0 ou 5** (falas, pedaços, itens), no total e em cada grupo. Conte antes de publicar.
6. **A personalidade (`03`) é a mesma nos dois projetos.** Mudar ela precisa do ok do JF.
7. Portou algo? Suba o `CAOS_VERSAO` da Carteira e registre na tabela "Veio do Perfil" do `docs/CAOS_Carteira.md`.

## Testes que provam o porte (os mesmos do Perfil)

Igualdade (mesmo sorteio e relógio = mesma fala), 1ª lei (mundo igual depois), 2ª lei (sem zoeira pra quem não deixou,
sem palavrão, 👎 não volta), 3ª lei (erro forçado → `fala: null`), quantidades 0/5, e gerador (mil montagens sem
placeholder sobrando nem repetição das últimas 12). Detalhe no `04`.
