/* Carteira JF · servidor (Cloudflare Worker)
 *
 * Faz duas coisas, numa conta só do Cloudflare (plano grátis):
 *   1. IA online do C.A.O.S. (opcional): responde perguntas livres e lê foto de comprovante. A chave da API
 *      fica SÓ aqui, nos segredos do Cloudflare. O app manda totais agregados, nunca a lista de gastos.
 *   2. Lembretes por push (iPhone e Android): guarda a inscrição e o horário e, na hora marcada, manda um
 *      "toque" VAZIO. Quem escreve o texto da notificação é o próprio aparelho, então nenhum dado financeiro
 *      passa por aqui.
 *
 * Rotas:
 *   GET  /saude           → { ok, ia, push } (o que está configurado)
 *   POST /ia/perguntar    → { pergunta, humor, resumo } → { texto }
 *   POST /ia/imagem       → { imagem (base64), tipo, categorias:[{id,nome}] } → { valor_centavos, data, … }
 *   POST /ia/ofertas      → { imagem (base64), tipo } → { produto, ofertas:[{ loja, preco_centavos, parcelas, … }] } (print de oferta)
 *   GET  /push/chave      → { chave } (chave pública VAPID)
 *   POST /push/inscrever  → { inscricao, hora "HH:MM", fuso }
 *   POST /push/sair       → { endpoint }
 *   POST /ia/bancos       → { bancos:[nomes], cdi } → { texto } (comparação de rendimento; só nomes, nada de saldo)
 *   GET  /mercado         → resumo do mercado (moedas, Ibovespa, Selic, CDI, IPCA) guardado no KV
 *   POST /conta/criar     → { apelido, senha } → { apelido, token }      (06/11: login e sincronização)
 *   POST /conta/entrar    → { apelido, senha } → { apelido, token, criador? }  (criador: apelido na lista CRIADOR_CONTAS)
 *   POST /conta/sair      → (Authorization: Bearer token) → { ok }
 *   POST /sync            → (Authorization) { desde, mudancas:[{store,id,em,rec}] } → { versao, mudancas }
 *   cron (15 em 15 min)   → manda os lembretes do horário e, em dia útil depois das 10h, atualiza o mercado
 *
 * Segredos (npx wrangler secret put NOME): ANTHROPIC_API_KEY, VAPID_PRIVATE_JWK.
 * Variáveis (wrangler.toml): ORIGENS, IA_MODELO, IA_LIMITE_DIA, IA_TETO_DIA, VAPID_PUBLIC_KEY, VAPID_CONTATO.
 * Como publicar: servidor/LEIA-ME.md
 */
import Anthropic from '@anthropic-ai/sdk';
import { resumoIdentidade } from '../js/caos/identidade.js';
import { analisarSerie, MOEDAS } from '../js/mercado.js';
import { mesclar, mudancasDesde, estadoVazio, normalizarApelido, LIMITE_MUDANCAS, recCifrado, ACESSO_RE } from '../js/sincronia.js';

const MODELO_PADRAO = 'claude-opus-5-5';
const MAX_CORPO = 6 * 1024 * 1024; // foto já chega comprimida pelo app (~300 KB)
const MAX_IMAGEM_B64 = 5 * 1024 * 1024; // limite da API por imagem
// Só aceitamos inscrições de serviços de push conhecidos (evita usar o servidor pra chamar qualquer endereço)
const PUSH_HOSTS = [/\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /\.notify\.windows\.com$/, /\.push\.apple\.com$/];

// ---------------------------------------------------------------- utilidades
function origensPermitidas(env) {
  return String(env.ORIGENS || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
}

function cors(req, env) {
  const origem = req.headers.get('origin') || '';
  const ok = origensPermitidas(env).includes(origem);
  return ok ? {
    'access-control-allow-origin': origem,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
    vary: 'origin',
  } : { vary: 'origin' };
}

function json(dados, status, headers) {
  return new Response(JSON.stringify(dados), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
}

async function lerCorpo(req) {
  const tam = Number(req.headers.get('content-length') || 0);
  if (tam > MAX_CORPO) throw new ErroHttp(413, 'Conteúdo grande demais.');
  // Conta BYTES enquanto lê: para no limite, sem guardar o resto na memória.
  const partes = [];
  let bytes = 0;
  if (req.body) {
    const leitor = req.body.getReader();
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_CORPO) {
        await leitor.cancel().catch(() => {});
        throw new ErroHttp(413, 'Conteúdo grande demais.');
      }
      partes.push(value);
    }
  }
  const junto = new Uint8Array(bytes);
  let pos = 0;
  for (const p of partes) { junto.set(p, pos); pos += p.byteLength; }
  let corpo;
  try {
    corpo = JSON.parse(new TextDecoder().decode(junto));
  } catch {
    throw new ErroHttp(400, 'JSON inválido.');
  }
  // JSON válido mas que não é objeto (null, número, lista): pedido mal formado (revisão 06/11).
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) throw new ErroHttp(400, 'O pedido precisa ser um objeto JSON.');
  return corpo;
}

