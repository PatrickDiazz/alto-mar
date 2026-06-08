import test from "node:test";
import assert from "node:assert/strict";
import { validateMessageBody } from "./contentFilter.js";

test("allows normal trip coordination text", () => {
  const r = validateMessageBody("Qual o ponto de embarque amanhã às 9h?");
  assert.equal(r.ok, true);
});

test("blocks phone numbers", () => {
  const r = validateMessageBody("Me liga no 11 99999-8888");
  assert.equal(r.ok, false);
});

test("blocks emails", () => {
  const r = validateMessageBody("Escreve para mim em teste@exemplo.com");
  assert.equal(r.ok, false);
});

test("blocks urls", () => {
  const r = validateMessageBody("Veja em https://wa.me/5511999998888");
  assert.equal(r.ok, false);
});

test("blocks whatsapp keyword", () => {
  const r = validateMessageBody("Fala comigo no whatsapp");
  assert.equal(r.ok, false);
});
