// Fotos (comprovante, nota fiscal, print do extrato): comprime no próprio aparelho antes de guardar.
// As fotos ficam só no IndexedDB do aparelho. Só vão para a IA online se a pessoa tocar em "Ler com IA".

import * as db from './db.js';
import { newId } from './engine.js';

const LADO_MAX = 1600;
const QUALIDADE = 0.75;

export async function comprimir(arquivo) {
  if (!arquivo || !/^image\//.test(arquivo.type)) throw new Error('Escolha uma imagem.');
  if (arquivo.size > 25 * 1024 * 1024) throw new Error('Imagem grande demais (máx. 25 MB).');
  const bmp = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * escala);
  const h = Math.round(bmp.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', QUALIDADE));
  if (!blob) throw new Error('Não consegui ler essa imagem.');
  return blob;
}

/** Comprime e guarda. Devolve o registro { id, blob, … }. */
export async function guardar(arquivo, origem = 'comprovante') {
  const blob = await comprimir(arquivo);
  const img = { id: newId(), blob, type: 'image/jpeg', origem, createdAt: Date.now() };
  await db.put(db.STORES.images, img);
  return img;
}

export async function pegar(id) {
  return id ? db.get(db.STORES.images, id) : null;
}

export function apagar(id) {
  return id ? db.remove(db.STORES.images, id) : Promise.resolve();
}

export function paraBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
