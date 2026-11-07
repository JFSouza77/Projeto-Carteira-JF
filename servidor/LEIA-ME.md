# Servidor da Carteira JF (Cloudflare Worker)

O servidor é **opcional**. Sem ele o app funciona inteiro: lançamentos, contas, conversa com o C.A.O.S., alertas e
lembretes no Android (pelo navegador). Com ele, o app também tem:

- **IA online:** lê foto de comprovante e responde perguntas que a conversa offline não entende.
- **Lembretes no iPhone** (e no horário exato no Android).
- **Mercado financeiro:** todo dia útil, depois das 10h05 (Brasília), o servidor busca sozinho dólar, euro, libra,
  peso argentino, bitcoin, Ibovespa, Selic, CDI e IPCA em fontes públicas e gratuitas (AwesomeAPI, Yahoo Finance e
  Banco Central). O app baixa quando tem internet e guarda pra usar offline. Não precisa de chave nenhuma.

- **Conta e sincronização:** a pessoa cria uma conta (apelido + senha) em Ajustes → Sua conta e o que ela anota num
  aparelho aparece nos outros sozinho. Usa o mesmo KV (`CARTEIRA_KV`): não precisa de nada a mais. Desde 07/11 é de
  ponta a ponta: o servidor recusa registro que não chegue embaralhado.

## O que passa pelo servidor

| Recurso | O que vai | O que NÃO vai |
| --- | --- | --- |
| Pergunta livre | A pergunta e os **totais** do mês (por categoria, entradas, saldo somado) | Lista de gastos, descrições, datas, nome de banco |
| Foto | A foto, só quando você toca em "Ler com IA" | Nada fica guardado no servidor |
| Lembrete | A inscrição de push do aparelho e o horário | Nenhum dado financeiro: o servidor manda um "toque" vazio e o texto é montado no próprio celular |
| Mercado | Nada: o app só baixa o resumo público do dia | Seus dados não saem do aparelho |
| Conta (opcional) | Gastos, entradas, contas etc. **embaralhados no aparelho** (AES-GCM, chave tirada da senha): o servidor vê só o tipo, o id e quando mudou | A senha (nem sai do aparelho; vai uma "senha de acesso" tirada dela, que o servidor ainda passa por hash), o conteúdo aberto dos registros e as fotos |

## Publicar (uma vez só, uns 15 minutos)

Mesma conta do Cloudflare do Perfil serve. Tudo dentro da pasta `servidor/`.

1. Instalar e entrar na conta:
   ```bash
   cd servidor
   npm install
   npx wrangler login
   ```
2. Criar o banco de chave-valor e colar o `id` que aparecer em `wrangler.toml` (no lugar de `COLE_AQUI_O_ID_DO_KV`):
   ```bash
   npx wrangler kv namespace create CARTEIRA_KV
   ```
3. Em `wrangler.toml`, preencher `ORIGENS` com o endereço onde o app está publicado (ex.: `https://carteira-jf.pages.dev`).
4. **IA online:** criar uma chave em console.anthropic.com e guardar como segredo (o terminal pede pra colar; ela não
   aparece em lugar nenhum do código):
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY
   ```
5. **Lembretes:** gerar as chaves (na raiz do projeto), colar a pública em `VAPID_PUBLIC_KEY` no `wrangler.toml` e a
   privada no segredo. Troque também o `VAPID_CONTATO` por um contato seu.
   ```bash
   node ferramentas/gerar_vapid.js
   ```
   ```bash
   npx wrangler secret put VAPID_PRIVATE_JWK
   ```
6. Publicar:
   ```bash
   npx wrangler deploy
   ```
7. No app: **Ajustes → IA online**, cole o endereço que o deploy mostrou (`https://carteira-jf.SEU-USUARIO.workers.dev`),
   ligue e toque em **Testar conexão**.

## Custo e limites

- O Worker e o KV cabem no plano grátis do Cloudflare.
- A IA é paga por uso na Anthropic. Modelo padrão: `claude-opus-5-5` (US$ 4 por milhão de tokens de entrada e
  US$ 20 por milhão de saída). Uma pergunta fica na casa de alguns centavos de real; uma foto, um pouco mais.
- Para gastar bem menos, troque `IA_MODELO` para `claude-haiku-5-5` no `wrangler.toml`.
- Limites contra susto: `IA_LIMITE_DIA` (por aparelho/endereço, padrão 40) e `IA_TETO_DIA` (total do dia, padrão 300).
  Também dá pra pôr um limite de gasto mensal no painel da Anthropic.

## Testes

```bash
npm test
```

Os testes usam chave e API **de mentira** (nada sai pra internet).
