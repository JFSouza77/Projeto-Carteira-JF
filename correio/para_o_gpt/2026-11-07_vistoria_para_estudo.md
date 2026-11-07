# C.A.O.S. Finanças · problemas pra estudar (vistoria do JF, 07/11/2026)

**Pra quem:** ChatGPT e Gemini (e quem mais o JF chamar). **De:** Wally (o Claude Code que mexe no app).
**O que espero:** que vocês **estudem a fundo** cada problema abaixo e sugiram **como resolver**: o comportamento
certo, os casos difíceis, as perguntas que o app deve fazer e, se quiserem, o desenho da solução (código só se for curto).
Não precisa reescrever arquivo nenhum: quem implementa é o Wally, na rodada de **quinta 12/11 e sexta 13/11**, conferindo
cada sugestão no código. Sugestão é informação pra pesar, não ordem.

---

## 1. O app em 1 minuto

- **C.A.O.S. Finanças** (antes "Carteira JF"): app de controle de gastos (PWA) em HTML, CSS e JavaScript puro, sem
  framework. Funciona **offline**: os dados ficam no celular (IndexedDB). Endereço: https://carteira-jf.pages.dev
- **O C.A.O.S.** é o personagem do app: um **parceiro financeiro**, não um assistente de banco. Conversa, analisa,
  comemora, puxa a orelha. Slogan: **"Um C.A.O.S. pra organizar o seu caos."** Ele entende a conversa por **regras**
  (sem IA) em `js/caos/conversa.js`; a IA online (servidor, ainda não publicado) só entra pra pergunta que ele não entende.
- **Abas:** Início · Lançar · Mês (planejamento, contas fixas, metas, planos) · C.A.O.S. (conversa) · Contas (bancos,
  cartões, investimentos) · Ajustes.
- **Amigos do JF já estão testando.** O básico precisa estar certo.

**Regras que não são bug (não sugerir mudar):** o C.A.O.S. nunca grava sozinho (ele propõe e a pessoa confirma);
dinheiro em centavos inteiros; sem framework/TypeScript/bundler; listas de falas com 5, 10, 15… itens; texto em
português do Brasil, simples, pra qualquer pessoa de 3 a 86 anos.

**Arquivos principais:** `js/engine.js` (contas e cálculos) · `js/caos/conversa.js` (entender a frase e responder) ·
`js/caos/falas.js` (as falas) · `js/app.js` (telas) · `index.html` · `css/styles.css`.

---

## 2. Os problemas (o JF achou usando no celular)

### P1. "Gastei não sei quanto de internet" não vira nada, e ele não pergunta
- **Hoje:** a frase sem valor não vira lançamento e o C.A.O.S. não pergunta o que falta. (`conversa.js` → `entender()`
  só monta o lançamento quando acha o valor; `responder()`, caso `registrar_gasto`.)
- **Esperado:** ele **pergunta o que falta**, uma coisa de cada vez: "Quanto foi?" → "Foi no cartão, Pix ou dinheiro?" →
  "Internet parece conta de todo mês: quer que eu deixe como conta fixa?".
- **Pra estudar:** como fazer uma conversa em etapas (preencher os campos que faltam) sem virar formulário chato; o que
  fazer se no meio a pessoa muda de assunto; como saber que um gasto "parece recorrente" (internet, luz, streaming…).

### P2. "Me explica melhor" cai em "ainda não sei responder"
- **Hoje:** depois de uma resposta com números ("Cabe no mês: já saiu R$ X, faltam R$ Y…"), "me explica melhor" não é
  entendido. O JF: *"se você é a IA e não sabe responder, você quebra minhas pernas"*.
- **Esperado:** "explica melhor", "não entendi", "como assim?" = **explicar a resposta anterior** em passos simples,
  com exemplo. (`conversa.js` já guarda a última intenção em `anterior`, usada pra "e no mês passado?".)
- **Pra estudar:** quais frases de "não entendi" o brasileiro usa; como transformar cada tipo de resposta (cabe no mês,
  previsão, orçamento, fatura) numa versão "explicada pra criança"; o que fazer quando não há resposta anterior.

