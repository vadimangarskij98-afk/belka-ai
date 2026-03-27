import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable, memoryTable, tokenUsageTable } from "@workspace/db";
import { eq, desc, count, and } from "drizzle-orm";
import {
  BELKA_CODER_SYSTEM_PROMPT,
  BELKA_CHAT_SYSTEM_PROMPT,
  REVIEWER_SYSTEM_PROMPT,
  RESEARCHER_SYSTEM_PROMPT,
} from "../agent/system-prompts";
import fs from "fs";
import path from "path";
import { getWorkspace, sanitizeWorkspacePath } from "../lib/workspace-state";
import {
  BELKA_CODER_API_BASE_URL,
  BELKA_DEFAULT_IMAGE_MODEL,
  OPENROUTER_API_URL,
  normalizeBelkaMode,
  type BelkaMode,
} from "../config";
import { mcpRuntime, type McpServerSnapshot } from "../lib/mcp-runtime";

const router: IRouter = Router();

const MODEL_CONFIG = {
  coder: "google/gemini-2.5-flash",
  chat: "google/gemini-2.5-flash",
  reviewer: "google/gemini-2.5-flash",
  researcher: "google/gemini-2.0-flash-001",
} as const;
const BELKA_CODER_TIMEOUT_MS = 120_000;

function getOpenRouterKey(): string {
  return process.env.OPENROUTER_API_KEY || "";
}

interface FileOperation {
  action: "create_file" | "edit_file";
  filePath: string;
  content: string;
  language: string;
}

function extractFileOperations(text: string): FileOperation[] {
  const ops: FileOperation[] = [];
  const codeBlockRegex = /```(\w+)?\s*\n(?:#\s*(.+?)\n|\/\/\s*(.+?)\n|<!--\s*(.+?)\s*-->\n)?([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = match[1] || "text";
    const commentPath = match[2] || match[3] || match[4] || "";
    const content = match[5] || "";

    let filePath = commentPath.trim();
    if (!filePath) {
      const pathMatch = text.substring(Math.max(0, match.index - 200), match.index)
        .match(/(?:файл|file|создай|create|path|путь)[:\s]+[`"']?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)[`"']?/i);
      if (pathMatch) filePath = pathMatch[1];
    }
    if (!filePath) continue;
    if (filePath.includes("..") || filePath.startsWith("/")) continue;

    ops.push({
      action: "create_file",
      filePath,
      content: content.trim(),
      language,
    });
  }
  return ops;
}

function getModelForRole(role: "coder" | "chat" | "reviewer" | "researcher"): string {
  return MODEL_CONFIG[role];
}

function findLastUserMessageIndex(messages: Array<{ role: "user" | "assistant"; content: string }>): number {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role === "user") {
      return index;
    }
  }

  return -1;
}

