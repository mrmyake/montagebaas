/* eslint-disable @typescript-eslint/no-require-imports */
// Attributietest end-to-end tegen productie (of een andere basis-URL).
// Gebruik: NODE_PATH=<map met playwright>/node_modules node attributie-e2e.js \
//   <startUrl met ?gclid=TEST_CC_…&utm_…> <route: link|pdf|vragen> <consent: banner|formulier> <uitmap> [pdfPad]
// Komt binnen met referrer www.google.com, navigeert via een tweede pagina naar /offerte,
// doorloopt de intake en logt de cookies vlak vóór verzenden.
// Testleads: naam "Test attributie <route>", e-mail attributie+<route>@ilja.com
// (valt onder ADS_UITSLUITEN), klik-ID begint met TEST_ (tweede uitsluiting).
const { chromium } = require("playwright");
const fs = require("fs");
const [start, route, consent, uit, pdfPad] = process.argv.slice(2);
fs.mkdirSync(uit, { recursive: true });
const LABEL = { link: "IKEA-link plakken", pdf: "PDF uploaden", vragen: "Vragen beantwoorden" };
const PLANNER = "https://kitchen.planner.ikea.com/nl/nl/planner/36FDA15A-7C94-436F-ABEA-0C4BEB046ED6/?ref=share";
const tag = `${route}-${consent}`;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  const fouten = [];
  p.on("pageerror", (e) => fouten.push(String(e)));
  await p.goto(start, { waitUntil: "networkidle", referer: "https://www.google.com/" });
  console.log("landing:", p.url());
  if (consent === "banner") await p.getByRole("button", { name: "Accepteren" }).click();
  await p.waitForTimeout(500);

  // Tweede pagina (client-side navigatie), dan naar /offerte.
  await p.locator('a[href="/kosten"]:visible').first().click();
  await p.waitForURL(/\/kosten/);
  await p.waitForTimeout(800);
  await p.locator('a[href="/offerte"]:visible, a[href^="/offerte#"]:visible').first().click();
  await p.waitForURL(/\/offerte/);
  await p.waitForTimeout(1000);
  console.log("intake op:", p.url());

  await p.locator(`button[aria-pressed]:has-text("${LABEL[route]}")`).first().click();
  if (route === "link") {
    await p.fill('input[name="planner_link"]', PLANNER);
    await p.getByRole("button", { name: "Lees mijn ontwerp" }).first().click();
  }
  if (route === "pdf") await p.setInputFiles('input[type="file"]', pdfPad);

  let cookiesVoor = null;
  for (let stap = 0; stap < 14 && !p.url().includes("/bedankt"); stap++) {
    await p.waitForTimeout(1500);
    await p.evaluate(() => {
      const knoppen = [...document.querySelectorAll("main button[aria-pressed]")].filter((k) => k.offsetParent && !k.closest('[aria-label="Hoe wil je je keuken doorgeven?"]') && !k.className.includes("w-full items-center"));
      const groepen = new Map();
      for (const k of knoppen) { const g = k.parentElement; if (!groepen.has(g)) groepen.set(g, []); groepen.get(g).push(k); }
      for (const ks of groepen.values()) if (!ks.some((k) => k.getAttribute("aria-pressed") === "true")) ks[0].click();
    });
    for (const [sel, waarde] of [['input[name="postcode"]', "1231 TX"], ['input[name="naam"]', "Test attributie " + route], ['input[name="telefoon"]', "0629173468"], ['input[name="email"]', `attributie+${route}@ilja.com`]]) {
      const v = p.locator(sel);
      if ((await v.count()) && (await v.first().isVisible()) && !(await v.first().inputValue())) await v.first().fill(waarde);
    }
    const actie = p.locator("main button:visible", { hasText: /^(Volgende|Vraag je vaste prijs aan)$/ }).last();
    if (await actie.count()) {
      if (await actie.isDisabled()) continue;
      if ((await actie.innerText()).startsWith("Vraag")) cookiesVoor = (await ctx.cookies()).filter((c) => ["mb_attributie", "_ga"].includes(c.name)).map((c) => `${c.name}=${decodeURIComponent(c.value)} (domain ${c.domain})`);
      await actie.click();
    }
  }
  await p.waitForURL(/\/bedankt/, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(2000);
  const na = (await ctx.cookies()).filter((c) => ["mb_attributie", "_ga"].includes(c.name)).map((c) => `${c.name}=${decodeURIComponent(c.value)} (domain ${c.domain})`);
  await p.screenshot({ path: `${uit}/${tag}-eind.png`, fullPage: false });
  console.log("eind-URL:", p.url());
  console.log("cookies vóór verzenden:", JSON.stringify(cookiesVoor));
  console.log("cookies op /bedankt:", JSON.stringify(na));
  if (fouten.length) console.log("paginafouten:", fouten);
  await b.close();
})();
