// Criptografia de ponta a ponta da sincronização (07/11). Camada de navegador (Web Crypto), sem DOM e sem rede.
// A senha da pessoa NUNCA sai do aparelho. Dela saem duas coisas diferentes (PBKDF2-SHA256, 310 mil voltas):
//   · a "senha de acesso", que vai pro servidor no lugar da senha (o servidor ainda faz o hash dele por cima);
//   · a chave AES-GCM de 256 bits, que embaralha cada registro antes de subir e fica só no aparelho.
// Quem tem só a senha de acesso (o servidor) não consegue tirar a chave dela: são metades diferentes da derivação.
// Cada registro embaralhado leva junto "store/id" como dado autenticado: o servidor não consegue trocar um
// registro de lugar nem alterar uma letra sem a abertura falhar.

import { normalizarApelido } from './sincronia.js';

export const VOLTAS = 310_000;
export const VERSAO_CIFRA = 1;
const sutil = () => {
  if (!globalThis.crypto?.subtle) throw new Error('Este navegador não tem criptografia. Atualize o navegador pra usar a conta.');
  return globalThis.crypto.subtle;
};
const enc = new TextEncoder();
const dec = new TextDecoder();

const paraHex = bytes => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
function paraBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function deBase64(txt) {
  const s = atob(txt);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/**
 * Da senha + apelido, tira a senha de acesso (texto, vai pro servidor) e a chave (fica no aparelho).
 * O sal é o apelido normalizado: assim um aparelho novo chega na mesma chave só com apelido e senha.
 */
export async function derivarChaves(apelido, senha, { voltas = VOLTAS } = {}) {
  const ap = normalizarApelido(apelido);
  if (!ap) throw new Error('Apelido inválido.');
  const base = await sutil().importKey('raw', enc.encode(String(senha)), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await sutil().deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(`carteira-jf/e2ee/v1/${ap}`), iterations: voltas }, base, 512));
  const acesso = `e2ee1:${paraHex(bits.subarray(0, 32))}`;
  const chave = await sutil().importKey('raw', bits.subarray(32, 64), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  bits.fill(0);
  return { acesso, chave };
}

const aad = (store, id) => enc.encode(`${store}/${id}`);

/** Registro → { v: 1, d: base64(iv + texto embaralhado) }. Apagado (null) continua null. */
export async function cifrar(chave, store, id, rec) {
  if (rec === null) return null;
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await sutil().encrypt({ name: 'AES-GCM', iv, additionalData: aad(store, id) }, chave, enc.encode(JSON.stringify(rec))));
  const junto = new Uint8Array(iv.length + ct.length);
  junto.set(iv);
  junto.set(ct, iv.length);
  return { v: VERSAO_CIFRA, d: paraBase64(junto) };
}

export const estaCifrado = rec => !!rec && typeof rec === 'object' && rec.v === VERSAO_CIFRA && typeof rec.d === 'string' && Object.keys(rec).length === 2;

/** Abre um registro. Se a chave não confere ou alguém mexeu no bloco, lança erro (nunca devolve lixo). */
export async function decifrar(chave, store, id, rec) {
  if (rec === null) return null;
  if (!estaCifrado(rec)) throw new Error('Registro sem criptografia veio do servidor.');
  const junto = deBase64(rec.d);
  if (junto.length < 13) throw new Error('Registro estragado.');
  try {
    const pt = await sutil().decrypt({ name: 'AES-GCM', iv: junto.subarray(0, 12), additionalData: aad(store, id) }, chave, junto.subarray(12));
    return JSON.parse(dec.decode(pt));
  } catch {
    throw new Error('Não consegui abrir seus dados com essa senha.');
  }
}

/** Embaralha uma lista de mudanças { store, id, em, rec }. */
export async function cifrarMudancas(chave, lista) {
  return Promise.all(lista.map(async m => ({ store: m.store, id: m.id, em: m.em, rec: await cifrar(chave, m.store, m.id, m.rec) })));
}

/** Abre uma lista. Devolve { ok, ruins } (ruins = quantas não abriram: senha de outro aparelho ou bloco mexido). */
export async function decifrarMudancas(chave, lista) {
  const ok = [];
  let ruins = 0;
  for (const m of lista) {
    try { ok.push({ ...m, rec: await decifrar(chave, m.store, m.id, m.rec) }); } catch { ruins++; }
  }
  return { ok, ruins };
}
