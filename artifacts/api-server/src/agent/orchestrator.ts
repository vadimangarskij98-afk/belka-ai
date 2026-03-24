import { ExternalAgents } from "./external-agents";
import { MemoryManager } from "./memory";
import { WebSearch } from "./web-search";
import { logger } from "./error-monitor";

export interface StormResult {
  problem: string;
  perspectives: Array<{ agent: string; ideas: string[] }>;
  synthesis: string;
  actionPlan: Array<{ step: number; action: string; owner: string; priority: "high" | "mid" | "low" }>;
  bestIdea: string;
}

export class BrainStormOrchestrator {
  private agents = new ExternalAgents();
  private memory = new MemoryManager();
  private webSearch = new WebSearch();

  async storm(problem: string, userId?: number): Promise<StormResult> {
    logger.info("BrainStorm started", { problem: problem.slice(0, 100) });

    const [searchData, claudeView, geminiView] = await Promise.allSettled([
      this.webSearch.deepResearch(problem),
      this.agents.callClaude(
        `Ты эксперт-инноватор. Назови 3 нестандартные идеи для решения: "${problem}". Только идеи, по одной строке.`
      ),
      this.agents.callGemini(
        `Ты аналитик. Предложи 3 практических, реализуемых подхода к: "${problem}". Будь конкретен.`
      ),
    ]);

    const webContext = searchData.status === "fulfilled"
      ? searchData.value.results.map(r => r.snippet).join("\n")
      : "";

    const perspectives = [
      { agent: "Claude (Innovation)", ideas: this.parseIdeas(claudeView) },
      { agent: "Gemini (Analytics)", ideas: this.parseIdeas(geminiView) },
    ].filter(p => p.ideas.length > 0);

    const allIdeas = perspectives.map(p => `${p.agent}:\n${p.ideas.join("\n")}`).join("\n\n");

    const synthesis = await this.agents.callClaude(`
Ты мета-оркестратор. Проанализируй идеи от нескольких агентов и:
1. Найди лучшую идею
2. Объясни почему она лучшая
3. Создай ACTION PLAN (5 шагов)

ЗАДАЧА: ${problem}

КОНТЕКСТ ИЗ ИНТЕРНЕТА: ${webContext.slice(0, 1000)}

ИДЕИ АГЕНТОВ:
${allIdeas}

Ответь в JSON:
{
  "bestIdea": "...",
  "synthesis": "...",
  "actionPlan": [
    {"step": 1, "action": "...", "owner": "developer|agent|user", "priority": "high|mid|low"}
  ]
}
    `);

    let parsed: Partial<StormResult> = {};
    try {
      parsed = JSON.parse(synthesis.replace(/```json\n?|\n?```/g, ""));
    } catch {
      parsed = { bestIdea: "Синтез недоступен", synthesis, actionPlan: [] };
    }

    if (userId) {
      await this.memory.save(
        `brainstorm:${Date.now()}`,
        JSON.stringify({ problem, bestIdea: parsed.bestIdea }),
        "task",
        userId
      );
    }

    const result: StormResult = {
      problem,
      perspectives,
      synthesis: parsed.synthesis || synthesis,
      actionPlan: parsed.actionPlan || [],
      bestIdea: parsed.bestIdea || "",
    };

    logger.info("BrainStorm completed", { perspectives: perspectives.length });
    return result;
  }

  private parseIdeas(result: PromiseSettledResult<string>): string[] {
    if (result.status === "rejected") return [];
    return result.value.split("\n").filter(l => l.trim().length > 10).slice(0, 5);
  }
}
