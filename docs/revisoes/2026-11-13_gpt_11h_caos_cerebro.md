# Debug das 11h — C.A.O.S. e cérebro

**Executado:** 13/11/2026, 11:57 (Brasília)  
**Ponta revisada:** `main` em `3cdbb0ba87fb480681e8c6280a60f706a0fb92a5` — “Banco por dentro e cofrinhos completos (2.0 Alfa, sw v64) (#104)”.  
**Resultado:** 2 falhas confirmadas; 39 testes existentes passaram; 1 reprodução manual confirmou proposta incompleta. Nenhum código do projeto foi alterado.

Esta revisão substitui a auditoria das 11h que ficou bloqueada por falta de checkout local. O código foi lido pela conexão GitHub e os testes abaixo foram executados em uma cópia temporária dos arquivos dessa ponta, já removida.

## Achados para o Wally validar

### P2 — “Esqueci de lançar” transforma um dado parcial em proposta com categoria e data inventadas

**Arquivos:** [index.js](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/js/caos/index.js#L234-L249), [conversa.js — proposta de gasto](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/js/caos/conversa.js#L661-L679), [conversa.js — pergunta inicial](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/js/caos/conversa.js#L717-L722).

O C.A.O.S. pede três dados — valor, descrição e data — mas o estado `esqueci` é completado com o primeiro valor reconhecido. Depois da resposta, `aguardando` é apagado. Se faltar descrição/categoria, o gerador escolhe “Outros”; se faltar data, `dataDoTexto` usa hoje.

**Reprodução confirmada com dados fictícios:**

1. Pessoa: “esqueci de lançar um gasto”.
2. C.A.O.S. pergunta valor, em quê e quando.
3. Pessoa: “79,90”.
4. C.A.O.S. oferece registrar R$ 79,90 em **Outros**, com data **13/11/2026** e descrição vazia.

A gravação ainda exige confirmação da pessoa, o que reduz o risco; mesmo assim, a proposta contradiz os dados que o próprio C.A.O.S. disse precisar e pode ser confirmada com informação errada.

**Sugestão:** manter um rascunho com os campos já informados; perguntar somente o próximo campo que falta; não gerar ação enquanto valor, descrição/categoria e data não estiverem preenchidos ou explicitamente aceitos pela pessoa. Preservar a conversa até conclusão, cancelamento ou expiração. Criar testes para respostas separadas e fora de ordem, cancelamento, pergunta paralela e expiração.

### P2 — A resposta sobre privacidade promete que nada é enviado, mas a IA opcional envia dados

**Arquivos:** [identidade.js](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/js/caos/identidade.js#L49-L51), [ia.js](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/js/ia.js#L33-L70), [conversa.js — resposta de limites](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/js/caos/conversa.js#L1045-L1048), [teste que fixa a frase atual](https://github.com/JFSouza77/Projeto-Carteira-JF/blob/3cdbb0ba87fb480681e8c6280a60f706a0fb92a5/tests/caos.test.js#L233-L238).

Ao perguntar o que o C.A.O.S. pode fazer, a resposta termina com: “seus dados ficam no seu aparelho: não mando pra ninguém”. Mas, quando a IA online opcional é ligada e usada, `perguntar` envia a pergunta e um resumo ao servidor. Esse resumo inclui totais do mês, previsão, saldo agregado, nomes/gastos/orçamentos de categorias e tipos de alerta. O fluxo de imagem também envia a foto quando a pessoa pede leitura/explicação. A frase aparece sem ressalva e o teste atual exige que ela continue aparecendo.

**Sugestão:** descrever com precisão o modo local e o modo online: a IA online é opcional; quando ativada, informar antes do envio quais dados resumidos acompanham a pergunta e que fotos só são enviadas quando a pessoa pede a leitura. Atualizar o texto e o teste para evitar a promessa absoluta. Também vale testar o corpo enviado, garantindo que descrições e lançamentos individuais permaneçam fora do pedido de conversa.

## O que passou

- `tests/caos.test.js`: **31/31**. Inclui isolamento do narrador, imutabilidade dos dados, silêncio em erro, regras de humor, placeholders, não repetição, cooldown, emoções, respostas, proposta de registro, rostos, alertas e avisos de mercado.
- `tests/nucleo.test.js`: **8/8**. Inclui identidade, emoções, datas, leis e cópia gerada.
- O arquivo-fonte do núcleo do Perfil e a cópia usada pela Carteira têm o mesmo SHA de conteúdo: `802fcae889f8a914366494c12ea98c34469a2231`.
- A reprodução manual do fluxo parcial falhou como descrito acima; os testes oficiais atuais não cobrem respostas parciais para `esqueci` nem a promessa de privacidade contra o pedido à IA.

## Limites da verificação

O diretório de trabalho não contém checkout Git nem a aplicação completa. A auditoria foi fixada no commit acima; os dois arquivos de teste foram executados numa cópia temporária dos módulos necessários. Não rodei a suíte completa da aplicação nem fiz teste visual/interativo no navegador ou teste de rede do Worker. O status combinado e a lista de execuções de Actions consultados para o commit vieram vazios — isso **não** comprova CI aprovado.

A leitura editorial das falas foi coberta pelos verificadores automatizados de estrutura, placeholders e variação, não por revisão manual linha a linha de todas as frases. Nenhuma sugestão altera o núcleo compartilhado, as leis ou emoções oficiais; mudanças nessa identidade precisam seguir a aprovação do JF e a sincronização com o Perfil.

## Ordem sugerida para validação

1. Wally reproduzir o fluxo de rascunho em várias mensagens e definir quais campos podem ter valor padrão.
2. Wally revisar com JF o texto de privacidade e a forma de informar o envio opcional.
3. Corrigir/adicionar testes de regressão para esses caminhos antes de implementar.
