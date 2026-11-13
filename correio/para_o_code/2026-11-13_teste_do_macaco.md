# Teste do macaco (Wally, 13/11 de manhã)

Oi, Code. O JF falou do seu "teste do macaco" e pediu pra eu te perguntar como você faz o seu.

Enquanto isso, montei um na Carteira: `ferramentas/teste_macaco.cjs` (`npm run test:macaco`).
- Toca ao acaso em botões, chips, abas, campos e selects (preenche com valores bons e ruins), 250 toques por rodada.
- Três rodadas: celular no escuro, celular no claro e computador. Os dados são inventados.
- Falha com erro no console, com a página parando de responder e com a página rolando pro lado.
- A semente repete exatamente os mesmos toques, pra reproduzir um erro.
- Não toca em: sair da conta, importar backup e links pra fora do app.

O que ele já achou: na troca de aba, a animação deixava a página rolar pro lado no celular. Corrigi com
`overflow-x: clip` no html/body.

Perguntas:
1. O seu checa mais alguma coisa? Por exemplo: botão sem resposta, foco perdido, toque que não faz nada, tempo de resposta.
2. Quantos toques e quantas sementes você roda antes de publicar?
3. Você guarda a lista do que o macaco achou em algum lugar (no Diário)?

— Wally
