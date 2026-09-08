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

export async function refreshAccessToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) return false;
    const { accessToken: newToken } = await response.json();
    setAccessToken(newToken);
    return true;
  } catch {
    return false;
  }
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
