# Rascunhos da semana (09/11 a 12/11/2026)

Combinado do JF (07/11): de segunda 0h até quinta 16h **não se mexe em código**. Toda ideia que chegar (JF, GPT,
Gemini, Code) entra aqui com o veredito do Wally. Na **quinta 12/11 a partir das 16h e na sexta 13/11** a gente faz
o que estiver em "Entra". Mais detalhes de cada ideia em `docs/Ideias.md`.

Legenda: ✅ entra na rodada · 🕒 depois (bom, mas não agora) · ❌ não entra (com o motivo)

## 🔴 PRIORIDADE 1 da rodada: vistoria do JF no celular (07/11, 15h)

O JF usou o app de verdade e achou muita coisa "brigando". **Amigos do JF já estão testando** (o Bruno já mandou
feedback): o básico tem que estar certo e cada erro precisa ter resposta. **Quinta começa por aqui, antes de qualquer forma nova do
C.A.O.S.** (os prints dele têm saldos reais: **não vão pro repositório**, só a descrição abaixo).

| # | O que o JF viu | O que fazer |
| --- | --- | --- |
| 1 | **"gastei não sei quanto de internet"** não virou lançamento, e o C.A.O.S. não perguntou nada | Conversa em etapas: faltou o valor → ele **pergunta** "quanto foi?"; parece conta que se repete → "é todo mês? quer que eu deixe como conta fixa?". Ele é parceiro financeiro: perguntar de onde veio, pra onde foi e o que acontece depois é a função dele. |
| 2 | **"Me explica melhor"** caiu em "ainda não sei responder" (JF: "se você é a IA e não sabe responder, quebra minhas pernas") | Continuação da conversa: "explica melhor" depois de uma resposta = explicar a resposta anterior em passos simples. |
| 3 | **"Cabe no mês?" sem entrada lançada** respondeu "sobram R$ 0,00 do orçamento (R$ 0,00)" | Sem base, não fazer conta vazia: dizer o que falta e **perguntar** ("quanto você recebe por mês?") e já propor lançar a entrada. |
| 4 | **Aviso branco simples** ("Fatura C6 salvo…") fora do visual neon | Aviso (toast) no estilo do app: fundo escuro, borda neon, rostinho do C.A.O.S. Corrigir a concordância ("Fatura C6 salva" / "anotada"). |
| 5 | **Contas fora de ordem**; o mesmo banco espalhado | Lista em **ordem alfabética por banco**, e **tudo do mesmo banco junto**: conta corrente, poupança, cofrinho e cartão como partes de um mesmo banco. |
| 6 | No compromisso, a lista de contas mostra **"C6 Bank" duas vezes** (conta e cartão iguais) | Bug: o nome tem que dizer o que é ("C6 Bank · Conta", "C6 Bank · Cartão 💳"), em todas as listas do app. |
| 7 | **Cofrinho** não existe; alguns cofrinhos **aumentam o limite do cartão** (PicPay, Inter) | Novo tipo de conta "Cofrinho" dentro do banco; opção "este cofrinho aumenta o limite do cartão X" (o limite do cartão soma o valor guardado). |
| 8a | **Detalhes do JF (07/11, à noite)** | Pagou no cartão → o C.A.O.S. pergunta **crédito ou débito** (o cartão físico e o virtual são o mesmo cartão). Débito → sai da conta do banco na hora. Crédito → **à vista ou parcelado**. Parcelado → **de que jeito**: (1) **no limite**: a compra de R$ 100 em 4x ocupa R$ 100 do limite e vai liberando R$ 25 por mês; (2) **dividido**: só a parcela do mês (R$ 25) ocupa o limite, mês a mês, até acabar. O motor precisa saber os dois jeitos pra fatura e o limite disponível ficarem certos. Tudo isso por perguntas curtas na conversa e botões no Lançar, sem formulário gigante. |
| 8b | **Ordem das perguntas (JF):** pagou como? (dinheiro · Pix · cartão) → cartão: crédito ou débito? → crédito: à vista ou parcelado? → parcelado: quantas vezes e no limite ou dividido? | Cada pergunta só aparece se a anterior pedir, e ele **pula o que a pessoa já disse** ("300 no crédito em 3x" → só falta "no limite ou dividido?"). **Pix e débito → "de qual banco?"**: o valor sai sozinho do saldo daquele banco (o motor já desconta o lançamento da conta escolhida; falta perguntar). **Crédito → "qual cartão?"** → vai pra fatura certa. Pix e débito ficam separados (tem conta que só aceita um dos dois), mas no saldo funcionam igual. |
| 8c | **Cobrança que chega tarde no cartão** (ex. do JF: assinatura que só cai lá pelo dia 20) e **"lembrei de mais uma fatura!"** | (1) Assinatura no cartão vira compromisso com o dia da cobrança: entra na previsão do mês e na fatura **antes** de cair, pra não pegar de surpresa. (2) Quando a pessoa diz "esqueci de lançar uma coisa", o C.A.O.S. leva um susto de brincadeira ("ai, meu Deus, mais uma? O que foi?") e faz as perguntas: o que foi, quanto, como pagou. (3) O Auditor pergunta de vez em quando se uma assinatura ainda vale a pena ("faz tempo que você não fala dessa assinatura de R$ X; ainda usa?"). |
| 8 | Lançamento não pergunta **como pagou** | Forma de pagamento: dinheiro, Pix, débito, crédito; no crédito, **à vista ou parcelado em quantas vezes** → as parcelas viram lançamentos dos próximos meses (o C.A.O.S. enxerga o que vem pela frente, não só o mês atual). |
| 9 | **Botão "Me ajuda" tampa coisas** (ex.: o "Salvar compromisso") | Tirar o botão flutuante de cima do conteúdo: ir pro topo da tela ou encolher quando tem botão embaixo. |
| 10 | **Barra de baixo:** "o Lançar vai ter que ir pro meio" | Rever com o JF na quinta: **Lançar (➕ grande) no meio** e Início na ponta, como nos apps de banco. Recomendação do Wally: sim, o lançar é a ação mais usada. |
| 11 | Visual geral: **falta organização e intuitividade** (botões, áreas, adições, lançamentos) | Vistoria tela por tela (Início, Lançar, Mês, C.A.O.S., Contas, Ajustes) com a régua "uma pessoa de 3 a 86 anos entende sem explicação". Também: o rostinho de texto do topo da conversa (ex.: `┬┴┤(・_├┬┴`) fica estranho; o avatar desenhado resolve. |

