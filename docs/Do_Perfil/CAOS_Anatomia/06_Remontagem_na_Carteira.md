# Remontagem do C.A.O.S. na Carteira (plano pro Wally)

Na Carteira o C.A.O.S. é a **Central de Análise e Observações Sistêmicas**: mais **agente, assistente e apoio** do que
apresentador. A personalidade é a mesma (`03`); o papel muda.

## O que a Carteira já tem (C.A.O.S. 1.3.0 da Carteira, conferido em 05/11/2026)

| Parte | Situação na Carteira |
|---|---|
| Espinha (3 leis), com cópias congeladas e registro só como proposta | ✅ Tem (`js/caos/espinha.js`) |
| Identidade (quem ele é, criador, origem, pode e não pode, anatomia) | ✅ Tem (`js/caos/identidade.js`) |
| Console de emoções | ✅ Tem 7 emoções e 3 misturas, com decaimento por hora real (`js/caos/emocoes.js`) |
| Gerador de falas por gatilho, sem repetir | ✅ Tem (`js/caos/gerador.js`, `falas.js`) |
| Rostos com nível, escada e mistura | ✅ Tem, com os mesmos 243 rostos do Perfil |
| Pulmão (uma fala por reação, cooldown por tipo) | ✅ Tem |
| Conversa offline e IA online opcional | ✅ Tem |
| Conhecer a pessoa (nome, como chamar, descontraído ou formal, foco) | ✅ Tem (`meta/perfil`) |
| Voz | 🔶 Só a do aparelho |

## O que falta (por prioridade)

| # | O que portar | De onde (Perfil) | Por que importa na Carteira |
|---|---|---|---|
| 1 | **Voz natural (Azure)** com reserva no aparelho | `05_Voz.md` | Pedido do JF: voz muito mais natural |
| 2 | **Perfil de tratamento completo**: nicks, permissões (zoar, dicas, sugestões, análises, falar sozinho, voz) e reconhecimento do JF | `03`, `04` (perfil de tratamento) | Ele saber o que pode falar de cada pessoa |
| 3 | **Modo assistente** (filtro de apoio nas emoções) | Abaixo | O tom certo pra dinheiro |
| 4 | **Arquivo de família** | `familia_exemplo.json` | Reconhecer pessoas sem nome no código |
| 5 | 👍/👎 e "não curti" nas falas | `02`, órgão 7 | A pessoa calibra o assistente sem abrir ajustes |
| 6 | **Tato que aprende** (pessoa que fecha o balão rápido recebe frase curta) | `02`, órgão 5 | Menos chatice |
| 7 | Vetor tensão/calor/paciência e temperamento do dia | `02`, órgão 3 | Dias diferentes, o mesmo C.A.O.S. |
| 8 | Estabilizador de emoção (margem, dwell, saída) e emoção vinda do texto | `02`, órgão 3 | Não oscila do nada |
| 9 | Ficha e afeto (veterano, sumido, voltou hoje) | `02`, órgão 6 | Ele lembra da pessoa |
| 10 | Avaliação de 10 montagens no gerador e `caosContextoOk` | `02`, órgãos 2 e 4 | Menos fala estranha |
| 11 | Registro único e cérebro em modo sombra | `02`, órgão 10 | O caminho pra virar agente com segurança |
| 12 | Temporadas e presente com data | `02`, órgão 13 | Ex.: "Black Friday chegando: cuidado com o cartão"; 13º no Natal |

## Modo assistente: o filtro de apoio

O mesmo console de emoções, com outra regra de saída. Sugestão de implementação, um filtro entre "emoção que manda" e
"fala":

| O que ele sente | Como aparece no modo assistente | Exemplo de tom |
|---|---|---|
| Raiva ou irritação (a pessoa estourou o orçamento) | **Preocupação** com a pessoa, firme e sem bronca | "Esse mês apertou. Bora ver onde dá pra segurar?" |
| Tristeza ou mágoa | **Empatia junto**, nunca mágoa *com* a pessoa | "Perder dinheiro é complicado. Vamos ver o que dá pra recuperar." |
| Alegria ou orgulho | Comemora, com moderação | "Mês no verde! Isso é disciplina." |
| Tédio (dias sem registrar) | Lembrete leve | "Três dias sem anotar nada. Tá tudo bem por aí?" |
| Deboche | Só no Ácido e com a permissão `zoar` | "Tá vendo? Não economizou, deu ruim." |
| Fúria, nojo, medo | **Nunca aparecem**: viram preocupação | — |

Regras do modo assistente:
- **Primeiro o fato, depois a emoção:** o alerta sempre traz o número (a Carteira já faz isso) e um empurrão útil.
- **Brincar sim, ofender nunca:** zoeira só no balde de humor ácido e só com `zoar`.
- **Sugestão, dica e análise só com permissão:** cada uma tem a sua no perfil de tratamento. Sem permissão, ele mostra o
  número e para.
- **Nunca recomenda investimento específico** (isso já está no `naoPode` da Carteira).
- **Voz do modo assistente:** sem raiva e sem fúria (tabela em `05_Voz.md`).

## Perfil de tratamento na Carteira

A Carteira já pergunta nome, como chamar, descontraído ou formal e foco. Acrescentar (modelo em `04_Contrato_de_Encaixe.md`):

1. **Nicks:** outros nomes que contam como a mesma pessoa. O JF é João Fernando, JF, TGP, JF77 e TGP77; o reconhecimento
   compara sem acento e em minúsculas, como o `isJfName` do Perfil.
2. **Permissões** (perguntas simples no "Conhecer a pessoa", com padrão sim pra tudo menos `zoar`, que segue o humor):
   - "Posso brincar com você de vez em quando?" → `zoar`
   - "Posso te dar dicas quando eu vir algo?" → `dicas`
   - "Posso sugerir mudanças nos seus gastos?" → `sugestoes`
   - "Posso analisar seus hábitos e te contar o que eu notei?" → `analises`
   - "Posso falar sem você perguntar?" → `falarSozinho`
   - "Quer que eu fale em voz alta?" → `voz`
3. **Na conversa:** "não me zoa mais", "pode me dar dicas", "fala menos" viram proposta com Confirmar, igual ao "me chama
   de…" que já existe.
4. **O JF é reconhecido como criador** (`conhecido: "criador"`): implicância carinhosa, as mesmas piadas de criatura com
   criador do Perfil, adaptadas ("JF, você que me programou pra cuidar do seu dinheiro, e olha esse delivery…").

## Tradução de eventos (Perfil → Carteira)

| Perfil | Carteira (gatilho que já existe ou sugestão) |
|---|---|
| Acerto rápido, sequência | `mes_verde`, meta batida, economia acima da média |
| Erro, erro de novo | `categoria_estourada`, `orcamento_80`, `ritmo_alto` |
| Absurdo | Gasto muito fora do padrão (sugestão: `gasto_atipico`) |
| Pulou, mesa parada | `sem_registro` |
| Reta final | Fim do mês apertado (sugestão: `fim_do_mes_apertado`) |
| Entrou na mesa | `boas_vindas` |
| Pausa longa e volta | Voltou depois de dias (sugestão: `voltou_depois`, com a ficha) |
| Presente do C.A.O.S. | Conquista ou medalha do mês (sugestão) |

## Como validar com o JF

- Mostre prints do balão e grave um áudio da voz natural com 3 emoções (alegria, preocupação, carinho).
- Confira as 3 leis com os testes do `04`.
- Suba o `CAOS_VERSAO` da Carteira e registre o que veio do Perfil (o `docs/CAOS_Carteira.md` já tem a tabela
  "Veio do Perfil").