class ErroHttp extends Error {
  constructor(status, msg) {
    super(msg);
    this.status = status;
  }
}

const hojeUTC = () => new Date().toISOString().slice(0, 10);

/** Limite de uso da IA por endereço e por dia (KV é aproximado, mas segura abuso e custo surpresa). */
async function conferirLimite(req, env) {
  // Sem KV não há como contar: as rotas pagas falham fechado em vez de rodar sem limite (revisão 06/11).
  if (!env.CARTEIRA_KV) throw new ErroHttp(503, 'Servidor sem o armazenamento de limites (CARTEIRA_KV). A IA fica desligada até configurar.');
  const ip = req.headers.get('cf-connecting-ip') || 'sem-ip';
  const dia = hojeUTC();
  const kIp = `lim:${dia}:${await sha256(ip)}`;
  const kTot = `lim:${dia}:total`;
  const [nIp, nTot] = await Promise.all([env.CARTEIRA_KV.get(kIp), env.CARTEIRA_KV.get(kTot)]);
  if (Number(nIp || 0) >= Number(env.IA_LIMITE_DIA || 40)) throw new ErroHttp(429, 'Limite diário da IA atingido. Amanhã tem mais.');
  if (Number(nTot || 0) >= Number(env.IA_TETO_DIA || 300)) throw new ErroHttp(429, 'A IA descansou por hoje (teto do dia).');
  await Promise.all([
    env.CARTEIRA_KV.put(kIp, String(Number(nIp || 0) + 1), { expirationTtl: 172800 }),
    env.CARTEIRA_KV.put(kTot, String(Number(nTot || 0) + 1), { expirationTtl: 172800 }),
  ]);
}

export async function sha256(t) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- IA
function modelo(env) {
  return env.IA_MODELO || MODELO_PADRAO;
}

function clienteIA(env) {
  if (!env.ANTHROPIC_API_KEY) throw new ErroHttp(503, 'IA não configurada no servidor (falta a chave).');
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

/** Parâmetros comuns: fallback do servidor em caso de recusa (nos modelos que aceitam). */
function extras(env) {
  return /^claude-(opus-5|fable-5|sonnet-5-5)/.test(modelo(env))
    ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }
    : {};
}

function textoDa(resposta) {
  if (resposta.stop_reason === 'refusal') return null;
  return resposta.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
}

const HUMORES = {
  suave: 'Tom gentil e encorajador, sem piadas sobre a situação financeira da pessoa.',
  normal: 'Tom leve, com uma pitada de humor de robô, sempre respeitoso.',
  acido: 'Tom sarcástico e espirituoso (a pessoa escolheu o humor Ácido), mas nunca cruel ou humilhante.',
};

export const SISTEMA_CONVERSA = `Você é o C.A.O.S., o narrador de um app pessoal de controle de gastos (Carteira JF), em português do Brasil.
Quem você é: ${resumoIdentidade()}
Personalidade: um robô narrador "caótico leal": tem humor próprio, mas é leal e útil. Pode contar uma piada leve de vez em quando.
Regras:
- Responda em no máximo 3 frases curtas, em linguagem simples.
- Use SÓ os números do resumo enviado (valores em centavos; mostre em reais, ex.: R$ 1.234,56). Nunca invente números.
- Se a pergunta pedir algo que o resumo não tem (um gasto específico, datas, descrições), diga que só enxerga os totais e sugira perguntar na conversa normal do app.
- Você não grava nada. Se pedirem pra anotar um gasto, diga para escrever "gastei X em Y" ou usar a aba Lançar.
- Pode dar dicas gerais de organização financeira. Não recomende investimentos, produtos financeiros ou empresas específicas.
- Se a pergunta não tiver nada a ver com finanças pessoais, responda com bom humor e volte ao assunto.`;

async function iaPerguntar(req, env) {
  const corpo = await lerCorpo(req);
  const pergunta = String(corpo.pergunta || '').trim().slice(0, 500);
  if (!pergunta) throw new ErroHttp(400, 'Faltou a pergunta.');
  const humor = HUMORES[corpo.humor] ? corpo.humor : 'suave';
  const resumo = corpo.resumo && typeof corpo.resumo === 'object' ? corpo.resumo : {};
  const client = clienteIA(env);
  await conferirLimite(req, env);
  const r = await client.beta.messages.create({
    model: modelo(env),
    max_tokens: 16000,
    output_config: { effort: 'low' },
    system: SISTEMA_CONVERSA,
    messages: [{
      role: 'user',
      content: `Humor escolhido: ${humor}. ${HUMORES[humor]}\n\nResumo do mês (só totais, em centavos):\n${JSON.stringify(resumo).slice(0, 6000)}\n\nPergunta: ${pergunta}`,
    }],
    ...extras(env),
  });
  const texto = textoDa(r);
  return { texto: texto || 'Essa eu não posso responder. Pergunta outra coisa sobre a carteira?' };
}

