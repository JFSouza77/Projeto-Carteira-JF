// Voz natural do C.A.O.S. (Microsoft Azure) na Carteira (JF, 17/11: "vamos ligar a voz dele na Azure igual fiz no
// Perfil com a ajuda do Code"). Copiado do Perfil (servidor/worker.js, 1.7.10.x, e docs/CAOS_Anatomia/05_Voz.md) sem
// mudar a lógica: duas vozes na ordem ("mai", mais natural e paga, opcional; "padrao", grátis), SSML com a emoção,
// cache das falas e teto de letras por mês. Diferença da Carteira: o cache e o teto ficam no CARTEIRA_KV (no Perfil
// é o storage do Durable Object), e o ritmo por endereço fica em memória.
// Segredos (só no Cloudflare, nunca no código): AZURE_SPEECH_KEY + AZURE_SPEECH_REGION (grátis) e, opcional,
// AZURE_MAI_KEY + AZURE_MAI_REGION. Variáveis: AZURE_VOZ, AZURE_MAI_VOZ, AZURE_ESTILOS, VOZ_TETO_MES.

// [volume, pausa do "…" em ms, estilo da Microsoft (só nas vozes com estilos), ajuste de velocidade em %]
// (tabela do Perfil, C.A.O.S. 4.1.4: dia a dia normal, sem "ator de novela")
export const VOZ_EMOCOES = {
  calmo: ['+0%', 380, 'neutral', 0],
  orgulho: ['+8%', 320, 'joyful', 0],
  raiva: ['+15%', 260, 'angry', 0],
  furia: ['+22%', 220, 'shouting', 0],
  deboche: ['+4%', 470, 'neutral', -3],
  tedio: ['-10%', 650, '', 0],
  carinho: ['-6%', 420, 'softvoice', 0],
  desafio: ['+10%', 300, 'determined', 0],
  pensando: ['-4%', 600, 'confused', 0],
  preocupado: ['+0%', 380, 'fearful', 0],
  festa: ['+15%', 260, 'excited', 0],
  surpresa: ['+12%', 300, 'surprised', 0],
  triste: ['-12%', 650, 'sad', 0],
  julgando: ['-3%', 520, '', 0],
  espiando: ['-18%', 500, 'whispering', 0],
  recompondo: ['-3%', 300, 'neutral', 8],
  medo: ['+5%', 280, 'fearful', 0],
  ansiedade: ['+5%', 260, 'fearful', 5],
  vergonha: ['-8%', 480, 'embarrassed', -5],
  nojo: ['+0%', 450, 'disgusted', 0],
  nostalgia: ['-6%', 560, 'neutral', -5],
  alivio: ['-3%', 340, 'neutral', 5],
};
// mudou a tabela ou o SSML? Suba, senão o cache devolve a voz antiga
export const VOZ_SSML_VERSAO = 2; // 2 (25/11): velocidade 1,2 e dia a dia em calmo (o cache da voz cansada não volta)

/** Texto já limpo (sem < > & ") → SSML, igual ao Perfil. */
export function vozSsml(nome, t, rateN, pitch, e, estilos) {
  const [vol, pausa, estilo, dRate] = VOZ_EMOCOES[e] || VOZ_EMOCOES.calmo;
  const rn = Math.round((Number(rateN) || 0) + (dRate || 0)), rate = (rn >= 0 ? '+' : '') + rn + '%';
  if (!/[.!?…]$/.test(t)) t += '.'; // sem ponto no fim, a voz às vezes "solta o ar"
  let corpo = t
    .replace(/^(ah+|hm+|hum+|u[eé]|ops|opa|uau|eita|nossa|vish|oxe|aff)([,!.]?)\s+(?!⏸)/i, (m, a, pt) => `${a}${pt || ','}<break time="220ms"/> `)
    .replace(/\s*⏸\s*/g, `<break time="${pausa}ms"/> `)
    .replace(/\p{L}*(\p{L})\1{2,}\p{L}*/gu, w => `<prosody rate="-15%" volume="+20%">${w.replace(/(\p{L})\1{2,}/gu, '$1').toLowerCase()}</prosody>`)
    .replace(/(^|[^\p{L}])(\p{Lu}{4,})(?![\p{L}])/gu, (m, a, w) => `${a}<prosody volume="+25%"${estilos ? '' : ' pitch="+8%"'}>${w.toLowerCase()}</prosody>`);
  corpo = `<prosody rate="${rate}"${estilos ? '' : ` pitch="${pitch}"`} volume="${vol}">${corpo}</prosody>`;
  if (estilos && estilo) corpo = `<mstts:express-as style="${estilo}">${corpo}</mstts:express-as>`;
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="pt-BR"><voice name="${nome}">${corpo}</voice></speak>`;
}

/** Vozes do servidor, na ordem de tentativa ("mai" primeiro, se tiver; a "padrao" é a reserva). */
export function vozesDoServidor(env) {
  const url = (reg, teste) => teste || `https://${String(reg).replace(/[^a-z0-9]/g, '')}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const nome = (n, pad) => String(n || pad).replace(/[^A-Za-z0-9:.-]/g, '');
  const out = [];
  if (env.AZURE_MAI_KEY && env.AZURE_MAI_REGION)
    out.push({ id: 'mai', chave: env.AZURE_MAI_KEY, url: url(env.AZURE_MAI_REGION, env.AZURE_MAI_URL), nome: nome(env.AZURE_MAI_VOZ, 'pt-BR-Caio:MAI-Voice-2.1-Flash'), estilos: true });
  if (env.AZURE_SPEECH_KEY && env.AZURE_SPEECH_REGION)
    out.push({ id: 'padrao', chave: env.AZURE_SPEECH_KEY, url: url(env.AZURE_SPEECH_REGION, env.AZURE_URL), nome: nome(env.AZURE_VOZ, 'pt-BR-AntonioNeural'), estilos: !!env.AZURE_ESTILOS && env.AZURE_ESTILOS !== '0' });
  return out;
}