async function callBelkaCoder(
  message: string,
  conversationId: string,
  onDelta: (text: string) => void,
  mode: BelkaMode,
  temperature: number = 0.7,
  maxTokens: number = 4096,
  systemPrompt?: string,
  historyMessages?: { role: string; content: string }[],
): Promise<string> {
  let reply = "";

  try {
    const response = await fetch(`${BELKA_CODER_API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        mode,
        system_prompt: systemPrompt,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(BELKA_CODER_TIMEOUT_MS),
    });

    if (response.ok) {
      const data = await response.json() as { reply: string; model_used: string };
      reply = data.reply || "";

      if (reply.includes("временно не могу обработать") || reply.includes("модели сейчас недоступны")) {
        reply = "";
      }
    }
  } catch {}

  if (!reply) {
    const apiKey = getOpenRouterKey();
    if (apiKey) {
      try {
        const msgs = historyMessages || [{ role: "user" as const, content: message }];
        const prompt = systemPrompt || BELKA_CODER_SYSTEM_PROMPT;
        reply = await streamOpenRouter(apiKey, getModelForRole("coder"), prompt, msgs, maxTokens, onDelta);
        return reply;
      } catch (fallbackErr: any) {
        console.error("[callBelkaCoder] OpenRouter fallback failed:", fallbackErr?.message);
        reply = "Произошла ошибка при генерации ответа. Попробуйте ещё раз.";
      }
    } else {
      reply = "Извините, сервис временно недоступен. Попробуйте позже.";
    }
  }

  const CHUNK_SIZE = 12;
  for (let i = 0; i < reply.length; i += CHUNK_SIZE) {
    const chunk = reply.slice(i, i + CHUNK_SIZE);
    onDelta(chunk);
    if (i + CHUNK_SIZE < reply.length) {
      await new Promise(r => setTimeout(r, 8));
    }
  }

  return reply;
}

async function streamOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
  onDelta: (text: string) => void,
): Promise<string> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://belka-ai.replit.app",
      "X-Title": "BELKA AI",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: true,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errBody}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let fullContent = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          onDelta(delta);
        }
      } catch {}
    }
  }

  return fullContent;
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
): Promise<string> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://belka-ai.replit.app",
      "X-Title": "BELKA AI",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(120000),
  });

  const responseData = await response.json() as any;
  if (responseData.error) throw new Error(responseData.error.message || JSON.stringify(responseData.error));
  if (responseData.choices?.[0]?.message?.content) return responseData.choices[0].message.content;
  throw new Error("Empty response from OpenRouter");
}

async function webSearch(query: string): Promise<{ results: string; sources: { title: string; url: string; snippet: string }[] }> {
  try {
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
    while ((match = resultRegex.exec(html)) !== null && titles.length < 5) {
      const url = decodeURIComponent(match[1].replace(/.*uddg=/, "").replace(/&.*/, ""));
      const title = match[2].replace(/<[^>]*>/g, "").trim();
      if (url.startsWith("http")) titles.push({ url, title });
    }
    const snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]*>/g, "").trim());
    }

    const sources = titles.map((t, i) => ({
      title: t.title,
      url: t.url,
      snippet: snippets[i] || "",
    }));

    let results = "## Результаты поиска:\n\n";
    for (let i = 0; i < titles.length; i++) {
      results += `${i + 1}. **${titles[i].title}**\n   ${titles[i].url}\n   ${snippets[i] || ""}\n\n`;
    }
    return { results, sources };
  } catch {
    return { results: "", sources: [] };
  }
}

function shouldSearch(content: string): boolean {
  const searchTriggers = [
    'найди', 'поищи', 'загугли', 'поиск', 'найти информацию',
    'что такое', 'как работает', 'документация', 'latest version',
    'новости', 'актуальн', 'свежие данные', 'search for', 'find info',
    'look up', 'исследуй', 'изучи вопрос', 'собери информацию',
    'что нового', 'расскажи про', 'покажи примеры',
  ];
  const lower = content.toLowerCase();
  return searchTriggers.some(t => lower.includes(t));
}

function shouldGenerateImage(content: string): boolean {
  const imageTriggers = [
    'нарисуй', 'сгенерируй изображение', 'создай картинку', 'сделай картинку',
    'generate image', 'create image', 'draw', 'нарисовать', 'картинк',
    'изображение', 'иллюстрац', 'generate a picture', 'make an image',
    'сгенерируй картинку', 'создай изображение',
  ];
  const lower = content.toLowerCase();
  return imageTriggers.some(t => lower.includes(t));
}

async function generateImage(prompt: string): Promise<string | null> {
  try {
    const response = await fetch(`${BELKA_CODER_API_BASE_URL}/pollinations/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        model: BELKA_DEFAULT_IMAGE_MODEL,
        width: 1024,
        height: 1024,
        quality: "medium",
        delivery: "upload",
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as {
      url?: string;
      b64_json?: string;
      content_type?: string;
    };

    if (data.url) {
      return data.url;
    }

    if (data.b64_json && data.content_type) {
      return `data:${data.content_type};base64,${data.b64_json}`;
    }

    return null;
  } catch {
    return null;
  }
}

interface McpToolPlan {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  reason?: string;
}

function extractJsonBlock(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? text).trim();
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function summarizeToolOutput(result: {
  text?: string;
  structuredContent?: unknown;
  content?: Array<Record<string, unknown>>;
  ok?: boolean;
}) {
  const text = typeof result.text === "string" && result.text.trim()
    ? result.text.trim()
    : JSON.stringify(result.structuredContent ?? result.content ?? null, null, 2);

  return truncateText(text || "No tool output", 2500);
}

function formatMcpCapabilities(servers: McpServerSnapshot[]) {
  return servers.map((server) => {
    const toolDigest = server.tools.map((tool) => ({
      name: tool.name,
      description: truncateText(tool.description || "", 220),
      inputSchema: truncateText(JSON.stringify(tool.inputSchema ?? {}), 400),
    }));

    return {
      serverId: server.id,
      serverName: server.name,
      description: truncateText(server.description || "", 240),
      tools: toolDigest,
    };
  });
}

function parseMcpToolPlan(text: string): McpToolPlan[] {
  try {
    const parsed = JSON.parse(extractJsonBlock(text)) as
      | McpToolPlan[]
      | { calls?: McpToolPlan[] };

    const calls = Array.isArray(parsed) ? parsed : parsed.calls ?? [];

    return calls
      .filter((call): call is McpToolPlan =>
        Boolean(
          call
          && typeof call.serverId === "string"
          && typeof call.toolName === "string"
          && call.serverId.trim()
          && call.toolName.trim()
          && call.arguments
          && typeof call.arguments === "object"
          && !Array.isArray(call.arguments),
        ),
      )
      .slice(0, 3)
      .map((call) => ({
        serverId: call.serverId.trim(),
        toolName: call.toolName.trim(),
        arguments: call.arguments,
        reason: typeof call.reason === "string" ? truncateText(call.reason.trim(), 280) : undefined,
      }));
  } catch {
    return [];
  }
}

function shouldConsiderMcp(content: string, mode: string, servers: McpServerSnapshot[]) {
  if (servers.length === 0 || mode === "image") {
    return false;
  }

  if (mode === "code" || mode === "multi-agent") {
    return true;
  }

  const lower = content.toLowerCase();
  const triggers = [
    "github",
    "repo",
    "repository",
    "issue",
    "pull request",
    "browser",
    "page",
    "site",
    "screenshot",
    "playwright",
    "mcp",
    "file",
    "folder",
    "workspace",
    "read",
    "docs",
    "documentation",
    "latest",
    "web",
    "search",
  ];

  return triggers.some((trigger) => lower.includes(trigger));
}

async function planMcpToolCalls(content: string, mode: string, servers: McpServerSnapshot[]): Promise<McpToolPlan[]> {
  if (!shouldConsiderMcp(content, mode, servers)) {
    return [];
  }

  const plannerPrompt = [
    "You are BELKA MCP planner.",
    "Return JSON only, no markdown and no explanations.",
    'Use this schema: {"calls":[{"serverId":"...","toolName":"...","arguments":{},"reason":"..."}]}.',
    "If no tools are needed, return {\"calls\":[]}.",
    "Never invent server ids or tool names.",
    "Use at most 3 tool calls.",
  ].join(" ");

  const plannerInput = JSON.stringify({
    task: content,
    mode,
    availableServers: formatMcpCapabilities(servers),
  });

  try {
    const apiKey = getOpenRouterKey();
    if (apiKey) {
      const result = await callOpenRouter(
        apiKey,
        getModelForRole("researcher"),
        plannerPrompt,
        [{ role: "user", content: plannerInput }],
        1400,
      );
      return parseMcpToolPlan(result);
    }

    const result = await callBelkaCoder(
      plannerInput,
      `mcp-plan-${Date.now()}`,
      () => {},
      normalizeBelkaMode(mode),
      0.1,
      1400,
      plannerPrompt,
    );

    return parseMcpToolPlan(result);
  } catch {
    return [];
  }
}

async function runMcpTooling(
  userId: number,
  content: string,
  mode: string,
  res: any,
): Promise<{ context: string; runs: Array<{ serverId: string; toolName: string; ok: boolean }> }> {
  const connectedServers = mcpRuntime.listServers(String(userId))
    .filter((server) => server.connected && server.tools.length > 0);

  if (connectedServers.length === 0) {
    return { context: "", runs: [] };
  }

  const toolPlans = await planMcpToolCalls(content, mode, connectedServers);
  if (toolPlans.length === 0) {
    return { context: "", runs: [] };
  }

  sendSSE(res, "status", { step: "tooling", text: "Подключаю MCP-инструменты..." });

  const contextParts: string[] = [];
  const runs: Array<{ serverId: string; toolName: string; ok: boolean }> = [];

  for (const plan of toolPlans) {
    const server = connectedServers.find((item) => item.id === plan.serverId);
    const tool = server?.tools.find((item) => item.name === plan.toolName);

    if (!server || !tool) {
      continue;
    }

    sendSSE(res, "tool_call", {
      tool: `${server.name}: ${plan.toolName}`,
      args: plan.arguments,
      status: "running",
    });

    try {
      const result = await mcpRuntime.callTool(String(userId), plan.serverId, plan.toolName, plan.arguments);
      const summary = summarizeToolOutput(result);

      sendSSE(res, "tool_result", {
        tool: `${server.name}: ${plan.toolName}`,
        args: plan.arguments,
        status: result.ok ? "done" : "error",
        result: truncateText(summary, 160),
      });

      contextParts.push([
        `### ${server.name} / ${plan.toolName}`,
        plan.reason ? `Reason: ${plan.reason}` : "",
        summary,
      ].filter(Boolean).join("\n"));

      runs.push({ serverId: plan.serverId, toolName: plan.toolName, ok: Boolean(result.ok) });
    } catch (error) {
      sendSSE(res, "tool_result", {
        tool: `${server.name}: ${plan.toolName}`,
        args: plan.arguments,
        status: "error",
        error: error instanceof Error ? error.message : "Tool call failed",
      });
      runs.push({ serverId: plan.serverId, toolName: plan.toolName, ok: false });
    }
  }

  if (contextParts.length === 0) {
    return { context: "", runs };
  }

  return {
    context: `\n\n--- MCP TOOL RESULTS ---\n${contextParts.join("\n\n")}`,
    runs,
  };
}

async function getOwnedConversation(userId: number, conversationId: number) {
  const conversations = await db.select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, conversationId), eq(conversationsTable.userId, userId)))
    .limit(1);

  return conversations[0] ?? null;
}

