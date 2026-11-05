# Projeto-Carteira-JF

Um app de controle de gastos com uma IA para te auxiliar.

PWA offline-first (HTML + JavaScript puro) para Android e iPhone, com o **C.A.O.S.**, um narrador que comenta
os gastos e avisa quando um orçamento aperta, sem nunca alterar os dados.

## O que já faz

- **Lançar gastos e entradas** (salário, freela, rendimentos…), com conta e foto do comprovante
- **Contas bancárias:** escolhe o banco, informa o saldo, e o app acompanha o saldo estimado com os lançamentos
- Total do mês, entradas, saldo do mês, gasto por categoria e **orçamento** com barra verde / amarela / vermelha
- **Alertas:** orçamento em 80%, categoria estourada, ritmo acima do orçamento, saindo mais do que entrando, conta
  no negativo, delivery repetido, dias sem anotar
- **C.A.O.S. 1.0** (trazido do Perfil JF): emoções, falas montadas por contexto sem repetir, 3 humores (Suave é o
  padrão), voz opcional, e **conversa**: pergunte "quanto gastei em delivery?", "tive rendimentos?", "vai dar até o
  fim do mês?", ou diga "gastei 30 no mercado" que ele prepara o registro pra você confirmar
- **Planejamento do mês (aba 📅 Mês):** compromissos (contas fixas, faturas, assinaturas e planos que se repetem a
  cada N meses), planos de compra do mês e a sobra prevista; o C.A.O.S. avisa vencimentos e diz se cabe
- **Primeiro acesso:** o C.A.O.S. pergunta seu nome e como quer ser tratado, e aprende suas categorias pelo histórico
- **Lembretes** para anotar os gastos
- **IA online opcional** (servidor próprio no Cloudflare): lê foto de comprovante e responde perguntas livres
- Offline, instala na tela inicial, backup em JSON

## Rodar no computador

```bash
npm run serve
```

Abra http://localhost:8080. Testes: `npm test` (Node 18+, sem dependências).

## Publicar o site (Cloudflare Pages)

No Cloudflare Pages: comando de build `npm run build` e pasta de saída `dist`. O build copia só o app
(sem servidor, testes ou documentos).

## Instalar no celular

O app precisa estar num endereço `https` (service worker exige). Qualquer hospedagem estática serve,
por exemplo Cloudflare Pages apontando para este repositório, sem build e com a raiz como pasta de saída.

- **iPhone:** abra no Safari → Compartilhar → Adicionar à Tela de Início.
- **Android:** abra no Chrome → menu → Instalar app.

## Servidor (opcional)

IA online e lembretes no iPhone: veja [`servidor/LEIA-ME.md`](servidor/LEIA-ME.md).

Regras do projeto para quem for mexer no código (inclusive o Claude Code): veja [`CLAUDE.md`](CLAUDE.md).
Cérebro do C.A.O.S.: [`docs/CAOS_Carteira.md`](docs/CAOS_Carteira.md). Próximas ideias: [`docs/Ideias.md`](docs/Ideias.md).
