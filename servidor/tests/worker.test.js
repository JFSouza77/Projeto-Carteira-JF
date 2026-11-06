import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { jwtVapid, deveLembrar, agoraNoFuso, endpointValido, mandarLembretes, esquemaImagem } from '../worker.js';

// Tudo de mentira: chave falsa, API simulada (fetch trocado), nada sai pra internet.
const ORIGEM = 'https://carteira.exemplo.dev';
function kv() {
  const m = new Map();
  return {
    m,
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, v); },
    async delete(k) { m.delete(k); },
    async list({ prefix }) { return { keys: [...m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
}
const envBase = () => ({ ORIGENS: ORIGEM, ANTHROPIC_API_KEY: 'chave-de-mentira', CARTEIRA_KV: kv(), IA_LIMITE_DIA: '2', IA_TETO_DIA: '100' });
const req = (rota, corpo, origem = ORIGEM) => new Request(`https://srv.exemplo${rota}`, {
  method: corpo ? 'POST' : 'GET', headers: { origin: origem, 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4' },
  body: corpo ? JSON.stringify(corpo) : undefined,
});

function simularAPI(resposta) {
  const chamadas = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url instanceof Request ? url.url : url);
    if (u.includes('api.anthropic.com')) {
      const headers = new Headers(init?.headers || (url instanceof Request ? url.headers : {}));
      chamadas.push({ url: u, headers, body: JSON.parse(init?.body || '{}') });
      return new Response(JSON.stringify({
        id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: resposta.stop_reason || 'end_turn',
        content: [{ type: 'text', text: resposta.texto }], usage: { input_tokens: 1, output_tokens: 1 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return original(url, init);
  };
  return { chamadas, restaurar: () => { globalThis.fetch = original; } };
}

test('saúde mostra o que está configurado, sem revelar chave', async () => {
  const r = await worker.fetch(req('/saude'), envBase());
  const j = await r.json();
  assert.deepEqual(j, { ok: true, ia: true, push: false });
});

test('origem fora da lista é barrada', async () => {
  const r = await worker.fetch(req('/ia/perguntar', { pergunta: 'oi' }, 'https://malandro.exemplo'), envBase());
  assert.equal(r.status, 403);
});

test('pergunta vai com o modelo, o fallback e SÓ o resumo agregado', async () => {
  const api = simularAPI({ texto: 'Você gastou R$ 100,00.' });
  try {
    const env = envBase();
    const r = await worker.fetch(req('/ia/perguntar', { pergunta: 'como estou?', humor: 'acido', resumo: { gastoTotalCentavos: 10000 } }), env);
    assert.equal(r.status, 200);
    assert.equal((await r.json()).texto, 'Você gastou R$ 100,00.');
    assert.equal(r.headers.get('access-control-allow-origin'), ORIGEM);
    const c = api.chamadas[0];
    assert.equal(c.body.model, 'claude-opus-5-5');
    assert.equal(c.body.fallbacks, 'default');
    assert.match(c.headers.get('anthropic-beta') || '', /server-side-fallback-2026-07-01/);
    assert.equal(c.body.output_config.effort, 'low');
    assert.match(c.body.messages[0].content, /gastoTotalCentavos/);
  } finally {
    api.restaurar();
  }
});

test('limite diário por endereço', async () => {
  const api = simularAPI({ texto: 'ok' });
  try {
    const env = envBase();
    for (let i = 0; i < 2; i++) assert.equal((await worker.fetch(req('/ia/perguntar', { pergunta: 'oi' }), env)).status, 200);
    assert.equal((await worker.fetch(req('/ia/perguntar', { pergunta: 'oi' }), env)).status, 429);
  } finally {
    api.restaurar();
  }
});

test('recusa da IA vira resposta educada', async () => {
  const api = simularAPI({ texto: '', stop_reason: 'refusal' });
  try {
    const j = await (await worker.fetch(req('/ia/perguntar', { pergunta: 'x' }), envBase())).json();
    assert.match(j.texto, /não posso/i);
  } finally {
    api.restaurar();
  }
});

test('imagem: pede JSON no esquema e devolve campos limpos', async () => {
  const api = simularAPI({ texto: JSON.stringify({ tipo: 'nota_fiscal', valor_centavos: 4590, data: '2026-11-04', estabelecimento: 'Mercado Exemplo', categoria: 'mercado', resumo: 'Nota do mercado.', confianca: 'alta' }) });
  try {
    const r = await worker.fetch(req('/ia/imagem', { imagem: 'aGVsbG8=', tipo: 'image/jpeg', categorias: [{ id: 'mercado', nome: 'Mercado' }, { id: 'X; DROP', nome: 'ruim' }] }), envBase());
    const j = await r.json();
    assert.equal(j.valor_centavos, 4590);
    assert.equal(j.categoria, 'mercado');
    const c = api.chamadas[0];
    assert.equal(c.body.output_config.format.type, 'json_schema');
    assert.deepEqual(c.body.output_config.format.schema.properties.categoria.enum, ['mercado', '']);
    assert.equal(c.body.messages[0].content[0].source.media_type, 'image/jpeg');
  } finally {
    api.restaurar();
  }
  assert.equal(esquemaImagem([]).additionalProperties, false);
});

test('push: só aceita serviços de push conhecidos', () => {
  assert.ok(endpointValido('https://fcm.googleapis.com/fcm/send/abc'));
  assert.ok(endpointValido('https://web.push.apple.com/QWER'));
  assert.ok(!endpointValido('http://fcm.googleapis.com/x'));
  assert.ok(!endpointValido('https://169.254.169.254/latest'));
  assert.ok(!endpointValido('https://exemplo.com/push'));
});

test('push: JWT do VAPID é assinado e confere com a chave pública', async () => {
  const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const env = { VAPID_PRIVATE_JWK: JSON.stringify(await crypto.subtle.exportKey('jwk', par.privateKey)), VAPID_CONTATO: 'mailto:teste@exemplo.dev' };
  const jwt = await jwtVapid('https://web.push.apple.com/abc', env, 1_000_000);
  const [c, p, s] = jwt.split('.');
  const claims = JSON.parse(Buffer.from(p, 'base64url'));
  assert.deepEqual(claims, { aud: 'https://web.push.apple.com', exp: 1_000_000 + 43200, sub: 'mailto:teste@exemplo.dev' });
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, par.publicKey, Buffer.from(s, 'base64url'), new TextEncoder().encode(`${c}.${p}`));
  assert.ok(ok);
});

test('push: lembra depois do horário, uma vez por dia, no fuso da pessoa', () => {
  // 23:40 UTC = 20:40 em São Paulo
  const d = new Date(Date.UTC(2026, 10, 5, 23, 40));
  assert.deepEqual(agoraNoFuso('America/Sao_Paulo', d), { dia: '2026-11-05', minutos: 20 * 60 + 40 });
  assert.equal(deveLembrar({ hora: '20:30', fuso: 'America/Sao_Paulo', ultimo: '' }, d), '2026-11-05');
  assert.equal(deveLembrar({ hora: '21:00', fuso: 'America/Sao_Paulo', ultimo: '' }, d), null);
  assert.equal(deveLembrar({ hora: '20:30', fuso: 'America/Sao_Paulo', ultimo: '2026-11-05' }, d), null);
});

test('push: cron manda o toque vazio e apaga inscrição que sumiu', async () => {
  const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const env = { CARTEIRA_KV: kv(), VAPID_PUBLIC_KEY: 'PUB', VAPID_PRIVATE_JWK: JSON.stringify(await crypto.subtle.exportKey('jwk', par.privateKey)) };
  await env.CARTEIRA_KV.put('sub:a', JSON.stringify({ endpoint: 'https://fcm.googleapis.com/a', hora: '20:00', fuso: 'America/Sao_Paulo', ultimo: '' }));
  await env.CARTEIRA_KV.put('sub:b', JSON.stringify({ endpoint: 'https://fcm.googleapis.com/b', hora: '20:00', fuso: 'America/Sao_Paulo', ultimo: '' }));
  const enviados = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    enviados.push({ url, init });
    return new Response(null, { status: String(url).endsWith('/b') ? 410 : 201 });
  };
  try {
    const r = await mandarLembretes(env, new Date(Date.UTC(2026, 10, 5, 23, 40)));
    assert.equal(r.enviados, 1);
    assert.equal(enviados[0].init.body, undefined); // sem conteúdo: o servidor não sabe nada dos gastos
    assert.match(enviados[0].init.headers.authorization, /^vapid t=.+, k=PUB$/);
    assert.equal(JSON.parse(env.CARTEIRA_KV.m.get('sub:a')).ultimo, '2026-11-05');
    assert.ok(!env.CARTEIRA_KV.m.has('sub:b'));
  } finally {
    globalThis.fetch = original;
  }
});

test('a IA online usa a mesma identidade do C.A.O.S. do app', async () => {
  const { SISTEMA_CONVERSA } = await import('../worker.js');
  assert.match(SISTEMA_CONVERSA, /Central de Análises e Observações Sistêmicas/);
  assert.match(SISTEMA_CONVERSA, /criado por JF/);
  assert.match(SISTEMA_CONVERSA, /Projeto Perfil JF/);
});

test('comparar bancos: só nomes e CDI vão pra IA; responde texto', async () => {
  const api = simularAPI({ texto: 'Pelo que sei, o Nubank paga 100% do CDI. Confira no app.' });
  try {
    const r = await worker.fetch(req('/ia/bancos', { bancos: ['Nubank', 'PicPay'], cdi: 10.65, saldo: 99999 }), envBase());
    assert.equal(r.status, 200);
    assert.match((await r.json()).texto, /Nubank/);
    const conteudo = api.chamadas[0].body.messages[0].content;
    assert.match(conteudo, /Nubank, PicPay/);
    assert.match(conteudo, /10\.65%/);
    assert.doesNotMatch(conteudo, /99999/, 'saldo nunca vai pro servidor da IA');
    assert.match(api.chamadas[0].body.system, /desatualizadas/);
  } finally {
    api.restaurar();
  }
});

// ---------- Revisão do ChatGPT (06/11) ----------
const reqCru = (rota, txt) => new Request(`https://srv.exemplo${rota}`, {
  method: 'POST', headers: { origin: ORIGEM, 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4' }, body: txt,
});

test('JSON que não é objeto (null, lista, número) vira 400, não 500', async () => {
  for (const txt of ['null', '[]', '42', '"oi"', 'true']) {
    for (const rota of ['/ia/perguntar', '/ia/bancos', '/push/inscrever']) {
      const r = await worker.fetch(reqCru(rota, txt), envBase());
      assert.equal(r.status, 400, `${rota} com ${txt}`);
    }
  }
  // objeto vazio também é recusado com 400 (falta a pergunta), não estoura
  const r = await worker.fetch(reqCru('/ia/perguntar', '{}'), envBase());
  assert.equal(r.status, 400);
});

test('corpo grande demais é cortado pela contagem de bytes, mesmo sem content-length', async () => {
  const grande = JSON.stringify({ pergunta: 'é'.repeat(4_000_000) }); // 4 milhões de letras, 8 MB: passava na conta antiga por letras
  const r = await worker.fetch(new Request('https://srv.exemplo/ia/perguntar', {
    method: 'POST', headers: { origin: ORIGEM, 'cf-connecting-ip': '1.2.3.4' },
    body: new Blob([grande]).stream(), duplex: 'half',
  }), envBase());
  assert.equal(r.status, 413);
});

test('sem KV a IA falha fechado (503) e nem chama a API', async () => {
  const api = simularAPI({ texto: 'não devia chegar aqui' });
  try {
    const env = envBase();
    delete env.CARTEIRA_KV;
    const r = await worker.fetch(req('/ia/perguntar', { pergunta: 'como estou?', resumo: {} }), env);
    assert.equal(r.status, 503);
    assert.equal(api.chamadas.length, 0);
  } finally {
    api.restaurar();
  }
});