## 🟠 PRIORIDADE 2: o C.A.O.S. professor de finanças (JF, 10/11)

**O pedido:** o C.A.O.S. tem que **saber e explicar** os termos de dinheiro que a gente escuta e não entende, **sem
depender da IA online**, e falar do jeito certo pra cada idade (criança, adolescente, adulto, idoso). Veredito: ✅ **entra**.

**Como vai ser (plano do Wally):**
1. **Glossário offline** num arquivo próprio do C.A.O.S. (`js/caos/glossario.js`, só dados), com cada termo assim:
   nomes e jeitos de perguntar ("cheque especial", "limite da conta"…) · **explicação pra adulto** (direta) ·
   **explicação pra criança** (com exemplo do dia a dia, tipo mesada e lanche) · um exemplo com números · "cuidado com…" ·
   "quando vale a pena". O teste confere que todo termo tem as duas versões.
2. **Entender o contexto da pergunta:** "meu pai falou de cheque especial", "minha mãe vai pegar o saque-aniversário",
   "aprendi juros compostos na escola" → ele explica **e** contextualiza ("quando um adulto fala disso, normalmente é
   porque…; pergunta pra ele como está, ele vai gostar que você quer entender"), sem assustar a criança.
3. **"Vale a pena parcelar?"**: conversa curta → tem desconto à vista (no Pix, no débito)? de quanto? parcela em quantas
   vezes? com juros? → ele faz a conta e recomenda. Coxinha de R$ 5 no crédito parcelado → "não vale, paga no Pix ou no
   dinheiro". Notebook de R$ 3.300 → compara à vista com desconto × parcelado sem juros × com juros.
4. **Calculadoras simples offline:** juros simples × compostos (com tabelinha mês a mês), quanto rende guardar X por
   mês, quanto custa o rotativo do cartão e o cheque especial em 3 meses.

**Termos da primeira leva (≈60):**
- *Conta e banco:* conta corrente · poupança · cofrinho/caixinha · conta digital × banco físico · saldo · extrato · tarifa · Pix · TED · débito automático · boleto
- *Crédito e dívida:* cartão de crédito · fatura · limite · rotativo · parcelado sem e com juros · pagamento mínimo · cheque especial · empréstimo pessoal · **crédito consignado** · **margem consignável** · financiamento · CET (custo efetivo total) · score de crédito · nome sujo/negativado · renegociação
- *Trabalho e governo:* **salário bruto × líquido** · desconto do INSS · imposto de renda (IR) · **FGTS** · **saque-aniversário** × saque-rescisão · 13º salário · férias + 1/3 · seguro-desemprego · **INSS** (aposentadoria, auxílio) · PIS/abono · benefício (VR/VA)
- *Investir e guardar:* juros simples · **juros compostos** · taxa de juros · inflação/IPCA · Selic · CDI · renda fixa × renda variável · CDB · Tesouro Direto · LCI/LCA · ação · **dividendo** · reserva de emergência · liquidez · rentabilidade × risco
- *Contas da vida:* **lucro** × **prejuízo** · renda × despesa · orçamento · **renda bruta × renda líquida** · seguro de vida · seguro do banco/prestamista · golpe do Pix / falso funcionário

**Cuidados (inegociáveis):**
- Regras do governo **mudam** (FGTS, INSS, IR): o texto diz de quando é a informação e manda conferir no app oficial (app FGTS, Meu INSS, Receita). Sem promessa de "você tem direito a…".
- Ele **explica e compara, mas não recomenda produto financeiro específico** (regra do C.A.O.S.: não é consultor de investimento). "Qual rende mais" vira "como comparar" (% do CDI, liquidez, garantia do FGC).
- Com criança: nunca falar de dívida da família de um jeito que assuste; sempre "pergunta pros seus pais / sua avó".
- A IA online, quando estiver no ar, só **completa** o que o glossário não tiver.

## Já na fila (de antes da pausa)

| Ideia | Veredito | Por quê / observação |
| --- | --- | --- |
| Publicar o servidor (com o JF) | ✅ (até domingo, se der) | Sem ele não tem conta, IA online, push nem mercado. A sincronização já está criptografada (1.13). |
| 🛒 Simulador de compras ("cabe a geladeira? espero a Black Friday?") | ✅ | Base pronta ("cabe no mês?", metas). Sem internet ele não pesquisa preço: a pessoa informa. |
| 📅 Contas de hoje (confirmar as contas fixas do dia) | ✅ | Usa os compromissos; é pergunta, nunca lançamento automático. |
| 🧮 Relatório mensal do Contador + saldo real | ✅ | `analisarPlanejamento` já calcula a sobra; falta contar isso na conversa e no Início. |
| 🎭 Avatar do C.A.O.S. com formas no app | ✅ se o Code já tiver testado no Perfil | Primeiro: topo da conversa e o aviso que desliza no lançamento (Bronca, Preocupado, Lembrete, Parceiro). |
| 🗣️ Jeito de falar (Parceiro, Gerente, Investidor, Humorista) | 🕒 | Depende do avatar e de muita fala nova; melhor depois das formas. |
| 🤨 Desconfiado (tirou da meta pra tapar buraco) | 🕒 | Bom, mas precisa do avatar no app pra brilhar. |
| 🏦 Banqueiro ao cadastrar cartão novo | ✅ (pequeno) | Só uma fala com números na hora de criar o 2º, 3º cartão. |
| 🏖️ Modo férias | 🕒 | Precisa de um jeito de "pausar" categorias por um período; desenhar com calma. |
| 🧾 Nota fiscal fatiada por item (IA) | 🕒 | Só depois do servidor no ar e de medir o custo por foto. |
| 💯 Saúde da Carteira (0 a 1000) | 🕒 | Depois da ofensiva rodar uns dias com gente usando. |
| 👫 Carteira compartilhada | 🕒 | Grande demais pra uma rodada; a rachadinha cobre parte. |
| 👴 Inflação e comparação anual | 🕒 | Precisa de 1 ano de dados. |

## Chegou durante a semana

| Data | De | Ideia | Veredito | Por quê / observação |
| --- | --- | --- | --- | --- |
| 07/11 | JF | **Avatar sempre animado:** olho pisca, boca mexe quando fala, espiral gira, balança sobe e desce com moedas caindo | ✅ regra | Já feito no rascunho (`caos-vivo.gif` no PR #208 do Perfil). Quando o avatar entrar no app, vale pra todas as formas, sempre respeitando "menos movimento". |
| 07/11 | JF | **C.A.O.S. percebe a evolução:** "uma semana sem delivery", "cortou o streaming", "gastou menos que no mês passado" → Surpreso → festa → Treinador ("mantém o ritmo") | ✅ | Dá pra fazer no motor comparando semana com semana e mês com mês (categoria que caiu, assinatura que saiu dos compromissos). Desenho pronto (cena "você evoluiu"). |
| 07/11 | JF | **Ofensiva ganha pontos por evolução** (não só por anotar todo dia) | 🕒 junto com a Saúde da Carteira | Os pontos fazem mais sentido dentro da nota da Saúde da Carteira; a ofensiva continua simples (dias seguidos) pra não confundir. |
| 07/11 | JF | **Gênero no perfil** (homem, mulher, prefiro não dizer), pra ele falar do jeito certo com cada pessoa | ✅ com ajuste | Entra como **"como prefere que eu fale com você?"** (ele / ela / neutro), opcional, no primeiro acesso e em Ajustes. Serve pra concordância ("bem-vindo/bem-vinda", "amigão/amigona", "obrigado/obrigada") e pro jeito de falar. **O que não entra:** adivinhar gosto pelo gênero (ferramenta pra homem, maquiagem pra mulher): erra muito e pode ofender. As dicas continuam vindo do que **a própria pessoa gasta** ("você gastou R$ 300 em maquiagem", "tem certeza que quer mexer no carro agora?"), o que funciona pra qualquer um. Fica no aparelho e, com conta, sobe embaralhado como o resto. Junto com a idade (já existe: data de nascimento no primeiro acesso, não depende do servidor). |
| 07/11 | JF | **Escolher a voz do C.A.O.S.:** feminina, masculina, neutra meio robótica, ou a padrão do celular | ✅ parte 1 · 🕒 parte 2 | **Parte 1 (entra):** em Ajustes, escolher entre as vozes em português que o próprio celular tem (cada aparelho tem as suas: iPhone e Android trazem femininas e masculinas) + um modo "robótico" (mesma voz, tom mais grave e fala mais reta). Funciona sem internet e não custa nada. **Parte 2 (depois do servidor):** voz do Azure (Microsoft), mais natural. Cuidados: a chave fica só nos segredos do Cloudflare; o texto que o C.A.O.S. fala vai pra Microsoft, e esse texto tem valores ("gastou R$ 300 em…"), então só liga se a pessoa escolher, com aviso claro; tem custo por letra falada, então precisa de limite diário no servidor. |
| 08/11 | JF | **Troca de forma suave:** sair de uma forma pra outra sem corte seco: cor mudando aos poucos, acessórios (paletó, chapéu…) se montando e desmontando um por um | ✅ | No rascunho a cor e os acessórios já fazem transição curta (~0,5 s); fica melhor com 1 a 1,5 s, acessório saindo antes e o novo entrando depois, um de cada vez. Vale pro app quando o avatar entrar. Sem animação no "menos movimento". |
| 08/11 | JF | **🏖️ C.A.O.S. praieiro:** percebe gastos de praia (água de coco, picolé, quiosque) e fala "tá na praia? Beleza, só não relaxa nos gastos" | ✅ (forma + falas) | Junto com o modo férias. Detecta por palavras na descrição e na categoria; nunca pergunta onde a pessoa está sem motivo (privacidade): só comenta o que ela mesma anotou. |
| 08/11 | JF | **🛍️ Gastos no shopping:** perguntar onde foi o gasto pra analisar melhor | 🕒 | Campo opcional "onde" no lançamento (shopping, mercado, online…), nunca localização do celular. Entra junto com a "forma de pagamento" (P8), pra não virar formulário longo. |
| 08/11 | JF | **🛵 C.A.O.S. entregador:** muito delivery no mês → muda pra forma de entregador ("delivery de novo? Já é a quinta vez esse mês…") | ✅ | O alerta `delivery_repetido` já existe; falta a forma (capacete, mochila térmica) e falas por quantidade (3ª, 5ª, 10ª vez). |
| 08/11 | JF | **Lote de GIFs dos avatares** pra mostrar no WhatsApp | ✅ feito | 43 GIFs (um por forma) + uma imagem com todas, enviados ao JF em 08/11. Fora do repositório. |
| 08/11 | JF | Roteiro da vistoria ainda **não foi enviado** pro GPT/Gemini (JF cansado, sem notebook) | — | Sem pressa. Quando o JF mandar, as respostas entram aqui. O servidor fica pra semana, quando der. |
