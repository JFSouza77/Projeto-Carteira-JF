# Projeto-Carteira-JF

Um app de controle de gastos com uma IA para te auxiliar.

PWA offline-first (HTML + JavaScript puro) para Android e iPhone, com o **C.A.O.S.**, um narrador que comenta
os gastos e avisa quando um orçamento aperta, sem nunca alterar os dados.

## O que já faz (versão 2.0.2 Alfa · Avatares · C.A.O.S. 2.0.8)

- **Lançar gastos e entradas** (salário, freela, rendimentos…), com conta, forma de pagamento, parcelas, foto do
  comprovante e **conta rachada** com os amigos (com botão "Cobrar" no WhatsApp); editar e apagar lançamentos
- **Contas, cartões e cofrinhos:** cor e sigla de cada banco; **raio-X do banco** (toque no nome) com o que é cada conta e
  de onde vem o limite do cartão (limite próprio + cofrinho); cofrinho com **rendimento em % do CDI**, dinheiro
  **guardado pra outra pessoa** (fora do seu saldo), transferência entre contas, fatura do cartão e investimentos
- **Início:** gasto do mês, **orçamento de hoje**, atalhos, ofensiva com calendário de 4 semanas, gráficos que respondem
  ao toque (ritmo do mês, 6 meses, rosca das categorias, dias mais pesados) e extrato com busca, filtros e exportar CSV
- **Mês:** sobra prevista, compromissos, planos, **"E se eu comprar?"**, metas com anel e **exportar o mês** (planilha ou PDF)
- **Alertas:** orçamento em 80%, categoria estourada, ritmo acima do orçamento, saindo mais do que entrando, conta
  no negativo, cartão no limite, assinatura esquecida, dias sem anotar
- **C.A.O.S.** (narrador com número próprio de versão; o núcleo é o mesmo do Perfil JF): 10 emoções com rostinho,
  3 humores (Suave é o padrão), voz opcional, Estúdio com glossário e calculadora de juros, e **conversa**: "quanto gastei
  em delivery?", "vai dar até o fim do mês?", "gastei 30 no mercado" (ele prepara o registro e você confirma). Ele nunca
  grava nada sozinho
- **Mercado:** dólar, euro, bolsa, Selic e CDI pelo servidor (quando ligado), guardados pra usar offline
- **Lembretes**, **conta com sincronização ponta a ponta** (opcional), offline, instala na tela inicial, backup em JSON
- **IA online opcional** (servidor próprio no Cloudflare): recebe só totais do mês; a foto só vai quando você pede a leitura

## Rodar no computador

```bash
npm run serve
```

Abra http://localhost:8080. Testes: `npm test` (Node 18+, sem dependências), `npm run test:telas` e
`npm run test:macaco` (toques ao acaso em todas as telas; precisam do Playwright).

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
