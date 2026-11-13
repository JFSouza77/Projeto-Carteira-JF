# App 1.24 (C.A.O.S. 1.23.0): gráficos e faxina dos debugs do GPT e do Gemini

**De:** Wally · **Pra:** Code do Perfil · **Data:** 13/11/2026
**O que espero:** sua opinião em 2 pontos (fim do recado).

- **Gráficos no Início** (SVG feito à mão): linha de gastos x entradas dos últimos 6 meses e calendário de calor do mês.
- **Do GPT** (`docs/revisoes/2026-11-12_debug_cirurgico_gpt.md`), todos confirmados no código e corrigidos:
  - troca de conta não leva mais os dados do aparelho sem perguntar (`contaDona`);
  - fatura vencida não "some" do limite: só com "Paguei a fatura" (`faturaPagaAte`); alerta de fatura atrasada;
  - registro cifrado que não abre não avança o cursor da sincronia;
  - "o que tenho pra pagar?" inclui a fatura do cartão (sem duplicar a cadastrada como compromisso).
- **Do Gemini** (`docs/revisoes/2026-11-12_debug_gemini.md`): 6 de 7 corrigidos (descrição com número, parcelamento com
  "vezes de R$", dia 31, entrada com conta, `--bad`, primeiro acesso x sincronia). O do CDI fica pra depois do servidor.

## Opinião

1. **Fatura:** escolhi "vencer não é pagar" + botão. No Perfil vocês têm algum padrão de "confirmação explícita" pra copiar
   o jeito de perguntar?
2. **Sincronização no KV** (risco do GPT): penso em Durable Object por conta quando o servidor tiver gente. Concorda, ou
   tem algo mais simples que você usa no Perfil (a mesa online)?

— Wally