export function vozEstado(env) {
  const v = vozesDoServidor(env);
  return { ligada: v.length > 0, vozes: v.map(x => x.id) }; // só os nomes (mai, padrao), nunca as chaves
}

// em memória (uma pessoa por app): voz principal fora do ar e ritmo por endereço
const vozFora = {};
const ritmoVoz = new Map();
const json = (dados, status, h) => new Response(JSON.stringify(dados), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...h } });

/** POST /voz { t, r, p, e } → MP3 (ou JSON de erro; aí o app fala com a voz do aparelho). */
export async function vozFalar(req, env, h = {}) {
  const vozes = vozesDoServidor(env);
  if (!vozes.length) return json({ erro: 'Voz natural não configurada no servidor.' }, 503, h);
  let d;
  try {
    const bruto = await req.text();
    if (bruto.length > 4000) return json({ erro: 'grande' }, 413, h);
    d = JSON.parse(bruto);
  } catch {
    return json({ erro: 'json' }, 400, h);
  }
  const t = String(d?.t || '').replace(/[\u0000-\u001f<>&"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
  if (!t) return json({ erro: 'vazio' }, 400, h);
  const num = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(+v) ? +v : 1));
  const r = Math.round(num(d.r, 0.5, 2) * 20) / 20, p = Math.round(num(d.p, 0.5, 2) * 20) / 20;
  const e = Object.prototype.hasOwnProperty.call(VOZ_EMOCOES, d.e) ? d.e : '';
  const kv = env.CARTEIRA_KV;
  // x-voz exposto (17/11): o "Testar a voz" do app mostra qual voz respondeu
  const mp3 = (dados, origem) => new Response(dados, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=604800', 'x-voz': origem, 'access-control-expose-headers': 'x-voz', ...h } });
  const chaveDe = async v => {
    const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode([v.nome, r, p, t, e, v.estilos ? 1 : 0, VOZ_SSML_VERSAO].join('|')));
    return 'voz:' + [...new Uint8Array(dig)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
  };
  const agora = Date.now();
  const pausa = Number(env.VOZ_PAUSA_MS) > 0 ? Number(env.VOZ_PAUSA_MS) : 600e3;
  const ativas = vozes.filter((v, i) => i === vozes.length - 1 || !(agora - (vozFora[v.id] || 0) < pausa));
  // a mesma fala, do mesmo jeito, volta do cache (as falas se repetem muito: não gasta o Azure de novo)
  if (kv) for (const v of ativas) {
    const g = await kv.get(await chaveDe(v), 'arrayBuffer');
    if (g) return mp3(g, 'guardada');
  }
  const ip = req.headers.get('cf-connecting-ip') || 'x';
  const rv = (ritmoVoz.get(ip) || []).filter(x => agora - x < 3600e3);
  if (rv.length >= 400) return json({ erro: 'calma' }, 429, h);
  rv.push(agora);
  ritmoVoz.set(ip, rv);
  // teto do mês em letras (padrão 100 mil: com os 400 mil do Perfil, cabe nas 500 mil grátis do Azure, se a conta for a mesma)
  const mes = new Date().toISOString().slice(0, 7);
  const teto = Number(env.VOZ_TETO_MES) > 0 ? Number(env.VOZ_TETO_MES) : 100000;
  const gasto = kv ? Number(await kv.get(`voz:mes:${mes}`)) || 0 : 0;
  if (gasto + t.length > teto) return json({ erro: 'teto' }, 429, h);
  const pct = (x, k) => (x >= 1 ? '+' : '') + Math.round((x - 1) * k) + '%';
  let ultimo = 0;
  for (const v of ativas) {
    let az = null;
    try {
      az = await fetch(v.url, {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': v.chave, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'carteira-jf' },
        body: vozSsml(v.nome, t, Math.round((r - 1) * 100), pct(p, 40), e, v.estilos),
      });
    } catch { az = null; }
    if (!az || !az.ok) {
      ultimo = az ? az.status : 0;
      vozFora[v.id] = agora;
      continue;
    }
    const dados = await az.arrayBuffer();
    if (kv) {
      await kv.put(`voz:mes:${mes}`, String(gasto + t.length), { expirationTtl: 40 * 86400 });
      if (dados.byteLength > 0 && dados.byteLength < 1900000) await kv.put(await chaveDe(v), dados, { expirationTtl: 30 * 86400 });
    }
    return mp3(dados, 'nova:' + v.id);
  }
  return json({ erro: 'azure', status: ultimo }, 502, h);
}

/** Só pros testes: limpa o que fica em memória. */
export function _zerarVoz() {
  for (const k of Object.keys(vozFora)) delete vozFora[k];
  ritmoVoz.clear();
}