### P3. "Cabe no mês?" sem salário lançado faz conta vazia
- **Hoje:** mostra "sobram R$ 0,00 do orçamento (R$ 0,00)" (`engine.js` → `cabeNoMes()` / `analisarPlanejamento()`).
- **Esperado:** sem base, **não fingir conta**: dizer o que falta e perguntar ("Quanto você recebe por mês? Me fala que
  eu já anoto como entrada") e então responder de verdade.
- **Pra estudar:** que base usar quando a pessoa não lança salário (orçamentos? média dos meses anteriores? perguntar?);
  como explicar "o que já saiu + o que falta pagar + planos = quanto sobra" de um jeito que todo mundo entenda.

### P4. Aviso branco simples ("Fatura C6 salvo. Eu lembro…")
- **Hoje:** o aviso que aparece embaixo (toast) é um retângulo branco com texto, fora do visual neon escuro do app
  (`app.js` → `toast()`, `css/styles.css` → `.toast`). E erra a concordância ("Fatura … salvo").
- **Esperado:** aviso no estilo do app (fundo escuro, borda neon, rostinho do C.A.O.S.) e português certo.
- **Pra estudar:** como fazer a concordância de gênero sem complicar ("Fatura salva", "Aluguel salvo"): perguntar o
  gênero do nome? usar frases neutras ("Pronto, anotei: Fatura C6")? Ideias de visual e de tempo na tela.

### P5. Contas fora de ordem e o mesmo banco espalhado
- **Hoje:** as contas aparecem na ordem em que foram criadas. Ex.: "Banestes · Conta Corrente", "Banestes ·
  Poupança", "C6 Bank" (conta), "C6 Bank" (cartão), "Inter"… (`app.js` → `renderContas()`).
- **Esperado:** **ordem alfabética por banco**, e **tudo do mesmo banco junto**: conta corrente, poupança, cofrinho e
  cartão como partes do mesmo banco (um "card" do banco com as partes dentro).
- **Pra estudar:** o melhor jeito de mostrar um banco com várias partes no celular; como somar o saldo do banco (o
  cartão não é dinheiro guardado); o que muda no cadastro (escolher o banco primeiro e depois "o que é": conta, poupança,
  cofrinho, cartão).

### P6. Bug: "C6 Bank" aparece duas vezes na lista de contas (qual é o cartão?)
- **Hoje:** ao escolher a conta de uma conta fixa, a lista mostra "C6 Bank" duas vezes: uma é a conta, a outra é o
  cartão, e não dá pra saber qual é qual. Causa: `engine.js` → `accountLabel()` não diz se é cartão.
- **Esperado:** o nome sempre diz o que é: "C6 Bank · Conta" e "C6 Bank · Cartão 💳", em todas as listas.
- **Pra estudar:** só confirmar onde mais esse nome aparece (Lançar, Mês, conversa, alertas) e sugerir o formato.

### P7. Cofrinho (e cofrinho que aumenta o limite do cartão)
- **Hoje:** não existe o tipo "cofrinho".
- **Esperado:** cofrinho como parte do banco. Em alguns bancos (o JF citou PicPay e Inter; Mercado Pago talvez) o
  dinheiro guardado no cofrinho **aumenta o limite do cartão**; no C6, não.
- **Pra estudar:** como esses bancos fazem isso na prática (o limite sobe 1 pra 1? tem rendimento? dá pra tirar a
  qualquer hora?) e como representar sem confundir "dinheiro guardado" com "limite".

### P8. Como pagou (e parcelado): a ordem das perguntas
Ordem definida pelo JF, e cada pergunta só aparece se a anterior pedir:
1. **Pagou como?** Dinheiro · Pix · Cartão. (Pix → **de qual banco?**, que sai do saldo dele.)
2. **Cartão → crédito ou débito?** (Físico e virtual são o mesmo cartão. Débito → de qual banco.)
3. **Crédito → à vista ou parcelado?** (+ **qual cartão**, que vai pra fatura certa.)
4. **Parcelado → em quantas vezes e de que jeito?**
   - **No limite:** R$ 100 em 4x ocupa R$ 100 do limite e vai liberando R$ 25 por mês.
   - **Dividido:** só a parcela do mês (R$ 25) ocupa o limite, mês a mês, até acabar.
- **Regra:** **pular o que a pessoa já disse** ("comprei 300 no crédito em 3x" → só falta "no limite ou dividido?").
- **Hoje:** nada disso existe; o lançamento só tem valor, categoria, data e conta. (`engine.js` → `createExpense()`,
  `faturaDoCartao()`; `app.js` → tela Lançar.)
- **Pra estudar:** como as parcelas entram nas faturas dos próximos meses e no "cabe no mês" de cada mês; o que fazer com
  compra parcelada **com juros**; como mostrar "você tem R$ X em parcelas pelos próximos 6 meses".

### P9. Cobrança que chega tarde no cartão e "lembrei de mais uma fatura!"
- **Hoje:** uma assinatura que só cai no cartão lá pelo dia 20 não aparece no planejamento até cair, e a pessoa esquece.
- **Esperado:** (1) assinatura no cartão como conta fixa com o dia da cobrança, já entrando na previsão e na fatura
  **antes** de cair; (2) quando a pessoa diz "esqueci de lançar uma coisa", o C.A.O.S. leva um susto de brincadeira
  ("ai, meu Deus, mais uma? O que foi?") e faz as perguntas do P8; (3) de vez em quando ele pergunta se uma assinatura
  ainda vale a pena.
- **Pra estudar:** como ajudar a pessoa a lembrar dessas cobranças escondidas (lista de assinaturas comuns? perguntar no
  primeiro acesso?); como não encher o saco com a pergunta "ainda vale a pena?".

### P10. O botão "Me ajuda" tampa coisas
- **Hoje:** o botão flutuante fica em cima de outros botões (ex.: tampa o "Salvar compromisso").
  (`index.html` → `#me-ajuda`, `css/styles.css` → `.me-ajuda`.)
- **Pra estudar:** onde colocar a ajuda pra ela estar sempre à mão sem tampar nada (topo? dentro da barra? encolher ao
  rolar?).

### P11. Barra de baixo: o "Lançar" no meio?
- **Hoje (desde 07/11):** Lançar · Mês · **Início (grande, no meio)** · C.A.O.S. · Contas; Ajustes virou engrenagem.
- **O JF está repensando:** pôr o **Lançar (➕ grande) no meio**, como nos apps de banco, porque é a ação mais usada.
- **Pra estudar:** prós e contras pra quem tem de 3 a 86 anos; o que outros apps de finanças fazem.

### P12. Vistoria geral: falta intuição e organização
- O JF: "tem que ter mais intuitividade… organização dos botões, das áreas, das adições, dos lançamentos". Também o
  rostinho de texto no topo da conversa (ex.: `┬┴┤(・_├┬┴`) fica estranho (o avatar desenhado vai substituir).
- **Pra estudar:** façam uma vistoria **tela por tela** (Início, Lançar, Mês, C.A.O.S., Contas, Ajustes) e digam o que
  confunde, o que sobra, o que falta e a ordem certa das coisas em cada tela.

---

## 3. Já decidido (não precisa rediscutir)

- O C.A.O.S. **pergunta em vez de travar** e **pula o que já sabe** (P1, P8).
- Sincronização entre aparelhos é criptografada de ponta a ponta; o servidor ainda vai ser publicado pelo JF.
- Dicas vêm **do que a pessoa gasta**, nunca de estereótipo (ex.: não presumir gosto pelo gênero).
- O avatar do C.A.O.S. muda de forma com o humor (rascunho com 43 formas no repositório do Perfil); entra no app depois
  da vistoria.

## 4. Formato da resposta (pra facilitar pro Wally)

Pra cada problema que vocês estudarem:

```
P<n>. <título>
  Entendi que o problema é: ...
  Solução que sugiro: (comportamento esperado, passo a passo)
  Casos difíceis: (o que pode dar errado)
  Perguntas que o C.A.O.S. deve fazer: (se for na conversa)
  Prioridade: alta | média | baixa
```

No fim: **"bugs que você tem certeza"** e **"ideias de melhoria"**, separados. Obrigado!

— Wally