async function getMemoryContext(userId: number): Promise<string> {
  try {
    const memories = await db.select()
      .from(memoryTable)
      .where(eq(memoryTable.userId, userId))
      .orderBy(desc(memoryTable.createdAt))
      .limit(30);

    if (memories.length === 0) return "";
    const grouped: Record<string, string[]> = {};
    for (const m of memories) {
      const cat = m.category || "general";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(`${m.key}: ${m.value}`);
    }
    let context = "\n\n--- ПАМЯТЬ ПРОЕКТА (контекст из предыдущих сессий) ---\n";
    for (const [cat, items] of Object.entries(grouped)) {
      context += `\n## ${cat.toUpperCase()}\n`;
      for (const item of items) context += `- ${item}\n`;
    }
    return context;
  } catch {
    return "";
  }
}

async function autoExtractFacts(userId: number, content: string, response: string): Promise<void> {
  try {
    const factPatterns = [
      { regex: /(?:проект|project)\s+(?:называется|called|named)\s+["']?([^"'\n.]+)/i, key: "project_name", category: "project" },
      { regex: /(?:используем|using|use)\s+(React|Vue|Angular|Next|Nuxt|Express|Django|Flask|Rails|Laravel)/i, key: "framework", category: "tech" },
      { regex: /(?:база данных|database|db)\s*[—:\-]\s*(\w+)/i, key: "database", category: "tech" },
      { regex: /(?:язык|language)\s*[—:\-]\s*(TypeScript|JavaScript|Python|Go|Rust|Java|PHP)/i, key: "language", category: "tech" },
    ];

    const facts: { key: string; value: string; category: string }[] = [];
    for (const pattern of factPatterns) {
      const match = content.match(pattern.regex) || response.match(pattern.regex);
      if (match) {
        facts.push({ key: pattern.key, value: match[1].trim(), category: pattern.category });
      }
    }

    if (facts.length > 0) {
      for (const fact of facts) {
        const existing = await db.select().from(memoryTable)
          .where(and(eq(memoryTable.userId, userId), eq(memoryTable.key, fact.key)))
          .limit(1);
        if (existing.length === 0) {
          await db.insert(memoryTable).values({
            userId,
            key: fact.key,
            value: fact.value,
            category: fact.category,
          });
        }
      }
    }
  } catch {}
}

function sendSSE(res: any, event: string, data: any) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

router.get("/", async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const archived = req.query.archived === "true";
    const convs = await db.select().from(conversationsTable)
      .where(and(eq(conversationsTable.userId, userId), eq(conversationsTable.isArchived, archived)))
      .orderBy(desc(conversationsTable.updatedAt)).limit(limit).offset(offset);
    const total = await db.select({ count: count() }).from(conversationsTable)
      .where(and(eq(conversationsTable.userId, userId), eq(conversationsTable.isArchived, archived)));
    res.json({
      conversations: convs.map(c => ({
        id: String(c.id),
        title: c.title,
        agentId: c.agentId,
        mode: c.mode,
        isArchived: c.isArchived,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        messageCount: 0,
      })),
      total: total[0]?.count || 0,
    });
  } catch (err) {
    req.log.error({ err }, "List conversations error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { title, agentId, mode, repositoryId } = req.body;
    const inserted = await db.insert(conversationsTable).values({
      userId,
      title: title || "New Conversation",
      agentId,
      mode: mode || "chat",
      repositoryId,
    }).returning();
    const conv = inserted[0];
    res.status(201).json({
      id: String(conv.id),
      title: conv.title,
      agentId: conv.agentId,
      mode: conv.mode,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messageCount: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Create conversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const id = Number(req.params.id);
    const conv = await getOwnedConversation(userId, id);
    if (!conv) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const msgs = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.conversationId, id));
    res.json({
      id: String(conv.id),
      title: conv.title,
      agentId: conv.agentId,
      mode: conv.mode,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messageCount: Number(msgs[0]?.count) || 0,
    });
  } catch (err) {
    req.log.error({ err }, "Get conversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const id = Number(req.params.id);
    const conv = await getOwnedConversation(userId, id);
    if (!conv) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db.delete(messagesTable).where(eq(messagesTable.conversationId, id));
    await db.delete(conversationsTable).where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete conversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/archive", async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const id = Number(req.params.id);
    const conv = await getOwnedConversation(userId, id);
    if (!conv) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db.update(conversationsTable).set({
      isArchived: true,
      archivedAt: new Date(),
    }).where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Archive conversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/unarchive", async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const id = Number(req.params.id);
    const conv = await getOwnedConversation(userId, id);
    if (!conv) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db.update(conversationsTable).set({
      isArchived: false,
      archivedAt: null,
    }).where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Unarchive conversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/messages", async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const id = Number(req.params.id);
    const conv = await getOwnedConversation(userId, id);
    if (!conv) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);
    res.json({
      messages: msgs.map(m => ({
        id: String(m.id),
        conversationId: String(m.conversationId),
        role: m.role,
        content: m.content,
        agentName: m.agentName,
        agentAvatar: m.agentAvatar,
        createdAt: m.createdAt.toISOString(),
        metadata: m.metadata ? JSON.parse(m.metadata) : undefined,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Get messages error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/messages", async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const conversationId = Number(req.params.id);
    const conversation = await getOwnedConversation(userId, conversationId);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const { content, mode, useMultiAgent } = req.body;
    const requestedMode = typeof mode === "string" && mode.trim() ? mode : conversation.mode;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });

    await db.insert(messagesTable).values({
      conversationId,
      role: "user",
      content,
    });

    const thinkingStart = Date.now();
    sendSSE(res, "thinking_start", { timestamp: thinkingStart });
    sendSSE(res, "status", { step: "thinking", text: "Анализирую запрос..." });

    const history = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(messagesTable.createdAt)
      .limit(20);

    const messages = history.map(m => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: m.content,
    })).filter(m => m.role === "user" || m.role === "assistant");

    let searchContext = "";
    let searchSources: { title: string; url: string; snippet: string }[] = [];

    if (shouldSearch(content)) {
      sendSSE(res, "status", { step: "searching", text: "Ищу информацию в интернете..." });

      const searchResult = await webSearch(content);
      searchContext = searchResult.results;
      searchSources = searchResult.sources;

      if (searchSources.length > 0) {
        sendSSE(res, "sources", { sources: searchSources });
      }
    }

    let generatedImageUrl: string | null = null;
    if (requestedMode === "image" || shouldGenerateImage(content)) {
      sendSSE(res, "status", { step: "generating_image", text: "Генерирую изображение..." });
      generatedImageUrl = await generateImage(content);
      if (generatedImageUrl) {
        sendSSE(res, "image", { url: generatedImageUrl, prompt: content });
      }
    }

    const memoryContext = await getMemoryContext(userId);
    const mcpResult = await runMcpTooling(userId, content, requestedMode, res);
    const mcpContext = mcpResult.context;

    let enrichedContent = content;
    if (memoryContext) enrichedContent += "\n\n" + memoryContext;
    if (mcpContext) enrichedContent += mcpContext;
    if (searchContext) enrichedContent += "\n\n--- ВЕБ-ПОИСК ---\n" + searchContext;
    if (generatedImageUrl) enrichedContent += `\n\n--- СГЕНЕРИРОВАННОЕ ИЗОБРАЖЕНИЕ ---\n![Generated](${generatedImageUrl})\nИзображение уже сгенерировано и показано пользователю.`;

    const historyContext = messages.slice(0, -1).map(m => `${m.role}: ${m.content}`).join("\n").slice(-3000);
    const fullMessage = historyContext
      ? `Контекст предыдущих сообщений:\n${historyContext}\n\nНовый запрос:\n${enrichedContent}`
      : enrichedContent;

    sendSSE(res, "status", { step: "generating", text: "Генерирую ответ..." });

    let aiContent = "";
    const belkaConvId = `conv-${conversationId}`;

    const enrichedMessages = messages.map(m => ({ role: m.role, content: m.content }));
    if (searchContext || memoryContext || mcpContext || generatedImageUrl) {
      const lastIdx = findLastUserMessageIndex(enrichedMessages);
      if (lastIdx >= 0) {
        let extra = "";
        if (memoryContext) extra += "\n\n" + memoryContext;
        if (mcpContext) extra += mcpContext;
        if (searchContext) extra += "\n\n--- ВЕБ-ПОИСК ---\n" + searchContext;
        if (generatedImageUrl) extra += `\n\n--- СГЕНЕРИРОВАННОЕ ИЗОБРАЖЕНИЕ ---\n![Generated](${generatedImageUrl})`;
        enrichedMessages[lastIdx] = { ...enrichedMessages[lastIdx], content: enrichedMessages[lastIdx].content + extra };
      }
    }

    if (useMultiAgent && requestedMode === "multi-agent") {
      sendSSE(res, "status", { step: "coding", text: "BELKA CODER пишет код..." });

      aiContent = await callBelkaCoder(
        fullMessage,
        belkaConvId,
        (delta) => sendSSE(res, "delta", { content: delta }),
        "multiagent",
        0.7,
        4096,
        BELKA_CODER_SYSTEM_PROMPT,
        enrichedMessages,
      );

      sendSSE(res, "status", { step: "reviewing", text: "CODE REVIEWER проверяет решение..." });
      sendSSE(res, "agent_start", { agent: "CODE REVIEWER", avatar: "reviewer" });

      const reviewerMessages = [
        ...enrichedMessages,
        { role: "assistant" as const, content: aiContent },
        { role: "user" as const, content: "Проверь приведённый код/решение на баги, проблемы безопасности и предложи улучшения." },
      ];

      const reviewerContent = await callBelkaCoder(
        `Проверь этот код/решение на баги, проблемы безопасности и предложи улучшения:\n\n${aiContent}`,
        `${belkaConvId}-review`,
        (delta) => sendSSE(res, "agent_delta", { content: delta, agent: "CODE REVIEWER" }),
        "code",
        0.3,
        2048,
        REVIEWER_SYSTEM_PROMPT,
        reviewerMessages,
      );

      const reviewerMsg = await db.insert(messagesTable).values({
        conversationId,
        role: "agent",
        content: reviewerContent,
        agentName: "CODE REVIEWER",
        agentAvatar: "reviewer",
      }).returning();

      sendSSE(res, "agent_done", {
        id: String(reviewerMsg[0].id),
        agent: "CODE REVIEWER",
        avatar: "reviewer",
      });
    } else {
      const role = requestedMode === "chat" || requestedMode === "image" ? "chat" as const : "coder" as const;
      const belkaMode = normalizeBelkaMode(requestedMode);
      const systemPrompt = role === "chat" ? BELKA_CHAT_SYSTEM_PROMPT : BELKA_CODER_SYSTEM_PROMPT;

      aiContent = await callBelkaCoder(
        fullMessage,
        belkaConvId,
        (delta) => sendSSE(res, "delta", { content: delta }),
        belkaMode,
        0.7,
        4096,
        systemPrompt,
        enrichedMessages,
      );
    }

    const thinkingEnd = Date.now();
    sendSSE(res, "thinking_end", { duration: thinkingEnd - thinkingStart });

    const WORKSPACE = getWorkspace(userId);
    if (fs.existsSync(WORKSPACE)) {
      const fileOps = extractFileOperations(aiContent);
      for (const op of fileOps) {
        sendSSE(res, "tool_call", { tool: op.action, args: { path: op.filePath, language: op.language }, status: "running" });
        try {
          const safePath = sanitizeWorkspacePath(userId, op.filePath);
          if (safePath) {
            const dir = path.dirname(safePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(safePath, op.content, "utf-8");
            sendSSE(res, "tool_result", { tool: op.action, args: { path: op.filePath }, status: "done", result: `File ${op.action}: ${op.filePath}` });
          } else {
            sendSSE(res, "tool_result", { tool: op.action, args: { path: op.filePath }, status: "error", error: "path outside workspace" });
          }
        } catch (fileErr: any) {
          sendSSE(res, "tool_result", { tool: op.action, args: { path: op.filePath }, status: "error", error: fileErr.message });
        }
      }
    }

    const metadata: any = {};
    if (searchSources.length > 0) metadata.sources = searchSources;
    if (generatedImageUrl) metadata.image = generatedImageUrl;
    if (mcpResult.runs.length > 0) metadata.mcp = mcpResult.runs;

    const savedMsg = await db.insert(messagesTable).values({
      conversationId,
      role: "assistant",
      content: aiContent,
      agentName: "BELKA CODER",
      agentAvatar: "belka",
      metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : undefined,
    }).returning();

    await db.update(conversationsTable)
      .set({ updatedAt: new Date() })
      .where(and(eq(conversationsTable.id, conversationId), eq(conversationsTable.userId, userId)));

    autoExtractFacts(userId, content, aiContent).catch(() => {});

    const estimatedTokens = Math.ceil((aiContent.length + content.length) / 4);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const existing = await db.select().from(tokenUsageTable)
        .where(and(eq(tokenUsageTable.userId, userId), eq(tokenUsageTable.date, today)))
        .limit(1);
      if (existing.length > 0) {
        await db.update(tokenUsageTable)
          .set({ tokensUsed: existing[0].tokensUsed + estimatedTokens })
          .where(eq(tokenUsageTable.id, existing[0].id));
      } else {
        await db.insert(tokenUsageTable).values({
          userId,
          tokensUsed: estimatedTokens,
          date: today,
        });
      }
    } catch {}

    sendSSE(res, "done", {
      id: String(savedMsg[0].id),
      searchUsed: searchSources.length > 0,
      imageGenerated: !!generatedImageUrl,
      mcpUsed: mcpResult.runs.length > 0,
    });

    res.end();
  } catch (err: any) {
    req.log.error({ err }, "Send message error");
    try {
      sendSSE(res, "error", { message: err.message || "Failed to generate response" });
      res.end();
    } catch {}
  }
});

export default router;