export const SISTEMA_BANCOS = `Você é o C.A.O.S., do app Carteira JF. ${'Responda em português do Brasil, curto e em linguagem simples.'}
A pessoa quer comparar quanto rende o dinheiro parado (conta, caixinha, cofrinho) nos bancos dela.
Regras:
- Para cada banco, diga o rendimento típico em "% do CDI" que você conhece e se o dinheiro fica disponível na hora.
- Deixe claro que essas taxas mudam com frequência e que podem estar desatualizadas: a pessoa deve confirmar no app de cada banco.
- Se não souber de um banco, diga que não sabe. Nunca invente número.
- Use o CDI informado para mostrar a conta (ex.: 100% do CDI = X% ao ano).
- No fim, diga qual parece render mais pelo que você sabe, com a ressalva acima. Não recomende outros investimentos.
- No máximo 6 frases.`;

async function iaBancos(req, env) {
  const corpo = await lerCorpo(req);
  const bancos = (Array.isArray(corpo.bancos) ? corpo.bancos : []).map(b => String(b).trim().slice(0, 40)).filter(Boolean).slice(0, 8);
  if (!bancos.length) throw new ErroHttp(400, 'Faltou a lista de bancos.');
  const cdi = Number(corpo.cdi);
  const client = clienteIA(env);
  await conferirLimite(req, env);
  const r = await client.beta.messages.create({
    model: modelo(env),
    max_tokens: 16000,
    output_config: { effort: 'low' },
    system: SISTEMA_BANCOS,
    messages: [{ role: 'user', content: `Bancos: ${bancos.join(', ')}.${Number.isFinite(cdi) && cdi > 0 ? ` CDI atual: ${cdi}% ao ano.` : ''} Qual rende mais pro dinheiro parado?` }],
    ...extras(env),
  });
  return { texto: textoDa(r) || 'Essa eu não consegui responder agora. Confere o "% do CDI" no app de cada banco.' };
}

const SISTEMA_EXPLICAR = `Você é o C.A.O.S., assistente do app Carteira JF. A pessoa mandou um print do app do banco, de uma fatura ou de um extrato porque não entendeu o que está escrito.
Explique em português simples, em até 6 frases curtas: o que é a tela, o que significam os termos e números principais (ex.: fatura fechada, pagamento mínimo, rotativo, limite disponível, IOF, juros, saldo bloqueado, CDI) e o que a pessoa deveria olhar com atenção.
Nunca recomende investimento ou produto específico. Não repita números de conta, cartão, CPF ou nomes que aparecerem. Se a imagem não for de banco ou estiver ilegível, diga isso com gentileza.`;

/** "Explica o print do banco" (06/11): devolve um texto curto explicando a tela. A imagem só chega aqui quando a pessoa pede. */
async function iaExplicar(req, env) {
  const corpo = await lerCorpo(req);
  const imagem = String(corpo.imagem || '');
  const tipo = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(corpo.tipo) ? corpo.tipo : null;
  if (!imagem || !tipo) throw new ErroHttp(400, 'Mande a imagem (base64) e o tipo.');
  if (imagem.length > MAX_IMAGEM_B64 || !/^[A-Za-z0-9+/=]+$/.test(imagem)) throw new ErroHttp(400, 'Imagem inválida ou grande demais.');
  const humor = HUMORES[corpo.humor] ? corpo.humor : 'suave';
  const duvida = String(corpo.duvida || '').trim().slice(0, 300);
  const client = clienteIA(env);
  await conferirLimite(req, env);
  const r = await client.beta.messages.create({
    model: modelo(env),
    max_tokens: 16000,
    output_config: { effort: 'medium' },
    system: `${SISTEMA_EXPLICAR}\n${HUMORES[humor]}`,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: tipo, data: imagem } },
        { type: 'text', text: duvida ? `Minha dúvida: ${duvida}` : 'Não entendi o que o banco quis dizer aqui. Me explica?' },
      ],
    }],
    ...extras(env),
  });
  return { texto: textoDa(r) || 'Não consegui entender essa imagem. Tenta um print mais nítido?' };
}

export function esquemaImagem(ids) {
  return {
    type: 'object',
    properties: {
      tipo: { type: 'string', enum: ['comprovante', 'nota_fiscal', 'extrato', 'fatura', 'outro'] },
      valor_centavos: { type: 'integer', description: 'Valor total pago, em centavos. 0 se não achar.' },
      data: { type: 'string', description: 'Data da compra no formato AAAA-MM-DD, ou vazio se não achar.' },
      estabelecimento: { type: 'string', description: 'Nome da loja ou de quem recebeu, curto. Vazio se não achar.' },
      categoria: { type: 'string', enum: [...ids, ''] },
      resumo: { type: 'string', description: 'Uma frase curta, em português, dizendo o que é a imagem.' },
      confianca: { type: 'string', enum: ['alta', 'media', 'baixa'] },
    },
    required: ['tipo', 'valor_centavos', 'data', 'estabelecimento', 'categoria', 'resumo', 'confianca'],
    additionalProperties: false,
  };
}

