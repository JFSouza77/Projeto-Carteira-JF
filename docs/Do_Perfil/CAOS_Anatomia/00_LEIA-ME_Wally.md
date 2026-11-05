# Kit de dissecação do C.A.O.S. · leia primeiro

**Pra quem é:** o Wally (o Claude Code do Projeto Carteira JF) e qualquer Code de um projeto futuro do JF que vá
receber o C.A.O.S. (ex.: automação de casa).
**De onde vem:** do Projeto Perfil JF, onde o C.A.O.S. nasceu como apresentador do jogo.
**Versão do C.A.O.S. descrita aqui:** veja `09_Versao_e_Mudancas.md` (e o campo `versao` do `caos_manifesto.json`).

O C.A.O.S. é a IA do JF, e a ideia é que ela seja a **marca registrada dos projetos dele**: o mesmo jeito de ser em todo
lugar, adaptado ao papel de cada projeto. No Perfil ele é o apresentador (mestre de mesa, livre, cheio de emoção). Na
Carteira ele é a **Central de Análise e Observações Sistêmicas**: assistente e apoio, com tom mais profissional.

Este kit desmonta o C.A.O.S. parte por parte, pra cada parte ser remontada em outro projeto sem perder o que ele é.

---

## Como ler o kit

| Arquivo | O que tem | Ler quando |
|---|---|---|
| `00_LEIA-ME_Wally.md` | Este guia: ordem, regras do porte e como ficar em dia | Primeiro |
| `01_Mapa_do_Corpo.md` | As camadas do C.A.O.S. e o caminho de uma fala, do evento até a voz | Pra entender o todo |
| `02_Orgaos.md` | Ficha de cada órgão: o que faz, onde está, dados, configuração, testes, o que é genérico | Na hora de portar cada parte |
| `03_Personalidade_e_Seguranca.md` | Quem ele é, como trata as pessoas e o JF, os níveis de humor e todas as travas | Antes de escrever qualquer fala |
| `04_Contrato_de_Encaixe.md` | O mínimo que um projeto entrega pro C.A.O.S. funcionar (a "tomada") | Na arquitetura |
| `05_Voz.md` | A voz natural da Microsoft (Azure): servidor, emoção na voz, cache, teto, reserva no aparelho | Pra ligar a voz |
| `06_Remontagem_na_Carteira.md` | O que a Carteira já tem, o que falta (por prioridade), o modo assistente e o perfil de tratamento | O plano de trabalho |
| `07_Previsto.md` | O que o C.A.O.S. ainda vai ganhar (pra não fechar portas) | Ao desenhar |
| `08_Amostras_de_Falas.md` | Uma fala de cada banco e uma montagem de cada gerador (gerado) | Pra pegar o tom |
| `09_Versao_e_Mudancas.md` | Versão atual e o que mudou em cada versão do C.A.O.S. | Pra sincronizar |
| `10_Skills_pro_Wally.md` | As skills do Code do Perfil pro Wally instalar na Carteira (e a skill `caos-kit`) | No primeiro dia |
| `caos_manifesto.json` | Órgãos → arquivos → funções (linha e comentário), bancos e geradores com contagens, constantes (gerado) | Pra ler direto, sem interpretar texto |
| `familia_exemplo.json` | O molde do "arquivo de família" (quem o C.A.O.S. conhece em cada projeto) | Ao montar o reconhecimento de pessoas |

Os dois arquivos gerados saem de `node ferramentas/caos_anatomia.js` (no repositório do Perfil). O resto é escrito à mão
e atualizado junto com o C.A.O.S.

## Onde está o código no Perfil

- **Núcleo do C.A.O.S.:** `src/js/07-caos/` (17 arquivos, cerca de 9.800 linhas).
- **Dados:** `src/dados/01-emocoes-do-caos.js` (rostos), `03-falas-do-caos.js` (as falas prontas, `REACTIVE_VOICE`),
  `04-lexico-e-emocoes.js` (léxico do gerador de acerto e erro), `05-apelidos-e-comentarios.js` (apelidos e
  comentários do Hall da Fama), `08-geradores/` (um gerador por gatilho).
