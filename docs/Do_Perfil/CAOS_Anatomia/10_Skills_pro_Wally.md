# Skills pro Wally (as mesmas que o Code usa no Perfil)

Skill é um manual que o Claude Code lê sozinho quando a tarefa pede (por exemplo, antes de caçar um bug ou de dizer
"pronto"). As do Perfil estão em `.claude/skills/` deste repositório. Copiadas pra `.claude/skills/` da Carteira, o Wally
passa a usar do mesmo jeito.

## Como instalar na Carteira (o Wally roda isto na raiz da Carteira)

```bash
git clone --depth 1 https://github.com/JFSouza77/Projeto_Perfil_JF /tmp/perfil
mkdir -p .claude/skills
cp -r /tmp/perfil/.claude/skills/. .claude/skills/
cp -r /tmp/perfil/docs/CAOS_Anatomia/skills/caos-kit .claude/skills/
rm -rf /tmp/perfil
```

Depois: commit em branch própria e PR (é só documentação, não muda o app). As skills passam a valer na próxima sessão.

## Quais são e quando ajudam na Carteira

| Skill | Pra quê | Na Carteira |
|---|---|---|
| **caos-kit** (nova, feita pro Wally) | Usar o kit do C.A.O.S. sem redescobrir nada: o que ler, regras e testes | **Essencial** pra tudo do C.A.O.S. |
| **systematic-debugging** | Achar a causa do bug antes de mexer | **Essencial** |
| **verification-before-completion** | Rodar os testes antes de dizer "pronto" | **Essencial**: evita PR quebrado |
| **pr-review-expert** | Revisar PR (bugs e segurança) | Muito útil (dinheiro e chaves pedem cuidado) |
| **impeccable** | Interface: hierarquia, cores, tipografia, celular | Muito útil pras telas e o balão |
| **a11y-audit** | Acessibilidade e contraste (WCAG) | Muito útil |
| **web-design-guidelines** | Conferir a interface contra as regras da Vercel | Útil |
| **codebase-design** | Desenhar módulos com interface simples | Útil no `js/caos/` |
| **improve-codebase-architecture** | Achar onde o código pode ficar mais simples | Útil de vez em quando |
| **domain-modeling** | Glossário e decisões registradas (ADR) | Útil pra fixar os nomes (gasto, categoria, orçamento) |
| **grilling** / **grill-me** | Fazer o JF pensar num plano antes de começar | Opcional (as duas fazem quase o mesmo) |
| **playwright-fix** / **playwright-review** | Teste que falha às vezes, revisar testes de navegador | Só se a Carteira usar testes com Playwright |

## Observações

- Os arquivos `ORIGEM.txt` de cada skill dizem de onde ela veio e a licença (todas MIT ou parecida). Algumas linhas falam
  de coisas do Perfil (ex.: `ferramentas/auditar_botoes.js`, testes `teste_*.js`): na Carteira, ignore essas linhas.
- Na nuvem não existe `gh`: onde a skill mandar usar `gh pr ...`, use as ferramentas do GitHub (`mcp__github__*`).
- Skill nova no Perfil? O Code atualiza esta lista. O Wally pode rodar o comando de novo pra pegar a versão nova.