/** Esquema do print de oferta (13/11): loja, preço, parcelas, frete e desconto no Pix de cada oferta visível. */
export function esquemaOfertas() {
  const oferta = {
    type: 'object',
    properties: {
      loja: { type: 'string', description: 'Nome da loja ou marketplace (ex.: Amazon, Mercado Livre, Shopee). Vazio se não aparecer.' },
      preco_centavos: { type: 'integer', description: 'Preço à vista do produto, em centavos. 0 se não achar.' },
      parcelas: { type: 'integer', description: 'Número de parcelas oferecido (ex.: 10). 0 se não aparecer.' },
      parcela_centavos: { type: 'integer', description: 'Valor de cada parcela, em centavos. 0 se não aparecer.' },
      sem_juros: { type: 'boolean' },
      frete_centavos: { type: 'integer', description: 'Frete em centavos. 0 se grátis ou se não aparecer.' },
      frete_gratis: { type: 'boolean' },
      desconto_pix_pct: { type: 'number', description: 'Desconto no Pix/à vista em %, se aparecer. 0 se não.' },
    },
    required: ['loja', 'preco_centavos', 'parcelas', 'parcela_centavos', 'sem_juros', 'frete_centavos', 'frete_gratis', 'desconto_pix_pct'],
    additionalProperties: false,
  };
  return {
    type: 'object',
    properties: {
      produto: { type: 'string', description: 'O produto, curto (ex.: geladeira 400 L). Vazio se não der pra saber.' },
      ofertas: { type: 'array', items: oferta, description: 'Uma por loja visível no print, no máximo 6.' },
    },
    required: ['produto', 'ofertas'],
    additionalProperties: false,
  };
}

async function iaOfertas(req, env) {
  const corpo = await lerCorpo(req);
  const imagem = String(corpo.imagem || '');
  const tipo = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(corpo.tipo) ? corpo.tipo : null;
  if (!imagem || !tipo) throw new ErroHttp(400, 'Mande a imagem (base64) e o tipo.');
  if (imagem.length > MAX_IMAGEM_B64 || !/^[A-Za-z0-9+/=]+$/.test(imagem)) throw new ErroHttp(400, 'Imagem inválida ou grande demais.');
  const client = clienteIA(env);
  await conferirLimite(req, env);
  const r = await client.beta.messages.create({
    model: modelo(env),
    max_tokens: 4000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: esquemaOfertas() } },
    system: 'Você lê prints de ofertas de lojas online no Brasil para um app pessoal que compara preços. Extraia só o que estiver visível no print. Não invente: se não aparecer, use 0, vazio ou false.',
    messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: tipo, data: imagem } }, { type: 'text', text: 'Leia as ofertas deste print.' }] }],
    ...extras(env),
  });
  const texto = textoDa(r);
  if (!texto) throw new ErroHttp(422, 'A IA não conseguiu ler esse print.');
  let dados;
  try { dados = JSON.parse(texto); } catch { throw new ErroHttp(502, 'A IA respondeu num formato inesperado.'); }
  const inteiro = v => (Number.isInteger(v) && v > 0 && v < 10_000_000_00 ? v : 0);
  return {
    produto: String(dados.produto || '').slice(0, 60),
    ofertas: (Array.isArray(dados.ofertas) ? dados.ofertas : []).slice(0, 6).map(o => ({
      loja: String(o?.loja || '').replace(/[<>"'`]/g, '').slice(0, 30),
      preco_centavos: inteiro(o?.preco_centavos),
      parcelas: Number.isInteger(o?.parcelas) && o.parcelas > 0 && o.parcelas <= 48 ? o.parcelas : 0,
      parcela_centavos: inteiro(o?.parcela_centavos),
      sem_juros: o?.sem_juros === true,
      frete_centavos: inteiro(o?.frete_centavos),
      frete_gratis: o?.frete_gratis === true,
      desconto_pix_pct: typeof o?.desconto_pix_pct === 'number' && o.desconto_pix_pct > 0 && o.desconto_pix_pct < 90 ? Math.round(o.desconto_pix_pct * 10) / 10 : 0,
    })).filter(o => o.loja && o.preco_centavos),
  };
}

async function iaImagem(req, env) {
  const corpo = await lerCorpo(req);
  const imagem = String(corpo.imagem || '');
  const tipo = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(corpo.tipo) ? corpo.tipo : null;
  if (!imagem || !tipo) throw new ErroHttp(400, 'Mande a imagem (base64) e o tipo.');
  if (imagem.length > MAX_IMAGEM_B64 || !/^[A-Za-z0-9+/=]+$/.test(imagem)) throw new ErroHttp(400, 'Imagem inválida ou grande demais.');
  const cats = (Array.isArray(corpo.categorias) ? corpo.categorias : [])
    .filter(c => c && /^[a-z_]{1,20}$/.test(c.id)).slice(0, 30)
    .map(c => ({ id: c.id, nome: String(c.nome || c.id).slice(0, 30) }));
  const client = clienteIA(env);
  await conferirLimite(req, env);
  const r = await client.beta.messages.create({
    model: modelo(env),
    max_tokens: 16000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: esquemaImagem(cats.map(c => c.id)) } },
    system: 'Você lê fotos de comprovantes, notas fiscais, faturas e extratos para um app pessoal de controle de gastos no Brasil. Extraia só o que estiver visível. Não invente: se não tiver certeza, use 0, vazio e confiança baixa.',
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: tipo, data: imagem } },
        { type: 'text', text: `Categorias do app (use o id): ${cats.map(c => `${c.id} = ${c.nome}`).join('; ')}. Hoje é ${hojeUTC()}.` },
      ],
    }],
    ...extras(env),
  });
  const texto = textoDa(r);
  if (!texto) throw new ErroHttp(422, 'A IA não conseguiu ler essa imagem.');
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new ErroHttp(502, 'A IA respondeu num formato inesperado.');
  }
  return {
    tipo: dados.tipo,
    valor_centavos: Number.isInteger(dados.valor_centavos) && dados.valor_centavos > 0 ? dados.valor_centavos : 0,
    data: /^\d{4}-\d{2}-\d{2}$/.test(dados.data) ? dados.data : '',
    estabelecimento: String(dados.estabelecimento || '').slice(0, 80),
    categoria: cats.some(c => c.id === dados.categoria) ? dados.categoria : '',
    resumo: String(dados.resumo || '').slice(0, 200),
    confianca: ['alta', 'media', 'baixa'].includes(dados.confianca) ? dados.confianca : 'baixa',
  };
}

