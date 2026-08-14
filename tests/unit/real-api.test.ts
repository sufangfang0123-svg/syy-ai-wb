import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../src/lib/real-api";

afterEach(() => vi.unstubAllGlobals());

describe("real API boundary", () => {
  it("returns backend JSON without touching localStorage", async () => {
    const storage = { setItem: vi.fn() };
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "prj_real" }), { status: 200, headers: { "Content-Type": "application/json" } })));
    await expect(api<{ id: string }>("/api/v1/projects/prj_real")).resolves.toEqual({ id: "prj_real" });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("surfaces backend errors and never reports false success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "数据库不可用" }), { status: 503, headers: { "Content-Type": "application/json" } })));
    await expect(api("/api/v1/projects", { method: "POST", body: "{}" })).rejects.toEqual(expect.objectContaining({ status: 503, message: "数据库不可用" }));
  });

  it("propagates connection failures instead of falling back", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(api("/api/v1/projects")).rejects.toThrow("Failed to fetch");
  });
});
