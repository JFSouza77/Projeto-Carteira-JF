// Teste do macaco (13/11/2026, pedido do JF): um "macaco" toca em botões, chips, abas e campos ao acaso, em todas as
// telas, no celular e no computador, no claro e no escuro. Falha se aparecer erro no console, se a página travar
// ou se a tela passar da largura (rolagem pro lado). Dados inventados; nada sai do aparelho de teste.
// Uso: node ferramentas/teste_macaco.cjs [toques] [semente]   (padrão: 250 toques, semente 7)
// O mesmo número de semente repete exatamente os mesmos toques, pra dá pra reproduzir um erro achado.
const http = require("http"), fs = require("fs"), path = require("path");
const RAIZ = path.resolve(__dirname, "..");
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/json", ".json": "application/json" };
const TOQUES = Number(process.argv[2]) || 250;
const SEMENTE = Number(process.argv[3]) || 7;
const ABAS = ["inicio", "lancar", "mes", "conversa", "contas", "ajustes"];
// coisas que o macaco não toca: apagar tudo, sair da conta, baixar/importar backup, links pra fora do app
const PROIBIDO = '#conta-sair, #import-input, input[type="file"], a[target="_blank"], [href^="http"], [download]';

function aleatorio(semente) { let s = semente >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

(async () => {
  const srv = http.createServer((q, r) => {
    let f = path.join(RAIZ, decodeURIComponent(q.url.split("?")[0]));
    if (f.endsWith(path.sep)) f += "index.html";
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream" }); r.end(d); });
  }).listen(0);
  const porta = srv.address().port;
  const { chromium } = require("playwright");
  const b = await chromium.launch();
  const erros = [];
  const rodadas = [
    { nome: "celular-escuro", vp: { width: 390, height: 844 }, tema: "dark" },
    { nome: "celular-claro", vp: { width: 390, height: 844 }, tema: "light" },
    { nome: "computador-escuro", vp: { width: 1366, height: 900 }, tema: "dark" },
  ];
  for (const [k, rod] of rodadas.entries()) {
    const sorte = aleatorio(SEMENTE + k * 101);
    const ctx = await b.newContext({ viewport: rod.vp, serviceWorkers: "block", colorScheme: rod.tema });
    const p = await ctx.newPage();
    await p.addInitScript(() => { window.print = () => {}; }); // o PDF abriria a janela de impressão
    let ultimo = "(início)";
    p.on("pageerror", (e) => erros.push(`[${rod.nome}] erro depois de ${ultimo}: ${e.message}`));
    p.on("console", (m) => m.type() === "error" && erros.push(`[${rod.nome}] console depois de ${ultimo}: ${m.text()}`));
    p.on("dialog", (d) => (d.type() === "prompt" ? d.accept("10") : sorte() < 0.5 ? d.accept() : d.dismiss()).catch(() => {}));
    p.on("popup", (w) => w.close().catch(() => {}));
    await p.goto(`http://127.0.0.1:${porta}/`);
    await p.waitForTimeout(1500);
    // dados inventados pra ter o que tocar
    await p.evaluate(async () => {
      const db = await import("./js/db.js"); const eng = await import("./js/engine.js");
      await db.setMeta("perfil", { nome: "Macaco", apelido: "Macaco", tratamento: "descontraido", foco: [], aniversarioPerguntado: true });
      const hoje = eng.toISODate(), ym = hoje.slice(0, 8);
      const conta = eng.createAccount({ bank: "Nubank", balanceCents: 150000 });
      const cartao = eng.createCartao({ bank: "Nubank", limiteCents: 200000, fechamentoDia: 5, vencimentoDia: 12, usadoCents: 30000 });
      await db.put(db.STORES.accounts, conta); await db.put(db.STORES.accounts, cartao);
      await db.put(db.STORES.incomes, eng.createIncome({ amountCents: 400000, sourceId: "salario", date: ym + "05" }));
      for (const [v, c, d] of [[4590, "mercado", "02"], [12000, "delivery", "03"], [185000, "moradia", "05"], [3000, "transporte", hoje.slice(8)]])
        await db.put(db.STORES.expenses, eng.createExpense({ amountCents: v, categoryId: c, date: ym + d, note: "Teste" }));
      await db.put(db.STORES.expenses, { ...eng.createExpense({ amountCents: 9000, categoryId: "restaurante", date: hoje, note: "Pizza" }), racha: [{ id: "p1", nome: "Ana", valorCents: 3000 }] });
      await db.setMeta("metas", [{ id: "m1", nome: "Viagem", alvoCents: 300000, guardadoCents: 90000, criadaEm: 1 }]);
    });
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => document.getElementById("abertura")?.remove()); // a abertura dura 5 s (13/11)
    for (let i = 0; i < TOQUES; i++) {
      if (sorte() < 0.08) { const aba = ABAS[Math.floor(sorte() * ABAS.length)]; ultimo = `aba ${aba}`; await p.evaluate((a) => (location.hash = "#" + a), aba); await p.waitForTimeout(120); continue; }
      // escolhe e toca dentro da página, numa ida só (rápido); os números da sorte vêm daqui, pra repetir igual
      const r1 = sorte(), r2 = sorte();
      const feito = await p.evaluate(([r1, r2, proibido]) => {
        const SEL = 'button, a[href^="#"], [role="button"], .chip, summary, input[type="radio"], input[type="text"], input[type="search"], select';
        const aberto = document.querySelector("dialog[open]");
        const els = [...(aberto || document).querySelectorAll(SEL)].filter((el) => {
          const alvo = el.matches('input[type="radio"]') ? el.closest("label") || el : el;
          const r = alvo.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && !el.disabled && !el.closest("[hidden]") && !el.matches(proibido) && getComputedStyle(alvo).visibility !== "hidden";
        });
        if (!els.length) return null;
        const el = els[Math.floor(r1 * els.length)];
        const nome = (el.id ? "#" + el.id + " " : el.tagName.toLowerCase() + " ") + (el.textContent || el.placeholder || el.value || "").trim().replace(/\s+/g, " ").slice(0, 30);
        if (el.matches("select")) { if (el.options.length) { el.selectedIndex = Math.floor(r2 * el.options.length); el.dispatchEvent(new Event("change", { bubbles: true })); } }
        else if (el.matches('input[type="text"], input[type="search"]')) {
          el.value = ["25,90", "abc", "", "1000", "gastei 30 no mercado", "-5", "99999999999"][Math.floor(r2 * 7)];
          el.dispatchEvent(new Event("input", { bubbles: true }));
          if (r2 > 0.6 && el.form) el.form.requestSubmit();
        } else el.click();
        return nome;
      }, [r1, r2, PROIBIDO]).catch((e) => `(falhou: ${e.message.slice(0, 60)})`);
      if (!feito) { await p.keyboard.press("Escape"); continue; }
      ultimo = `toque ${i + 1} em "${feito}"`;
      await p.waitForTimeout(40);
      if (i % 25 === 0) {
        // dá pra arrastar a página pro lado? (tenta rolar pra direita e vê se andou)
        const largo = await p.evaluate(() => { const y = scrollY; scrollTo(9999, y); const x = scrollX; scrollTo(0, y); return x; });
        if (largo > 2) erros.push(`[${rod.nome}] a página rola pro lado (${largo}px) depois de ${ultimo}`);
      }
    }
    // a página ainda responde?
    const vivo = await p.evaluate(() => !!document.querySelector(".tabbar")).catch(() => false);
    if (!vivo) erros.push(`[${rod.nome}] a página parou de responder depois de ${ultimo}`);
    await ctx.close();
  }
  await b.close();
  srv.close();
  const unicos = [...new Set(erros)];
  console.log(unicos.length ? "O MACACO ACHOU:\n" + unicos.join("\n") : `Macaco ok: ${TOQUES} toques x ${rodadas.length} rodadas (semente ${SEMENTE}), sem erro.`);
  process.exit(unicos.length ? 1 : 0);
})();
