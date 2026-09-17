import { describe, it, expect, vi, afterEach } from "vitest";
import { refreshAccessToken } from "./client";

function jsonResponse(body, ok = true) {
  return { ok, json: () => Promise.resolve(body) };
}

function stubFetch(impl) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("refreshAccessToken", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hits /auth/refresh and stores the new access token", async () => {
    const fetchMock = stubFetch(() => Promise.resolve(jsonResponse({ data: { accessToken: "token-1" } })));

    const result = await refreshAccessToken();

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns false when the server rejects the refresh", async () => {
    stubFetch(() => Promise.resolve(jsonResponse({}, false)));

    const result = await refreshAccessToken();

    expect(result).toBe(false);
  });

  it("returns false when the request throws", async () => {
    stubFetch(() => Promise.reject(new Error("network down")));

    const result = await refreshAccessToken();

    expect(result).toBe(false);
  });

  it("shares one in-flight request across concurrent callers (#176)", async () => {
    let resolveFetch;
    const fetchMock = stubFetch(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const first = refreshAccessToken();
    const second = refreshAccessToken();

    resolveFetch(jsonResponse({ data: { accessToken: "token-2" } }));
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(firstResult).toBe(true);
    expect(secondResult).toBe(true);
  });

  it("starts a fresh request once the previous one has settled", async () => {
    const fetchMock = stubFetch(() => Promise.resolve(jsonResponse({ data: { accessToken: "token-3" } })));

    await refreshAccessToken();
    await refreshAccessToken();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts and returns false if the request hangs past the timeout", async () => {
    vi.useFakeTimers();
    try {
      stubFetch(
        (_url, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
          }),
      );

      const result = refreshAccessToken();
      await vi.advanceTimersByTimeAsync(60_000);

      expect(await result).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("runs directly when the Web Locks API isn't available (jsdom has no navigator.locks)", async () => {
    const fetchMock = stubFetch(() => Promise.resolve(jsonResponse({ data: { accessToken: "token-4" } })));

    const result = await refreshAccessToken();

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("serializes the refresh through navigator.locks when available (#199)", async () => {
    const fetchMock = stubFetch(() => Promise.resolve(jsonResponse({ data: { accessToken: "token-5" } })));
    const lockRequest = vi.fn((_name, callback) => callback());
    vi.stubGlobal("navigator", { locks: { request: lockRequest } });

    const result = await refreshAccessToken();

    expect(lockRequest).toHaveBeenCalledWith("auth-refresh", expect.any(Function));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });
});
