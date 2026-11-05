# Projeto-Carteira-JF

Um app de controle de gastos com uma IA para te auxiliar.

PWA offline-first (HTML + JavaScript puro) para Android e iPhone, com o **C.A.O.S.**, um narrador que comenta
os gastos e avisa quando um orçamento aperta, sem nunca alterar os dados.

## O que já faz

- Cadastrar gasto (valor, categoria, descrição, data) e apagar
- Total do mês, navegação entre meses, gasto por categoria
- Orçamento mensal por categoria, com barra verde / amarela (80%) / vermelha (estourou)
- C.A.O.S. v0: reage a gasto cadastrado, 80% do orçamento, categoria estourada, delivery repetido
  (3 em 7 dias) e mês fechado no verde. Humores Suave (padrão), Normal e Ácido; anti-repetição,
  cooldown e voz opcional
- Dados no aparelho (IndexedDB), funciona sem internet, instala na tela inicial
- Backup: exportar e importar JSON

## Rodar no computador

```bash
npm run serve
```

Abra http://localhost:8080. Testes: `npm test` (Node 18+, sem dependências).

## Instalar no celular

O app precisa estar num endereço `https` (service worker exige). Qualquer hospedagem estática serve,
por exemplo Cloudflare Pages apontando para este repositório, sem build e com a raiz como pasta de saída.

- **iPhone:** abra no Safari → Compartilhar → Adicionar à Tela de Início.
- **Android:** abra no Chrome → menu → Instalar app.

Regras do projeto para quem for mexer no código (inclusive o Claude Code): veja [`CLAUDE.md`](CLAUDE.md).
