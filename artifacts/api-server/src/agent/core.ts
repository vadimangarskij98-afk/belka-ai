import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./error-monitor";
import { MemoryManager } from "./memory";
import { WebSearch } from "./web-search";
import { MCPClient } from "./mcp-client";
import { ExternalAgents } from "./external-agents";

export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
}

export interface AgentContext {
  userId?: number;
  agentId?: number;
  conversationId?: number;
  mode: "chat" | "coder" | "researcher" | "planner" | "brainstorm" | "orchestrator";
  history: AgentMessage[];
  memory: Record<string, string>;
}

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  memoryUpdates?: MemoryUpdate[];
  metadata?: {
    model: string;
    tokens: number;
    duration: number;
    errorFixed?: boolean;
  };
}

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
}

interface MemoryUpdate {
  key: string;
  value: string;
  category: string;
}

export class BelkaAgent {
  private anthropic: Anthropic;
  private memory: MemoryManager;
  private webSearch: WebSearch;
  private mcp: MCPClient;
  private external: ExternalAgents;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "dummy",
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });
    this.memory = new MemoryManager();
    this.webSearch = new WebSearch();
    this.mcp = new MCPClient();
    this.external = new ExternalAgents();
  }

  async run(userMessage: string, ctx: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    logger.info("Agent run started", { userId: ctx.userId, mode: ctx.mode });

    try {
      const memories = await this.memory.getRelevant(userMessage, ctx.userId);
      const systemPrompt = await this.buildSystemPrompt(ctx, memories);
      const intent = this.classifyIntent(userMessage);

      let response: AgentResponse;

      if (intent.needsWebSearch) {
        response = await this.runWithWebSearch(userMessage, systemPrompt, ctx);
      } else if (intent.needsBrainstorm) {
        response = await this.runBrainStorm(userMessage, ctx);
      } else {
        response = await this.runDirect(userMessage, systemPrompt, ctx);
      }

      await this.extractAndSaveMemory(userMessage, response.content, ctx);

      const duration = Date.now() - startTime;
      logger.info("Agent run completed", { duration, tokens: response.metadata?.tokens });

      return { ...response, metadata: { ...response.metadata!, duration } };

    } catch (error) {
      logger.error("Agent run failed", { error: String(error) });
      return await this.handleError(error, userMessage, ctx);
    }
  }

  private classifyIntent(message: string): {
    needsWebSearch: boolean;
    needsBrainstorm: boolean;
    needsMemory: boolean;
    needsCode: boolean;
  } {
    const lower = message.toLowerCase();
    return {
      needsWebSearch: /найди|поищи|что сейчас|latest|news|search|актуальн|2024|2025|2026/.test(lower),
      needsBrainstorm: /идеи|варианты|мозговой штурм|brainstorm|придумай|как лучше/.test(lower),
      needsMemory: /помни|запомни|я говорил|раньше|previously|remember/.test(lower),
      needsCode: /код|напиши функцию|implement|create component|fix bug|ошибка/.test(lower),
    };
  }

  private async buildSystemPrompt(ctx: AgentContext, memories: Array<{key: string; value: string}>): Promise<string> {
    const memoryContext = memories.length > 0
      ? `\n\n## ЧТО Я ПОМНЮ О ПОЛЬЗОВАТЕЛЕ:\n${memories.map(m => `- ${m.key}: ${m.value}`).join("\n")}`
      : "";

    const modeInstructions: Record<string, string> = {
      coder: "Ты в режиме CODER. Пиши чистый TypeScript/React код. После каждого кода — краткое объяснение. Всегда предлагай тесты.",
      researcher: "Ты в режиме RESEARCHER. Ищи актуальную информацию, синтезируй из нескольких источников. Указывай источники.",
      planner: "Ты в режиме PLANNER. Создавай детальные планы с временными рамками, зависимостями и метриками успеха.",
      brainstorm: "Ты в режиме BRAINSTORM. Генерируй 5-7 нестандартных идей. Мысли нестандартно. Критикуй свои же идеи.",
      orchestrator: "Ты в режиме ORCHESTRATOR. Декомпозируй задачу, назначь подзадачи агентам, синтезируй результаты.",
      chat: "Ты в режиме CHAT. Дружелюбный, краткий, по делу.",
    };

    return `Ты — BELKA AI агент. ${modeInstructions[ctx.mode] || modeInstructions.chat}
Stack проекта: Node 24, TypeScript, Express 5, PostgreSQL, Drizzle ORM, React 19, Vite, Tailwind CSS.
${memoryContext}`;
  }

  private async runDirect(message: string, systemPrompt: string, ctx: AgentContext): Promise<AgentResponse> {
    const messages = [
      ...ctx.history.slice(-10).filter(m => m.role === "user" || m.role === "assistant"),
      { role: "user" as const, content: message },
    ];

    const response = await this.anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";
    return {
      content,
      metadata: {
        model: "claude-sonnet-4-20250514",
        tokens: response.usage.input_tokens + response.usage.output_tokens,
        duration: 0,
      },
    };
  }

  private async runWithWebSearch(message: string, systemPrompt: string, ctx: AgentContext): Promise<AgentResponse> {
    const searchResults = await this.webSearch.search(message);
    const searchContext = searchResults.map(r => `[${r.title}](${r.url})\n${r.snippet}`).join("\n\n");
    const augmentedMessage = `${message}\n\n## РЕЗУЛЬТАТЫ ПОИСКА:\n${searchContext}`;
    return await this.runDirect(augmentedMessage, systemPrompt, ctx);
  }

  private async runBrainStorm(message: string, ctx: AgentContext): Promise<AgentResponse> {
    const [claudeIdeas, geminiIdeas] = await Promise.allSettled([
      this.external.callClaude(
        `Ты генератор идей. Дай 3 нестандартные идеи для: ${message}. Только идеи, без объяснений.`,
        "claude-haiku-4-5"
      ),
      this.external.callGemini(
        `Ты критик и инноватор. Предложи 3 альтернативных подхода к: ${message}`
      ),
    ]);

    const ideas1 = claudeIdeas.status === "fulfilled" ? claudeIdeas.value : "Агент недоступен";
    const ideas2 = geminiIdeas.status === "fulfilled" ? geminiIdeas.value : "Агент недоступен";

    const synthesis = await this.external.callClaude(`
Ты оркестратор мозгового штурма. Синтезируй и улучши идеи:

ТОЧКА ЗРЕНИЯ 1 (Claude):
${ideas1}

ТОЧКА ЗРЕНИЯ 2 (Gemini):
${ideas2}

ЗАДАЧА ПОЛЬЗОВАТЕЛЯ: ${message}

Создай финальный список из 5 лучших идей с кратким обоснованием каждой.
    `);

    return {
      content: `## Мозговой штурм\n\n${synthesis}`,
      metadata: { model: "multi-agent", tokens: 0, duration: 0 },
    };
  }

  private async extractAndSaveMemory(userMessage: string, response: string, ctx: AgentContext): Promise<void> {
    try {
      const extraction = await this.external.callClaude(`
Проанализируй диалог и извлеки ТОЛЬКО важные факты о пользователе для запоминания.
Ответь в JSON: {"facts": [{"key": "...", "value": "...", "category": "preference|fact|task|context"}]}
Если нечего запомнить — {"facts": []}

ПОЛЬЗОВАТЕЛЬ: ${userMessage}
АГЕНТ: ${response.slice(0, 200)}
      `, "claude-haiku-4-5");

      const parsed = JSON.parse(extraction.replace(/```json\n?|\n?```/g, ""));
      for (const fact of parsed.facts || []) {
        await this.memory.save(fact.key, fact.value, fact.category, ctx.userId, String(ctx.agentId));
      }
    } catch {
      // Not critical
    }
  }

  private async handleError(error: unknown, message: string, _ctx: AgentContext): Promise<AgentResponse> {
    logger.error("Handling agent error", { error: String(error) });

    try {
      const fallbackResponse = await this.external.callGemini(
        `Ответь на вопрос пользователя: ${message}`
      );
      if (fallbackResponse) {
        return {
          content: `Основная модель недоступна. Ответ от резервного агента:\n\n${fallbackResponse}`,
          metadata: { model: "gemini-fallback", tokens: 0, duration: 0, errorFixed: true },
        };
      }
    } catch { /* continue */ }

    return {
      content: "Извини, произошла ошибка. Попробуй повторить запрос или переформулируй его.",
      metadata: { model: "error", tokens: 0, duration: 0 },
    };
  }
}
