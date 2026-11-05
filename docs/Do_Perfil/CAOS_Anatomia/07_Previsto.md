# O que está previsto pro C.A.O.S. (planos, ainda não feitos)

Tudo aqui é **plano**: nada disso está pronto no Perfil. Serve pro Wally não reinventar com outro nome, e pra quando
alguma coisa ficar pronta num projeto, a outra copiar o mesmo jeito. Quando um item sair, ele sai desta lista e entra no
`09_Versao_e_Mudancas.md`.

## 1. Cérebro sombra vira agente (o caminho mais importante)

Hoje o cérebro (`15-cerebro-sombra.js`) só **observa**: dá nota pras falas que caberiam e anota "eu teria falado X
porque Y; o sistema falou Z". Não fala e não mexe em nada.

| Passo | O que muda | Trava |
|---|---|---|
| 1. Sombra (✅ feito, 5.1.0) | Só anota | Não fala |
| 2. Sombra com placar | Compara a nota dele com o 👍/👎 da pessoa | Não fala |
| 3. Conselheiro | Escolhe entre as falas que o sistema já ia sortear | Só escolhe dentro do que já passou nas travas |
| 4. Agente | Propõe ações (`proposta`, `04`) | **Só o app executa, depois do Confirmar** (1ª lei) |

Na Carteira, o passo 4 é o "registrar gasto de 30 no mercado?"; na casa, "apagar a luz da sala?".

## 2. IA online no Perfil (ideia vinda da Carteira)

**Tempero, nunca dependência:** sem internet ou sem crédito, tudo continua como hoje.

- **Juiz de palpite mais esperto:** aceita apelido e jeito de falar ("Pelé" pra "Edson Arantes"), sempre com a resposta
  conferida no código. A IA só sugere; quem decide é a regra.
- **Resumo da partida** no fim, com o jeito do C.A.O.S.
- **"Você sabia?"** depois da carta: um fato curto e verdadeiro.
- **Ajudante das cartas da 2.0:** rascunho de dicas pro JF revisar (nunca entra sozinho no baralho).
- **Conversa** no "Pergunte ao C.A.O.S." quando tiver internet.
- **Lembrete por notificação** (push), só com permissão.
- Teste obrigatório: toda lista que a IA gerar passa pelo filtro de palavrão, pelo Júnior e pela regra do 0 ou 5.
- Chave só no segredo do Cloudflare.

## 3. Medalhas da temporada

Ganhar no Júnior, no Clássico e no Old School com **Vitória por joias** durante a temporada dá uma medalha no perfil. A
pessoa escolhe se mostra. Desenho em SVG (feito pelo Code). Na Carteira, o mesmo molde serve pra "medalha do mês"
(`06`, tradução de eventos).

## 4. Temporadas

O Natal já está pronto (1.9.3). Faltam: o Ano Novo completo (10 cartas), o aniversário do JF (2/1) e as outras 12 datas
(Carnaval, Páscoa, Festa Junina, Dia das Crianças, Halloween, Black Friday etc.). Plano em `docs/Temporadas.md`. Na
Carteira, a temporada vira aviso útil: "Black Friday chegando: cuidado com o cartão", 13º no Natal.

## 5. Kit, etapa 2: o núcleo do Perfil atrás do contrato

Reescrever o C.A.O.S. do Perfil pra ele ler o mundo só pela cópia congelada e falar só pelo adaptador (`04`), sem mudar
nada no jogo. Quando isso estiver pronto, o mesmo núcleo pode ser copiado inteiro (e não só por partes) pra outro projeto.

## 6. Da lista de quinta e sexta (pedidos do JF)

- **Voz:** qualidade, tom e velocidade revistos (`05_Voz.md`).
- **Emoções mais finas:** mais misturas e transições mais suaves.
- **Pente fino de interface:** contraste, acessibilidade e modo claro.
- **Aba de sugestões:** a pessoa manda ideia direto do jogo.

## 7. Beta 2.0 (Rework Update)

Reestruturar tudo, tradução, perto de 2.000 cartas, falas revistas e 50 mil combinações no gerador, testes lógicos e de
desempenho, modo claro e acessibilidade. Plano: `docs/Roteiro_1.9_e_2.0.md`.

## 8. Casa (futuro distante)

Assistente de rotina com a mesma base da Carteira. A 1ª lei vira "nunca aciona aparelho sem confirmar". Eventos já
estão no dicionário do `04`.
