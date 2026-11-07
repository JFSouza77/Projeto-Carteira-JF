# Ideias para as próximas versões

Sugestões do Code (05/11/2026), da mais útil para a menos. Nada disso está feito; o JF escolhe.

1. **Gastos fixos e assinaturas:** cadastrar aluguel, internet, streaming uma vez; todo mês o C.A.O.S. propõe lançar
   (com Confirmar) e avisa antes do vencimento.
2. **Importar extrato (OFX/CSV):** quase todo banco exporta extrato em OFX ou CSV. É o jeito realista de "integrar"
   banco sem Open Finance: o app lê o arquivo, sugere categoria pra cada linha e você confirma. Integração direta
   com banco exige empresa autorizada pelo Banco Central (Pluggy, Belvo…), que é paga e burocrática.
3. **Metas / cofrinhos:** "juntar R$ 2.000 para viagem até março"; o C.A.O.S. calcula quanto por mês e comemora.
4. **Cartão de crédito com fatura:** gasto no cartão vai pra fatura do mês seguinte, com fechamento e vencimento.
5. **Parcelas:** "comprei em 10x de 89,90" vira 10 lançamentos futuros.
6. **Relatório mensal do C.A.O.S.:** no dia 1º, um resumo do mês que passou (offline) e, com a IA ligada, insights
   ("você gastou 30% a mais em delivery que em outubro").
7. **Categorias personalizadas:** criar, renomear e trocar o emoji.
8. **Temporadas (como no Perfil):** Black Friday, Natal e 13º com falas próprias e alertas do tipo "cuidado com o
   parcelamento de fim de ano".
9. **Gráfico dos últimos 6 meses** por categoria.
10. **Senha/biometria pra abrir o app** (WebAuthn), já que tem dado financeiro.

## Da revisão do ChatGPT (06/11), pra quando o servidor estiver no ar
- Medir o tamanho real das respostas da IA e baixar o `max_tokens` (hoje 16000) sem cortar o JSON.
- Restringir os hosts de push a nomes exatos depois de conferir os endpoints de Chrome, Firefox, Safari e Edge.
- Os contadores do KV são aproximados: em rajada podem passar um pouco do limite. Se virar problema, usar Durable Object.

## Do Gemini (06/11)
- Emoção que some mais devagar quando o assunto é grave (conta no vermelho) e mais rápido quando é leve (piada).
- Elogio quando a pessoa fecha 2 ou 3 meses seguidos no verde.

## Do JF (06 e 07/11): o C.A.O.S. como parceiro, com formas e funções
O C.A.O.S. não é assistente de banco: é um parceiro que reage junto, dá ideia, chama atenção e muda de forma conforme
o momento. Rascunho do avatar (30+ formas) no Perfil, em `docs/Da_Carteira/2026-11-06_avatar_caos/` (PR #208). O JF
quer esperar o Code e o Gemini opinarem antes de entrar no app.

Formas que viram **funções** de verdade:
- **Contador · relatório mensal:** fechou o mês, ele mesmo abre o relatório: quanto entrou, quanto saiu, onde gastou
  demais, comparação com o mês anterior. Troca de forma no meio (orgulhoso no que foi bem, atento no que estourou).
- **Contador · saldo real:** separar "o que entrou no mês" de "o que sobra pra gastar depois de pagar tudo" (contas
  fixas, faturas, parcelas, metas). Ex.: caiu o salário → festa (Rico) → "agora vamos às contas" → "sobra real: R$ 700".
  Base: `analisarPlanejamento` já calcula a sobra prevista; falta mostrar isso como conversa e no Início.
- **Banqueiro · cartão novo:** ao cadastrar um cartão a mais, explicar com números que mais cartões não é mais
  dinheiro: faturas em dias diferentes, limite somado que engana, mais chance de perder o controle.
- **Férias:** "entrei de férias" muda a abordagem: tira do planejamento gastos que somem nas férias (condução,
  marmita), mostra quanto dá pra curtir a mais e lembra da volta.
- **Desnorteado → Recalculando:** voltou depois de muitos dias e o planejamento estourou → cena de susto e depois um
  passo a passo com botões (o que estourou, contas a pagar, ajustar metas).
- **Desconfiado:** perceber dinheiro saindo da meta no mesmo dia em que entra pagamento de cartão ou conta ("isso não
  é economizar, é tapar buraco").
- **Jeito de falar** (escolha em Ajustes, junto com o humor): Parceiro (padrão), Gerente (formal e aprofundado),
  Investidor (sugestão leve), Humorista.
- **Onde aparece** (do Gemini): grande no topo da conversa, pequeno no topo das outras abas (toque abre a conversa),
  e num aviso que desliza na hora do lançamento (ex.: Bronca ao estourar o orçamento).

## Mecânicas novas (Gemini + JF, 07/11) · ordem recomendada pelo Wally
1. ✅ **(feito na 1.11)** **Ofensiva (Treinador):** dias seguidos anotando e semanas no verde, estilo Duolingo. Os dados já existem (datas
   dos lançamentos); é a mais fácil e a que mais cria hábito. Cuidado: perder a ofensiva não pode virar bronca pesada.
2. ✅ **(feito na 1.11)** **Rachadinha / a receber (Cobrador):** "paguei a pizza, mas vou rachar com 3 amigos" → o gasto conta só a minha
   parte no orçamento, e o resto vira "a receber" com o nome de quem deve; o C.A.O.S. lembra de cobrar e, quando o
   Pix chega, dá baixa. Deixa o orçamento justo.
3. **Simulador de compras / "cabe a geladeira?" (Contador + Vidente):** a pessoa diz o que quer e o preço (ex.:
   geladeira de R$ 2.600, orçamento de R$ 2.500). O C.A.O.S.:
   - mostra de onde dá pra tirar a diferença sem estrago (categorias com folga, nunca moradia/saúde);
   - olha o calendário: se uma data de promoção está perto (Black Friday = sexta depois da 4ª quinta de novembro;
     em 2026 é 27/11), sugere esperar; se está longe, sugere o remanejamento ou guardar por meta;
   - compara as opções e recomenda uma.
   Limite honesto: offline ele **não pesquisa preço na internet**; a pessoa informa o preço. Com o servidor/IA no ar
   dá pra pensar em ajuda pra pesquisar depois. Base: o "cabe 200 no mês?" e as metas já existem.
4. **Assinaturas / gastos fantasma (Auditor):** somar compromissos recorrentes e a categoria Streaming e avisar quando
   passam de uma fatia do orçamento ("8 assinaturas = R$ 180/mês").
5. **Inflação e comparação anual (Vovô):** comparar o mesmo mês do ano anterior com o IPCA. Precisa de 1 ano de dados
   da pessoa e do índice (servidor), então fica por último.
