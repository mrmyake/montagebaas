// Gmail-koppeling: OAuth-URL, MIME van de draft, versleuteling van de token. Draaien: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { GMAIL_SCOPES, bouwMime, draftLink, headerWaarde, heeftSendAs, oauthUrl, ontbrekendeScopes, replyReferences } from "./mime.ts";
import { leesSleutel, ontsleutel, versleutel } from "../versleuteling.ts";

test("OAuth-URL: precies compose + readonly, offline, altijd consent, login_hint", () => {
  const u = new URL(oauthUrl({ clientId: "cid", redirectUri: "https://x.nl/admin/offerte/gmail/callback", state: "s1", account: "ilja@dekeukenheld.nl" }));
  assert.equal(u.searchParams.get("scope"), "https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.readonly");
  assert.equal(u.searchParams.get("access_type"), "offline");
  assert.equal(u.searchParams.get("prompt"), "consent");
  assert.equal(u.searchParams.get("login_hint"), "ilja@dekeukenheld.nl");
  assert.equal(u.searchParams.get("state"), "s1");
  assert.equal(GMAIL_SCOPES.length, 2);
  assert.deepEqual(ontbrekendeScopes(GMAIL_SCOPES.join(" ")), []);
  assert.deepEqual(ontbrekendeScopes("https://www.googleapis.com/auth/gmail.compose"), ["https://www.googleapis.com/auth/gmail.readonly"]);
});

test("MIME: reply-headers, UTF-8-onderwerp, platte tekst én HTML", () => {
  const raw = bouwMime(
    {
      van: "ilja@dekeukenheld.nl",
      aan: "klant+test@ilja.com",
      onderwerp: "Re: Offerte keukenmontage - Den Haag €",
      tekst: "Hej Jan,\n\nPrijs € 2.475",
      html: "<p>Hej Jan,</p>",
      inReplyTo: "<abc@mail.gmail.com>",
      references: "<eerste@x> <abc@mail.gmail.com>",
    },
    "GRENS"
  );
  const mime = Buffer.from(raw, "base64url").toString("utf8");
  assert.match(mime, /^From: ilja@dekeukenheld\.nl\r\nTo: klant\+test@ilja\.com\r\n/);
  assert.match(mime, /Subject: =\?UTF-8\?B\?/);
  assert.match(mime, /In-Reply-To: <abc@mail\.gmail\.com>\r\nReferences: <eerste@x> <abc@mail\.gmail\.com>/);
  assert.match(mime, /Content-Type: multipart\/alternative; boundary="GRENS"/);
  assert.match(mime, /Content-Type: text\/plain; charset="UTF-8"/);
  assert.match(mime, /Content-Type: text\/html; charset="UTF-8"/);
  const tekstDeel = mime.split("--GRENS")[1].split("\r\n\r\n")[1];
  assert.equal(Buffer.from(tekstDeel.replace(/\r\n/g, ""), "base64").toString("utf8"), "Hej Jan,\r\n\r\nPrijs € 2.475");
  assert.equal(headerWaarde("Offerte keukenmontage - Utrecht"), "Offerte keukenmontage - Utrecht");
});

test("MIME: nieuwe draft zonder reply-headers", () => {
  const mime = Buffer.from(bouwMime({ van: "a@b.nl", aan: "c@d.nl", onderwerp: "X", tekst: "t", html: "h" }), "base64url").toString("utf8");
  assert.ok(!/In-Reply-To|References/.test(mime));
});

test("references en draftlink", () => {
  assert.equal(replyReferences(null, "<m1>"), "<m1>");
  assert.equal(replyReferences("<a> <b>", "<m1>"), "<a> <b> <m1>");
  assert.equal(replyReferences(null, null), null);
  assert.equal(draftLink("ilja@dekeukenheld.nl", "18f"), "https://mail.google.com/mail/u/ilja%40dekeukenheld.nl/#drafts?compose=18f");
});

test("versleuteling: heen en terug, andere iv per keer, manipulatie en verkeerde sleutel falen", () => {
  const sleutel = leesSleutel(randomBytes(32).toString("base64"));
  const a = versleutel("1//refresh-token", sleutel);
  const b = versleutel("1//refresh-token", sleutel);
  assert.notEqual(a, b);
  assert.ok(!a.includes("refresh"));
  assert.equal(ontsleutel(a, sleutel), "1//refresh-token");
  const delen = a.split(":");
  delen[3] = Buffer.from("x" + Buffer.from(delen[3], "base64url").toString("latin1"), "latin1").toString("base64url");
  assert.throws(() => ontsleutel(delen.join(":"), sleutel));
  assert.throws(() => ontsleutel(a, leesSleutel(randomBytes(32).toString("base64"))));
  assert.throws(() => leesSleutel("te-kort"), /32 bytes/);
});

test("sendAs: hoofdadres geldig zonder verificationStatus, andere adressen alleen met accepted", () => {
  // Zo geeft users.settings.sendAs.list het primaire adres terug: isPrimary, geen verificationStatus.
  assert.equal(heeftSendAs([{ sendAsEmail: "ilja@dekeukenheld.nl", isPrimary: true }], "ilja@dekeukenheld.nl"), true);
  assert.equal(heeftSendAs([{ sendAsEmail: "Ilja@DeKeukenheld.nl", isPrimary: true }], "ilja@dekeukenheld.nl"), true); // hoofdletters
  // Niet-primair: alleen met accepted.
  assert.equal(heeftSendAs([{ sendAsEmail: "ilja@dekeukenheld.nl", verificationStatus: "accepted" }], "ilja@dekeukenheld.nl"), true);
  assert.equal(heeftSendAs([{ sendAsEmail: "ilja@dekeukenheld.nl" }], "ilja@dekeukenheld.nl"), false);
  assert.equal(heeftSendAs([{ sendAsEmail: "ilja@dekeukenheld.nl", verificationStatus: "pending" }], "ilja@dekeukenheld.nl"), false);
  assert.equal(heeftSendAs([{ sendAsEmail: "ilja@dekeukenheld.nl", isPrimary: false, verificationStatus: "pending" }], "ilja@dekeukenheld.nl"), false);
  // Ander adres in de lijst telt niet.
  assert.equal(heeftSendAs([{ sendAsEmail: "ilja@montagebaas.com", isPrimary: true }], "ilja@dekeukenheld.nl"), false);
  assert.equal(heeftSendAs(undefined, "ilja@dekeukenheld.nl"), false);
});

test("MIME: From en draftlink in de mailbox ilja@dekeukenheld.nl", () => {
  const mime = Buffer.from(bouwMime({ van: "ilja@dekeukenheld.nl", aan: "me+test@ilja.com", onderwerp: "X", tekst: "t", html: "h" }), "base64url").toString("utf8");
  assert.match(mime, /^From: ilja@dekeukenheld\.nl\r\n/);
  assert.equal(draftLink("ilja@dekeukenheld.nl", "18f"), "https://mail.google.com/mail/u/ilja%40dekeukenheld.nl/#drafts?compose=18f");
});
