import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { logger } from "./error-monitor";

export class ExternalAgents {
  private anthropic: Anthropic;
  private openai: OpenAI;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "dummy",
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
  }

  async callClaude(
    prompt: string,
    model: string = "claude-sonnet-4-20250514",
    systemPrompt?: string,
    maxTokens = 2048
  ): Promise<string> {
    try {
      const response = await this.anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });
      return response.content[0].type === "text" ? response.content[0].text : "";
    } catch (error) {
      logger.error("Claude call failed", { error: String(error), model });
      throw error;
    }
  }

  async *streamClaude(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    const stream = await this.anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        yield chunk.delta.text;
      }
    }
  }

  async callGemini(prompt: string, _model = "gemini-1.5-flash"): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      logger.warn("Gemini API key not configured");
      return "";
    }
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${_model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
          signal: AbortSignal.timeout(30000),
        }
      );
      const data = await response.json() as any;
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error) {
      logger.error("Gemini call failed", { error: String(error) });
      return "";
    }
  }

  async callOpenAI(prompt: string, model = "gpt-4o-mini", systemPrompt?: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
        max_tokens: 2048,
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (error) {
      logger.error("OpenAI call failed", { error: String(error), model });
      return "";
    }
  }

  async call(
    model: "claude" | "gemini" | "openai",
    prompt: string,
    options?: { systemPrompt?: string; subModel?: string }
  ): Promise<string> {
    switch (model) {
      case "claude":   return this.callClaude(prompt, options?.subModel, options?.systemPrompt);
      case "gemini":   return this.callGemini(prompt, options?.subModel);
      case "openai":   return this.callOpenAI(prompt, options?.subModel, options?.systemPrompt);
      default: throw new Error(`Unknown model: ${model}`);
    }
  }

  async callFree(prompt: string): Promise<{ response: string; model: string }> {
    try {
      const response = await this.callGemini(prompt);
      if (response && response.length > 10) {
        return { response, model: "gemini-1.5-flash" };
      }
    } catch { /* continue */ }

    return { response: "Все бесплатные модели недоступны", model: "none" };
  }
}
