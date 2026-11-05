// Gera o par de chaves dos lembretes (VAPID). Rode UMA vez:  node ferramentas/gerar_vapid.js
// · a chave PÚBLICA vai no wrangler.toml (VAPID_PUBLIC_KEY);
// · a chave PRIVADA vai SÓ nos segredos do Cloudflare:  npx wrangler secret put VAPID_PRIVATE_JWK
// Não cole a privada em arquivo do repositório nem no chat.

const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const raw = new Uint8Array(await crypto.subtle.exportKey('raw', publicKey));
const pub = Buffer.from(raw).toString('base64url');
const jwk = await crypto.subtle.exportKey('jwk', privateKey);

console.log('\nChave PÚBLICA (cole em VAPID_PUBLIC_KEY no servidor/wrangler.toml):\n');
console.log(pub);
console.log('\nChave PRIVADA (só no segredo; rode "npx wrangler secret put VAPID_PRIVATE_JWK" dentro de servidor/ e cole a linha abaixo):\n');
console.log(JSON.stringify(jwk));
console.log('');
