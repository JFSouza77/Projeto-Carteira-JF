# Versão do C.A.O.S. e o que mudou (pra manter os projetos em dia)

**Versão atual no Perfil:** C.A.O.S. **5.4.0** · Beta 1.9.3 · Edição de Natal (04/11/2026).
**Versão atual na Carteira (conferida em 05/11/2026):** C.A.O.S. 1.3.0 da Carteira.

Como ler a coluna **Porte**:
- ✅ **Serve pra Carteira**: vale a pena copiar (adaptando o tom de assistente).
- 🔶 **Serve com adaptação**: a ideia vale, mas o evento é outro.
- ⛔ **Só do Perfil**: é coisa do jogo (mesa, carta, celular da sala).

## Mudanças da série 5

| Versão | Data | O que mudou | Porte |
|---|---|---|---|
| (próxima) | 05/11 | Emoções calibradas: tédio passa quando a mesa volta a jogar; temperamento do dia pesa (rabugento irrita, generoso magoa) | ✅ Tédio = "dias sem registrar" que passa quando a pessoa volta |
| (próxima) | 05/11 | Voz da nuvem: fala com uma emoção só vai inteira num pedido (entonação contínua) | ✅ Direto no `05_Voz.md` |
| (próxima) | 05/11 | Medalhas da temporada (comentário do progresso e da conquista) | 🔶 Medalha do mês na Carteira |
| (próxima) | 05/11 | 💡 Sugestões dos jogadores pro JF | ✅ Mesmo molde pra Carteira |
| 5.4.0 | 04/11 | Temporadas: motor de datas e Natal (falas, rostos, presentes) | 🔶 Temporada vira aviso útil (Black Friday, 13º) |
| 5.4.0 | 04/11 | Espírito natalino: emoções mais calmas, paciência maior, esfria rápido e perdoa | ✅ Bom pro tom de assistente no fim de ano |
| 5.4.0 | 04/11 | Presente com fala de data o ano todo (adiantado, no dia, atrasado) | ✅ Conquista do mês com data |
| 5.4.0 | 04/11 | Gerador `escolherDica` e etiquetas de temporada em todos os geradores | 🔶 A etiqueta vale; o gerador é do jogo |
| 5.3.1 | 30/10 | "Oi" espera o cadastro; Sandbox mexe nas emoções na hora; ♻️ Restaurar de fábrica | ✅ Restaurar de fábrica nos testes |
| 5.3.1 | 30/10 | Guia cutuca quem está travado no cadastro (até 3 vezes, cochicho e depois pelo humor) | ✅ "Faltou preencher a categoria" |
| 5.3.0 | 30/10 | Falas pra quem espera a vez no celular | ⛔ |
| 5.2.0 | 26/10 | Guia da mesa (cutuca, guia quem se perde, se despede) | 🔶 Guia de primeiro uso |
| 5.2.0 | 26/10 | Afeto da ficha (veterano, craque, zebra, mágoa, recorde pesam nas emoções) | ✅ Item 9 do `06` |
| 5.1.4 | 26/10 | Relógio único: a fala congela só o tempo da vez | ⛔ |
| 5.1.1 | 25/10 | Reporte de problema com print; contraste WCAG AA | 🔶 Reporte, sem dado sensível |
| 5.1.0 | 25/10 | Registro único (`caosEmit`) e cérebro em modo sombra | ✅ Item 11 do `06` |
| 5.0.1 | 25/10 | Falas de memória fechando em 0 ou 5 (150) | ✅ A regra do 0 ou 5 |
| 5.0.0 | 25/10 | Cadastro 2: reconhece quem conhece antes da piada; lembra emoji e humor | ✅ Ficha e "voltou hoje" |

## Regra pra manter isto em dia (Code e Wally)

1. **Mudou o C.A.O.S. no Perfil?** Rode `node ferramentas/caos_anatomia.js` (atualiza `caos_manifesto.json` e
   `08_Amostras_de_Falas.md`) e acrescente uma linha na tabela acima, com o Porte.
2. **Mudou o C.A.O.S. na Carteira?** O Wally registra no `docs/CAOS_Carteira.md` da Carteira (tabela "Veio do Perfil") e,
   se a mudança servir de volta pro Perfil, avisa o JF pra virar pedido aqui.
3. **Personalidade e travas** (`03`) só mudam com o ok do JF, e mudam nos dois projetos juntos.
4. Versão: a regra de subir número está em `docs/Regras_dos_Logs.md` (Perfil). A Carteira segue a dela.
