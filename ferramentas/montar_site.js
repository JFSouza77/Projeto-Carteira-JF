// Monta a pasta dist/ só com o que o site precisa (o app). É ela que o Cloudflare Pages publica.
// Servidor, testes, documentos e ferramentas NÃO vão pro site.
// Uso: npm run build
import { rmSync, mkdirSync, cpSync, existsSync } from 'node:fs';

const ITENS = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons'];
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const i of ITENS) {
  if (!existsSync(i)) throw new Error(`Faltou ${i}`);
  cpSync(i, `dist/${i}`, { recursive: true });
}
console.log(`dist/ pronta: ${ITENS.join(', ')}`);
