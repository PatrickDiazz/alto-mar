import { describe, it, expect } from "vitest";
import { readResponseErrorMessage } from "./responseError";

describe("readResponseErrorMessage", () => {
  it("usa o corpo quando existe", async () => {
    const resp = new Response("Erro da API", { status: 400 });
    expect(await readResponseErrorMessage(resp, "fallback")).toBe("Erro da API");
  });

  it("usa fallback quando o corpo está vazio", async () => {
    const resp = new Response("", { status: 502 });
    expect(await readResponseErrorMessage(resp, "Sem ligação")).toBe("Sem ligação");
  });

  it("usa HTTP status quando fallback também vazio", async () => {
    const resp = new Response("", { status: 503 });
    expect(await readResponseErrorMessage(resp, "   ")).toBe("HTTP 503");
  });
});