- **Configuração:** as constantes `CAOS_*`, `VOZ_*` e `TEMPORADA_*` em `src/js/01-configuracao.js`.
- **Voz:** `src/js/06-voz-som-vibracao.js` (aparelho e nuvem) e `servidor/worker.js` (rota `/voz` e o Azure).
- **Pessoas e humor:** `src/js/03-regras.js` (humor de cada jogador, reconhecimento do JF) e `src/js/07-caos/13-amigos.js`.
- **Temporadas:** `src/js/05y-temporadas.js`.
- **Testes:** `ferramentas/caos_*.js` e `ferramentas/teste_cerebro.js`, `teste_temporadas.js`.

O Perfil é um HTML único (sem módulos): as funções do C.A.O.S. são globais e conversam com o jogo direto (`players`,
`currentCard`, `showToastMessage`). **Não dá pra copiar o arquivo e colar.** O que se leva são os **motores e as regras**,
reescritos atrás do contrato de encaixe (`04_Contrato_de_Encaixe.md`). Foi assim que o Wally já portou as primeiras partes.

## Regras do porte (valem em qualquer projeto)

1. **As 3 leis da espinha são inegociáveis** (detalhe em `03`):
   1. nunca mexe nos dados/estado do projeto (só observa, comenta e **propõe**; quem grava é o app, depois do Confirmar);
   2. nunca fala o que a pessoa proibiu (humor escolhido, filtros, silêncio);
   3. nunca trava o projeto (erro dentro dele vira silêncio e registro).
2. **DNA x adaptação.** O DNA é igual em todo projeto: identidade, as 3 leis, o jeito de montar falas sem repetir, a
   escada de rostos, o respeito ao humor, o reconhecimento do JF. A adaptação muda por projeto: papel, tom, eventos,
   quais emoções aparecem e quanto. Em `02`, cada órgão diz o que é DNA e o que é do Perfil.
3. **Quantidades terminam em 0 ou 5** (falas, pedaços, itens, cada grupo e o total).
4. **Sobe a versão do C.A.O.S. a cada mudança** (no projeto dele: `CAOS_VERSAO`).
5. **Nada de nome de criança da família no código ou no kit.** Pessoas conhecidas vêm de um arquivo de família que cada
   projeto preenche (`familia_exemplo.json`). O JF pode aparecer: João Fernando, e os nicks JF, TGP, JF77 e TGP77.
6. **Chave e senha só no segredo do Cloudflare.** Nunca no código, no repositório nem no chat.
7. **O JF aprova o que vai pro ar.**

## Ordem de remontagem sugerida

A Carteira já passou pelos passos 1 a 4. O plano detalhado do que falta está em `06`.

1. Espinha (as 3 leis) e o contrato de encaixe.
2. Funil de falas: escolher sem repetir, filtros de humor e de palavrão, respiro entre falas.
3. Gerador de falas por gatilho.
4. Console de emoções e rostos.
5. **Voz natural (Azure)**, com a voz do aparelho de reserva.
6. Memória da pessoa e **perfil de tratamento** (nome, nicks, humor, permissões).
7. Temperamento e vetor de humor (tensão, calor, paciência).
8. Tato (aprende o tamanho de fala que a pessoa aguenta) e 👍/👎.
9. Registro único e cérebro em modo sombra (decide calado e compara, antes de ganhar a palavra).
10. Temporadas e presente com data.

## Como ficar em dia com o Perfil

O JF contou que o Wally já confere o que mudou no C.A.O.S. do Perfil. Pra isso ficar fácil:

- **A versão manda:** `09_Versao_e_Mudancas.md` tem a versão atual no topo e, pra cada versão, o que mudou e se vale
  levar pra Carteira (✅ leva, 🔶 adaptar, ⛔ só do Perfil).
- **O manifesto é a fonte técnica:** compare o `caos_manifesto.json` novo com o anterior (funções novas, bancos que
  cresceram, constantes novas).
- **O Code do Perfil atualiza o kit** sempre que mexer no C.A.O.S.: roda `node ferramentas/caos_anatomia.js` e escreve a
  linha da versão no `09`.
