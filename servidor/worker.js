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
 *   GET  /push/chave      → { chave } (chave pública VAPID)
 *   POST /push/inscrever  → { inscricao, hora "HH:MM", fuso }
 *   POST /push/sair       → { endpoint }
 *   cron (15 em 15 min)   → manda os lembretes do horário
 *
 * Segredos (npx wrangler secret put NOME): ANTHROPIC_API_KEY, VAPID_PRIVATE_JWK.
 * Variáveis (wrangler.toml): ORIGENS, IA_MODELO, IA_LIMITE_DIA, IA_TETO_DIA, VAPID_PUBLIC_KEY, VAPID_CONTATO.
 * Como publicar: servidor/LEIA-ME.md
 */
import Anthropic from '@anthropic-ai/sdk';
import { resumoIdentidade } from '../js/caos/identidade.js';

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
    'access-control-allow-headers': 'content-type',
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
  const txt = await req.text();
  if (txt.length > MAX_CORPO) throw new ErroHttp(413, 'Conteúdo grande demais.');
  try {
    return JSON.parse(txt);
  } catch {
    throw new ErroHttp(400, 'JSON inválido.');
  }
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
  if (!env.CARTEIRA_KV) return;
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
      if (req.method === 'GET' && url.pathname === '/push/chave') {
        if (!env.VAPID_PUBLIC_KEY) throw new ErroHttp(503, 'Lembretes não configurados no servidor.');
        return json({ chave: env.VAPID_PUBLIC_KEY }, 200, h);
      }
      if (req.method === 'POST') {
        const rotas = { '/ia/perguntar': iaPerguntar, '/ia/imagem': iaImagem, '/push/inscrever': pushInscrever, '/push/sair': pushSair };
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
    ctx.waitUntil(mandarLembretes(env));
  },
};

export { mandarLembretes, endpointValido };
