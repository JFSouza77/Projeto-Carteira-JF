# Auditoria do Gemini (16/11/2026): o que foi conferido e o que entrou

O JF mandou os 14 arquivos do cérebro do C.A.O.S. pro Gemini. Cada achado foi conferido no código (rodando a frase ou
lendo a função) antes de mexer. Versão depois: app 2.1.2 · C.A.O.S. 2.3.6.

## Bugs: veredito

| Achado | Veredito | O que foi feito |
| --- | --- | --- |
| Gerador: o balde do contexto (Ácido, criador) travava e o "geral" tomava conta ("bug do Rivotril") | **Confirmado** | 2ª volta respeita a ordem (contexto antes do geral) e a janela conta só os baldes ativos. Ácido: de 43 pra 53 respostas com zoeira em 60 |
| Corretor trocava gosto/gato/mesa/maio/parar/home | **Confirmado** | Palavras entraram em CONHECIDAS; palavra de 4 letras só ganha a letra que faltou ("sado" → "saldo"). Subir o mínimo pra 5 letras, como sugerido, quebrava "sado" |
| Parênteses no limite investido | **Confirmado** (efeito real: "como guardo… limite" ia pro lugar errado) | Parênteses e sem "guard/como/banco" soltos |
| Nome no silêncio, banco em minúscula, ordem com o prefixo | **Confirmado** | Sem nome no silêncio e quando tem reação de apelido/palavrão; só palavra comum vira minúscula |
| Jogo em Lazer depois da categoria Jogos | **Confirmado** | SINONIMOS.jogos (sem a categoria, continua em Lazer) |
| VP, UC, jades e fragmentos | **Confirmado** ("980 jades por 75" anotava R$ 980) | Chaves e regex |
| Entrada prevista: dia de hoje, dia 31, "na sexta" | **Confirmado** | Hoje é hoje; último dia do mês; próxima sexta |
| maluco/doido como adjetivo virava apelido | **Confirmado** | Só vocativo |
| Emoção no Suave (intensidade) | Plausível, efeito pequeno (só o tamanho do rosto) | Fica pra depois |
| Humor na IA (criança/formal recebiam Ácido; criador no Suave com prompt contraditório) | **Confirmado** | `humorParaIA` no app; servidor força Ácido pro criador |
| `fluxoMeta` × `metaFlow` | **Confirmado** (atalhos apareciam no meio da meta) | Nome certo |
| Cache e fila com o texto cru | **Confirmado** | Usam o texto que vai pra IA e o humor |
| Vários gastos de um print: só os eventos do último | **Confirmado** | Junta os eventos de todos |
| Notícias: pausa da busca e turno marcado antes | **Confirmado** | Continua a busca pausada; sem notícia, tenta de novo em 1 h |
| `image/jpeg` fixo | **Não procede** | O app sempre converte a foto pra JPEG antes de mandar |
| Voz lendo `{nome}` e `**` | **Confirmado** | Troca o nome e tira os asteriscos antes de falar |
| Dia vira às 21h no servidor | **Confirmado** pra data do comprovante | Data de Brasília no prompt da foto (limites continuam no dia UTC) |
| Foto de comprovante sem conta/forma | Procede | Fica pra depois (precisa pensar o fluxo com o JF) |
| Doc desatualizado / `pareceCriador` sem uso | Procede | Doc atualizado; `pareceCriador` fica (usado em teste, reservado) |
| **Achado do Wally na conferência:** "já paguei a fatura do C6" anotava R$ 6 | **Bug** | Nome de banco com número (C6, 99, BS2, B3, N26) não vira valor |

## Funções que faltavam (sugestão do Gemini)

| Ideia | Veredito |
| --- | --- |
| "errei, foi 45, não 50" corrige o último gasto | **Entrou** (`corrigir_valor`, com Confirmar) |
| "transferi 200 do Inter pro C6" | **Entrou** (`registrar_transferencia`, com Confirmar) |
| "quanto gastei de Uber?" separa pela descrição | **Entrou** ("Só de uber: R$ X") |
| "já paguei a fatura" / "o João me pagou" dá baixa | Depois (precisa mexer em compromisso e racha) |
| Aperto sem palavrão ("tô liso") fica no celular | **Entrou** (`aperto`: acolhe + números do mês, sem gastar IA) |

## Economia de crédito (sugestões)

| Ideia | Veredito |
| --- | --- |
| Sem ferramenta de busca no papo pessoal | **Entrou** (`semBusca`) |
| Modelo mais barato na conversa | Já existe uma configuração só pra conversa, separada da leitura de foto. Trocar por um ainda mais barato fica com o JF (a personalidade pode perder graça) |
| Prompt caching | Não compensa agora: o texto fixo é menor que o mínimo do cache |
| Resumo compacto em texto | Depois (economia pequena; o JSON já é curto) |

## Personalidade (ideias do Gemini, pro JF decidir)

Tangentes de "TDAH", dois balões seguidos, emoção do momento indo pra IA online, alerta do "efeito formiguinha",
pergunta curiosa depois do gasto, reação ao "hiperfoco". Jeito de ser é característica dele: o que entrar vai pro
núcleo, com o ok do JF, nos dois projetos.

## 2º relatório do Gemini (16/11): conferido, nada pra mudar

| Achado | Veredito (frase rodada no código) |
| --- | --- |
| `explicar_print` pegando "não entendi como ponho orçamento" | Não procede: cai em `tutorial`; "não entendi a fatura" vai pro print, que é o certo |
| `cabe` engolindo "quanto sobra do meu orçamento de mercado?" | Não procede: cai em `orcamento`, categoria Mercado |
| "uber 30", "50 no posto" sem verbo | Não procede: já vira gasto (desde 14/11) |
| Gírias cc, vr, va | Já existem. "cc" vira cartão e ele pergunta crédito ou débito, de propósito: "cc" também é "conta corrente" |
| Ritmo alto falso no começo do mês | Não procede: o radar só avisa a partir do dia 5 e tira as contas fixas da média (sugestão do próprio Gemini em 06/11) |
| Rosto de preocupado quando xinga no Suave | Não procede: sai calmo |
| Piadas de começo e fim de mês | Já existem (baldes `inicioDoMes` e `fimDoMes` na piada) |
