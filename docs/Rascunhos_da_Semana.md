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
| 8 | Lançamento não pergunta **como pagou** | Forma de pagamento: dinheiro, Pix, débito, crédito; no crédito, **à vista ou parcelado em quantas vezes** → as parcelas viram lançamentos dos próximos meses (o C.A.O.S. enxerga o que vem pela frente, não só o mês atual). |
| 9 | **Botão "Me ajuda" tampa coisas** (ex.: o "Salvar compromisso") | Tirar o botão flutuante de cima do conteúdo: ir pro topo da tela ou encolher quando tem botão embaixo. |
| 10 | **Barra de baixo:** "o Lançar vai ter que ir pro meio" | Rever com o JF na quinta: **Lançar (➕ grande) no meio** e Início na ponta, como nos apps de banco. Recomendação do Wally: sim, o lançar é a ação mais usada. |
| 11 | Visual geral: **falta organização e intuitividade** (botões, áreas, adições, lançamentos) | Vistoria tela por tela (Início, Lançar, Mês, C.A.O.S., Contas, Ajustes) com a régua "uma pessoa de 3 a 86 anos entende sem explicação". Também: o rostinho de texto do topo da conversa (ex.: `┬┴┤(・_├┬┴`) fica estranho; o avatar desenhado resolve. |

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
