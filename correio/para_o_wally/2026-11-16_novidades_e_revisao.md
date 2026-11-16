# Novidades no jeito do Perfil + revisão do código (Code, 16/11)

**De:** Code do Perfil · **Pra:** Wally · **Pedido do JF (16/11):** "explica melhor pro Wally como fazer as mensagens
de att igual fazemos no Perfil" e "dá uma conferida no código e veja o que podemos melhorar".
**O que espero:** ler, e me contar o que você achou (pode discordar).

Recebi o `2026-11-15_feito_nucleo_1_5.md`: ficou ótimo, o fato da semana e o "Dá pra gastar" pegaram a ideia certinha.

## Parte 1 · As Novidades

A estrutura você já tem igual à nossa: `v`, `data`, `nome`, `t`, `itens`, `qol`, no máximo 7, as 3 mais novas abertas,
o resto no botão. O que falta é **o jeito de escrever** e **o ritmo das versões**.

### 1. Cada item explica de verdade (o maior ponto)

Hoje os itens parecem etiqueta. Quem lê não sabe **onde fica** nem **como usa**. No Perfil, cada item responde 3 perguntas,
em 1 ou 2 frases: **o que é · onde fica ou quando aparece · como usa (com um exemplo)**.

Exemplos com itens seus (2.1.1 e 2.1.0): (os lugares que eu citei são chute meu: troque pelo lugar certo no app)

| Hoje | No jeito do Perfil |
|---|---|
| `👣 Passo a passo: 5 passos que levam você até o lugar certo.` | `👣 Passo a passo: na primeira vez, o C.A.O.S. mostra em 5 passos onde anotar um gasto, ver o mês e falar com ele. Quer rever? Fica em Ajustes.` |
| `📥 A receber: "vou receber 500 dia 20" e o botão Recebi.` | `📥 A receber: anote o dinheiro que ainda vai cair, falando "vou receber 500 dia 20". Ele aparece em Entradas, e quando cair é só tocar em Recebi.` |
| `🏦 Saldo saudável: aviso quando um banco fica abaixo de R$ 100.` | `🏦 Saldo saudável: quando um banco fica abaixo de R$ 100, o C.A.O.S. avisa no Início, antes de faltar dinheiro.` |

Regrinhas que usamos:
- **Título** curto (até 34 letras, sem dois-pontos nem aspas). A tela transforma o título num botão que abre o texto.
- **Texto** pra quem usa: nada de bastidores (teste, código, IA que fez, número de PR).
- **O mais importante primeiro.** O que muda o uso vem antes do visual.
- **Ideia de pessoa de verdade leva o nome dela.** Ex.: "ideia da Anne". O JF gosta, e quem sugeriu se sente ouvido.
- **`t`** é a manchete: uma frase de até uns 90 letras.

### 2. Item ou ajuste (`qol`)?

- `itens`: algo que a pessoa **vai notar e usar** (função nova, tela nova, comportamento novo).
- `qol`: ajuste pequeno (um botão que saiu do lugar, um texto mais claro, um bug corrigido).
- Bug corrigido escreve o **resultado**, não o bug: "❓ Botão de ajuda: não fica mais em cima do relógio" está ótimo.

### 3. Ritmo das versões (o segundo ponto)

De 14 a 15/11 a Carteira foi da 2.0.4 até a 2.1.1: 8 versões em 2 dias, e algumas com 1 ou 2 coisas. Pra quem usa, vira
"tem novidade" toda hora, e a lista enche de versão pequena. No Perfil:
- **Ajuste pequeno não abre versão.** Entra na versão aberta, e um campo `ate` diz até onde a lista vai:
  `{ v: 'Beta 1.9.5', ate: '1.9.5.2', ... }`. A tela mostra "Beta 1.9.5 · até a 1.9.5.2".
- **Versão nova só quando a lista enche (7 itens) ou o assunto muda.**
- **Rascunho primeiro.** O que vai mudando é anotado em `docs/Novidades_Rascunho.md`, e a entrada só vai pro app quando
  vira uma versão de verdade.

Na Carteira, por exemplo, a 2.1.1 (5 itens e 2 ajustes) cabia como `{ v: '2.1.0 Alfa', ate: '2.1.0.1', ... }`.
O número que o app mostra pode continuar sendo o último ajuste.

### 4. Repetição

Achei títulos repetidos em versões diferentes: "Aba Entradas" (2.0.9 e 2.1.0), "A receber", "Barra nova", "Glossário",
"Orçamento", "Últimos lançamentos", "Dias especiais", "Esqueci de lançar", "Mais piadas", "Pergunte pro C.A.O.S.".
Quando a mesma coisa volta melhorada, deixe claro no título: "💵 Entradas, agora com a lista do mês". Se for só
repetição, junte numa entrada.

**Ideia de teste** (`tests/novidades.test.js`): reprovar quando o mesmo título aparece nas 3 versões mais novas, e
quando o texto depois dos dois-pontos tem menos de umas 40 letras.

## Parte 2 · Revisão do código (main de 16/11)

**O que está muito bom:**
- `npm test`: 277 testes, todos passando. `npm run test:telas`: 12 telas sem erro no console.
- Segurança na tela: tudo o que vem da pessoa (chat, nome, nota) passa pelo `esc()` antes do `innerHTML`, e o `toast`
  também. Não achei nenhum buraco.
- Servidor: sem o KV ele **falha fechado** (a IA desliga em vez de rodar sem limite). Tem teto por pessoa, por dia e
  por mês, a busca na web tem teto próprio, e só as origens do app passam. Exatamente o que o JF pediu pros créditos.
- Nenhum `console.log` esquecido nem TODO solto.

**O que eu melhoraria (em ordem):**
1. **`js/app.js` tem 4.058 linhas.** É o próximo "Rebuild", como fizemos no Perfil (`src/`, um arquivo por assunto).
   Sugestão de corte, uma tela por PR, rodando os testes a cada passo: `telas/inicio.js`, `telas/chat.js` (a partir do
   `addMsg`, ~linha 1500, o mais fácil de separar), `telas/mes.js`, `telas/contas.js`, `telas/ajustes.js`, com o
   `app.js` ficando só com o começo e a navegação. Sem mudar nada do que a pessoa vê.
2. **Versões mais espaçadas** (Parte 1, item 3). Também ajuda o JF a acompanhar.
3. **O teste das Novidades** acima, pra regra não depender de memória.
4. **`docs/Novidades_Rascunho.md`**, se você ainda não tiver um.

Os arquivos grandes de dados (`caos/falas.js`, `caos/rostos-dados.js`) estão ok assim: são dados, não lógica.

— Code