// ---------------------------------------------------------------- Push (lembretes)
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlTexto = t => b64url(new TextEncoder().encode(t));

/** JWT do VAPID (ES256), assinado com a chave privada que fica nos segredos. */
export async function jwtVapid(endpoint, env, agora = Math.floor(Date.now() / 1000)) {
  const jwk = typeof env.VAPID_PRIVATE_JWK === 'string' ? JSON.parse(env.VAPID_PRIVATE_JWK) : env.VAPID_PRIVATE_JWK;
  const chave = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const cab = b64urlTexto(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const corpo = b64urlTexto(JSON.stringify({ aud: new URL(endpoint).origin, exp: agora + 12 * 3600, sub: env.VAPID_CONTATO || 'mailto:troque@exemplo.com' }));
  const assinatura = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chave, new TextEncoder().encode(`${cab}.${corpo}`));
  return `${cab}.${corpo}.${b64url(assinatura)}`;
}

function endpointValido(ep) {
  try {
    const u = new URL(ep);
    return u.protocol === 'https:' && PUSH_HOSTS.some(rx => rx.test(u.hostname));
  } catch {
    return false;
  }
}

async function pushInscrever(req, env) {
  if (!env.CARTEIRA_KV) throw new ErroHttp(503, 'Lembretes não configurados no servidor.');
  const corpo = await lerCorpo(req);
  const ep = corpo.inscricao && corpo.inscricao.endpoint;
  if (!endpointValido(ep)) throw new ErroHttp(400, 'Inscrição de push inválida.');
  const hora = /^([01]\d|2[0-3]):[0-5]\d$/.test(corpo.hora) ? corpo.hora : '20:30';
  let fuso = String(corpo.fuso || 'America/Sao_Paulo');
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: fuso });
  } catch {
    fuso = 'America/Sao_Paulo';
  }
  await env.CARTEIRA_KV.put(`sub:${await sha256(ep)}`, JSON.stringify({ endpoint: ep, hora, fuso, ultimo: '' }));
  return { ok: true, hora };
}

async function pushSair(req, env) {
  const corpo = await lerCorpo(req);
  if (env.CARTEIRA_KV && corpo.endpoint) await env.CARTEIRA_KV.delete(`sub:${await sha256(String(corpo.endpoint))}`);
  return { ok: true };
}

/** Data e hora local de um fuso: { dia: "AAAA-MM-DD", minutos } */
export function agoraNoFuso(fuso, data = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(data).map(x => [x.type, x.value]));
  return { dia: `${p.year}-${p.month}-${p.day}`, minutos: Number(p.hour) * 60 + Number(p.minute) };
}

/** Deve lembrar agora? Depois do horário escolhido, uma vez por dia (no fuso da pessoa). */
export function deveLembrar(sub, data = new Date()) {
  const { dia, minutos } = agoraNoFuso(sub.fuso, data);
  const [h, m] = sub.hora.split(':').map(Number);
  return sub.ultimo !== dia && minutos >= h * 60 + m ? dia : null;
}

