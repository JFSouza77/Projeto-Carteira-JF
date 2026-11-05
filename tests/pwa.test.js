import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const raiz = new URL('..', import.meta.url).pathname;
const sw = readFileSync(join(raiz, 'sw.js'), 'utf8');
const shell = [...sw.match(/const APP_SHELL = \[([\s\S]*?)\];/)[1].matchAll(/'\.\/([^']*)'/g)].map(m => m[1]);

function arquivos(dir) {
  return readdirSync(join(raiz, dir)).flatMap(f => {
    const p = join(dir, f);
    return statSync(join(raiz, p)).isDirectory() ? arquivos(p) : [p];
  });
}

test('todo arquivo do app está no cache offline do service worker', () => {
  const precisam = [...arquivos('js'), ...arquivos('css'), ...arquivos('icons'), 'index.html', 'manifest.webmanifest'];
  for (const f of precisam) assert.ok(shell.includes(f), `${f} não está no APP_SHELL do sw.js (e suba o CACHE_VERSION)`);
  for (const f of shell.filter(Boolean)) assert.ok(statSync(join(raiz, f)), `${f} está no APP_SHELL mas não existe`);
});
