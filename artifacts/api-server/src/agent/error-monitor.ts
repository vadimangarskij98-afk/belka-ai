import Anthropic from "@anthropic-ai/sdk";

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = "info") {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  private format(level: string, message: string, meta?: Record<string, unknown>): string {
    const ts = new Date().toISOString();
    const metaStr = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${ts} [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  info(message: string, meta?: Record<string, unknown>) {
    if (this.shouldLog("info")) console.log(this.format("info", message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>) {
    if (this.shouldLog("warn")) console.warn(this.format("warn", message, meta));
  }

  error(message: string, meta?: Record<string, unknown>) {
    if (this.shouldLog("error")) console.error(this.format("error", message, meta));
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (this.shouldLog("debug")) console.log(this.format("debug", message, meta));
  }
}

export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || "info"
);

export class AutoFixer {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "dummy",
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });
  }

  async fixTypeScriptError(
    errorMessage: string,
    code: string,
    filePath: string
  ): Promise<{ fixed: boolean; code?: string; explanation?: string }> {
    logger.warn("AutoFix triggered", { filePath, error: errorMessage.slice(0, 200) });

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: `Исправь TypeScript ошибку.\n\nОШИБКА: ${errorMessage}\n\nФАЙЛ: ${filePath}\nКОД:\n\`\`\`typescript\n${code}\n\`\`\`\n\nОтветь ТОЛЬКО в JSON:\n{"fixed": true, "code": "исправленный код без бэктиков", "explanation": "что было не так"}`,
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, ""));
      return parsed;
    } catch (error) {
      logger.error("AutoFix failed", { error: String(error) });
      return { fixed: false, explanation: String(error) };
    }
  }

  async analyzeRuntimeError(error: Error, context?: string): Promise<string> {
    try {
      const response = await this.anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 512,
        messages: [{
          role: "user",
          content: `Проанализируй ошибку runtime и дай КРАТКОЕ объяснение + решение.\n\nОШИБКА: ${error.name}: ${error.message}\nСТЭК: ${error.stack?.slice(0, 500)}\nКОНТЕКСТ: ${context || "нет"}\n\nФормат: "Причина: ... | Решение: ... | Превентивная мера: ..."`,
        }],
      });
      return response.content[0].type === "text" ? response.content[0].text : "Анализ недоступен";
    } catch {
      return "Анализ недоступен";
    }
  }
}

export function errorHandlerMiddleware(
  err: Error,
  req: import("express").Request,
  res: import("express").Response,
  _next: import("express").NextFunction
) {
  logger.error("Express error", {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
  });

  const statusCode = (err as Record<string, number>).statusCode || 500;

  res.status(statusCode).json({
    error: {
      message: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
      code: statusCode,
    },
  });
}

export class HealthMonitor {
  private checks: Map<string, () => Promise<boolean>> = new Map();

  register(name: string, check: () => Promise<boolean>) {
    this.checks.set(name, check);
  }

  async runAll(): Promise<Record<string, { status: "ok" | "fail"; latency: number }>> {
    const results: Record<string, { status: "ok" | "fail"; latency: number }> = {};

    for (const [name, check] of this.checks) {
      const start = Date.now();
      try {
        const ok = await check();
        results[name] = { status: ok ? "ok" : "fail", latency: Date.now() - start };
      } catch {
        results[name] = { status: "fail", latency: Date.now() - start };
      }
    }

    const failed = Object.entries(results).filter(([, v]) => v.status === "fail");
    if (failed.length > 0) {
      logger.error("Health check failures", { failed: failed.map(([k]) => k) });
    }

    return results;
  }
}