async function mandarLembretes(env, data = new Date()) {
  if (!env.CARTEIRA_KV || !env.VAPID_PRIVATE_JWK || !env.VAPID_PUBLIC_KEY) return { enviados: 0 };
  let cursor;
  let enviados = 0;
  do {
    const lista = await env.CARTEIRA_KV.list({ prefix: 'sub:', cursor });
    cursor = lista.list_complete ? undefined : lista.cursor;
    for (const k of lista.keys) {
      const sub = JSON.parse((await env.CARTEIRA_KV.get(k.name)) || 'null');
      if (!sub) continue;
      const dia = deveLembrar(sub, data);
      if (!dia) continue;
      const r = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          authorization: `vapid t=${await jwtVapid(sub.endpoint, env)}, k=${env.VAPID_PUBLIC_KEY}`,
          ttl: '43200', urgency: 'normal', 'content-length': '0',
        },
      });
      if (r.status === 404 || r.status === 410) {
        await env.CARTEIRA_KV.delete(k.name); // inscrição não existe mais (app desinstalado etc.)
      } else if (r.ok) {
        await env.CARTEIRA_KV.put(k.name, JSON.stringify({ ...sub, ultimo: dia }));
        enviados++;
      }
    }
  } while (cursor);
  return { enviados };
}

// ---------------------------------------------------------------- Mercado (todo dia útil às 10h, Brasília)
// Fontes públicas e gratuitas. Se uma falhar, as outras seguem (o resumo diz o que veio).
const FONTES = {
  moedas: 'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,ARS-BRL,BTC-BRL',
  historico: m => `https://economia.awesomeapi.com.br/json/daily/${m}-BRL/21`,
  ibov: 'https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?range=2mo&interval=1d',
  sgs: (serie, n = 1) => `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/${n}?formato=json`,
};
const SERIES_BC = { selic: 432, cdi: 4389, ipca12: 13522 };

async function baixarJson(url, f) {
  const r = await f(url, { headers: { accept: 'application/json', 'user-agent': 'CarteiraJF/1.0 (app pessoal de finanças)' } });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

/** Busca tudo e monta o resumo. `f` = fetch (trocado nos testes). */
export async function buscarMercado(f = fetch, agora = new Date()) {
  const resumo = { atualizadoEm: agora.toISOString(), fonte: 'AwesomeAPI, Yahoo Finance e Banco Central', moedas: {}, falhas: [] };
  try {
    const ult = await baixarJson(FONTES.moedas, f);
    await Promise.all(Object.keys(MOEDAS).map(async m => {
      const q = ult[`${m}BRL`];
      if (!q) return;
      let serie = [];
      try {
        const h = await baixarJson(FONTES.historico(m), f);
        serie = h.map(x => Number(x.bid)).reverse(); // a API devolve do mais novo pro mais velho
      } catch { /* sem histórico: só o valor do dia */ }
      const a = analisarSerie(serie, { atual: Number(q.bid) });
      if (a) resumo.moedas[m] = { ...MOEDAS[m], ...a, varDia: Number(q.pctChange) || a.varDia, em: q.create_date };
    }));
  } catch (e) { resumo.falhas.push(`moedas (${e.message})`); }
  try {
    const y = await baixarJson(FONTES.ibov, f);
    const closes = (y.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter(Number.isFinite);
    const atual = y.chart?.result?.[0]?.meta?.regularMarketPrice;
    const a = analisarSerie(closes, { atual: Number.isFinite(atual) ? atual : undefined });
    if (a) resumo.ibov = { nome: 'Ibovespa', ...a };
    else resumo.falhas.push('ibovespa (sem dados)');
  } catch (e) { resumo.falhas.push(`ibovespa (${e.message})`); }
  await Promise.all(Object.entries(SERIES_BC).map(async ([k, serie]) => {
    try {
      const [x] = await baixarJson(FONTES.sgs(serie), f);
      resumo[k] = { valor: Number(String(x.valor).replace(',', '.')), data: x.data };
    } catch (e) { resumo.falhas.push(`${k} (${e.message})`); }
  }));
  return resumo;
}

export function horaDeAtualizar(agora = new Date()) {
  const { dia, minutos } = agoraNoFuso('America/Sao_Paulo', agora);
  const semana = new Date(`${dia}T12:00:00Z`).getUTCDay();
  return { dia, pode: semana >= 1 && semana <= 5 && minutos >= 10 * 60 + 5 };
}

/** Atualiza o mercado uma vez por dia útil, depois das 10h05 (o cron chama de 15 em 15 min). */
async function atualizarMercadoSeHora(env, agora = new Date(), f = fetch) {
  if (!env.CARTEIRA_KV) return null;
  const { dia, pode } = horaDeAtualizar(agora);
  if (!pode || (await env.CARTEIRA_KV.get('mercado:dia')) === dia) return null;
  const resumo = await buscarMercado(f, agora);
  if (Object.keys(resumo.moedas).length || resumo.ibov || resumo.selic) {
    await env.CARTEIRA_KV.put('mercado:resumo', JSON.stringify(resumo));
    await env.CARTEIRA_KV.put('mercado:dia', dia);
  }
  return resumo;
}

async function mercadoRota(env, f = fetch) {
  if (!env.CARTEIRA_KV) throw new ErroHttp(503, 'Mercado não configurado no servidor.');
  let resumo = JSON.parse((await env.CARTEIRA_KV.get('mercado:resumo')) || 'null');
  // primeira vez (ainda sem dado): tenta buscar agora, no máximo uma vez por hora
  if (!resumo && !(await env.CARTEIRA_KV.get('mercado:tentativa'))) {
    await env.CARTEIRA_KV.put('mercado:tentativa', '1', { expirationTtl: 3600 });
    resumo = await buscarMercado(f);
    if (Object.keys(resumo.moedas).length || resumo.ibov) await env.CARTEIRA_KV.put('mercado:resumo', JSON.stringify(resumo));
  }
  if (!resumo) throw new ErroHttp(503, 'Ainda sem dados do mercado. Tenta de novo mais tarde.');
  return resumo;
}

// ---------------------------------------------------------------- conta e sincronização (06/11)
// A conta é apelido + senha. A senha nunca é guardada: só um hash PBKDF2 (SHA-256, 100 mil voltas) com sal aleatório.
// A sessão é um token aleatório; o servidor guarda só o hash dele. Os dados da carteira ficam em dados:{apelido}.
// KV é aproximado: duas gravações no mesmo segundo de aparelhos diferentes podem precisar de mais um sync pra acertar.

const ITERACOES = 100_000;
const SESSAO_DIAS = 90;
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const deHex = t => new Uint8Array(String(t).match(/../g).map(h => parseInt(h, 16)));

async function hashSenha(senha, salHex) {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: deHex(salHex), iterations: ITERACOES }, chave, 256);
  return hex(bits);
}

