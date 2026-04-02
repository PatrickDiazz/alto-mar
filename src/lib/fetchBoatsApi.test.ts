import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchBoatsResponse, BOATS_FETCH_ATTEMPTS } from "./fetchBoatsApi";

describe("fetchBoatsResponse", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("retorna na primeira tentativa quando ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ boats: [{ id: "1" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const r = await fetchBoatsResponse("/api/boats");
    expect(r.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("repete em 503 e acaba ok", async () => {
    vi.useFakeTimers();
    const okBody = JSON.stringify({ boats: [] });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(okBody, { status: 200, headers: { "Content-Type": "application/json" } })
      );
    vi.stubGlobal("fetch", fetchMock);

    const p = fetchBoatsResponse("/api/boats");
    await vi.runAllTimersAsync();
    const r = await p;

    expect(r.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("não ultrapassa BOATS_FETCH_ATTEMPTS", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const p = fetchBoatsResponse("/api/boats");
    await vi.runAllTimersAsync();
    const r = await p;

    expect(r.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(BOATS_FETCH_ATTEMPTS);
    vi.useRealTimers();
  });
});
