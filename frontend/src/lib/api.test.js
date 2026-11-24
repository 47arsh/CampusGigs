import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api.js";

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api", () => {
  it("prefixes the base URL and attaches the bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await api("/tasks", { token: "test-token" });

    expect(data).toEqual({ ok: true });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/tasks");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers.Authorization).toBe("Bearer test-token");
  });

  it("omits the Authorization header without a token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await api("/tasks");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("surfaces the server message and status on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ message: "Invalid credentials" }, 401)),
    );

    await expect(api("/auth/login", { method: "POST" })).rejects.toMatchObject({
      message: "Invalid credentials",
      status: 401,
    });
  });

  it("falls back to a generic message for non-JSON error bodies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 500 })));

    await expect(api("/tasks")).rejects.toMatchObject({
      message: "Something went wrong. Please try again.",
      status: 500,
    });
  });
});
