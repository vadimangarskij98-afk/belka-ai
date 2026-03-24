import { Router, type IRouter } from "express";

const router: IRouter = Router();

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
      req.log.warn({ err: searchErr }, "DuckDuckGo search failed");
    }

    res.json({ results, query });
  } catch (err) {
    req.log.error({ err }, "Web search error");
    res.status(500).json({ error: "Search failed" });
  }
});

function isAllowedUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    const blocked = [
      "localhost", "127.0.0.1", "0.0.0.0", "[::1]", "169.254.169.254",
      "metadata.google.internal", "metadata.google",
    ];
    if (blocked.includes(host)) return false;
    if (host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("172.")) return false;
    if (host.endsWith(".internal") || host.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

router.post("/fetch-page", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: "URL is required" });
      return;
    }

    if (!isAllowedUrl(url)) {
      res.status(403).json({ error: "URL not allowed" });
      return;
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BelkaAI/1.0)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    const html = await response.text();
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);

    res.json({ content: textContent, url });
  } catch (err) {
    req.log.error({ err }, "Fetch page error");
    res.status(500).json({ error: "Failed to fetch page" });
  }
});

export default router;