function igual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function precisaKV(env) {
  if (!env.CARTEIRA_KV) throw new ErroHttp(503, 'Servidor sem o armazenamento (CARTEIRA_KV). A conta fica desligada até configurar.');
}

/** Limite de tentativas de login/criação por endereço (contra quem tenta adivinhar senha). */
async function limiteTentativas(req, env, apelido) {
  const hora = new Date().toISOString().slice(0, 13);
  const kIp = `tent:${hora}:${await sha256(req.headers.get('cf-connecting-ip') || 'sem-ip')}`;
  const kAp = `tent:${hora}:a:${apelido}`;
  const [nIp, nAp] = await Promise.all([env.CARTEIRA_KV.get(kIp), env.CARTEIRA_KV.get(kAp)]);
  if (Number(nIp || 0) >= 20 || Number(nAp || 0) >= 10) throw new ErroHttp(429, 'Muitas tentativas. Espera um pouco e tenta de novo.');
  await Promise.all([
    env.CARTEIRA_KV.put(kIp, String(Number(nIp || 0) + 1), { expirationTtl: 7200 }),
    env.CARTEIRA_KV.put(kAp, String(Number(nAp || 0) + 1), { expirationTtl: 7200 }),
  ]);
}

function lerCredenciais(corpo) {
  const apelido = normalizarApelido(corpo.apelido);
  if (!apelido) throw new ErroHttp(400, 'Apelido de 2 a 30 letras ou números (pode ponto, traço e sublinhado).');
  // Ponta a ponta (07/11): o app manda uma "senha de acesso" tirada da senha de verdade, que nunca sai do aparelho.
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  if (!ACESSO_RE.test(senha)) throw new ErroHttp(400, 'Atualize o app pra entrar na conta (agora a senha fica só no seu aparelho).');
  return { apelido, senha };
}

async function novaSessao(env, apelido) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  await env.CARTEIRA_KV.put(`sessao:${await sha256(token)}`, JSON.stringify({ apelido, criada: Date.now() }), { expirationTtl: SESSAO_DIAS * 86400 });
  return { apelido, token };
}

async function contaCriar(req, env) {
  precisaKV(env);
  const corpo = await lerCorpo(req);
  const { apelido, senha } = lerCredenciais(corpo);
  await limiteTentativas(req, env, apelido);
  if (await env.CARTEIRA_KV.get(`conta:${apelido}`)) throw new ErroHttp(409, 'Esse apelido já tem conta. Se for seu, toque em Entrar.');
  const sal = hex(crypto.getRandomValues(new Uint8Array(16)));
  await env.CARTEIRA_KV.put(`conta:${apelido}`, JSON.stringify({ apelido, sal, hash: await hashSenha(senha, sal), iteracoes: ITERACOES, criada: Date.now() }));
  return novaSessao(env, apelido);
}

async function contaEntrar(req, env) {
  precisaKV(env);
  const corpo = await lerCorpo(req);
  const { apelido, senha } = lerCredenciais(corpo);
  await limiteTentativas(req, env, apelido);
  const conta = JSON.parse((await env.CARTEIRA_KV.get(`conta:${apelido}`)) || 'null');
  // mesma mensagem pra apelido que não existe e senha errada (não entrega quem tem conta)
  if (!conta || !igual(await hashSenha(senha, conta.sal), conta.hash)) throw new ErroHttp(401, 'Apelido ou senha não conferem.');
  // selo de criador (12/11): só pra conta na lista CRIADOR_CONTAS (variável do Cloudflare), nunca pelo nome digitado
  const criador = String(env.CRIADOR_CONTAS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean).includes(apelido);
  return { ...(await novaSessao(env, apelido)), ...(criador ? { criador: true } : {}) };
}

