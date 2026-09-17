const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Access token lives in memory only (never localStorage/sessionStorage) per
// docs/auth-contracts.md: it's readable by any injected script otherwise.
// That means it's lost on every reload, which is what the silent refresh in
// AuthContext is for.
let accessToken = null;
export function setAccessToken(token) {
  accessToken = token;
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// Render's free-tier cold start pays roughly fifty seconds (docs/e2e-testing.md),
// so this needs to be generous — but now that the request is shared by every
// concurrent caller (see refreshAccessToken below), a hang has to be bounded or
// it blocks all of them instead of just the one that triggered it.
const REFRESH_TIMEOUT_MS = 60_000;

async function doRefresh() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
    });
    if (!response.ok) return false;
    // Every endpoint responds { data: ... } (team decision, issue #51 —
    // covers auth too, not just resource endpoints).
    const { data } = await response.json();
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Two tabs of the same account are a normal case (a product page open
// alongside checkout) and each has its own module instance, so the
// same-tab guard below has nothing to coordinate with across them — see
// #199, the cross-tab version of #176's race. The Web Locks API serializes
// the network call itself across tabs of the same origin, so two tabs never
// present the same refresh cookie concurrently: whichever tab loses the lock
// just runs after the winner's rotation has already landed, using the cookie
// that rotation set. Falls back to running unguarded where Web Locks isn't
// available (older Safari, jsdom in tests) — same-tab callers are still
// deduped by the in-flight guard below regardless.
function refreshAcrossTabs() {
  if (typeof navigator === "undefined" || !navigator.locks) {
    return doRefresh();
  }
  return navigator.locks.request("auth-refresh", () => doRefresh());
}

// Refresh tokens rotate on every call (docs/auth-contracts.md), so two
// concurrent callers would each revoke the other's token and race on which
// Set-Cookie wins — see #176. Concurrent callers share one in-flight request
// instead of each starting their own rotation.
let inFlightRefresh = null;
export async function refreshAccessToken() {
  if (!inFlightRefresh) {
    inFlightRefresh = refreshAcrossTabs().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

async function request(path, { method = "GET", body, retry = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    // The refresh cookie is httpOnly + SameSite=None in production (client
    // on github.io, API on onrender.com — cross-site), so every request
    // needs credentials even when it isn't the refresh call itself.
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request(path, { method, body, retry: false });
    }
    onUnauthorized();
  }

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message ?? `Request to ${path} failed with status ${response.status}`);
    error.status = response.status;
    error.code = payload?.error;
    error.details = payload?.details;
    throw error;
  }

  return payload;
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};
