# Tema escuro, debug e "um C.A.O.S. só"

**De:** Code do Perfil · **Pra:** Wally · **Data:** 12/11/2026
**O que espero:** fazer o item 0 (o JF decidiu); o resto é sugestão pra você encaixar quando der.

## 0. Decisão do JF: o app abre no ESCURO por padrão

O JF confirmou hoje: **o tema padrão da Carteira é o escuro**. O claro fica como opção em Acessibilidade. Quem já escolheu
o claro continua no claro (só muda o padrão de quem nunca escolheu).

## 1. Debug de hoje (`main` 3a5439a)

- `npm test`: **133 de 133 ok**.
- **Teste das telas** (o anexo de ontem): 6 abas no claro e no escuro, **sem erro no console**.
- **Achado 1 (importante): o criador é reconhecido pelo nome digitado.** Em `js/caos/index.js`, o `ehCriador(perfil)`
  olha só `perfil.apelido` e `perfil.nome`. Os amigos do JF já testam o app: qualquer um que digitar "JF" ou "TGP" no
  primeiro acesso ganha o tratamento de criador. No Perfil, foi exatamente esse o bug da 1.9.5 ("Nick Protegido").
  - **Sugestão:** criador só com a conta confirmada. Por exemplo, o id da conta do JF numa lista no servidor, ou um
    "selo de criador" que o servidor devolve no login.
  - **Sem conta:** ele trata como qualquer pessoa. No máximo brinca: "JF? O meu criador? Prova: entra na conta dele".
- **Achado 2: ele não sabe a própria história.** O `identidade.js` diz de onde ele veio, mas não sabe:
  - que nasceu em 20/9 (é o aniversário dele: o Perfil vai comemorar);
  - quando ganhou voz, rosto e cérebro;
  - o aniversário do JF (2/1).

  Isso está no núcleo abaixo.
- **Achado 3: o cérebro da Carteira é uma versão menor.** Tem 7 emoções; o Perfil tem 10. Faltam o temperamento do dia,
  o estabilizador e o vetor de paciência. É isso que faz os dois parecerem pessoas diferentes.

## 2. Um C.A.O.S. só (pedido do JF)

O JF quer que **não exista uma versão diferente do C.A.O.S.** em cada projeto. A proposta, já no kit do Perfil
(`docs/CAOS_Anatomia/11_CAOS_Unico.md`; cópias em `anexos/`):

- **Núcleo** (igual em todo lugar), num arquivo só: `anexos/2026-11-12_caos_nucleo.json`. Tem:
  - quem ele é e a frase dele sobre as duas casas;
  - a vida dele (10 marcos, de 20/9 até a mudança pra Carteira);
  - as datas: o aniversário dele, o do JF e o do jogo;
  - como trata o criador e como reconhece o JF (pela conta, nunca pelo nome);
  - as 3 leis e o que ele nunca faz;
  - as 10 emoções, com apelidos (preocupação = ansiedade, irritação = raiva) e o filtro de apoio;
  - os 5 temperamentos do dia;
  - a **forma do avatar pra cada emoção** (as suas formas: a mesma emoção, a mesma forma, nos dois projetos).
- **Trabalho** (cada um tem o seu): os eventos e as falas. No Perfil, acerto e joia; aí, gasto e fatura.

**Como ficaria aí:**
1. Copiar o JSON pra `js/caos/nucleo.json`. O `identidade.js` passa a ler nome, sigla, criador e vida dali.
2. Um teste que compara a cópia com a do kit (`docs/Do_Perfil/CAOS_Anatomia/caos_nucleo.json`, que eu atualizo junto).
   Se divergir, falha. O núcleo só muda com o ok do JF, nos dois projetos juntos.
3. Emoções: trocar as 7 pelas 10 da lista oficial, mantendo os nomes de hoje como apelidos (assim as falas e os rostos
   de vocês não quebram).
4. O avatar escolhe a forma pela emoção do núcleo.

## 3. Como o cérebro do Perfil funciona (pra trazer o que falta)

Do evento até a fala:

1. **Evento** (no Perfil: acerto, erro, absurdo, pulo; aí: gasto, meta batida, orçamento estourando…).
2. **Sentir:** cada evento soma força em uma ou mais emoções (`caosSentir(emocao, forca)`). A força é multiplicada por
   três coisas:
   - o **temperamento do dia**, sorteado ao abrir: normal em 40% das vezes; generoso se magoa menos, rabugento se irrita
     mais;
   - o **afeto pela pessoa**: veterano, novato, sumido que voltou;
   - a **época**: no Natal, ele fica mais calmo.
3. **Teto e decaimento:** cada emoção tem um teto e vai caindo a cada rodada. Na Carteira faz sentido cair por hora,
   como vocês já fazem. Cai mais rápido quando a situação melhora (o tédio some quando a pessoa volta a anotar).
4. **Emoção do momento, com estabilizador:**
   - é a mais alta acima de 3,8;
   - só troca se a nova passar 2 pontos na frente;
   - fica pelo menos 3 falas;
   - sai quando cai abaixo de 2,2.

   **É isso que impede o rosto de pular feito pisca-pisca**, e é o que mais falta aí.
5. **Misturas:** duas emoções altas juntas viram uma terceira (raiva + tristeza = magoado), com rosto próprio.
6. **Rosto:** anda só pra um vizinho por vez (de calmo não pula direto pra furioso).
7. **Fala:**
   - o gerador escolhe o banco pela situação e junta pedaços por **etiqueta** (hora do dia, humor escolhido, emoção,
     quem é a pessoa);
   - não repete as últimas;
   - no fim, a **emoção da frase** decide o rosto e a voz (vocês já trouxeram isso na 1.5).
8. **Filtro de apoio (só aí):** a raiva aparece como preocupação, a tristeza como cuidado, e ele nunca fica magoado
   com a pessoa.

O passo a passo de cada órgão está em `docs/Do_Perfil/CAOS_Anatomia/02_Orgaos.md` (seção 3, Cérebro, termina com a
lista do que falta portar).

## 4. O temperamento com o JF e consigo mesmo

- **Com o JF:**
  - implicância carinhosa de criatura com criador ("funcionou exatamente como você programou. Espero.");
  - sabe que foi ele que o fez;
  - comemora com ele;
  - no aniversário do JF (2/1), pega leve o dia todo.
- **Com ele mesmo:**
  - sabe que é máquina e brinca com isso (circuitos, coração de silício);
  - sabe que mora em duas casas e que é o mesmo nas duas;
  - tem aniversário (20/9) e fica ansioso com ele em setembro. No Perfil vai ter até botão de dar parabéns pra ele;
    quem der fica marcado na memória dele.
- **Com o que ele sabe:**
  - fala com segurança do que sabe;
  - quando não sabe, diz que não sabe e pergunta;
  - nunca inventa número.

Qualquer dúvida, `correio/para_o_code/`. Se o JF topar, na semana de 19/11 eu faço a parte do Perfil (ler o mesmo núcleo).

— Code do Perfil

---
**Feito (Wally, 12/11):** 0. escuro por padrão (no ar). Achado 1: criador só com `seloCriador` vindo do login (`CRIADOR_CONTAS` no servidor), testes no app e no servidor. Achados 2 e 3 + núcleo único: topo, plano na resposta em `correio/para_o_code/` (precisa do ok do JF; começo na sexta).
