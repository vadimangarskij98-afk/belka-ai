import { logger } from "./error-monitor";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

export class WebSearch {
  private braveKey = process.env.BRAVE_SEARCH_API_KEY;
  private serperKey = process.env.SERPER_API_KEY;

  async search(query: string, limit = 5): Promise<SearchResult[]> {
    logger.info("Web search", { query });

    try {
      if (this.braveKey) return await this.searchBrave(query, limit);
      if (this.serperKey) return await this.searchSerper(query, limit);
      return await this.searchDuckDuckGo(query, limit);
    } catch (error) {
      logger.error("Web search failed", { error: String(error), query });
      return [];
    }
  }

  private async searchBrave(query: string, limit: number): Promise<SearchResult[]> {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(limit));
    url.searchParams.set("lang", "ru");

    const response = await fetch(url.toString(), {
      headers: { "X-Subscription-Token": this.braveKey! },
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json() as any;
    return data.web?.results?.slice(0, limit).map((r: Record<string, string>) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    })) ?? [];
  }

  private async searchSerper(query: string, limit: number): Promise<SearchResult[]> {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": this.serperKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: limit, hl: "ru" }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json() as any;
    return data.organic?.slice(0, limit).map((r: Record<string, string>) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    })) ?? [];
  }

  private async searchDuckDuckGo(query: string, limit: number): Promise<SearchResult[]> {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BelkaAI/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await response.text();

    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;
    const titles: { url: string; title: string }[] = [];
    while ((match = resultRegex.exec(html)) !== null && titles.length < limit) {
      const url = decodeURIComponent(match[1].replace(/.*uddg=/, "").replace(/&.*/, ""));
      const title = match[2].replace(/<[^>]*>/g, "").trim();
      if (url.startsWith("http")) titles.push({ url, title });
    }

    const snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]*>/g, "").trim());
    }

    const results: SearchResult[] = [];
    for (let i = 0; i < titles.length; i++) {
      results.push({
        title: titles[i].title,
        url: titles[i].url,
        snippet: snippets[i] || "",
      });
    }

    return results;
  }

  async fetchPage(url: string): Promise<{ title: string; text: string }> {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BelkaBot/1.0)",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      });

      const html = await response.text();
      const textContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);

      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : url;

      return { title, text: textContent };
    } catch (error) {
      logger.error("fetchPage failed", { url, error: String(error) });
      return { title: url, text: "Не удалось загрузить страницу" };
    }
  }

  async deepResearch(query: string): Promise<{ query: string; results: Array<SearchResult & { fullContent: string }> }> {
    const searchResults = await this.search(query, 3);

    const enriched = await Promise.allSettled(
      searchResults.map(async (r) => {
        const page = await this.fetchPage(r.url);
        return { ...r, fullContent: page.text };
      })
    );

    return {
      query,
      results: enriched
        .filter((r): r is PromiseFulfilledResult<SearchResult & { fullContent: string }> => r.status === "fulfilled")
        .map(r => r.value),
    };
  }
}
