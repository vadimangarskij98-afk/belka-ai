import { Router, type IRouter } from "express";
import type { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import net from "node:net";

const router: IRouter = Router();
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = "Mozilla/5.0 (compatible; BelkaAI/1.0)";

type ValidatedUrl = {
  url: URL;
  addresses: LookupAddress[];
};

router.post("/web", async (req, res) => {
  try {
    const { query, maxResults } = req.body;
    if (!query) {
      res.status(400).json({ error: "Query is required" });
      return;
    }

    const limit = Math.min(maxResults || 5, 10);
    const results: { title: string; url: string; snippet: string }[] = [];

    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BelkaAI/1.0)",
        },
      });
      const html = await response.text();

      const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

      let match;
      const titles: { url: string; title: string }[] = [];
      while ((match = resultRegex.exec(html)) !== null && titles.length < limit) {
        const url = decodeURIComponent(match[1].replace(/.*uddg=/, "").replace(/&.*/, ""));
        const title = match[2].replace(/<[^>]*>/g, "").trim();
        if (url.startsWith("http")) {
          titles.push({ url, title });
        }
      }

      const snippets: string[] = [];
      while ((match = snippetRegex.exec(html)) !== null) {
        snippets.push(match[1].replace(/<[^>]*>/g, "").trim());
      }

      for (let i = 0; i < titles.length; i++) {
        results.push({
          title: titles[i].title,
          url: titles[i].url,
          snippet: snippets[i] || "",
        });
      }
    } catch (searchErr) {
      req.log?.warn?.({ err: searchErr }, "DuckDuckGo search failed");
    }

    res.json({ results, query });
  } catch (err) {
    req.log?.error?.({ err }, "Web search error");
    res.status(500).json({ error: "Search failed" });
  }
});

function isBlockedHostname(host: string): boolean {
  const normalized = host.toLowerCase();
  const blocked = [
    "localhost",
    "0.0.0.0",
    "127.0.0.1",
    "::1",
    "[::1]",
    "169.254.169.254",
    "metadata.google.internal",
    "metadata.google",
  ];

  if (blocked.includes(normalized)) return true;
  if (normalized.endsWith(".internal") || normalized.endsWith(".local")) return true;
  return false;
}

function isPrivateAddress(address: string): boolean {
  const ipType = net.isIP(address);
  if (ipType === 4) {
    return (
      address.startsWith("10.")
      || address.startsWith("127.")
      || address.startsWith("169.254.")
      || address.startsWith("192.168.")
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
    );
  }

  if (ipType === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1"
      || normalized.startsWith("fc")
      || normalized.startsWith("fd")
      || normalized.startsWith("fe80:")
      || normalized.startsWith("::ffff:127.")
      || normalized.startsWith("::ffff:10.")
      || normalized.startsWith("::ffff:192.168.")
      || /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
    );
  }

  return false;
}

async function resolveValidatedUrl(urlStr: string): Promise<ValidatedUrl | null> {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    if (isBlockedHostname(parsed.hostname)) return null;

    const resolved = await lookup(parsed.hostname, { all: true, verbatim: true });
    if (resolved.length === 0) return null;

    for (const entry of resolved) {
      if (isPrivateAddress(entry.address)) {
        return null;
      }
    }

    return {
      url: parsed,
      addresses: resolved,
    };
  } catch {
    return null;
  }
}

async function requestValidatedPage(target: ValidatedUrl) {
  const response = await fetch(target.url.toString(), {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  const headers: Record<string, string | string[] | undefined> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    statusCode: response.status,
    headers,
    body: await response.text(),
  };
}

async function fetchSafePage(urlStr: string): Promise<{ content: string; url: string }> {
  let currentUrl = await resolveValidatedUrl(urlStr);
  if (!currentUrl) {
    throw new Error("URL not allowed");
  }

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const response = await requestValidatedPage(currentUrl);

    const locationHeader = response.headers.location;
    const location = Array.isArray(locationHeader) ? locationHeader[0] : locationHeader;
    if (location && response.statusCode >= 300 && response.statusCode < 400) {
      if (redirectCount === MAX_REDIRECTS) {
        throw new Error("Too many redirects");
      }

      const nextUrl = await resolveValidatedUrl(new URL(location, currentUrl.url).toString());
      if (!nextUrl) {
        throw new Error("Redirect target not allowed");
      }

      currentUrl = nextUrl;
      continue;
    }

    const content = response.body
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);

    return { content, url: currentUrl.url.toString() };
  }

  throw new Error("Unable to fetch page");
}

function classifyFetchPageError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown upstream error";
  const causeMessage = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const causeCode = error instanceof Error && error.cause && typeof error.cause === "object" && "code" in error.cause
    ? String((error.cause as { code?: unknown }).code ?? "")
    : "";
  const normalized = message.toLowerCase();
  const normalizedCause = causeMessage.toLowerCase();
  const combined = `${normalized} ${normalizedCause} ${causeCode.toLowerCase()}`.trim();

  if (message === "URL not allowed" || message === "Redirect target not allowed") {
    return {
      status: 403,
      payload: { error: "URL not allowed" },
    };
  }

  if (combined.includes("timed out")) {
    return {
      status: 504,
      payload: { error: "Upstream page timed out", detail: causeMessage || message },
    };
  }

  if (
    combined.includes("certificate")
    || combined.includes("tls")
    || combined.includes("issuer")
    || combined.includes("unable to reach host")
    || combined.includes("socket hang up")
    || combined.includes("econnrefused")
    || combined.includes("ehostunreach")
    || combined.includes("enotfound")
    || combined.includes("fetch failed")
    || combined.includes("unable_to_get_issuer_cert_locally")
  ) {
    return {
      status: 502,
      payload: { error: "Upstream page unavailable", detail: causeMessage || message },
    };
  }

  return {
    status: 500,
    payload: { error: "Failed to fetch page" },
  };
}

router.post("/fetch-page", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: "URL is required" });
      return;
    }

    const validatedUrl = await resolveValidatedUrl(url);
    if (!validatedUrl) {
      res.status(403).json({ error: "URL not allowed" });
      return;
    }

    const result = await fetchSafePage(validatedUrl.url.toString());
    res.json(result);
  } catch (err) {
    req.log?.error?.({ err }, "Fetch page error");
    const classified = classifyFetchPageError(err);
    res.status(classified.status).json(classified.payload);
  }
});

export default router;
