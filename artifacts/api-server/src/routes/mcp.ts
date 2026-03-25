import path from "path";
import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { MCP_DEFAULT_CWD } from "../config";
import { mcpRuntime, type McpCatalogEntry, type McpServerConfig } from "../lib/mcp-runtime";

const router: IRouter = Router();
const WORKSPACE_ROOT = path.resolve(MCP_DEFAULT_CWD ?? process.cwd());

async function isAdminUser(userId: number | undefined) {
  if (!userId) return false;

  const users = await db.select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  return users[0]?.role === "admin";
}

function getCatalogEntry(key: string): McpCatalogEntry | undefined {
  return mcpRuntime.getCatalog().find((entry) => entry.key === key);
}

function resolveWorkspacePath(input: unknown): string | undefined {
  if (typeof input !== "string" || !input.trim()) {
    return undefined;
  }

  const resolved = path.resolve(input.trim());
  const isWithinRoot = resolved === WORKSPACE_ROOT || resolved.startsWith(`${WORKSPACE_ROOT}${path.sep}`);

  if (!isWithinRoot) {
    throw new Error(`Workspace path must stay inside ${WORKSPACE_ROOT}`);
  }

  return resolved;
}

function buildCatalogConfig(entry: McpCatalogEntry, body: Record<string, unknown>): McpServerConfig {
  const args = [...entry.args];
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

  if (entry.requiresWorkspacePath) {
    const resolvedWorkspacePath = resolveWorkspacePath(body.workspacePath);
    if (!resolvedWorkspacePath) {
      throw new Error("A workspace path is required for this MCP server");
    }
    args.push(resolvedWorkspacePath);
  }

  if (entry.requiresApiKey && !apiKey) {
    throw new Error(`${entry.apiKeyEnvName ?? "API key"} is required`);
  }

  const env = entry.requiresApiKey && entry.apiKeyEnvName && apiKey
    ? { [entry.apiKeyEnvName]: apiKey }
    : undefined;

  return {
    id: `catalog:${entry.key}`,
    name: entry.name,
    command: entry.command,
    args,
    icon: entry.icon,
    description: entry.description,
    catalogKey: entry.key,
    requiresApiKey: entry.requiresApiKey,
    apiKeyEnvName: entry.apiKeyEnvName,
    env,
  };
}

function buildCustomConfig(body: Record<string, unknown>): McpServerConfig {
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const command = typeof body.command === "string" ? body.command.trim() : "";
  const args = Array.isArray(body.args) ? body.args.map((arg) => String(arg)) : [];
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const apiKeyEnvName = typeof body.apiKeyEnvName === "string" ? body.apiKeyEnvName.trim() : "";

  if (!id || !name || !command) {
    throw new Error("id, name and command are required");
  }

  return {
    id,
    name,
    command,
    args,
    cwd: resolveWorkspacePath(body.cwd),
    icon: typeof body.icon === "string" ? body.icon : "server",
    description: typeof body.description === "string" ? body.description : "Custom MCP server",
    apiKeyEnvName: apiKeyEnvName || undefined,
    env: apiKey && apiKeyEnvName ? { [apiKeyEnvName]: apiKey } : undefined,
  };
}

router.get("/catalog", async (req, res) => {
  res.json({
    servers: mcpRuntime.getCatalog(),
    allowCustom: await isAdminUser(req.userId),
    workspaceRoot: WORKSPACE_ROOT,
  });
});

router.get("/servers", (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.json({ servers: mcpRuntime.listServers(String(req.userId)) });
});

router.post("/servers/connect", async (req, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const catalogKey = typeof body.catalogKey === "string" ? body.catalogKey.trim() : "";
    const admin = await isAdminUser(req.userId);

    const config = catalogKey
      ? (() => {
          const entry = getCatalogEntry(catalogKey);
          if (!entry) {
            throw new Error("Unknown MCP catalog entry");
          }
          return buildCatalogConfig(entry, body);
        })()
      : (() => {
          if (!admin) {
            throw new Error("Custom MCP servers are restricted to admin users");
          }
          return buildCustomConfig(body);
        })();

    const server = await mcpRuntime.connect(String(req.userId), config);

    if (server.status === "error") {
      res.status(500).json({ error: server.lastError || "Failed to connect MCP server", server });
      return;
    }

    res.json({ server });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to connect MCP server";
    const statusCode = message.includes("admin users") || message.includes("Workspace path")
      ? 403
      : 400;
    res.status(statusCode).json({ error: message });
  }
});

router.post("/servers/:id/disconnect", async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const server = await mcpRuntime.disconnect(String(req.userId), String(req.params.id));
  if (!server) {
    res.status(404).json({ error: "MCP server not found" });
    return;
  }
  res.json({ server });
});

router.get("/servers/:id/tools", async (req, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const tools = await mcpRuntime.refreshTools(String(req.userId), String(req.params.id));
    res.json({ tools });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to list tools" });
  }
});

router.post("/servers/:id/tools/:toolName", async (req, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const result = await mcpRuntime.callTool(
      String(req.userId),
      String(req.params.id),
      String(req.params.toolName),
      (req.body?.arguments ?? {}) as Record<string, unknown>,
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to call tool" });
  }
});

export default router;
