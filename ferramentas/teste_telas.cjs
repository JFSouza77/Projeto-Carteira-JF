// Teste de fumaça das telas (do Code do Perfil, 12/11/2026). Rodar antes de cada merge: npm run test:telas
// Abre o app num celular de mentira (390 px), passa por todas as abas no claro e no escuro, tira print e falha se
// aparecer erro no console. Uso: node ferramentas/teste_telas.cjs [pasta-dos-prints]
// Precisa do Playwright (npm i -D playwright, ou o que já vem instalado na nuvem).
const http = require("http"), fs = require("fs"), path = require("path");
const RAIZ = path.resolve(__dirname, "..");
const SAIDA = path.resolve(process.argv[2] || path.join(RAIZ, "prints_teste"));
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/json", ".json": "application/json" };
const ABAS = ["inicio", "lancar", "mes", "conversa", "contas", "ajustes"];
(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const srv = http.createServer((q, r) => {
    let f = path.join(RAIZ, decodeURIComponent(q.url.split("?")[0]));
    if (f.endsWith(path.sep)) f += "index.html";
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream" }); r.end(d); });
  }).listen(0);
  const porta = srv.address().port;
  const { chromium } = require("playwright");
  const b = await chromium.launch();
  const erros = [];
  for (const tema of ["dark", "light"]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", colorScheme: tema });
    const p = await ctx.newPage();
    // o servidor de verdade fica de fora do teste (14/11): responde "sem dados" sem sair pra internet
    await ctx.route(/workers\.dev/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    p.on("pageerror", (e) => erros.push(`[${tema}] ${e.message}`));
    p.on("console", (m) => m.type() === "error" && erros.push(`[${tema}] console: ${m.text()}`));
    await p.goto(`http://127.0.0.1:${porta}/`);
    await p.waitForTimeout(2000);
    await p.evaluate(() => document.getElementById('abertura')?.remove()); // a abertura dura 5 s (13/11)
    for (const aba of ABAS) {
      await p.evaluate((a) => (location.hash = "#" + a), aba);
      await p.waitForTimeout(700);
      await p.screenshot({ path: path.join(SAIDA, `${tema}_${aba}.png`) });
    }
    await ctx.close();
  }
  await b.close();
  srv.close();
  console.log(erros.length ? "ERROS:\n" + erros.join("\n") : `Telas ok (${ABAS.length * 2} prints em ${SAIDA}), sem erro no console.`);
  process.exit(erros.length ? 1 : 0);
})();
