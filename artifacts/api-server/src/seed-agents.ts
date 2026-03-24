import { db, agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  BELKA_CODER_SYSTEM_PROMPT,
  BELKA_CHAT_SYSTEM_PROMPT,
  REVIEWER_SYSTEM_PROMPT,
  RESEARCHER_SYSTEM_PROMPT,
  PLANNER_SYSTEM_PROMPT,
  DESIGNER_SYSTEM_PROMPT,
} from "./agent/system-prompts";

const AGENTS = [
  {
    name: "BELKA CODER",
    description: "Elite AI coding agent. Writes clean TypeScript/React code, debugs, reviews architecture. Supports Node 24, Express 5, PostgreSQL, Drizzle ORM, React 19, Vite, Tailwind CSS.",
    avatar: "belka",
    role: "coder",
    modelId: "claude-sonnet-4-20250514",
    systemPrompt: BELKA_CODER_SYSTEM_PROMPT,
    capabilities: JSON.stringify(["code", "debug", "review", "architecture", "explain", "web-search"]),
    isActive: true,
    memoryEnabled: true,
  },
  {
    name: "BELKA CHAT",
    description: "Friendly chat mode agent for natural conversations about code, architecture, best practices, and any topic.",
    avatar: "belka-chat",
    role: "chat",
    modelId: "claude-sonnet-4-20250514",
    systemPrompt: BELKA_CHAT_SYSTEM_PROMPT,
    capabilities: JSON.stringify(["chat", "explain", "recommend", "web-search"]),
    isActive: true,
    memoryEnabled: true,
  },
  {
    name: "CODE REVIEWER",
    description: "Specialized agent that reviews code for bugs, security issues, performance problems, and best practices.",
    avatar: "reviewer",
    role: "reviewer",
    modelId: "claude-sonnet-4-20250514",
    systemPrompt: REVIEWER_SYSTEM_PROMPT,
    capabilities: JSON.stringify(["review", "security-audit", "performance-check"]),
    isActive: true,
    memoryEnabled: false,
  },
  {
    name: "RESEARCHER",
    description: "Information search and analysis agent. Finds documentation, best practices, solutions, and latest tech updates.",
    avatar: "researcher",
    role: "researcher",
    modelId: "claude-sonnet-4-20250514",
    systemPrompt: RESEARCHER_SYSTEM_PROMPT,
    capabilities: JSON.stringify(["search", "analyze", "summarize", "compare"]),
    isActive: true,
    memoryEnabled: true,
  },
  {
    name: "PLANNER",
    description: "Project planning agent. Creates detailed roadmaps, task breakdowns, time estimates, and dependency analysis.",
    avatar: "planner",
    role: "planner",
    modelId: "claude-sonnet-4-20250514",
    systemPrompt: PLANNER_SYSTEM_PROMPT,
    capabilities: JSON.stringify(["plan", "estimate", "decompose", "roadmap"]),
    isActive: true,
    memoryEnabled: true,
  },
  {
    name: "DESIGNER",
    description: "UI/UX specialist agent. Creates Tailwind CSS components, responsive layouts, dark mode support, and accessible designs.",
    avatar: "designer",
    role: "designer",
    modelId: "claude-sonnet-4-20250514",
    systemPrompt: DESIGNER_SYSTEM_PROMPT,
    capabilities: JSON.stringify(["design", "ui", "ux", "tailwind", "responsive", "accessibility"]),
    isActive: true,
    memoryEnabled: false,
  },
];

async function seedAgents() {
  console.log("Seeding agents...");

  for (const agent of AGENTS) {
    const existing = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.name, agent.name))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(agentsTable)
        .set({
          description: agent.description,
          avatar: agent.avatar,
          role: agent.role,
          modelId: agent.modelId,
          systemPrompt: agent.systemPrompt,
          capabilities: agent.capabilities,
          isActive: agent.isActive,
          memoryEnabled: agent.memoryEnabled,
        })
        .where(eq(agentsTable.id, existing[0].id));
      console.log(`  Updated: ${agent.name} (id=${existing[0].id})`);
    } else {
      const inserted = await db.insert(agentsTable).values(agent).returning();
      console.log(`  Created: ${agent.name} (id=${inserted[0].id})`);
    }
  }

  console.log(`\nDone! ${AGENTS.length} agents seeded.`);
  process.exit(0);
}

seedAgents().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