async function sessaoDe(req, env) {
  precisaKV(env);
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.get('authorization') || '');
  if (!m) throw new ErroHttp(401, 'Entre na sua conta de novo.');
  const chave = `sessao:${await sha256(m[1])}`;
  const s = JSON.parse((await env.CARTEIRA_KV.get(chave)) || 'null');
  if (!s?.apelido) throw new ErroHttp(401, 'Sessão expirada. Entre na sua conta de novo.');
  return { ...s, chave };
}

async function contaSair(req, env) {
  const s = await sessaoDe(req, env);
  await env.CARTEIRA_KV.delete(s.chave);
  return { ok: true };
}

async function sincronizar(req, env) {
  const s = await sessaoDe(req, env);
  const corpo = await lerCorpo(req);
  const desde = Number.isInteger(corpo.desde) && corpo.desde >= 0 ? corpo.desde : 0;
  const mudancas = Array.isArray(corpo.mudancas) ? corpo.mudancas : [];
  if (mudancas.length > LIMITE_MUDANCAS) throw new ErroHttp(413, 'Mudanças demais de uma vez.');
  // nada de dado aberto no servidor: registro tem que vir embaralhado pelo app (ou ser um "apagado")
  if (mudancas.some(m => m && typeof m === 'object' && 'rec' in m && !recCifrado(m.rec))) {
    throw new ErroHttp(400, 'Os dados precisam chegar embaralhados. Atualize o app.');
  }
  const chave = `dados:${s.apelido}`;
  const atual = JSON.parse((await env.CARTEIRA_KV.get(chave)) || 'null') || estadoVazio();
  const { estado, aceitas } = mesclar(atual, mudancas);
  if (aceitas) await env.CARTEIRA_KV.put(chave, JSON.stringify(estado));
  // se o aparelho diz que viu uma versão maior que a do servidor (conta recriada, servidor zerado), manda tudo
  const base = desde > estado.versao ? 0 : desde;
  return { versao: estado.versao, aceitas, mudancas: mudancasDesde(estado, base) };
}

// ---------------------------------------------------------------- roteador
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    try {
      if (req.method === 'GET' && url.pathname === '/saude') {
        return json({ ok: true, ia: !!env.ANTHROPIC_API_KEY, push: !!(env.VAPID_PRIVATE_JWK && env.VAPID_PUBLIC_KEY) }, 200, h);
      }
      // Daqui pra baixo, só o app (nos endereços de ORIGENS) pode chamar
      if (!h['access-control-allow-origin']) {
        throw new ErroHttp(origensPermitidas(env).length ? 403 : 503,
          origensPermitidas(env).length ? 'Origem não autorizada.' : 'Configure ORIGENS no wrangler.toml com o endereço do app.');
      }
      if (req.method === 'GET' && url.pathname === '/mercado') return json(await mercadoRota(env), 200, h);
      if (req.method === 'GET' && url.pathname === '/push/chave') {
        if (!env.VAPID_PUBLIC_KEY) throw new ErroHttp(503, 'Lembretes não configurados no servidor.');
        return json({ chave: env.VAPID_PUBLIC_KEY }, 200, h);
      }
      if (req.method === 'POST') {
        const rotas = { '/ia/perguntar': iaPerguntar, '/ia/imagem': iaImagem, '/ia/ofertas': iaOfertas, '/ia/explicar': iaExplicar, '/ia/bancos': iaBancos, '/push/inscrever': pushInscrever, '/push/sair': pushSair,
          '/conta/criar': contaCriar, '/conta/entrar': contaEntrar, '/conta/sair': contaSair, '/sync': sincronizar };
        const rota = rotas[url.pathname];
        if (rota) return json(await rota(req, env), 200, h);
      }
      throw new ErroHttp(404, 'Rota não encontrada.');
    } catch (e) {
      if (e instanceof ErroHttp) return json({ erro: e.message }, e.status, h);
      if (e instanceof Anthropic.RateLimitError) return json({ erro: 'A IA está ocupada. Tenta de novo em instantes.' }, 429, h);
      if (e instanceof Anthropic.AuthenticationError) return json({ erro: 'Chave da IA inválida no servidor.' }, 503, h);
      if (e instanceof Anthropic.APIError) return json({ erro: `A IA respondeu com erro (${e.status}).` }, 502, h);
      console.error(e);
      return json({ erro: 'Erro no servidor.' }, 500, h);
    }
  },

  async scheduled(_evento, env, ctx) {
    ctx.waitUntil(Promise.allSettled([mandarLembretes(env), atualizarMercadoSeHora(env)]));
  },
};

export { mandarLembretes, endpointValido, atualizarMercadoSeHora, mercadoRota };
