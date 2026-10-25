/* eslint-disable @typescript-eslint/no-require-imports */
// Diagnose React #418: logt DOM-mutaties na DOMContentLoaded en de fout.
// Gebruik: NODE_PATH=<map met playwright>/node_modules node mutaties-rond-hydration.js https://dekeukenheld.nl 8
const { chromium } = require("playwright");
(async () => {
  const [base, n] = [process.argv[2], Number(process.argv[3] || 8)];
  const b = await chromium.launch();
  let fouten = 0;
  for (let i = 0; i < n; i++) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.addInitScript(() => {
      window.__mut = [];
      document.addEventListener("DOMContentLoaded", () => window.__mut.push(Math.round(performance.now()) + " === DOMContentLoaded"));
      window.addEventListener("error", (e) => window.__mut.push(Math.round(performance.now()) + " !!! ERROR " + String(e.message).slice(0, 60)));
      new MutationObserver((ms) => {
        for (const m of ms) {
          const t = Math.round(performance.now());
          if (m.type === "attributes") window.__mut.push(`${t} attr ${m.target.nodeName}.${m.attributeName}=${String(m.target.getAttribute(m.attributeName)).slice(0, 80)}`);
          for (const n of m.addedNodes) window.__mut.push(`${t} + ${n.nodeName} in ${m.target.nodeName}${m.target.id ? "#" + m.target.id : ""} ${(n.outerHTML || n.textContent || "").slice(0, 120)}`);
          for (const n of m.removedNodes) window.__mut.push(`${t} - ${n.nodeName} from ${m.target.nodeName} ${(n.outerHTML || n.textContent || "").slice(0, 80)}`);
        }
      }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["href", "class", "style", "lang", "data-theme"] });
    });
    const p = await ctx.newPage();
    let fout = null;
    p.on("pageerror", (e) => { fout = Math.round(Date.now()); });
    await p.goto(base + "/?gclid=TEST_CC_hydr" + i + "&utm_source=x", { waitUntil: "networkidle", referer: "https://www.google.com/" });
    await p.getByRole("button", { name: "Accepteren" }).click();
    await p.waitForTimeout(1500);
    const mut = await p.evaluate(() => window.__mut);
    if (fout) {
      fouten++;
      console.log(`run ${i}: FOUT. mutaties (excl. React-hydration van main):`);
      const dcl = mut.findIndex((x) => x.includes("DOMContentLoaded"));
      for (const m of mut.slice(dcl).slice(0, 80)) console.log("   " + m);
    } else console.log(`run ${i}: geen fout (${mut.length} mutaties)`);
    await ctx.close();
  }
  console.log(`${fouten}/${n} met fout`);
  await b.close();
})();
