export const API_BASE = `${(import.meta.env.BASE_URL || "/").replace(/\/$/, "")}/api`.replace(/\/\/+/g, "/");
const CSRF_COOKIE_NAME = "belka_csrf";
let csrfPromise: Promise<string | null> | null = null;

export function buildApiUrl(path = ""): string {
  if (!path) return API_BASE;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/api")) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`.replace(/\/\/+/g, "/");
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfToken(): Promise<string | null> {
  const existing = readCookie(CSRF_COOKIE_NAME);
  if (existing) {
    return existing;
  }

  if (!csrfPromise) {
    csrfPromise = fetch(buildApiUrl("/auth/csrf"), { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const data = await response.json().catch(() => ({}));
        return data.csrfToken || readCookie(CSRF_COOKIE_NAME);
      })
      .catch(() => null)
      .finally(() => {
        csrfPromise = null;
      });
  }

  return csrfPromise;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || {});

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken && !headers.has("X-CSRF-Token")) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }

  return fetch(input, {
    credentials: "include",
    ...init,
    headers,
  });
}

export function jsonHeaders(headers: HeadersInit = {}): Record<string, string> {
  const normalized = headers instanceof Headers
    ? Object.fromEntries(headers.entries())
    : Array.isArray(headers)
      ? Object.fromEntries(headers)
      : { ...headers };

  if (!normalized["Content-Type"]) {
    normalized["Content-Type"] = "application/json";
  }

  return normalized;
}
